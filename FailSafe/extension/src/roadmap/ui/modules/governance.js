// FailSafe Command Center — Governance Panel Renderer
// Sentinel status, verify button, policies, L3 queue, audit log.

export class GovernanceRenderer {
  constructor(containerId, deps = {}) {
    this.container = document.getElementById(containerId);
    this.client = deps.client || null;
    this.verdictLog = [];
  }

  render(hubData) {
    if (!this.container) return;
    this._lastHub = hubData;
    const sentinel = hubData.sentinelStatus || {};
    const l3Queue = hubData.l3Queue || [];
    const policies = hubData.activePolicies || hubData.policies || [];
    const chainValid = hubData.chainValid ?? null;

    this.container.innerHTML = `
      <div class="cc-grid-2" style="margin-bottom:16px">
        ${this.renderSentinelCard(sentinel, chainValid)}
        ${this.renderPoliciesCard(policies)}
      </div>
      ${this.renderL3Queue(l3Queue)}
      ${this.renderAuditLog()}`;
    this.bindActions();
  }

  renderSentinelCard(sentinel, chainValid) {
    const running = sentinel.running;
    const statusColor = running ? 'var(--accent-green)' : 'var(--accent-red)';
    const statusText = running ? 'Active' : 'Halted';
    const chainLabels = { true: 'Valid', false: 'Broken' };
    const chainText = chainLabels[String(chainValid)] || 'Unknown';
    const chainColor = chainValid === true ? 'var(--accent-green)' : 'var(--accent-red)';

    return `
      <div class="cc-card">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:8px">Sentinel</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${statusColor}"></span>
          <span style="font-weight:600">${statusText}</span>
          <span class="cc-badge" style="background:var(--primary);color:#fff">${sentinel.mode || 'observe'}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted)">
          Events: ${sentinel.eventsProcessed || 0} ·
          Chain: <span style="color:${chainColor}">${chainText}</span>
        </div>
        <button class="cc-btn cc-btn--primary cc-gov-verify" style="margin-top:10px">Verify Integrity</button>
      </div>`;
  }

  renderPoliciesCard(policies) {
    const items = policies.length
      ? policies.map(p => `<div style="padding:4px 0;border-bottom:1px solid var(--border-rim);
          font-size:0.82rem">${p.name || p.id || 'Policy'}</div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem">No active policies</div>';
    return `
      <div class="cc-card">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:8px">Active Policies</div>
        <div style="max-height:180px;overflow-y:auto">${items}</div>
      </div>`;
  }

  renderL3Queue(queue) {
    if (!queue.length) {
      return `<div class="cc-card" style="margin-bottom:16px">
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:6px">L3 Verification Queue</div>
        <div style="color:var(--text-muted);font-size:0.82rem">No pending items</div>
      </div>`;
    }
    const rows = queue.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;
        border-bottom:1px solid var(--border-rim);font-size:0.82rem">
        <div>
          <span class="cc-badge cc-badge--${(item.riskGrade || 'medium').toLowerCase()}">${item.riskGrade || '?'}</span>
          <span style="margin-left:6px">${this.esc(item.filePath || item.id)}</span>
        </div>
        <span style="color:var(--text-muted);font-size:0.7rem">${item.queuedAt || ''}</span>
      </div>`).join('');

    return `
      <div class="cc-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
            letter-spacing:0.08em">L3 Verification Queue (${queue.length})</div>
          <button class="cc-btn cc-btn--primary cc-gov-l3-batch" style="padding:4px 12px;font-size:0.75rem">
            Process All</button>
        </div>
        ${rows}
      </div>`;
  }

  renderAuditLog() {
    const entries = this.verdictLog.slice(-50).reverse().map(v => {
      const level = this.verdictLevel(v);
      return `<div class="cc-verdict cc-verdict--${level}" style="margin-bottom:6px;font-size:0.8rem">
        <span style="color:var(--text-muted);font-size:0.7rem">${v.time || ''}</span>
        <span style="margin-left:8px">${v.payload?.message || v.payload?.type || 'Verdict'}</span>
      </div>`;
    }).join('');
    return `
      <div>
        <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:8px">Protocol Audit Log</div>
        <div style="max-height:200px;overflow-y:auto">${entries || '<div style="color:var(--text-muted);font-size:0.82rem">No verdicts yet</div>'}</div>
      </div>`;
  }

  verdictLevel(v) {
    const verdict = v.payload?.policyVerdict || v.payload?.verdict || '';
    if (/violation|fail/i.test(verdict)) return 'violation';
    if (/warn/i.test(verdict)) return 'warn';
    return 'pass';
  }

  bindActions() {
    this.container.querySelector('.cc-gov-verify')?.addEventListener('click', async (e) => {
      if (!this.client) return;
      e.target.disabled = true;
      try { await this.client.postAction('/api/actions/verify-integrity'); }
      finally { e.target.disabled = false; }
    });
    this.container.querySelector('.cc-gov-l3-batch')?.addEventListener('click', async (e) => {
      if (!this.client) return;
      e.target.disabled = true;
      try { await this.client.postAction('/api/actions/approve-l3-batch', { decision: 'APPROVED' }); }
      finally { e.target.disabled = false; }
    });
  }

  onEvent(event) {
    if (!event) return;
    const isVerdict = event.type === 'verdict' || /verdict/i.test(event.type);
    if (isVerdict) {
      this.verdictLog.push(event);
      const logEl = this.container?.querySelector('.cc-verdict')?.parentElement;
      if (logEl) this.render(this._lastHub || {});
    }
  }

  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  destroy() { if (this.container) this.container.innerHTML = ''; }
}
