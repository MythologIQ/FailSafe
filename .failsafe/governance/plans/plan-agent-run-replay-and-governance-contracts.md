# Plan: Agent Run Replay & Governance Decision Contract (v4.9.0)

**Current Version**: v4.7.2 (v4.8.0 pending merge via PR #28)
**Target Version**: v4.9.0
**Change Type**: feature
**Risk Grade**: L2

## Open Questions

1. **Run boundary detection**: How do we detect when an agent "run" starts and ends? Terminal correlation (TerminalCorrelator) detects active agents, but run start/end is ambiguous. ProvenanceTracker debounces file writes at 200ms. Options: (a) explicit start/end events from IDE task lifecycle (`ide.taskStarted`/`ide.taskEnded`), (b) inactivity timeout (e.g., 60s silence = run end), (c) manual user trigger via command palette. **Recommendation**: Use IDE task lifecycle as primary signal with inactivity timeout as fallback.

2. **Replay storage format**: JSONL (one event per line, append-only, easy to stream) vs SQLite (queryable, indexable, consistent with ShadowGenomeManager). **Recommendation**: JSONL for run traces (simple, streamable, `.failsafe/runs/{run-id}.jsonl`), no new SQLite schema. Runs are short-lived replay artifacts, not long-term queryable data like Shadow Genome entries.

3. **GovernanceDecision adoption scope**: Should existing VerdictArbiter/SentinelDaemon/IntentService be migrated to return `GovernanceDecision` in this version, or just define the type? **Recommendation**: Define the type + create a `toGovernanceDecision()` adapter from `SentinelVerdict`. Full migration is v5.0 scope.

---

## Phase 1: Governance Decision Contract (B150)

The contract type is a dependency for both the Recorder (it determines what structured data gets stored) and the Replay Panel (it determines what gets rendered). Define it first.

### Affected Files

- `src/shared/types/governance.ts` — NEW: GovernanceDecision contract type + adapter
- `src/shared/types/index.ts` — re-export new types
- `src/shared/types/events.ts` — add `agentRun.*` event types
- `src/test/governance/GovernanceDecision.test.ts` — NEW: contract + adapter tests

### Changes

**`src/shared/types/governance.ts`** (NEW — ~80 lines)

```typescript
/** Machine-actionable governance decision contract.
 *  Agent frameworks build control flow around these decisions. */
export type GovernanceAction = "ALLOW" | "BLOCK" | "MODIFY" | "ESCALATE" | "QUARANTINE";

export interface GovernanceDecision {
  /** The action to take */
  decision: GovernanceAction;
  /** Composite risk score 0.0-1.0 */
  riskScore: number;
  /** Risk classification */
  riskCategory: "execution_instability" | "reasoning_collapse" | "tool_recursion"
    | "hallucinated_resource" | "security_downgrade" | "mass_modification"
    | "secret_exposure" | "config_tampering" | "dependency_hallucination" | "none";
  /** Agent trust stage at decision time */
  trustStage: "CBT" | "KBT" | "IBT";
  /** Matched Shadow Genome failure mode, if any */
  failureMode?: string;
  /** Recommended mitigation action */
  mitigation: string | null;
  /** Decision confidence 0.0-1.0 */
  confidence: number;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Agent DID */
  agentDid: string;
  /** Artifact path triggering the decision */
  artifactPath?: string;
  /** Human-readable summary */
  summary: string;
}
```

**`toGovernanceDecision()` adapter** (in same file — ~35 lines)

Maps existing `SentinelVerdict` → `GovernanceDecision`:

```typescript
import type { SentinelVerdict } from "./sentinel";

const DECISION_MAP: Record<string, GovernanceAction> = {
  PASS: "ALLOW",
  WARN: "MODIFY",
  BLOCK: "BLOCK",
  ESCALATE: "ESCALATE",
  QUARANTINE: "QUARANTINE",
};

export function toGovernanceDecision(
  verdict: SentinelVerdict,
  trustStage: "CBT" | "KBT" | "IBT",
): GovernanceDecision {
  return {
    decision: DECISION_MAP[verdict.decision] ?? "BLOCK",
    riskScore: 1 - verdict.confidence,
    riskCategory: inferRiskCategory(verdict),
    trustStage,
    failureMode: undefined, // populated when Shadow Genome match exists
    mitigation: verdict.decision === "PASS" ? null : verdict.summary,
    confidence: verdict.confidence,
    timestamp: verdict.timestamp,
    agentDid: verdict.agentDid,
    artifactPath: verdict.artifactPath,
    summary: verdict.summary,
  };
}

function inferRiskCategory(v: SentinelVerdict): GovernanceDecision["riskCategory"] {
  const patterns = v.matchedPatterns.join(" ").toLowerCase();
  if (patterns.includes("secret") || patterns.includes("credential")) return "secret_exposure";
  if (patterns.includes("auth") || patterns.includes("security")) return "security_downgrade";
  if (patterns.includes("config") || patterns.includes("env")) return "config_tampering";
  return "none";
}
```

**`src/shared/types/events.ts`** — add agent run event types:

```typescript
| "agentRun.started"
| "agentRun.stepRecorded"
| "agentRun.completed"
| "agentRun.replaying"
```

### Unit Tests

- `src/test/governance/GovernanceDecision.test.ts` — Tests for:
  - `toGovernanceDecision` maps PASS → ALLOW, BLOCK → BLOCK, ESCALATE → ESCALATE, QUARANTINE → QUARANTINE, WARN → MODIFY
  - `riskScore` is `1 - confidence`
  - `riskCategory` correctly infers from matched patterns
  - `mitigation` is null for ALLOW decisions
  - All required fields are present in output
  - Unknown verdict decisions default to BLOCK

---

## Phase 2: Agent Run Recorder (B146)

### Affected Files

- `src/sentinel/AgentRunRecorder.ts` — NEW: core recorder service
- `src/shared/types/agentRun.ts` — NEW: run step types
- `src/extension/bootstrapSentinel.ts` — wire AgentRunRecorder
- `src/test/sentinel/AgentRunRecorder.test.ts` — NEW: recorder tests

### Changes

**`src/shared/types/agentRun.ts`** (NEW — ~60 lines)

```typescript
export type RunStepKind =
  | "prompt"        // Agent received a prompt
  | "reasoning"     // Agent reasoning/planning step
  | "toolCall"      // Agent invoked a tool (file read, search, etc.)
  | "fileEdit"      // Agent modified a file
  | "policyDecision"// FailSafe governance decision was made
  | "mitigation"    // FailSafe applied a mitigation
  | "verdictPass"   // Sentinel passed an artifact
  | "verdictBlock"  // Sentinel blocked an artifact
  | "trustUpdate"   // Agent trust score changed
  | "genomeMatch"   // Shadow Genome failure pattern matched
  | "completed"     // Run completed

export interface RunStep {
  seq: number;
  kind: RunStepKind;
  timestamp: string;
  title: string;
  detail?: string;
  artifactPath?: string;
  agentDid?: string;
  governanceDecision?: GovernanceDecision;
  diff?: { additions: number; deletions: number };
}

export interface AgentRun {
  id: string;           // UUID
  agentDid: string;
  agentType: string;    // "claude", "copilot", "cursor", etc.
  startedAt: string;
  endedAt?: string;
  status: "running" | "completed" | "failed";
  steps: RunStep[];
  summary?: string;
}
```

**`src/sentinel/AgentRunRecorder.ts`** (NEW — ~200 lines)

Core service. Follows AgentTimelineService pattern:

```typescript
export class AgentRunRecorder {
  private activeRuns = new Map<string, AgentRun>();
  private completedRuns: AgentRun[] = [];  // bounded buffer, MAX = 50
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly storagePath: string,  // .failsafe/runs/
  ) {
    this.unsubscribe = this.eventBus.onAll((event) => this.handleEvent(event));
  }

  // --- Public API ---

  startRun(agentDid: string, agentType: string): AgentRun
  endRun(runId: string, status?: "completed" | "failed"): AgentRun | undefined
  getActiveRuns(): AgentRun[]
  getCompletedRuns(): AgentRun[]
  getRun(runId: string): AgentRun | undefined
  getRunSteps(runId: string): RunStep[]

  // --- Event Handling (private) ---

  private handleEvent(event: FailSafeEvent): void {
    // Only record if there's an active run
    // Map event type → RunStepKind
    // Append step to active run
    // Emit agentRun.stepRecorded
  }

  private mapEventToStep(event: FailSafeEvent): RunStep | null {
    // sentinel.verdict → verdictPass/verdictBlock
    // qorelogic.trustUpdate → trustUpdate
    // genome.failureArchived → genomeMatch
    // diffguard.approved/rejected → policyDecision
    // ide.taskStarted → prompt (trigger startRun)
    // ide.taskEnded → completed (trigger endRun)
  }

  // --- Persistence ---

  private persistRun(run: AgentRun): void {
    // Write to .failsafe/runs/{run.id}.json
    // Bounded: delete oldest when > 50 files
  }

  loadRun(runId: string): AgentRun | null {
    // Read from .failsafe/runs/{runId}.json
  }

  // --- Lifecycle ---

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    // Persist any active runs as "failed"
  }
}
```

**Key design decisions**:
- In-memory active runs (`Map<string, AgentRun>`) — fast append
- Completed runs persisted as JSON files to `.failsafe/runs/` — simple, no new DB schema
- Bounded buffer: max 50 completed runs in memory, oldest files auto-cleaned
- Event mapping: reuses existing event types, no new emitters required from other services
- Run lifecycle: `startRun()` callable from IDE task events or command palette

**`src/extension/bootstrapSentinel.ts`** — extend `SentinelSubstrate`:

```typescript
export interface SentinelSubstrate {
  sentinelDaemon: SentinelDaemon;
  architectureEngine: ArchitectureEngine;
  agentTimelineService: AgentTimelineService;
  agentRunRecorder: AgentRunRecorder;  // NEW
}
```

Instantiate after agentTimelineService:
```typescript
const runsPath = path.join(failsafeDir, "runs");
const agentRunRecorder = new AgentRunRecorder(core.eventBus, runsPath);
context.subscriptions.push({ dispose: () => agentRunRecorder.dispose() });
```

Catch block stub:
```typescript
agentRunRecorder: {
  dispose: () => {},
  getActiveRuns: () => [],
  getCompletedRuns: () => [],
  getRun: () => undefined,
  getRunSteps: () => [],
  startRun: () => ({ id: "", agentDid: "", agentType: "", startedAt: "", status: "failed" as const, steps: [] }),
  endRun: () => undefined,
  loadRun: () => null,
} as unknown as AgentRunRecorder,
```

### Unit Tests

- `src/test/sentinel/AgentRunRecorder.test.ts` — Tests for:
  - `startRun` creates a run with correct fields
  - `endRun` sets status and endedAt
  - `handleEvent` maps sentinel.verdict to verdictPass/verdictBlock step
  - `handleEvent` maps qorelogic.trustUpdate to trustUpdate step
  - `handleEvent` ignores events when no active run
  - `getActiveRuns` returns only running runs
  - `getCompletedRuns` respects max buffer (50)
  - `dispose` marks active runs as failed
  - `mapEventToStep` returns null for unmapped event types
  - Steps are sequentially numbered within a run

---

## Phase 3: Agent Run Replay Panel (B147)

### Affected Files

- `src/genesis/panels/AgentRunReplayPanel.ts` — NEW: replay webview panel
- `src/genesis/panels/AgentRunReplayHelpers.ts` — NEW: HTML/CSS/JS helpers
- `src/extension/bootstrapGenesis.ts` — register replay command
- `FailSafe/extension/package.json` — add command entry

### Changes

**`src/genesis/panels/AgentRunReplayPanel.ts`** (NEW — ~180 lines)

Singleton webview panel. Follows AgentTimelinePanel/ShadowGenomePanel pattern:

```typescript
export class AgentRunReplayPanel {
  static currentPanel: AgentRunReplayPanel | undefined;

  static createOrShow(
    extensionUri: vscode.Uri,
    eventBus: EventBus,
    recorder: AgentRunRecorder,
  ): void

  // Shows run selector (completed runs list) → click → replay view
  // Replay view: step-by-step execution with:
  //   - Step counter: "Step 3 of 12"
  //   - Step list (left sidebar): sequential steps with kind icons
  //   - Step detail (main area): title, detail, diff preview, governance decision card
  //   - Navigation: prev/next buttons

  private registerMessageHandler(): void {
    // "selectRun" → load run and render replay view
    // "viewFile" → open file in editor
    // "nextStep" / "prevStep" → navigate steps
    // "refresh" → reload run list
  }
}
```

**`src/genesis/panels/AgentRunReplayHelpers.ts`** (NEW — ~220 lines)

Extracted HTML/CSS/JS generation:

```typescript
export function getStyles(): string
  // Step list sidebar, step detail panel, governance decision card
  // Uses VS Code theme tokens exclusively (no hardcoded colors)
  // Step kind icons: color-coded by severity

export function renderRunList(runs: AgentRun[]): string
  // Card per run: agent type, start time, step count, status badge
  // Click → sends selectRun message

export function renderReplayView(run: AgentRun, currentStep: number): string
  // Header: run ID, agent, duration, step counter
  // Step sidebar: numbered list with kind icons, active step highlighted
  // Detail area: step title, timestamp, detail text
  // If step has diff: additions/deletions summary
  // If step has governanceDecision: decision card with action/risk/trust/mitigation
  // Navigation: [← Prev] [Next →] buttons

export function renderGovernanceCard(decision: GovernanceDecision): string
  // Action badge (ALLOW=green, BLOCK=red, ESCALATE=yellow, QUARANTINE=red)
  // Risk score bar
  // Trust stage badge
  // Mitigation text
  // Failure mode (if matched)

export function getScript(): string
  // Message passing to extension host
  // Step navigation state management
```

**`src/extension/bootstrapGenesis.ts`** — add command registration:

```typescript
import { AgentRunReplayPanel } from "../genesis/panels/AgentRunReplayPanel";

context.subscriptions.push(
  vscode.commands.registerCommand("failsafe.showRunReplay", () => {
    AgentRunReplayPanel.createOrShow(
      context.extensionUri,
      core.eventBus,
      sentinel.agentRunRecorder,
    );
  }),
);
```

**`package.json`** — add command:

```json
{
  "command": "failsafe.showRunReplay",
  "title": "FailSafe: Agent Run Replay",
  "category": "FailSafe"
}
```

### Unit Tests

No unit tests for webview panels (they are UI components tested via Playwright). The governance contract and recorder tests in Phase 1-2 cover the logic. Webview rendering is validated by existing Playwright test patterns.

---

## Section 4 Razor Compliance

| File | Est. Lines | Limit | Status |
|------|-----------|-------|--------|
| `types/governance.ts` | ~80 | 250 | OK |
| `types/agentRun.ts` | ~60 | 250 | OK |
| `AgentRunRecorder.ts` | ~200 | 250 | OK |
| `AgentRunReplayPanel.ts` | ~180 | 250 | OK |
| `AgentRunReplayHelpers.ts` | ~220 | 250 | OK |
| `GovernanceDecision.test.ts` | ~80 | 250 | OK |
| `AgentRunRecorder.test.ts` | ~150 | 250 | OK |

All functions estimated ≤40 lines. `renderReplayView` is the largest helper (~35 lines) — within limit.

---

## Build Path Verification

| File | Import Chain | Connected |
|------|-------------|-----------|
| `types/governance.ts` | → `types/index.ts` → used by AgentRunRecorder, ReplayPanel | Yes |
| `types/agentRun.ts` | → `types/index.ts` → used by AgentRunRecorder, ReplayPanel | Yes |
| `AgentRunRecorder.ts` | → bootstrapSentinel.ts → main.ts | Yes |
| `AgentRunReplayPanel.ts` | → bootstrapGenesis.ts → main.ts | Yes |
| `AgentRunReplayHelpers.ts` | → AgentRunReplayPanel.ts | Yes |
| Tests | → mocha test runner | Yes |
