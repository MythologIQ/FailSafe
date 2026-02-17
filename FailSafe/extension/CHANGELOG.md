# Changelog

All notable changes to the MythologIQ FailSafe extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Post-3.6.0 scope to be scheduled.

## [3.6.0] - 2026-02-17

### Changed

- **Marketplace Categories** - Updated from `["Other", "Linters", "Visualization"]` to `["Machine Learning", "Testing", "Visualization"]` for better discoverability in the VS Code Marketplace.
- **Keywords Expanded** - Added 8 new keywords: `ai safety`, `agent governance`, `code audit`, `risk management`, `compliance`, `deterministic governance`, `intent management`, `checkpoint`.
- **Documentation** - Added marketplace category badges to README files for transparency.

## [3.5.6] - 2026-02-12

### Changed

- Release metadata/version bump to 3.5.6 to start the Command Center UI overhaul sprint.

## [3.5.2] - 2026-02-11

### Fixed

- Marketplace sidebar screenshot now renders from packaged extension assets (`media/sidebar-ui-3.5.2.png`) instead of repo-relative documentation paths.

### Changed

- Release metadata/version bump to 3.5.2 across extension and distribution manifests.

## [3.5.1] - 2026-02-11

### Added

- Skills panel now includes an `All Installed` lane so phase relevance no longer hides available skills.
- Streamlined sidebar UI screenshot asset added for release documentation (`FailSafe/docs/images/sidebar-ui-3.5.1.png`).

### Changed

- Release metadata/version bump to 3.5.1 across extension manifests and README surfaces.
- Skill source tags now reflect location labels and first-party patterning (`Qore Workspace` for MythologIQ-owned skills).
- FailSafe skill discovery now uses deterministic extension-anchored roots to avoid false "No skills installed" states.
- First-party skill naming standardized to `qore-*` convention and aligned across `FailSafe/VSCode/skills` and `.agent/skills`.

## [3.5.0] - 2026-02-11

### Added

- UI-02 compact sidebar shell for the Operations Hub with FailSafe branding, favicon support, and standardized legal footer.
- Extended popout hub workflow coverage validated by Playwright smoke test (`Home`, `Run`, `Skills`, `Reports` baseline checks).
- Skill provenance ingestion via `SOURCE.yml` (creator/source repo/source path/source type/source priority/admission state).
- Phase-aware skill relevance APIs (`/api/skills`, `/api/skills/relevance`).
- SQLite-backed checkpoint ledger table (`failsafe_checkpoints`) with chain verification and summary APIs.

### Changed

- Compact sidebar feature counters now track `Recently Completed`, `Backlog`, `Wishlist`, and `Critical Features`.
- Operations Hub open action routes to external popout context from webpanel and command flows.
- VS Code Electron rebuild script now resolves nested archive layouts under `.vscode-test` to keep native module rebuilds deterministic during test runs.

### Documentation

- Added release documentation subtask pack for README/CHANGELOG integration with claim-to-source mapping (`FailSafe/extension/RELEASE_DOCS_SUBTASK.md`).
- Updated extension README command and quick-start sections to match currently contributed Operations Hub command surfaces.

### Validation

- End-to-end UI suite executed via `npm run test:ui` (Playwright).
- Build verification executed via `npm run compile`.
- Full extension quality gate executed via `npm run test:all` (lint + extension tests + Playwright UI tests).

## [3.0.1] - 2026-02-06

### Added

- New `/ql-repo-release` workflow for automated release discipline.
- `SentinelViewProvider` registration for consistent sidebar monitoring.
- Bootstrap modules (`bootstrapCore`, `bootstrapGovernance`, etc.) for clean extension lifecycle.

### Fixed

- Perpetual loading issue in Sentinel sidebar by registering missing provider.
- TypeScript errors in `PlanningHubPanel` and `CheckpointReconciler` by hardening event types.

### Changed

- **Architectural Refactor**: Decomposed `main.ts` from 761 lines to ~120 lines (Section 4 Simplicity Razor compliance).
- Flattened `DashboardPanel` constructor to improve readability and maintainability.

## [2.0.1] - 2026-02-05

### Added

- Webview template modules for Cortex Stream, Dojo, Dashboard, and Living Graph (Razor compliance).
- Shared tooltip helper with data-tooltip rendering across Genesis views.

### Fixed

- Cortex Stream search overlay text removed to eliminate redundant labels.
- Tooltips now display for advanced governance terminology and calculated metrics.

### Changed

- Documentation refreshed for the 2.0.1 release.

## [1.3.0] - 2026-02-05

### Added

- **Plan Navigation**: DojoViewProvider now links to Roadmap view
- **Governance Integration**: GovernanceRouter plan events for phase tracking
- **PlanManager Wiring**: Complete integration in main.ts activation

## [1.2.2] - 2026-02-05

### Fixed

- **Architecture Config**: Added `architecture.contributors` and `architecture.maxComplexity` config properties
- **Root Cleanup**: Removed orphan `tsconfig.json` from workspace root
- **Complexity Calculation**: Verified `calculateComplexity` exists in ArchitectureEngine

## [1.2.1] - 2026-02-05

### Added

- **BACKLOG.md Integration**: Unified source of truth for blockers, backlog, and wishlist items
- **7 Command Integrations**: Step hooks for ql-status, ql-bootstrap, ql-audit, ql-implement, ql-substantiate, ql-plan, ql-refactor

## [1.2.0] - 2026-02-05

### Added

- **UI Clarity Enhancements** (Navigator)
  - Improved section and metric spacing in DojoViewProvider
  - 6 info hints with tooltips for governance concepts
  - 6 filter tooltips in CortexStreamProvider
  - Collapsible Quick Start Guide with toggleGuide handler
- **New Shared Components**
  - `shared/styles/common.ts` - Reusable CSS styles
  - `shared/components/InfoHint.ts` - Tooltip component
  - `shared/content/quickstart.ts` - Guide content

## [1.1.1] - 2026-02-05

### Added

- **VSCode Chat Participant**: FailSafeChatParticipant.ts (239 lines)
  - Slash commands for governance queries
  - Trust stage helper method
- **Chat Integration**: package.json chat participant registration

## [1.1.0] - 2026-02-05

### Added

- **Event-Sourced Plan Management** (Pathfinder)
  - PlanManager.ts with event sourcing and YAML persistence
  - RoadmapViewProvider.ts with SVG-based visualization
  - Plan data model (types.ts, events.ts, validation.ts)
- **Three View Modes**: Roadmap, Kanban, Timeline
- **30 Test Cases**: Full PlanManager test coverage
- **GovernanceRouter Integration**: findPhaseForArtifact, setPlanManager methods

## [1.0.7] - 2026-02-05

### Fixed

- Excluded test files from extension package to reduce bundle size.
- Node.js version compatibility improvements.

## [1.0.6] - 2026-02-04

### Fixed

- Extension icon moved to root to improve marketplace display.

## [1.0.5] - 2026-02-04

### Changed

- Marketplace README wording updated for accuracy.

## [1.0.4] - 2026-02-04

### Fixed

- Marketplace icon now uses the packaged extension icon.

## [1.0.0] - 2026-02-04

### Added

- **Sentinel Daemon**: Real-time file monitoring with heuristic pattern analysis
- **Trust Engine**: Lewicki-Bunker progressive trust model (CBT → KBT → IBT stages)
- **SOA Ledger**: Merkle-chained audit trail with SQLite persistence
- **L3 Escalation**: Human-in-the-loop approval queue for security-critical paths
- **Dashboard Panel**: Main governance overview with real-time metrics
- **Living Graph**: Visual dependency and trust relationship explorer
- **Cortex Stream**: NLP command interface for governance queries
- **Enforcement Engine**: Three Prime Axioms for action validation
- **Shadow Genome**: Failure pattern archival for continuous learning
- **QoreLogic Integration**: Multi-agent framework synchronization

### Security

- Path traversal prevention with symlink resolution
- SSRF protection for LLM endpoint validation
- ReDoS protection for custom pattern definitions
- TOCTOU race condition mitigations
- Content size limits to prevent DoS

### Configuration

- Heuristic, LLM-assisted, and hybrid analysis modes
- Configurable Ollama endpoint and model selection
- Adjustable L3 SLA thresholds
- Strict mode for zero-tolerance governance
