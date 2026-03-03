# FailSafe Process Guide

Audience: operators who need clear, short instructions for common FailSafe workflows.

## First Run

1. Install the extension.
2. Open a git-backed workspace.
3. Run `FailSafe: Open Command Center (Browser Popout)`.
4. Run `FailSafe: Set Up Agent Governance`.
5. Set `FailSafe: Set Governance Mode` to `observe` first unless you already need strict gating.

## Governance Modes

| Mode | What it does | Use it when |
| --- | --- | --- |
| `observe` | records and shows activity without blocking | you are learning the system or auditing passively |
| `assist` | adds guidance and smart defaults with light friction | you want help without hard stops |
| `enforce` | blocks or gates work according to policy and intent state | you need strong governance controls |

## Audit a File

1. Open the file.
2. Run `FailSafe: Audit Current File`.
3. Read the verdict.
4. If the result is `WARN`, inspect details before proceeding.
5. If the result is `BLOCK` or `ESCALATE`, resolve the issue or move through the required approval path.

## Install Commit-Time Guardrails

Prerequisites:

- the workspace is a git repository
- `curl` is available on the machine
- FailSafe is running locally

Steps:

1. Run `FailSafe: Install Commit Hook`.
2. Confirm `.git/hooks/pre-commit` and `.git/failsafe-hook-token` were created.
3. Make a test commit.
4. If governance blocks the commit, resolve the reported reason and try again.

Removal:

1. Run `FailSafe: Remove Commit Hook`.
2. Confirm the hook and token were removed or restored to the prior chained state.

## Review Provenance

Use provenance when you need to know which agent likely authored or touched an artifact.

What to expect:

- attribution is ledger-based
- confidence may be lower when only terminal heuristics are available
- provenance is not a replacement for commit history or code review

## Use Break-Glass Safely

Break-glass is for urgent exceptions, not convenience.

1. Run `FailSafe: Activate Break-Glass Override`.
2. Enter a justification of at least 10 characters.
3. Choose the shortest duration that solves the urgent need.
4. Finish the required work.
5. Revoke the override early if the urgent window closes.

## Replay a Past Verdict

1. Find the ledger entry ID you want to inspect.
2. Run `FailSafe: Replay Verdict (Audit)`.
3. Enter the entry ID.
4. Compare the replay result with the original decision.

Use this when you suspect policy drift, artifact drift, or a regression in deterministic behavior.

## Roll Back with a Checkpoint

1. Identify the checkpoint you trust.
2. Run `FailSafe: Revert to Checkpoint (Time-Travel)`.
3. Enter the checkpoint ID.
4. Review the restored state and ledger evidence before continuing work.

## Troubleshooting

### Commit hook did not block anything

Check these first:

- FailSafe is running
- the workspace is the same repository where the hook was installed
- `curl` is available
- governance mode and intent state actually require blocking

### Provenance history is missing

Check these first:

- the file was saved while FailSafe was active
- the activity was in scope
- a detectable agent signal was present
- the local ledger is writable and not in a degraded path

### The UI shows metrics but they are unclear

Hover the metric labels in the Monitor or Command Center. `v4.3.0` expanded the bundled help text and ships this guide inside the extension package.

## Claim Map

| Claim | Status | Source |
| --- | --- | --- |
| `observe`, `assist`, and `enforce` are shipped governance modes | implemented | `package.json` |
| Commit hook install and removal commands are shipped | implemented | `package.json`, `src/extension/main.ts` |
| Verdict replay and break-glass flows are shipped commands | implemented | `src/extension/main.ts`, `package.json` |
