# System State - 2026-01-22

## Component Tree

- **Extension Core**: `extension/src/extension/main.ts`
- **Shared Components**:
  - `ConfigManager.ts`: Handles `.failsafe` directory creation and YAML config defaults.
  - `types.ts`: Shared interface definitions including the new `Feedback` config.
- **QoreLogic**:
  - `LedgerManager.ts`: SQLite-backed Merkle-chained audit trail.
- **Case Studies**:
  - `Lessons-Learned.md`: Global failure/mitigation database.
  - `Zo/`: First processed project context.
- **Governance**:
  - `IMPLEMENTATION_PLAN.md`: Active 12-sprint roadmap.

## Active Feature Flags (Config Defaults)

- `failsafe.genesis.livingGraph`: `true`
- `failsafe.genesis.cortexOmnibar`: `true`
- `failsafe.sentinel.enabled`: `true`
- `failsafe.sentinel.mode`: `heuristic`
- `failsafe.qorelogic.strictMode`: `false`
- `failsafe.feedback.outputDir`: `.failsafe/feedback`

## Infrastructure

- **Locking**: `lock_manager.ps1` (Windows Native)
- **Persistence**: SQLite (Ledger), YAML (Personas/Policies)
