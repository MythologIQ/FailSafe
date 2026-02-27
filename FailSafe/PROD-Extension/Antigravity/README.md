# FailSafe v4.0.0 (OpenVSX Package)

AI Governance & Safety for AI-assisted development in Antigravity-compatible editors.

## UI Surfaces

- `FailSafe Monitor` (compact sidebar)
- `FailSafe Command Center` (extended popout/editor)

## What's New in v4.0.0

- **Token Economics Dashboard**: Real-time token usage, RAG savings, and cost-per-action metrics.
- **Governance Modes**: Observe, Assist, or Enforce — match governance to your workflow.
- **Chat Participant**: `@failsafe` in VS Code chat for governance queries.
- **Risk Register & Transparency Stream**: Sidebar panels for risk tracking and event visibility.

## Current Functionality

- Save-time governance gate with intent-aware controls
- Sentinel monitoring and manual audit actions
- Command Center sections: Home, Run, Skills, Governance, Activity, Reports, Settings
- Skills panel with `Recommended`, `All Relevant`, `All Installed`, and `Other Available`
- Skill provenance display (creator/source/admission metadata)
- Checkpoint summaries and ledger-backed governance visibility
- Token Economics dashboard with daily aggregates and cost tracking

## Commands

| Command                                            | Description                              |
| -------------------------------------------------- | ---------------------------------------- |
| `FailSafe: Open Command Center (Browser Popout)`   | Open extended governance hub             |
| `FailSafe: Open Command Center (Browser)`          | Browser launch alias                     |
| `FailSafe: Open Command Center (Editor Tab)`       | Open hub in editor tab                   |
| `FailSafe: Token Economics Dashboard`              | Open token economics and ROI dashboard   |
| `FailSafe: Audit Current File`                     | Run manual file audit                    |
| `FailSafe: Secure Workspace`                       | Apply workspace hardening baseline       |
| `FailSafe: Set Governance Mode`                    | Switch between Observe/Assist/Enforce    |
| `FailSafe: Panic Stop`                             | Stop active monitoring and guard actions |
| `FailSafe: Resume Monitoring`                      | Resume Sentinel monitoring               |

## Getting Started

1. Install FailSafe from Open VSX.
2. Open the Command Palette (`Ctrl+Shift+P`) and run `FailSafe: Open Command Center (Browser Popout)`.
3. Explore the Token Economics Dashboard via `FailSafe: Token Economics Dashboard`.
4. Data is stored locally in `.failsafe/` — no external services required.

> **Enjoying FailSafe?** Please leave a review on [Open VSX](https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe). Your feedback helps other developers discover FailSafe.

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
| Checkpoint rows are directly foreign-key linked to Sentinel RAG rows.                       | unknown     | No explicit join/foreign key in `RoadmapServer` checkpoint insert (`FailSafe/extension/src/roadmap/RoadmapServer.ts:1537`) or Sentinel RAG insert (`FailSafe/extension/src/sentinel/SentinelRagStore.ts:99`). |

<!-- CHECKPOINT-DEEP-DIVE:END -->
