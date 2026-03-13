# Plan: B145 Diff Guard ("Risk-Aware Change Preview")

**Current Version**: v4.7.2
**Target Version**: v4.8.0
**Change Type**: feature
**Risk Grade**: L2

## Open Questions

1. **Intercept timing**: Chokidar fires `FILE_MODIFIED` after the write has already landed on disk. True pre-write interception requires either (a) a VS Code `workspace.onWillSaveTextDocument` hook for editor-mediated saves, or (b) OS-level filesystem intercept (Pro only). For the free extension, the practical model is: detect the change immediately after write, generate the diff from git working tree, and present the review UI before the developer proceeds. This is a "review before you continue" gate, not a "block before disk write" gate. True pre-write blocking is a Pro/daemon feature.

2. **Diff source**: For agent-produced edits, `git diff` against HEAD provides the before/after. For new files, the entire content is the diff. Should we also support stash-based diffing for files not yet in git? Initial answer: no — git-tracked files only for v4.8.0.

3. **Agent attribution**: Which agent produced the edit? Current infrastructure requires `agentDid` on SentinelEvents. When source is `file_watcher` (chokidar), agent attribution comes from IDE activity tracking. If no agent is detected, the diff is still shown but without agent identity.

## Phase 1: Core Diff Analysis Engine

### Affected Files

- `FailSafe/extension/src/sentinel/diffguard/DiffAnalyzer.ts` — NEW: Computes git diffs, extracts change hunks, calculates change metrics
- `FailSafe/extension/src/sentinel/diffguard/RiskSignalDetector.ts` — NEW: Scans diff hunks for risk signals (dependency hallucination, security downgrades, mass modification, recursive patches, destructive edits)
- `FailSafe/extension/src/sentinel/diffguard/types.ts` — NEW: DiffGuard type definitions
- `FailSafe/extension/src/shared/types/diffguard.ts` — NEW: Shared types exported from barrel
- `FailSafe/extension/src/shared/types/index.ts` — ADD: export diffguard types

### Changes

#### `diffguard/types.ts` — Type definitions

```typescript
export interface DiffHunk {
  filePath: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber: number;
}

export interface DiffAnalysis {
  filePath: string;
  hunks: DiffHunk[];
  stats: DiffStats;
  riskSignals: RiskSignal[];
  overallRisk: RiskLevel;
  agentDid?: string;
  timestamp: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  filesChanged: number;
  netChange: number;
}

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export type RiskSignalType =
  | 'dependency_hallucination'
  | 'security_downgrade'
  | 'mass_modification'
  | 'recursive_patch'
  | 'destructive_edit'
  | 'secret_exposure'
  | 'config_tampering';

export interface RiskSignal {
  type: RiskSignalType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  line?: number;
  remediation: string;
}

export type DiffGuardDecision = 'approve' | 'reject' | 'modify_prompt';

export interface DiffGuardAction {
  decision: DiffGuardDecision;
  analysis: DiffAnalysis;
  agentDid?: string;
  timestamp: string;
  modifiedPrompt?: string;
}
```

#### `DiffAnalyzer.ts` — Git diff computation

- Constructor takes workspace root path
- `async analyzePath(filePath: string): Promise<DiffAnalysis>` — runs `git diff HEAD -- <path>`, parses unified diff format into `DiffHunk[]`, computes `DiffStats`
- `async analyzeMultiple(filePaths: string[]): Promise<DiffAnalysis[]>` — batch analysis
- `parseDiff(rawDiff: string, filePath: string): DiffHunk[]` — parse unified diff output into structured hunks
- Uses `child_process.execFile('git', ...)` with timeout (5s) and max buffer (1MB)
- For new untracked files: `git diff --no-index /dev/null <path>`
- Reuses `GitResetService` pattern for safe git command execution (no shell, no interpolation)

#### `RiskSignalDetector.ts` — Risk signal detection on diff hunks

- Constructor takes `PatternLoader` (reuse existing heuristic patterns)
- `detect(hunks: DiffHunk[]): RiskSignal[]` — scan added lines for risk signals
- Detection rules (applied to added/modified lines only):

| Signal | Detection Logic |
|--------|----------------|
| `dependency_hallucination` | Added `require()`/`import` of packages not in `package.json`/`package-lock.json`; added dependency entries in `package.json` for packages that don't exist on npm (offline check: not in lock file and never seen before) |
| `security_downgrade` | Removal of `--verify` flags, addition of `--no-verify`/`--insecure`, hardcoded secrets/tokens (reuse existing `secrets` HeuristicPatterns), disabled SSL/TLS verification |
| `mass_modification` | Diff stats: deletions > 50 lines, or net change > 100 lines, or > 5 files changed in single event |
| `recursive_patch` | Same file path appearing in > 3 sentinel events within a 60-second window (tracked via in-memory ring buffer) |
| `destructive_edit` | Deletions > 2x additions, or entire file contents replaced |
| `secret_exposure` | Reuse `secrets` and `pii` pattern categories from `PatternLoader` |
| `config_tampering` | Changes to `.env`, `tsconfig.json`, `package.json` scripts, CI config files |

- `calculateOverallRisk(signals: RiskSignal[]): RiskLevel` — highest severity among signals, `safe` if none

### Unit Tests

- `FailSafe/extension/tests/sentinel/diffguard/DiffAnalyzer.test.ts`
  - Parses unified diff format correctly (additions, deletions, context lines)
  - Handles new file diffs (no previous version)
  - Handles binary files (skips gracefully)
  - Calculates stats accurately
  - Respects content size limits

- `FailSafe/extension/tests/sentinel/diffguard/RiskSignalDetector.test.ts`
  - Detects dependency hallucination (unknown package import)
  - Detects security downgrade (--no-verify added)
  - Detects mass modification (> 50 deletions)
  - Detects destructive edit (deletions > 2x additions)
  - Detects secret exposure (hardcoded API key in diff)
  - Returns `safe` when no signals present
  - Calculates overall risk as max severity

## Phase 2: Diff Guard Panel (Webview UI)

### Affected Files

- `FailSafe/extension/src/genesis/panels/DiffGuardPanel.ts` — NEW: Singleton webview panel showing risk-annotated diff preview with action buttons
- `FailSafe/extension/src/sentinel/diffguard/DiffGuardService.ts` — NEW: Orchestrator connecting SentinelDaemon events → DiffAnalyzer → RiskSignalDetector → DiffGuardPanel
- `FailSafe/extension/src/shared/types/events.ts` — ADD: new event types for diff guard

### Changes

#### `DiffGuardPanel.ts` — Webview panel (follows L3ApprovalPanel pattern)

- Singleton pattern: `static currentPanel`, `static createOrShow(extensionUri, deps)`
- Constructor takes: `vscode.WebviewPanel`, `EventBus`, `DiffGuardService`
- Subscribes to `diffguard.analysisReady` event via EventBus
- Webview messages handled:
  - `approve` → approve the change, record to Shadow Genome, emit `diffguard.approved`
  - `reject` → reject, emit `diffguard.rejected`
  - `modifyPrompt` → emit `diffguard.modifyPrompt` with modified prompt text
  - `viewFile` → open file in editor
  - `showFullDiff` → open VS Code native diff editor for the file
- Renders:
  - File path header with risk badge (color-coded: green/yellow/orange/red)
  - Code diff view with syntax-highlighted additions/deletions (VS Code theme colors)
  - Risk signal cards: icon + type + description + evidence snippet + remediation
  - Confidence score bar
  - Action buttons: **Approve** (green) | **Modify Prompt** (yellow) | **Reject** (red)
  - Agent identity badge (if known)
- CSP: nonce-based script/style, same pattern as L3ApprovalPanel
- HTML rendering: `escapeHtml`, `escapeJsString`, `getNonce` from shared utils

#### `DiffGuardService.ts` — Orchestration service

- Constructor: `DiffAnalyzer`, `RiskSignalDetector`, `EventBus`, `ShadowGenomeManager`
- Subscribes to `sentinel.verdict` on EventBus
- On verdict for `FILE_MODIFIED` or `FILE_CREATED` events:
  1. If verdict is `PASS` and risk grade is `L1` → skip (low-risk, auto-approved)
  2. Run `DiffAnalyzer.analyzePath(artifactPath)`
  3. Run `RiskSignalDetector.detect(hunks)`
  4. If any risk signals detected OR risk grade ≥ L2 → emit `diffguard.analysisReady` with `DiffAnalysis`
  5. If no signals and L1 → silently approve (no UI interruption)
- `async recordDecision(action: DiffGuardAction): Promise<void>`
  - On approve: record approval in ledger, update agent trust (positive outcome)
  - On reject: archive to Shadow Genome as failure, update agent trust (negative outcome)
  - On modify_prompt: record in ledger as "user modified agent prompt", neutral trust outcome

#### Event type additions to `events.ts`

Add to `FailSafeEventType`:
```typescript
| 'diffguard.analysisReady'
| 'diffguard.approved'
| 'diffguard.rejected'
| 'diffguard.modifyPrompt'
```

### Unit Tests

- `FailSafe/extension/tests/sentinel/diffguard/DiffGuardService.test.ts`
  - Routes L1 PASS verdicts to auto-approve (no UI)
  - Routes L2+ verdicts through analysis pipeline
  - Emits `diffguard.analysisReady` when risk signals detected
  - Records approve decision to ledger with positive trust update
  - Records reject decision to Shadow Genome with negative trust update
  - Records modify_prompt with neutral trust outcome

- `FailSafe/extension/tests/genesis/panels/DiffGuardPanel.test.ts`
  - Creates singleton panel
  - Handles approve/reject/modifyPrompt messages
  - Updates on `diffguard.analysisReady` event
  - Disposes cleanly

## Phase 3: Integration & Wiring

### Affected Files

- `FailSafe/extension/src/extension/bootstrapSentinel.ts` — MODIFY: instantiate DiffGuardService, wire to sentinel pipeline
- `FailSafe/extension/src/extension/bootstrapGenesis.ts` — MODIFY: register DiffGuardPanel command
- `FailSafe/extension/src/extension/main.ts` — MODIFY: register `failsafe.showDiffGuard` command (if not in bootstrapGenesis)
- `FailSafe/extension/package.json` — ADD: command `failsafe.showDiffGuard` with title "FailSafe: Show Diff Guard"

### Changes

#### `bootstrapSentinel.ts` modifications

After SentinelDaemon construction, create DiffGuard components:

```typescript
const diffAnalyzer = new DiffAnalyzer(workspaceRoot);
const riskSignalDetector = new RiskSignalDetector(patternLoader);
const diffGuardService = new DiffGuardService(
  diffAnalyzer,
  riskSignalDetector,
  core.eventBus,
  qore.shadowGenomeManager
);
```

Export `diffGuardService` as part of `SentinelSubstrate`.

#### `bootstrapGenesis.ts` modifications

Register command:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('failsafe.showDiffGuard', () => {
    DiffGuardPanel.createOrShow(context.extensionUri, core.eventBus, sentinel.diffGuardService);
  })
);
```

#### `package.json` contribution

```json
{
  "command": "failsafe.showDiffGuard",
  "title": "FailSafe: Show Diff Guard",
  "category": "FailSafe"
}
```

### Unit Tests

- `FailSafe/extension/tests/extension/bootstrapSentinel.test.ts` — verify DiffGuardService instantiation
- Integration test: full pipeline from chokidar event → verdict → diff analysis → panel event emission

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│  SentinelDaemon (chokidar)                      │
│  Detects: FILE_MODIFIED, FILE_CREATED           │
└──────────────┬──────────────────────────────────┘
               │ SentinelEvent
               ▼
┌──────────────────────────────────────────────────┐
│  VerdictArbiter → VerdictEngine → VerdictRouter  │
│  Produces: SentinelVerdict (PASS/WARN/BLOCK/...) │
└──────────────┬───────────────────────────────────┘
               │ sentinel.verdict (EventBus)
               ▼
┌──────────────────────────────────────────────────┐
│  DiffGuardService                    [NEW]       │
│  1. Filter: skip L1 PASS (auto-approve)          │
│  2. DiffAnalyzer: git diff → DiffHunk[]          │
│  3. RiskSignalDetector: scan → RiskSignal[]      │
│  4. Emit: diffguard.analysisReady                │
└──────────────┬───────────────────────────────────┘
               │ diffguard.analysisReady (EventBus)
               ▼
┌──────────────────────────────────────────────────┐
│  DiffGuardPanel (Webview)            [NEW]       │
│  Shows: diff + risk signals + action buttons     │
│  Actions: Approve / Modify Prompt / Reject       │
└──────────────┬───────────────────────────────────┘
               │ diffguard.approved/rejected
               ▼
┌──────────────────────────────────────────────────┐
│  Existing Infrastructure                         │
│  - TrustEngine: update agent score               │
│  - ShadowGenome: archive rejected patterns       │
│  - LedgerManager: record decision                │
└──────────────────────────────────────────────────┘
```

## Non-Goals (v4.8.0)

- Pre-write filesystem interception (requires OS-level daemon — Pro feature)
- npm registry lookup for dependency hallucination (offline heuristics only)
- Inline editor decorations (future enhancement)
- Auto-reject / auto-block without human review (observe/assist mode only)
- Cross-file impact analysis (single-file diffs per event)
