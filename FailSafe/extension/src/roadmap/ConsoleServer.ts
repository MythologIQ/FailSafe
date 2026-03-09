/**
 * ConsoleServer - Express HTTP + WebSocket server for Cumulative Roadmap
 *
 * Serves the external browser-based roadmap visualization on port 9376.
 * Provides real-time updates via WebSocket for live activity streaming.
 */
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as net from "net";
import express, { Request, Response } from "express";
import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { PlanManager } from "../qorelogic/planning/PlanManager";
import { QoreLogicManager } from "../qorelogic/QoreLogicManager";
import { SentinelDaemon } from "../sentinel/SentinelDaemon";
import { EventBus } from "../shared/EventBus";
import { SentinelVerdict } from "../shared/types";
import { IFeatureGate, FeatureFlag } from "../core/interfaces/IFeatureGate";
import { FEATURE_TIER_MAP } from "../core/FeatureGateService";
import { GitResetService } from "../governance/revert/GitResetService";
import {
  FailSafeRevertService,
  RevertDeps,
} from "../governance/revert/FailSafeRevertService";
import { CheckpointRef, RevertRequest } from "../governance/revert/types";
import {
  HomeRoute, RunDetailRoute, WorkflowsRoute, SkillsRoute,
  GenomeRoute, ReportsRoute, SettingsRoute, PreflightRoute,
  GovernanceKPIRoute, AgentCoverageRoute,
} from "./routes";
import { ConfigurationProfile } from "../genesis/ConfigurationProfile";
import type { RouteDeps } from "./routes";
import type { PermissionScopeManager } from "../governance/PermissionScopeManager";
import type { EnforcementEngine } from "../governance/EnforcementEngine";
import { BrainstormService } from "./services/BrainstormService";
import { AudioVaultService } from "./services/AudioVaultService";
import type { IConfigProvider } from "../core/interfaces/IConfigProvider";
import { LLMClient } from "../sentinel/utils/LLMClient";
import { setupBrainstormRoutes } from "./routes/BrainstormRoute";
import { setupCheckpointRoutes } from "./routes/CheckpointRoute";
import { setupActionsRoutes } from "./routes/ActionsRoute";
import { setupTransparencyRiskRoutes } from "./routes/TransparencyRiskRoute";
import type { ApiRouteDeps } from "./routes/types";
import { type InstalledSkill } from "./services/SkillParser";
import {
  autoIngest, manualIngest,
} from "./services/SkillRegistry";
import {
  discoverAllSkills, buildSkillRoots, buildWorkspaceDiscoveryRoots,
} from "./services/SkillDiscovery";
import { rankSkillForPhase, type SkillRelevance } from "./services/SkillRanker";
import {
  type CheckpointRecord, type CheckpointDb, type CheckpointStatus,
  getRecentCheckpoints as ckptGetRecent,
  getRecentVerdicts as ckptGetRecentVerdicts,
  verifyCheckpointChain as ckptVerifyChain,
  getCheckpointSummary as ckptGetSummary,
  buildCheckpointRecord as ckptBuildRecord,
  persistCheckpoint as ckptPersist,
  inferPhaseKeyFromPlan,
  CHECKPOINT_INIT_SQL,
} from "./services/CheckpointStore";
import {
  registerServer,
  markDisconnected,
  readRegistry,
} from "./services/ServerRegistry";

const PORT = 9376;
const HOST = "127.0.0.1";

// Read version from package.json once at module load
const EXTENSION_VERSION: string = (() => {
  try {
    const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version || 'unknown';
  } catch { return 'unknown'; }
})();

type QoreRuntimeOptions = {
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

type ConsoleServerOptions = {
  qoreRuntime?: Partial<QoreRuntimeOptions>;
  workspaceRoot?: string;
  featureGate?: IFeatureGate;
  configProvider?: IConfigProvider;
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

export class ConsoleServer {
  private app: express.Application;
  private server: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private planManager: PlanManager;
  private qorelogicManager: QoreLogicManager;
  private sentinelDaemon: SentinelDaemon;
  private eventBus: EventBus;
  private uiDir: string;
  private checkpointDb: CheckpointDb = null;
  private checkpointMemory: CheckpointRecord[] = [];
  private qoreRuntime: QoreRuntimeOptions;
  private workspaceRoot: string;
  private featureGate: IFeatureGate | undefined;
  private sealedSubstantiateCompletions = new Set<string>();
  private revertService: FailSafeRevertService | null = null;
  private gitResetService: GitResetService;
  private chainValidAt: string | null = null;
  private cachedChainValid: boolean = true;
  private brainstormService: BrainstormService;
  private audioVaultService: AudioVaultService;
  private configProvider: IConfigProvider | undefined;
  private enforcementEngine: EnforcementEngine | null = null;
  private permissionManager: PermissionScopeManager | null = null;
  private systemRegistry:
    | import("../qorelogic/SystemRegistry").SystemRegistry
    | null = null;
  private ideTracker:
    | import("./services/IdeActivityTracker").IdeActivityTracker
    | null = null;
  private scaffoldCallback: (() => Promise<{ scaffolded: number; skipped: number }>) | null = null;
  private checkpointTypeRegistry = new Set<string>([
    "snapshot.created",
    "phase.entered",
    "phase.exited",
    "skill.recommended",
    "skill.invoked",
    "policy.checked",
    "override.requested",
    "override.approved",
    "attempt.committed",
    "attempt.rolled_back",
    "export.generated",
    "monitoring.resumed",
    "monitoring.stopped",
    "event.stream",
    "governance.revert",
  ]);

  constructor(
    planManager: PlanManager,
    qorelogicManager: QoreLogicManager,
    sentinelDaemon: SentinelDaemon,
    eventBus: EventBus,
    options: ConsoleServerOptions = {},
  ) {
    this.planManager = planManager;
    this.qorelogicManager = qorelogicManager;
    this.sentinelDaemon = sentinelDaemon;
    this.eventBus = eventBus;
    this.app = express();
    this.qoreRuntime = this.resolveQoreRuntimeOptions(options.qoreRuntime);
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.featureGate = options.featureGate;
    this.configProvider = options.configProvider;
    this.uiDir = this.resolveUiDir();
    this.initializeCheckpointStore();
    this.gitResetService = new GitResetService();
    this.initializeRevertService();
    this.audioVaultService = new AudioVaultService(this.workspaceRoot);
    this.audioVaultService
      .init()
      .catch((err) => console.error("AudioVaultService init error:", err));
    this.brainstormService = this.createBrainstormService();
    this.setupRoutes();
    this.subscribeToEvents();
  }

  // ------------------------------------------------------------------
  //  Route setup
  // ------------------------------------------------------------------

  private setupRoutes(): void {
    this.app.use(express.json({ limit: "12mb" }));
    this.app.use(express.static(this.uiDir, { index: false, dotfiles: "allow" }));
    this.registerCoreRoutes();
    this.registerApiRoutes();
    this.registerSpaFallback();
  }

  /** Root, health, roadmap, hub, qore, sprint, plans, skills routes */
  private registerCoreRoutes(): void {
    this.app.get("/", (req: Request, res: Response) => {
      const file = this.getUiEntryFile(req);
      const target = path.join(this.uiDir, file);
      const sendOpts = { dotfiles: "allow" as const };
      if (fs.existsSync(target)) { res.sendFile(target, sendOpts); return; }
      res.sendFile(path.join(this.uiDir, "command-center.html"), sendOpts);
    });

    this.app.get("/health", (_req: Request, res: Response) => {
      const ready = fs.existsSync(path.join(this.uiDir, "index.html"));
      res.status(ready ? 200 : 503).json({ ready, uiDir: this.uiDir });
    });

    this.app.get("/api/roadmap", (_req: Request, res: Response) => {
      const sprints = this.planManager.getAllSprints();
      const currentSprint = this.planManager.getCurrentSprint();
      const activePlan = this.planManager.getActivePlan();
      res.json({ sprints, currentSprint, activePlan });
    });

    this.app.get("/api/hub", async (_req: Request, res: Response) => {
      res.json(await this.buildHubSnapshot());
    });

    // Workspace isolation: return server registry for workspace selector
    this.app.get("/api/v1/workspaces", (_req: Request, res: Response) => {
      const workspaces = readRegistry();
      res.json({
        workspaces,
        current: this.getWorkspaceRoot(),
      });
    });

    this.registerQoreRoutes();
    this.registerSkillRoutes();
  }

  private registerQoreRoutes(): void {
    this.app.get("/api/qore/runtime", async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      res.json(await this.fetchQoreRuntimeSnapshot());
    });
    this.app.get("/api/qore/health", async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      this.handleQoreProxy(req, res, "/health");
    });
    this.app.post("/api/qore/evaluate", async (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      this.handleQoreProxy(req, res, "/evaluate", "POST");
    });
    this.app.get("/api/sprint/:id", (req: Request, res: Response) => {
      const sprint = this.planManager.getSprint(req.params.id as string);
      res.json({ sprint, plan: sprint ? this.planManager.getPlan(sprint.planId) : null });
    });
    this.app.get("/api/plans", (_req: Request, res: Response) => {
      res.json({ plans: this.planManager.getAllPlans() });
    });
  }

  private async handleQoreProxy(
    req: Request, res: Response, endpoint: string, method?: "POST",
  ): Promise<void> {
    if (!this.qoreRuntime.enabled) {
      res.status(503).json({ error: "Qore runtime integration is disabled" });
      return;
    }
    const opts = method === "POST" ? { method: "POST" as const, body: req.body || {} } : undefined;
    const response = await this.fetchQoreJson(endpoint, opts);
    const body = response.ok ? response.body : { error: response.error, detail: response.detail };
    res.status(response.ok ? 200 : 502).json(body);
  }

  private registerSkillRoutes(): void {
    this.app.get("/api/skills", (_req: Request, res: Response) => {
      res.json({ skills: this.getInstalledSkills() });
    });

    this.app.post("/api/skills/ingest/auto", (_req: Request, res: Response) => {
      try {
        res.json(this.autoIngestWorkspaceSkills());
      } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
      }
    });

    this.app.post("/api/skills/ingest/manual", (req: Request, res: Response) => {
      try {
        const mode =
          String(req.body?.mode || "file").toLowerCase() === "folder"
            ? "folder" as const
            : "file" as const;
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        res.json(this.manualIngestSkillPayload(items, mode));
      } catch (error) {
        res.status(400).json({ ok: false, error: String(error) });
      }
    });

    this.app.get("/api/skills/relevance", (req: Request, res: Response) => {
      const phase = String(req.query.phase || "").trim().toLowerCase();
      if (!phase) {
        res.status(400).json({ error: "phase is required" });
        return;
      }
      res.json(this.buildSkillRelevance(phase));
    });
  }

  /** Delegated API routes + remaining inline API routes */
  private registerApiRoutes(): void {
    const apiDeps: ApiRouteDeps = {
      rejectIfRemote: (req, res) => this.rejectIfRemote(req, res),
      broadcast: (data) => this.broadcast(data),
      brainstormService: this.brainstormService,
      audioVaultService: this.audioVaultService,
      getRecentCheckpoints: (limit) => this.getRecentCheckpoints(limit),
      getCheckpointById: (id) => this.getCheckpointById(id),
      verifyCheckpointChain: () => this.verifyCheckpointChain(),
      revertService: this.revertService,
      sentinelDaemon: this.sentinelDaemon,
      planManager: this.planManager,
      qorelogicManager: this.qorelogicManager,
      recordCheckpoint: (input) => this.recordCheckpoint(input),
      inferPhaseKeyFromPlan: (plan) => this.inferPhaseKeyFromPlan(plan),
      chainValidAt: this.chainValidAt,
      cachedChainValid: this.cachedChainValid,
      setCachedChainValid: (v, at) => {
        this.cachedChainValid = v;
        this.chainValidAt = at;
      },
      getTransparencyEvents: (limit) => this.getTransparencyEvents(limit),
      getRiskRegister: () => this.getRiskRegister(),
      writeRiskRegister: (risks) => this.writeRiskRegister(risks),
      scaffoldSkills: this.scaffoldCallback ?? undefined,
    };

    setupTransparencyRiskRoutes(this.app, apiDeps);
    setupBrainstormRoutes(this.app, apiDeps);
    setupCheckpointRoutes(this.app, apiDeps);
    setupActionsRoutes(this.app, apiDeps);

    this.registerFeatureAndStatusRoutes();
    this.registerHookRoutes();
  }

  private registerFeatureAndStatusRoutes(): void {
    this.app.get("/api/v1/features", (_req: Request, res: Response) => {
      if (!this.featureGate) { res.json({ tier: "free", features: {} }); return; }
      const tier = this.featureGate.getTier();
      const features: Record<string, { requiredTier: string; enabled: boolean }> = {};
      for (const flag of Object.keys(FEATURE_TIER_MAP) as FeatureFlag[]) {
        features[flag] = { requiredTier: FEATURE_TIER_MAP[flag], enabled: this.featureGate.isEnabled(flag) };
      }
      res.json({ tier, features });
    });
    this.app.get("/api/v1/status", async (_req: Request, res: Response) => {
      const hub = await this.buildHubSnapshot();
      const s = hub.sentinelStatus as Record<string, unknown> | undefined;
      res.json({
        sentinel: { running: s?.running ?? false, mode: s?.mode ?? "unknown", eventsProcessed: s?.eventsProcessed ?? 0 },
        governance: { mode: s?.mode ?? "observe" },
        chain: { valid: hub.chainValid ?? false },
        version: hub.version ?? "unknown",
      });
    });
    this.registerVerdictAndTrustRoutes();
  }

  private registerVerdictAndTrustRoutes(): void {
    this.app.get("/api/v1/verdicts", (_req: Request, res: Response) => {
      const limit = Math.min(Number(_req.query.limit) || 20, 100);
      res.json(this.getRecentVerdicts(limit));
    });
    this.app.get("/api/v1/trust", async (_req: Request, res: Response) => {
      const hub = await this.buildHubSnapshot();
      const cps = Object.values((hub.checkpoints as Record<string, unknown>) || {});
      const total = cps.length || 1;
      const passed = cps.filter((c: any) => c.policyVerdict !== "VIOLATION").length;
      res.json({ overall: Math.round((passed / total) * 100), checkpointCount: total, passCount: passed });
    });
  }

  /** B107: Workspace hook toggle routes */
  private registerHookRoutes(): void {
    this.app.get("/api/hooks/status", (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      const sentinelPath = path.join(
        this.workspaceRoot, ".claude", "hooks", "disabled",
      );
      res.json({ enabled: !fs.existsSync(sentinelPath) });
    });

    this.app.post("/api/hooks/toggle", (req: Request, res: Response) => {
      if (this.rejectIfRemote(req, res)) return;
      if (typeof req.body?.enabled !== "boolean") {
        res.status(400).json({ error: "enabled must be a boolean" });
        return;
      }
      const sentinelPath = path.join(
        this.workspaceRoot, ".claude", "hooks", "disabled",
      );
      if (req.body.enabled) {
        fs.rmSync(sentinelPath, { force: true });
      } else {
        fs.mkdirSync(path.dirname(sentinelPath), { recursive: true });
        fs.writeFileSync(sentinelPath, "disabled by FailSafe Console");
      }
      res.json({ enabled: req.body.enabled });
    });
  }

  /** SPA fallback for deep links or unknown non-API routes */
  private registerSpaFallback(): void {
    this.app.use((req: Request, res: Response) => {
      if (req.path.startsWith("/api/") || req.path === "/health") {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const staticExts = [
        ".js", ".mjs", ".css", ".wasm", ".onnx",
        ".png", ".jpg", ".svg", ".data", ".json", ".bin",
      ];
      if (staticExts.some((ext) => req.path.toLowerCase().endsWith(ext))) {
        res.status(404).type("text/plain").send("Not found");
        return;
      }
      const file = this.getUiEntryFile(req);
      const target = path.join(this.uiDir, file);
      const sendOpts = { dotfiles: "allow" as const };
      if (fs.existsSync(target)) { res.sendFile(target, sendOpts); return; }
      res.sendFile(path.join(this.uiDir, "command-center.html"), sendOpts);
    });
  }

  // ------------------------------------------------------------------
  //  UI helpers
  // ------------------------------------------------------------------

  private getUiEntryFile(req: Request): "command-center.html" | "index.html" {
    const uiMode = String(req.query.ui || "").toLowerCase();
    const compactParam = String(req.query.compact || "").toLowerCase();
    if (uiMode === "compact") return "index.html";
    if (uiMode === "console" || uiMode === "extended" || uiMode === "popout") {
      return "command-center.html";
    }
    if (compactParam === "1" || compactParam === "true" || compactParam === "yes") {
      return "index.html";
    }
    return "command-center.html";
  }

  // ------------------------------------------------------------------
  //  Auth middleware
  // ------------------------------------------------------------------

  private isLocalRequest(req: Request): boolean {
    const normalized = String(req.socket?.remoteAddress || req.ip || "").trim();
    return (
      normalized === "127.0.0.1" ||
      normalized === "::1" ||
      normalized === "::ffff:127.0.0.1"
    );
  }

  private rejectIfRemote(req: Request, res: Response): boolean {
    if (this.isLocalRequest(req)) return false;
    res.status(403).json({ error: "Forbidden: local access only" });
    return true;
  }

  private rejectIfProRequired(
    feature: FeatureFlag,
    _req: Request,
    res: Response,
  ): boolean {
    if (!this.featureGate || this.featureGate.isEnabled(feature)) return false;
    res.status(402).json({
      error: `Feature '${feature}' is not enabled in current configuration`,
      upgrade: true,
      currentTier: this.featureGate.getTier(),
      requiredTier: "pro",
    });
    return true;
  }

  // ------------------------------------------------------------------
  //  WebSocket
  // ------------------------------------------------------------------

  private setupWebSocket(): void {
    if (!this.server) return;
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on("connection", (ws) => {
      this.buildHubSnapshot().then((hub) => {
        ws.send(JSON.stringify({ type: "init", payload: hub }));
      });
    });
  }

  private broadcast(data: Record<string, unknown>): void {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  }

  // ------------------------------------------------------------------
  //  Console UI routes (HTML server-rendered)
  // ------------------------------------------------------------------

  setConsoleDeps(
    enforcement: EnforcementEngine,
    perm: PermissionScopeManager,
  ): void {
    this.enforcementEngine = enforcement;
    this.permissionManager = perm;
  }

  setSystemRegistry(
    registry: import("../qorelogic/SystemRegistry").SystemRegistry,
  ): void {
    this.systemRegistry = registry;
  }

  setIdeTracker(
    tracker: import("./services/IdeActivityTracker").IdeActivityTracker,
  ): void {
    this.ideTracker = tracker;
  }

  setScaffoldCallback(cb: () => Promise<{ scaffolded: number; skipped: number }>): void {
    this.scaffoldCallback = cb;
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
    this.app.get("/console/home", async (req, res) => HomeRoute.render(req, res, deps()));
    this.app.get("/console/run/:runId", (req, res) => RunDetailRoute.render(req, res, deps()));
    this.app.get("/console/workflows", (req, res) => WorkflowsRoute.render(req, res, deps()));
    this.app.get("/console/skills", (req, res) => SkillsRoute.render(req, res, deps()));
    this.app.get("/console/genome", async (req, res) => GenomeRoute.render(req, res, deps()));
    this.app.get("/console/reports", async (req, res) => ReportsRoute.render(req, res, deps()));
    this.app.get("/console/settings", (req, res) => SettingsRoute.render(req, res, deps()));
    this.app.get("/console/kpi", async (req, res) =>
      GovernanceKPIRoute.render(req, res, { ledgerManager: deps().ledgerManager }),
    );
    this.registerConsoleExtras();
  }

  private registerConsoleExtras(): void {
    this.app.get("/console/agents", async (req, res) => {
      if (!this.systemRegistry) { res.status(503).send("SystemRegistry not available"); return; }
      AgentCoverageRoute.render(req, res, { systemRegistry: this.systemRegistry });
    });
    if (!this.permissionManager) return;
    const pm = this.permissionManager;
    this.app.get("/console/preflight", (req, res) => PreflightRoute.render(req, res, { permissionManager: pm }));
    this.app.post("/console/preflight/grant", (req, res) => PreflightRoute.handleGrant(req, res, { permissionManager: pm }));
    this.app.post("/console/preflight/deny", (req, res) => PreflightRoute.handleDeny(req, res, { permissionManager: pm }));
  }

  // ------------------------------------------------------------------
  //  Event subscriptions
  // ------------------------------------------------------------------

  private subscribeToEvents(): void {
    this.eventBus.on("genesis.streamEvent" as never, (event: unknown) => {
      const streamPayload = this.extractEventPayload(event);
      this.maybeRecordSubstantiateCompletion(streamPayload);
      this.broadcast({ type: "event", payload: event });
      this.recordCheckpoint({
        checkpointType: "event.stream", actor: "engine",
        phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
        status: "validated", policyVerdict: "PASS", evidenceRefs: [], payload: streamPayload,
      });
    });
    this.eventBus.on("sentinel.verdict" as never, (event: { payload: unknown }) => {
      const verdict = event.payload as SentinelVerdict;
      this.recordVerdictCheckpoint(verdict);
      this.maybeRecordAuditPassCheckpoint(verdict);
      this.broadcast({ type: "verdict", payload: event.payload });
      this.broadcast({ type: "hub.refresh" });
    });
    this.subscribeToQorelogicEvents();
  }

  private subscribeToQorelogicEvents(): void {
    const currentPhase = () => this.inferPhaseKeyFromPlan(this.planManager.getActivePlan());
    this.eventBus.on("qorelogic.l3Queued" as never, (event: unknown) => {
      this.recordCheckpoint({
        checkpointType: "override.requested", actor: "qorelogic",
        phase: currentPhase(), status: "proposed", policyVerdict: "ESCALATE",
        evidenceRefs: [], payload: event,
      });
      this.broadcast({ type: "hub.refresh" });
    });
    this.eventBus.on("qorelogic.l3Decided" as never, (event: unknown) => {
      this.recordCheckpoint({
        checkpointType: "override.approved", actor: "qorelogic",
        phase: currentPhase(), status: "sealed", policyVerdict: "PASS",
        evidenceRefs: [], payload: event,
      });
      this.broadcast({ type: "hub.refresh" });
    });
    this.eventBus.on("qorelogic.trustUpdate" as never, () =>
      this.broadcast({ type: "hub.refresh" }),
    );
  }

  private recordVerdictCheckpoint(verdict: SentinelVerdict): void {
    this.recordCheckpoint({
      checkpointType: "policy.checked",
      actor: verdict.agentDid || "sentinel",
      phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
      status: "validated",
      policyVerdict: String(verdict.decision || "UNKNOWN"),
      evidenceRefs: [],
      payload: {
        decision: verdict.decision,
        riskGrade: verdict.riskGrade,
        summary: verdict.summary,
      },
    });
  }

  private extractEventPayload(event: unknown): unknown {
    if (!event || typeof event !== "object") return event;
    return (event as { payload?: unknown }).payload ?? event;
  }

  private maybeRecordAuditPassCheckpoint(verdict: SentinelVerdict): void {
    if (String(verdict.decision || "").toUpperCase() !== "PASS") return;
    this.recordCheckpoint({
      checkpointType: "attempt.committed",
      actor: verdict.agentDid || "sentinel",
      phase: "audit",
      status: "sealed",
      policyVerdict: "PASS",
      evidenceRefs: [],
      payload: {
        trigger: "audit.pass",
        riskGrade: verdict.riskGrade,
        summary: verdict.summary,
      },
    });
  }

  private maybeRecordSubstantiateCompletion(streamPayload: unknown): void {
    if (!streamPayload || typeof streamPayload !== "object") return;
    const payload = streamPayload as {
      planEvent?: {
        type?: string;
        planId?: string;
        payload?: { phaseId?: string };
      };
    };
    const planEvent = payload.planEvent;
    if (!planEvent || String(planEvent.type || "") !== "phase.completed") return;
    const planId = String(planEvent.planId || "");
    const phaseId = String(planEvent.payload?.phaseId || "");
    if (!planId || !phaseId) return;
    const dedupeKey = `${planId}:${phaseId}`;
    if (this.sealedSubstantiateCompletions.has(dedupeKey)) return;
    const plan = this.planManager.getPlan(planId);
    const phase = plan?.phases.find((item) => item.id === phaseId);
    const phaseTitle = String(phase?.title || "").toLowerCase();
    const isSubstantiate =
      phaseTitle.includes("substantiat") ||
      phaseTitle.includes("release") ||
      phaseTitle.includes("ship");
    if (!isSubstantiate) return;
    this.sealedSubstantiateCompletions.add(dedupeKey);
    this.recordCheckpoint({
      checkpointType: "phase.exited",
      actor: "plan-manager",
      phase: "substantiate",
      status: "sealed",
      policyVerdict: "PASS",
      evidenceRefs: [],
      payload: {
        trigger: "phase.completed",
        planId,
        phaseId,
        phaseTitle: phase?.title || "Substantiate",
      },
    });
  }

  // ------------------------------------------------------------------
  //  Qore Runtime
  // ------------------------------------------------------------------

  private async fetchQoreRuntimeSnapshot(): Promise<QoreRuntimeSnapshot> {
    const checkedAt = new Date().toISOString();
    if (!this.qoreRuntime.enabled) {
      return {
        enabled: false, connected: false,
        baseUrl: this.qoreRuntime.baseUrl, lastCheckedAt: checkedAt,
        error: "disabled",
      };
    }
    const startedAt = Date.now();
    const health = await this.fetchQoreJson("/health");
    if (!health.ok) {
      return {
        enabled: true, connected: false,
        baseUrl: this.qoreRuntime.baseUrl,
        latencyMs: Date.now() - startedAt, lastCheckedAt: checkedAt,
        error: health.error || "runtime_unreachable",
      };
    }
    const policy = await this.fetchQoreJson("/policy/version");
    return {
      enabled: true, connected: true,
      baseUrl: this.qoreRuntime.baseUrl,
      policyVersion: policy.ok
        ? String((policy.body as { policyVersion?: string }).policyVersion || "")
        : undefined,
      latencyMs: Date.now() - startedAt, lastCheckedAt: checkedAt,
    };
  }

  private async fetchQoreJson(
    endpoint: string,
    options?: { method?: "GET" | "POST"; body?: unknown },
  ): Promise<
    { ok: true; body: unknown } | { ok: false; error: string; detail?: string }
  > {
    if (!this.qoreRuntime.enabled) return { ok: false, error: "disabled" };
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(), this.qoreRuntime.timeoutMs,
    );
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.qoreRuntime.apiKey) {
      headers["x-qore-api-key"] = this.qoreRuntime.apiKey;
    }
    try {
      const response = await fetch(`${this.qoreRuntime.baseUrl}${endpoint}`, {
        method: options?.method || "GET",
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const detail = await response.text();
        return { ok: false, error: `upstream_${response.status}`, detail };
      }
      return { ok: true, body: await response.json() };
    } catch (error) {
      clearTimeout(timer);
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, error: "request_failed", detail };
    }
  }

  // ------------------------------------------------------------------
  //  Hub snapshot
  // ------------------------------------------------------------------

  private async buildHubSnapshot(): Promise<Record<string, unknown>> {
    const activePlan = this.planManager.getActivePlan();
    const sentinelStatusRaw = this.sentinelDaemon.getStatus();
    const sentinelStatus = { ...sentinelStatusRaw };
    if (this.checkpointDb && sentinelStatus.eventsProcessed === 0) {
      try {
        const row = this.checkpointDb.prepare(
          `SELECT COUNT(*) as cnt FROM failsafe_checkpoints
           WHERE checkpoint_type LIKE 'policy.%'`,
        ).get() as { cnt: number } | undefined;
        if (row?.cnt) (sentinelStatus as Record<string, unknown>).eventsProcessed = row.cnt;
      } catch { /* non-fatal */ }
    }
    const l3Queue = this.qorelogicManager.getL3Queue();
    const agents = await this.qorelogicManager.getTrustEngine().getAllAgents();
    const trustSummary = this.buildTrustSummary(agents);
    const qoreRuntime = await this.fetchQoreRuntimeSnapshot();
    const nodeStatus = this.buildNodeStatus(
      sentinelStatus as unknown as { running?: boolean; filesWatched?: number; queueDepth?: number; [k: string]: unknown },
      l3Queue, trustSummary, qoreRuntime,
    );
    return {
      version: EXTENSION_VERSION,
      sprints: this.planManager.getAllSprints(),
      currentSprint: this.planManager.getCurrentSprint(),
      activePlan,
      sentinelStatus,
      recentVerdicts: this.getRecentVerdicts(10),
      l3Queue,
      trustSummary,
      nodeStatus,
      checkpointSummary: this.getCheckpointSummary(),
      recentCheckpoints: this.getRecentCheckpoints(12),
      qoreRuntime,
      runState: this.ideTracker
        ? this.ideTracker.getRunState(
            this.inferActivePhaseTitle(activePlan),
          )
        : { currentPhase: "Plan", activeTasks: [], activeDebugSessions: [] },
      riskSummary: this.buildRiskSummary(),
      recentCompletions: this.buildRecentCompletions(),
      bootstrapState: {
        skillsInstalled: fs.existsSync(
          path.join(this.getWorkspaceRoot(), ".claude", "commands", "ql-bootstrap.md"),
        ),
        governanceInitialized: fs.existsSync(
          path.join(this.getWorkspaceRoot(), "docs", "CONCEPT.md"),
        ),
        workspaceName: path.basename(this.getWorkspaceRoot()),
      },
      // Workspace isolation: identity for multi-workspace support
      workspaceName: path.basename(this.getWorkspaceRoot()),
      workspacePath: this.getWorkspaceRoot(),
      serverPort: this.actualPort,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildTrustSummary(
    agents: Array<{ trustScore: number; isQuarantined: boolean; trustStage: string }>,
  ): Record<string, unknown> {
    const totalAgents = agents.length;
    const avgTrust = totalAgents === 0
      ? 0
      : agents.reduce((sum, a) => sum + a.trustScore, 0) / totalAgents;
    const quarantined = agents.filter((a) => a.isQuarantined).length;
    const stageCounts = agents.reduce(
      (counts, a) => {
        counts[a.trustStage] = (counts[a.trustStage] || 0) + 1;
        return counts;
      },
      { CBT: 0, KBT: 0, IBT: 0 } as Record<string, number>,
    );
    return { totalAgents, avgTrust, quarantined, stageCounts };
  }

  private buildNodeStatus(
    sentinel: { running?: boolean; filesWatched?: number; queueDepth?: number; [k: string]: unknown },
    l3Queue: unknown[],
    trust: Record<string, unknown>,
    qore: QoreRuntimeSnapshot,
  ): Array<Record<string, unknown>> {
    return [
      {
        id: "workspace-core", label: "Workspace Core",
        state: sentinel.running ? "nominal" : "paused",
        signal: `${sentinel.filesWatched || 0} files watched`,
      },
      {
        id: "verification-queue", label: "Verification Queue",
        state: l3Queue.length || (sentinel.queueDepth as number) > 0
          ? "reviewing" : "nominal",
        signal: `${l3Queue.length || 0} pending approvals`,
      },
      {
        id: "trust-engine", label: "Trust Engine",
        state: (trust.quarantined as number) > 0 ? "degraded" : "nominal",
        signal: `${Math.round((trust.avgTrust as number) * 100)}% avg trust`,
      },
      {
        id: "qore-runtime", label: "Qore Runtime",
        state: !qore.enabled ? "paused" : qore.connected ? "nominal" : "degraded",
        signal: !qore.enabled
          ? "integration disabled"
          : qore.connected
            ? `connected (${qore.policyVersion || "unknown policy"})`
            : `unreachable (${qore.baseUrl})`,
      },
    ];
  }

  // ------------------------------------------------------------------
  //  Server lifecycle
  // ------------------------------------------------------------------

  private actualPort: number = PORT;

  async start(): Promise<void> {
    this.actualPort = await this.findAvailablePort(PORT);
    this.server = this.app.listen(this.actualPort, HOST, () => {
      console.log(`Roadmap server: http://localhost:${this.actualPort}`);
    });
    this.setupWebSocket();
    // Register in multi-workspace server registry
    registerServer({
      port: this.actualPort,
      workspaceName: path.basename(this.getWorkspaceRoot()),
      workspacePath: this.getWorkspaceRoot(),
      pid: process.pid,
      startedAt: new Date().toISOString(),
    });
    this.recordCheckpoint({
      checkpointType: "snapshot.created",
      actor: "system",
      phase: this.inferPhaseKeyFromPlan(this.planManager.getActivePlan()),
      status: "validated",
      policyVerdict: "PASS",
      evidenceRefs: [],
      payload: { source: "roadmap-server.start" },
    });
  }

  stop(): void {
    // Mark as disconnected (not unregister) so workspace remains visible
    markDisconnected(this.actualPort);
    this.wss?.close();
    this.server?.close();
  }

  getPort(): number {
    return this.actualPort;
  }

  private async findAvailablePort(preferred: number): Promise<number> {
    if (await this.isPortAvailable(preferred)) return preferred;
    for (let offset = 1; offset <= 10; offset++) {
      const candidate = preferred + offset;
      if (await this.isPortAvailable(candidate)) {
        console.log(`Port ${preferred} in use, using ${candidate}`);
        return candidate;
      }
    }
    return preferred;
  }

  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, HOST);
    });
  }

  // ------------------------------------------------------------------
  //  Skills (delegated to extracted modules)
  // ------------------------------------------------------------------

  private getInstalledSkills(): InstalledSkill[] {
    return discoverAllSkills(this.getWorkspaceRoot(), __dirname);
  }

  private autoIngestWorkspaceSkills(): Record<string, unknown> {
    const ws = this.getWorkspaceRoot();
    return autoIngest(
      ws, buildWorkspaceDiscoveryRoots(ws),
      () => this.getInstalledSkills(), buildSkillRoots(ws, __dirname),
    );
  }

  private manualIngestSkillPayload(
    items: unknown[], mode: "file" | "folder",
  ): Record<string, unknown> {
    return manualIngest(items, mode, this.getWorkspaceRoot(), () => this.getInstalledSkills());
  }

  private buildSkillRelevance(phase: string): Record<string, unknown> {
    const catalog = this.getInstalledSkills();
    const ranked: SkillRelevance[] = catalog
      .map((skill) => rankSkillForPhase(skill, phase))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    let allRelevant = ranked.filter((item) => item.score > 1);
    if (allRelevant.length === 0) allRelevant = ranked.slice();
    const recommended = allRelevant.slice(0, Math.min(4, allRelevant.length));
    const relevantKeys = new Set(allRelevant.map((item) => item.key));
    const otherAvailable = ranked.filter((item) => !relevantKeys.has(item.key));
    return { phase, recommended, allRelevant, otherAvailable };
  }

  // ------------------------------------------------------------------
  //  Checkpoint management (delegated to CheckpointStore)
  // ------------------------------------------------------------------

  private initializeCheckpointStore(): void {
    try {
      const ledgerDb = this.qorelogicManager
        .getLedgerManager()
        .getDatabase() as unknown as {
        exec: (sql: string) => void;
      } & CheckpointDb;
      ledgerDb.exec(CHECKPOINT_INIT_SQL);
      this.checkpointDb = ledgerDb;
      this.cachedChainValid = this.verifyCheckpointChain();
      this.chainValidAt = new Date().toISOString();
    } catch (error) {
      this.checkpointDb = null;
      this.cachedChainValid = false;
      this.chainValidAt = null;
    }
  }

  private initializeRevertService(): void {
    const deps: RevertDeps = {
      getCheckpoint: (id: string) => this.getCheckpointById(id),
      gitService: this.gitResetService,
      purgeRagAfter: () => 0,
      recordRevertCheckpoint: (request: RevertRequest) => {
        this.recordCheckpoint({
          checkpointType: "governance.revert",
          actor: request.actor, phase: "revert", status: "sealed",
          policyVerdict: "PASS", evidenceRefs: [],
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
          "SELECT checkpoint_id, git_hash, timestamp, phase, status FROM failsafe_checkpoints WHERE checkpoint_id = ?",
        ).get(id) as
          | { checkpoint_id: string; git_hash: string; timestamp: string; phase: string; status: string }
          | undefined;
        if (row) {
          return {
            checkpointId: row.checkpoint_id, gitHash: row.git_hash,
            timestamp: row.timestamp, phase: row.phase, status: row.status,
          };
        }
      } catch { /* fall through */ }
    }
    const mem = this.checkpointMemory.find((r) => r.checkpointId === id);
    if (!mem) return null;
    return {
      checkpointId: mem.checkpointId, gitHash: mem.gitHash,
      timestamp: mem.timestamp, phase: mem.phase, status: mem.status,
    };
  }

  private inferPhaseKeyFromPlan(plan: unknown): string {
    return inferPhaseKeyFromPlan(plan);
  }

  private recordCheckpoint(input: {
    checkpointType: string; actor: string; phase: string;
    status: CheckpointStatus; policyVerdict: string;
    evidenceRefs: string[]; payload: unknown;
  }): void {
    if (!this.checkpointTypeRegistry.has(input.checkpointType)) return;
    if (input.evidenceRefs.length === 0) {
      const since = new Date(Date.now() - 60_000).toISOString();
      input.evidenceRefs = this.sentinelDaemon.getRecentObservationIds(since, 10);
    }
    const runId = this.planManager.getActivePlan()?.id ||
      this.planManager.getCurrentSprint()?.id || "global";
    const record = ckptBuildRecord(
      input, new Date().toISOString(), runId,
      this.checkpointDb, this.checkpointMemory,
    );
    ckptPersist(record, this.checkpointDb, this.checkpointMemory);
  }

  private getRecentCheckpoints(limit: number): CheckpointRecord[] {
    return ckptGetRecent(this.checkpointDb, this.checkpointMemory, limit);
  }

  private getRecentVerdicts(limit = 50): Array<Record<string, unknown>> {
    return ckptGetRecentVerdicts(this.checkpointDb, this.checkpointMemory, limit);
  }

  private verifyCheckpointChain(): boolean {
    return ckptVerifyChain(this.checkpointDb, this.checkpointMemory);
  }

  private getCheckpointSummary(): Record<string, unknown> {
    return ckptGetSummary(
      this.checkpointDb, this.checkpointMemory,
      this.cachedChainValid, this.chainValidAt,
    );
  }

  // ------------------------------------------------------------------
  //  Hub snapshot helpers
  // ------------------------------------------------------------------

  private inferActivePhaseTitle(
    activePlan: ReturnType<PlanManager["getActivePlan"]>,
  ): string | undefined {
    if (!activePlan) {
      const recent = this.getRecentCheckpoints(1);
      return recent.length > 0 ? recent[0].phase : undefined;
    }
    const p = activePlan as unknown as Record<string, unknown>;
    if (p.currentPhaseId) return String(p.currentPhaseId);
    const phases = p.phases as Array<{ status: string; title: string }> | undefined;
    return phases?.find((ph) => ph.status === "active")?.title;
  }

  private buildRiskSummary(): Record<string, number> {
    const verdicts = this.getRecentVerdicts(50);
    const high = verdicts.filter(
      v => ["BLOCK", "ESCALATE", "QUARANTINE"].includes(String(v.decision)),
    ).length;
    const medium = verdicts.filter(v => String(v.decision) === "WARN").length;
    const low = verdicts.filter(v => String(v.decision) === "PASS").length;
    return { high, medium, low };
  }

  private buildRecentCompletions(): Array<Record<string, unknown>> {
    const completionTypes = new Set([
      "milestone.completed",
      "phase.completed",
      "substantiate.sealed",
    ]);
    return this.getRecentCheckpoints(20)
      .filter((c) => completionTypes.has(c.checkpointType))
      .slice(0, 5)
      .map((c) => ({ type: c.checkpointType, phase: c.phase, at: c.timestamp }));
  }

  // ------------------------------------------------------------------
  //  Transparency & Risk helpers (used by buildHubSnapshot + routes)
  // ------------------------------------------------------------------

  private getTransparencyEvents(limit: number): Array<Record<string, unknown>> {
    const logPath = path.join(
      this.workspaceRoot, ".failsafe", "logs", "transparency.jsonl",
    );
    const events: Array<Record<string, unknown>> = [];
    try {
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
        for (const line of lines.slice(-limit)) {
          try { events.push(JSON.parse(line)); } catch { /* skip malformed */ }
        }
      }
    } catch { /* return empty */ }
    return events;
  }

  private getRiskRegister(): Array<Record<string, unknown>> {
    const risksPath = path.join(
      this.workspaceRoot, ".failsafe", "risks", "risks.json",
    );
    try {
      if (fs.existsSync(risksPath)) {
        const data = JSON.parse(fs.readFileSync(risksPath, "utf-8"));
        return Array.isArray(data.risks) ? data.risks : [];
      }
    } catch { /* return empty */ }
    return [];
  }

  private writeRiskRegister(risks: Array<Record<string, unknown>>): void {
    const risksPath = path.join(
      this.workspaceRoot, ".failsafe", "risks", "risks.json",
    );
    const dir = path.dirname(risksPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(risksPath, JSON.stringify({ risks }, null, 2), "utf-8");
  }

  // ------------------------------------------------------------------
  //  Initialization helpers
  // ------------------------------------------------------------------

  private getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  private resolveUiDir(): string {
    const candidates = [
      path.join(__dirname, "ui"),
      path.resolve(__dirname, "../../src/roadmap/ui"),
      path.resolve(__dirname, "../../../src/roadmap/ui"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, "index.html"))) return candidate;
    }
    return path.join(__dirname, "ui");
  }

  private resolveQoreRuntimeOptions(
    options?: Partial<QoreRuntimeOptions>,
  ): QoreRuntimeOptions {
    const baseUrl = String(options?.baseUrl || "http://127.0.0.1:7777")
      .trim().replace(/\/+$/, "");
    return {
      enabled: Boolean(options?.enabled),
      baseUrl,
      apiKey: options?.apiKey ? String(options.apiKey) : undefined,
      timeoutMs: Math.max(500, Math.min(30000, Number(options?.timeoutMs || 4000))),
    };
  }

  private createBrainstormService(): BrainstormService {
    return new BrainstormService(async (prompt, payload) => {
      const fullPrompt = `${prompt}\n\nTranscript:\n${payload}`;
      const clean = (raw: string): string => {
        let c = raw.trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "");
        const first = c.indexOf("{");
        const last = c.lastIndexOf("}");
        if (first >= 0 && last > first) c = c.slice(first, last + 1);
        return c;
      };
      if (this.configProvider) {
        const llm = new LLMClient(this.configProvider);
        if (await llm.checkAvailability()) {
          try {
            const result = await llm.callEndpoint(fullPrompt, 60000);
            return clean(result.response);
          } catch (err) {
            console.warn("[Brainstorm] Ollama callEndpoint failed:", err);
          }
        }
      }
      try {
        const vscode = await import("vscode");
        const models = await vscode.lm.selectChatModels();
        if (models.length > 0) {
          const messages = [vscode.LanguageModelChatMessage.User(fullPrompt)];
          const chatResponse = await models[0].sendRequest(messages);
          let text = "";
          for await (const chunk of chatResponse.text) text += chunk;
          return clean(text);
        }
      } catch { /* VS Code LM API not available */ }
      throw new Error(
        "No LLM available — start Ollama or enable a VS Code language model",
      );
    });
  }
}
