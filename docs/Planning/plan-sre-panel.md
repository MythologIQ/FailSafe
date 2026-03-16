# Plan: SRE Panel & Monitor Toggle

**Current Version**: v4.9.5
**Target Version**: v4.10.0
**Change Type**: feature
**Risk Grade**: L2
**Source**: [AGT #39 comment](https://github.com/microsoft/agent-governance-toolkit/issues/39#issuecomment-4068927183)

## Open Questions

- OWASP ASI control IDs are not yet formally published — plan uses draft labels (ASI-01 through ASI-06); update when AGT publishes the canonical list.
- Trust delegation chains require AgentMesh integration (out of scope here); Phase 2 shows trust scores from AgentHealthIndicator only.

---

## Phase 1: SRE API Route (`/api/v1/sre`)

### Affected Files

- `src/roadmap/routes/SreApiRoute.ts` — new: `setupSreApiRoutes(app, deps)` function
- `src/roadmap/routes/types.ts` — add `getGovernanceMode` and `getRecentVerdicts` to `ApiRouteDeps`
- `src/roadmap/ConsoleServer.ts` — populate new deps + call `setupSreApiRoutes` in `registerApiRoutes()`
- `src/test/roadmap/SreApiRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/routes/types.ts`** — extend `ApiRouteDeps`:
```ts
getGovernanceMode: () => string;
getRecentVerdicts: (limit: number) => any[];
```

**`src/roadmap/routes/SreApiRoute.ts`** — new file:
```ts
import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";

// OWASP ASI draft coverage map — pure value, no state
const ASI_COVERAGE: Record<string, { label: string; covered: boolean; feature: string }> = {
  "ASI-01": { label: "Intent Verification",       covered: true,  feature: "Sentinel verdicts" },
  "ASI-02": { label: "Permission Scoping",         covered: true,  feature: "EnforcementEngine" },
  "ASI-03": { label: "Audit Trail",                covered: true,  feature: "TransparencyEvents" },
  "ASI-04": { label: "Trust Chain",                covered: true,  feature: "ShadowGenome" },
  "ASI-05": { label: "Behavioral Constraints",     covered: true,  feature: "SentinelDaemon rules" },
  "ASI-06": { label: "Delegation Chain Visibility",covered: false, feature: "Requires AgentMesh" },
};

export function setupSreApiRoutes(app: Application, deps: ApiRouteDeps): void {
  app.get("/api/v1/sre", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json({
      policies: {
        mode: deps.getGovernanceMode(),
        recentVerdicts: deps.getRecentVerdicts(limit),
      },
      trust: deps.getHealthMetrics(),
      auditTrail: deps.getTransparencyEvents(limit),
      asiCoverage: ASI_COVERAGE,
    });
  });
}
```

**`src/roadmap/ConsoleServer.ts`** — in `registerApiRoutes()`, add to `apiDeps`:
```ts
getGovernanceMode: () => this.enforcementEngine?.getGovernanceMode() ?? "observe",
getRecentVerdicts: (limit) => this.getRecentVerdicts(limit),
```
Then call:
```ts
setupSreApiRoutes(this.app, apiDeps);
```
Add import: `import { setupSreApiRoutes } from "./routes/SreApiRoute";`

### Unit Tests

- `src/test/roadmap/SreApiRoute.test.ts`
  - returns 403 for non-local requests
  - response contains `policies.mode` string from mock `getGovernanceMode`
  - response `policies.recentVerdicts` is sliced to `limit` parameter
  - response `asiCoverage["ASI-03"].covered` is `true`
  - response `asiCoverage["ASI-06"].covered` is `false`
  - `trust` and `auditTrail` keys are present (may be null from mock)

---

## Phase 2: SRE Console Route (`/console/sre`)

### Affected Files

- `src/roadmap/routes/SreRoute.ts` — new: `SreRouteDeps` interface + `SreRoute.render()`
- `src/roadmap/routes/index.ts` — export `SreRoute`
- `src/roadmap/ConsoleServer.ts` — register `GET /console/sre` in `registerConsoleRoutes()`
- `src/test/roadmap/SreRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/routes/SreRoute.ts`** — new file:
```ts
import { Request, Response } from "express";
import { escapeHtml } from "../../shared/utils/htmlSanitizer";

export interface SreRouteDeps {
  getGovernanceMode: () => string;
  getRecentVerdicts: (limit: number) => any[];
  getTransparencyEvents: (limit: number) => any[];
  getHealthMetrics: () => any | null;
}

const ASI_COVERAGE: Record<string, { label: string; covered: boolean; feature: string }> = {
  "ASI-01": { label: "Intent Verification",        covered: true,  feature: "Sentinel verdicts" },
  "ASI-02": { label: "Permission Scoping",          covered: true,  feature: "EnforcementEngine" },
  "ASI-03": { label: "Audit Trail",                 covered: true,  feature: "TransparencyEvents" },
  "ASI-04": { label: "Trust Chain",                 covered: true,  feature: "ShadowGenome" },
  "ASI-05": { label: "Behavioral Constraints",      covered: true,  feature: "SentinelDaemon rules" },
  "ASI-06": { label: "Delegation Chain Visibility", covered: false, feature: "Requires AgentMesh" },
};

export const SreRoute = {
  render(req: Request, res: Response, deps: SreRouteDeps): void {
    const mode = escapeHtml(deps.getGovernanceMode());
    const verdicts = deps.getRecentVerdicts(10);
    const audit = deps.getTransparencyEvents(10);
    const health = deps.getHealthMetrics();

    const verdictRows = verdicts.map((v: any) =>
      `<tr><td>${escapeHtml(String(v.decision ?? ""))}</td>` +
      `<td>${escapeHtml(String(v.riskGrade ?? ""))}</td>` +
      `<td>${escapeHtml(String(v.details ?? ""))}</td></tr>`
    ).join("") || "<tr><td colspan='3'>No recent verdicts</td></tr>";

    const auditRows = audit.map((e: any) =>
      `<tr><td>${escapeHtml(String(e.timestamp ?? ""))}</td>` +
      `<td>${escapeHtml(String(e.type ?? ""))}</td>` +
      `<td>${escapeHtml(String(e.summary ?? ""))}</td></tr>`
    ).join("") || "<tr><td colspan='3'>No audit events</td></tr>";

    const asiRows = Object.entries(ASI_COVERAGE).map(([id, ctrl]) =>
      `<tr><td>${id}</td><td>${ctrl.label}</td>` +
      `<td class="${ctrl.covered ? "covered" : "gap"}">${ctrl.covered ? "✓" : "–"}</td>` +
      `<td>${ctrl.feature}</td></tr>`
    ).join("");

    const healthHtml = health
      ? `<p>Composite score: <strong>${escapeHtml(String(health.compositeScore ?? "n/a"))}</strong></p>`
      : "<p>Health metrics unavailable.</p>";

    res.send(`<!DOCTYPE html><html lang="en"><head><title>FailSafe SRE</title>
<style>
  body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
  h1{font-size:18px;margin-bottom:16px;}
  h2{font-size:13px;font-weight:700;margin:18px 0 8px;}
  table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;}
  th,td{padding:6px 10px;border:1px solid #c7d7f1;text-align:left;}
  th{background:#edf4ff;font-weight:700;}
  .covered{color:#2c9e67;font-weight:700;} .gap{color:#cb4c5b;}
  .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#2c74f2;color:#fff;}
  a{color:#2c74f2;}
</style></head><body>
<h1>SRE View <span class="badge">${mode}</span></h1>
<a href="/console/home">← Command Center</a>

<h2>Active Policies</h2>
<table><thead><tr><th>Decision</th><th>Risk</th><th>Details</th></tr></thead>
<tbody>${verdictRows}</tbody></table>

<h2>Trust Scores</h2>
${healthHtml}

<h2>Audit Trail</h2>
<table><thead><tr><th>Timestamp</th><th>Type</th><th>Summary</th></tr></thead>
<tbody>${auditRows}</tbody></table>

<h2>OWASP ASI Coverage</h2>
<table><thead><tr><th>Control</th><th>Label</th><th>Status</th><th>FailSafe Feature</th></tr></thead>
<tbody>${asiRows}</tbody></table>
</body></html>`);
  },
};
```

**`src/roadmap/routes/index.ts`** — add:
```ts
export { SreRoute } from './SreRoute';
```

**`src/roadmap/ConsoleServer.ts`** — in `registerConsoleRoutes()`, add:
```ts
this.app.get("/console/sre", (req: Request, res: Response) => {
  SreRoute.render(req, res, {
    getGovernanceMode: () => this.enforcementEngine?.getGovernanceMode() ?? "observe",
    getRecentVerdicts: (limit) => this.getRecentVerdicts(limit),
    getTransparencyEvents: (limit) => this.getTransparencyEvents(limit),
    getHealthMetrics: () => this.agentHealthIndicator?.buildMetrics() ?? null,
  });
});
```
Add import: `import { ..., SreRoute } from "./routes";`

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts`
  - HTML contains `<h2>Active Policies</h2>` section
  - HTML contains `<h2>OWASP ASI Coverage</h2>` section
  - governance mode string is HTML-escaped and appears in badge
  - verdict rows render `decision` and `riskGrade` from mock data
  - XSS: malicious string in `decision` is escaped, not executed
  - audit rows render when `getTransparencyEvents` returns data
  - ASI-03 row contains `✓` (covered); ASI-06 row contains `–` (gap)

---

## Phase 3: Monitor Panel SRE Toggle

### Affected Files

- `src/roadmap/FailSafeSidebarProvider.ts` — add toggle pill + iframe src switching to `getHtml()`
- `src/test/ui/compact-ui.spec.ts` — add Playwright test for toggle presence and behavior

### Changes

**`src/roadmap/FailSafeSidebarProvider.ts`** — replace the single iframe with a toggle pill + iframe block.

In `getHtml()`, after the CSP `<meta>` and before the existing iframe, add:
```html
<div class="sre-toggle" role="tablist" aria-label="View mode">
  <button id="btn-monitor" role="tab" aria-selected="true" onclick="switchView('compact')">Monitor</button>
  <button id="btn-sre"     role="tab" aria-selected="false" onclick="switchView('sre')">SRE</button>
</div>
```

Replace the hardcoded `compactUrl` iframe src with `id="main-frame"`:
```html
<iframe id="main-frame" src="${compactUrl}" ...></iframe>
```

Add inline script (nonce-gated):
```js
const vscode = acquireVsCodeApi();
const state = vscode.getState() || {};
const sreUrl = '${this.baseUrl}/console/sre';
const compactUrl = '${compactUrl}';
if (state.sreMode) switchView('sre');

function switchView(mode) {
  const frame = document.getElementById('main-frame');
  const btnM  = document.getElementById('btn-monitor');
  const btnS  = document.getElementById('btn-sre');
  if (mode === 'sre') {
    frame.src = sreUrl;
    btnM.setAttribute('aria-selected', 'false');
    btnS.setAttribute('aria-selected', 'true');
  } else {
    frame.src = compactUrl;
    btnM.setAttribute('aria-selected', 'true');
    btnS.setAttribute('aria-selected', 'false');
  }
  vscode.setState({ ...vscode.getState(), sreMode: mode === 'sre' });
}
```

Add toggle CSS (nonce-gated):
```css
.sre-toggle { display:flex; gap:4px; padding:6px 8px; background:#edf4ff;
              border-bottom:1px solid #c7d7f1; }
.sre-toggle button { flex:1; padding:4px 0; border:1px solid #c7d7f1;
                     border-radius:6px; background:#fff; font-size:11px;
                     font-weight:600; cursor:pointer; color:#455a7c; }
.sre-toggle button[aria-selected="true"] { background:#2c74f2; color:#fff;
                                           border-color:#2c74f2; }
```

### Unit Tests

- `src/test/ui/compact-ui.spec.ts`
  - sidebar webview contains a toggle pill with "Monitor" and "SRE" buttons
  - "Monitor" button has `aria-selected="true"` by default
  - (navigation to `/console/sre` is server-side; no additional Playwright assertion needed beyond button presence)
