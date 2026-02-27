/**
 * FailSafeApiServer - REST + SSE API server for FailSafe governance services
 *
 * Exposes all FailSafe governance services over REST + SSE on localhost:7777.
 * Modeled on RoadmapServer.ts but purpose-built for programmatic API access.
 * Binds to 127.0.0.1 only for security.
 */

import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Server as HttpServer } from 'http';
import { IConfigProvider } from '../core/interfaces/IConfigProvider';
import { IFeatureGate, FeatureFlag } from '../core/interfaces/IFeatureGate';
import { FEATURE_TIER_MAP } from '../core/FeatureGateService';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { EventStreamBridge } from './EventStreamBridge';
import { createAuthMiddleware } from './middleware/auth';

// Lazy service references - wired in after construction via setServices()
import type { EnforcementEngine, GovernanceMode } from '../governance/EnforcementEngine';
import type { IntentService } from '../governance/IntentService';
import type { SentinelDaemon } from '../sentinel/SentinelDaemon';
import type { QoreLogicManager } from '../qorelogic/QoreLogicManager';
import type { LedgerManager } from '../qorelogic/ledger/LedgerManager';
import type { RiskManager } from '../qorelogic/risk/RiskManager';

const API_VERSION = '3.6.1';
const DEFAULT_PORT = 7777;
const HOST = '127.0.0.1';

export interface FailSafeApiServerOptions {
    configProvider: IConfigProvider;
    eventBus: EventBus;
    featureGate: IFeatureGate;
    apiKey?: string;
}

export interface FailSafeApiServices {
    enforcementEngine?: EnforcementEngine;
    intentService?: IntentService;
    sentinelDaemon?: SentinelDaemon;
    qorelogicManager?: QoreLogicManager;
    ledgerManager?: LedgerManager;
    riskManager?: RiskManager;
    onModeChangeRequest?: (mode: GovernanceMode) => Promise<void>;
}

export class FailSafeApiServer {
    private app: express.Application;
    private server: HttpServer | null = null;
    private logger: Logger;
    private startTime: number = 0;

    private configProvider: IConfigProvider;
    private eventBus: EventBus;
    private featureGate: IFeatureGate;
    private eventStreamBridge: EventStreamBridge;

    // Services wired after construction
    private enforcementEngine?: EnforcementEngine;
    private intentService?: IntentService;
    private sentinelDaemon?: SentinelDaemon;
    private qorelogicManager?: QoreLogicManager;
    private ledgerManager?: LedgerManager;
    private riskManager?: RiskManager;
    private onModeChangeRequest?: (mode: GovernanceMode) => Promise<void>;

    constructor(options: FailSafeApiServerOptions) {
        this.configProvider = options.configProvider;
        this.eventBus = options.eventBus;
        this.featureGate = options.featureGate;
        this.logger = new Logger('FailSafeAPI');
        this.eventStreamBridge = new EventStreamBridge(options.eventBus);

        this.app = express();
        this.app.use(express.json());

        // CORS: reject browser-originated cross-origin requests (localhost CSRF protection)
        this.app.use((_req, res, next) => {
            const origin = _req.headers.origin;
            if (origin) {
                // Only allow requests from the extension's own webview or localhost origins
                const allowed = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
                    || origin.startsWith('vscode-webview://');
                if (!allowed) {
                    res.status(403).json({ error: 'CORS: origin not allowed' });
                    return;
                }
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            }
            if (_req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }
            next();
        });

        this.app.use(createAuthMiddleware({ apiKey: options.apiKey }));
        this.setupRoutes();
    }

    /**
     * Wire service instances after construction.
     * Called from main.ts bootstrap where these services are available.
     */
    setServices(services: FailSafeApiServices): void {
        this.enforcementEngine = services.enforcementEngine;
        this.intentService = services.intentService;
        this.sentinelDaemon = services.sentinelDaemon;
        this.qorelogicManager = services.qorelogicManager;
        this.ledgerManager = services.ledgerManager;
        this.riskManager = services.riskManager;
        this.onModeChangeRequest = services.onModeChangeRequest;
    }

    /**
     * Start the API server
     */
    start(): void {
        const port = this.resolvePort();
        this.startTime = Date.now();

        this.server = this.app.listen(port, HOST, () => {
            this.logger.info(`FailSafe API server: http://${HOST}:${port}`);
        });

        this.server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                this.logger.warn(`Port ${port} in use, API server not started`);
            } else {
                this.logger.error('API server error', err);
            }
        });

        this.eventStreamBridge.start();
    }

    /**
     * Stop the API server
     */
    stop(): void {
        this.eventStreamBridge.stop();
        this.server?.close();
        this.server = null;
        this.logger.info('FailSafe API server stopped');
    }

    /**
     * Resolve the port from configuration, defaulting to 7777
     */
    private resolvePort(): number {
        try {
            const config = this.configProvider.getConfig();
            const raw = (config as unknown as Record<string, unknown>)['qorelogic'] as Record<string, unknown> | undefined;
            const extRuntime = raw?.['externalRuntime'] as Record<string, unknown> | undefined;
            const baseUrl = extRuntime?.['baseUrl'] as string | undefined;
            if (baseUrl) {
                const match = baseUrl.match(/:(\d+)$/);
                if (match) return parseInt(match[1], 10);
            }
        } catch {
            // Fall through to default
        }
        return DEFAULT_PORT;
    }

    private setupRoutes(): void {
        // =====================================================================
        // Health & Status
        // =====================================================================

        this.app.get('/api/v1/health', (_req: Request, res: Response) => {
            res.json({
                status: 'ok',
                version: API_VERSION,
                uptime: Date.now() - this.startTime,
                sseClients: this.eventStreamBridge.getClientCount(),
            });
        });

        this.app.get('/api/v1/status', (_req: Request, res: Response) => {
            const governanceMode = this.enforcementEngine
                ? this.enforcementEngine.getGovernanceMode()
                : 'observe';

            const sentinelStatus = this.sentinelDaemon
                ? this.sentinelDaemon.getStatus()
                : null;

            const tier = this.featureGate.getTier();

            res.json({
                governance: { mode: governanceMode },
                sentinel: sentinelStatus,
                tier,
                version: API_VERSION,
                uptime: Date.now() - this.startTime,
            });
        });

        // =====================================================================
        // Governance
        // =====================================================================

        this.app.get('/api/v1/governance/mode', (_req: Request, res: Response) => {
            if (!this.enforcementEngine) {
                res.status(503).json({ error: 'EnforcementEngine not available' });
                return;
            }
            res.json({ mode: this.enforcementEngine.getGovernanceMode() });
        });

        this.app.put('/api/v1/governance/mode', async (req: Request, res: Response) => {
            const { mode } = req.body;
            const validModes: GovernanceMode[] = ['observe', 'assist', 'enforce'];
            if (!mode || !validModes.includes(mode)) {
                res.status(400).json({
                    error: 'Invalid mode',
                    message: `mode must be one of: ${validModes.join(', ')}`,
                });
                return;
            }

            const previousMode = this.enforcementEngine?.getGovernanceMode() ?? 'observe';

            // Persist via onModeChangeRequest callback (wired to vscode config update in bootstrap)
            if (this.onModeChangeRequest) {
                try {
                    await this.onModeChangeRequest(mode);
                } catch (err) {
                    res.status(500).json({ error: 'Failed to persist governance mode' });
                    return;
                }
            }

            this.eventBus.emit('sentinel.modeChange', {
                previousMode,
                newMode: mode,
                source: 'api',
                timestamp: new Date().toISOString(),
            });

            res.json({ mode, applied: true });
        });

        this.app.get('/api/v1/governance/intent', async (_req: Request, res: Response) => {
            if (!this.intentService) {
                res.status(503).json({ error: 'IntentService not available' });
                return;
            }
            try {
                const intent = await this.intentService.getActiveIntent();
                if (!intent) {
                    res.json({ active: false, intent: null });
                    return;
                }
                res.json({ active: true, intent });
            } catch (err) {
                res.status(500).json({ error: 'Failed to retrieve active intent' });
            }
        });

        this.app.post('/api/v1/governance/intent/seal', async (req: Request, res: Response) => {
            if (!this.intentService) {
                res.status(503).json({ error: 'IntentService not available' });
                return;
            }
            try {
                const actor = req.body?.actor || 'api';
                await this.intentService.sealIntent(actor);
                res.json({ sealed: true });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to seal intent';
                res.status(400).json({ error: message });
            }
        });

        // =====================================================================
        // Sentinel
        // =====================================================================

        this.app.get('/api/v1/sentinel/status', (_req: Request, res: Response) => {
            if (!this.sentinelDaemon) {
                res.status(503).json({ error: 'SentinelDaemon not available' });
                return;
            }
            res.json(this.sentinelDaemon.getStatus());
        });

        this.app.get('/api/v1/sentinel/verdicts', (req: Request, res: Response) => {
            const limit = Math.min(
                parseInt(req_query(req, 'limit') || '50', 10),
                200,
            );
            const verdicts = this.eventBus.getHistory('sentinel.verdict', limit);
            res.json({
                verdicts: verdicts.map(v => v.payload),
                count: verdicts.length,
            });
        });

        this.app.post('/api/v1/sentinel/audit', async (req: Request, res: Response) => {
            if (!this.sentinelDaemon) {
                res.status(503).json({ error: 'SentinelDaemon not available' });
                return;
            }
            const { filePath } = req.body;
            if (!filePath || typeof filePath !== 'string') {
                res.status(400).json({ error: 'filePath is required' });
                return;
            }
            try {
                const verdict = await this.sentinelDaemon.auditFile(filePath);
                res.json(verdict);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Audit failed';
                res.status(500).json({ error: message });
            }
        });

        // =====================================================================
        // Ledger
        // =====================================================================

        this.app.get('/api/v1/ledger/entries', async (req: Request, res: Response) => {
            if (!this.ledgerManager) {
                res.status(503).json({ error: 'LedgerManager not available' });
                return;
            }
            try {
                const limit = Math.min(
                    parseInt(req_query(req, 'limit') || '50', 10),
                    500,
                );
                const entries = await this.ledgerManager.getRecentEntries(limit);
                res.json({ entries, count: entries.length });
            } catch (err) {
                res.status(500).json({ error: 'Failed to retrieve ledger entries' });
            }
        });

        this.app.get('/api/v1/ledger/verify', (_req: Request, res: Response) => {
            if (!this.ledgerManager) {
                res.status(503).json({ error: 'LedgerManager not available' });
                return;
            }
            try {
                const valid = this.ledgerManager.verifyChain();
                res.json({ valid, verifiedAt: new Date().toISOString() });
            } catch (err) {
                res.status(500).json({ error: 'Chain verification failed' });
            }
        });

        // =====================================================================
        // Trust
        // =====================================================================

        this.app.get('/api/v1/trust', async (_req: Request, res: Response) => {
            if (!this.qorelogicManager) {
                res.status(503).json({ error: 'QoreLogicManager not available' });
                return;
            }
            try {
                const trustEngine = this.qorelogicManager.getTrustEngine();
                const agents = await trustEngine.getAllAgents();
                res.json(agents.map(a => ({
                    did: a.did,
                    score: a.trustScore,
                    stage: a.trustStage,
                    persona: a.persona,
                    isQuarantined: a.isQuarantined,
                    verificationsCompleted: a.verificationsCompleted,
                })));
            } catch (err) {
                res.status(500).json({ error: 'Failed to retrieve trust data' });
            }
        });

        this.app.get('/api/v1/trust/:did', (req: Request, res: Response) => {
            if (!this.qorelogicManager) {
                res.status(503).json({ error: 'QoreLogicManager not available' });
                return;
            }
            const trustEngine = this.qorelogicManager.getTrustEngine();
            const score = trustEngine.getTrustScore(String(req.params.did));
            if (!score) {
                res.status(404).json({ error: 'Agent DID not found' });
                return;
            }
            res.json(score);
        });

        // =====================================================================
        // Risks
        // =====================================================================

        this.app.get('/api/v1/risks', (_req: Request, res: Response) => {
            if (!this.riskManager) {
                res.status(503).json({ error: 'RiskManager not available' });
                return;
            }
            res.json({
                risks: this.riskManager.getAllRisks(),
                summary: this.riskManager.getSummary(),
            });
        });

        this.app.post('/api/v1/risks', (req: Request, res: Response) => {
            if (!this.riskManager) {
                res.status(503).json({ error: 'RiskManager not available' });
                return;
            }
            const { title, description, category, severity, impact, mitigation, owner, relatedArtifacts, checkpointId } = req.body;
            if (!title || !description || !category || !severity || !impact || !mitigation) {
                res.status(400).json({
                    error: 'Missing required fields',
                    required: ['title', 'description', 'category', 'severity', 'impact', 'mitigation'],
                });
                return;
            }
            const risk = this.riskManager.createRisk({
                title, description, category, severity, impact, mitigation, owner, relatedArtifacts, checkpointId,
            });
            res.status(201).json(risk);
        });

        this.app.put('/api/v1/risks/:id', (req: Request, res: Response) => {
            if (!this.riskManager) {
                res.status(503).json({ error: 'RiskManager not available' });
                return;
            }
            const updated = this.riskManager.updateRisk(String(req.params.id), req.body);
            if (!updated) {
                res.status(404).json({ error: 'Risk not found' });
                return;
            }
            res.json(updated);
        });

        this.app.delete('/api/v1/risks/:id', (req: Request, res: Response) => {
            if (!this.riskManager) {
                res.status(503).json({ error: 'RiskManager not available' });
                return;
            }
            const deleted = this.riskManager.deleteRisk(String(req.params.id));
            if (!deleted) {
                res.status(404).json({ error: 'Risk not found' });
                return;
            }
            res.status(204).send();
        });

        // =====================================================================
        // Features
        // =====================================================================

        this.app.get('/api/v1/features', (_req: Request, res: Response) => {
            const flags = Object.keys(FEATURE_TIER_MAP) as FeatureFlag[];
            const features = flags.map(flag => ({
                flag,
                requiredTier: FEATURE_TIER_MAP[flag],
                enabled: this.featureGate.isEnabled(flag),
            }));
            res.json({
                tier: this.featureGate.getTier(),
                features,
            });
        });

        this.app.get('/api/v1/features/:flag', (req: Request, res: Response) => {
            const flag = req.params.flag as FeatureFlag;
            if (!(flag in FEATURE_TIER_MAP)) {
                res.status(404).json({ error: 'Feature flag not found' });
                return;
            }
            res.json({
                flag,
                requiredTier: FEATURE_TIER_MAP[flag],
                enabled: this.featureGate.isEnabled(flag),
            });
        });

        // =====================================================================
        // SSE Event Stream
        // =====================================================================

        this.app.get('/api/v1/events/stream', this.eventStreamBridge.handler);

        // =====================================================================
        // Web UI - Static HTML pages served from webui/pages/
        // =====================================================================

        const pagesDir = path.join(__dirname, '../webui/pages');

        const serveHtmlPage = (filePath: string) => (_req: Request, res: Response) => {
            const fullPath = path.join(pagesDir, filePath);
            if (fs.existsSync(fullPath)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.sendFile(fullPath);
            } else {
                res.status(404).json({ error: 'Page not found', path: filePath });
            }
        };

        this.app.get('/ui/dashboard', serveHtmlPage('dashboard.html'));
        this.app.get('/ui/risks', serveHtmlPage('risk-register.html'));
        this.app.get('/ui/transparency', serveHtmlPage('transparency.html'));
    }
}

/** Safe query param extraction */
function req_query(req: Request, key: string): string | undefined {
    const val = req.query[key];
    return typeof val === 'string' ? val : undefined;
}
