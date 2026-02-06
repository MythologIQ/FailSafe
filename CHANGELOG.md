# Changelog

All notable changes to FailSafe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- v3.1.0 Roadmap: (Next Phase)

---

## [3.0.1] - 2026-02-06

### Added

- **Release Discipline Enforcement** - New `/ql-repo-release` workflow artifact.
- **Sentinel Sidebar Monitoring** - Complete `SentinelViewProvider` and `SentinelTemplate`.
- **Structural Decomposition** - Decomposed `main.ts` into specialized bootstrap modules forSection 4 Simplicity.

### Fixed

- **Sentinel UI Hang** - Resolved perpetual loading by registering missing webview provider.
- **Type Solidification** - Hardened `FailSafeEventType` and `PlanningHubPanel` model mappings.

### Changed

- **KISS Refactor** - Flattened `DashboardPanel` constructor and templates to eliminate bloat.
- **Environment Parity** - Sync 3.0.1 graduation across VSCode, Claude, and Antigravity.

---

## [2.0.1] - 2026-02-05

### Added

- Webview template modules for Cortex Stream, Dojo, Dashboard, and Living Graph (Razor compliance).
- Shared tooltip helper with data-tooltip rendering across Genesis views.

### Fixed

- Cortex Stream search overlay text removed to eliminate redundant labels.
- Tooltips now display for advanced governance terminology and calculated metrics.

### Changed

- Documentation refreshed for the 2.0.1 release.

---

## [2.0.0] - 2026-02-05

### Added

- **Gold Standard Repository Skills**
  - `/ql-repo-audit` - Gap analysis against Gold Standard checklist
  - `/ql-repo-scaffold` - Generate missing community files (CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, GOVERNANCE)
  - `/ql-repo-release` - Release discipline enforcement
- **Ambient Integration** - Repository governance hooks in existing commands
  - `/ql-bootstrap` Step 2.5: Repository readiness check
  - `/ql-plan` Step 4.5: Plan branch creation
  - `/ql-audit` Pass 7 + Step 5.5: Repo governance audit
  - `/ql-implement` Step 12.5: Implementation staging
  - `/ql-substantiate` Step 9.5: Final staging & merge
- **GitHub API Integration** - `github-api-helpers.md` reference for gh CLI patterns
- **Template Library** - 9 templates in `docs/conceptual-theory/templates/repo-gold-standard/`
- **Self-Application** - FailSafe now has Gold Standard community files at root
- **Multi-Environment Sync** - v2.0.0 skills synced to Claude, Antigravity, VSCode
- **Specialized Agents**
  - `ql-technical-writer` - Documentation quality specialist
  - `ql-ux-evaluator` - UI/UX testing with optional Playwright

---

## [1.3.0] - 2026-02-05

### Added

- **Plan Navigation** - DojoViewProvider now links to Roadmap view
- **Governance Integration** - GovernanceRouter plan events at lines 91-107
- **PlanManager Wiring** - Complete integration in main.ts

---

## [1.2.2] - 2026-02-05

### Fixed

- **D1**: Verified `calculateComplexity` exists (ArchitectureEngine lines 120-142)
- **D2**: Added `architecture.contributors` and `architecture.maxComplexity` config properties
- **D3**: Removed orphan `tsconfig.json` from workspace root

---

## [1.2.1] - 2026-02-05

### Added

- **BACKLOG.md Integration** - Unified source of truth for blockers, backlog, and wishlist
- **7 Command Integrations**:
  - `/ql-status` - Step 2.5 backlog check, Outstanding Items output
  - `/ql-bootstrap` - Step 6.5 BACKLOG.md creation
  - `/ql-audit` - Step 5.5 blocker registration on VETO
  - `/ql-implement` - Step 10.5 mark blockers complete
  - `/ql-substantiate` - Step 3.5 blocker verification
  - `/ql-plan` - Step 3.5 register backlog items
  - `/ql-refactor` - Step 5.5 register tech debt

---

## [1.2.0] - 2026-02-05

### Added

- **UI Clarity Enhancements** (Navigator)
  - Improved section and metric spacing
  - 6 info hints with tooltips in DojoViewProvider
  - 6 filter tooltips in CortexStreamProvider
  - Collapsible Quick Start Guide with toggleGuide handler
- **New Shared Components**
  - `shared/styles/common.ts` (74 lines)
  - `shared/components/InfoHint.ts` (66 lines)
  - `shared/content/quickstart.ts` (87 lines)

---

## [1.1.1] - 2026-02-05

### Added

- **VSCode Chat Participant** - `FailSafeChatParticipant.ts` (239 lines)
  - Slash commands for governance queries
  - Trust stage helper method (V1 remediation)
- **Chat Integration** - package.json chat participant registration

---

## [1.1.0] - 2026-02-05

### Added

- **Event-Sourced Plan Management** (Pathfinder)
  - `PlanManager.ts` (218 lines) - Event sourcing with YAML persistence
  - `RoadmapViewProvider.ts` (217 lines) - SVG-based visualization
  - `types.ts`, `events.ts`, `validation.ts` - Plan data model
- **Three View Modes** - Roadmap, Kanban, Timeline
- **30 Test Cases** - Full PlanManager test coverage
- **GovernanceRouter Integration** - `findPhaseForArtifact`, `setPlanManager` methods

---

## [1.0.7] - 2026-02-05

### Fixed

- Excluded test files from extension package to reduce bundle size
- Node.js version compatibility improvements

---

## [1.0.6] - 2026-02-04

### Fixed

- Extension icon path for VS Code Marketplace listing

---

## [1.0.5] - 2026-02-04

### Fixed

- Marketplace listing copy and metadata improvements

---

## [1.0.4] - 2026-02-04

### Fixed

- **Node.js Version Compatibility:** Resolved NODE_MODULE_VERSION mismatch by implementing pre-built binary support for better-sqlite3. The extension now works reliably across different Node.js versions.

### Added

- **Node Version Pinning:** Added `.nvmrc` configuration (Node 20.18.1) to ensure consistent build environments.
- **Binary Configuration:** Implemented pre-built binary downloads for native dependencies, eliminating version mismatches during installation.

---

## [1.0.0] - 2026-01-22

### Added

**Phase 4: Genesis UI & Feedback Loop**

- Implemented **The Dojo** sidebar with interactive workflow tracking
- Enhanced **Living Graph** with D3.js force-directed visualization, risk-grading, and trust-scaling
- Refined **Cortex Stream** with real-time filtering, search, and UX-centric keyboard shortcuts
- Implemented **FeedbackManager** with JSON-backed community feedback persistence and export support

**Phase 3: Governance & Trust**

- Migrated **TrustEngine** from in-memory to SQLite persistence via LedgerManager
- Implemented **Shadow Genome** protocol for archival and learning from agent failures

**Phase 2: Sentinel Enforcement**

- Implemented **Heuristic Pattern Library** for active monitoring
- Added **ExistenceEngine** for structural claim verification
- Implemented **ArchitectureEngine** for Macro-KISS enforcement (Polyglot/Bloat detection)

---

## [0.2.0] - 2026-01-22

### Added

- **Ledger Hardening:** Implemented full cryptographic verification for hash chain
- **Secure Storage:** Migrated HMAC signing keys to VS Code SecretStorage
- **Atomic Config:** Implemented atomic writes for configuration files

### Fixed

- **Database Locks:** Fixed issue where SQLite database remained locked after extension reload
- **Genesis Block:** Replaced placeholder genesis hash/signature with computed values

---

## [0.1.0] - 2026-01-22

### Added

- Initial project scaffold
- Basic SQLite Ledger implementation

---

_For the full roadmap, see [ROADMAP.md](ROADMAP.md)._
