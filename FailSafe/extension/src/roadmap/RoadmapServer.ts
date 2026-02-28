/**
 * RoadmapServer - Express HTTP + WebSocket server for Cumulative Roadmap
 *
 * Serves the external browser-based roadmap visualization on port 9376.
 * Provides real-time updates via WebSocket for live activity streaming.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import express, { Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as yaml from 'js-yaml';
import { PlanManager } from '../qorelogic/planning/PlanManager';
import { QoreLogicManager } from '../qorelogic/QoreLogicManager';
import { SentinelDaemon } from '../sentinel/SentinelDaemon';
import { EventBus } from '../shared/EventBus';
import { SentinelVerdict } from '../shared/types';
import { IFeatureGate, FeatureFlag } from '../core/interfaces/IFeatureGate';
import { FEATURE_TIER_MAP } from '../core/FeatureGateService';
import { GitResetService } from '../governance/revert/GitResetService';
import { FailSafeRevertService, RevertDeps } from '../governance/revert/FailSafeRevertService';
import { CheckpointRef, RevertRequest } from '../governance/revert/types';
import { HomeRoute, RunDetailRoute, WorkflowsRoute, SkillsRoute, GenomeRoute, ReportsRoute, SettingsRoute, PreflightRoute, GovernanceKPIRoute, AgentCoverageRoute } from './routes';
import { ConfigurationProfile } from '../genesis/ConfigurationProfile';
import type { RouteDeps } from './routes';
import type { PermissionScopeManager } from '../governance/PermissionScopeManager';
import type { EnforcementEngine } from '../governance/EnforcementEngine';

const PORT = 9376;
const HOST = '127.0.0.1';
type InstalledSkill = {
  id: string;
  displayName: string;
  localName: string;
  key: string;
  label: string;
  desc: string;
  creator: string;
  sourceRepo: string;
  sourcePath: string;
  versionPin: string;
  trustTier: string;
  sourceType: string;
  sourcePriority: number;
  admissionState: string;
  requiredPermissions: string[];
};

type SkillRelevance = InstalledSkill & {
  score: number;
  reasons: string[];
};

type CheckpointStatus = 'proposed' | 'validated' | 'sealed' | 'superseded';

type CheckpointRecord = {
  checkpointId: string;
  runId: string;
  checkpointType: string;
  phase: string;
  status: CheckpointStatus;
  timestamp: string;
  parentId: string | null;
  gitHash: string;
  policyVerdict: string;
  evidenceRefs: string[];
  actor: string;
  payloadJson: string;
  payloadHash: string;
  entryHash: string;
  prevHash: string;
};

type SkillRoot = {
  root: string;
  sourceType: string;
  sourcePriority: number;
  admissionState: string;
};

type SkillRegistryEntry = {
  id?: string;
  timestamp?: string;
  skillName?: string;
  skillPath?: string;
  source?: string;
  owner?: string;
  versionPin?: string;
  declaredVersion?: string;
  declaredPermissions?: string[];
  intendedWorkflows?: string[];
  compatibilityMap?: string[];
  riskTier?: string;
  trustTier?: string;
  runtimeEligibility?: string;
};

type QoreRuntimeOptions = {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

type RoadmapServerOptions = {
  qoreRuntime?: Partial<QoreRuntimeOptions>;
  workspaceRoot?: string;
  featureGate?: IFeatureGate;
};

type QoreRuntimeSnapshot = {
  enabled: boolean;
  connected: boolean;
  baseUrl: string;
  policyVersion?: string;
  latencyMs?: number;
  lastCheckedAt: string;
  error?: string;
};

export class RoadmapServer {
  private app: express.Application;
  private server: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private planManager: PlanManager;
  private qorelogicManager: QoreLogicManager;
  private sentinelDaemon: SentinelDaemon;
  private eventBus: EventBus;
  private recentVerdicts: SentinelVerdict[] = [];
  private uiDir: string;
  private checkpointDb: { prepare: (sql: string) => { run: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown } } | null = null;
  private checkpointMemory: CheckpointRecord[] = [];
  private qoreRuntime: QoreRuntimeOptions;
  private workspaceRoot: string;
  private featureGate: IFeatureGate | undefined;
  private sealedSubstantiateCompletions = new Set<string>();
  private revertService: FailSafeRevertService | null = null;
  private gitResetService: GitResetService;
  private enforcementEngine: EnforcementEngine | null = null;
  private permissionManager: PermissionScopeManager | null = null;
  private systemRegistry: import('../qorelogic/SystemRegistry').SystemRegistry | null = null;
  private checkpointTypeRegistry = new Set<string>([
    'snapshot.created',
    'phase.entered',
    'phase.exited',
    'skill.recommended',
    'skill.invoked',
    'policy.checked',
    'override.requested',
    'override.approved',
    'attempt.committed',
    'attempt.rolled_back',
    'export.generated',
    'monitoring.resumed',
    'monitoring.stopped',
    'event.stream',
    'governance.revert',
  ]);

  constructor(
    planManager: PlanManager,
    qorelogicManager: QoreLogicManager,
    sentinelDaemon: SentinelDaemon,
    eventBus: EventBus,
    options: RoadmapServerOptions = {},
  ) {
    this.planManager = planManager;
    this.qorelogicManager = qorelogicManager;
    this.sentinelDaemon = sentinelDaemon;
    this.eventBus = eventBus;
    this.app = express();
    this.qoreRuntime = this.resolveQoreRuntimeOptions(options.qoreRuntime);
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.featureGate = options.featureGate;
    this.uiDir = this.resolveUiDir();
    this.initializeCheckpointStore();
    this.gitResetService = new GitResetService();
    this.initializeRevertService();
    this.setupRoutes();
    this.subscribeToEvents();
  }

  private resolveUiDir(): string {
    const candidates = [
      // Packaged/compiled location (if copied into out)
      path.join(__dirname, 'ui'),
      // Dev workspace location from compiled out/roadmap
      path.resolve(__dirname, '../../src/roadmap/ui'),
      // Alternate depth fallback for tests/tooling execution contexts
      path.resolve(__dirname, '../../../src/roadmap/ui'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'index.html'))) {
        return candidate;
      }
    }

    // Last fallback to avoid crashes; requests will still 404 if missing.
    return path.join(__dirname, 'ui');
  }

  private resolveQoreRuntimeOptions(options?: Partial<QoreRuntimeOptions>): QoreRuntimeOptions {
    const baseUrl = String(options?.baseUrl || 'http://127.0.0.1:7777').trim().replace(/\/+$/, '');
    return {
      enabled: Boolean(options?.enabled),
      baseUrl,
      apiKey: options?.apiKey ? String(options.apiKey) : undefined,
      timeoutMs: Math.max(500, Math.min(30000, Number(options?.timeoutMs || 4000))),
    };
  }

  private setupRoutes(): void {
    this.app.use(express.json({ limit: '12mb' }));

    // Serve static UI assets for the Operations Hub.
    // Important: disable implicit index serving so route mode selection controls `/`.
    this.app.use(express.static(this.uiDir, { index: false }));

    // Root serves the extensive console by default.
    // Compact shell is available only when explicitly requested.
    this.app.get('/', (req: Request, res: Response) => {
      const file = this.getUiEntryFile(req);
      const target = path.join(this.uiDir, file);
      if (fs.existsSync(target)) {
        res.sendFile(target);
        return;
      }
      res.sendFile(path.join(this.uiDir, 'legacy-index.html'));
    });

    // Readiness endpoint for command-side launch checks.
    this.app.get('/health', (_req: Request, res: Response) => {
      const ready = fs.existsSync(path.join(this.uiDir, 'index.html'));
      res.status(ready ? 200 : 503).json({ ready, uiDir: this.uiDir });
    });

    // API: Get full roadmap state
    this.app.get('/api/roadmap', (_req: Request, res: Response) => {
      const sprints = this.planManager.getAllSprints();
      const currentSprint = this.planManager.getCurrentSprint();
      const activePlan = this.planManager.getActivePlan();
      res.json({ sprints, currentSprint, activePlan });
    });

    // API: Unified planner hub snapshot (single UI source of truth)
    this.app.get('/api/hub', async (_req: Request, res: Response) => {
      const hub = await this.buildHubSnapshot();
      res.json(hub);
    });

    this.app.get('/api/qore/runtime', async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) {
        return;
      }
      const snapshot = await this.fetchQoreRuntimeSnapshot();
      res.json(snapshot);
    });

    this.app.get('/api/qore/health', async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) {
        return;
      }
      if (!this.qoreRuntime.enabled) {
        res.status(503).json({ error: 'Qore runtime integration is disabled' });
        return;
      }
      const response = await this.fetchQoreJson('/health');
      res.status(response.ok ? 200 : 502).json(response.ok ? response.body : {
        error: response.error,
        detail: response.detail,
      });
    });

    this.app.post('/api/qore/evaluate', async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) {
        return;
      }
      if (!this.qoreRuntime.enabled) {
        res.status(503).json({ error: 'Qore runtime integration is disabled' });
        return;
      }
      const response = await this.fetchQoreJson('/evaluate', {
        method: 'POST',
        body: req.body || {},
      });
      res.status(response.ok ? 200 : 502).json(response.ok ? response.body : {
        error: response.error,
        detail: response.detail,
      });
    });

    // API: Get specific sprint details
    this.app.get('/api/sprint/:id', (req: Request, res: Response) => {
      const sprintId = req.params.id as string;
      const sprint = this.planManager.getSprint(sprintId);
      const plan = sprint ? this.planManager.getPlan(sprint.planId) : null;
      res.json({ sprint, plan });
    });

    // API: Get all plans
    this.app.get('/api/plans', (_req: Request, res: Response) => {
      const plans = this.planManager.getAllPlans();
      res.json({ plans });
    });

    // API: Discover installed skills from local Codex skill directories.
    this.app.get('/api/skills', (_req: Request, res: Response) => {
      const skills = this.getInstalledSkills();
      res.json({ skills });
    });

    // API: auto-ingest skills by scanning known workspace-local roots only.
    this.app.post('/api/skills/ingest/auto', (_req: Request, res: Response) => {
      try {
        const summary = this.autoIngestWorkspaceSkills();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    });

    // API: manual ingest accepts selected file/folder payload from UI.
    this.app.post('/api/skills/ingest/manual', (req: Request, res: Response) => {
      try {
        const mode = String(req.body?.mode || 'file').toLowerCase() === 'folder' ? 'folder' : 'file';
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        const summary = this.manualIngestSkillPayload(items, mode);
        res.json(summary);
      } catch (error) {
        res.status(400).json({ ok: false, error: String(error) });
      }
    });

    // API: rank installed skills for a phase with explainability payload.
    this.app.get('/api/skills/relevance', (req: Request, res: Response) => {
      const phase = String(req.query.phase || '').trim().toLowerCase();
      if (!phase) {
        res.status(400).json({ error: 'phase is required' });
        return;
      }
      const catalog = this.getInstalledSkills();
      const ranked = catalog
        .map((skill) => this.rankSkillForPhase(skill, phase))
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

      let allRelevant = ranked.filter((item) => item.score > 1);
      if (allRelevant.length === 0) {
        allRelevant = ranked.slice();
      }
      const recommended = allRelevant.slice(0, Math.min(4, allRelevant.length));
      const relevantKeys = new Set(allRelevant.map((item) => item.key));
      const otherAvailable = ranked.filter((item) => !relevantKeys.has(item.key));

      res.json({
        phase,
        recommended,
        allRelevant,
        otherAvailable,
      });
    });

    // API: Get transparency events (prompt lifecycle audit stream)
    this.app.get('/api/transparency', (_req: Request, res: Response) => {
      const events = this.getTransparencyEvents(50);
      res.json({ events });
    });

    // API: Get risk register
    this.app.get('/api/risks', (_req: Request, res: Response) => {
      const risks = this.getRiskRegister();
      res.json({ risks });
    });

    this.app.get('/api/checkpoints', (req: Request, res: Response) => {
      const limitRaw = Number.parseInt(String(req.query.limit || '50'), 10);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
      res.json({
        checkpoints: this.getRecentCheckpoints(limit),
        chainValid: this.verifyCheckpointChain(),
      });
    });

    // [V7] API: Get a single checkpoint by ID
    this.app.get('/api/checkpoints/:id', (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      const id = String(req.params.id || '');
      if (!id) {
        res.status(400).json({ ok: false, error: 'id required' });
        return;
      }
      const checkpoint = this.getCheckpointById(id);
      res.json({ ok: true, checkpoint });
    });

    // [V5] API: Rollback to a checkpoint
    this.app.post('/api/actions/rollback', async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      if (!this.revertService) {
        res.status(503).json({ ok: false, error: 'revert service unavailable' });
        return;
      }
      const { checkpointId, reason: rawReason } = req.body as { checkpointId?: string; reason?: string };
      if (!checkpointId) {
        res.status(400).json({ ok: false, error: 'checkpointId required' });
        return;
      }
      const actor = 'user.local';
      const reason = String(rawReason || '').slice(0, 2000);
      const checkpoint = this.getCheckpointById(checkpointId);
      if (!checkpoint) {
        res.status(404).json({ ok: false, error: 'checkpoint not found' });
        return;
      }
      try {
        const request: RevertRequest = { targetCheckpoint: checkpoint, reason, actor };
        const result = await this.revertService.revert(request);
        this.broadcast({ type: 'hub.refresh' });
        res.json({ ok: result.success, result });
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    });

    // API: Action controls for Hub buttons
    this.app.post('/api/actions/resume-monitoring', async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) {
        return;
      }
      try {
        if (!this.sentinelDaemon.isRunning()) {
          await this.sentinelDaemon.start();
        }
        this.recordCheckpoint({
          checkpointType: 'monitoring.resumed',
          actor: 'system',
          phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
          status: 'validated',
          policyVerdict: 'PASS',
          evidenceRefs: [],
          payload: { action: 'resume-monitoring' },
        });
        this.broadcast({ type: 'hub.refresh' });
        res.json({ ok: true, status: this.sentinelDaemon.getStatus() });
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    });

    this.app.post('/api/actions/panic-stop', (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) {
        return;
      }
      try {
        this.sentinelDaemon.stop();
        this.recordCheckpoint({
          checkpointType: 'monitoring.stopped',
          actor: 'system',
          phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
          status: 'validated',
          policyVerdict: 'WARN',
          evidenceRefs: [],
          payload: { action: 'panic-stop' },
        });
        this.broadcast({ type: 'hub.refresh' });
        res.json({ ok: true, status: this.sentinelDaemon.getStatus() });
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    });

    // Feature gate: expose available features for UI
    this.app.get('/api/v1/features', (_req: Request, res: Response) => {
      if (!this.featureGate) {
        res.json({ tier: 'free', features: {} });
        return;
      }
      const tier = this.featureGate.getTier();
      const features: Record<string, { requiredTier: string; enabled: boolean }> = {};
      for (const flag of Object.keys(FEATURE_TIER_MAP) as FeatureFlag[]) {
        features[flag] = {
          requiredTier: FEATURE_TIER_MAP[flag],
          enabled: this.featureGate.isEnabled(flag),
        };
      }
      res.json({ tier, features });
    });

    // v4.2.0: Console UI routes (HTML server-rendered)
    this.setupConsoleRoutes();

    // SPA fallback for deep links or unknown non-API routes.
    this.app.use((req: Request, res: Response) => {
      if (req.path.startsWith('/api/') || req.path === '/health') {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const file = this.getUiEntryFile(req);
      const target = path.join(this.uiDir, file);
      if (fs.existsSync(target)) {
        res.sendFile(target);
        return;
      }
      res.sendFile(path.join(this.uiDir, 'legacy-index.html'));
    });
  }

  private getUiEntryFile(req: Request): 'legacy-index.html' | 'index.html' {
    const uiMode = String(req.query.ui || '').toLowerCase();
    const compactParam = String(req.query.compact || '').toLowerCase();

    // Explicit modes.
    if (uiMode === 'compact') {
      return 'index.html';
    }
    if (uiMode === 'console' || uiMode === 'extended' || uiMode === 'popout') {
      return 'legacy-index.html';
    }

    // Backward-compatible compact toggle.
    if (compactParam === '1' || compactParam === 'true' || compactParam === 'yes') {
      return 'index.html';
    }
    return 'legacy-index.html';
  }

  private shouldServeLegacyUi(req: Request): boolean {
    const legacyParam = String(req.query.legacy || '').toLowerCase();
    if (legacyParam === '1' || legacyParam === 'true' || legacyParam === 'yes') {
      return true;
    }
    const viewParam = String(req.query.view || '').toLowerCase();
    // Legacy shell still handles older specialized view links.
    return viewParam === 'timeline' || viewParam === 'current-sprint' || viewParam === 'live-activity';
  }

  private isLocalRequest(req: Request): boolean {
    const remoteAddress = req.socket?.remoteAddress || req.ip || '';
    const normalized = String(remoteAddress).trim();
    return (
      normalized === '127.0.0.1' ||
      normalized === '::1' ||
      normalized === '::ffff:127.0.0.1'
    );
  }

  private rejectIfRemote(req: Request, res: Response): boolean {
    if (this.isLocalRequest(req)) {
      return false;
    }
    res.status(403).json({ error: 'Forbidden: local access only' });
    return true;
  }

  /**
   * Returns true (and sends 402) if the given feature is not enabled in the current configuration.
   */
  private rejectIfProRequired(feature: FeatureFlag, _req: Request, res: Response): boolean {
    if (!this.featureGate || this.featureGate.isEnabled(feature)) {
      return false;
    }
    res.status(402).json({
      error: `Feature '${feature}' is not enabled in current configuration`,
      upgrade: true,
      currentTier: this.featureGate.getTier(),
      requiredTier: 'pro',
    });
    return true;
  }

  private setupWebSocket(): void {
    if (!this.server) { return; }
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      // Send initial state on connection
      this.buildHubSnapshot().then((hub) => {
        ws.send(JSON.stringify({ type: 'init', payload: hub }));
      });
    });
  }

  /**
   * Broadcast a message to all connected WebSocket clients.
   */
  private broadcast(data: Record<string, unknown>): void {
    if (!this.wss) { return; }
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /** v4.2.0: Set dependencies for console UI routes (deferred wiring) */
  setConsoleDeps(enforcement: EnforcementEngine, perm: PermissionScopeManager): void {
    this.enforcementEngine = enforcement;
    this.permissionManager = perm;
  }

  /** v4.2.0: Set SystemRegistry for agent coverage route */
  setSystemRegistry(registry: import('../qorelogic/SystemRegistry').SystemRegistry): void {
    this.systemRegistry = registry;
  }

  private buildRouteDeps(): RouteDeps {
    const configProfile = new ConfigurationProfile();
    configProfile.loadDefaults({ workspaceRoot: this.workspaceRoot });
    return {
      planManager: this.planManager,
      ledgerManager: this.qorelogicManager.getLedgerManager(),
      shadowGenomeManager: this.qorelogicManager.getShadowGenomeManager(),
      enforcementEngine: this.enforcementEngine!,
      configProfile,
      getInstalledSkills: () => this.getInstalledSkills(),
      systemRegistry: this.systemRegistry ?? undefined,
    };
  }

  private setupConsoleRoutes(): void {
    const deps = () => this.buildRouteDeps();
    this.app.get('/console/home', async (req, res) => HomeRoute.render(req, res, deps()));
    this.app.get('/console/run/:runId', (req, res) => RunDetailRoute.render(req, res, deps()));
    this.app.get('/console/workflows', (req, res) => WorkflowsRoute.render(req, res, deps()));
    this.app.get('/console/skills', (req, res) => SkillsRoute.render(req, res, deps()));
    this.app.get('/console/genome', async (req, res) => GenomeRoute.render(req, res, deps()));
    this.app.get('/console/reports', async (req, res) => ReportsRoute.render(req, res, deps()));
    this.app.get('/console/settings', (req, res) => SettingsRoute.render(req, res, deps()));
    this.app.get('/console/kpi', async (req, res) => GovernanceKPIRoute.render(req, res, { ledgerManager: deps().ledgerManager }));
    this.app.get('/console/agents', async (req, res) => {
      if (!this.systemRegistry) { res.status(503).send('SystemRegistry not available'); return; }
      AgentCoverageRoute.render(req, res, { systemRegistry: this.systemRegistry });
    });
    if (this.permissionManager) {
      const pm = this.permissionManager;
      this.app.get('/console/preflight', (req, res) => PreflightRoute.render(req, res, { permissionManager: pm }));
      this.app.post('/console/preflight/grant', (req, res) => PreflightRoute.handleGrant(req, res, { permissionManager: pm }));
      this.app.post('/console/preflight/deny', (req, res) => PreflightRoute.handleDeny(req, res, { permissionManager: pm }));
    }
  }

  private subscribeToEvents(): void {
    // Stream plan events to connected clients
    this.eventBus.on('genesis.streamEvent' as never, (event: unknown) => {
      const streamPayload = this.extractEventPayload(event);
      this.maybeRecordSubstantiateCompletion(streamPayload);
      this.broadcast({ type: 'event', payload: event });
      this.recordCheckpoint({
        checkpointType: 'event.stream',
        actor: 'engine',
        phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
        status: 'validated',
        policyVerdict: 'PASS',
        evidenceRefs: [],
        payload: streamPayload,
      });
    });

    // Stream sentinel verdicts
    this.eventBus.on('sentinel.verdict' as never, (event: { payload: unknown }) => {
      const verdict = event.payload as SentinelVerdict;
      this.recentVerdicts.unshift(verdict);
      if (this.recentVerdicts.length > 10) {
        this.recentVerdicts.pop();
      }
      this.recordCheckpoint({
        checkpointType: 'policy.checked',
        actor: verdict.agentDid || 'sentinel',
        phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
        status: 'validated',
        policyVerdict: String(verdict.decision || 'UNKNOWN'),
        evidenceRefs: [],
        payload: {
          decision: verdict.decision,
          riskGrade: verdict.riskGrade,
          summary: verdict.summary,
        },
      });
      this.maybeRecordAuditPassCheckpoint(verdict);
      this.broadcast({ type: 'verdict', payload: event.payload });
      this.broadcast({ type: 'hub.refresh' });
    });

    this.eventBus.on('qorelogic.l3Queued' as never, (event: unknown) => {
      this.recordCheckpoint({
        checkpointType: 'override.requested',
        actor: 'qorelogic',
        phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
        status: 'proposed',
        policyVerdict: 'ESCALATE',
        evidenceRefs: [],
        payload: event,
      });
      this.broadcast({ type: 'hub.refresh' });
    });
    this.eventBus.on('qorelogic.l3Decided' as never, (event: unknown) => {
      this.recordCheckpoint({
        checkpointType: 'override.approved',
        actor: 'qorelogic',
        phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
        status: 'sealed',
        policyVerdict: 'PASS',
        evidenceRefs: [],
        payload: event,
      });
      this.broadcast({ type: 'hub.refresh' });
    });
    this.eventBus.on('qorelogic.trustUpdate' as never, () => this.broadcast({ type: 'hub.refresh' }));
  }

  private extractEventPayload(event: unknown): unknown {
    if (!event || typeof event !== 'object') {
      return event;
    }
    const value = event as { payload?: unknown };
    return value.payload ?? event;
  }

  private maybeRecordAuditPassCheckpoint(verdict: SentinelVerdict): void {
    if (String(verdict.decision || '').toUpperCase() !== 'PASS') {
      return;
    }
    this.recordCheckpoint({
      checkpointType: 'attempt.committed',
      actor: verdict.agentDid || 'sentinel',
      phase: 'audit',
      status: 'sealed',
      policyVerdict: 'PASS',
      evidenceRefs: [],
      payload: {
        trigger: 'audit.pass',
        riskGrade: verdict.riskGrade,
        summary: verdict.summary,
      },
    });
  }

  private maybeRecordSubstantiateCompletion(streamPayload: unknown): void {
    if (!streamPayload || typeof streamPayload !== 'object') {
      return;
    }
    const payload = streamPayload as {
      planEvent?: {
        type?: string;
        planId?: string;
        payload?: { phaseId?: string };
      };
    };
    const planEvent = payload.planEvent;
    if (!planEvent || String(planEvent.type || '') !== 'phase.completed') {
      return;
    }

    const planId = String(planEvent.planId || '');
    const phaseId = String(planEvent.payload?.phaseId || '');
    if (!planId || !phaseId) {
      return;
    }
    const dedupeKey = `${planId}:${phaseId}`;
    if (this.sealedSubstantiateCompletions.has(dedupeKey)) {
      return;
    }

    const plan = this.planManager.getPlan(planId);
    const phase = plan?.phases.find((item) => item.id === phaseId);
    const phaseTitle = String(phase?.title || '').toLowerCase();
    const isSubstantiate = phaseTitle.includes('substantiat')
      || phaseTitle.includes('release')
      || phaseTitle.includes('ship');
    if (!isSubstantiate) {
      return;
    }

    this.sealedSubstantiateCompletions.add(dedupeKey);
    this.recordCheckpoint({
      checkpointType: 'phase.exited',
      actor: 'plan-manager',
      phase: 'substantiate',
      status: 'sealed',
      policyVerdict: 'PASS',
      evidenceRefs: [],
      payload: {
        trigger: 'phase.completed',
        planId,
        phaseId,
        phaseTitle: phase?.title || 'Substantiate',
      },
    });
  }

  private async fetchQoreRuntimeSnapshot(): Promise<QoreRuntimeSnapshot> {
    const checkedAt = new Date().toISOString();
    if (!this.qoreRuntime.enabled) {
      return {
        enabled: false,
        connected: false,
        baseUrl: this.qoreRuntime.baseUrl,
        lastCheckedAt: checkedAt,
        error: 'disabled',
      };
    }

    const startedAt = Date.now();
    const health = await this.fetchQoreJson('/health');
    if (!health.ok) {
      return {
        enabled: true,
        connected: false,
        baseUrl: this.qoreRuntime.baseUrl,
        latencyMs: Date.now() - startedAt,
        lastCheckedAt: checkedAt,
        error: health.error || 'runtime_unreachable',
      };
    }

    const policy = await this.fetchQoreJson('/policy/version');
    return {
      enabled: true,
      connected: true,
      baseUrl: this.qoreRuntime.baseUrl,
      policyVersion: policy.ok ? String((policy.body as { policyVersion?: string }).policyVersion || '') : undefined,
      latencyMs: Date.now() - startedAt,
      lastCheckedAt: checkedAt,
    };
  }

  private async fetchQoreJson(
    endpoint: string,
    options?: { method?: 'GET' | 'POST'; body?: unknown },
  ): Promise<{ ok: true; body: unknown } | { ok: false; error: string; detail?: string }> {
    if (!this.qoreRuntime.enabled) {
      return { ok: false, error: 'disabled' };
    }

    const timeout = this.qoreRuntime.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.qoreRuntime.apiKey) {
      headers['x-qore-api-key'] = this.qoreRuntime.apiKey;
    }

    try {
      const response = await fetch(`${this.qoreRuntime.baseUrl}${endpoint}`, {
        method: options?.method || 'GET',
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const detail = await response.text();
        return { ok: false, error: `upstream_${response.status}`, detail };
      }

      const body = await response.json();
      return { ok: true, body };
    } catch (error) {
      clearTimeout(timer);
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: 'request_failed', detail };
    }
  }

  private async buildHubSnapshot(): Promise<Record<string, unknown>> {
    const sprints = this.planManager.getAllSprints();
    const currentSprint = this.planManager.getCurrentSprint();
    const activePlan = this.planManager.getActivePlan();
    const sentinelStatus = this.sentinelDaemon.getStatus();
    const l3Queue = this.qorelogicManager.getL3Queue();

    const agents = await this.qorelogicManager.getTrustEngine().getAllAgents();
    const totalAgents = agents.length;
    const avgTrust = totalAgents === 0
      ? 0
      : agents.reduce((sum, agent) => sum + agent.trustScore, 0) / totalAgents;
    const quarantined = agents.filter((agent) => agent.isQuarantined).length;
    const stageCounts = agents.reduce(
      (counts, agent) => {
        counts[agent.trustStage] = (counts[agent.trustStage] || 0) + 1;
        return counts;
      },
      { CBT: 0, KBT: 0, IBT: 0 } as { CBT: number; KBT: number; IBT: number },
    );
    const qoreRuntime = await this.fetchQoreRuntimeSnapshot();

    const nodeStatus = [
      {
        id: 'workspace-core',
        label: 'Workspace Core',
        state: sentinelStatus.running ? 'nominal' : 'paused',
        signal: `${sentinelStatus.filesWatched || 0} files watched`,
      },
      {
        id: 'verification-queue',
        label: 'Verification Queue',
        state: (l3Queue.length || sentinelStatus.queueDepth > 0) ? 'reviewing' : 'nominal',
        signal: `${l3Queue.length || 0} pending approvals`,
      },
      {
        id: 'trust-engine',
        label: 'Trust Engine',
        state: quarantined > 0 ? 'degraded' : 'nominal',
        signal: `${Math.round(avgTrust * 100)}% avg trust`,
      },
      {
        id: 'qore-runtime',
        label: 'Qore Runtime',
        state: !qoreRuntime.enabled ? 'paused' : qoreRuntime.connected ? 'nominal' : 'degraded',
        signal: !qoreRuntime.enabled
          ? 'integration disabled'
          : qoreRuntime.connected
            ? `connected (${qoreRuntime.policyVersion || 'unknown policy'})`
            : `unreachable (${qoreRuntime.baseUrl})`,
      },
    ];

    return {
      sprints,
      currentSprint,
      activePlan,
      sentinelStatus,
      recentVerdicts: this.recentVerdicts,
      l3Queue,
      trustSummary: {
        totalAgents,
        avgTrust,
        quarantined,
        stageCounts,
      },
      nodeStatus,
      checkpointSummary: this.getCheckpointSummary(),
      recentCheckpoints: this.getRecentCheckpoints(12),
      qoreRuntime,
      generatedAt: new Date().toISOString(),
    };
  }

  start(): void {
    this.server = this.app.listen(PORT, HOST, () => {
      console.log(`Roadmap server: http://localhost:${PORT}`);
    });
    this.setupWebSocket();
    this.recordCheckpoint({
      checkpointType: 'snapshot.created',
      actor: 'system',
      phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
      status: 'validated',
      policyVerdict: 'PASS',
      evidenceRefs: [],
      payload: { source: 'roadmap-server.start' },
    });
  }

  stop(): void {
    this.wss?.close();
    this.server?.close();
  }

  getPort(): number {
    return PORT;
  }

  private getInstalledSkills(): InstalledSkill[] {
    const discovered = new Map<string, InstalledSkill>();
    const approvedSkillFiles = this.getApprovedSkillFileSet();
    const candidates = this.getSkillRoots();
    for (const root of candidates) {
      if (!fs.existsSync(root.root)) continue;
      const markdownFiles = this.collectSkillMarkdownFiles(root.root);
      for (const markdown of markdownFiles) {
        const isRegistryApproved = approvedSkillFiles.has(this.toComparablePath(markdown));
        const isSystemApproved = root.sourceType === 'project-canonical';
        const isAutoDiscoveredLocal = root.sourceType === 'project-local';
        if (!isRegistryApproved && !isSystemApproved && !isAutoDiscoveredLocal) continue;
        const parsed = this.parseSkillFile(markdown, root);
        if (!parsed) continue;
        const existing = discovered.get(parsed.key);
        if (!existing || this.isPreferredSkill(parsed, existing)) {
          discovered.set(parsed.key, parsed);
        }
      }
    }
    if (discovered.size === 0) {
      for (const fallbackSkill of this.getEmergencyDiscoveredSkills()) {
        discovered.set(fallbackSkill.key, fallbackSkill);
      }
    }
    return Array.from(discovered.values()).sort((a, b) => {
      if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
      return a.label.localeCompare(b.label);
    });
  }

  private getSkillRoots(): SkillRoot[] {
    const workspaceRoot = this.getWorkspaceRoot();
    const bases = new Set<string>();
    const addAncestors = (start: string): void => {
      let current = path.resolve(start);
      for (let i = 0; i < 10; i += 1) {
        if (bases.has(current)) break;
        bases.add(current);
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    };
    addAncestors(workspaceRoot);
    addAncestors(path.resolve(__dirname, '..'));
    addAncestors(path.resolve(__dirname, '../..'));

    const roots: SkillRoot[] = [];
    const add = (rootPath: string, sourceType: string, sourcePriority: number, admissionState: string): void => {
      const normalized = path.resolve(rootPath);
      if (roots.some((item) => item.root === normalized)) return;
      roots.push({ root: normalized, sourceType, sourcePriority, admissionState });
    };

    for (const base of bases) {
      add(path.join(base, 'FailSafe', 'VSCode', 'skills'), 'project-canonical', 1, 'admitted');
      add(path.join(base, 'VSCode', 'skills'), 'project-canonical', 1, 'admitted');
      add(path.join(base, '.agent', 'skills'), 'project-local', 2, 'admitted');
      add(path.join(base, '.claude', 'skills'), 'project-local', 2, 'admitted');
      add(path.join(base, '.codex', 'skills'), 'project-local', 2, 'admitted');
      add(path.join(base, '.github', 'skills'), 'project-local', 2, 'admitted');
      add(path.join(base, '.failsafe', 'manual-skills'), 'manual-import', 3, 'conditional');
    }

    return roots;
  }

  private getEmergencyDiscoveredSkills(): InstalledSkill[] {
    const workspaceRoot = this.getWorkspaceRoot();
    const emergencyRoots = [
      path.join(workspaceRoot, 'FailSafe', 'VSCode', 'skills'),
      path.join(workspaceRoot, 'VSCode', 'skills'),
      path.resolve(workspaceRoot, '..', 'VSCode', 'skills'),
      path.resolve(workspaceRoot, '..', 'FailSafe', 'VSCode', 'skills'),
      path.resolve(__dirname, '../../../../VSCode/skills'),
      path.resolve(__dirname, '../../../../../FailSafe/VSCode/skills'),
    ];
    const unique = Array.from(new Set(emergencyRoots.map((item) => path.resolve(item))));
    const output = new Map<string, InstalledSkill>();
    for (const root of unique) {
      if (!fs.existsSync(root)) continue;
      const markdown = this.collectSkillMarkdownFiles(root);
      for (const file of markdown) {
        const parsed = this.parseSkillFile(file, {
          root,
          sourceType: 'project-canonical',
          sourcePriority: 1,
          admissionState: 'admitted',
        });
        if (!parsed) continue;
        if (!output.has(parsed.key)) output.set(parsed.key, parsed);
      }
    }
    return Array.from(output.values());
  }

  private collectSkillMarkdownFiles(root: string): string[] {
    const files: string[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          // Ignore disabled/hidden skill trees (for example, quarantine buckets).
          if (entry.name.startsWith('.') || entry.name.startsWith('_')) {
            continue;
          }
          stack.push(full);
          continue;
        }
        if (entry.isFile() && entry.name.toLowerCase() === 'skill.md') {
          files.push(full);
        }
      }
    }
    return files;
  }

  private parseSkillFile(filePath: string, rootMeta: SkillRoot): InstalledSkill | null {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
    const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const rawName = (this.readFrontmatterValue(frontmatter, 'name') || path.basename(path.dirname(filePath))).trim();
    const desc = (this.readFrontmatterValue(frontmatter, 'description') || 'Installed skill').trim();
    const metadataAuthor = this.readFrontmatterValue(frontmatter, 'author')
      || this.readFrontmatterValue(frontmatter, 'publisher')
      || this.readFrontmatterValue(frontmatter, 'metadata.author')
      || 'Unknown';
    const versionPin = this.readFrontmatterValue(frontmatter, 'version')
      || this.readFrontmatterValue(frontmatter, 'metadata.version')
      || 'unversioned';
    const trustTier = this.readFrontmatterValue(frontmatter, 'trustTier')
      || this.readFrontmatterValue(frontmatter, 'trust_tier')
      || 'conditional';
    const requiredPermissions = this.readFrontmatterList(frontmatter, 'requiredPermissions')
      .concat(this.readFrontmatterList(frontmatter, 'required_permissions'));
    const sourceMeta = this.readSourceMetadata(path.dirname(filePath));

    const sourceRepo = sourceMeta.sourceRepo
      || this.readFrontmatterValue(frontmatter, 'sourceRepo')
      || this.readFrontmatterValue(frontmatter, 'source_repo')
      || 'unknown';
    const sourcePath = sourceMeta.sourcePath
      || this.readFrontmatterValue(frontmatter, 'sourcePath')
      || this.readFrontmatterValue(frontmatter, 'source_path')
      || filePath;
    const creator = sourceMeta.creator || metadataAuthor;
    const admissionState = sourceMeta.admissionState
      || this.readFrontmatterValue(frontmatter, 'admissionState')
      || this.readFrontmatterValue(frontmatter, 'admission_state')
      || rootMeta.admissionState;
    const sourceType = sourceMeta.sourceType
      || this.readFrontmatterValue(frontmatter, 'sourceType')
      || this.readFrontmatterValue(frontmatter, 'source_type')
      || rootMeta.sourceType;
    const sourcePriorityRaw = sourceMeta.sourcePriority
      || this.readFrontmatterValue(frontmatter, 'sourcePriority')
      || this.readFrontmatterValue(frontmatter, 'source_priority');
    const sourcePriorityNum = Number.parseInt(sourcePriorityRaw, 10);
    const sourcePriority = Number.isFinite(sourcePriorityNum) ? sourcePriorityNum : rootMeta.sourcePriority;
    const explicitSkillId = this.readFrontmatterValue(frontmatter, 'id')
      || this.readFrontmatterValue(frontmatter, 'skill_id')
      || this.readFrontmatterValue(frontmatter, 'qore_id');
    const displayName = this.readFrontmatterValue(frontmatter, 'displayName')
      || this.readFrontmatterValue(frontmatter, 'display_name')
      || this.humanizeSkillName(rawName);
    const resolvedId = this.resolveQoreSkillId(explicitSkillId || rawName, {
      creator: String(creator || '').trim(),
      sourceRepo: String(sourceRepo || '').trim(),
      desc,
    });
    if (!resolvedId) return null;

    return {
      id: resolvedId,
      displayName: String(displayName || rawName || resolvedId).trim(),
      localName: rawName,
      key: resolvedId,
      label: String(displayName || rawName || resolvedId).trim(),
      desc,
      creator: String(creator || 'Unknown').trim(),
      sourceRepo: String(sourceRepo || 'unknown').trim(),
      sourcePath: String(sourcePath || filePath).trim(),
      versionPin: String(versionPin || 'unversioned').trim(),
      trustTier: String(trustTier || 'conditional').trim(),
      sourceType: String(sourceType || rootMeta.sourceType).trim(),
      sourcePriority,
      admissionState: String(admissionState || rootMeta.admissionState).trim(),
      requiredPermissions: Array.from(new Set(requiredPermissions.map((item) => item.trim()).filter(Boolean))),
    };
  }

  private getWorkspaceRoot(): string {
    return path.resolve(process.cwd());
  }

  private getSkillRegistryDir(): string {
    return path.join(this.getWorkspaceRoot(), '.failsafe', 'skill-registry');
  }

  private getLegacySkillRegistryPath(): string {
    return path.join(this.getSkillRegistryDir(), 'registry.json');
  }

  private getAppSkillManifestPath(): string {
    return path.join(this.getSkillRegistryDir(), 'app-manifest.json');
  }

  private getPersonalSkillManifestPath(): string {
    return path.join(this.getSkillRegistryDir(), 'personal-manifest.json');
  }

  private ensureAppSkillManifest(): void {
    const registryDir = this.getSkillRegistryDir();
    fs.mkdirSync(registryDir, { recursive: true });
    const now = new Date().toISOString();
    const entries: SkillRegistryEntry[] = [];
    const roots = this.getSkillRoots().filter((root) => root.sourceType === 'project-canonical' && fs.existsSync(root.root));
    for (const root of roots) {
      const markdownFiles = this.collectSkillMarkdownFiles(root.root);
      for (const skillFile of markdownFiles) {
        const relPath = path.relative(this.getWorkspaceRoot(), skillFile);
        entries.push({
          id: crypto.createHash('sha1').update(skillFile).digest('hex').slice(0, 12),
          timestamp: now,
          skillName: path.basename(path.dirname(skillFile)),
          skillPath: relPath,
          source: 'app',
          owner: 'FailSafe',
          trustTier: 'verified',
          runtimeEligibility: 'allowed',
        });
      }
    }
    try {
      fs.writeFileSync(this.getAppSkillManifestPath(), JSON.stringify(entries, null, 2), 'utf8');
    } catch {
      // Non-fatal. Canonical skills are still admitted by sourceType.
    }
  }

  private readRegistryEntries(paths: string[]): SkillRegistryEntry[] {
    const entries: SkillRegistryEntry[] = [];
    for (const registryPath of paths) {
      if (!fs.existsSync(registryPath)) continue;
      let raw = '';
      try {
        raw = fs.readFileSync(registryPath, 'utf8');
      } catch {
        continue;
      }
      if (!raw.trim()) continue;
      try {
        const parsed = JSON.parse(raw) as SkillRegistryEntry[] | SkillRegistryEntry;
        const list = Array.isArray(parsed) ? parsed : [parsed];
        entries.push(...list);
      } catch {
        continue;
      }
    }
    return entries;
  }

  private toComparablePath(inputPath: string): string {
    const normalized = path.resolve(inputPath);
    return process.platform === 'win32'
      ? normalized.replace(/\//g, '\\').toLowerCase()
      : normalized;
  }

  private getApprovedSkillFileSet(): Set<string> {
    this.ensureAppSkillManifest();
    const parsed = this.readRegistryEntries([
      this.getAppSkillManifestPath(),
      this.getPersonalSkillManifestPath(),
      this.getLegacySkillRegistryPath(),
    ]);
    if (parsed.length === 0) return new Set<string>();

    const latestByPath = new Map<string, SkillRegistryEntry>();
    for (const entry of parsed) {
      const rel = String(entry?.skillPath || '').trim();
      if (!rel) continue;
      const abs = path.resolve(this.getWorkspaceRoot(), rel);
      const key = this.toComparablePath(abs);
      const existing = latestByPath.get(key);
      const existingTs = Date.parse(String(existing?.timestamp || ''));
      const nextTs = Date.parse(String(entry?.timestamp || ''));
      if (!existing || (Number.isFinite(nextTs) && (!Number.isFinite(existingTs) || nextTs > existingTs))) {
        latestByPath.set(key, entry);
      }
    }

    const approved = new Set<string>();
    for (const [absPath, entry] of latestByPath.entries()) {
      const trustTier = String(entry.trustTier || '').toLowerCase();
      const runtimeEligibility = String(entry.runtimeEligibility || '').toLowerCase();
      const approvedTier = trustTier === 'verified' || trustTier === 'conditional';
      const allowed = runtimeEligibility === 'allowed';
      if (!approvedTier || !allowed) continue;
      approved.add(this.toComparablePath(absPath));
    }
    return approved;
  }

  private getWorkspaceDiscoveryRoots(): string[] {
    const base = this.getWorkspaceRoot();
    const roots = [
      path.join(base, '.agent', 'skills'),
      path.join(base, '.claude', 'skills'),
      path.join(base, '.codex', 'skills'),
      path.join(base, '.github', 'skills'),
      path.join(base, 'FailSafe', 'VSCode', 'skills'),
      path.join(base, 'VSCode', 'skills'),
      path.join(base, '.failsafe', 'manual-skills'),
    ];
    return Array.from(new Set(roots.map((item) => path.resolve(item))));
  }

  private autoIngestWorkspaceSkills(): Record<string, unknown> {
    const roots = this.getWorkspaceDiscoveryRoots().filter((root) => fs.existsSync(root));
    const skillFiles = roots.flatMap((root) => this.collectSkillMarkdownFiles(root));
    const approved = this.getApprovedSkillFileSet();
    const failures: Array<{ file: string; error: string }> = [];
    let admitted = 0;
    let skipped = 0;

    for (const skillFile of skillFiles) {
      const normalized = this.toComparablePath(skillFile);
      if (approved.has(normalized)) {
        skipped += 1;
        continue;
      }
      const result = this.admitSkill(skillFile, 'workspace');
      if (result.ok) {
        admitted += 1;
      } else {
        failures.push({ file: skillFile, error: result.error });
      }
    }

    return {
      ok: true,
      mode: 'auto',
      rootsScanned: roots,
      discovered: skillFiles.length,
      admitted,
      skipped,
      failed: failures.length,
      failures,
      skills: this.getInstalledSkills(),
    };
  }

  private manualIngestSkillPayload(items: unknown[], mode: 'file' | 'folder'): Record<string, unknown> {
    const normalizedItems = items
      .map((item) => ({
        path: String((item as { path?: unknown }).path || '').trim(),
        content: String((item as { content?: unknown }).content || ''),
      }))
      .filter((item) => item.path.length > 0);

    if (normalizedItems.length === 0) {
      throw new Error('No files were provided for manual ingest.');
    }
    if (normalizedItems.length > 300) {
      throw new Error('Manual ingest payload is too large.');
    }

    const batchRoot = path.join(
      this.getWorkspaceRoot(),
      '.failsafe',
      'manual-skills',
      `manual-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );
    fs.mkdirSync(batchRoot, { recursive: true });

    const writtenSkillFiles: string[] = [];
    for (const item of normalizedItems) {
      const safeRelative = this.sanitizeRelativePath(item.path);
      if (!safeRelative) continue;
      const target = path.join(batchRoot, safeRelative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, item.content, 'utf8');
      if (path.basename(target).toLowerCase() === 'skill.md') {
        writtenSkillFiles.push(target);
      }
    }
    if (writtenSkillFiles.length === 0) {
      throw new Error('Manual ingest did not include any SKILL.md files.');
    }

    const failures: Array<{ file: string; error: string }> = [];
    let admitted = 0;
    for (const skillFile of writtenSkillFiles) {
      const result = this.admitSkill(skillFile, mode === 'folder' ? 'manual-folder' : 'manual-file');
      if (result.ok) admitted += 1;
      else failures.push({ file: skillFile, error: result.error });
    }

    return {
      ok: true,
      mode: 'manual',
      importedTo: batchRoot,
      filesWritten: normalizedItems.length,
      discovered: writtenSkillFiles.length,
      admitted,
      failed: failures.length,
      failures,
      skills: this.getInstalledSkills(),
    };
  }

  private sanitizeRelativePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '');
    const segments = normalized
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
    return segments.join(path.sep);
  }

  private admitSkill(skillFile: string, source: string): { ok: boolean; error: string } {
    const scriptPath = path.join(this.getWorkspaceRoot(), 'tools', 'reliability', 'admit-skill.ps1');
    if (!fs.existsSync(scriptPath)) {
      return { ok: false, error: `admission script not found: ${scriptPath}` };
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-SkillPath',
      skillFile,
      '-Source',
      source,
      '-Owner',
      'FailSafe',
      '-VersionPin',
      'local-main',
      '-RegistryPath',
      this.getPersonalSkillManifestPath(),
    ];
    const result = spawnSync(shell, args, {
      cwd: this.getWorkspaceRoot(),
      encoding: 'utf8',
    });
    const ok = result.status === 0;
    const stdErr = String(result.stderr || '').trim();
    const stdOut = String(result.stdout || '').trim();
    return {
      ok,
      error: ok ? '' : (stdErr || stdOut || `admit-skill exited with code ${String(result.status ?? 'unknown')}`),
    };
  }

  private toSlug(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private humanizeSkillName(value: string): string {
    const slug = this.toSlug(value);
    const alias: Record<string, string> = {
      'music': 'Generate Music',
      'sound-effects': 'Generate Sound Effects',
      'speech-to-text': 'Transcribe Speech',
      'text-to-speech': 'Synthesize Speech',
      'agents': 'Intent Assistant',
    };
    if (alias[slug]) return alias[slug];
    return slug
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveQoreSkillId(base: string, context: { creator: string; sourceRepo: string; desc: string }): string {
    const slug = this.toSlug(base);
    if (!slug) return '';
    const segments = slug.split('-').filter(Boolean);
    if (segments.length >= 3) {
      return slug;
    }

    const source = this.deriveSkillSourceToken(context);
    const domain = this.deriveSkillDomainToken(slug, context.desc);
    const action = this.deriveSkillActionToken(slug, domain);
    const synthesized = `${source}-${domain}-${action}`;
    return this.toSlug(synthesized);
  }

  private deriveSkillSourceToken(context: { creator: string; sourceRepo: string; desc: string }): string {
    const repo = String(context.sourceRepo || '');
    const creator = String(context.creator || '');
    if (repo.includes('/')) {
      const owner = this.toSlug(repo.split('/')[0] || '');
      if (owner) return owner;
    }
    const creatorSlug = this.toSlug(creator);
    if (creatorSlug) return creatorSlug;
    return 'local';
  }

  private deriveSkillDomainToken(skillSlug: string, description: string): string {
    const text = `${skillSlug} ${description}`.toLowerCase();
    if (text.includes('tauri')) return 'tauri2';
    if (text.includes('governance') || text.includes('compliance')) return 'governance';
    if (text.includes('meta') || text.includes('ledger') || text.includes('shadow')) return 'meta';
    if (text.includes('docs') || text.includes('writing')) return 'docs';
    if (text.includes('web') || text.includes('wcag')) return 'web';
    if (text.includes('audio') || text.includes('voice') || text.includes('speech') || text.includes('music') || text.includes('sound')) return 'audio';
    return 'general';
  }

  private deriveSkillActionToken(skillSlug: string, domain: string): string {
    const directMap: Record<string, string> = {
      'music': 'generate-music',
      'sound-effects': 'generate-sound-effects',
      'speech-to-text': 'transcribe-speech',
      'text-to-speech': 'synthesize-speech',
      'agents': 'build-intent-assistant',
    };
    if (directMap[skillSlug]) return directMap[skillSlug];
    if (domain === 'general') return `use-${skillSlug}`;
    return skillSlug;
  }

  private readFrontmatterValue(frontmatter: string, key: string): string {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dotted = escaped.replace('\\.', '\\s*\\.\\s*');
    const match = frontmatter.match(new RegExp(`^\\s*${dotted}\\s*:\\s*(.+)$`, 'mi'));
    if (!match?.[1]) return '';
    return String(match[1]).trim().replace(/^['"]|['"]$/g, '');
  }

  private readFrontmatterList(frontmatter: string, key: string): string[] {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerMatch = frontmatter.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.+)?$`, 'mi'));
    if (!headerMatch) return [];
    const trailing = String(headerMatch[1] || '').trim();
    if (trailing.startsWith('[') && trailing.endsWith(']')) {
      return trailing
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    }
    const start = headerMatch.index ?? -1;
    if (start < 0) return [];
    const rest = frontmatter.slice(start + headerMatch[0].length).split('\n');
    const items: string[] = [];
    for (const line of rest) {
      if (!/^\s*-/.test(line)) {
        if (line.trim().length > 0) break;
        continue;
      }
      items.push(line.replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, ''));
    }
    return items;
  }

  private readSourceMetadata(skillDir: string): {
    creator: string;
    sourceRepo: string;
    sourcePath: string;
    sourceType: string;
    sourcePriority: string;
    admissionState: string;
  } {
    const sourceFile = path.join(skillDir, 'SOURCE.yml');
    if (!fs.existsSync(sourceFile)) {
      return {
        creator: '',
        sourceRepo: '',
        sourcePath: '',
        sourceType: '',
        sourcePriority: '',
        admissionState: '',
      };
    }
    let content = '';
    try {
      content = fs.readFileSync(sourceFile, 'utf8');
    } catch {
      return {
        creator: '',
        sourceRepo: '',
        sourcePath: '',
        sourceType: '',
        sourcePriority: '',
        admissionState: '',
      };
    }
    const read = (pattern: RegExp) => (content.match(pattern)?.[1] || '').trim().replace(/^['"]|['"]$/g, '');
    const parsed = (() => {
      try {
        return yaml.load(content) as Record<string, unknown> | null;
      } catch {
        return null;
      }
    })();
    const source = (parsed?.source && typeof parsed.source === 'object')
      ? (parsed.source as Record<string, unknown>)
      : {};
    const creatorNode = (parsed?.creator && typeof parsed.creator === 'object')
      ? (parsed.creator as Record<string, unknown>)
      : {};
    const authorNode = (parsed?.author && typeof parsed.author === 'object')
      ? (parsed.author as Record<string, unknown>)
      : {};
    const imported = (parsed?.imported && typeof parsed.imported === 'object')
      ? (parsed.imported as Record<string, unknown>)
      : {};
    const pick = (...values: Array<unknown>) => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
      }
      return '';
    };
    return {
      creator: pick(
        creatorNode.name,
        parsed?.creator,
        authorNode.name,
        read(/^\s*creator\s*:\s*(.+)$/mi),
      ),
      sourceRepo: pick(
        source.repo,
        source.repository,
        parsed?.source_repo,
        read(/^\s*source_repo\s*:\s*(.+)$/mi),
      ),
      sourcePath: pick(
        source.path,
        source.url,
        parsed?.source_path,
        read(/^\s*source_path\s*:\s*(.+)$/mi),
      ),
      sourceType: pick(
        source.type,
        parsed?.source_type,
        read(/^\s*source_type\s*:\s*(.+)$/mi),
      ),
      sourcePriority: pick(
        source.source_priority,
        parsed?.source_priority,
        read(/^\s*source_priority\s*:\s*(.+)$/mi),
      ),
      admissionState: pick(
        imported.admission_state,
        parsed?.admission_state,
        read(/^\s*admission_state\s*:\s*(.+)$/mi),
      ),
    };
  }

  private rankSkillForPhase(skill: InstalledSkill, phase: string): SkillRelevance {
    const phaseKeywordMap: Record<string, string[]> = {
      plan: ['plan', 'strategy', 'architecture', 'design', 'router', 'flow'],
      audit: ['audit', 'review', 'security', 'permission', 'verify', 'compliance'],
      implement: ['implement', 'integration', 'wiring', 'state', 'plugin', 'build'],
      debug: ['debug', 'error', 'test', 'validation', 'fix', 'mock', 'performance'],
      substantiate: ['documentation', 'release', 'narrative', 'governance', 'evidence', 'lifecycle'],
    };
    const text = `${skill.key} ${skill.label} ${skill.desc}`.toLowerCase();
    const keywords = phaseKeywordMap[phase] || [];
    let score = 1;
    const reasons: string[] = [];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score += 1;
        reasons.push(`keyword:${keyword}`);
      }
    }
    if (skill.trustTier.toLowerCase() === 'verified') {
      score += 1;
      reasons.push('trust:verified');
    }
    const admission = skill.admissionState.toLowerCase();
    if (admission === 'admitted') {
      score += 1;
      reasons.push('admission:admitted');
    } else if (admission === 'conditional') {
      reasons.push('admission:conditional');
    } else if (admission === 'quarantined') {
      score -= 5;
      reasons.push('admission:quarantined');
    }
    if (skill.sourcePriority <= 1) {
      score += 2;
      reasons.push('source:project-canonical');
    } else if (skill.sourcePriority === 2) {
      score += 1;
      reasons.push('source:preferred');
    } else {
      reasons.push(`source:priority-${skill.sourcePriority}`);
    }
    if (skill.requiredPermissions.length > 0) {
      reasons.push(`permissions:${skill.requiredPermissions.length}`);
    }
    if (reasons.length === 0) {
      reasons.push('baseline');
    }
    return { ...skill, score, reasons };
  }

  private isPreferredSkill(candidate: InstalledSkill, current: InstalledSkill): boolean {
    if (candidate.sourcePriority !== current.sourcePriority) {
      return candidate.sourcePriority < current.sourcePriority;
    }
    const admissionWeight = (value: string): number => {
      const normalized = value.toLowerCase();
      if (normalized === 'admitted') return 3;
      if (normalized === 'conditional') return 2;
      if (normalized === 'quarantined') return 1;
      return 0;
    };
    const candidateAdmission = admissionWeight(candidate.admissionState);
    const currentAdmission = admissionWeight(current.admissionState);
    if (candidateAdmission !== currentAdmission) {
      return candidateAdmission > currentAdmission;
    }
    const candidatePinned = candidate.versionPin !== 'unversioned';
    const currentPinned = current.versionPin !== 'unversioned';
    if (candidatePinned !== currentPinned) {
      return candidatePinned;
    }
    return candidate.label.localeCompare(current.label) < 0;
  }

  private initializeCheckpointStore(): void {
    try {
      const ledgerDb = this.qorelogicManager.getLedgerManager().getDatabase() as unknown as {
        exec: (sql: string) => void;
        prepare: (sql: string) => { run: (...args: unknown[]) => unknown; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown };
      };
      ledgerDb.exec(`
        CREATE TABLE IF NOT EXISTS failsafe_checkpoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          checkpoint_id TEXT NOT NULL UNIQUE,
          run_id TEXT NOT NULL,
          checkpoint_type TEXT NOT NULL,
          phase TEXT NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          parent_id TEXT,
          git_hash TEXT NOT NULL,
          policy_verdict TEXT NOT NULL,
          evidence_refs TEXT NOT NULL,
          actor TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          entry_hash TEXT NOT NULL UNIQUE,
          prev_hash TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_fs_ckpt_time ON failsafe_checkpoints(timestamp);
        CREATE INDEX IF NOT EXISTS idx_fs_ckpt_run ON failsafe_checkpoints(run_id);
        CREATE INDEX IF NOT EXISTS idx_fs_ckpt_phase ON failsafe_checkpoints(phase);
        CREATE INDEX IF NOT EXISTS idx_fs_ckpt_type ON failsafe_checkpoints(checkpoint_type);
      `);
      this.checkpointDb = ledgerDb;
    } catch (error) {
      this.checkpointDb = null;
      console.warn('Checkpoint store running in memory fallback mode:', error);
    }
  }

  private initializeRevertService(): void {
    const deps: RevertDeps = {
      getCheckpoint: (id: string) => this.getCheckpointById(id),
      gitService: this.gitResetService,
      purgeRagAfter: () => 0,
      recordRevertCheckpoint: (request: RevertRequest) => {
        this.recordCheckpoint({
          checkpointType: 'governance.revert',
          actor: request.actor,
          phase: 'revert',
          status: 'sealed',
          policyVerdict: 'PASS',
          evidenceRefs: [],
          payload: {
            targetCheckpointId: request.targetCheckpoint.checkpointId,
            targetGitHash: request.targetCheckpoint.gitHash,
            reason: request.reason,
          },
        });
        return crypto.randomUUID();
      },
      workspaceRoot: this.workspaceRoot,
    };
    this.revertService = new FailSafeRevertService(deps);
  }

  private getCheckpointById(id: string): CheckpointRef | null {
    if (this.checkpointDb) {
      try {
        const row = this.checkpointDb.prepare(
          'SELECT checkpoint_id, git_hash, timestamp, phase, status FROM failsafe_checkpoints WHERE checkpoint_id = ?',
        ).get(id) as { checkpoint_id: string; git_hash: string; timestamp: string; phase: string; status: string } | undefined;
        if (!row) return null;
        return {
          checkpointId: row.checkpoint_id,
          gitHash: row.git_hash,
          timestamp: row.timestamp,
          phase: row.phase,
          status: row.status,
        };
      } catch { /* fall through */ }
    }
    const mem = this.checkpointMemory.find((r) => r.checkpointId === id);
    if (!mem) return null;
    return {
      checkpointId: mem.checkpointId,
      gitHash: mem.gitHash,
      timestamp: mem.timestamp,
      phase: mem.phase,
      status: mem.status,
    };
  }

  private inferPhaseKeyFromPlan(plan: unknown): string {
    const phases = Array.isArray((plan as { phases?: unknown[] } | null)?.phases)
      ? (plan as { phases: Array<{ id?: string; title?: string; status?: string }> }).phases
      : [];
    const currentPhaseId = (plan as { currentPhaseId?: string } | null)?.currentPhaseId;
    const active = phases.find((phase) => phase.id === currentPhaseId)
      || phases.find((phase) => phase.status === 'active')
      || phases[0]
      || null;
    const title = String(active?.title || '').toLowerCase();
    if (title.includes('substantiat') || title.includes('release') || title.includes('ship')) return 'substantiate';
    if (title.includes('debug') || title.includes('fix') || title.includes('stabil')) return 'debug';
    if (title.includes('implement') || title.includes('build') || title.includes('develop')) return 'implement';
    if (title.includes('audit') || title.includes('review') || title.includes('verify')) return 'audit';
    return 'plan';
  }

  private stableStringify(value: unknown): string {
    const normalize = (input: unknown): unknown => {
      if (Array.isArray(input)) {
        return input.map((item) => normalize(item));
      }
      if (input && typeof input === 'object') {
        const obj = input as Record<string, unknown>;
        return Object.keys(obj)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = normalize(obj[key]);
            return acc;
          }, {});
      }
      return input;
    };
    return JSON.stringify(normalize(value));
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private tryGetGitHead(): string {
    const candidates = [
      path.resolve(process.cwd(), '.git', 'HEAD'),
      path.resolve(process.cwd(), '..', '.git', 'HEAD'),
    ];
    for (const headFile of candidates) {
      if (!fs.existsSync(headFile)) continue;
      try {
        const head = fs.readFileSync(headFile, 'utf8').trim();
        if (head.startsWith('ref:')) {
          const refPath = head.replace(/^ref:\s*/, '').trim();
          const refFile = path.resolve(path.dirname(headFile), refPath);
          if (fs.existsSync(refFile)) {
            return fs.readFileSync(refFile, 'utf8').trim();
          }
          return refPath;
        }
        return head;
      } catch {
        continue;
      }
    }
    return 'unknown';
  }

  private recordCheckpoint(input: {
    checkpointType: string;
    actor: string;
    phase: string;
    status: CheckpointStatus;
    policyVerdict: string;
    evidenceRefs: string[];
    payload: unknown;
  }): void {
    if (!this.checkpointTypeRegistry.has(input.checkpointType)) {
      return;
    }
    const timestamp = new Date().toISOString();
    const runId = this.planManager.getActivePlan()?.id
      || this.planManager.getCurrentSprint()?.id
      || 'global';
    const payloadJson = this.stableStringify(input.payload || {});
    const payloadHash = this.hash(payloadJson);
    const gitHash = this.tryGetGitHead();

    const previous = this.getRecentCheckpoints(1)[0] as CheckpointRecord | undefined;
    const prevHash = previous?.entryHash || 'GENESIS_CHECKPOINT';
    const checkpointId = crypto.randomUUID();
    const parentId = previous?.checkpointId || null;
    const entryHash = this.hash(this.stableStringify({
      checkpointId,
      runId,
      checkpointType: input.checkpointType,
      phase: input.phase,
      status: input.status,
      timestamp,
      parentId,
      gitHash,
      policyVerdict: input.policyVerdict,
      evidenceRefs: input.evidenceRefs.slice().sort(),
      actor: input.actor,
      payloadHash,
      prevHash,
    }));

    const record: CheckpointRecord = {
      checkpointId,
      runId,
      checkpointType: input.checkpointType,
      phase: input.phase,
      status: input.status,
      timestamp,
      parentId,
      gitHash,
      policyVerdict: input.policyVerdict,
      evidenceRefs: input.evidenceRefs,
      actor: input.actor,
      payloadJson,
      payloadHash,
      entryHash,
      prevHash,
    };

    if (this.checkpointDb) {
      try {
        this.checkpointDb.prepare(`
          INSERT INTO failsafe_checkpoints (
            checkpoint_id, run_id, checkpoint_type, phase, status, timestamp,
            parent_id, git_hash, policy_verdict, evidence_refs, actor,
            payload_json, payload_hash, entry_hash, prev_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          record.checkpointId,
          record.runId,
          record.checkpointType,
          record.phase,
          record.status,
          record.timestamp,
          record.parentId,
          record.gitHash,
          record.policyVerdict,
          JSON.stringify(record.evidenceRefs),
          record.actor,
          record.payloadJson,
          record.payloadHash,
          record.entryHash,
          record.prevHash,
        );
        return;
      } catch (error) {
        console.warn('Checkpoint persistence failed, using memory fallback:', error);
      }
    }

    this.checkpointMemory.unshift(record);
    if (this.checkpointMemory.length > 500) {
      this.checkpointMemory = this.checkpointMemory.slice(0, 500);
    }
  }

  private mapCheckpointRow(row: Record<string, unknown>): CheckpointRecord {
    const evidence = (() => {
      const raw = row.evidence_refs;
      if (typeof raw !== 'string' || raw.length === 0) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
      } catch {
        return [];
      }
    })();

    return {
      checkpointId: String(row.checkpoint_id || ''),
      runId: String(row.run_id || ''),
      checkpointType: String(row.checkpoint_type || ''),
      phase: String(row.phase || ''),
      status: String(row.status || 'validated') as CheckpointStatus,
      timestamp: String(row.timestamp || ''),
      parentId: row.parent_id ? String(row.parent_id) : null,
      gitHash: String(row.git_hash || 'unknown'),
      policyVerdict: String(row.policy_verdict || 'UNKNOWN'),
      evidenceRefs: evidence,
      actor: String(row.actor || 'system'),
      payloadJson: String(row.payload_json || '{}'),
      payloadHash: String(row.payload_hash || ''),
      entryHash: String(row.entry_hash || ''),
      prevHash: String(row.prev_hash || 'GENESIS_CHECKPOINT'),
    };
  }

  private getRecentCheckpoints(limit: number): CheckpointRecord[] {
    if (this.checkpointDb) {
      try {
        const rows = this.checkpointDb.prepare(`
          SELECT checkpoint_id, run_id, checkpoint_type, phase, status, timestamp,
                 parent_id, git_hash, policy_verdict, evidence_refs, actor,
                 payload_json, payload_hash, entry_hash, prev_hash
          FROM failsafe_checkpoints
          ORDER BY id DESC
          LIMIT ?
        `).all(limit) as Record<string, unknown>[];
        return rows.map((row) => this.mapCheckpointRow(row));
      } catch {
        // fall through to memory
      }
    }
    return this.checkpointMemory.slice(0, limit);
  }

  private verifyCheckpointChain(): boolean {
    const records = this.checkpointDb
      ? (() => {
          try {
            const rows = this.checkpointDb.prepare(`
              SELECT checkpoint_id, run_id, checkpoint_type, phase, status, timestamp,
                     parent_id, git_hash, policy_verdict, evidence_refs, actor,
                     payload_json, payload_hash, entry_hash, prev_hash
              FROM failsafe_checkpoints
              ORDER BY id ASC
            `).all() as Record<string, unknown>[];
            return rows.map((row) => this.mapCheckpointRow(row));
          } catch {
            return this.checkpointMemory.slice().reverse();
          }
        })()
      : this.checkpointMemory.slice().reverse();

    if (records.length === 0) return true;
    let prevHash = 'GENESIS_CHECKPOINT';
    for (const record of records) {
      const recomputedPayloadHash = this.hash(record.payloadJson);
      if (recomputedPayloadHash !== record.payloadHash) {
        return false;
      }
      const recomputedEntryHash = this.hash(this.stableStringify({
        checkpointId: record.checkpointId,
        runId: record.runId,
        checkpointType: record.checkpointType,
        phase: record.phase,
        status: record.status,
        timestamp: record.timestamp,
        parentId: record.parentId,
        gitHash: record.gitHash,
        policyVerdict: record.policyVerdict,
        evidenceRefs: record.evidenceRefs.slice().sort(),
        actor: record.actor,
        payloadHash: record.payloadHash,
        prevHash: record.prevHash,
      }));
      if (recomputedEntryHash !== record.entryHash) {
        return false;
      }
      if (record.prevHash !== prevHash) {
        return false;
      }
      prevHash = record.entryHash;
    }
    return true;
  }

  private getCheckpointSummary(): Record<string, unknown> {
    const recent = this.getRecentCheckpoints(1)[0];
    const chainValid = this.verifyCheckpointChain();
    return {
      total: this.checkpointDb
        ? (() => {
            try {
              const row = this.checkpointDb?.prepare('SELECT count(*) as c FROM failsafe_checkpoints').get() as { c: number };
              return Number(row?.c || 0);
            } catch {
              return this.checkpointMemory.length;
            }
          })()
        : this.checkpointMemory.length,
      chainValid,
      latestType: recent?.checkpointType || null,
      latestAt: recent?.timestamp || null,
      latestVerdict: recent?.policyVerdict || null,
    };
  }

  /**
   * Get recent transparency events from the prompt lifecycle audit stream.
   * These events track prompt builds, dispatches, and governance decisions.
   */
  private getTransparencyEvents(limit: number): Array<Record<string, unknown>> {
    // Read from the transparency log file if it exists
    const logPath = path.join(this.workspaceRoot, '.failsafe', 'logs', 'transparency.jsonl');
    const events: Array<Record<string, unknown>> = [];
    
    try {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const recentLines = lines.slice(-limit);
        for (const line of recentLines) {
          try {
            events.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch {
      // Return empty array on error
    }
    
    return events;
  }

  /**
   * Get the risk register from the QoreLogic risk manager.
   */
  private getRiskRegister(): Array<Record<string, unknown>> {
    // The RiskManager stores risks in .failsafe/risks/risks.json
    const risksPath = path.join(this.workspaceRoot, '.failsafe', 'risks', 'risks.json');
    
    try {
      if (fs.existsSync(risksPath)) {
        const content = fs.readFileSync(risksPath, 'utf-8');
        const data = JSON.parse(content);
        return Array.isArray(data.risks) ? data.risks : [];
      }
    } catch {
      // Return empty array on error
    }
    
    return [];
  }
}
