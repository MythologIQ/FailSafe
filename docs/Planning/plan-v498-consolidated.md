# Plan: v4.9.8 — Error Budget Fix, Blocked Navigation, SRE Panel Expansion

**Current Version**: v4.9.7
**Target Version**: v4.9.8
**Change Type**: feature
**Risk Grade**: L2

## Open Questions

None — all items sourced from prior plans and diagnosed bugs.

---

## Phase 1: Error Budget — Exclude Resolved Verdicts

The error budget formula counts ALL recent verdicts including resolved VETOs. A VETO→PASS cycle (normal SHIELD governance) inflates the budget to 100% even when no active risk exists.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/roadmap.js` — filter resolved verdicts from budget calculation

### Changes

In `renderWorkspaceHealth()` at line 322, the verdict filters count raw decisions. Add resolution filtering: exclude any BLOCK/ESCALATE/QUARANTINE verdict that has a subsequent PASS verdict for the same `planId` or `checkpointType`.

```javascript
// Before: counts ALL severe/warn verdicts
const severeHits = verdicts.filter(v => ['BLOCK','ESCALATE','QUARANTINE'].includes(String(v.decision || ''))).length;
const warnHits = verdicts.filter(v => String(v.decision || '') === 'WARN').length;

// After: exclude resolved verdicts (VETO followed by PASS on same plan)
const resolvedPlanIds = new Set(
  verdicts.filter(v => String(v.decision || '') === 'PASS' && v.planId)
    .map(v => v.planId)
);
const unresolvedVerdicts = verdicts.filter(v => !resolvedPlanIds.has(v.planId));
const severeHits = unresolvedVerdicts.filter(v => ['BLOCK','ESCALATE','QUARANTINE'].includes(String(v.decision || ''))).length;
const warnHits = unresolvedVerdicts.filter(v => String(v.decision || '') === 'WARN').length;
```

Also update the help text in the `errorbudget` tooltip (~line 533) to clarify that resolved verdicts are excluded.

### Unit Tests

- `src/test/roadmap/roadmap-health.test.ts` (new) — test error budget calculation:
  - `resolved VETO does not burn error budget` — BLOCK + subsequent PASS on same planId → severeHits = 0
  - `unresolved VETO burns error budget` — BLOCK without PASS → severeHits = 1
  - `mixed resolved and unresolved` — 3 BLOCKs, 2 PASSed → severeHits = 1

---

## Phase 2: Extract Sentinel Monitor (D33 Prerequisite)

`roadmap.js` is at 632 lines (2.5x over 250L limit). Extract sentinel/monitor rendering into a separate module before adding more code.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/sentinel-monitor.js` — **NEW**: extracted from roadmap.js
- `FailSafe/extension/src/roadmap/ui/roadmap.js` — import and delegate to sentinel-monitor.js

### Changes

Extract from `roadmap.js` into `sentinel-monitor.js`:
- `renderWorkspaceHealth()` method (~40 lines, lines 311-348)
- `buildPolicyTrend()` method (~15 lines)
- `renderSentinelStatus()` method (~30 lines)
- `metricColor()` helper (~5 lines)
- `showMetricHelp()` and help text definitions (~40 lines, lines 520-545)

The `SentinelMonitor` class receives the DOM element references and hub data, renders independently. `roadmap.js` instantiates it and delegates.

Target: `roadmap.js` drops to ~500 lines, `sentinel-monitor.js` ~130 lines. Both under 250L individually is not achievable in one phase given roadmap.js's other responsibilities, but this extraction removes the largest single-domain block.

### Unit Tests

- No separate test file — sentinel-monitor is UI rendering, validated by existing Playwright tests

---

## Phase 3: Clickable Blocked Navigation (B185)

Wire blocked-message links to navigate directly to the relevant audit log entry in the Command Center.

### Affected Files

- `FailSafe/extension/src/roadmap/ui/modules/sentinel-monitor.js` — add click handlers to blocker/risk indicators
- `FailSafe/extension/src/roadmap/ui/roadmap.js` — wire navigation callback

### Changes

When blocker count or error budget gauge is clicked, open Command Center at `#governance` with the relevant audit entry highlighted. The navigation uses the existing `window.open('/command-center.html#governance', '_blank')` pattern already established in `sentinelAlert.onclick` (roadmap.js line 307).

---

## Phase 4: SRE Type Extraction + v2 Schema (B178)

From the gate-cleared SRE Panel Expansion plan (Entry #245).

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTypes.ts` — **NEW**: all SRE type definitions
- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — import from SreTypes, remove type defs
- `FailSafe/extension/src/roadmap/services/AdapterTypes.ts` — add `adapterBaseUrl` to `AdapterConfig`
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — read base URL from config
- `FailSafe/extension/src/roadmap/ConsoleServer.ts` — pass config to SRE route
- `FailSafe/extension/src/test/roadmap/SreRoute.test.ts` — update imports

### Changes

Extract `AsiControl`, `AgtSreSnapshot`, `SreViewModel` to `SreTypes.ts`. Add v2 types: `TrustDimension`, `TrustScore`, `AuditEvent`, `SliMetric`, `FleetAgent`. All v2 fields optional for backward compat.

Add `adapterBaseUrl?: string` to `AdapterConfig`. Wire into SRE routes replacing hardcoded `"http://127.0.0.1:9377"`.

---

## Phase 5: Activity Feed (B179)

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — add `buildAuditFeedHtml` section builder
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — add `GET /api/v1/sre/events` endpoint

### Changes

Add `buildAuditFeedHtml(events: AuditEvent[])` (~20 lines). Renders recent audit events as scrollable list with ALLOW/DENY/AUDIT badges. Conditionally rendered when adapter provides event data.

Add proxy endpoint `GET /api/v1/sre/events` to `SreApiRoute.ts`.

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts` — add:
  - `buildAuditFeedHtml renders ALLOW/DENY badges`
  - `buildAuditFeedHtml omits section when events empty`

---

## Phase 6: SLO Dashboard + Fleet Health (B180)

### Affected Files

- `FailSafe/extension/src/roadmap/routes/templates/SreTemplate.ts` — add `buildSliDashboardHtml`, `buildFleetHtml`
- `FailSafe/extension/src/roadmap/routes/SreApiRoute.ts` — add `GET /api/v1/sre/fleet` endpoint

### Changes

Add `buildSliDashboardHtml(slis: SliMetric[])` (~25 lines). Grid of SLI meters with error budget gauges. Falls back to single `buildSliHtml` when `slis` absent.

Add `buildFleetHtml(fleet: FleetAgent[])` (~25 lines). Per-agent cards with status, circuit breaker state, task count, success rate.

### Unit Tests

- `src/test/roadmap/SreRoute.test.ts` — add:
  - `buildSliDashboardHtml renders 7 SLI types`
  - `buildFleetHtml renders circuit breaker state badges`
  - `falls back to single SLI when slis absent`

---

## Summary

| Phase | Scope | Backlog | File Budget |
|-------|-------|---------|-------------|
| 1 | Error budget — exclude resolved verdicts | B187 | roadmap.js (fix in-place) |
| 2 | Extract sentinel-monitor.js from roadmap.js | B186/D33 | sentinel-monitor.js: ~130L, roadmap.js: ~500L |
| 3 | Clickable blocked navigation | B185 | sentinel-monitor.js: ~140L |
| 4 | SRE type extraction + v2 schema | B178/D30 | SreTypes.ts: ~60L, SreTemplate.ts: ~100L |
| 5 | Activity Feed | B179 | SreTemplate.ts: ~120L |
| 6 | SLO Dashboard + Fleet Health | B180 | SreTemplate.ts: ~170L |
