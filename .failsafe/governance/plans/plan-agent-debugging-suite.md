# Plan: Agent Debugging & Stability Monitoring Suite (B142, B143, B144)

**Current Version**: v4.7.2
**Target Version**: v4.8.0
**Change Type**: feature
**Risk Grade**: L2

## Open Questions

1. **B143 status bar placement**: GovernanceStatusBar uses `StatusBarAlignment.Left, priority 100`. Should the new risk indicator be a second status bar item (Right-aligned?) or extend the existing one? Initial answer: separate item, Right-aligned — governance intent (left) and risk health (right) are independent concerns.

2. **B142 timeline event limit**: EventBus stores 1000 events. Should the timeline show all history or only current-session events? Initial answer: current session only (since last extension activation), with a "Load More" option to query SQLite ledger for historical data.

3. **B144 remediation workflow**: `updateRemediationStatus()` exists on ShadowGenomeManager. Should the panel allow inline remediation status updates (mark resolved, add notes)? Initial answer: yes — simple status toggle + notes field.

## Phase 1: Risk & Stability Indicators (B143)

### Affected Files

- `FailSafe/extension/src/sentinel/AgentHealthIndicator.ts` — NEW: Status bar item showing live risk composite score
- `FailSafe/extension/src/extension/bootstrapSentinel.ts` — MODIFY: instantiate AgentHealthIndicator
- `FailSafe/extension/src/shared/types/events.ts` — ADD: `sentinel.healthUpdate` event type
- `FailSafe/extension/package.json` — ADD: `failsafe.showAgentHealth` command

### Changes

#### `AgentHealthIndicator.ts` — Live status bar risk meter

- Implements `vscode.Disposable`
- Creates `vscode.window.createStatusBarItem(StatusBarAlignment.Right, 100)`
- Subscribes to EventBus events: `sentinel.verdict`, `qorelogic.trustUpdate`, `qorelogic.agentQuarantined`, `qorelogic.agentReleased`
- On each event, recalculates composite health from:
  1. `RiskManager.getSummary()` → openCritical, openHigh counts
  2. `TrustEngine.getAllAgents()` → average trust score, quarantine count
  3. `SentinelDaemon.getStatus()` → queueDepth, eventsProcessed
- Composite health score: `HealthLevel = 'healthy' | 'elevated' | 'warning' | 'critical'`
- Display format: `$(shield) FS: Healthy` / `$(warning) FS: 2 Risks` / `$(error) FS: Critical`
- Color mapping via `ThemeColor`: green/yellow/orange/red
- Tooltip: multi-line summary (open risks, trust avg, quarantined agents, queue depth)
- Click action: opens risk register command (`failsafe.openRiskRegister`)
- Debounced refresh (500ms) to avoid flicker on rapid events

```typescript
interface HealthSnapshot {
  level: HealthLevel;
  openCritical: number;
  openHigh: number;
  avgTrust: number;
  quarantinedCount: number;
  queueDepth: number;
}

type HealthLevel = 'healthy' | 'elevated' | 'warning' | 'critical';
```

Health calculation rules:
- `critical`: openCritical > 0 OR quarantinedCount > 0
- `warning`: openHigh > 0 OR avgTrust < 0.4
- `elevated`: openHigh > 0 OR queueDepth > 3
- `healthy`: all clear

#### `bootstrapSentinel.ts` modifications

After DiffGuardService construction, create AgentHealthIndicator:

```typescript
const agentHealthIndicator = new AgentHealthIndicator(
  core.eventBus,
  sentinel.sentinelDaemon,
  qore.riskManager,
  qore.trustEngine,
);
context.subscriptions.push(agentHealthIndicator);
```

#### Event type addition

Add `sentinel.healthUpdate` to `FailSafeEventType` — emitted by AgentHealthIndicator when health level changes (for other subscribers like Timeline).

### Unit Tests

- `FailSafe/extension/src/test/sentinel/AgentHealthIndicator.test.ts`
  - Returns `healthy` when no risks, high trust, empty queue
  - Returns `critical` when openCritical > 0
  - Returns `critical` when quarantinedCount > 0
  - Returns `warning` when avgTrust < 0.4
  - Returns `elevated` when queueDepth > 3
  - Debounces rapid updates (only refreshes once per 500ms window)
  - Formats tooltip correctly with multi-line summary

## Phase 2: Agent Execution Timeline (B142)

### Affected Files

- `FailSafe/extension/src/genesis/panels/AgentTimelinePanel.ts` — NEW: Singleton webview panel showing event timeline
- `FailSafe/extension/src/sentinel/AgentTimelineService.ts` — NEW: Aggregates EventBus events into timeline entries
- `FailSafe/extension/src/sentinel/diffguard/types.ts` — no changes (reuses existing types)
- `FailSafe/extension/src/shared/types/events.ts` — ADD: `timeline.entryAdded` event type
- `FailSafe/extension/src/extension/bootstrapGenesis.ts` — MODIFY: register `failsafe.showTimeline` command
- `FailSafe/extension/package.json` — ADD: `failsafe.showTimeline` command

### Changes

#### `AgentTimelineService.ts` — Event aggregation service

- Subscribes to all relevant EventBus events via `onAll()`
- Filters and maps events to `TimelineEntry` format
- Maintains in-memory array of entries (bounded to 500)
- Categorizes events into timeline groups:

```typescript
interface TimelineEntry {
  id: string;
  timestamp: string;
  category: 'verdict' | 'trust' | 'file' | 'plan' | 'approval' | 'diffguard';
  title: string;         // Short label: "Verdict: PASS (foo.ts)"
  detail: string;        // Extended detail
  icon: string;          // Codicon name
  severity: 'info' | 'success' | 'warning' | 'error';
  agentDid?: string;
  artifactPath?: string;
}
```

Event mapping table:

| EventBus Event | Category | Title Pattern | Severity |
|---|---|---|---|
| `sentinel.verdict` | `verdict` | `Verdict: {decision} ({artifact})` | decision-based |
| `qorelogic.trustUpdate` | `trust` | `Trust: {did} → {score}` | score-based |
| `qorelogic.agentQuarantined` | `trust` | `Quarantined: {did}` | `error` |
| `qorelogic.agentReleased` | `trust` | `Released: {did}` | `success` |
| `qorelogic.l3Queued` | `approval` | `L3 Queued: {artifact}` | `warning` |
| `diffguard.analysisReady` | `diffguard` | `DiffGuard: {file} ({risk})` | risk-based |
| `diffguard.approved` | `diffguard` | `DiffGuard Approved: {file}` | `success` |
| `diffguard.rejected` | `diffguard` | `DiffGuard Rejected: {file}` | `error` |
| `sentinel.healthUpdate` | `verdict` | `Health: {level}` | level-based |

- `getEntries(filter?: TimelineFilter): TimelineEntry[]` — returns filtered + sorted entries
- `getEntriesSince(seq: number): TimelineEntry[]` — for incremental panel updates

```typescript
interface TimelineFilter {
  categories?: TimelineEntry['category'][];
  severity?: TimelineEntry['severity'][];
  agentDid?: string;
  since?: string;  // ISO timestamp
}
```

#### `AgentTimelinePanel.ts` — Timeline webview

- Singleton pattern: `static currentPanel`, `static createOrShow(extensionUri, eventBus, timelineService)`
- Subscribes to `timeline.entryAdded` event for real-time updates
- Renders vertical timeline with:
  - Category filter tabs (All | Verdicts | Trust | Files | Approvals | DiffGuard)
  - Severity filter (toggleable: info/success/warning/error)
  - Agent filter dropdown (from unique agentDids in entries)
  - Timeline items: icon + timestamp + title + expandable detail
  - Color coding by severity (green/blue/yellow/red using VS Code theme vars)
  - Relative timestamps ("2m ago", "1h ago") with full ISO on hover
- Webview messages:
  - `filter` → update displayed entries
  - `viewFile` → open artifact in editor
  - `refresh` → pull latest entries
  - `clear` → reset timeline view (not data)
- CSP: nonce-based, same pattern as DiffGuardPanel
- Max rendered entries: 200 (virtual scroll not needed at this scale)

#### Bootstrap + package.json wiring

Register command in `bootstrapGenesis.ts`:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('failsafe.showTimeline', () => {
    AgentTimelinePanel.createOrShow(
      context.extensionUri,
      core.eventBus,
      sentinel.agentTimelineService,
    );
  })
);
```

Add to `package.json` commands:
```json
{
  "command": "failsafe.showTimeline",
  "title": "FailSafe: Agent Execution Timeline",
  "category": "FailSafe"
}
```

### Unit Tests

- `FailSafe/extension/src/test/sentinel/AgentTimelineService.test.ts`
  - Maps `sentinel.verdict` event to timeline entry with correct category/severity
  - Maps `qorelogic.trustUpdate` to trust category entry
  - Maps `qorelogic.agentQuarantined` to error severity
  - Filters entries by category
  - Filters entries by severity
  - Filters entries by agentDid
  - Bounds entry array to 500 maximum
  - Returns entries sorted by timestamp descending

## Phase 3: Shadow Genome Debugging Panel (B144)

### Affected Files

- `FailSafe/extension/src/genesis/panels/ShadowGenomePanel.ts` — NEW: Singleton webview panel showing failure patterns
- `FailSafe/extension/src/extension/bootstrapGenesis.ts` — MODIFY: register `failsafe.showShadowGenome` command
- `FailSafe/extension/src/shared/types/events.ts` — ADD: `genome.failureArchived` event type
- `FailSafe/extension/package.json` — ADD: `failsafe.showShadowGenome` command

### Changes

#### `ShadowGenomePanel.ts` — Failure pattern debugging view

- Singleton pattern: `static currentPanel`, `static createOrShow(extensionUri, eventBus, shadowGenomeManager)`
- On create/reveal, fetches:
  1. `shadowGenomeManager.analyzeFailurePatterns()` → `FailurePattern[]`
  2. `shadowGenomeManager.getUnresolvedEntries(50)` → `ShadowGenomeEntry[]`
- Subscribes to `genome.failureArchived` event for real-time updates
- Renders two sections:

**Section 1: Pattern Overview** (top)
- Card grid showing each `FailureMode` with:
  - Icon per mode (shield-x for INJECTION, key for SECRET_EXPOSURE, brain for HALLUCINATION, etc.)
  - Count badge
  - Agent DIDs affected (abbreviated)
  - Top causal vector (most recent)
  - Click to filter Section 2 by that failure mode

**Section 2: Unresolved Entries** (bottom)
- Sortable table:
  | Column | Source |
  |---|---|
  | Failure Mode | `failureMode` |
  | Agent | `agentDid` (abbreviated) |
  | Input | `inputVector` (truncated to 80 chars) |
  | Cause | `causalVector` (truncated) |
  | Status | `remediationStatus` badge |
  | Created | `createdAt` relative timestamp |
- Row click: expand to show full entry detail (all fields)
- Inline actions:
  - Status dropdown: UNRESOLVED → IN_PROGRESS → RESOLVED / WONT_FIX
  - Notes text field (saves on blur)
  - Calls `shadowGenomeManager.updateRemediationStatus()` on change
- Filter by failure mode (from Pattern Overview click)

**Section 3: Negative Constraints** (collapsible)
- Lists active negative constraints per agent
- Fetched via `shadowGenomeManager.getNegativeConstraintsForAgent(did)`
- Grouped by agent DID
- Display format: `AVOID: ...` in monospace, `REQUIRE: ...` in green

- Webview messages:
  - `updateStatus` → `{ entryId, status, notes }` → calls updateRemediationStatus
  - `filterByMode` → filters table by FailureMode
  - `expandEntry` → shows full entry detail
  - `refresh` → re-fetch all data
- CSP: nonce-based, same pattern as DiffGuardPanel

#### Event type addition

Add `genome.failureArchived` to `FailSafeEventType` — emitted by ShadowGenomeManager when a new failure is archived (to trigger panel refresh).

#### ShadowGenomeManager modification

Add EventBus emission in `archiveFailure()`:

```typescript
// After successful insert
this.eventBus.emit('genome.failureArchived', {
  failureMode: entry.failureMode,
  agentDid: entry.agentDid,
  entryId: entry.id,
});
```

This requires passing EventBus to ShadowGenomeManager constructor. Check if it already has it — if not, add as optional parameter with null-check on emit.

#### Bootstrap + package.json wiring

Register command in `bootstrapGenesis.ts`:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('failsafe.showShadowGenome', () => {
    ShadowGenomePanel.createOrShow(
      context.extensionUri,
      core.eventBus,
      qore.shadowGenomeManager,
    );
  })
);
```

Add to `package.json` commands:
```json
{
  "command": "failsafe.showShadowGenome",
  "title": "FailSafe: Shadow Genome Debugger",
  "category": "FailSafe"
}
```

### Unit Tests

- `FailSafe/extension/src/test/genesis/panels/ShadowGenomePanel.test.ts`
  - Renders pattern cards with correct counts from analyzeFailurePatterns()
  - Filters entries by failure mode
  - Updates remediation status via updateRemediationStatus()
  - Handles empty state (no failures) with informative message
  - Renders negative constraints grouped by agent

## Architecture Summary

```
┌──────────────────────────────────────────────────────────────┐
│  Existing Infrastructure (no changes)                        │
│  EventBus, SentinelDaemon, TrustEngine, RiskManager,        │
│  ShadowGenomeManager, IdeActivityTracker                     │
└──────────┬───────────────────────────────────────────────────┘
           │ events
           ▼
┌──────────────────────────────────────────────────────────────┐
│  NEW: Aggregation Services                                   │
│                                                              │
│  AgentHealthIndicator ──► Status Bar (B143)                  │
│    Consumes: verdict, trust, quarantine events               │
│    Produces: sentinel.healthUpdate                           │
│                                                              │
│  AgentTimelineService ──► AgentTimelinePanel (B142)          │
│    Consumes: ALL relevant events via onAll()                 │
│    Produces: timeline.entryAdded                             │
│                                                              │
│  ShadowGenomeManager ──► ShadowGenomePanel (B144)            │
│    Already exists, add: genome.failureArchived emission      │
│    Panel queries: analyzeFailurePatterns, getUnresolved       │
└──────────────────────────────────────────────────────────────┘
```

## Non-Goals (v4.8.0)

- Graph visualization of event relationships (timeline is linear)
- Cross-session timeline persistence (current session only in-memory)
- Custom risk scoring formulas (fixed rules for now)
- Shadow Genome pattern machine learning (manual classification only)
