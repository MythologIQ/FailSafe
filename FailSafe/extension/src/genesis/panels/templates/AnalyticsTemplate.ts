/**
 * AnalyticsTemplate - Token ROI Dashboard Template (v3.0.0)
 */

import { tooltipAttrs, TOOLTIP_STYLES } from '../../../shared/components/Tooltip';

export interface TokenMetrics {
  sessionId: string;
  totalTokensUsed: number;
  tokensSavedByFailSafe: number;
  costEstimate: number;
  modelUsage: Record<string, number>;
  earlyRejections: number;
  governanceEvents: number;
  sessionStart: string;
}

export interface HistoricalDataPoint {
  timestamp: string;
  tokensUsed: number;
  tokensSaved: number;
}

export type AnalyticsViewModel = {
  nonce: string;
  cspSource: string;
  currentSession: TokenMetrics;
  historicalData: HistoricalDataPoint[];
  totalSessions: number;
  lifetimeTokensSaved: number;
  lifetimeCostSaved: number;
};

const ANALYTICS_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <title>FailSafe Token Analytics</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{CSP_SOURCE}} 'nonce-{{NONCE}}'; script-src 'nonce-{{NONCE}}';">
    <style nonce="{{NONCE}}">
        * { box-sizing: border-box; }
        :root {
            --card-bg: var(--vscode-editorWidget-background);
            --card-border: var(--vscode-editorWidget-border);
            --text: var(--vscode-foreground);
            --muted: var(--vscode-descriptionForeground);
            --accent: var(--vscode-charts-blue);
            --success: var(--vscode-charts-green);
            --warning: var(--vscode-charts-orange);
            --savings: var(--vscode-charts-purple, #a855f7);
        }
        body {
            margin: 0; padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--text);
            font-family: var(--vscode-font-family);
            min-height: 100vh;
        }
        {{TOOLTIP_STYLES}}

        .header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 24px; padding-bottom: 16px;
            border-bottom: 1px solid var(--card-border);
        }
        .title { font-size: 24px; font-weight: 600; color: var(--text); }
        .subtitle { font-size: 12px; color: var(--muted); margin-top: 4px; }

        .stats-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px; margin-bottom: 24px;
        }
        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px; padding: 16px; text-align: center;
        }
        .stat-value {
            font-size: 28px; font-weight: 700;
            color: var(--accent); margin-bottom: 4px;
        }
        .stat-value.savings { color: var(--success); }
        .stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; }

        .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px; padding: 16px;
        }
        .card-title {
            font-size: 12px; font-weight: 600; text-transform: uppercase;
            color: var(--muted); margin-bottom: 12px;
        }

        .metric {
            display: flex; justify-content: space-between;
            padding: 8px 0; border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: var(--muted); }
        .metric-value { font-weight: 600; color: var(--text); }

        .model-bar {
            display: flex; align-items: center; gap: 8px;
            padding: 6px 0;
        }
        .model-name { width: 100px; font-size: 11px; color: var(--muted); }
        .bar-container {
            flex: 1; height: 8px;
            background: var(--vscode-progressBar-background);
            border-radius: 4px; overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            background: var(--accent);
            transition: width 0.3s;
        }
        .model-count { width: 60px; text-align: right; font-size: 11px; }

        .chart-container {
            height: 150px; display: flex; align-items: flex-end;
            gap: 4px; padding-top: 8px;
        }
        .chart-bar {
            flex: 1; min-width: 20px; max-width: 40px;
            background: var(--accent); border-radius: 4px 4px 0 0;
            transition: height 0.3s;
            position: relative;
        }
        .chart-bar.saved {
            background: var(--success); opacity: 0.7;
        }
        .chart-bar::after {
            content: attr(data-value);
            position: absolute; top: -18px; left: 50%;
            transform: translateX(-50%);
            font-size: 9px; color: var(--muted);
        }
        .chart-legend {
            display: flex; gap: 16px; margin-top: 12px;
            justify-content: center; font-size: 10px;
        }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-dot {
            width: 8px; height: 8px; border-radius: 2px;
        }
        .legend-dot.used { background: var(--accent); }
        .legend-dot.saved { background: var(--success); }

        .roi-highlight {
            background: linear-gradient(135deg, var(--success) 0%, var(--savings) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .refresh-btn {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--card-border);
            border-radius: 4px; cursor: pointer; font-size: 11px;
        }
        .refresh-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="title">Token Analytics</div>
            <div class="subtitle">Session ROI Dashboard | FailSafe Governance</div>
        </div>
        <button class="refresh-btn" onclick="refresh()">↻ Refresh</button>
    </div>

    <div class="stats-row">
        {{STAT_CARDS}}
    </div>

    <div class="grid">
        <div class="card">
            <div class="card-title">Session Token History</div>
            <div class="chart-container">
                {{HISTORY_CHART}}
            </div>
            <div class="chart-legend">
                <div class="legend-item"><div class="legend-dot used"></div> Tokens Used</div>
                <div class="legend-item"><div class="legend-dot saved"></div> Tokens Saved</div>
            </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card">
                <div class="card-title">Model Usage</div>
                {{MODEL_USAGE}}
            </div>

            <div class="card">
                <div class="card-title">Governance Impact</div>
                <div class="metric">
                    <span class="metric-label" ${tooltipAttrs('Files rejected early, saving downstream processing')}>Early Rejections</span>
                    <span class="metric-value">{{EARLY_REJECTIONS}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label" ${tooltipAttrs('Total governance events processed')}>Governance Events</span>
                    <span class="metric-value">{{GOVERNANCE_EVENTS}}</span>
                </div>
                <div class="metric">
                    <span class="metric-label" ${tooltipAttrs('Current session duration')}>Session Duration</span>
                    <span class="metric-value">{{SESSION_DURATION}}</span>
                </div>
            </div>
        </div>
    </div>

    <script nonce="{{NONCE}}">
        const vscode = acquireVsCodeApi();
        function refresh() { vscode.postMessage({ command: 'refresh' }); }
    </script>
</body>
</html>`;

const applyTemplate = (template: string, tokens: Record<string, string>): string => {
    return Object.entries(tokens).reduce(
        (result, [key, value]) => result.split(key).join(value),
        template
    );
};

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function formatCost(cost: number): string {
    return `$${cost.toFixed(4)}`;
}

function formatDuration(startTime: string): string {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function renderStatCards(model: AnalyticsViewModel): string {
    const session = model.currentSession;
    const roiPercent = session.totalTokensUsed > 0
        ? ((session.tokensSavedByFailSafe / session.totalTokensUsed) * 100).toFixed(0)
        : '0';

    return `
        <div class="stat-card">
            <div class="stat-value">${formatNumber(session.totalTokensUsed)}</div>
            <div class="stat-label">Tokens Used</div>
        </div>
        <div class="stat-card">
            <div class="stat-value savings">${formatNumber(session.tokensSavedByFailSafe)}</div>
            <div class="stat-label">Tokens Saved</div>
        </div>
        <div class="stat-card">
            <div class="stat-value savings">${formatCost(model.lifetimeCostSaved)}</div>
            <div class="stat-label">Lifetime Savings</div>
        </div>
        <div class="stat-card">
            <div class="stat-value roi-highlight">${roiPercent}%</div>
            <div class="stat-label">Session ROI</div>
        </div>
    `;
}

function renderHistoryChart(data: HistoricalDataPoint[]): string {
    if (data.length === 0) {
        return '<div style="text-align: center; color: var(--muted); padding: 40px;">No historical data yet</div>';
    }

    const maxTokens = Math.max(...data.map(d => d.tokensUsed + d.tokensSaved), 1);
    return data.slice(-10).map(d => {
        const usedHeight = Math.max((d.tokensUsed / maxTokens) * 100, 5);
        const savedHeight = Math.max((d.tokensSaved / maxTokens) * 100, 2);
        return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;">
                <div class="chart-bar saved" style="height: ${savedHeight}px;" data-value="${formatNumber(d.tokensSaved)}"></div>
                <div class="chart-bar" style="height: ${usedHeight}px;" data-value="${formatNumber(d.tokensUsed)}"></div>
            </div>
        `;
    }).join('');
}

function renderModelUsage(modelUsage: Record<string, number>): string {
    const entries = Object.entries(modelUsage);
    if (entries.length === 0) {
        return '<div style="color: var(--muted); font-style: italic;">No model usage data</div>';
    }

    const maxTokens = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([model, tokens]) => {
        const percentage = (tokens / maxTokens) * 100;
        return `
            <div class="model-bar">
                <span class="model-name">${model}</span>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="model-count">${formatNumber(tokens)}</span>
            </div>
        `;
    }).join('');
}

export function renderAnalyticsTemplate(model: AnalyticsViewModel): string {
    const tokens = {
        '{{CSP_SOURCE}}': model.cspSource,
        '{{NONCE}}': model.nonce,
        '{{TOOLTIP_STYLES}}': TOOLTIP_STYLES,
        '{{STAT_CARDS}}': renderStatCards(model),
        '{{HISTORY_CHART}}': renderHistoryChart(model.historicalData),
        '{{MODEL_USAGE}}': renderModelUsage(model.currentSession.modelUsage),
        '{{EARLY_REJECTIONS}}': model.currentSession.earlyRejections.toString(),
        '{{GOVERNANCE_EVENTS}}': model.currentSession.governanceEvents.toString(),
        '{{SESSION_DURATION}}': formatDuration(model.currentSession.sessionStart)
    };
    return applyTemplate(ANALYTICS_TEMPLATE, tokens);
}
