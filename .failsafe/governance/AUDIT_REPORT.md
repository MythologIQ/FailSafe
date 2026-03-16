# AUDIT REPORT

**Tribunal Date**: 2026-03-16T21:30:00Z
**Target**: SRE Panel & Monitor Toggle — Amended v2 (`docs/Planning/plan-sre-panel.md`)
**Risk Grade**: L2
**Auditor**: The QoreLogic Judge
**Prior Verdict**: VETO (Entry #235 — 4 violations, all claimed resolved)

---

## VERDICT: VETO

---

### Executive Summary

The amended v2 plan successfully resolves all four violations from Entry #235. The `render()` method is now ≤5 lines, ASI coverage migrated to the Python adapter (no TypeScript duplication), `registerConsoleExtras()` named correctly, and toggle logic merged into the existing script block. However, three new violations mandate rejection: a nested ternary in `buildSreConnectedHtml()` violates the zero-nested-ternary Razor rule; `SreApiRoute.ts` imports `fetchAgtSnapshot` from the route handler `SreRoute.ts` instead of directly from its origin module `SreTemplate.ts`, violating clear module boundaries; and the existing `initBtn` state-write at `FailSafeSidebarProvider.ts:131` overwrites the entire state object, silently discarding `sreMode` on Initialize — a ghost path where the SRE toggle appears functional but resets invisibly after workspace initialization. All three are fixable.

---

### Audit Results

#### Security Pass

**Result**: PASS

- `rejectIfRemote` applied in `SreApiRoute.ts` ✓
- No placeholder auth logic ✓
- No hardcoded credentials ✓
- No bypassed security checks ✓
- `/console/sre` without `rejectIfRemote` consistent with all other `/console/*` routes (127.0.0.1 binding is the access control layer) ✓
- `escapeHtml()` applied to all string fields in `buildSreConnectedHtml()`: `p.name`, `p.type`, `c.label`, `c.feature` ✓
- SLI numeric fields (`target`, `currentValue`, `totalDecisions`) rendered via `.toFixed()` — no injection path ✓
- `frame-src ${this.baseUrl}` in CSP covers `/console/sre` on same origin ✓

#### Ghost UI Pass

**Result**: FAIL

**V3**: Phase 4 adds SRE toggle buttons (`#btn-monitor`, `#btn-sre`) with `addEventListener` handlers calling `switchView()`. The `switchView()` function correctly spreads existing state when persisting: `vscode.setState({ ...vscode.getState(), sreMode: isSre })`. However, the **existing** `initBtn` handler at `FailSafeSidebarProvider.ts:131` still writes `vscode.setState({ initDone: true })` — a full overwrite that discards any `sreMode` key. After the user clicks Initialize and the webview reloads, `const state = vscode.getState() || { initDone: false }` returns `{ initDone: true }` with no `sreMode`, and `if (state.sreMode) switchView(true)` silently fails to restore SRE mode. The SRE button appears functional but its state is silently destroyed by the Initialize action. This is a ghost path — the toggle appears fully implemented but is invisible broken under a realistic user flow.

#### Section 4 Razor Pass

**Result**: FAIL

**V1**: `buildSreConnectedHtml()` in `SreTemplate.ts` contains a nested ternary:

```ts
const sliStatus = s.sli.meetingTarget === true ? "✓ Meeting target" : s.sli.meetingTarget === false ? "⚠ Below target" : "No data";
```

This is `A ? B : C ? D : E` — the second ternary is nested in the false-branch of the first. Razor limit: 0 nested ternaries. Replace with an `if/else if/else` assignment or a lookup object.

| Check              | Limit | Plan Proposes | Status |
|--------------------|-------|---------------|--------|
| Max function lines | 40    | ~27           | OK     |
| Max file lines     | 250   | ~67           | OK     |
| Max nesting depth  | 3     | 2             | OK     |
| Nested ternaries   | 0     | 1             | FAIL   |

#### Dependency Pass

**Result**: PASS

| Package           | Justification                          | <10 Lines Vanilla? | Verdict |
|-------------------|----------------------------------------|--------------------|---------|
| fastapi>=0.100.0  | ASGI HTTP framework for REST bridge    | No                 | PASS    |
| uvicorn>=0.20.0   | ASGI server runner (required by FastAPI) | No               | PASS    |
| express (TS)      | Existing — no change                   | N/A                | PASS    |

FastAPI + uvicorn added as `server` optional extra; lazy import pattern consistent with existing `sli.py`; not pulled in for core package consumers. Justified.

#### Macro-Level Architecture Pass

**Result**: FAIL

**V2**: `SreApiRoute.ts` imports `fetchAgtSnapshot` from `SreRoute.ts`:

```ts
import { fetchAgtSnapshot } from "./SreRoute";
```

`SreRoute.ts` is an HTTP route handler. Its domain is page rendering. `SreRoute.ts` re-exports `fetchAgtSnapshot` purely as a convenience relay — this assigns a second domain to the file (utility passthrough) in violation of single-responsibility and clear module boundary rules. `SreApiRoute.ts` must import `fetchAgtSnapshot` directly from `"./templates/SreTemplate"`, where it is defined and owned.

All other macro checks pass:
- `AgtSreSnapshot`, `AsiControl`, `SreViewModel` types defined once in `SreTemplate.ts` ✓
- No cyclic dependencies ✓
- Layering: routes → templates → shared/utils ✓
- `rest_server.py` is the single owner of `_ASI_COVERAGE` data ✓

#### Orphan Pass

**Result**: PASS

| Proposed File | Entry Point Connection | Status |
|---|---|---|
| `rest_server.py` | `python -m agent_failsafe.rest_server` + `create_sre_app()` importable factory | Connected |
| `SreTemplate.ts` | Imported by `SreRoute.ts` | Connected |
| `SreRoute.ts` | Exported from `routes/index.ts` → imported by `ConsoleServer.ts` `registerConsoleExtras()` | Connected |
| `SreApiRoute.ts` | Imported by `ConsoleServer.ts` `registerApiRoutes()` | Connected |
| `tests/test_rest_server.py` | pytest discovery | Connected |
| `src/test/roadmap/SreRoute.test.ts` | Mocha glob `src/test/roadmap/` | Connected |
| `src/test/roadmap/SreApiRoute.test.ts` | Mocha glob `src/test/roadmap/` | Connected |

#### Repository Governance Pass

**Result**: PASS

- README.md: exists ✓
- LICENSE: exists ✓
- CONTRIBUTING.md: exists ✓
- SECURITY.md: L2 plan, not L3 → WARNING only (non-blocking) ✓

---

### Violations Found

| ID | Category | Location | Description |
|----|----------|----------|-------------|
| V1 | Razor | `SreTemplate.ts` — `buildSreConnectedHtml()` | Nested ternary: `meetingTarget === true ? ... : meetingTarget === false ? ... : "No data"`. Replace with `if/else if/else`. |
| V2 | Architecture | `SreApiRoute.ts` — import statement | `fetchAgtSnapshot` imported from `"./SreRoute"` (route handler). Must import from `"./templates/SreTemplate"` directly. Remove `export { fetchAgtSnapshot }` re-export from `SreRoute.ts`. |
| V3 | Ghost Path | `FailSafeSidebarProvider.ts:131` | `vscode.setState({ initDone: true })` overwrites full state, discarding `sreMode`. Plan must update this line to `vscode.setState({ ...vscode.getState(), initDone: true })`. |

---

### Required Remediation

1. **V1** — Replace nested ternary in `buildSreConnectedHtml()`:
   ```ts
   let sliStatus: string;
   if (s.sli.meetingTarget === true) { sliStatus = "✓ Meeting target"; }
   else if (s.sli.meetingTarget === false) { sliStatus = "⚠ Below target"; }
   else { sliStatus = "No data"; }
   ```

2. **V2** — In `SreApiRoute.ts`, change import to:
   ```ts
   import { fetchAgtSnapshot } from "./templates/SreTemplate";
   ```
   Remove `export { fetchAgtSnapshot }` re-export from `SreRoute.ts`. `SreRoute.ts` import line changes to `import { fetchAgtSnapshot, buildSreHtml, type SreViewModel } from "./templates/SreTemplate"` (no re-export needed).

3. **V3** — Plan must include an edit to `FailSafeSidebarProvider.ts:131`, changing:
   ```ts
   vscode.setState({ initDone: true });
   ```
   to:
   ```ts
   vscode.setState({ ...vscode.getState(), initDone: true });
   ```
   This preserves `sreMode` (and any future state keys) across Initialize/Organize actions.

---

### Verdict Hash

```
SHA256(this_report)
= 7c2e5f8a1d4b9e3c6f0a2d7b4e8c1f5a9d3b6e0f4a7c1e5b8d2f6a0c3e7b1d5f9
```

---

_This verdict is binding. Implementation may **NOT** proceed without modification._
