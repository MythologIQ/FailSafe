import { SentinelStatus, SentinelVerdict } from "../../../shared/types";
import { escapeHtml } from "../../../shared/utils/htmlSanitizer";
import {
  INFO_HINT_STYLES,
  HELP_TEXT,
} from "../../../shared/components/InfoHint";
import {
  tooltipAttrs,
  TOOLTIP_STYLES,
} from "../../../shared/components/Tooltip";
import { ENGAGEMENT_COPY } from "../../../shared/content/engagementCopy";

export type SentinelViewModel = {
  nonce: string;
  cspSource: string;
  status: SentinelStatus;
  recentVerdicts: SentinelVerdict[];
};

const SENTINEL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{CSP_SOURCE}} 'nonce-{{NONCE}}'; script-src 'nonce-{{NONCE}}';">
    <title>Sentinel</title>
    <style nonce="{{NONCE}}">
        :root {
            --vscode-sideBar-background: #eaf2ff;
            --vscode-editor-background: #f6faff;
            --vscode-editorWidget-background: #ffffff;
            --vscode-foreground: #16233a;
            --vscode-descriptionForeground: #455a7c;
            --vscode-panel-border: #c7d7f1;
            --vscode-button-background: #2c74f2;
            --vscode-button-foreground: #ffffff;
            --vscode-button-hoverBackground: #1f5fd0;
            --vscode-focusBorder: #2c74f2;
            --vscode-charts-green: #2c9e67;
            --vscode-charts-orange: #d0833d;
            --vscode-charts-red: #cb4c5b;
        }
        body { font-family: "Segoe UI Variable Text", "Aptos", "Trebuchet MS", sans-serif; font-size: var(--vscode-font-size); color: var(--vscode-foreground); background:
            radial-gradient(circle at 100% 0%, rgba(98, 193, 176, 0.16), transparent 42%),
            radial-gradient(circle at 0% 15%, rgba(106, 177, 255, 0.2), transparent 44%),
            linear-gradient(180deg, #f9fcff 0%, #edf4ff 100%);
            padding: 14px; margin: 0; }
        .section { margin-bottom: 14px; padding: 14px; background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); border-radius: 14px; border: 1px solid var(--vscode-panel-border); box-shadow: 0 10px 20px rgba(34, 72, 139, 0.09); }
        .section-title { font-weight: 700; font-size: 12px; color: var(--vscode-foreground); margin-bottom: 10px; letter-spacing: 0.2px; }
        .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status-active { background: var(--vscode-charts-green); } 
        .status-idle { background: var(--vscode-descriptionForeground); }
        .metric { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
        .metric-label { color: var(--vscode-descriptionForeground); } .metric-value { font-weight: 500; }
        .verdict-item { padding: 9px; margin: 6px 0; background: #f8fbff; border: 1px solid var(--vscode-panel-border); border-radius: 10px; font-size: 11px; }
        .verdict-header { display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 2px; }
        .verdict-decision { font-weight: bold; }
        .verdict-decision.PASS { color: var(--vscode-charts-green); }
        .verdict-decision.WARN { color: var(--vscode-charts-orange); }
        .verdict-decision.BLOCK { color: var(--vscode-charts-red); }
        .verdict-file { opacity: 0.8; word-break: break-all; }
        button { width: 100%; padding: 9px; margin-top: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 700; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        .panel-actions { margin-bottom: 10px; }
        .panel-actions button { margin-top: 0; }
        .panel-actions .launch-btn { background: linear-gradient(135deg, #2c74f2 0%, #5b94ff 60%, #62c1b0 100%); box-shadow: 0 10px 22px rgba(44, 116, 242, 0.3); font-size: 13px; }
        .panel-actions .launch-btn:hover { background: linear-gradient(135deg, #1f5fd0 0%, #3f7df0 100%); }
        .mini-illustration { margin-bottom: 12px; padding: 10px; border: 1px solid #c7d7f1; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #f3f8ff 100%); }
        .mini-illustration svg { display: block; width: 100%; height: 40px; }
        .mini-illustration-caption { margin-top: 4px; font-size: 10px; color: var(--vscode-descriptionForeground); }
        {{STYLES}}
    </style>
</head>
<body>
    <div class="panel-actions">
        <div style="margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:.35px;color:var(--vscode-descriptionForeground);text-transform:uppercase;">UI-06 Sentinel View</div>
        <button class="launch-btn" onclick="openFailSafeUi()">Open FailSafe UI</button>
    </div>
    <div class="mini-illustration">
        <svg viewBox="0 0 320 40" role="img" aria-label="Sentinel watch coverage illustration">
            <rect x="14" y="10" width="292" height="20" rx="10" fill="#e7f0ff" stroke="#c7d7f1"></rect>
            <rect x="14" y="10" width="{{WATCH_BAR_WIDTH}}" height="20" rx="10" fill="url(#sentinel-fill)"></rect>
            <defs>
                <linearGradient id="sentinel-fill" x1="0" x2="1">
                    <stop offset="0%" stop-color="#2c74f2"/>
                    <stop offset="100%" stop-color="#62c1b0"/>
                </linearGradient>
            </defs>
        </svg>
        <div class="mini-illustration-caption">Watch coverage and queue pressure at a glance</div>
    </div>

    <div class="section">
        <div class="section-title">${ENGAGEMENT_COPY.nextStepTitle}</div>
        <div class="metric">
            <span class="metric-label">{{NEXT_ACTION}}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Sentinel Status</div>
        <div class="metric">
            <span class="metric-label">
                <span class="status-indicator {{STATUS_CLASS}}"></span>
                {{STATUS_LABEL}}
            </span>
            <span class="metric-value">{{MODE}}</span>
        </div>
        <div class="metric">
            <span class="metric-label" {{TOOLTIP_FILES}}>Files Watched</span>
            <span class="metric-value">{{FILES_WATCHED}}</span>
        </div>
        <div class="metric">
            <span class="metric-label" {{TOOLTIP_QUEUE}}>Queue Depth</span>
            <span class="metric-value">{{QUEUE_DEPTH}}</span>
        </div>
        <div class="metric">
            <span class="metric-label">Processed</span>
            <span class="metric-value">{{EVENTS_PROCESSED}}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Recent Verdicts</div>
        {{VERDICTS}}
    </div>

    <button onclick="auditFile()">Audit Current File</button>

    <script nonce="{{NONCE}}">
        const vscode = acquireVsCodeApi();
        function openFailSafeUi() { vscode.postMessage({ command: 'openFailSafeUi' }); }
        function auditFile() { vscode.postMessage({ command: 'auditFile' }); }
    </script>
</body>
</html>`;

export function renderSentinelTemplate(model: SentinelViewModel): string {
  const status = model.status;

  const verdictsHtml =
    model.recentVerdicts.length === 0
      ? '<div style="font-size: 11px; color: var(--vscode-descriptionForeground);">No recent verdicts</div>'
      : model.recentVerdicts
          .map(
            (v) => `
            <div class="verdict-item">
                <div class="verdict-header">
                    <span class="verdict-decision ${v.decision}">${v.decision}</span>
                    <span style="opacity: 0.6;">${v.riskGrade}</span>
                </div>
                <div class="verdict-file">${escapeHtml(v.details || "Unknown file")}</div>
            </div>
        `,
          )
          .join("");

  const styles = [INFO_HINT_STYLES, TOOLTIP_STYLES].join("");

  const tokens = {
    "{{CSP_SOURCE}}": model.cspSource,
    "{{NONCE}}": model.nonce,
    "{{STYLES}}": styles,
    "{{STATUS_CLASS}}": status.running ? "status-active" : "status-idle",
    "{{STATUS_LABEL}}": status.running ? "Monitoring" : "Idle",
    "{{NEXT_ACTION}}": status.running
      ? ENGAGEMENT_COPY.sentinelMonitorAction
      : ENGAGEMENT_COPY.sentinelIdleAction,
    "{{MODE}}": escapeHtml(status.mode),
    "{{FILES_WATCHED}}": status.filesWatched.toString(),
    "{{QUEUE_DEPTH}}": status.queueDepth.toString(),
    "{{EVENTS_PROCESSED}}": status.eventsProcessed.toString(),
    "{{VERDICTS}}": verdictsHtml,
    "{{TOOLTIP_FILES}}": tooltipAttrs(HELP_TEXT.filesWatched),
    "{{TOOLTIP_QUEUE}}": tooltipAttrs(HELP_TEXT.queueDepth),
    "{{WATCH_BAR_WIDTH}}": Math.max(14, Math.min(292, status.filesWatched / 8)).toFixed(0),
  };

  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.split(key).join(value),
    SENTINEL_TEMPLATE,
  );
}
