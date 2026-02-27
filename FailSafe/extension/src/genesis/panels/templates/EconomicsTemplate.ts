/**
 * EconomicsTemplate — Token Economics ROI Dashboard HTML template.
 *
 * Renders against a generic EconomicsSnapshot JSON schema.
 * Zero vscode API calls — pure HTML generation.
 */

import { EconomicsSnapshot, DailyAggregate } from "../../../economics/types";
import { tooltipAttrs, TOOLTIP_STYLES } from "../../../shared/components/Tooltip";

export interface EconomicsViewModel {
  nonce: string;
  cspSource: string;
  snapshot: EconomicsSnapshot;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function renderHeroSection(snapshot: EconomicsSnapshot): string {
  const cost = snapshot.weeklyCostSaved.toFixed(2);
  return `
    <section class="hero">
      <div class="hero-metric">
        <span class="hero-label">Tokens Saved This Week</span>
        <span class="hero-value">${formatNumber(snapshot.weeklyTokensSaved)}</span>
      </div>
      <div class="hero-cost">
        <span class="cost-label">Estimated Savings</span>
        <span class="cost-value">$${cost}</span>
      </div>
    </section>`;
}

function renderDonutChart(ratio: number): string {
  const ragPct = Math.round(ratio * 100);
  const fullPct = 100 - ragPct;
  return `
    <section class="chart-card">
      <h3 ${tooltipAttrs("Percentage of prompts using lightweight Sentinel RAG")}>Context Sync Ratio</h3>
      <div class="donut" style="background: conic-gradient(
        var(--success) 0% ${ragPct}%,
        var(--muted) ${ragPct}% 100%
      );">
        <div class="donut-hole">
          <span class="donut-pct">${ragPct}%</span>
          <span class="donut-label">RAG</span>
        </div>
      </div>
      <div class="donut-legend">
        <span class="legend-item"><span class="dot rag"></span> RAG (${ragPct}%)</span>
        <span class="legend-item"><span class="dot full"></span> Full (${fullPct}%)</span>
      </div>
    </section>`;
}

function renderBarChart(dailyAggregates: DailyAggregate[]): string {
  const maxTokens = Math.max(1, ...dailyAggregates.map((d) => d.tokensSaved));
  const bars = dailyAggregates
    .slice(-30)
    .map((d) => {
      const height = Math.round((d.tokensSaved / maxTokens) * 100);
      const label = d.date.slice(5);
      return `<div class="bar-col">
        <div class="bar" style="height:${height}%"
          ${tooltipAttrs(`${label}: ${formatNumber(d.tokensSaved)} saved`)}></div>
        <span class="bar-label">${label}</span>
      </div>`;
    })
    .join("");

  return `
    <section class="chart-card">
      <h3>30-Day Token Savings Trend</h3>
      <div class="bar-chart">${bars}</div>
    </section>`;
}

function renderStyles(nonce: string): string {
  return `<style nonce="${nonce}">
    ${TOOLTIP_STYLES}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --card-bg: var(--vscode-editorWidget-background);
      --card-border: var(--vscode-editorWidget-border);
      --text: var(--vscode-foreground);
      --muted: var(--vscode-descriptionForeground);
      --success: var(--vscode-charts-green);
      --accent: var(--vscode-charts-blue);
    }
    body { font-family: var(--vscode-font-family); color: var(--text); padding: 16px; }
    .hero { text-align: center; margin-bottom: 24px; }
    .hero-label, .cost-label { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; }
    .hero-value { display: block; font-size: 48px; font-weight: bold; color: var(--success); }
    .cost-value { display: block; font-size: 28px; font-weight: bold; color: var(--accent); }
    .chart-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; padding: 16px; margin-bottom: 16px; }
    .chart-card h3 { font-size: 14px; margin-bottom: 12px; color: var(--muted); }
    .donut { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto; position: relative; }
    .donut-hole { position: absolute; inset: 20%; background: var(--card-bg); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-pct { font-size: 20px; font-weight: bold; }
    .donut-label { font-size: 10px; color: var(--muted); }
    .donut-legend { display: flex; justify-content: center; gap: 16px; margin-top: 8px; font-size: 12px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
    .dot.rag { background: var(--success); }
    .dot.full { background: var(--muted); }
    .bar-chart { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; min-height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }
    .bar-label { font-size: 8px; color: var(--muted); margin-top: 2px; writing-mode: vertical-rl; }
    .refresh-btn { display: block; margin: 16px auto 0; padding: 6px 16px; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer; }
  </style>`;
}

export function renderEconomicsTemplate(model: EconomicsViewModel): string {
  const { nonce, cspSource, snapshot } = model;
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  ${renderStyles(nonce)}
</head>
<body>
  ${renderHeroSection(snapshot)}
  <div class="charts-row">
    ${renderDonutChart(snapshot.contextSyncRatio)}
    ${renderBarChart(snapshot.dailyAggregates)}
  </div>
  <button class="refresh-btn" onclick="refresh()">Refresh</button>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function refresh() { vscode.postMessage({ command: 'refresh' }); }
  </script>
</body>
</html>`;
}
