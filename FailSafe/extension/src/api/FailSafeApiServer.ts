import express, { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Server as HttpServer } from 'http';
import { IConfigProvider } from '../core/interfaces/IConfigProvider';
import { IFeatureGate } from '../core/interfaces/IFeatureGate';
import { EventBus } from '../shared/EventBus';
import { Logger } from '../shared/Logger';
import { EventStreamBridge } from './EventStreamBridge';
import { createAuthMiddleware } from './middleware/auth';

import { registerGovernanceRoutes } from './routes/governanceRoutes';
import { registerSentinelRoutes } from './routes/sentinelRoutes';
import { registerLedgerRoutes } from './routes/ledgerRoutes';
import { registerTrustRoutes } from './routes/trustRoutes';
import { registerRiskRoutes } from './routes/riskRoutes';
import { registerFeatureRoutes } from './routes/featureRoutes';
import type { RouteDeps } from './routes/types';

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

    setServices(services: FailSafeApiServices): void {
        this.enforcementEngine = services.enforcementEngine;
        this.intentService = services.intentService;
        this.sentinelDaemon = services.sentinelDaemon;
        this.qorelogicManager = services.qorelogicManager;
        this.ledgerManager = services.ledgerManager;
        this.riskManager = services.riskManager;
        this.onModeChangeRequest = services.onModeChangeRequest;
    }

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

    stop(): void {
        this.eventStreamBridge.stop();
        this.server?.close();
        this.server = null;
        this.logger.info('FailSafe API server stopped');
    }

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

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const deps: RouteDeps = {
            get enforcementEngine() { return self.enforcementEngine; },
            get intentService() { return self.intentService; },
            get sentinelDaemon() { return self.sentinelDaemon; },
            get qorelogicManager() { return self.qorelogicManager; },
            get ledgerManager() { return self.ledgerManager; },
            get riskManager() { return self.riskManager; },
            get featureGate() { return self.featureGate; },
            get eventBus() { return self.eventBus; },
            get onModeChangeRequest() { return self.onModeChangeRequest; },
        };

        registerGovernanceRoutes(this.app, deps);
        registerSentinelRoutes(this.app, deps);
        registerLedgerRoutes(this.app, deps);
        registerTrustRoutes(this.app, deps);
        registerRiskRoutes(this.app, deps);
        registerFeatureRoutes(this.app, deps);

        this.app.get('/api/v1/events/stream', this.eventStreamBridge.handler);

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
