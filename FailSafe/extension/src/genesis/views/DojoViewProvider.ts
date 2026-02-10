/**
 * DojoViewProvider - The Dojo Sidebar View
 *
 * Displays:
 * - Current focus/task
 * - Sentinel status
 * - Trust summary
 * - L3 approval queue
 * - Protocol checklist
 */

import * as vscode from 'vscode';
import { EventBus } from '../../shared/EventBus';
import { SentinelDaemon } from '../../sentinel/SentinelDaemon';
import { QoreLogicManager } from '../../qorelogic/QoreLogicManager';
import { getNonce } from '../../shared/utils/htmlSanitizer';
import { renderDojoTemplate } from './templates/DojoTemplate';

export class DojoViewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private extensionUri: vscode.Uri;
    private sentinel: SentinelDaemon;
    private qorelogic: QoreLogicManager;
    private eventBus: EventBus;
    private guideExpanded = false;

    constructor(
        extensionUri: vscode.Uri,
        sentinel: SentinelDaemon,
        qorelogic: QoreLogicManager,
        eventBus: EventBus
    ) {
        this.extensionUri = extensionUri;
        this.sentinel = sentinel;
        this.qorelogic = qorelogic;
        this.eventBus = eventBus;

        // Subscribe to updates
        this.eventBus.on('sentinel.verdict', () => this.refresh());
        this.eventBus.on('qorelogic.trustUpdate', () => this.refresh());
        this.eventBus.on('qorelogic.l3Queued', () => this.refresh());
    }

    async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = await this.getHtmlContent();

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'auditFile':
                    vscode.commands.executeCommand('failsafe.auditFile');
                    break;
                case 'showL3Queue':
                    vscode.commands.executeCommand('failsafe.approveL3');
                    break;
                case 'trustProcess':
                    vscode.window.showInformationMessage('I Trust The Process');
                    break;
                case 'toggleGuide':
                    this.guideExpanded = !this.guideExpanded;
                    this.refresh();
                    break;
                case 'showRoadmap':
                    vscode.commands.executeCommand('failsafe.openRoadmap');
                    break;
            }
        });

        // Start periodic refresh
        setInterval(() => void this.refresh(), 5000);
    }

    private async refresh(): Promise<void> {
        if (this.view) {
            this.view.webview.html = await this.getHtmlContent();
        }
    }

    private async getHtmlContent(): Promise<string> {
        const nonce = getNonce();
        const cspSource = this.view?.webview.cspSource || '';
        const status = this.sentinel.getStatus();
        const l3Queue = this.qorelogic.getL3Queue();
        const trustSummary = await this.getTrustSummary();
        const lastVerdict = status.lastVerdict;

        return renderDojoTemplate({
            nonce,
            cspSource,
            status,
            l3Queue,
            trustSummary,
            lastVerdict,
            guideExpanded: this.guideExpanded
        });
    }

    private async getTrustSummary(): Promise<{
        totalAgents: number;
        avgTrust: number;
        quarantined: number;
        stageCounts: { CBT: number; KBT: number; IBT: number };
    }> {
        try {
            const agents = await this.qorelogic.getTrustEngine().getAllAgents();
            const totalAgents = agents.length;
            const quarantined = agents.filter(agent => agent.isQuarantined).length;
            const totalTrust = agents.reduce((sum, agent) => sum + agent.trustScore, 0);
            const avgTrust = totalAgents === 0 ? 0 : totalTrust / totalAgents;
            const stageCounts = agents.reduce(
                (counts, agent) => {
                    counts[agent.trustStage] = (counts[agent.trustStage] || 0) + 1;
                    return counts;
                },
                { CBT: 0, KBT: 0, IBT: 0 } as { CBT: number; KBT: number; IBT: number }
            );

            return { totalAgents, avgTrust, quarantined, stageCounts };
        } catch {
            return {
                totalAgents: 0,
                avgTrust: 0,
                quarantined: 0,
                stageCounts: { CBT: 0, KBT: 0, IBT: 0 }
            };
        }
    }

}
