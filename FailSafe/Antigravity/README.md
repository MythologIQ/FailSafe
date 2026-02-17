# Antigravity (Gemini) - Source

Extension source code for Gemini/Antigravity AI environment.

## Structure

```
Antigravity/
├── Genesis/              # Bootstrap & initialization workflows
│   ├── workflows/
│   │   ├── ql-bootstrap.md
│   │   ├── ql-help.md
│   │   └── ql-status.md
│   └── templates/
│
├── Qorelogic/            # Core governance workflows & agents
│   ├── workflows/
│   │   ├── ql-plan.md
│   │   ├── ql-audit.md
│   │   ├── ql-implement.md
│   │   ├── ql-refactor.md
│   │   ├── ql-validate.md
│   │   ├── ql-substantiate.md
│   │   └── ql-organize.md
│   ├── agents/
│   │   ├── ql-governor-persona.md
│   │   ├── ql-judge-persona.md
│   │   └── ql-specialist-persona.md
│   └── policies/
│
└── Sentinel/             # Monitoring & enforcement
    └── workflows/
```

## Constraints

**Antigravity-Specific**:

- Workflow descriptions ≤ 250 characters
- YAML frontmatter format
- `.md` file extension

See: `../targets/Antigravity/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/Antigravity/`

## Source Format

Files in this directory are **Antigravity-native** format (Markdown with YAML frontmatter, ≤250 char descriptions).

No transformation needed - these are ready for direct deployment.

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

| Claim                                                                                       | Status      | Source                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkpoints persist in `failsafe_checkpoints` with typed governance fields.                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1534`                                                                                                                                                         |
| Checkpoint records include hash-chain material (`payload_hash`, `entry_hash`, `prev_hash`). | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1692`                                                                                                                                                         |
| Each checkpoint captures current Git head/hash context.                                     | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:1647`                                                                                                                                                         |
| Checkpoint history and chain validity are exposed over API.                                 | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:331`                                                                                                                                                          |
| Hub snapshot includes `checkpointSummary` and `recentCheckpoints`.                          | implemented | `FailSafe/extension/src/roadmap/RoadmapServer.ts:742`                                                                                                                                                          |
| Sentinel local RAG persists observation payload + metadata + retrieval text.                | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:60`                                                                                                                                                       |
| Sentinel RAG can fall back to JSONL when SQLite is unavailable.                             | implemented | `FailSafe/extension/src/sentinel/SentinelRagStore.ts:88`                                                                                                                                                       |
| RAG writes are controlled by `failsafe.sentinel.ragEnabled` (default `true`).               | implemented | `FailSafe/extension/src/sentinel/SentinelDaemon.ts:340`                                                                                                                                                        |
| Checkpoint rows are directly foreign-key linked to Sentinel RAG rows.                       | unknown     | No explicit join/foreign key in `RoadmapServer` checkpoint insert (`FailSafe/extension/src/roadmap/RoadmapServer.ts:1689`) or Sentinel RAG insert (`FailSafe/extension/src/sentinel/SentinelRagStore.ts:103`). |

<!-- CHECKPOINT-DEEP-DIVE:END -->
