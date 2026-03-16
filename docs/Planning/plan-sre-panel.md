# Plan: SRE Panel & Monitor Toggle (Amended)

**Current Version**: v4.9.5
**Target Version**: v4.10.0
**Change Type**: feature
**Risk Grade**: L2
**Source**: [AGT #39 comment](https://github.com/microsoft/agent-governance-toolkit/issues/39#issuecomment-4068927183)
**Prior Verdict**: VETO (Entry #235, 4 violations)

## Open Questions

- OWASP ASI control IDs are not yet formally published — plan uses draft labels (ASI-01 through ASI-06); update when AGT publishes the canonical list.
- Trust delegation chains require AgentMesh integration (out of scope here); Phase 2 shows trust scores from AgentHealthIndicator only.

## Violations Addressed

| ID | Fix |
|----|-----|
| V1 Razor | `render()` extracted — `SreTemplate.ts` holds `buildSreHtml()` (~33L); `SreRoute.render()` is ≤10L |
| V2 Architecture | `ASI_COVERAGE` extracted to `src/roadmap/services/SreAsiCoverage.ts`; imported by both API and HTML routes |
| V3 Ghost Path | Wiring target corrected to `registerConsoleExtras()` |
| V4 Ghost Path | Toggle script merged into the existing `<script nonce>` block in `getHtml()`; no second `acquireVsCodeApi()` call |

---

## Phase 1: Shared ASI Data + SRE API Route

### Affected Files

- `src/roadmap/services/SreAsiCoverage.ts` — new: `AsiControl` type + `ASI_COVERAGE` const (single source of truth)
- `src/roadmap/routes/SreApiRoute.ts` — new: `setupSreApiRoutes(app, deps)`
- `src/roadmap/routes/types.ts` — add `getGovernanceMode` and `getRecentVerdicts` to `ApiRouteDeps`
- `src/roadmap/ConsoleServer.ts` — populate new deps + call `setupSreApiRoutes` in `registerApiRoutes()`
- `src/test/roadmap/SreApiRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/services/SreAsiCoverage.ts`** — new file:
```ts
export type AsiControl = {
  label: string;
  covered: boolean;
  feature: string;
};

export const ASI_COVERAGE: Record<string, AsiControl> = {
  "ASI-01": { label: "Intent Verification",        covered: true,  feature: "Sentinel verdicts" },
  "ASI-02": { label: "Permission Scoping",          covered: true,  feature: "EnforcementEngine" },
  "ASI-03": { label: "Audit Trail",                 covered: true,  feature: "TransparencyEvents" },
  "ASI-04": { label: "Trust Chain",                 covered: true,  feature: "ShadowGenome" },
  "ASI-05": { label: "Behavioral Constraints",      covered: true,  feature: "SentinelDaemon rules" },
  "ASI-06": { label: "Delegation Chain Visibility", covered: false, feature: "Requires AgentMesh" },
};
```

**`src/roadmap/routes/types.ts`** — extend `ApiRouteDeps`:
```ts
getGovernanceMode: () => string;
getRecentVerdicts: (limit: number) => any[];
```

**`src/roadmap/routes/SreApiRoute.ts`** — new file:
```ts
import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";
import { ASI_COVERAGE } from "../services/SreAsiCoverage";

export function setupSreApiRoutes(app: Application, deps: ApiRouteDeps): void {
  app.get("/api/v1/sre", (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json({
      policies: { mode: deps.getGovernanceMode(), recentVerdicts: deps.getRecentVerdicts(limit) },
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
  - returns 403 for non-local requests (mock `rejectIfRemote` returns true)
  - `policies.mode` reflects value from mock `getGovernanceMode`
  - `policies.recentVerdicts` respects `limit` parameter (capped at 100)
  - `asiCoverage["ASI-03"].covered` is `true`; `asiCoverage["ASI-06"].covered` is `false`
  - `trust` and `auditTrail` keys present in response (may be null)

---

## Phase 2: SRE Console Route (Template-Separated)

### Affected Files

- `src/roadmap/routes/templates/SreTemplate.ts` — new: `SreViewModel` type + `buildSreHtml(model)`
- `src/roadmap/routes/SreRoute.ts` — new: `SreRouteDeps` + `SreRoute.render()` (≤10 lines)
- `src/roadmap/routes/index.ts` — export `SreRoute`
- `src/roadmap/ConsoleServer.ts` — register `GET /console/sre` in `registerConsoleExtras()`
- `src/test/roadmap/SreRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/routes/templates/SreTemplate.ts`** — new file:
```ts
import { escapeHtml } from "../../../shared/utils/htmlSanitizer";
import { ASI_COVERAGE } from "../../services/SreAsiCoverage";

export type SreViewModel = {
  mode: string;
  verdicts: any[];
  auditTrail: any[];
  health: any | null;
};

export function buildSreHtml(model: SreViewModel): string {
  const mode = escapeHtml(model.mode);
  const verdictRows = model.verdicts.map((v: any) =>
    `<tr><td>${escapeHtml(String(v.decision ?? ""))}</td>` +
    `<td>${escapeHtml(String(v.riskGrade ?? ""))}</td>` +
    `<td>${escapeHtml(String(v.details ?? ""))}</td></tr>`
  ).join("") || "<tr><td colspan='3'>No recent verdicts</td></tr>";
  const auditRows = model.auditTrail.map((e: any) =>
    `<tr><td>${escapeHtml(String(e.timestamp ?? ""))}</td>` +
    `<td>${escapeHtml(String(e.type ?? ""))}</td>` +
    `<td>${escapeHtml(String(e.summary ?? ""))}</td></tr>`
  ).join("") || "<tr><td colspan='3'>No audit events</td></tr>";
  const asiRows = Object.entries(ASI_COVERAGE).map(([id, ctrl]) =>
    `<tr><td>${id}</td><td>${ctrl.label}</td>` +
    `<td class="${ctrl.covered ? "covered" : "gap"}">${ctrl.covered ? "✓" : "–"}</td>` +
    `<td>${ctrl.feature}</td></tr>`
  ).join("");
  const healthHtml = model.health
    ? `<p>Score: <strong>${escapeHtml(String(model.health.compositeScore ?? "n/a"))}</strong></p>`
    : "<p>Health metrics unavailable.</p>";
  return `<!DOCTYPE html><html lang="en"><head><title>FailSafe SRE</title>
<style>body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
h2{font-size:13px;font-weight:700;margin:18px 0 8px;}
table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;}
th,td{padding:6px 10px;border:1px solid #c7d7f1;text-align:left;}th{background:#edf4ff;}
.covered{color:#2c9e67;font-weight:700;}.gap{color:#cb4c5b;}
.badge{padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:#2c74f2;color:#fff;}
a{color:#2c74f2;}</style></head><body>
<h1>SRE View <span class="badge">${mode}</span></h1>
<a href="/console/home">← Command Center</a>
<h2>Active Policies</h2>
<table><thead><tr><th>Decision</th><th>Risk</th><th>Details</th></tr></thead><tbody>${verdictRows}</tbody></table>
<h2>Trust Scores</h2>${healthHtml}
<h2>Audit Trail</h2>
<table><thead><tr><th>Timestamp</th><th>Type</th><th>Summary</th></tr></thead><tbody>${auditRows}</tbody></table>
<h2>OWASP ASI Coverage</h2>
<table><thead><tr><th>Control</th><th>Label</th><th>Status</th><th>Feature</th></tr></thead><tbody>${asiRows}</tbody></table>
</body></html>`;
}
```

**`src/roadmap/routes/SreRoute.ts`** — new file:
```ts
import { Request, Response } from "express";
import { buildSreHtml, type SreViewModel } from "./templates/SreTemplate";

export interface SreRouteDeps {
  getGovernanceMode: () => string;
  getRecentVerdicts: (limit: number) => any[];
  getTransparencyEvents: (limit: number) => any[];
  getHealthMetrics: () => any | null;
}

export const SreRoute = {
  render(req: Request, res: Response, deps: SreRouteDeps): void {
    const model: SreViewModel = {
      mode: deps.getGovernanceMode(),
      verdicts: deps.getRecentVerdicts(10),
      auditTrail: deps.getTransparencyEvents(10),
      health: deps.getHealthMetrics(),
    };
    res.send(buildSreHtml(model));
  },
};
```

**`src/roadmap/routes/index.ts`** — add:
```ts
export { SreRoute } from './SreRoute';
```

**`src/roadmap/ConsoleServer.ts`** — in `registerConsoleExtras()`, add before the `if (!this.permissionManager)` guard:
```ts
this.app.get("/console/sre", (req, res) => {
  SreRoute.render(req, res, {
    getGovernanceMode: () => this.enforcementEngine?.getGovernanceMode() ?? "observe",
    getRecentVerdicts: (limit) => this.getRecentVerdicts(limit),
    getTransparencyEvents: (limit) => this.getTransparencyEvents(limit),
    getHealthMetrics: () => this.agentHealthIndicator?.buildMetrics() ?? null,
  });
});
```
Add to existing import: `import { ..., SreRoute } from "./routes";`

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts`
  - HTML contains `Active Policies` and `OWASP ASI Coverage` headings
  - governance mode appears escaped in badge element
  - verdict decision/riskGrade from mock data appear in table rows
  - XSS: `<script>` in verdict `decision` is escaped to `&lt;script&gt;`
  - audit rows render when `getTransparencyEvents` returns data
  - ASI-03 row contains `✓`; ASI-06 row contains `–`
  - empty verdicts renders "No recent verdicts" fallback

---

## Phase 3: Monitor Panel SRE Toggle

### Affected Files

- `src/roadmap/FailSafeSidebarProvider.ts` — add toggle pill HTML + merge toggle logic into existing `<script>` block
- `src/test/ui/compact-ui.spec.ts` — add Playwright test for toggle pill presence

### Changes

**`src/roadmap/FailSafeSidebarProvider.ts`** — three edits to `getHtml()`:

**Edit 1** — add toggle pill CSS inside the existing `<style>` block:
```css
.sre-toggle { display:flex; gap:4px; padding:6px 8px; background:#0a1f4a;
              border-bottom:1px solid rgba(95,150,255,0.35); }
.sre-toggle button { flex:1; padding:4px 0; border:1px solid #3568d8;
                     border-radius:6px; background:#10357a; font-size:11px;
                     font-weight:600; cursor:pointer; color:#eaf1ff; }
.sre-toggle button[aria-selected="true"] { background:#2c74f2; border-color:#2c74f2; }
```

**Edit 2** — insert toggle pill inside `.shell` div, after `.toolbar` and before `.frame-wrap`:
```html
<div class="sre-toggle" role="tablist" aria-label="View mode">
  <button id="btn-monitor" role="tab" aria-selected="true">Monitor</button>
  <button id="btn-sre"     role="tab" aria-selected="false">SRE</button>
</div>
```
Also add `id="main-frame"` to the existing `<iframe>` element.

**Edit 3** — append to the **existing** `<script nonce="${nonce}">` block, after the `window.addEventListener` handler (no new script tag, no new `acquireVsCodeApi()` call):
```js
const sreUrl = '${this.baseUrl}/console/sre';
const compactUrl = '${compactUrl}';
const mainFrame = document.getElementById('main-frame');
const btnMonitor = document.getElementById('btn-monitor');
const btnSre = document.getElementById('btn-sre');

function switchView(isSre) {
  mainFrame.src = isSre ? sreUrl : compactUrl;
  btnMonitor.setAttribute('aria-selected', String(!isSre));
  btnSre.setAttribute('aria-selected', String(isSre));
  vscode.setState({ ...vscode.getState(), sreMode: isSre });
}

btnMonitor.addEventListener('click', () => switchView(false));
btnSre.addEventListener('click', () => switchView(true));

if (state.sreMode) switchView(true);
```

Note: `vscode` and `state` are already declared earlier in the same script block — no re-declaration needed.

### Unit Tests

- `src/test/ui/compact-ui.spec.ts`
  - sidebar webview HTML contains `#btn-monitor` with `aria-selected="true"`
  - sidebar webview HTML contains `#btn-sre` with `aria-selected="false"`
  - `#main-frame` iframe element is present
