# FailSafe v3.6.1 (VS Code Marketplace Package)

Token Efficient Governance for AI-assisted development in VS Code/Cursor.

## UI Surfaces

- `FailSafe Sidebar` (compact)
- `FailSafe Operations Hub` (extended popout/editor)

## Current Functionality

- Save-time governance gate with intent-aware controls
- Sentinel monitoring and manual audit actions
- Operations Hub sections: Home, Run, Skills, Governance, Activity, Reports, Settings
- Skills panel with `Recommended`, `All Relevant`, `All Installed`, and `Other Available`
- Skill provenance display (creator/source/admission metadata)
- Checkpoint summaries and ledger-backed governance visibility

## Commands

| Command                                          | Description                              |
| ------------------------------------------------ | ---------------------------------------- |
| `FailSafe: Open Operations Hub (Browser Popout)` | Open extended governance hub             |
| `FailSafe: Open Operations Hub (Browser)`        | Browser launch alias                     |
| `FailSafe: Open Operations Hub (Editor Tab)`     | Open hub in editor tab                   |
| `FailSafe: Audit Current File`                   | Run manual file audit                    |
| `FailSafe: Secure Workspace`                     | Apply workspace hardening baseline       |
| `FailSafe: Panic Stop`                           | Stop active monitoring and guard actions |
| `FailSafe: Resume Monitoring`                    | Resume Sentinel monitoring               |

## Upcoming Features

- **Token Economics & ROI Dashboard**: Visually tracks token savings from context sync.
- **FailSafe Revert ("Time-Travel")**: One-click Git and context rollbacks for AI hallucinations.
- **CI/CD Pipeline Enforcer**: Headless pipeline validation for `failsafe_checkpoints`.
- **Shared "Core Axioms"**: Sync enterprise compliance rules automatically.
- **Visual Chain of Governance**: Trace the inter-agent communications visually.
- **Air-Gapped Judge Verification**: Leverage local LLMs for architecture audits.

## Links

- GitHub: https://github.com/MythologIQ/FailSafe
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe
- Open VSX: https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe

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
