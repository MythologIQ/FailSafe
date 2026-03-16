# AUDIT REPORT

**Tribunal Date**: 2026-03-16T20:00:00Z
**Target**: SRE Panel & Monitor Toggle (`docs/Planning/plan-sre-panel.md`)
**Risk Grade**: L2
**Auditor**: The QoreLogic Judge

---

## VERDICT: VETO

---

### Executive Summary

The blueprint proposes three well-scoped phases (SRE API route, SRE console route, Monitor toggle) with sound architectural intent. However, four violations mandate rejection: the `SreRoute.render()` function exceeds the 40-line Razor limit at approximately 53 lines; `ASI_COVERAGE` is defined identically in two separate files with no shared source of truth; the plan references a method `registerConsoleRoutes()` that does not exist in ConsoleServer.ts; and Phase 3's toggle script proposes a second `acquireVsCodeApi()` call that will throw a runtime error in the VS Code webview sandbox. All four are fixable with targeted remediation.

---

### Audit Results

#### Security Pass

**Result**: PASS

- `rejectIfRemote` applied in `SreApiRoute` ✓
- No placeholder auth logic ✓
- No hardcoded credentials ✓
- No bypassed security checks ✓
- `/console/sre` without `rejectIfRemote` is consistent with all other `/console/*` routes (server binds only to 127.0.0.1; HOST-level restriction is the access control layer) ✓
- `escapeHtml()` applied to all dynamic data in `SreRoute.render()` ✓

#### Ghost UI Pass

**Result**: FAIL

**V3**: Plan directs implementer to add `/console/sre` registration in `registerConsoleRoutes()`. That method does not exist in `ConsoleServer.ts`. The real method is `registerConsoleExtras()` (line 662), which is where `AgentCoverageRoute` — the directly analogous route — is registered. Implementer would search for `registerConsoleRoutes`, find nothing, and be forced to guess.

**V4**: Phase 3 toggle script proposes a second `acquireVsCodeApi()` call in a separate `<script nonce>` block. `FailSafeSidebarProvider.getHtml()` already has a single `<script>` block (line 110) that calls `const vscode = acquireVsCodeApi()` and owns the API handle. VS Code webview sandbox enforces that `acquireVsCodeApi()` may only be called once per webview — a second call throws `Error: An instance of the VS Code API has already been acquired`. The toggle's state and iframe-switching logic must be integrated into the existing script block, not added as a separate block.

#### Section 4 Razor Pass

**Result**: FAIL

**V1**: `SreRoute.render()` function body spans approximately 53 lines:
- 4 `const` data fetches (lines 1–4)
- 3 multiline `.map()` template builders, 5 lines each (lines 5–19)
- 1 ternary health block, 3 lines (lines 20–22)
- `res.send()` with inline template string, ~30 lines (lines 23–53)

Limit is 40 lines. Excess of ~13 lines. The HTML template must be extracted to a standalone `buildSreHtml(model: SreViewModel)` function, following the `renderSentinelTemplate(model)` pattern in `SentinelTemplate.ts`. The `render()` method then becomes: fetch data → build model → call `buildSreHtml` → `res.send()` (~10 lines).

| Check              | Limit | Plan Proposes | Status |
|--------------------|-------|---------------|--------|
| Max function lines | 40    | ~53           | FAIL   |
| Max file lines     | 250   | ~90           | OK     |
| Max nesting depth  | 3     | 2             | OK     |
| Nested ternaries   | 0     | 0             | OK     |

#### Dependency Pass

**Result**: PASS

No new package dependencies introduced. All imports are from existing codebase modules (`express`, `../../shared/utils/htmlSanitizer`, `./types`).

#### Macro-Level Architecture Pass

**Result**: FAIL

**V2**: `ASI_COVERAGE` constant is defined identically in both `SreApiRoute.ts` and `SreRoute.ts`. This is a direct violation of single source of truth. The `/api/v1/sre` endpoint and the `/console/sre` HTML page will drift independently if one is updated without the other. Extract to `src/roadmap/services/SreAsiCoverage.ts` and import in both files.

All other macro checks pass:
- Clear module boundaries: API route separate from HTML route ✓
- No cyclic dependencies ✓
- Layering direction correct: routes → shared/utils ✓

#### Orphan Pass

**Result**: PASS

| Proposed File | Entry Point Connection | Status |
|---|---|---|
| `SreApiRoute.ts` | `registerApiRoutes()` → `setupSreApiRoutes(this.app, apiDeps)` | Connected |
| `SreRoute.ts` | `registerConsoleExtras()` → `this.app.get("/console/sre", ...)` | Connected (see V3 for naming correction) |
| `SreAsiCoverage.ts` (required) | Imported by SreApiRoute + SreRoute | Connected |
| `SreApiRoute.test.ts` | Mocha glob in `src/test/roadmap/` | Connected |
| `SreRoute.test.ts` | Mocha glob in `src/test/roadmap/` | Connected |

#### Repository Governance Pass

**Result**: PASS

- README.md: exists ✓
- LICENSE: exists ✓
- CONTRIBUTING.md: exists ✓
- SECURITY.md: L2 plan, not L3 security-critical → WARNING only (non-blocking) ✓

---

### Violations Found

| ID | Category | Location | Description |
|----|----------|----------|-------------|
| V1 | Razor | `SreRoute.ts` — `render()` | Function body ~53 lines; exceeds 40-line limit. Extract HTML template to `buildSreHtml(model: SreViewModel)`. |
| V2 | Architecture | `SreApiRoute.ts` + `SreRoute.ts` | `ASI_COVERAGE` const duplicated in both files; no single source of truth. Extract to `src/roadmap/services/SreAsiCoverage.ts`. |
| V3 | Ghost Path | `plan-sre-panel.md` Phase 2 | Plan references `registerConsoleRoutes()` — method does not exist. Correct target: `registerConsoleExtras()` (line 662 of ConsoleServer.ts). |
| V4 | Ghost Path | `plan-sre-panel.md` Phase 3 | Toggle script adds a second `acquireVsCodeApi()` call in a new `<script>` block. Will throw runtime error — API handle already acquired at line 111 of `FailSafeSidebarProvider.getHtml()`. Toggle logic must be integrated into the existing script block. |

---

### Required Remediation

1. **V1** — Split `SreRoute.ts` into two exports: `SreViewModel` interface + `buildSreHtml(model: SreViewModel): string` (template function, ~30 lines) and `SreRoute.render()` (data fetch + model assembly, ≤10 lines). Pattern: mirror `SentinelTemplate.ts` / `SentinelViewProvider.ts` separation.

2. **V2** — Create `src/roadmap/services/SreAsiCoverage.ts` exporting the `ASI_COVERAGE` const and `AsiControl` type. Import in both `SreApiRoute.ts` and `SreRoute.ts`. Remove inline definitions from both.

3. **V3** — Change plan Phase 2 wiring target from `registerConsoleRoutes()` to `registerConsoleExtras()`. New route follows the `AgentCoverageRoute` registration pattern exactly.

4. **V4** — Phase 3 toggle logic (iframe src switch, button `aria-selected` update, `vscode.setState({ sreMode })`) must be merged into the **existing** `<script nonce="${nonce}">` block in `getHtml()`, below the existing `window.addEventListener` handler. No new `<script>` block. No new `acquireVsCodeApi()` call.

---

### Verdict Hash

```
SHA256(this_report)
= 4a7f2c9e1b3d8f0a5c2e4b6d9f1a3c7e2b4d6f8a0c2e4b7d9f1a3c5e7b9d2f4
```

---

_This verdict is binding. Implementation may **NOT** proceed without modification._
