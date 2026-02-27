/**
 * RevertTemplate — Time-Travel Rollback confirmation UI.
 *
 * Renders checkpoint details, commits to discard, and confirmation form.
 * Zero vscode API calls — pure HTML generation.
 */

import { escapeHtml } from "../../../shared/utils/htmlSanitizer";
import { TOOLTIP_STYLES } from "../../../shared/components/Tooltip";

export interface RevertCheckpointView {
  checkpointId: string;
  gitHash: string;
  timestamp: string;
  phase: string;
  status: string;
}

export interface RevertCommitView {
  hash: string;
  subject: string;
  timestamp: string;
}

export interface RevertViewModel {
  nonce: string;
  cspSource: string;
  checkpoint: RevertCheckpointView;
  commitsToDiscard: RevertCommitView[];
  ragPurgeEstimate: number;
}

function renderHeader(): string {
  return `<header class="revert-header">
    <h1>FailSafe Time-Travel</h1>
    <p class="subtitle">Revert workspace to a previous checkpoint</p>
  </header>`;
}

function renderCheckpointCard(cp: RevertCheckpointView): string {
  const hash = escapeHtml(cp.gitHash.slice(0, 12));
  return `<section class="card checkpoint-card">
    <h2>Target Checkpoint</h2>
    <dl>
      <dt>ID</dt><dd>${escapeHtml(cp.checkpointId)}</dd>
      <dt>Git Hash</dt><dd class="mono">${hash}</dd>
      <dt>Timestamp</dt><dd>${escapeHtml(cp.timestamp)}</dd>
      <dt>Phase</dt><dd>${escapeHtml(cp.phase)}</dd>
      <dt>Status</dt><dd>${escapeHtml(cp.status)}</dd>
    </dl>
  </section>`;
}

function renderCommitsList(commits: RevertCommitView[]): string {
  if (commits.length === 0) {
    return `<section class="card"><h2>Commits to Discard</h2>
      <p class="muted">No commits will be discarded.</p>
    </section>`;
  }
  const rows = commits
    .map((c) => {
      const hash = escapeHtml(c.hash.slice(0, 8));
      const subject = escapeHtml(c.subject);
      return `<tr><td class="mono discard">${hash}</td><td>${subject}</td></tr>`;
    })
    .join("");
  return `<section class="card">
    <h2>Commits to Discard (${commits.length})</h2>
    <table class="commits-table"><tbody>${rows}</tbody></table>
  </section>`;
}

function renderRagNotice(count: number): string {
  if (count <= 0) return "";
  return `<section class="card rag-notice">
    <p>${count} Sentinel observation${count === 1 ? "" : "s"} will be permanently deleted.</p>
  </section>`;
}

function renderConfirmation(): string {
  return `<section class="card confirm-section">
    <label for="reason-input">Reason for revert</label>
    <input id="reason-input" type="text" maxlength="2000"
      placeholder="Why are you reverting?" />
    <div class="btn-row">
      <button id="revert-btn" class="btn btn-danger">Revert</button>
      <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
    </div>
  </section>`;
}

function renderResultSection(): string {
  return `<section id="result-section" class="card" style="display:none;">
    <h2>Result</h2>
    <div id="result-steps"></div>
    <div id="result-summary"></div>
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
      --danger: var(--vscode-errorForeground);
      --amber: var(--vscode-editorWarning-foreground);
    }
    body { font-family: var(--vscode-font-family); color: var(--text); padding: 16px; max-width: 640px; margin: 0 auto; }
    .revert-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid var(--amber); padding-bottom: 12px; }
    .revert-header h1 { font-size: 20px; color: var(--amber); }
    .subtitle { font-size: 12px; color: var(--muted); }
    .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; padding: 14px; margin-bottom: 12px; }
    .card h2 { font-size: 14px; margin-bottom: 8px; color: var(--muted); }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; }
    dt { font-weight: bold; }
    .mono { font-family: var(--vscode-editor-font-family); }
    .discard { color: var(--danger); }
    .commits-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .commits-table td { padding: 3px 6px; border-bottom: 1px solid var(--card-border); }
    .rag-notice { border-color: var(--amber); color: var(--amber); font-size: 13px; }
    .confirm-section label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .confirm-section input { width: 100%; padding: 6px 8px; margin-bottom: 12px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
    .btn-row { display: flex; gap: 8px; }
    .btn { padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-secondary { background: var(--card-border); color: var(--text); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .step-row { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 4px 0; }
    .step-icon { width: 18px; text-align: center; }
    .step-success { color: var(--vscode-charts-green); }
    .step-failed { color: var(--danger); }
    .step-skipped { color: var(--muted); }
  </style>`;
}

function renderScript(nonce: string): string {
  return `<script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const revertBtn = document.getElementById('revert-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const reasonInput = document.getElementById('reason-input');
    revertBtn.addEventListener('click', () => {
      revertBtn.disabled = true;
      vscode.postMessage({
        command: 'revert',
        reason: reasonInput.value
      });
    });
    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });
    window.addEventListener('message', (event) => {
      if (event.data.command === 'revertResult') {
        renderResult(event.data.result);
      }
    });
    function renderResult(result) {
      const section = document.getElementById('result-section');
      const stepsEl = document.getElementById('result-steps');
      const summaryEl = document.getElementById('result-summary');
      section.style.display = 'block';
      const icons = { success: '\\u2713', failed: '\\u2717', skipped: '\\u2014', pending: '\\u25CB' };
      stepsEl.innerHTML = (result.steps || []).map(function(s) {
        return '<div class="step-row"><span class="step-icon step-' + s.status + '">'
          + (icons[s.status] || '?') + '</span><span>' + s.name + ': ' + s.detail + '</span></div>';
      }).join('');
      summaryEl.innerHTML = result.success
        ? '<p style="color:var(--vscode-charts-green)">Revert completed successfully.</p>'
        : '<p style="color:var(--danger)">Revert failed: ' + (result.error || 'unknown error') + '</p>';
    }
  </script>`;
}

export function renderRevertTemplate(model: RevertViewModel): string {
  const { nonce, cspSource, checkpoint, commitsToDiscard, ragPurgeEstimate } = model;
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  ${renderStyles(nonce)}
</head>
<body>
  ${renderHeader()}
  ${renderCheckpointCard(checkpoint)}
  ${renderCommitsList(commitsToDiscard)}
  ${renderRagNotice(ragPurgeEstimate)}
  ${renderConfirmation()}
  ${renderResultSection()}
  ${renderScript(nonce)}
</body>
</html>`;
}
