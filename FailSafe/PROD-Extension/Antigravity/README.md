[![Socket Badge](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.4.0?platform=universal)](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.4.0?platform=universal)

# FailSafe v4.4.0 (OpenVSX Package)

FailSafe is a local-first governance extension for AI-assisted development distributed through Open VSX. It applies deterministic checks at the editor boundary, records decisions to a local ledger, and provides dedicated surfaces for audits, checkpoints, and agent governance.

## What's New in v4.2.0

### Major Additions

- **Multi-Agent Governance Fabric**: runtime detection and governance injection for Claude CLI, Copilot, Codex CLI, and agent-team workflows
- **Governance Ceremony**: one command to inject or remove governance files across detected agents
- **First-Run Onboarding**: setup flow for workspace-vs-global agent governance coverage
- **Agent Coverage Dashboard**: console route for detection, injection status, and compliance visibility
- **Undo Last Attempt**: checkpoint-based rollback with integrity verification and user feedback
- **Discovery Phase Governance**: DRAFT to CONCEIVED promotion gate with ledger-tagged discovery milestones
- **Terminal Correlator**: terminal-to-agent mapping for cross-agent audit correlation
- **Workflow Run Model**: run, stage, gate, claim, and evidence contracts aligned to governance lifecycle
- **Agent Teams Detector**: generated governance overseer peer agent for `.claude/agents/`
- **AGENTS.md Injection**: repo-root governance instructions for Copilot and Codex consumers
- **Intent Schema v2**: `schemaVersion`, `agentIdentity`, and `planId` with migration from v1
- **Verdict Replay Batch**: bulk replay support with timing-safe hash comparison
- **CheckpointManager**: bridge layer between QoreLogic ledger and Sentinel checkpoint metrics

### Under the Hood

- `SystemRegistry` expanded with broader detection fields and exported types
- `FrameworkSync` upgraded for per-agent config delegation
- `RoadmapServer` and `QoreLogicSubstrate` extended for registry-aware orchestration
- Event taxonomy expanded with discovery tracking markers

## What's New in v4.4.0

### Release Synchronization

- Package metadata and release markers aligned with core `v4.4.0`.
- Marketplace-facing documentation updated for current Mindmap/Console terminology.
- Changelog and README version surfaces now match published artifact intent.

## Current Functionality

- Save-time governance gate with intent-aware controls
- Sentinel monitoring and manual audit actions
- Command Center sections: Home, Run, Skills, Governance, Activity, Reports, Settings
- Skills panel with `Recommended`, `All Relevant`, `All Installed`, and `Other Available`
- Skill provenance display (creator/source/admission metadata)
- Checkpoint summaries and ledger-backed governance visibility
- Token Economics dashboard with daily aggregates and cost tracking
- Multi-agent detection and governance injection
- Break-glass emergency overrides with audit trail

## Commands

| Command                                            | Description                                   |
| -------------------------------------------------- | --------------------------------------------- |
| `FailSafe: Open Command Center (Browser Popout)`   | Open extended governance hub                  |
| `FailSafe: Open Command Center (Browser)`          | Browser launch alias                          |
| `FailSafe: Open Command Center (Editor Tab)`       | Open hub in editor tab                        |
| `FailSafe: Token Economics Dashboard`              | Open token economics and ROI dashboard        |
| `FailSafe: Audit Current File`                     | Run manual file audit                         |
| `FailSafe: Secure Workspace`                       | Apply workspace hardening baseline            |
| `FailSafe: Set Governance Mode`                    | Switch between Observe/Assist/Enforce         |
| `FailSafe: Panic Stop`                             | Stop active monitoring and guard actions      |
| `FailSafe: Resume Monitoring`                      | Resume Sentinel monitoring                    |
| `FailSafe: Activate Break-Glass Override`          | Emergency time-limited governance bypass      |
| `FailSafe: Revoke Break-Glass Override`            | Manually revoke an active break-glass session |
| `FailSafe: Replay Verdict (Audit)`                 | Re-execute a past governance decision         |
| `FailSafe: Revert to Checkpoint (Time-Travel)`     | Revert workspace to a governance checkpoint   |
| `FailSafe: Undo Last Attempt`                      | Rollback to a specific checkpoint             |
| `FailSafe: Set Up Agent Governance`                | Inject governance into detected AI agents     |

## Getting Started

1. Install FailSafe from Open VSX.
2. Open the Command Palette (`Ctrl+Shift+P`) and run `FailSafe: Open Command Center (Browser Popout)`.
3. Run `FailSafe: Set Up Agent Governance` to inject governance rules into detected agents.
4. Run `FailSafe: Audit Current File` to generate a governance verdict for the active editor.
5. Data is stored locally in `.failsafe/`.

## Links

- GitHub: https://github.com/MythologIQ/FailSafe
- Open VSX: https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe

## License

MIT

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

| Claim                                                                                       | Status      | Source                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkpoints persist in `failsafe_checkpoints` with typed governance fields.                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1381`                                                                                                                                                        |
| Checkpoint records include hash-chain material (`payload_hash`, `entry_hash`, `prev_hash`). | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1395`                                                                                                                                                        |
| Each checkpoint captures current Git head/hash context.                                     | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1494`                                                                                                                                                        |
| Checkpoint history and chain validity are exposed over API.                                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:265`                                                                                                                                                         |
| Hub snapshot includes `checkpointSummary` and `recentCheckpoints`.                          | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:590`                                                                                                                                                         |
| Sentinel local RAG persists observation payload + metadata + retrieval text.                | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:61`                                                                                                                                                      |
| Sentinel RAG can fall back to JSONL when SQLite is unavailable.                             | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:89`                                                                                                                                                      |
| RAG writes are controlled by `failsafe.sentinel.ragEnabled` (default `true`).               | implemented | `FailSafe/extension/src/sentinel/SentinelDaemon.ts:341`                                                                                                                                                       |
| Checkpoint and Sentinel RAG tables are independent (no foreign-key link). | **false** | Confirmed: `failsafe_checkpoints` (ledger DB) and `sentinel_observations` (RAG DB) are in separate databases with no shared keys. `evidenceRefs` is always `[]`. |

<!-- CHECKPOINT-DEEP-DIVE:END -->
