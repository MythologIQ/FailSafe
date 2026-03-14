# Plan: Command Center Production Readiness

**Current Version**: v4.9.2
**Target Version**: v4.9.3
**Change Type**: hotfix
**Risk Grade**: L2

## Open Questions

1. **Monitor Qore runtime section**: `roadmap.js` implements a full Qore runtime card (lines 373-392) but `index.html` has no HTML containers. Is this planned UI or dead code? **Recommendation**: Remove dead JS — Qore data already in Command Center overview.
2. **Monitor transparency/risk streams**: `roadmap.js` has `fetchTransparency()` and `fetchRisks()` (lines 652-746) targeting elements that don't exist in `index.html`. **Recommendation**: Remove dead JS — these belong in Command Center only.
3. **Dual transparency write**: Both ConsoleServer and TransparencyPanel write to `transparency.jsonl` without coordination. **Recommendation**: Single writer (ConsoleServer), TransparencyPanel reads only.

## Phase 1: Fix Disconnected Hub Data

Align Command Center renderers with actual `buildHubSnapshot()` output. Fix phantom data fields (rendered but never sent) and add missing fields.

### Affected Files

- `src/roadmap/ConsoleServer.ts` — Add `chainValid`, `risks` to hub snapshot
- `src/roadmap/ui/modules/overview.js` — Fix `checkpoints` → `recentCheckpoints` field name
- `src/roadmap/ui/modules/operations.js` — Fix `checkpoints` → `recentCheckpoints` field name
- `src/roadmap/ui/modules/risks.js` — Fix `risks` consumption to handle both `risks` array and `riskSummary`
- `src/roadmap/ui/roadmap.js` — Remove dead code for missing Monitor elements (Qore runtime card, transparency stream, risk stream, verify-integrity button)

### Changes

**1a. Add missing fields to `buildHubSnapshot()`**

In `ConsoleServer.ts`, add to the return object:

```typescript
chainValid: this.cachedChainValid ?? null,
risks: this.getRiskRegister(),
```

**1b. Fix Overview renderer field name**

In `overview.js`, change `hubData.checkpoints` references to `hubData.recentCheckpoints`. The server sends an array via `getRecentCheckpoints(12)`, not an object. Adapt the renderer to handle array input:

```javascript
const checkpoints = hubData.recentCheckpoints || [];
// Already sorted by timestamp from server
const recent = checkpoints.slice(0, 8);
```

**1c. Fix Operations renderer field name**

Same pattern — `hubData.checkpoints` → `hubData.recentCheckpoints`.

**1d. Fix Risks renderer**

`RisksRenderer.render()` should consume `hubData.risks` (now sent by server). The server returns the risk register array from `.failsafe/risks/risks.json`.

**1e. Remove dead Monitor code**

In `roadmap.js`, remove:
- Lines referencing `qore-runtime-state`, `qore-policy-version`, `qore-runtime-endpoint`, `qore-runtime-latency`, `qore-runtime-check` (5 orphaned element refs)
- `fetchTransparency()` method and its call in `DOMContentLoaded`
- `fetchRisks()` method and its call in `DOMContentLoaded`
- `renderTransparency()` method
- `renderRisks()` method
- `verify-integrity-btn` click handler
- `transparency-refresh` / `risk-refresh` click handlers

These features belong in the Command Center, not the Monitor.

### Unit Tests

- `src/test/roadmap/ConsoleServer.test.ts` — Verify `buildHubSnapshot()` includes `chainValid` and `risks` fields
- `src/test/ui/user-stories.spec.ts` — Update any hub data fixtures to match new field names

## Phase 2: Wire B142/B143/B144 into Command Center

Expose AgentTimelineService, AgentHealthIndicator, and ShadowGenomeManager data through the ConsoleServer API and render in Command Center modules.

### Affected Files

- `src/roadmap/ConsoleServer.ts` — Accept timeline service and health indicator; add 3 API endpoints; include health in hub snapshot
- `src/extension/bootstrapServers.ts` — Pass `agentTimelineService` and `agentHealthIndicator` to ConsoleServer
- `src/roadmap/ui/command-center.html` — Add Timeline and Genome tabs
- `src/roadmap/ui/modules/timeline.js` — NEW (~120 lines)
- `src/roadmap/ui/modules/genome.js` — NEW (~100 lines)
- `src/roadmap/ui/modules/overview.js` — Add health indicator card
- `src/roadmap/ui/command-center.js` — Register new renderers and tabs

### Changes

**2a. Wire services to ConsoleServer**

Add setter methods (matches existing pattern for `setIdeTracker`, `setSystemRegistry`):

```typescript
setAgentTimelineService(service: AgentTimelineService): void {
  this.agentTimelineService = service;
}
setAgentHealthIndicator(indicator: AgentHealthIndicator): void {
  this.agentHealthIndicator = indicator;
}
```

In `bootstrapServers.ts`, after ConsoleServer creation:
```typescript
consoleServer.setAgentTimelineService(agentTimelineService);
consoleServer.setAgentHealthIndicator(agentHealthIndicator);
```

**2b. Add API endpoints**

Three new routes in ConsoleServer route setup:

```typescript
app.get("/api/v1/timeline", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const entries = this.agentTimelineService?.getEntries(limit) || [];
  res.json({ entries });
});

app.get("/api/v1/health", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const metrics = this.agentHealthIndicator?.getMetrics() || null;
  res.json({ metrics });
});

app.get("/api/v1/genome", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const manager = this.qorelogicManager.getShadowGenomeManager();
  const patterns = manager.getFailurePatterns();
  const unresolved = manager.getUnresolvedEntries();
  res.json({ patterns, unresolved });
});
```

**2c. Add health metrics to hub snapshot**

In `buildHubSnapshot()` return object:

```typescript
agentHealth: this.agentHealthIndicator?.getMetrics() || null,
```

**2d. Expose `getEntries()` on AgentTimelineService**

Add a public method that returns the internal entries array (bounded, already exists as private). If the service stores entries in an array internally, expose a read-only slice:

```typescript
getEntries(limit: number = 100): TimelineEntry[] {
  return this.entries.slice(0, limit);
}
```

**2e. Expose `getMetrics()` on AgentHealthIndicator**

Add a public method returning the current health state:

```typescript
getMetrics(): HealthMetrics {
  return { level: this.level, ...this.currentMetrics };
}
```

**2f. Create `timeline.js` module**

New Command Center module (~120 lines). Renders:
- Category filter bar (All, Verdict, Trust, Approval, DiffGuard)
- Severity toggle (Info, Warning, Error)
- Timeline entries as a scrollable list with timestamp, category badge, summary
- Fetches from `/api/v1/timeline` on tab activation

```javascript
export class TimelineRenderer {
  constructor(containerId) { this.container = document.getElementById(containerId); }

  async render() {
    const res = await fetch('/api/v1/timeline?limit=200');
    const { entries } = await res.json();
    // Render filter bar + entry list
  }
}
```

**2g. Create `genome.js` module**

New Command Center module (~100 lines). Renders:
- Failure pattern cards (agent, frequency, last seen)
- Unresolved entries table with status
- Negative constraints per agent

```javascript
export class GenomeRenderer {
  constructor(containerId) { this.container = document.getElementById(containerId); }

  async render() {
    const res = await fetch('/api/v1/genome');
    const { patterns, unresolved } = await res.json();
    // Render pattern cards + unresolved table
  }
}
```

**2h. Add health card to Overview**

In `overview.js`, add a 4th card to the top grid:

```javascript
// Agent Health card
const health = hubData.agentHealth;
const healthLevel = health?.level || 'healthy';
const healthColor = { healthy: 'var(--accent-green)', elevated: 'var(--accent-yellow)',
  warning: 'var(--accent-orange)', critical: 'var(--accent-red)' }[healthLevel];
```

Displays: health level, open critical/high risks, avg trust score.

**2i. Add tabs to `command-center.html`**

Add two sidebar nav items after existing tabs:

```html
<button class="tab-btn" data-target="timeline">Timeline</button>
<button class="tab-btn" data-target="genome">Genome</button>
```

Add corresponding tab panels:

```html
<div id="timeline" class="tab-panel"></div>
<div id="genome" class="tab-panel"></div>
```

Add script imports:

```html
<script type="module" src="/modules/timeline.js"></script>
<script type="module" src="/modules/genome.js"></script>
```

**2j. Register renderers in `command-center.js`**

Import and instantiate `TimelineRenderer` and `GenomeRenderer`. Add to the renderers object. Wire tab switching.

### Unit Tests

- `src/test/roadmap/ConsoleServer.test.ts` — Verify `/api/v1/timeline`, `/api/v1/health`, `/api/v1/genome` return expected shapes
- `src/test/roadmap/AgentTimelineService.test.ts` — Verify `getEntries()` returns bounded array
- `src/test/roadmap/AgentHealthIndicator.test.ts` — Verify `getMetrics()` returns current state

## Phase 3: Fix Transparency Pipeline

Wire sentinel verdicts, governance decisions, and L3 events into the transparency audit stream. Fix dual-write race condition. Make the Audit tab show meaningful data.

### Affected Files

- `src/roadmap/ConsoleServer.ts` — Route sentinel/governance/L3 events to transparency log
- `src/genesis/panels/TransparencyPanel.ts` — Remove file writes (read-only consumer)
- `src/shared/types/events.ts` — Add `transparency.prompt` to `FailSafeEventType` union

### Changes

**3a. Route all governance events to transparency log**

In ConsoleServer event subscriptions, add transparency logging for sentinel verdicts, L3 events, and governance events. These already have EventBus listeners — just add `logTransparencyEvent()` calls:

For `sentinel.verdict` handler (existing at line 634):
```typescript
this.logTransparencyEvent({
  type: 'sentinel.verdict',
  decision: (event as any).decision,
  riskGrade: (event as any).riskGrade,
  filePath: (event as any).filePath,
  timestamp: new Date().toISOString(),
});
```

For `qorelogic.l3Queued` handler (existing at line 651):
```typescript
this.logTransparencyEvent({
  type: 'governance.l3Queued',
  ...event as Record<string, unknown>,
  timestamp: new Date().toISOString(),
});
```

For `qorelogic.l3Decided` handler (existing at line 659):
```typescript
this.logTransparencyEvent({
  type: 'governance.l3Decided',
  ...event as Record<string, unknown>,
  timestamp: new Date().toISOString(),
});
```

**3b. Fix dual-write race condition**

In `TransparencyPanel.ts`, remove `TransparencyLogger.log()` calls. The panel should only READ from the file (via `readRecentEvents()`) and receive live events via EventBus subscription. ConsoleServer is the single writer.

**3c. Add event type to FailSafeEventType**

In `events.ts`, add `"transparency.prompt"` to the union type. Remove `as never` casts from PromptTransparency.ts and ConsoleServer.ts.

**3d. Broadcast sentinel/governance events to Command Center**

The existing `broadcast({ type: "transparency", payload: event })` call (line 644) should also be called for sentinel and L3 events so the TransparencyRenderer in the Command Center receives them in real-time.

### Unit Tests

- `src/test/roadmap/TransparencyPipeline.test.ts` — NEW (~60 lines). Verify:
  - Sentinel verdict events reach transparency log
  - L3 queue/decide events reach transparency log
  - Events have required fields (type, timestamp)
  - Duplicate writes prevented (only ConsoleServer writes)

## Phase 4: Wire B146/B150 — Agent Run Replay & Governance Decisions

Expose AgentRunRecorder data and GovernanceDecision contracts through the ConsoleServer API and render in Command Center. Currently these are VS Code WebView-only (`AgentRunReplayPanel`, `failsafe.showRunReplay` command) with zero browser integration.

### Affected Files

- `src/roadmap/ConsoleServer.ts` — Accept AgentRunRecorder; add 3 API endpoints for runs
- `src/extension/bootstrapServers.ts` — Pass `agentRunRecorder` to ConsoleServer
- `src/roadmap/ui/command-center.html` — Add Replay tab
- `src/roadmap/ui/modules/replay.js` — NEW (~150 lines)
- `src/roadmap/ui/command-center.js` — Register ReplayRenderer

### Changes

**4a. Wire AgentRunRecorder to ConsoleServer**

Add setter method (matches existing pattern):

```typescript
setAgentRunRecorder(recorder: AgentRunRecorder): void {
  this.agentRunRecorder = recorder;
}
```

In `bootstrapServers.ts`, after ConsoleServer creation:
```typescript
consoleServer.setAgentRunRecorder(agentRunRecorder);
```

**4b. Add API endpoints**

Three new routes:

```typescript
app.get("/api/v1/runs", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const active = this.agentRunRecorder?.getActiveRuns() || [];
  const completed = this.agentRunRecorder?.getCompletedRuns() || [];
  res.json({ active, completed });
});

app.get("/api/v1/runs/:runId", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const run = this.agentRunRecorder?.getRun(req.params.runId)
    ?? this.agentRunRecorder?.loadRun(req.params.runId);
  if (!run) { res.status(404).json({ error: "Run not found" }); return; }
  res.json({ run });
});

app.get("/api/v1/runs/:runId/steps", (req, res) => {
  if (this.rejectIfRemote(req, res)) return;
  const steps = this.agentRunRecorder?.getRunSteps(req.params.runId) || [];
  res.json({ steps });
});
```

**4c. Create `replay.js` module**

New Command Center module (~150 lines). Renders:
- Run list: active runs (with pulsing indicator) and recent completed runs
- Run detail view: step-by-step timeline with governance decision cards
- Step cards show: seq, kind badge (color-coded), title, timestamp, diff stats if present
- GovernanceDecision cards show: action badge (ALLOW/BLOCK/MODIFY/ESCALATE/QUARANTINE), risk category, mitigation, confidence score
- Click a run → fetches `/api/v1/runs/:runId` → renders step timeline

```javascript
export class ReplayRenderer {
  constructor(containerId) { this.container = document.getElementById(containerId); }

  async render() {
    const res = await fetch('/api/v1/runs');
    const { active, completed } = await res.json();
    // Render run list + detail panel
  }

  async renderRun(runId) {
    const res = await fetch(`/api/v1/runs/${runId}`);
    const { run } = await res.json();
    // Render step timeline with governance decision cards
  }
}
```

**4d. Add Replay tab to `command-center.html`**

```html
<button class="tab-btn" data-target="replay">Replay</button>
<div id="replay" class="tab-panel"></div>
<script type="module" src="/modules/replay.js"></script>
```

**4e. Register renderer in `command-center.js`**

Import and instantiate `ReplayRenderer`. Add to renderers object. Wire tab switching.

**4f. Broadcast run events to Command Center**

In ConsoleServer event subscriptions, broadcast run lifecycle events so the ReplayRenderer can update in real-time:

```typescript
this.eventBus.on("agentRun.started", (event) => {
  this.broadcast({ type: "agentRun", payload: { action: "started", ...event } });
});
this.eventBus.on("agentRun.completed", (event) => {
  this.broadcast({ type: "agentRun", payload: { action: "completed", ...event } });
});
this.eventBus.on("agentRun.stepRecorded", (event) => {
  this.broadcast({ type: "agentRun", payload: { action: "step", ...event } });
});
```

### Unit Tests

- `src/test/roadmap/ConsoleServer.test.ts` — Verify `/api/v1/runs`, `/api/v1/runs/:id`, `/api/v1/runs/:id/steps` return expected shapes
- `src/test/roadmap/AgentRunRecorder.test.ts` — Verify `getActiveRuns()`, `getCompletedRuns()`, `getRun()` return bounded arrays

## Summary

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/roadmap/ConsoleServer.ts` | EDIT | +65 (endpoints, hub fields, event routing, run APIs) |
| `src/extension/bootstrapServers.ts` | EDIT | +3 (wire services) |
| `src/roadmap/ui/modules/overview.js` | EDIT | +15 (health card, fix checkpoints field) |
| `src/roadmap/ui/modules/operations.js` | EDIT | ~3 (fix checkpoints field) |
| `src/roadmap/ui/modules/risks.js` | EDIT | ~5 (fix risks consumption) |
| `src/roadmap/ui/modules/timeline.js` | NEW | ~120 |
| `src/roadmap/ui/modules/genome.js` | NEW | ~100 |
| `src/roadmap/ui/modules/replay.js` | NEW | ~150 |
| `src/roadmap/ui/command-center.html` | EDIT | +12 (3 tabs, 3 panels, 3 imports) |
| `src/roadmap/ui/command-center.js` | EDIT | +15 (register 3 renderers) |
| `src/roadmap/ui/roadmap.js` | EDIT | -80 (remove dead code) |
| `src/genesis/panels/TransparencyPanel.ts` | EDIT | -5 (remove writes) |
| `src/shared/types/events.ts` | EDIT | +1 (add event type) |
| `src/sentinel/AgentTimelineService.ts` | EDIT | +4 (expose getEntries) |
| `src/sentinel/AgentHealthIndicator.ts` | EDIT | +4 (expose getMetrics) |
| `src/test/roadmap/ConsoleServer.test.ts` | EDIT | +50 |
| `src/test/roadmap/TransparencyPipeline.test.ts` | NEW | ~60 |
