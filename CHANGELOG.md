# Changelog

## [1.0.0] - 2026-01-22

### Added

- **Phase 4: Genesis UI & Feedback Loop**
  - Implemented **The Dojo** sidebar with interactive workflow tracking.
  - Enhanced **Living Graph** with D3.js force-directed visualization, risk-grading, and trust-scaling.
  - Refined **Cortex Stream** with real-time filtering, search, and UX-centric keyboard shortcuts.
  - Implemented **FeedbackManager** with JSON-backed community feedback persistence and export support.
- **Phase 3: Governance & Trust**
  - Migrated **TrustEngine** from in-memory to SQLite persistence via LedgerManager.
  - Implemented **Shadow Genome** protocol for archival and learning from agent failures.
- **Phase 2: Sentinel Enforcement**
  - Implemented **Heuristic Pattern Library** for active monitoring.
  - Added **ExistenceEngine** for structural claim verification.
  - Implemented **ArchitectureEngine** for Macro-KISS enforcement (Polyglot/Bloat detection).

## [0.2.0] - 2026-01-22

### Added

- **Ledger Hardening:** Implemented full cryptographic verification for hash chain (M1.5.1).
- **Secure Storage:** Migrated HMAC signing keys to VS Code SecretStorage (M1.5.3).
- **Atomic Config:** Implemented atomic writes for configuration files (M1.5.4).

### Fixed

- **Database Locks:** Fixed issue where SQLite database remained locked after extension reload (M1.5.2).
- **Genesis Block:** Replaced placeholder genesis hash/signature with computed values.

## [0.1.0] - 2026-01-22

### Added

- Initial project scaffold.
- Basic SQLite Ledger implementation (M1).
