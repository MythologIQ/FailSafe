# Changelog

All notable changes to the MythologIQ FailSafe extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Post-4.6.3 scope to be scheduled.

## [4.6.3] - 2026-03-08

### Fixed

- **Console Server assets now load** — `express.static` middleware was also missing `dotfiles: "allow"`, causing all CSS, JS, images, and vendor files to silently 404 even after v4.6.2's `sendFile` fix. The HTML page loaded but rendered blank because no assets were served.

## [4.6.2] - 2026-03-08

### Fixed

- **Console Server inaccessible** — Express `sendFile()` silently returned 404 when the extension install path contained a dotfile directory (`.vscode/`, `.antigravity/`). Added `{ dotfiles: "allow" }` to all `sendFile` calls. This was a latent bug affecting all versions since the Console Server was introduced.

## [4.6.1] - 2026-03-08

### Fixed

- **Missing sidebar icon** — Activity bar SVG icon (`failsafe-icon.svg`) was referenced in package.json but never created; sidebar showed blank icon in VS Code and Antigravity.
- **Release Pipeline branch policy** — Tag-based CI runs (detached HEAD from `v*` tag checkout) no longer fail branch naming validation.
- **Icon validation gate** — `validate-vsix.cjs` preflight now checks all icon references in package.json resolve to real files, preventing this class of bug in future releases.

## [4.6.0] - 2026-03-08

### Added

- **Section 4 Razor Decomposition** - ConsoleServer.ts decomposed from 3265L to 1124L with 5 extracted route modules and 7 service modules. stt-engine.js decomposed from 400L to 249L with 4 extracted modules. EnforcementEngine.ts decomposed from 250L to 122L with 4 enforcement evaluators.
- **Skill Discovery & Registry Services** - SkillParser, SkillFrontmatter, SkillRegistry, SkillDiscovery, and SkillRanker extracted as independent service modules from ConsoleServer.
- **Checkpoint Persistence** - CheckpointStore and CheckpointUtils extracted with hash-chain verification and SQLite persistence.
- **Hook Toggle UI** - Console Settings panel now shows governance hook status with enable/disable toggles (B107).
- **Release Gate Enhancements** - Backlog duplicate detection, version summary checks, and COMPONENT_HELP/PROCESS_GUIDE version validation (B108, B138, B139).

### Fixed

- **Brainstorm canvas graph mutations** - rAF batching prevents forced reflows during rapid node updates (B119).
- **Prep Bay TTS error handling** - Error messages now surface `err.message` instead of `[object Object]` (B120).
- **Heuristic extractor node taxonomy** - Nodes now carry typed categories: Idea, Decision, Task, Constraint (B125).
- **Prep Bay modal waveform** - Waveform visualizer renders via `onAnalyser` callback in modal context (B129).
- **Brainstorm server-side truncation** - BrainstormService logs truncation events for debugging (B132).
- **Socket.dev compliance** - Replaced deprecated `document.execCommand('copy')` with Clipboard API. Added post-build sanitization for `new Function` patterns from transitive dependencies (ajv, depd) and vendor libraries.
- **Test type errors** - Fixed TS2345 in AssistModeEvaluator and ObserveModeEvaluator test mocks.

### Changed

- **Governance doc storage** - All generated governance artifacts now stored in `.failsafe/governance/` (gitignored) instead of `.agent/staging/`. `/ql-organize` Phase 6 added for location compliance.
- **Circular dependency fix** - SkillRegistry ↔ SkillDiscovery re-export cycle eliminated via direct imports.

### Documentation

- Updated `docs/COMPONENT_HELP.md` and `docs/PROCESS_GUIDE.md` to reflect `v4.6.0`.

## [4.5.1] - 2026-03-07

### Fixed

- **Activation crash in Antigravity**: `LedgerQueryAPI` construction now guards against unavailable ledger database, preventing `Ledger DB not initialized` error on extension activation.
- **CI validator parameter mismatch**: `validate.ps1` now passes `-Version` (not `-RepoRoot`) to `validate-release-version.ps1`.

## [4.5.0] - 2026-03-07

### Added

- **Skill Discovery Tags** - Skills now carry normalized tags and source credit metadata. Console skill-scan extracts tags from frontmatter, filenames, and categories.
- **Tag-Based Skill Filter** - Skills panel replaces category chips with a type-ahead tag filter with autocomplete suggestions and clear control.
- **Governance Skill Cohesion** - All 19 QoreLogic skills now carry explicit next-step routing. Canonical skill routing table and proactive suggestion signals established.
- **/ql-document Skill** - New documentation authoring skill with RELEASE_METADATA mode for automated release notes and GENERAL mode for standalone technical writing. Integrated into `/ql-repo-release` Step 5.

### Changed

- **Brainstorm Module Cleanup** - Optional chaining replaces null guards; status messages consolidated into a lookup map; audio device handler uses named reference for cleanup.
- **STT Engine Refinements** - Improved silence timer handling and mic device switching in speech-to-text pipeline.
- **Ideation Buffer & Prep Bay** - Tightened buffer merge logic and prep bay staging flow for mindmap ideation.
- **CI Workflow Consolidation** - VSIX proprietary guardrails workflow now builds from single extension source and scans packaged VSIX for prohibited content patterns.

### Documentation

- Updated `docs/COMPONENT_HELP.md` and `docs/PROCESS_GUIDE.md` to reflect `v4.5.0`.


## [4.4.1] - 2026-03-06

### Changed

- **Activation Surface Hardening** - Replaced startup-wide activation with explicit command/view/chat activation events to reduce runtime exposure.
- **Socket Policy Enforcement** - Updated tracked Socket policy manifests to explicitly ignore accepted capability classes used by design.
- **Docs Badge Consistency** - Aligned Socket badge references across workspace documentation to `4.4.1`.
## [4.4.0] - 2026-03-06

### Added

- **Mindmap Runtime Modules** - Added ideation/runtime modules for extraction heuristics, node editing, prep bay flow, haptics support, voice settings, and local model status orchestration.
- **Audio Vault Service** - Added `AudioVaultService` for local audio artifact lifecycle support in roadmap ideation flows.
- **Mindmap Asset Pack** - Added dedicated UI assets for overview, operations, audit, risks, skills, laws, mindmap, and config surfaces.

### Changed

- **Version Synchronization** - Extension metadata, runtime version surfacing, packaged README/help docs, and validation scripts now align on `v4.4.0`.
- **Mindmap Labeling** - Command Center navigation now labels the ideation tab as `Mindmap` while retaining internal `brainstorm` routing IDs.

### Documentation

- Updated `README.md`, `docs/COMPONENT_HELP.md`, and `docs/PROCESS_GUIDE.md` to reflect current `v4.4.0` terminology and shipped capability scope.

## [4.3.2] - 2026-03-04

### Changed

- **Performance & Polish** - Checkpoint integrity verification moved to cached + on-demand flows with explicit `Verify Integrity` actions in Console UI surfaces.
- **Server Activation Robustness** - API and Console server startup now resolves available ports dynamically with graceful fallback behavior when preferred ports are occupied.
- **Webview Update Path** - Transparency and Economics panels now use message-driven updates after initial render to reduce full-HTML redraw churn.
- **Bundled Help Rewrite** - `docs/COMPONENT_HELP.md` and `docs/PROCESS_GUIDE.md` rewritten for unified Console UX and `v4.3.2` operator workflows.

### Documentation

- Clarified Brainstorm status: voice + manual workflows are shipped in `v4.3.2`, with vendor runtime prerequisites documented in `vendor/*/VENDOR.md`.

## [4.3.1] - 2026-03-03

### Fixed

- **SQL Injection Protection** — `SchemaVersionManager.hasColumn()` now validates table names against a strict whitelist before PRAGMA queries.
- **XSS Prevention** — `LivingGraphTemplate` tooltip and `RevertTemplate` result rendering now HTML-escape all dynamic values.
- **README Logo** — Corrected logo path to reference current FailSafe branding.

## [4.3.0] - 2026-03-02

### Added

- **Pre-Commit Guard** - `failsafe.installCommitHook` and `failsafe.removeCommitHook` install or remove an authenticated thin-client git hook that queries `GET /api/v1/governance/commit-check`.
- **Provenance Tracking** - FailSafe records AI authorship attribution as `PROVENANCE_RECORDED` SOA ledger events and exposes history through `GET /api/v1/governance/provenance/:artifactPath`.
- **CI Governance Context Export** - Release automation now exports public governance context with `tools/export-governance-context.sh` and uploads it as a non-blocking workflow artifact.
- **Bundled Operator Docs** - The packaged VSIX now includes component-level and process-level help guides for installed users.

### Changed

- Marketplace README, changelog, and package metadata now align on shipped `v4.3.0` behavior.
- `showGenesisHelp()` and inline component help text now use the current command set and clearer operator language.

### Fixed

- `v4.3.0` quality sweep remediation sealed: IPv6 private-range coverage in `GovernanceWebhook`, dead-code removal in `capabilities.ts`, and Razor compliance restoration in `SentinelRagStore.ts`.

## [4.2.1] - 2026-02-28

### Changed

- Marketplace README and package metadata corrected so published artifacts reflect the intended release content.

### Documentation

- Added the Build "42" release note to the v4.2.1 release notes.
- Added packaged-artifact inspection to the public release process and `/ql-repo-release`.

## [4.2.0] - 2026-02-27

> _"The Answer to the Ultimate Question of Life, the Universe, and Everything."_

### Added

- **Multi-Agent Governance Fabric** — Runtime detection and governance injection for Claude CLI, Copilot, Codex CLI, and Agent Teams via `SystemRegistry` terminal-based detection and `FrameworkSync` per-agent config injection.
- **Governance Ceremony** (`failsafe.onboardAgent`) — Single-command opt-in/opt-out to inject or remove governance files across all detected AI agents, with transparent diff preview.
- **First-Run Onboarding** — Surfaces multi-agent governance coverage options during initial setup with workspace vs global scope guidance.
- **Agent Coverage Dashboard** — Console route (`/console/agents`) showing detected agents, injection status, and compliance state.
- **Undo Last Attempt** (`failsafe.undoLastAttempt`) — Checkpoint-based rollback with integrity verification and user feedback.
- **Discovery Phase Governance** — DRAFT → CONCEIVED status gate with `DiscoveryGovernor` and ledger-tagged graduation markers.
- **Terminal Correlator** — Maps VS Code terminals to agent systems via name pattern matching for cross-agent audit correlation.
- **Workflow Run Model** — `WorkflowRunManager` with run/stage/gate/claim/evidence contracts aligned to governance lifecycle.
- **Agent Teams Detector** — Generates `.claude/agents/failsafe-governance.md` governance overseer peer agent.
- **AGENTS.md Injection** — Writes repo-root `AGENTS.md` with FailSafe governance rules consumed by Copilot and Codex.
- **Intent Schema v2** — `schemaVersion` field, `agentIdentity` metadata, and `planId` reference on Intent creation with migration from v1.
- **Verdict Replay Batch** — `replayBatch()` method for bulk verdict replay with timing-safe hash comparison.
- **CheckpointManager** — Bridges QoreLogic ledger and Sentinel substrates for checkpoint metrics.

### Changed

- `SystemRegistry` extended to 11 fields with 3 detection methods and 3 exported types.
- `FrameworkSync` now accepts optional `SystemRegistry` for per-agent config delegation.
- `RoadmapServer` gains `setSystemRegistry()` deferred setter (following `setConsoleDeps()` pattern).
- `QoreLogicSubstrate` interface extended with `systemRegistry: SystemRegistry` field.
- `VerdictReplayEngine` upgraded with timing-safe hash comparison and batch replay.
- Event types expanded with `DISCOVERY_RECORDED` and `DISCOVERY_PROMOTED`.

## [4.1.0] - 2026-02-27

### Added

- **Gap 1: Mode-Change Audit Trail** — All `governance.mode` configuration changes now recorded to SOA ledger with `USER_OVERRIDE` event type, including `previousMode` and `newMode` payload.
- **Gap 2: Break-Glass Protocol** — Time-limited governance overrides with:
  - `failsafe.breakGlass` command for emergency activation (10+ char justification required)
  - `failsafe.revokeBreakGlass` command for manual revocation
  - Configurable duration (1–480 minutes)
  - Auto-revert on expiry
  - Full audit trail in ledger (`break_glass.activated`, `break_glass.revoked`, `break_glass.expired`)
  - Event bus emissions for UI integration
- **Gap 3: Artifact Hash on Write** — SHA-256 hash of file content at save-time recorded in ledger for independent verification.
- **Gap 4: Verdict Replay Harness** — `failsafe.replayVerdict` command reconstructs inputs and re-executes past governance decisions for audit verification, with policy hash and artifact hash comparison.

### Changed

- Ledger payload now includes `policyHash` for replay fidelity.
- `LedgerManager.getEntryById()` added for verdict replay lookups.
- `PolicyEngine.getPolicyHash()` added for policy version tracking.

## [4.0.0] - 2026-02-27

### Added

- **Token Economics Dashboard** (`failsafe.showEconomics`): Real-time visibility into prompt token usage, RAG savings, and cost-per-action metrics.
- **Economics Service Layer** (`src/economics/`): Pure TypeScript module with zero VS Code dependencies — `CostCalculator`, `EconomicsPersistence`, `TokenAggregatorService`.
- **EventBus-Driven Telemetry**: Automatic tracking of `prompt.dispatch` and `prompt.response` events for token aggregation.
- **Economics Webview Panel** (`EconomicsPanel`, `EconomicsTemplate`): Interactive dashboard with hero metrics, donut chart (context sync ratio), and daily bar chart.
- **Governance Mode System**: Three modes — Observe, Assist, Enforce — selectable via `failsafe.governance.mode` setting or `FailSafe: Set Governance Mode` command.
- **Risk Register Panel**: Dedicated webview for tracking and managing project risks.
- **Transparency Stream Panel**: Real-time governance event stream in the sidebar.
- **Chat Participant**: `@failsafe` chat commands for intent, audit, trust, status, and seal operations.
- **220 Passing Tests**: Full test coverage for economics service layer (CostCalculator, EconomicsPersistence, TokenAggregatorService).

### Changed

- **UI Terminology**: "Operations Hub" renamed to "Command Center" across all surfaces.
- **Command Updates**: Hub commands now reference "Command Center" (`failsafe.openPlannerHub`, `failsafe.openPlannerHubEditor`).
- **API-First Service Isolation**: Economics module designed with zero vscode imports for future Tauri/Rust extraction readiness.

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
