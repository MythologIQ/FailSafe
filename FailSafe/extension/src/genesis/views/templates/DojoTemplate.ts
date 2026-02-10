import { L3ApprovalRequest, SentinelStatus, SentinelVerdict } from '../../../shared/types';
import { escapeHtml } from '../../../shared/utils/htmlSanitizer';
import { infoHint, INFO_HINT_STYLES, HELP_TEXT } from '../../../shared/components/InfoHint';
import { tooltipAttrs, TOOLTIP_STYLES } from '../../../shared/components/Tooltip';
import { ENGAGEMENT_COPY } from '../../../shared/content/engagementCopy';
import { QUICKSTART_SECTIONS, QUICKSTART_STYLES } from '../../../shared/content/quickstart';

type TrustSummary = {
    totalAgents: number;
    avgTrust: number;
    quarantined: number;
    stageCounts: { CBT: number; KBT: number; IBT: number };
};

export type DojoViewModel = {
    nonce: string;
    cspSource: string;
    status: SentinelStatus;
    l3Queue: L3ApprovalRequest[];
    trustSummary: TrustSummary;
    lastVerdict: SentinelVerdict | null;
    guideExpanded: boolean;
};

const DOJO_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{CSP_SOURCE}} 'nonce-{{NONCE}}'; script-src 'nonce-{{NONCE}}';">
    <title>The Dojo</title>
    <style nonce="{{NONCE}}">
        body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); padding: 12px; margin: 0; }
        .section { margin-bottom: 14px; padding: 14px; background: var(--vscode-editorWidget-background); border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
        .section-title { font-weight: 600; font-size: 12px; color: var(--vscode-foreground); margin-bottom: 10px; }
        .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status-active { background: var(--vscode-charts-green); } .status-warning { background: var(--vscode-charts-orange); } .status-error { background: var(--vscode-charts-red); } .status-idle { background: var(--vscode-descriptionForeground); } .status-pending { background: var(--vscode-charts-blue); }
        .metric { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
        .metric-label { color: var(--vscode-descriptionForeground); } .metric-value { font-weight: 500; }
        .trust-bar { height: 6px; background: var(--vscode-progressBar-background); border-radius: 3px; margin: 4px 0; overflow: hidden; }
        .trust-fill { height: 100%; background: var(--vscode-charts-green); transition: width 0.3s; }
        .l3-item { padding: 6px; margin: 4px 0; background: var(--vscode-inputOption-activeBackground); border-radius: 3px; font-size: 11px; }
        .protocol-item { display: flex; align-items: center; margin: 4px 0; font-size: 12px; } .protocol-item input { margin-right: 8px; }
        .workflow-step { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px; border-radius: 6px; margin-bottom: 6px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); }
        .workflow-step.is-complete { border-color: var(--vscode-charts-green); } .workflow-step.is-complete .workflow-status { background: var(--vscode-charts-green); }
        .workflow-meta { font-size: 10px; color: var(--vscode-descriptionForeground); }
        .workflow-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 8px; }
        .workflow-progress { font-size: 11px; color: var(--vscode-descriptionForeground); }
        .workflow-toggle { padding: 4px 8px; border-radius: 3px; border: 1px solid var(--vscode-panel-border); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); cursor: pointer; font-size: 11px; }
        .workflow-toggle:hover { background: var(--vscode-button-secondaryHoverBackground); }
        .workflow-status { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-disabledForeground); flex: 0 0 auto; }
        button { width: 100%; padding: 8px; margin-top: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .next-action { margin-bottom: 14px; padding: 12px; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-editorWidget-background); }
        .next-action-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
        .next-action-copy { font-size: 12px; color: var(--vscode-descriptionForeground); }
        .workflow-feedback { margin-top: 8px; min-height: 18px; font-size: 11px; color: var(--vscode-descriptionForeground); }
        .workflow-feedback.show { color: var(--vscode-charts-green); }
        {{STYLES}}
    </style>
</head>
<body>
    {{CONTENT}}
    <script nonce="{{NONCE}}">
        const vscode = acquireVsCodeApi();
        const WORKFLOW_ORDER = ['scan', 'triage', 'review', 'ledger', 'reflect'];
        const workflowState = (vscode.getState() && vscode.getState().workflow) || {};
        let feedbackTimer = null;
        function syncWorkflowUI() {
            let completedCount = 0;
            document.querySelectorAll('.workflow-step').forEach((step) => {
                const key = step.getAttribute('data-step');
                const complete = Boolean(workflowState[key]);
                if (complete) { completedCount += 1; }
                step.classList.toggle('is-complete', complete);
                const button = step.querySelector('[data-action="toggle"]');
                if (button) { button.textContent = complete ? 'Done' : 'Mark'; }
            });
            const progress = document.getElementById('workflow-progress');
            if (progress) { progress.textContent = completedCount + '/' + WORKFLOW_ORDER.length + ' complete'; }
        }
        function showWorkflowFeedback(message) {
            const el = document.getElementById('workflow-feedback');
            if (!el) { return; }
            el.textContent = message;
            el.classList.add('show');
            if (feedbackTimer) { clearTimeout(feedbackTimer); }
            feedbackTimer = setTimeout(() => el.classList.remove('show'), 1400);
        }
        function toggleWorkflow(stepKey, stepTitle) {
            workflowState[stepKey] = !workflowState[stepKey];
            vscode.setState({ workflow: workflowState });
            syncWorkflowUI();
            const completed = Object.values(workflowState).filter(Boolean).length;
            if (workflowState[stepKey]) {
                showWorkflowFeedback(stepTitle + ' logged. Progress ' + completed + '/' + WORKFLOW_ORDER.length + '.');
            }
        }
        function resetWorkflow() {
            Object.keys(workflowState).forEach(key => { workflowState[key] = false; });
            vscode.setState({ workflow: workflowState });
            syncWorkflowUI();
            showWorkflowFeedback('${ENGAGEMENT_COPY.workflowReset}');
        }
        function auditFile() { vscode.postMessage({ command: 'auditFile' }); }
        function showL3Queue() { vscode.postMessage({ command: 'showL3Queue' }); }
        function trustProcess() { vscode.postMessage({ command: 'trustProcess' }); }
        function toggleGuide() { vscode.postMessage({ command: 'toggleGuide' }); }
        function showRoadmap() { vscode.postMessage({ command: 'showRoadmap' }); }
        document.querySelectorAll('.workflow-step').forEach((step) => {
            const key = step.getAttribute('data-step');
            const title = step.getAttribute('data-title') || 'Step';
            const button = step.querySelector('[data-action="toggle"]');
            if (button && key) { button.addEventListener('click', () => toggleWorkflow(key, title)); }
        });
        syncWorkflowUI();
    </script>
</body>
</html>`;

const applyTemplate = (template: string, tokens: Record<string, string>): string => {
    return Object.entries(tokens).reduce((result, [key, value]) => result.split(key).join(value), template);
};

function getQuickStartHtml(guideExpanded: boolean): string {
    const icon = guideExpanded ? '[v]' : '[>]';
    const content = guideExpanded ? getGuideContentHtml() : '';
    return `\n        <div class="guide-section ${guideExpanded ? 'expanded' : 'collapsed'}">\n            <button class="guide-toggle" onclick="toggleGuide()">\n                <span class="guide-icon">${icon}</span>\n                Quick Start Guide\n            </button>\n            ${content}\n        </div>\n    `;
}

function getGuideContentHtml(): string {
    const sections = QUICKSTART_SECTIONS.map(section => {
        if (section.steps) {
            const steps = section.steps.map(step => `\n                <div class="guide-step">\n                    <span class="guide-step-label">${escapeHtml(step.label)}</span>\n                    <span>${escapeHtml(step.desc)}</span>\n                </div>\n            `).join('');
            return `\n                <div class="guide-subsection">\n                    <div class="guide-subsection-title">${escapeHtml(section.title)}</div>\n                    ${steps}\n                </div>\n            `;
        }
        return `\n            <div class="guide-subsection">\n                <div class="guide-subsection-title">${escapeHtml(section.title)}</div>\n                <div>${escapeHtml(section.content || '')}</div>\n            </div>\n        `;
    }).join('');
    return `<div class="guide-content">${sections}</div>`;
}

function renderSentinelSection(status: SentinelStatus, lastVerdict: SentinelVerdict | null): string {
    const verdictLabel = lastVerdict ? `${escapeHtml(lastVerdict.decision)} (${escapeHtml(lastVerdict.riskGrade)})` : 'None';
    return `<div class="section"><div class="section-title">Sentinel Status</div><div class="metric"><span class="metric-label"><span class="status-indicator ${status.running ? 'status-active' : 'status-idle'}"></span>${status.running ? 'Monitoring' : 'Idle'}</span><span class="metric-value" ${tooltipAttrs(HELP_TEXT.sentinelMode)}>${escapeHtml(status.mode)}</span></div><div class="metric"><span class="metric-label">Files watched${infoHint({ text: HELP_TEXT.filesWatched })}</span><span class="metric-value">${status.filesWatched}</span></div><div class="metric"><span class="metric-label">Queue depth${infoHint({ text: HELP_TEXT.queueDepth })}</span><span class="metric-value">${status.queueDepth}</span></div><div class="metric"><span class="metric-label">Operational mode${infoHint({ text: HELP_TEXT.operationalMode })}</span><span class="metric-value">${escapeHtml(status.operationalMode.toUpperCase())}</span></div><div class="metric"><span class="metric-label">Uptime</span><span class="metric-value">${escapeHtml(formatUptime(status.uptime))}</span></div><div class="metric"><span class="metric-label">Last verdict${infoHint({ text: HELP_TEXT.verdictDecision })}</span><span class="metric-value">${verdictLabel}</span></div></div>`;
}

function renderL3QueueSection(l3Queue: L3ApprovalRequest[]): string {
    const queueItems = l3Queue.length === 0 ? '<div style="font-size: 11px; color: var(--vscode-descriptionForeground);">No pending approvals</div>' : l3Queue.slice(0, 3).map(item => `\n            <div class="l3-item">\n                <span class="status-indicator status-pending"></span>\n                ${escapeHtml(item.filePath.split(/[/\\]/).pop())}\n            </div>\n        `).join('');
    const actionButton = l3Queue.length > 0 ? '<button onclick="showL3Queue()">Review Queue</button>' : '';
    return `<div class="section"><div class="section-title">L3 Queue (${l3Queue.length})${infoHint({ text: HELP_TEXT.l3Queue })}</div>${queueItems}${actionButton}</div>`;
}

function renderTrustSection(trustSummary: TrustSummary): string {
    const trustPercent = (trustSummary.avgTrust * 100).toFixed(0);
    return `<div class="section"><div class="section-title">Trust Summary</div><div class="metric"><span class="metric-label">Agents</span><span class="metric-value">${trustSummary.totalAgents}</span></div><div class="metric"><span class="metric-label">Avg trust${infoHint({ text: HELP_TEXT.avgTrust })}</span><span class="metric-value">${trustPercent}%</span></div><div class="trust-bar"><div class="trust-fill" style="width: ${trustPercent}%"></div></div><div class="metric"><span class="metric-label">Quarantined</span><span class="metric-value">${trustSummary.quarantined}</span></div><div class="metric"><span class="metric-label">Stages (CBT/KBT/IBT)${infoHint({ text: HELP_TEXT.trustStages })}</span><span class="metric-value">${trustSummary.stageCounts.CBT}/${trustSummary.stageCounts.KBT}/${trustSummary.stageCounts.IBT}</span></div></div>`;
}

function renderWorkflowSection(): string {
    return `<div class="section"><div class="workflow-header"><div class="section-title">Dojo Workflow</div><div id="workflow-progress" class="workflow-progress">0/5 complete</div></div>${renderWorkflowStep('scan', 'Scan changes', 'Sentinel audit + heuristics')}${renderWorkflowStep('triage', 'Triage risk', 'Policy engine classification')}${renderWorkflowStep('review', 'Review L3', 'Overseer approval loop')}${renderWorkflowStep('ledger', 'Ledger entry', 'SOA integrity trace')}${renderWorkflowStep('reflect', 'Reflect + archive', 'Shadow genome if needed')}<button onclick="resetWorkflow()">Reset workflow</button><div id="workflow-feedback" class="workflow-feedback" aria-live="polite"></div></div>`;
}

function renderProtocolSection(): string {
    return `<div class="section"><div class="section-title">Protocol</div><div class="protocol-item"><input type="checkbox" id="read" checked disabled><label for="read">Read before write</label></div><div class="protocol-item"><input type="checkbox" id="verify" checked disabled><label for="verify">Verify claims</label></div><div class="protocol-item"><input type="checkbox" id="test"><label for="test">Run tests</label></div><div class="protocol-item"><input type="checkbox" id="commit"><label for="commit">Commit with audit</label></div><button onclick="trustProcess()">I Trust The Process</button></div>`;
}

function renderPlanSection(): string {
    return `<div class="section"><div class="section-title">Plan Navigation</div><div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;">Open the external roadmap console to navigate active sprint details and live activity.</div><button onclick="showRoadmap()">Open roadmap console</button></div>`;
}

function renderSections(model: DojoViewModel): string {
    return [renderNextAction(model), getQuickStartHtml(model.guideExpanded), renderSentinelSection(model.status, model.lastVerdict), renderL3QueueSection(model.l3Queue), renderTrustSection(model.trustSummary), renderWorkflowSection(), renderProtocolSection(), renderPlanSection()].join('');
}

function renderNextAction(model: DojoViewModel): string {
    if (model.l3Queue.length > 0) {
        return `<div class="next-action"><div class="next-action-title">${ENGAGEMENT_COPY.nextStepTitle}</div><div class="next-action-copy">${ENGAGEMENT_COPY.queueAction(model.l3Queue.length)}</div><button onclick="showL3Queue()">Review queue</button></div>`;
    }
    if (!model.status.running) {
        return `<div class="next-action"><div class="next-action-title">${ENGAGEMENT_COPY.nextStepTitle}</div><div class="next-action-copy">${ENGAGEMENT_COPY.sentinelIdleAction}</div></div>`;
    }
    return `<div class="next-action"><div class="next-action-title">${ENGAGEMENT_COPY.nextStepTitle}</div><div class="next-action-copy">${ENGAGEMENT_COPY.dojoContinueAction}</div></div>`;
}

export function renderDojoTemplate(model: DojoViewModel): string {
    const content = renderSections(model);
    const styles = [INFO_HINT_STYLES, TOOLTIP_STYLES, QUICKSTART_STYLES].join('');
    const tokens = { '{{CSP_SOURCE}}': model.cspSource, '{{NONCE}}': model.nonce, '{{STYLES}}': styles, '{{CONTENT}}': content };
    return applyTemplate(DOJO_TEMPLATE, tokens);
}

function renderWorkflowStep(stepKey: string, title: string, meta: string): string {
    return `\n        <div class="workflow-step" data-step="${stepKey}" data-title="${escapeHtml(title)}">\n            <span class="workflow-status"></span>\n            <div>\n                <div>${title}</div>\n                <div class="workflow-meta">${meta}</div>\n            </div>\n            <button class="workflow-toggle" data-action="toggle">Mark</button>\n        </div>\n    `;
}

function formatUptime(uptimeMs: number): string {
    if (!uptimeMs || uptimeMs < 0) {
        return '0s';
    }
    const totalSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}
