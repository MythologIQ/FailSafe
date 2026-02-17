# VSCode Copilot - Source

Extension source code for VSCode GitHub Copilot environment.

## Structure

```
VSCode/
├── prompts/              # Slash commands (.prompt.md files)
│   ├── ql-bootstrap.prompt.md
│   ├── ql-help.prompt.md
│   ├── ql-status.prompt.md
│   ├── ql-plan.prompt.md
│   ├── ql-audit.prompt.md
│   ├── ql-implement.prompt.md
│   ├── ql-refactor.prompt.md
│   ├── ql-validate.prompt.md
│   ├── ql-substantiate.prompt.md
│   └── ql-organize.prompt.md
│
├── agents/               # Custom agents (.agent.md files)
│   ├── ql-governor.agent.md      (pending)
│   ├── ql-judge.agent.md         (pending)
│   └── ql-specialist.agent.md    (pending)
│
└── instructions/         # Conditional instructions (.instructions.md)
    └── (none yet)
```

**Note**: Structure follows official VSCode Copilot documentation:

- Prompts in `prompts/` → deploy to `.github/prompts/`
- Agents in `agents/` → deploy to `.github/`
- Instructions in `instructions/` → deploy to `.github/instructions/`

## Constraints

**VSCode-Specific**:

- Prompt files: `.prompt.md` extension (slash commands)
- Agent files: `.agent.md` extension (custom agents)
- Instruction files: `.instructions.md` extension (conditional rules)
- YAML frontmatter required (name, description)

See: `../targets/VSCode/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/VSCode/`

**Deployment paths**:

```powershell
# Prompts (slash commands)
Copy-Item prompts/*.prompt.md .github/prompts/

# Agents (custom AI agents)
Copy-Item agents/*.agent.md .github/

# Instructions (conditional rules)
Copy-Item instructions/*.instructions.md .github/instructions/
```

## Source Format

Files in this directory are **VSCode-native** format:

- `.prompt.md` for reusable prompts (invoked as `/ql-plan`)
- `.agent.md` for custom agent definitions
- `.instructions.md` for file-type specific rules

No transformation needed - these are ready for direct deployment to `.github/` directory.

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
| Checkpoint rows are directly foreign-key linked to Sentinel RAG rows. | unknown | No explicit join/foreign key in `RoadmapServer` checkpoint insert (`FailSafe/extension/src/roadmap/RoadmapServer.ts:1537`) or Sentinel RAG insert (`FailSafe/extension/src/sentinel/SentinelRagStore.ts:99`). |

<!-- CHECKPOINT-DEEP-DIVE:END -->
