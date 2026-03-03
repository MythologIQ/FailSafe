[![Socket Badge](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.2.1?platform=universal)](https://badge.socket.dev/openvsx/package/mythologiq.mythologiq-failsafe/4.2.1?platform=universal)

# Claude CLI - Source

Extension source code for Claude CLI environment.

## Structure

```
Claude/
├── commands/             # v2.0.0 Governance skills (matches .claude/commands/)
│   ├── ql-repo-audit.md
│   ├── ql-repo-scaffold.md
│   ├── ql-repo-release.md
│   ├── agents/
│   │   ├── ql-technical-writer.md
│   │   └── ql-ux-evaluator.md
│   └── references/
│       └── github-api-helpers.md
│
├── Genesis/              # Bootstrap & initialization commands
│   ├── workflows/
│   │   ├── ql-bootstrap.md
│   │   ├── ql-help.md
│   │   └── ql-status.md
│   └── agents/
│       ├── ql-governor.md
│       ├── ql-judge.md
│       └── ql-specialist.md
│
├── Qorelogic/            # Core governance commands & agents
│   ├── workflows/
│   │   ├── ql-plan.md
│   │   ├── ql-audit.md
│   │   ├── ql-implement.md
│   │   ├── ql-refactor.md
│   │   ├── ql-validate.md
│   │   ├── ql-substantiate.md
│   │   └── ql-organize.md
│   └── agents/
│       ├── ql-governor-persona.md
│       ├── ql-judge-persona.md
│       └── ql-specialist-persona.md
│
└── Sentinel/             # Monitoring & enforcement
    └── workflows/
```

## Constraints

**Claude-Specific**:

- No description length limits
- XML-style skill tags supported
- `.md` file extension

See: `../targets/Claude/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/Claude/`

## Source Format

Files in this directory are **Claude-native** format (Markdown with XML skill tags).

No transformation needed - these are ready for direct deployment.

<!-- CHECKPOINT-DEEP-DIVE:START -->
## UI Snapshot

![FailSafe UI Preview](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/FailSafe/ScreenShots/UI-Preview.png)

## Checkpoint Integrity and Local Memory

FailSafe tracks more than Git state. It records governance checkpoints as signed metadata records, then stores Sentinel observations in a local retrieval store so operators can recover the *what*, *why*, and *how* of runtime decisions.

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

| Claim | Status | Source |
| --- | --- | --- |
| Checkpoints persist in `failsafe_checkpoints` with typed governance fields. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1381` |
| Checkpoint records include hash-chain material (`payload_hash`, `entry_hash`, `prev_hash`). | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1395` |
| Each checkpoint captures current Git head/hash context. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1494` |
| Checkpoint history and chain validity are exposed over API. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:265` |
| Hub snapshot includes `checkpointSummary` and `recentCheckpoints`. | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:590` |
| Sentinel local RAG persists observation payload + metadata + retrieval text. | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:61` |
| Sentinel RAG can fall back to JSONL when SQLite is unavailable. | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:89` |
| RAG writes are controlled by `failsafe.sentinel.ragEnabled` (default `true`). | implemented | `FailSafe/extension/src/sentinel/SentinelDaemon.ts:341` |
| Checkpoint and Sentinel RAG tables are independent (no foreign-key link). | **false** | Confirmed: `failsafe_checkpoints` (ledger DB) and `sentinel_observations` (RAG DB) are in separate databases with no shared keys. `evidenceRefs` is always `[]`. |

<!-- CHECKPOINT-DEEP-DIVE:END -->
