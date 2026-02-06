# Changelog

All notable changes to the MythologIQ FailSafe extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
