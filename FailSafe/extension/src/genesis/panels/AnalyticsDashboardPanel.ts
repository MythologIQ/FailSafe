/**
 * AnalyticsDashboardPanel - Token ROI Dashboard (v3.0.0)
 *
 * Displays:
 * - Session token tracking
 * - Cost estimation
 * - Efficiency metrics (tokens saved by early detection)
 * - Historical trend charts
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { EventBus } from '../../shared/EventBus';
import { getNonce } from '../../shared/utils/htmlSanitizer';
import {
    renderAnalyticsTemplate,
    TokenMetrics,
    HistoricalDataPoint,
    AnalyticsViewModel
} from './templates/AnalyticsTemplate';

interface AnalyticsData {
    sessions: TokenMetrics[];
    lifetimeTokensSaved: number;
    lifetimeCostSaved: number;
}

export class AnalyticsDashboardPanel {
    public static currentPanel: AnalyticsDashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private eventBus: EventBus;
    private disposables: vscode.Disposable[] = [];
    private storagePath: string;
    private currentSession: TokenMetrics;

    private constructor(
        panel: vscode.WebviewPanel,
        eventBus: EventBus,
        workspaceRoot: string
    ) {
        this.panel = panel;
        this.eventBus = eventBus;
        this.storagePath = path.join(workspaceRoot, '.failsafe', 'analytics.yaml');
        this.currentSession = this.initSession();

        void this.update();

        // Subscribe to governance events
        const unsubscribes = [
            this.eventBus.on('sentinel.verdict', (event) => {
                this.trackVerdict(event);
                void this.update();
            }),
            this.eventBus.on('qorelogic.trustUpdate', () => {
                this.currentSession.governanceEvents++;
                void this.update();
            }),
            this.eventBus.on('genesis.streamEvent', (event) => {
                this.trackStreamEvent(event);
                void this.update();
            })
        ];
        unsubscribes.forEach(unsub => this.disposables.push({ dispose: unsub }));

        // Periodic refresh and auto-save
        const interval = setInterval(() => {
            void this.update();
            this.saveToDisk();
        }, 10000);
        this.disposables.push({ dispose: () => clearInterval(interval) });

        this.panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'refresh':
                    void this.update();
                    break;
            }
        }, null, this.disposables);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        eventBus: EventBus,
        workspaceRoot: string
    ): AnalyticsDashboardPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (AnalyticsDashboardPanel.currentPanel) {
            AnalyticsDashboardPanel.currentPanel.panel.reveal(column);
            return AnalyticsDashboardPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'failsafe.analytics',
            'Token Analytics',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        AnalyticsDashboardPanel.currentPanel = new AnalyticsDashboardPanel(
            panel, eventBus, workspaceRoot
        );
        return AnalyticsDashboardPanel.currentPanel;
    }

    public reveal(): void {
        this.panel.reveal();
    }

    private initSession(): TokenMetrics {
        return {
            sessionId: crypto.randomUUID(),
            totalTokensUsed: 0,
            tokensSavedByFailSafe: 0,
            costEstimate: 0,
            modelUsage: {},
            earlyRejections: 0,
            governanceEvents: 0,
            sessionStart: new Date().toISOString()
        };
    }

    private trackVerdict(event: unknown): void {
        const verdict = event as {
            decision?: string;
            tokensUsed?: number;
            model?: string;
        };

        // Track tokens used
        const tokens = verdict.tokensUsed || this.estimateTokens();
        this.currentSession.totalTokensUsed += tokens;

        // Track model usage
        const model = verdict.model || 'default';
        this.currentSession.modelUsage[model] =
            (this.currentSession.modelUsage[model] || 0) + tokens;

        // Track early rejections (saves tokens on downstream processing)
        if (verdict.decision === 'REJECT') {
            this.currentSession.earlyRejections++;
            // Estimate tokens saved by early rejection (prevents full file processing)
            const savedTokens = this.estimateSavedTokens();
            this.currentSession.tokensSavedByFailSafe += savedTokens;
        }

        // Update cost estimate
        this.currentSession.costEstimate = this.calculateCost();
        this.currentSession.governanceEvents++;
    }

    private trackStreamEvent(event: unknown): void {
        // Track Genesis planning stream events
        this.currentSession.governanceEvents++;
    }

    private estimateTokens(): number {
        // Rough estimate for sentinel evaluation: 500-2000 tokens
        return 1000;
    }

    private estimateSavedTokens(): number {
        // Early rejection saves full file analysis: 2000-10000 tokens
        return 5000;
    }

    private calculateCost(): number {
        // Rough cost calculation based on Claude pricing
        // Input: $3/MTok, Output: $15/MTok (average $9/MTok)
        const costPerThousand = 0.009;
        return (this.currentSession.totalTokensUsed / 1000) * costPerThousand;
    }

    private loadFromDisk(): AnalyticsData {
        if (!fs.existsSync(this.storagePath)) {
            return {
                sessions: [],
                lifetimeTokensSaved: 0,
                lifetimeCostSaved: 0
            };
        }
        try {
            const content = fs.readFileSync(this.storagePath, 'utf8');
            return yaml.load(content) as AnalyticsData || {
                sessions: [],
                lifetimeTokensSaved: 0,
                lifetimeCostSaved: 0
            };
        } catch {
            return {
                sessions: [],
                lifetimeTokensSaved: 0,
                lifetimeCostSaved: 0
            };
        }
    }

    private saveToDisk(): void {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const data = this.loadFromDisk();

        // Update or add current session
        const existingIdx = data.sessions.findIndex(
            s => s.sessionId === this.currentSession.sessionId
        );
        if (existingIdx >= 0) {
            data.sessions[existingIdx] = this.currentSession;
        } else {
            data.sessions.push(this.currentSession);
        }

        // Keep only last 100 sessions
        if (data.sessions.length > 100) {
            data.sessions = data.sessions.slice(-100);
        }

        // Update lifetime totals
        data.lifetimeTokensSaved = data.sessions.reduce(
            (sum, s) => sum + s.tokensSavedByFailSafe, 0
        );
        data.lifetimeCostSaved = data.lifetimeTokensSaved * 0.000009; // $9/MTok

        fs.writeFileSync(this.storagePath, yaml.dump(data), 'utf8');
    }

    private getHistoricalData(): HistoricalDataPoint[] {
        const data = this.loadFromDisk();
        return data.sessions.slice(-10).map(s => ({
            timestamp: s.sessionStart,
            tokensUsed: s.totalTokensUsed,
            tokensSaved: s.tokensSavedByFailSafe
        }));
    }

    private async update(): Promise<void> {
        const data = this.loadFromDisk();
        const model: AnalyticsViewModel = {
            nonce: getNonce(),
            cspSource: this.panel.webview.cspSource,
            currentSession: this.currentSession,
            historicalData: this.getHistoricalData(),
            totalSessions: data.sessions.length,
            lifetimeTokensSaved: data.lifetimeTokensSaved,
            lifetimeCostSaved: data.lifetimeCostSaved
        };
        this.panel.webview.html = renderAnalyticsTemplate(model);
    }

    public dispose(): void {
        // Save final session data
        this.saveToDisk();

        AnalyticsDashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
