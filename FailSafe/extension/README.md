[![Socket Badge](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.3.1?platform=universal)](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.3.1?platform=universal)

# MythologIQ FailSafe for VS Code

FailSafe is a local-first governance extension for AI-assisted development in VS Code and Cursor. It applies deterministic checks at the editor boundary, records decisions to a local ledger, and provides dedicated surfaces for audits, checkpoints, and agent governance.

**Current Release**: v4.3.1 (2026-03-03)

![FailSafe Banner](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/FailSafe/extension/FailSafe%20Banner.png)

## What's New in v4.3.1

### Security Hardening

- **SQL Injection Protection**: `SchemaVersionManager.hasColumn()` now validates table names against a strict whitelist before PRAGMA queries.
- **XSS Prevention**: `LivingGraphTemplate` and `RevertTemplate` now HTML-escape all dynamic values before rendering.
- **README Logo**: Corrected logo path to reference current FailSafe branding.

### Retained from v4.3.0

- **Pre-Commit Guard**: `FailSafe: Install Commit Hook` installs a git hook that calls FailSafe's authenticated `commit-check` API before commit.
- **AI Provenance Tracking**: saved artifacts can be traced through `PROVENANCE_RECORDED` ledger events and the provenance API route.
- **CI Governance Context Export**: release workflow exports `CHANGELOG.md`, `docs/SYSTEM_STATE.md`, and commit context as a downloadable artifact.
- **Bundled Help Docs**: packaged `COMPONENT_HELP.md` and `PROCESS_GUIDE.md` now ship inside the extension for offline operator reference.

### Under the Hood

- `governanceRoutes.ts` now serves `commit-check` and provenance lookup endpoints.
- `bootstrapGovernance.ts` wires `CommitGuard` and `ProvenanceTracker` into the active governance substrate.
- The release workflow uploads governance context without blocking the build when no exportable state is present.
- The quality sweep sealed IPv6 SSRF handling, removed dead code, and restored Razor compliance to `SentinelRagStore.ts`.

> **We'd love your review!** If FailSafe is useful to you, please leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe) or [Open VSX](https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe). Your feedback helps other developers discover FailSafe and directly shapes its roadmap. Bug reports and feature requests welcome on [GitHub Issues](https://github.com/MythologIQ/FailSafe/issues).

## Quick Start

1. Install FailSafe from the VS Code Marketplace or Open VSX.
2. Open a workspace in VS Code or Cursor.
3. Run `FailSafe: Open Command Center (Browser Popout)` or press `Ctrl+Alt+F`.
4. Run `FailSafe: Set Up Agent Governance` to inject governance rules into detected agents.
5. Run `FailSafe: Audit Current File` to generate a governance verdict for the active editor.
6. If you want commit-time guardrails, run `FailSafe: Install Commit Hook` inside a git workspace with `curl` available on the path.

## Bundled Documentation

- `docs/COMPONENT_HELP.md` - every shipped surface, metric group, and governance component in one place
- `docs/PROCESS_GUIDE.md` - setup, audits, commit hooks, provenance, break-glass, replay, rollback, and troubleshooting flows

## Core Commands

| Command                                          | Purpose                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `FailSafe: Open Command Center (Browser Popout)` | Open the main governance console in a browser window                       |
| `FailSafe: Open Command Center (Editor Tab)`     | Open the governance console in an editor tab                               |
| `FailSafe: Audit Current File`                   | Run a manual audit on the active file                                      |
| `FailSafe: Set Governance Mode`                  | Switch between `observe`, `assist`, and `enforce`                          |
| `FailSafe: Set Up Agent Governance`              | Detect supported agents and inject governance rules                        |
| `FailSafe: Install Commit Hook`                  | Add the authenticated pre-commit governance hook to the current repository |
| `FailSafe: Remove Commit Hook`                   | Remove the FailSafe pre-commit governance hook and token file              |
| `FailSafe: Activate Break-Glass Override`        | Start a time-limited emergency override                                    |
| `FailSafe: Replay Verdict (Audit)`               | Re-run a prior governance decision for comparison                          |
| `FailSafe: Revert to Checkpoint (Time-Travel)`   | Restore a recorded governance checkpoint                                   |

## What FailSafe Does

FailSafe separates system awareness from system control.

The Monitor provides real-time visibility into system health, governance posture, and operational risk. The Command Center is the primary control surface for planning, audits, checkpoints, and agent governance.

- Save-time intent gate that can block writes outside an active intent
- Sentinel daemon for file-change audits in `heuristic`, `llm-assisted`, and `hybrid` modes
- SOA ledger with local audit history and checkpoint summaries
- MCP server support for external tools that need audit and ledger hooks

## QoreLogic: The Governance Layer

QoreLogic is the deterministic governance engine that enforces safety policies at the editor boundary. It operates on a fundamental principle: **governance decisions are made by code, not by asking an LLM to follow rules.**

### Prompt Guidelines vs. Deterministic Governance

| Aspect             | Prompt-Based Safety                     | QoreLogic Deterministic Governance   |
| ------------------ | --------------------------------------- | ------------------------------------ |
| **Decision Maker** | LLM interprets rules                    | TypeScript code executes rules       |
| **Consistency**    | Varies with context, temperature, model | Identical output for identical input |
| **Auditability**   | Opaque reasoning chain                  | Explicit code path, logged decisions |
| **Bypass Risk**    | LLM can ignore or reinterpret           | Code cannot be persuaded             |
| **Speed**          | Network latency + inference             | Sub-millisecond local execution      |

### How QoreLogic Works

1. **Risk Classification** — Files are classified as L1 (low), L2 (medium), or L3 (high) risk based on:
   - File path triggers (e.g., `auth/`, `payment/`, `credential` → L3)
   - Content triggers (e.g., `DROP TABLE`, `api_key`, `private_key` → L3)
   - Configurable via `.failsafe/config/policies/risk_grading.json`

2. **Policy Evaluation** — Each risk grade has deterministic requirements:
   - **L1**: Heuristic check, 10% sampling, auto-approve
   - **L2**: Full Sentinel pass, no auto-approve
   - **L3**: Formal verification + human approval required

3. **Ledger Recording** — Every governance decision is recorded to an append-only SOA ledger with:
   - Agent identity and trust score
   - Artifact path and risk grade
   - Timestamp and decision rationale

4. **Trust Dynamics** — Agent trust scores evolve based on outcomes:
   - Approved L3 actions → trust increase
   - Rejected or failed actions → trust decrease
   - Trust scores influence future routing decisions

### Why Deterministic Matters

When an LLM is asked to enforce safety rules, it can:

- Reinterpret rules based on context
- Produce inconsistent decisions across similar inputs
- Be influenced by prompt engineering attacks

QoreLogic avoids these risks by executing deterministic TypeScript code at the governance boundary. The policy engine uses simple string matching and path analysis—no LLM inference required for governance decisions.

**Example**: A file containing `api_key` will always trigger L3 classification. No prompt can persuade the code to ignore this trigger.

## Safety Alert

```
FailSafe Blocked: AXIOM 1 VIOLATION: No active Intent exists.
Remediation: Create an Intent before modifying files.

[Create Intent] [View Active Intent]
```

## Features

### 1. Governance Modes

FailSafe now supports three governance modes to match your workflow needs:

| Mode        | Behavior                                                           | Best For                         |
| ----------- | ------------------------------------------------------------------ | -------------------------------- |
| **Observe** | No blocking, just visibility and logging. Zero friction.           | New users, exploration, learning |
| **Assist**  | Smart defaults, auto-intent creation, gentle prompts. Recommended. | Most development workflows       |
| **Enforce** | Full control, intent-gated saves, L3 approvals.                    | Compliance, regulated industries |

Switch modes via:

- Command: `FailSafe: Set Governance Mode`
- Settings: `failsafe.governance.mode`

### 2. Save-Time Governance Gate

FailSafe evaluates save operations against the active Intent and can block writes when no active Intent exists or when a file is out of scope.

### 2. Sentinel Monitoring and Audits

- File watcher queues audits for code changes
- Manual audits via command
- Modes: `heuristic`, `llm-assisted`, `hybrid` (LLM uses the configured endpoint)

### 3. SOA Ledger and L3 Queue

- Append-only ledger database for audit entries
- L3 approvals surfaced in the UI

### 4. UI Screens

- FailSafe Monitor (compact view)
- FailSafe Command Center (extended popout/editor view)
- Skills view now includes `Recommended`, `All Relevant`, `All Installed`, and `Other Available` to keep full skill visibility.

### FailSafe Monitor UI (v3.5.2)

![FailSafe Monitor UI v3.5.2](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/FailSafe/extension/media/sidebar-ui-3.5.2.png)

### 5. Command Center UX (UI-02 + Extended Popout)

- Compact `FailSafe Monitor` webpanel (`UI-02`) provides phase status, prioritized feature counters, Sentinel state, and workspace health at-a-glance.
- `Open FailSafe Command Center` opens the extended popout console for deeper workflow views (Home, Run, Skills, Governance, Activity, Reports, Settings).
- Branding is consistent across shell surfaces, including FailSafe icon usage in header and favicon contexts.
- Optional external Qore runtime integration can display live runtime state, policy version, endpoint, and latency in the compact monitor.

### UI Positioning Model

- Monitor and Command Center roles are defined in the Solution summary above; this model maps those roles to FailSafe architecture.
- Narrative alignment:
  - `Genesis` -> Build
  - `QoreLogic` -> Govern
  - `Sentinel` -> Watch
  - `Command Center` -> Build + Govern
  - `Monitor` -> Watch

### 6. Skill Governance and Provenance

- Installed skills are discovered from FailSafe workspace roots (`FailSafe/VSCode/skills`, `.agent/skills`, `.github/skills`) with project-first precedence.
- Phase-aware relevance ranking returns `recommended`, `allRelevant`, and `otherAvailable` groupings.
- Skill metadata includes provenance fields (creator, source repo/path, source type/priority, admission state, trust tier, version pin).
- `SOURCE.yml` metadata is ingested to preserve attribution and authorship for bundled and imported skills.

### 7. Checkpoint Reliability Backbone

- Checkpoint events are stored in a local SQLite ledger (`failsafe_checkpoints`) with typed events and parent-chain integrity checks.
- Hub APIs expose checkpoint summaries and recent checkpoint history for UI transparency.

### 8. Feedback Capture

- Generate, view, and export feedback snapshots

### 9. QoreLogic Propagation

Supported via internal sync flows when enabled by workspace governance configuration.

### 10. Break-Glass Protocol (v4.1.0)

Emergency governance overrides for time-sensitive situations. Activate via `FailSafe: Activate Break-Glass Override` with a justification (min 10 chars) and duration (15–240 minutes). Auto-reverts on expiry. Full audit trail recorded in the SOA ledger.

### 11. Verdict Replay (v4.1.0)

Re-execute past governance decisions for audit verification via `FailSafe: Replay Verdict (Audit)`. Compares current policy hash and artifact hash against the original decision to detect drift.

### 12. Commit Governance (v4.3.0)

- `FailSafe: Install Commit Hook` writes a thin hook client and per-session token into `.git/`.
- The hook calls `GET /api/v1/governance/commit-check` and only enforces the server's `allow` decision.
- If the local API is unreachable or no token is present, the hook fails open by design. This is an operator guardrail, not a hard security boundary.

### 13. AI Provenance Tracking (v4.3.0)

- Save events can emit `PROVENANCE_RECORDED` ledger entries with artifact path, detected agent type, confidence, and active intent.
- Provenance is observational. It does not mutate source files or inject comments.
- History is queryable through the governance API and visible in local ledger data.

### 14. Multi-Agent Governance Fabric (v4.2.0)

FailSafe detects and governs multiple AI coding assistants in your workspace:

- **Runtime Detection** — Identifies Claude CLI, Copilot, Codex CLI, and Agent Teams via terminal and config scanning.
- **Per-Agent Config Injection** — Writes governance rules into each agent's native format (`.github/copilot-instructions.md`, `.kilocode/rules/`, `codex.md`, `.claude/agents/`).
- **Governance Ceremony** — Single command (`FailSafe: Set Up Agent Governance`) to inject or remove governance across all detected agents.
- **Coverage Dashboard** — Console view showing which agents are detected, governed, and compliant.
- **First-Run Onboarding** — Guides new users through multi-agent governance setup on first activation.

### 15. Intent Schema v2 (v4.2.0)

Intents now carry `schemaVersion`, `agentIdentity` (which agent created the intent and via which workflow), and `planId` references. Legacy v1 intents are auto-migrated on read.

## Commands

| Command                                        | Description                                   |
| ---------------------------------------------- | --------------------------------------------- |
| FailSafe: Open Command Center (Browser Popout) | Main governance popout                        |
| FailSafe: Open Command Center (Browser)        | Browser launch alias                          |
| FailSafe: Open Command Center (Editor Tab)     | Compact monitor in editor                     |
| FailSafe: Token Economics Dashboard            | Open token economics and ROI dashboard        |
| FailSafe: Audit Current File                   | Manual file audit                             |
| FailSafe: Secure Workspace                     | Apply workspace hardening baseline            |
| FailSafe: Panic Stop                           | Stop active monitoring and guard actions      |
| FailSafe: Resume Monitoring                    | Resume Sentinel monitoring                    |
| FailSafe: Set Governance Mode                  | Switch between Observe/Assist/Enforce         |
| FailSafe: Open Project Overview                | Project-level governance summary              |
| FailSafe: Open Risk Register                   | Open the risk tracking panel                  |
| FailSafe: Add Risk                             | Add a new risk entry                          |
| FailSafe: Revert to Checkpoint (Time-Travel)   | Revert workspace to a governance checkpoint   |
| FailSafe: Activate Break-Glass Override        | Emergency time-limited governance bypass      |
| FailSafe: Revoke Break-Glass Override          | Manually revoke an active break-glass session |
| FailSafe: Replay Verdict (Audit)               | Re-execute a past governance decision         |
| FailSafe: Undo Last Attempt                    | Rollback to a specific checkpoint             |
| FailSafe: Set Up Agent Governance              | Inject governance into detected AI agents     |

## Configuration

Open Settings and search for `FailSafe`:

| Setting                                           | Default                          | Description                                                        |
| ------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `failsafe.governance.mode`                        | `observe`                        | Governance mode: observe, assist, or enforce                       |
| `failsafe.genesis.livingGraph`                    | `true`                           | Enable Living Graph visualization                                  |
| `failsafe.genesis.cortexOmnibar`                  | `true`                           | Enable Cortex Omnibar                                              |
| `failsafe.genesis.theme`                          | `starry-night`                   | Genesis UI theme                                                   |
| `failsafe.sentinel.enabled`                       | `true`                           | Enable Sentinel monitoring                                         |
| `failsafe.sentinel.mode`                          | `heuristic`                      | Sentinel operating mode                                            |
| `failsafe.sentinel.localModel`                    | `phi3:mini`                      | Ollama model for LLM-assisted mode                                 |
| `failsafe.sentinel.ollamaEndpoint`                | `http://localhost:11434`         | Ollama API endpoint                                                |
| `failsafe.sentinel.ragEnabled`                    | `true`                           | Persist Sentinel observations to local RAG store                   |
| `failsafe.qorelogic.ledgerPath`                   | `.failsafe/ledger/soa_ledger.db` | Ledger database path                                               |
| `failsafe.qorelogic.strictMode`                   | `false`                          | Block on all warnings                                              |
| `failsafe.qorelogic.l3SLA`                        | `120`                            | L3 response SLA (seconds)                                          |
| `failsafe.qorelogic.externalRuntime.enabled`      | `false`                          | Enable external FailSafe-Qore runtime integration in monitor       |
| `failsafe.qorelogic.externalRuntime.baseUrl`      | `http://127.0.0.1:7777`          | Base URL for external FailSafe-Qore runtime API                    |
| `failsafe.qorelogic.externalRuntime.apiKey`       | ``                               | Optional API key used for runtime calls                            |
| `failsafe.qorelogic.externalRuntime.apiKeyEnvVar` | `QORE_API_KEY`                   | Environment variable fallback for runtime API key                  |
| `failsafe.qorelogic.externalRuntime.timeoutMs`    | `4000`                           | Timeout for runtime API calls in milliseconds                      |
| `failsafe.bootstrap.autoInstallGit`               | `true`                           | Auto-install Git (if missing) and initialize repo during bootstrap |
| `failsafe.feedback.outputDir`                     | `.failsafe/feedback`             | Feedback output directory                                          |

If `.failsafe/config/sentinel.yaml` exists, it overrides settings. The initializer seeds it with `mode: hybrid` unless you change it.

The `v4.3.1` release also introduces commit-time governance through the local FailSafe API on `http://127.0.0.1:7777` when the optional git hook is installed.

## Workspace Files

FailSafe seeds a `.failsafe/` directory in your workspace for configuration, ledger, and feedback output. The primary workspace config is `.failsafe/config/sentinel.yaml`. Optional policy overrides can be placed at:

- `.failsafe/config/policies/risk_grading.json`
- `.failsafe/config/policies/citation_policy.json`

## Privacy

- Heuristic mode runs locally
- LLM-assisted and hybrid modes call the configured endpoint

## Requirements

- VS Code 1.90.0 or later
- Node.js 18+ (for development)
- `curl` (required only if you install the commit hook)
- Ollama (optional, for LLM-assisted mode)

> **v4.3.1 "Security Hardening"** - SQL injection protection, XSS prevention, and README logo correction now harden the governance surfaces for safer operation.

> **We'd love your review!** If FailSafe is useful to you, please leave a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe) or [Open VSX](https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe). Your feedback helps other developers discover FailSafe and directly shapes its roadmap. Bug reports and feature requests welcome on [GitHub Issues](https://github.com/MythologIQ/FailSafe/issues).

## Contributing

Contributions are welcome via GitHub issues and pull requests.

## Terms and Conditions (Beta)

FailSafe is a beta product. It is provided "as is" without warranties of any kind, and may contain bugs, incomplete features, or breaking changes.

By using this software, you acknowledge that it is experimental and agree to use it at your own risk. MythologIQ is not liable for any loss of data, downtime, or other damages arising from use of this beta release.

## License

MIT - See `LICENSE`.

## Links

- GitHub: https://github.com/MythologIQ/FailSafe
- Issues: https://github.com/MythologIQ/FailSafe/issues
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe
- Open VSX: https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe
- Documentation: FAILSAFE_SPECIFICATION.md

## Publishing

To publish a new version of FailSafe, use the automated Python script which handles staging, artifact generation, and multi-marketplace upload:

```bash
# From workspace root
python FailSafe/build/publish.py
```

**Prerequisites:**

- `deploy.ps1` and `build-release.ps1` must be present in `FailSafe/build/`.
- Valid tokens must be present in `.claude/.vsce-token` and `.claude/.ovsx-token`.

<!-- CHECKPOINT-DEEP-DIVE:START -->

## UI Snapshot

![FailSafe UI Preview](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/FailSafe/ScreenShots/UI-Preview.png)

## Checkpoint Integrity and Local Memory

FailSafe tracks more than Git state. It records governance checkpoints as signed metadata records, then stores Sentinel observations in a local retrieval store so operators can recover the _what_, _why_, and _how_ of runtime decisions.

### Process Reality

1. Git readiness is enforced at bootstrap (`ensureGitRepositoryReady`), including optional auto-install and `git init` when needed.
2. Governance events are checkpointed into `failsafe_checkpoints` with run/phase/status context and deterministic hashes.
3. Each checkpoint carries `git_hash`, `payload_hash`, `entry_hash`, and `prev_hash` so chain integrity can be recomputed.
4. Hub and API surfaces expose both summary and recent checkpoint records for operational visibility.
5. Sentinel writes local memory records to `.failsafe/rag/sentinel-rag.db` (or JSONL fallback), including `payload_json`, `metadata_json`, and retrieval text.

### Technical Advantages

- Tamper evidence via hash-chained checkpoint records.
- Git-linked governance state for repository-correlated audit trails.
- Local-first memory retention for security and low-latency recall.
- Deterministic fallback paths when SQLite is unavailable.

### Claim-to-Source Map

| Claim                                                                                       | Status      | Source                                                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v4.3.0` ships commit hook install/remove commands.                                         | implemented | `FailSafe/extension/src/extension/main.ts`, `FailSafe/extension/package.json`                                                                                    |
| `v4.3.0` ships `commit-check` and provenance API routes.                                    | implemented | `FailSafe/extension/src/api/routes/governanceRoutes.ts`                                                                                                          |
| `v4.3.0` exports governance context in release CI.                                          | implemented | `.github/workflows/release.yml`, `tools/export-governance-context.sh`                                                                                            |
| Bundled operator docs ship inside the VSIX.                                                 | implemented | `FailSafe/extension/.vscodeignore`, `FailSafe/extension/docs/COMPONENT_HELP.md`, `FailSafe/extension/docs/PROCESS_GUIDE.md`                                      |
| Checkpoints persist in `failsafe_checkpoints` with typed governance fields.                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1533-1556`                                                                                                      |
| Checkpoint records include hash-chain material (`payload_hash`, `entry_hash`, `prev_hash`). | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1689-1695`                                                                                                      |
| Each checkpoint captures current Git head/hash context.                                     | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1647`                                                                                                           |
| Checkpoint history and chain validity are exposed over API.                                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:331`                                                                                                            |
| Hub snapshot includes `checkpointSummary` and `recentCheckpoints`.                          | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:742-743`                                                                                                        |
| Sentinel local RAG persists observation payload + metadata + retrieval text.                | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:60-81`                                                                                                      |
| Sentinel RAG can fall back to JSONL when SQLite is unavailable.                             | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:85-91`                                                                                                      |
| RAG writes are controlled by `failsafe.sentinel.ragEnabled` (default `true`).               | implemented | `FailSafe/extension/src/sentinel/SentinelDaemon.ts:339-341`                                                                                                      |
| Checkpoint and Sentinel RAG tables are independent (no foreign-key link).                   | **false**   | Confirmed: `failsafe_checkpoints` (ledger DB) and `sentinel_observations` (RAG DB) are in separate databases with no shared keys. `evidenceRefs` is always `[]`. |

<!-- CHECKPOINT-DEEP-DIVE:END -->
