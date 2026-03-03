# FailSafe Component Help

Audience: operators using the packaged VS Code extension.

Scope: shipped UI surfaces, governance components, and the metrics you see in normal use.

## At a Glance

| Component | Purpose | When to use it |
| --- | --- | --- |
| FailSafe Monitor | Live status for Sentinel, trust, queues, and recent verdicts | Keep this open during active work |
| Command Center | Main control surface for workflows, governance, skills, and reports | Use for setup, review, and deeper inspection |
| Risk Register | Structured list of known project risks | Track non-transient risks and mitigation work |
| Transparency Stream | Event feed of governance activity | Review what FailSafe just did and why |
| SOA Ledger | Local audit trail | Verify decisions, provenance, and historical state |
| Commit Guard | Pre-commit governance checkpoint | Add commit-time guardrails to git workflows |
| Provenance Tracker | Ledgered AI authorship attribution | Review which agent likely touched which artifact |
| Break-Glass | Time-limited override path | Use only for urgent work that cannot wait |
| Checkpoints | Recovery and rollback substrate | Return to a known-good state after drift or failure |

## UI Surfaces

### FailSafe Monitor

The Monitor is the compact operational surface. It is for awareness, not deep workflow management.

Use it to answer four questions quickly:

1. Is Sentinel healthy?
2. Is governance permissive or strict right now?
3. Are high-risk items waiting for review?
4. Did the last verdict pass, warn, block, or escalate?

### Command Center

The Command Center is the primary control plane. Open it when you need to change state, inspect runs, review skills, or work through governance decisions.

Prefer the Command Center over the Monitor when you need action, history, or context.

### Risk Register

The Risk Register is for durable project risks, not transient save-time warnings.

Add an entry when the issue needs ownership, mitigation, or follow-up beyond the current editing session.

### Transparency Stream

The Transparency Stream shows recent governance events as they happen.

Use it when a save, audit, mode change, override, or workflow action behaved differently than expected.

## Governance Components

### Sentinel

Sentinel evaluates file activity and produces verdicts. It can run in `heuristic`, `llm-assisted`, or `hybrid` mode.

- `PASS`: the change cleared the current checks.
- `WARN`: the change is allowed but worth review.
- `BLOCK`: the change should not proceed as-is.
- `ESCALATE`: human review is required.
- `QUARANTINE`: the agent or session is isolated pending review.

### QoreLogic

QoreLogic is the deterministic governance layer. It decides by code, not by asking an LLM to follow policy.

Use QoreLogic settings to control mode, thresholds, and runtime behavior.

### SOA Ledger

The ledger is the local source of truth for governance history. It records decisions, overrides, replay activity, provenance, and release context.

If a claim cannot be traced to the ledger or source code, treat it as unverified.

## Release-Time Components

### Commit Guard

Commit Guard installs a thin pre-commit script in `.git/hooks/` and a per-session token in `.git/`.

Important operator notes:

- It calls FailSafe's local `commit-check` API.
- It fails open if the local API is unavailable or the token is missing.
- It is a workflow guardrail, not a hard security boundary.
- `curl` must be available on the machine for the hook to work.

### Provenance Tracker

Provenance tracking records likely AI authorship to the ledger when files are saved.

Important operator notes:

- It is observational.
- It does not write comments into source files.
- Confidence reflects the quality of the attribution signal available at save time.
- Provenance is filtered to relevant, in-scope activity.

### Governance Context Export

The release workflow exports public governance context for CI artifacts.

This is for release review, not runtime enforcement. It packages public artifacts such as `CHANGELOG.md`, `docs/SYSTEM_STATE.md`, and a commit summary.

## Metrics Reference

| Metric | Meaning | Action |
| --- | --- | --- |
| Files Watched | Files Sentinel is actively monitoring | Sudden drops suggest scope or workspace changes |
| Queue Depth | Pending save events awaiting review | Long queues suggest review load or backlog |
| Events Processed | Total save events handled this session | Use as a rough activity indicator |
| Avg Trust | Mean trust score across recorded agents | Falling values suggest recent governance failures |
| L3 Queue | High-risk items waiting for human approval | Review before allowing regulated or critical work |
| Cache Hits/Misses | Fingerprint and novelty reuse vs recompute | Use for performance inspection, not safety decisions |

## Claim Map

| Claim | Status | Source |
| --- | --- | --- |
| Commit Guard ships in `v4.3.0` | implemented | `src/extension/main.ts`, `package.json` |
| Provenance is ledger-based, not file-injected | implemented | `src/governance/ProvenanceTracker.ts` |
| Governance context export ships in release workflow | implemented | `tools/export-governance-context.sh`, `.github/workflows/release.yml` |
