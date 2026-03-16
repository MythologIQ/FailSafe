# Plan: SRE Panel & Monitor Toggle (Amended v2 — AGT Data Only)

**Current Version (FailSafe)**: v4.9.5
**Target Version (FailSafe)**: v4.10.0
**Current Version (agent-failsafe)**: v0.4.0
**Target Version (agent-failsafe)**: v0.5.0
**Change Type**: feature
**Risk Grade**: L2
**Source**: [AGT #39 comment](https://github.com/microsoft/agent-governance-toolkit/issues/39#issuecomment-4068927183)
**Prior Verdict**: VETO (Entry #235, 4 violations — all addressed below)

## Open Questions

- OWASP ASI control IDs are draft — plan uses ASI-01 through ASI-06; update when AGT publishes canonical list.
- `FailSafeTrustMapper` does not currently expose a public scores snapshot — `trustScores` returns `[]` in v1; populated in a follow-on once agent evaluation history is wired.
- `agent-failsafe` has no HTTP server yet — `fastapi` + `uvicorn` added as `server` optional extra.

## Design Intent

The SRE panel surfaces **AGT adapter data only** — no FailSafe-internal verdicts, health metrics, or transparency events. Data flows:

```
agent-failsafe REST server (port 9377)
  → FailSafe /api/v1/sre (transparent proxy)
  → /console/sre HTML page
  → Monitor panel SRE tab
```

This isolation means the panel can be extracted directly as a VS Code extension component for AGT contribution.

## Violations Addressed (from VETO Entry #235)

| ID | Fix |
|----|-----|
| V1 Razor | `render()` is ≤5L; HTML template extracted to `buildSreConnectedHtml()` (~24L) + `buildSreDisconnectedHtml()` (~12L) in `SreTemplate.ts` |
| V2 Architecture | ASI coverage is now defined in `agent-failsafe/rest_server.py` (Python source of truth) and returned by the adapter; `SreAsiCoverage.ts` not needed |
| V3 Ghost Path | Wiring target is `registerConsoleExtras()` (verified at line 662 of ConsoleServer.ts) |
| V4 Ghost Path | Toggle logic merged into the existing `<script nonce>` block; no second `acquireVsCodeApi()` call |

---

## Phase 1: `agent-failsafe` REST Bridge

**Repo**: `MythologIQ/agent-failsafe`

### Affected Files

- `src/agent_failsafe/rest_server.py` — new: `create_sre_app()` factory + `GET /sre/snapshot`
- `pyproject.toml` — add `server` optional extra (`fastapi>=0.100.0`, `uvicorn>=0.20.0`)
- `tests/test_rest_server.py` — new unit tests

### Changes

**`pyproject.toml`** — add to `[project.optional-dependencies]`:
```toml
server = ["fastapi>=0.100.0", "uvicorn>=0.20.0"]
```

**`src/agent_failsafe/rest_server.py`** — new file:
```python
"""REST bridge — exposes FailSafe adapter data for the SRE panel.

Install extras: pip install "agent-failsafe[server]"
Run:           python -m agent_failsafe.rest_server
"""

from __future__ import annotations

from typing import Any

# Lazy FastAPI import — requires server extra
_FastAPI: Any = None

def _ensure_fastapi() -> None:
    global _FastAPI
    if _FastAPI is None:
        from fastapi import FastAPI  # noqa: PLC0415
        _FastAPI = FastAPI

# OWASP ASI draft coverage — what agent-failsafe covers
_ASI_COVERAGE = {
    "ASI-01": {"label": "Intent Verification",        "covered": True,  "feature": "FailSafeInterceptor"},
    "ASI-02": {"label": "Permission Scoping",          "covered": True,  "feature": "GovernancePipeline"},
    "ASI-03": {"label": "Audit Trail",                 "covered": True,  "feature": "FailSafeAuditSink"},
    "ASI-04": {"label": "Trust Chain",                 "covered": True,  "feature": "FailSafeTrustMapper"},
    "ASI-05": {"label": "Behavioral Constraints",      "covered": True,  "feature": "ShadowGenomePolicyProvider"},
    "ASI-06": {"label": "Delegation Chain Visibility", "covered": True,  "feature": "FailSafeTrustMapper (partial)"},
}

def create_sre_app(
    policy_provider: Any = None,  # ShadowGenomePolicyProvider | None
    sli: Any = None,              # FailSafeComplianceSLI | None
) -> Any:
    """Create FastAPI app exposing GET /sre/snapshot.

    Args:
        policy_provider: ShadowGenomePolicyProvider instance (or None).
        sli: FailSafeComplianceSLI instance (or None).

    Returns:
        FastAPI application.
    """
    _ensure_fastapi()
    app = _FastAPI()

    @app.get("/sre/snapshot")
    async def sre_snapshot() -> dict:
        policies = policy_provider.get_policies() if policy_provider else []
        sli_data = sli.to_dict() if sli else {}
        return {
            "policies": policies,
            "trustScores": [],  # populated in follow-on once agent eval history is wired
            "sli": sli_data,
            "asiCoverage": _ASI_COVERAGE,
        }

    return app


if __name__ == "__main__":
    import uvicorn
    app = create_sre_app()
    uvicorn.run(app, host="127.0.0.1", port=9377)
```

### Unit Tests

- `tests/test_rest_server.py`
  - `create_sre_app()` returns an application object when FastAPI is available
  - `GET /sre/snapshot` returns `{"policies": [], "trustScores": [], "sli": {}, "asiCoverage": {...}}` with no deps
  - `GET /sre/snapshot` `policies` reflects `policy_provider.get_policies()` mock return
  - `GET /sre/snapshot` `sli` reflects `sli.to_dict()` mock return
  - `asiCoverage["ASI-03"]["covered"]` is `True`; `"ASI-06"` key present
  - `create_sre_app()` raises `ImportError` (not `AttributeError`) when FastAPI not installed (mock)

---

## Phase 2: FailSafe Extension — SRE Template + Route

**Repo**: `MythologIQ/FailSafe` (extension)

### Affected Files

- `src/roadmap/routes/templates/SreTemplate.ts` — new: types + `fetchAgtSnapshot()` + template functions
- `src/roadmap/routes/SreRoute.ts` — new: `SreRouteDeps` + `SreRoute.render()` (≤5 lines)
- `src/roadmap/routes/index.ts` — export `SreRoute`
- `src/roadmap/ConsoleServer.ts` — register `GET /console/sre` in `registerConsoleExtras()`
- `src/test/roadmap/SreRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/routes/templates/SreTemplate.ts`** — new file:
```ts
import { escapeHtml } from "../../../shared/utils/htmlSanitizer";

export type AsiControl = { label: string; covered: boolean; feature: string };
export type AgtSreSnapshot = {
  policies: Array<{ name: string; type: string; enforced: boolean }>;
  trustScores: Array<{ agentId: string; stage: string; meshScore: number }>;
  sli: { name: string; target: number; currentValue: number | null; meetingTarget: boolean | null; totalDecisions: number };
  asiCoverage: Record<string, AsiControl>;
};
export type SreViewModel = { connected: boolean; snapshot: AgtSreSnapshot | null };

export async function fetchAgtSnapshot(baseUrl: string): Promise<SreViewModel> {
  try {
    const resp = await fetch(`${baseUrl}/sre/snapshot`);
    if (!resp.ok) throw new Error(`adapter ${resp.status}`);
    return { connected: true, snapshot: await resp.json() as AgtSreSnapshot };
  } catch {
    return { connected: false, snapshot: null };
  }
}

function buildSreDisconnectedHtml(): string {
  return `<!DOCTYPE html><html lang="en"><head><title>SRE — AGT</title>
<style>body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
.box{padding:16px;border:1px solid #c7d7f1;border-radius:8px;background:#fff;}
code{background:#edf4ff;padding:2px 6px;border-radius:4px;font-size:12px;}
a{color:#2c74f2;}</style></head><body>
<h1>SRE — AGT Governance View</h1><a href="/console/home">← Command Center</a>
<div class="box"><p><strong>AGT Adapter not connected.</strong></p>
<p>Start: <code>pip install "agent-failsafe[server]" &amp;&amp; python -m agent_failsafe.rest_server</code></p>
<p>Then reload this panel.</p></div></body></html>`;
}

function buildSreConnectedHtml(s: AgtSreSnapshot): string {
  const policyRows = s.policies.map(p =>
    `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.type)}</td>` +
    `<td class="${p.enforced ? "on" : "off"}">${p.enforced ? "Enforced" : "Inactive"}</td></tr>`
  ).join("") || "<tr><td colspan='3'>No policies loaded</td></tr>";
  const asiRows = Object.entries(s.asiCoverage).map(([id, c]) =>
    `<tr><td>${id}</td><td>${escapeHtml(c.label)}</td>` +
    `<td class="${c.covered ? "on" : "off"}">${c.covered ? "✓" : "–"}</td>` +
    `<td>${escapeHtml(c.feature)}</td></tr>`
  ).join("");
  const sliValue = s.sli.currentValue !== null ? `${(s.sli.currentValue * 100).toFixed(1)}%` : "—";
  const sliStatus = s.sli.meetingTarget === true ? "✓ Meeting target" : s.sli.meetingTarget === false ? "⚠ Below target" : "No data";
  return `<!DOCTYPE html><html lang="en"><head><title>SRE — AGT</title>
<style>body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
h2{font-size:13px;font-weight:700;margin:18px 0 8px;}
table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;}
th,td{padding:6px 10px;border:1px solid #c7d7f1;text-align:left;}th{background:#edf4ff;}
.on{color:#2c9e67;font-weight:700;}.off{color:#cb4c5b;}a{color:#2c74f2;}</style></head><body>
<h1>SRE — AGT Governance View</h1><a href="/console/home">← Command Center</a>
<h2>Active Policies</h2>
<table><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>${policyRows}</tbody></table>
<h2>Compliance SLI</h2>
<p>Rate: <strong>${sliValue}</strong> — ${sliStatus} (target: ${(s.sli.target * 100).toFixed(0)}%, decisions: ${s.sli.totalDecisions})</p>
<h2>OWASP ASI Coverage</h2>
<table><thead><tr><th>Control</th><th>Label</th><th>Status</th><th>Feature</th></tr></thead><tbody>${asiRows}</tbody></table>
</body></html>`;
}

export function buildSreHtml(model: SreViewModel): string {
  if (!model.connected) return buildSreDisconnectedHtml();
  return buildSreConnectedHtml(model.snapshot!);
}
```

**`src/roadmap/routes/SreRoute.ts`** — new file:
```ts
import { Request, Response } from "express";
import { fetchAgtSnapshot, buildSreHtml, type SreViewModel } from "./templates/SreTemplate";

export interface SreRouteDeps {
  getSnapshot: () => Promise<SreViewModel>;
}

export const SreRoute = {
  async render(req: Request, res: Response, deps: SreRouteDeps): Promise<void> {
    res.send(buildSreHtml(await deps.getSnapshot()));
  },
};

export { fetchAgtSnapshot };
```

**`src/roadmap/routes/index.ts`** — add:
```ts
export { SreRoute } from './SreRoute';
```

**`src/roadmap/ConsoleServer.ts`** — in `registerConsoleExtras()`, add before the `if (!this.permissionManager)` guard:
```ts
this.app.get("/console/sre", async (req: Request, res: Response) => {
  await SreRoute.render(req, res, {
    getSnapshot: () => fetchAgtSnapshot("http://127.0.0.1:9377"),
  });
});
```
Add to existing import: `import { ..., SreRoute, fetchAgtSnapshot } from "./routes";`

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts`
  - `buildSreHtml({ connected: false })` contains "AGT Adapter not connected"
  - `buildSreHtml({ connected: false })` contains install command string
  - `buildSreHtml({ connected: true, snapshot: mockSnapshot })` contains "Active Policies" heading
  - `buildSreHtml({ connected: true, snapshot: mockSnapshot })` contains "OWASP ASI Coverage" heading
  - policy `name` is HTML-escaped (XSS: `<script>` → `&lt;script&gt;`)
  - enforced policy row has class `on`; inactive has class `off`
  - `ASI-03` row contains `✓`; `ASI-06` row present with class `on`
  - `fetchAgtSnapshot` returns `{ connected: false }` when fetch throws

---

## Phase 3: FailSafe Extension — SRE API Proxy

**Repo**: `MythologIQ/FailSafe` (extension)

### Affected Files

- `src/roadmap/routes/SreApiRoute.ts` — new: `setupSreApiRoutes(app, deps)` — transparent JSON proxy
- `src/roadmap/ConsoleServer.ts` — call `setupSreApiRoutes` in `registerApiRoutes()`
- `src/test/roadmap/SreApiRoute.test.ts` — new unit tests

### Changes

**`src/roadmap/routes/SreApiRoute.ts`** — new file:
```ts
import type { Application, Request, Response } from "express";
import type { ApiRouteDeps } from "./types";
import { fetchAgtSnapshot } from "./SreRoute";

export function setupSreApiRoutes(
  app: Application,
  deps: Pick<ApiRouteDeps, "rejectIfRemote">,
): void {
  app.get("/api/v1/sre", async (req: Request, res: Response) => {
    if (deps.rejectIfRemote(req, res)) return;
    res.json(await fetchAgtSnapshot("http://127.0.0.1:9377"));
  });
}
```

**`src/roadmap/ConsoleServer.ts`** — in `registerApiRoutes()`, after existing `setupAgentApiRoutes(this.app, apiDeps)`:
```ts
setupSreApiRoutes(this.app, { rejectIfRemote: (req, res) => this.rejectIfRemote(req, res) });
```
Add import: `import { setupSreApiRoutes } from "./routes/SreApiRoute";`

### Unit Tests

- `src/test/roadmap/SreApiRoute.test.ts`
  - returns 403 for non-local requests
  - returns `{ connected: false, snapshot: null }` when adapter unreachable (mock `fetchAgtSnapshot`)
  - returns `{ connected: true, snapshot: {...} }` when adapter returns valid JSON (mock)

---

## Phase 4: Monitor Panel SRE Toggle

**Repo**: `MythologIQ/FailSafe` (extension)

### Affected Files

- `src/roadmap/FailSafeSidebarProvider.ts` — toggle pill + merge logic into existing `<script>` block
- `src/test/ui/compact-ui.spec.ts` — Playwright test for toggle presence

### Changes

**`src/roadmap/FailSafeSidebarProvider.ts`** — three edits to `getHtml()`:

**Edit 1** — add to existing `<style>` block:
```css
.sre-toggle { display:flex; gap:4px; padding:6px 8px; background:#0a1f4a;
              border-bottom:1px solid rgba(95,150,255,0.35); }
.sre-toggle button { flex:1; padding:4px 0; border:1px solid #3568d8;
                     border-radius:6px; background:#10357a; font-size:11px;
                     font-weight:600; cursor:pointer; color:#eaf1ff; }
.sre-toggle button[aria-selected="true"] { background:#2c74f2; border-color:#2c74f2; }
```

**Edit 2** — insert after `.toolbar` div, before `.frame-wrap` div; also add `id="main-frame"` to the existing `<iframe>`:
```html
<div class="sre-toggle" role="tablist" aria-label="View mode">
  <button id="btn-monitor" role="tab" aria-selected="true">Monitor</button>
  <button id="btn-sre"     role="tab" aria-selected="false">SRE</button>
</div>
```

**Edit 3** — append to the **existing** `<script nonce="${nonce}">` block, after the `window.addEventListener('message', ...)` handler. No new `<script>` tag. No new `acquireVsCodeApi()` call. `vscode` and `state` already declared above:
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

### Unit Tests

- `src/test/ui/compact-ui.spec.ts`
  - sidebar HTML contains `#btn-monitor` with `aria-selected="true"`
  - sidebar HTML contains `#btn-sre` with `aria-selected="false"`
  - `#main-frame` iframe element is present
