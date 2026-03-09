# Project Backlog

## Blockers (Must Fix Before Progress)

### Security Blockers

<!-- Format: - [ ] [S#] Description | Version -->

### Development Blockers

<!-- Format: - [ ] [D#] Description | Version -->

- [x] [D6] V1: Razor - CortexStreamProvider.ts exceeds 250 lines (from audit 2026-02-05T22:29:02Z) (v2.0.1 - Complete)
- [x] [D7] V2: Razor - DojoViewProvider.ts exceeds 250 lines (from audit 2026-02-05T22:29:02Z) (v2.0.1 - Complete)
- [x] [D8] V3: Razor - DashboardPanel.ts exceeds 250 lines (from audit 2026-02-05T22:29:02Z) (v2.0.1 - Complete)
- [x] [D9] V4: Razor - LivingGraphProvider.ts exceeds 250 lines (from audit 2026-02-05T22:29:02Z) (v2.0.1 - Complete)
- [x] [D10] Razor - GenesisManager.ts exceeds 250 lines (remediated in v3.2.0; 206 lines verified) | v3.2.0
- [x] [D11] V1: Ghost Path - getSprint() method called but not defined ✅ Remediated in plan | v3.1.0
- [x] [D12] V2: Ghost Path - broadcast() method called but not defined ✅ Remediated in plan | v3.1.0
- [x] [D13] V3: Ghost Path - appendSprintEvent() method called but not defined ✅ Remediated in plan | v3.1.0
- [x] [D14] V4: Ghost Path - path module used but not imported ✅ Remediated in plan | v3.1.0
- [x] [D15] V5: Dependency - ws package required but not installed ✅ Remediated in plan | v3.1.0
- [x] [D1] ArchitectureEngine.ts - Placeholder complexity ✅ Already implemented | v1.2.2
- [x] [D2] ConfigManager.ts - Missing `architecture.contributors` config property ✅ | v1.2.2
- [x] [D3] Orphan root tsconfig.json - Should be removed for root hygiene ✅ | v1.2.2
- [x] [D4] V1: plan-repo-gold-standard.md - Missing "Open Questions" section ✅ Added | v2.0.0
- [x] [D5] V2: ARCHITECTURE_PLAN.md - Stale v2.0.0 scope ✅ Updated to Governance | v2.0.0

## Backlog (Planned Work)

<!-- Format: - [ ] [B#] Description | Version -->

### v1.2.2 Cleanup (Current) ✅ COMPLETE

- [x] [B1] ARCHITECTURE_PLAN.md - Update paths to FailSafe/extension/ | v1.2.2
- [x] [B2] Complete D2-D3 blockers ✅ | v1.2.2

### v1.3.0 Autopilot (Governance Integration) ✅ COMPLETE

- [x] [B3] GovernanceRouter.ts - Emit plan events on file operations ✅ Already implemented | v1.3.0
- [x] [B4] DojoViewProvider.ts - Link to Roadmap view ✅ | v1.3.0
- [x] [B5] main.ts - Wire PlanManager at activation ✅ Already implemented | v1.3.0

### v2.0.0 Governance (Gold Standard + Ambient Integration) ✅ COMPLETE

### v2.0.1 Tooltip Remediation ✅ COMPLETE

- [x] [B30] Modularize webviews + tooltip system + docs update | v2.0.1

**Phase 1: Core Skills** ✅

- [x] [B12] /ql-repo-audit skill - Gap analysis + GitHub API score ✅ | v2.0.0
- [x] [B13] /ql-repo-scaffold skill - Generate missing community files ✅ | v2.0.0
- [x] [B14] /ql-repo-release skill - Versioning + CHANGELOG + tags ✅ | v2.0.0

**Phase 2: Ambient Integration (Existing Skills)** ✅

- [x] [B15] ql-bootstrap Step 2.5 - PRE_BOOTSTRAP_VALIDATION hook ✅ | v2.0.0
- [x] [B16] ql-plan Step 4.5 - POST_PLAN_CREATION hook ✅ | v2.0.0
- [x] [B17] ql-audit Pass 7 + Step 5.5 - Repo governance audit ✅ | v2.0.0
- [x] [B18] ql-implement Step 12.5 - POST_IMPLEMENT_COMPLETION hook ✅ | v2.0.0
- [x] [B19] ql-substantiate Step 9.5 - POST_SUBSTANTIATION_SEAL hook ✅ | v2.0.0
- [x] [B26] ql-organize Step 4.5 - POST_ORGANIZE_COMPLETION (refactor commit) ✅ | v2.0.0

**Phase 3: GitHub API Integration** ✅

- [x] [B20] GitHub API helpers (gh CLI) ✅ | v2.0.0

**Phase 4: Template Library** ✅

- [x] [B21] Template library (CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, GOVERNANCE) ✅ | v2.0.0
- [x] [B25] validate.ps1 - Add Gold Standard checks (delivered via B47 in v3.2.0) | v3.2.0

**Phase 5: Self-Application (FailSafe)** ✅

- [x] [B22] FailSafe repo community files + .github/ templates ✅ | v2.0.0

**Phase 6: Multi-Environment Sync** ✅

- [x] [B23] Antigravity skill sync ✅ | v2.0.0
- [x] [B24] VSCode prompt sync ✅ | v2.0.0

**Phase 7: Specialized Agents** ✅

- [x] [B27] ql-technical-writer agent - Documentation quality ✅ | v2.0.0
- [x] [B28] ql-ux-evaluator agent - UI/UX testing (Playwright) ✅ | v2.0.0

### v3.0.0 Horizon (UI + Analytics) ✅ COMPLETE

**Alternate Views** ✅

- [x] [B6] Create FailSafe/extension/src/genesis/components/ folder ✅ | v3.0.0
- [x] [B7] Implement KanbanView.ts - Kanban column visualization ✅ | v3.0.0
- [x] [B8] Implement TimelineView.ts - Gantt-style timeline ✅ | v3.0.0
- [x] [B9] Risk markers on roadmap visualization ✅ | v3.0.0
- [x] [B10] Milestone support in PlanManager ✅ | v3.0.0

**Planning Window**

- [x] [B31] RoadmapPanelWindow.ts - Full-screen planning window ✅ | v3.0.0

**Token Analytics** ✅

- [x] [B29] Token ROI Dashboard - "Without FailSafe" vs "With FailSafe" comparison ✅ | v3.0.0
- [x] [B32] AnalyticsDashboardPanel.ts - Session tracking + historical data ✅ | v3.0.0

**UI Consolidation** (plan-v3.0.0-ui-consolidation.md) ✅

- [x] [B33] Phase 1: PlanningHubPanel - Consolidate all sidebar features ✅ | v3.0.0
- [x] [B34] Phase 2: Enhanced RoadmapSvgView - Larger SVG with blockers/detours/risks ✅ | v3.0.0
- [x] [B35] Phase 3: CheckpointReconciler - Automatic governance (remove pause/resume) ✅ | v3.0.0
- [x] [B36] Phase 4: Cleanup - Delete RoadmapPanelWindow, update commands ✅ | v3.0.0

### v3.0.2 Dashboard Remediation (plan-v3.0.2-dashboard-remediation.md) ✅ COMPLETE

- [x] [B37] Phase 1: Add Roadmap Mini-View to Dashboard ✅ | v3.0.2
- [x] [B38] Phase 2: Enhance Tooltip Visibility ✅ | v3.0.2
- [x] [B39] Phase 3: Wire PlanManager to DashboardPanel ✅ | v3.0.2
- [x] [B40] Phase 4: Fix Quick Actions Not Working ✅ | v3.0.2

### v3.1.0 Cumulative Roadmap - Visual Orchestration Layer (plan-v3.1.0-cumulative-roadmap.md) ✅ SEALED

- [x] [B41] Phase 1: Cumulative Data Model (Sprint type, getAllPlans, archiveSprint) ✅ | v3.1.0
- [x] [B42] Phase 2: Roadmap HTTP Server (Express + WebSocket on port 9376) ✅ | v3.1.0
- [x] [B43] Phase 3: Roadmap Browser UI (timeline, planning hub, dynamic feedback) ✅ | v3.1.0
- [x] [B44] Phase 4: Wire Commands (failsafe.openRoadmap, Ctrl+Alt+Shift+R) ✅ | v3.1.0

### v3.2.0 Reliability Hardening — ✅ SEALED

- [x] [B51] Implement User Intent Gate (clarification, pause points, safety pushback, intent lock) | v3.2.0
- [x] [B45] D10 Razor remediation - decompose GenesisManager.ts under 250-line cap | v3.2.0
- [x] [B47] Add `validate.ps1` Gold Standard checks (carryforward from B25) | v3.2.0
- [x] [B48] Operationalize Autonomous Reliability Manifest into concrete sprint artifacts and workflow gates | v3.2.0
- [x] [B49] Build Skill Admission Gate for external and user-imported skills (standard + protocol compliance) | v3.2.0
- [x] [B50] Enforce Gate-to-Skill requirements matrix across reliability workflow stages | v3.2.0

### v3.2.5 Follow-On Hardening — ✅ SEALED (partial; remainder deferred to v4.2.0)

- [x] [B52] Enforce GitHub branch/PR standards in FailSafe and team workflow tooling (branch taxonomy, PR-first merges, policy checks) | v3.2.5
- [x] [B58] Add explicit `Prep Workspace (Bootstrap)` UI action to inject required extension/workspace files and run hygiene checks | v3.2.5
- [x] [B59] Add run-level `Panic` (`Stop/Cancel Run`) button with hard abort semantics and ledgered reason capture | v3.2.5
- _B11, B46, B53-B57, B60-B65 deferred → v4.2.0_

### v4.2.0 "The Answer" — Full-Stack Governance ✅ SEALED

> _"The Answer to the Ultimate Question of Life, the Universe, and Everything."_

**Console & UI**

- [x] [B11] UI polish and theme refinements | v4.2.0
- [x] [B46] FailSafe Console UI overhaul and refinement (expanded via console spec packet) | v4.2.0
- [x] [B53] Implement Console route shell + profile-based IA (`/home`, `/run/:runId`, `/workflows`, `/skills`, `/genome`, `/reports`, `/settings`) | v4.2.0
- [x] [B60] Add `Undo Last Attempt` UI action with rollback integrity verification and user feedback | v4.2.0
- [x] [B61] Implement required empty-state UX flows (no workspace, no failures, no skills, no runs) | v4.2.0
- [x] [B63] Enforce accessibility baseline (keyboard nav, focus order, labels) on core console routes | v4.2.0

**Configuration & Profiles**

- [x] [B54] Implement configuration profiles and precedence (`run > workspace > user > defaults`) with visibility flags | v4.2.0

**Workflow Run Model**

- [x] [B55] Align workflow run/evidence model contracts (run/stage/gate/claim/evidence/attempt/export bundle parity) | v4.2.0

**Security & Skill Registry**

- [x] [B56] Implement security and skill-registry enforcement surfaces (permission scopes, pinning, redaction, invocation audit) | v4.2.0
- [x] [B62] Add first-run permission preflight summary for scope grants and deny-by-default transparency | v4.2.0

**Testing**

- [x] [B57] Build journey-based acceptance and adversarial E2E suite for P1-P5 from console spec | v4.2.0

**Workspace Integrity**

- [x] [B64] Add branch-protection parity checks and PR evidence checklist enforcement in repo standards | v4.2.0
- [x] [B65] Enforce `Prep Workspace (Bootstrap)` idempotency and duplicate-injection prevention | v4.2.0

**Intent Provenance & Enforcement**

- [x] [B66] Intent provenance chain: require `planId` reference on Intent creation; reject Intents without approved plan in enforce mode | v4.2.0
- [x] [B67] Workflow-status gating: Intent can only reach PASS status after `/ql-audit` signs off; block implementation on PULSE-only Intents in enforce mode | v4.2.0
- [x] [B68] Agent identity binding on Intents: record which agent created the Intent and through which workflow (ql-plan vs auto-create vs manual) | v4.2.0
- [x] [B69] Break-glass protocol: finalize package.json command declarations, tests, and CHANGELOG for `failsafe.breakGlass` / `failsafe.revokeBreakGlass` | v4.2.0
- [x] [B70] Verdict replay harness: `replayVerdict(ledgerEntryId)` — reconstruct inputs from ledger entry and re-execute deterministic decision path | v4.2.0

**Release Pipeline**

- [x] [B71] `ql-release` prompt: sync ql-repo-release to Antigravity and VSCode prompt environments (currently Claude-only) | v4.2.0
- [x] [B72] Pre-release governance gate: block release if any Intent is unsealed, ledger chain is broken, or version coherence fails | v4.2.0
- [x] [B73] Ledger-recorded release events: record `RELEASE_STARTED`, `RELEASE_COMPLETED`, `RELEASE_FAILED` to SOA ledger with artifact hashes of VSIX/ZIP outputs | v4.2.0
- [x] [B74] GitHub Actions CI/CD pipeline: automated build, test, version coherence check, and marketplace publish on tag push | v4.2.0
- [x] [B75] Release artifact signing: hash and sign VSIX/ZIP artifacts at build time, store signatures in ledger for independent verification | v4.2.0
- [x] [B76] CHANGELOG-to-version alignment: extend `validate-release-version.ps1` to verify CHANGELOG contains an entry matching the release version | v4.2.0

**Schema Versioning Integrity**

- [x] [B77] SOA Ledger schema migration framework: apply SchemaVersionManager pattern from Shadow Genome to the `soa_ledger` SQLite table | v4.2.0
- [x] [B78] Intent schema versioning: add version field to Intent artifacts and migration path for schema changes across extension upgrades | v4.2.0
- [x] [B79] Extension-version binding in ledger: record the extension version that created each ledger entry so hash/signature verification stays valid across upgrades | v4.2.0

**Multi-Agent Governance Fabric**

- [x] [B80] Runtime agent detection: extend `SystemRegistry` with terminal-based detection for Claude CLI, Codex CLI, and Agent Teams (`vscode.window.terminals` + `onDidOpenTerminal`) | v4.2.0
- [x] [B81] Per-agent config injection: extend `FrameworkSync` to write governance rules into each detected agent's native format (`.github/copilot-instructions.md`, `.kilocode/rules/`, `codex.md`) | v4.2.0
- [x] [B82] Agent Teams governance agent: generate `.claude/agents/failsafe-governance.md` when Agent Teams detected, embedding a governance overseer peer agent | v4.2.0
- [x] [B83] Multi-agent coverage dashboard: add governance coverage view to Console UI showing detected agents, injection status, and compliance state | v4.2.0
- [x] [B84] Cross-agent audit correlation: correlate file save events with originating terminal/agent PID to attribute changes to specific agents in ledger entries | v4.2.0
- [x] [B85] Governance opt-in/opt-out ceremony: single command to inject or remove all governance files across detected agents, with transparent diff preview | v4.2.0
- [x] [B86] `AGENTS.md` governance injection: write a single repo-root `AGENTS.md` with FailSafe governance rules, consumed by both Copilot and Codex | v4.2.0
- [x] [B87] Discovery phase governance (`ql-discover`): DRAFT → CONCEIVED status gate with ledger-tagged graduation marker; optional brainstorm/mindmap/research tooling offered but not required (data model informed by Zo-Qore PRD) | v4.2.0
- [x] [B88] First-run onboarding review: surface multi-agent governance coverage options during initial setup with clear guidance for workspace vs global scope decisions | v4.2.0
- [x] [B89] Pre-v4.2.0 True-Up Audit: purge fictional state from `SYSTEM_STATE.md`, reconcile `_STAGING_OLD` drift, and assert test gates in the release pipeline before writing new features | v4.2.0

**Deployment & Telemetry (NEW)**

- [x] [B92] Pre-Commit Guard via Commit-Check Endpoint: Single authenticated API endpoint returns pre-computed `{allow, reason}` decision; thin-client shell hook with per-session token auth; fails open when API unreachable; chains with existing hooks | v4.3.0
- [x] [B93] Provenance Tracking via Ledger: Record AI authorship attribution as ledger entries with confidence levels, debounced per-file, scope-filtered, stub-mode safe | v4.3.0
- [x] [B94] CI/CD Governance Context Export: Portable bash script exports version-controlled governance artifacts as CI artifacts, non-blocking, no sensitive data | v4.3.0

**Security Hardening (v4.3.1)** ✅ COMPLETE

- [x] [B133] SQL injection protection in SchemaVersionManager.ts via table name whitelist validation | v4.3.1
- [x] [B134] XSS prevention in LivingGraphTemplate.ts via HTML escaping of dynamic graph data | v4.3.1
- [x] [B135] XSS prevention in RevertTemplate.ts via HTML escaping of result messages | v4.3.1
- [x] [B136] README logo path correction to reference current FailSafe branding | v4.3.1

**Voice Brainstorm & Mindmap — Production Readiness Blockers (v4.6.0)**

_Source: Code audit 2026-03-07. All line references against current working tree._

Security:

- [ ] [B111] XSS via LLM-extracted node labels: `brainstorm-canvas.js` passes raw `node.label` to ForceGraph3D without escaping. `escapeHtml()` exists in `brainstorm-templates.js` but is not applied in `web-llm-engine.js` or `heuristic-extractor.js` at node creation time | v4.6.0

Resource Leaks:

- [ ] [B112] Window event listeners leak in `brainstorm.js`: `failsafe:audio-device-changed` and `failsafe:wake-word-changed` listeners bound but never removed in `destroy()` — duplicates accumulate on tab switch | v4.6.0
- [ ] [B113] Modal keydown handler leak in `prep-bay.js`: `document.addEventListener('keydown', escHandler)` in `openModal()` never removed on close — stacks on repeated open/close | v4.6.0
- [ ] [B114] MediaStream not released on failure in `stt-engine.js`: if `MediaRecorder` construction fails after `getUserMedia()` succeeds, `_releaseStream()` is never called — locks microphone | v4.6.0
- [ ] [B115] AudioContext leak in `stt-engine.js` `_stopWhisper()`: `ctx.close()` not in finally block — skipped if `decodeAudioData()` throws | v4.6.0
- [ ] [B116] Web LLM native AI session never destroyed: `web-llm-engine.js` creates `ai.languageModel` sessions but has no `destroy()` — sessions accumulate across extractions | v4.6.0

State Management / Race Conditions:

- [ ] [B117] Rapid mic toggle race condition: `voice-controller.js` `toggle()` doesn't debounce — clicking twice fast causes `startListening()` while `stopListening()` is still async mid-flight | v4.6.0
- [ ] [B118] STT callback references not nulled on destroy: `stt-engine.js` stores `onTranscript`, `onStateChange`, `onAutoStop`, etc. but never clears them — stale closures can fire into destroyed modules | v4.6.0
- [ ] [B119] Graph mutation during render: `brainstorm.js` proxies `canvas.setNodes` with no mutex — concurrent `mergeNodes()` and render frame can collide | v4.6.0

Error Handling:

- [ ] [B120] TTS failure silently swallowed: `prep-bay.js` calls `tts.speak().catch(() => {})` — user sees success status but hears nothing, no feedback | v4.6.0
- [ ] [B121] Audio storage failure silent: `prep-bay.js` audio vault POST failure logged as `console.warn` only — user believes recording is persisted but it's lost | v4.6.0
- [ ] [B122] STT init failure indefinite loading: `stt-engine.js` `init()` catch block sets state to idle but provides no distinguishable user feedback between timeout, network error, and permanent failure | v4.6.0
- [ ] [B123] Wake word listener infinite retry loop: `stt-engine.js` Web Speech error handler restarts listener after 1s with no backoff, no max retries, no user notification on permanent failure | v4.6.0

Data Flow Integrity:

- [ ] [B124] Empty transcript submitted to extraction: prep-bay allows `submitTranscript('')` — heuristic extractor creates phantom "Feature" node from silence/empty input, polluting graph | v4.6.0
- [ ] [B125] Heuristic extractor catch-all `Feature` type: `heuristic-extractor.js` TYPE_SIGNALS uses `/./` for Feature — any unclassifiable text becomes a Feature node, degrading graph quality over time | v4.6.0

Browser Compatibility:

- [ ] [B126] MediaRecorder codec not specified: `stt-engine.js` `new MediaRecorder(stream)` uses browser default codec — Safari/Firefox may produce incompatible blobs while server assumes `audio/webm` | v4.6.0
- [ ] [B127] Web Speech API language hardcoded to `en-US`: `stt-engine.js` line 321 — non-English users get forced English recognition | v4.6.0

Performance:

- [ ] [B128] Canvas resize not debounced: `brainstorm-canvas.js` `window.resize` handler recomputes ForceGraph3D physics on every event — locks main thread with 100+ nodes during window resize | v4.6.0

Minor / UX:

- [ ] [B129] Modal audio visualizer canvas not wired: `prep-bay.js` creates `<canvas class="cc-bs-modal-visualizer">` but never connects it to audio analyser | v4.6.0
- [ ] [B130] Export filename has no timestamp: `brainstorm-graph.js` hardcodes `brainstorm-session.json` — second export in same session overwrites first | v4.6.0
- [ ] [B131] Ideation buffer silently discards history beyond 10 entries: `ideation-buffer.js` `MAX_HISTORY=10` with no user warning when oldest thought is dropped | v4.6.0
- [ ] [B132] Long node labels silently truncated server-side: `ConsoleServer.ts` `.slice(0, 200)` with no client feedback — user's full text accepted but shortened without notice | v4.6.0

**Razor Debt (v4.3.1)**

- [ ] [B95] Decompose types.ts (525L) into domain-grouped type files with barrel export | v4.3.1
- [ ] [B96] Extract axiom enforcement from EnforcementEngine.ts (473L) into focused enforcer classes | v4.3.1
- [ ] [B97] Extract inline wiring from main.ts activate() (428L) into dedicated bootstrap modules | v4.3.1
- [ ] [B98] Extract static pages and deps factory from FailSafeApiServer.ts (268L) | v4.3.1
- [ ] [B99] Extract nonce/transparency/ledger from GovernanceAdapter.ts (267L) into manager classes | v4.3.1

**CI/CD Review (FailSafe Plus)**

- [ ] [B100] Release workflow parity gate: add a local or containerized Linux release rehearsal that exercises the exact SemVer, build, extension-host, Playwright, package, and VSIX validation steps used by GitHub Actions before retagging a release | FailSafe Plus
- [ ] [B101] Workflow shell discipline: prevent mixed-shell command syntax in GitHub Actions (`bash` vs `pwsh`) through a workflow lint/check step and review checklist for release jobs | FailSafe Plus
- [ ] [B102] SemVer rerun safety: harden `tools/validate-release-version.ps1` and its tests so reruns on an existing release tag compare against the previous distinct release, not the current tag itself | FailSafe Plus
- [ ] [B103] Case-insensitive ignore audit: add a repository guard that detects source directories accidentally ignored on Windows/macOS by broad patterns such as `Planning/`, and fail release prep when tracked source files are missing from git | FailSafe Plus
- [ ] [B104] Linux headless test prerequisites: codify and validate release-runner requirements for extension-host and Playwright tests (`xvfb`, browser install, runtime deps) so CI cannot reach test execution with missing platform prerequisites | FailSafe Plus
- [ ] [B105] VSIX validation hardening: standardize artifact naming and archive inspection so validation accepts tag-style filenames, package-style filenames, and reads VSIX contents via ZIP-safe tooling rather than tar-specific behavior | FailSafe Plus
- [ ] [B106] Release operator checklist: write an explicit release-prep checklist covering lint debt closure, local `test:all`, local VSIX validation, exact artifact naming, and final ref/tag sequencing before publish | FailSafe Plus

- [ ] [B137] Release branch gate: `/ql-repo-release` must verify current branch is `main` (or merged to main) before tagging and pushing. Feature branches must be merged first. | v4.5
- [ ] [B138] Release pipeline CI gate: GitHub Actions release workflow must gate on `validate.ps1` passing before publishing to marketplaces. Currently publishes even when validation fails. | v4.5
- [ ] [B139] Release backlog coherence: `/ql-repo-release` pre-flight should verify version summary table in `BACKLOG.md` is current and no duplicate B-item numbers exist. | v4.5

- [ ] [B107] Workspace Hook Toggle: Console Settings UI to enable/disable FailSafe Claude Code hooks per workspace. Toggle writes/removes `.claude/hooks/disabled` sentinel. `resolve.sh` checks sentinel before emitting hook content. ConsoleServer routes: `GET /api/hooks/status`, `POST /api/hooks/toggle`. Unifies extension settings (`failsafe.sentinel.enabled`, `failsafe.governance.mode`) with Claude Code hook layer into one control surface. | v4.5
- [ ] [B108] Release pre-flight help doc check: `release-gate.cjs --preflight` should validate version markers in `docs/COMPONENT_HELP.md` and `docs/PROCESS_GUIDE.md` in addition to CHANGELOG/README | v4.5

## Wishlist (Nice to Have)

- [ ] [B90] CLI Overseer Lite Feasibility Extraction: Explore creating a lightweight, CLI-compatible version of FailSafe for direct website integration | v5.0.0
- [ ] [B91] Formal Security Hardening Roadmap Document: Define the 3-phase security implementation plan (Foundation, Advanced, Resilience) with milestone criteria and a dependency graph | v5.0.0

<!-- Earlier wishlist items promoted to Backlog with version tags -->

---

## Version Summary

| Version      | Codename                       | Status         | Description                                                                                                           |
| ------------ | ------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| v1.0.7       | Beta                           | ✅ RELEASED    | Current marketplace                                                                                                   |
| v1.1.0       | Pathfinder                     | ✅ IMPLEMENTED | Event-sourced Plans                                                                                                   |
| v1.2.0       | Navigator                      | ✅ IMPLEMENTED | Roadmap View                                                                                                          |
| v1.2.2       | Cleanup                        | ✅ COMPLETE    | Blockers D1-D3, B1-B2                                                                                                 |
| v1.3.0       | Autopilot                      | ✅ COMPLETE    | B3-B5 all done                                                                                                        |
| v2.0.0       | Governance                     | ✅ COMPLETE    | Gold Standard + ambient (B12-B28)                                                                                     |
| v2.0.1       | Tooltip Remediation            | ✅ COMPLETE    | Template modularization + tooltips (B30)                                                                              |
| v2.0.2       | Marketplace Fix                | ✅ COMPLETE    | README corrections for both marketplaces                                                                              |
| v3.0.0       | Horizon                        | ✅ COMPLETE    | UI + Analytics (B6-B36)                                                                                               |
| v3.0.2       | Dashboard Remediation          | ✅ COMPLETE    | Roadmap card, tooltips, wiring (B37-B40)                                                                              |
| v3.1.0       | Orchestration                  | ✅ SEALED      | Cumulative Roadmap, External Browser (B41-B44)                                                                        |
| v3.2.0       | Reliability Hardening          | ✅ SEALED      | B45/B47/B48/B49/B50/B51 substantiated with executable gate evidence                                                   |
| v3.2.5       | Console Overhaul               | ✅ SEALED      | Partial delivery (B52/B58/B59); remainder deferred to v4.2.0                                                          |
| v4.0.0       | Economics                      | ✅ SEALED      | Token economics, governance modes, risk register, transparency stream                                                 |
| v4.1.0       | Governance Gaps                | ✅ SEALED      | Mode-change audit trail, break-glass, artifact hash, verdict replay (Gaps 1-4)                                        |
| **v4.2.0**   | **The Answer**                 | ✅ SEALED      | Full-stack governance: console, release pipeline, schema hardening, multi-agent fabric, and discovery workflow delivery |
| **v4.3.0**   | **Telemetry Loop**             | ✅ SEALED      | Commit guard, AI provenance tracing, CI governance context export, and post-substantiation quality sweep remediation   |
| **v4.3.1**   | **Security Hardening**         | ✅ SEALED      | SQL injection protection, XSS prevention, README logo correction (B133-B136)                                          |
| **v4.4.0**   | **Mindmap Evolution**          | ✅ SEALED      | Mindmap surface upgrade, UI asset expansion, console integration depth                                                |
| **v4.4.1**   | **Screenshot Refresh**         | ✅ SEALED      | UI screenshots, socket hardening, activation event tightening                                                         |
| **v4.5.0**   | **Skill Discovery**            | ✅ RELEASED    | Skill discovery tags, tag filter, governance skill cohesion, /ql-document skill, CI/CD hardening                      |
| **v4.5.1**   | **Hotfix**                     | ✅ RELEASED    | Fix activation crash when ledger DB unavailable, fix validate.ps1 parameter mismatch                                 |
| **v4.6.0**   | **Section 4 Razor**            | ✅ RELEASED    | Section 4 decomposition, voice brainstorm fixes, hook toggle UI, release gate enhancements                            |
| **v4.6.1**   | **Hotfix**                     | ✅ RELEASED    | Missing sidebar SVG icon, release pipeline branch policy for tag CI, icon validation gate                             |
| **v4.6.2**   | **Hotfix**                     | ✅ RELEASED    | Fix Console Server 404 on dotfile install paths (.vscode/, .antigravity/)                                             |
| **v4.6.3**   | **Hotfix**                     | ✅ RELEASED    | Fix express.static missing dotfiles:allow — CSS/JS/image assets silently 404'd                                        |
| **v4.6.4**   | **Hotfix**                     | ✅ RELEASED    | Governance state integrity — trust persistence, event-driven cache, checkpoint chain verification, version display fix |

---

_Updated by /ql-\* commands automatically_
