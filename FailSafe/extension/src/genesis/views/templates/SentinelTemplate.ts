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
        body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); padding: 12px; margin: 0; }
        .section { margin-bottom: 14px; padding: 14px; background: var(--vscode-editorWidget-background); border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
        .section-title { font-weight: 600; font-size: 12px; color: var(--vscode-foreground); margin-bottom: 10px; }
        .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .status-active { background: var(--vscode-charts-green); } 
        .status-idle { background: var(--vscode-descriptionForeground); }
        .metric { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
        .metric-label { color: var(--vscode-descriptionForeground); } .metric-value { font-weight: 500; }
        .verdict-item { padding: 8px; margin: 6px 0; background: var(--vscode-input-background); border: 1px solid var(--vscode-panel-border); border-radius: 3px; font-size: 11px; }
        .verdict-header { display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 2px; }
        .verdict-decision { font-weight: bold; }
        .verdict-decision.PASS { color: var(--vscode-charts-green); }
        .verdict-decision.WARN { color: var(--vscode-charts-orange); }
        .verdict-decision.BLOCK { color: var(--vscode-charts-red); }
        .verdict-file { opacity: 0.8; word-break: break-all; }
        button { width: 100%; padding: 8px; margin-top: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 12px; }
        button:hover { background: var(--vscode-button-hoverBackground); }
        {{STYLES}}
    </style>
</head>
<body>
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
  };

  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.split(key).join(value),
    SENTINEL_TEMPLATE,
  );
}
