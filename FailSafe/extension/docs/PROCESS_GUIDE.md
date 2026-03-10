# FailSafe Process Guide

Audience: operators who need fast, accurate workflows for the shipped `v4.7.0` UI and governance stack.

## First Run (Recommended Path)

1. Install the extension.
2. Open a git-backed workspace.
3. Run `FailSafe: Open Command Center (Browser Popout)` or `FailSafe: Open Command Center (Editor Tab)`.
4. Run `FailSafe: Set Up Agent Governance`.
5. Set `FailSafe: Set Governance Mode` to `observe` first.

## Daily Operator Loop

1. Keep `FailSafe Monitor` visible while coding.
2. Use Console `Overview` to confirm trust posture and chain status.
3. Use `Operations` for `Resume`, `Panic Stop`, `Verify Chain`, and rollback flows.
4. Review `Transparency` if behavior is unexpected.
5. Process L3 items in `Governance` before high-risk merges.

## Local Pre-Push Gate (Before GitHub CI)

FailSafe runs deterministic local pre-push checks through `.githooks/pre-push` before `git push`.

Default checks:

1. Branch policy validation (`tools/reliability/validate-branch-policy.ps1`).
2. Extension compile (`npm run compile`).
3. Release metadata preflight (`node ./scripts/validate-vsix.cjs --source-only`).
4. Full test stack (`npm run test:all`).
5. VSIX package + artifact validation (`npx @vscode/vsce package` and `npm run validate:vsix`).

Manual invocation:

```powershell
powershell -ExecutionPolicy Bypass -File tools/reliability/prepush-validate.ps1
```

## Governance Modes

| Mode | Behavior | Use It When |
| --- | --- | --- |
| `observe` | Logs and reports without hard stops | onboarding, baseline visibility |
| `assist` | Guidance and lightweight friction | normal development with guardrails |
| `enforce` | Strict policy gating | compliance-critical workflows |

## Core Procedures

### Audit Current File

1. Open the file.
2. Run `FailSafe: Audit Current File`.
3. Inspect verdict details.
4. Resolve `BLOCK`/`ESCALATE` before proceeding.

### Verify Checkpoint Chain

1. Open Console `Operations` or `Governance`.
2. Click `Verify Chain` / `Verify Integrity`.
3. Wait for result and re-check status cards.

Use this for integrity confirmation before release or after unusual events.

### Install Commit-Time Guardrails

Prerequisites:

- workspace is a git repository
- `curl` is available on the machine
- FailSafe is running

Steps:

1. Run `FailSafe: Install Commit Hook`.
2. Confirm `.git/hooks/pre-commit` and `.git/failsafe-hook-token` exist.
3. Run a test commit.

Removal:

1. Run `FailSafe: Remove Commit Hook`.
2. Confirm hook/token removal (or chained restoration) in `.git/hooks`.

### Use Break-Glass Safely

1. Run `FailSafe: Activate Break-Glass Override`.
2. Enter a justification (minimum 10 characters).
3. Pick the shortest valid duration.
4. Complete urgent work.
5. Run `FailSafe: Revoke Break-Glass Override` when done.

### Replay a Verdict

1. Locate the ledger entry ID.
2. Run `FailSafe: Replay Verdict (Audit)`.
3. Enter the entry ID.
4. Compare replay output with original decision.

### Revert to a Checkpoint

1. Identify a trusted checkpoint.
2. Run `FailSafe: Revert to Checkpoint (Time-Travel)`.
3. Enter checkpoint ID.
4. Validate restored state and ledger evidence.

## Skills Workflow (Console)

1. Open `Skills` tab.
2. Run `Auto Ingest` (or use manual ingest).
3. Filter by phase when needed.
4. Review `Recommended` first, then `All Relevant`.
5. Use copied intent text to drive governed execution.

## Mindmap Workflow (Current Release)

`v4.4.0` supports voice-assisted and manual ideation in Console `Mindmap`:

1. Click the mic button and speak your idea.
2. Let transcript extraction update graph nodes/edges.
3. Review confidence colors and spoken response.
4. Add/edit nodes manually when needed.
5. Export JSON snapshot.

Prerequisite: vendor runtime files for Whisper/Piper must be staged per `src/roadmap/ui/vendor/*/VENDOR.md`.

## Troubleshooting

### Console shows disconnected state

Check:

- local server startup in extension logs
- local port occupancy conflicts
- browser tab still pointing to active local instance

### Commit hook does not block

Check:

- FailSafe runtime active
- hook installed in the same repo
- `curl` available on PATH
- current governance mode/intent actually requires blocking

### L3 queue appears stale

Check:

- current governance mode and policy inputs
- recent transparency events for queue updates
- workspace path is the expected governed root

### Mindmap voice controls are missing

Check:

- vendor runtime assets were staged per `src/roadmap/ui/vendor/*/VENDOR.md`
- browser allows microphone access
- Console server is reachable at the current local runtime URL

### UI tests fail due to missing legacy route or selectors

Current Playwright UI tests target:

- Monitor shell: `index.html`
- Command Center shell: `command-center.html`

If local scripts still reference `legacy-index.html`, update them to the current route and selector contracts.

## Claim Map

| Claim | Status | Source |
| --- | --- | --- |
| Command palette exposes audit, mode, break-glass, replay, rollback, and hook lifecycle commands | implemented | `FailSafe/extension/package.json` |
| Console operations include integrity verification and rollback actions | implemented | `FailSafe/extension/src/roadmap/ui/modules/operations.js`, `FailSafe/extension/src/roadmap/ui/modules/governance.js` |
| Mindmap tab supports voice + manual node workflows | implemented | `FailSafe/extension/src/roadmap/ui/modules/brainstorm.js`, `FailSafe/extension/src/roadmap/ui/modules/stt-engine.js`, `FailSafe/extension/src/roadmap/ui/modules/tts-engine.js` |
| Transcript-to-graph API is shipped | implemented | `FailSafe/extension/src/roadmap/ConsoleServer.ts` (`POST /api/v1/brainstorm/transcript`) |
