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

### v3.0.0 Horizon (UI + Analytics) ✅ IN PROGRESS

**Alternate Views** ✅
- [x] [B6] Create FailSafe/extension/src/genesis/components/ folder ✅ | v3.0.0
- [x] [B7] Implement KanbanView.ts - Kanban column visualization ✅ | v3.0.0
- [x] [B8] Implement TimelineView.ts - Gantt-style timeline ✅ | v3.0.0
- [x] [B9] Risk markers on roadmap visualization ✅ | v3.0.0
- [x] [B10] Milestone support in PlanManager ✅ | v3.0.0
- [ ] [B11] UI polish and theme refinements (deferred to v3.2.5 with B46) | v3.2.5

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

### v3.1.0 Cumulative Roadmap - Visual Orchestration Layer (plan-v3.1.0-cumulative-roadmap.md) SEALED
- [x] [B41] Phase 1: Cumulative Data Model (Sprint type, getAllPlans, archiveSprint) ✅ | v3.1.0
- [x] [B42] Phase 2: Roadmap HTTP Server (Express + WebSocket on port 9376) ✅ | v3.1.0
- [x] [B43] Phase 3: Roadmap Browser UI (timeline, planning hub, dynamic feedback) ✅ | v3.1.0
- [x] [B44] Phase 4: Wire Commands (failsafe.openRoadmap, Ctrl+Alt+Shift+R) ✅ | v3.1.0


### v3.2.0 Reliability Hardening - SEALED
- [x] [B51] Implement User Intent Gate (clarification, pause points, safety pushback, intent lock) | v3.2.0
- [x] [B45] D10 Razor remediation - decompose GenesisManager.ts under 250-line cap | v3.2.0
- [x] [B47] Add `validate.ps1` Gold Standard checks (carryforward from B25) | v3.2.0
- [x] [B48] Operationalize Autonomous Reliability Manifest into concrete sprint artifacts and workflow gates | v3.2.0
- [x] [B49] Build Skill Admission Gate for external and user-imported skills (standard + protocol compliance) | v3.2.0
- [x] [B50] Enforce Gate-to-Skill requirements matrix across reliability workflow stages | v3.2.0

### v3.2.5 Follow-On Hardening (IN PROGRESS)
- [ ] [B46] FailSafe Console UI overhaul and refinement (deferred by user on 2026-02-10, expanded via console spec packet) | v3.2.5
- [x] [B52] Enforce GitHub branch/PR standards in FailSafe and team workflow tooling (branch taxonomy, PR-first merges, policy checks) | v3.2.5
- [ ] [B53] Implement Console route shell + profile-based IA (`/home`, `/run/:runId`, `/workflows`, `/skills`, `/genome`, `/reports`, `/settings`) | v3.2.5
- [ ] [B54] Implement configuration profiles and precedence (`run > workspace > user > defaults`) with visibility flags | v3.2.5
- [ ] [B55] Align workflow run/evidence model contracts (run/stage/gate/claim/evidence/attempt/export bundle parity) | v3.2.5
- [ ] [B56] Implement security and skill-registry enforcement surfaces (permission scopes, pinning, redaction, invocation audit) | v3.2.5
- [ ] [B57] Build journey-based acceptance and adversarial E2E suite for P1-P5 from console spec | v3.2.5
- [x] [B58] Add explicit `Prep Workspace (Bootstrap)` UI action to inject required extension/workspace files and run hygiene checks | v3.2.5
- [ ] [B59] Add run-level `Panic` (`Stop/Cancel Run`) button with hard abort semantics and ledgered reason capture | v3.2.5
- [ ] [B60] Add `Undo Last Attempt` UI action with rollback integrity verification and user feedback | v3.2.5
- [ ] [B61] Implement required empty-state UX flows (no workspace, no failures, no skills, no runs) | v3.2.5
- [ ] [B62] Add first-run permission preflight summary for scope grants and deny-by-default transparency | v3.2.5
- [ ] [B63] Enforce accessibility baseline (keyboard nav, focus order, labels) on core console routes | v3.2.5
- [ ] [B64] Add branch-protection parity checks and PR evidence checklist enforcement in repo standards | v3.2.5
- [ ] [B65] Enforce `Prep Workspace (Bootstrap)` idempotency and duplicate-injection prevention | v3.2.5

## Wishlist (Nice to Have)
<!-- All wishlist items promoted to Backlog with version tags -->

---

## Version Summary

| Version | Codename | Status | Description |
|---------|----------|--------|-------------|
| v1.0.7 | Beta | ✅ RELEASED | Current marketplace |
| v1.1.0 | Pathfinder | ✅ IMPLEMENTED | Event-sourced Plans |
| v1.2.0 | Navigator | ✅ IMPLEMENTED | Roadmap View |
| v1.2.2 | Cleanup | ✅ COMPLETE | Blockers D1-D3, B1-B2 |
| v1.3.0 | Autopilot | ✅ COMPLETE | B3-B5 all done |
| v2.0.0 | Governance | ✅ COMPLETE | Gold Standard + ambient (B12-B28) |
| v2.0.1 | Tooltip Remediation | ✅ COMPLETE | Template modularization + tooltips (B30) |
| v2.0.2 | Marketplace Fix | ✅ COMPLETE | README corrections for both marketplaces |
| v3.0.0 | Horizon | ✅ COMPLETE | UI + Analytics (B6-B36) |
| v3.0.2 | Dashboard Remediation | ✅ COMPLETE | Roadmap card, tooltips, wiring (B37-B40) |
| **v3.1.0** | **Orchestration** | **SEALED** | Cumulative Roadmap, External Browser (B41-B44) |
| **v3.2.0** | **Reliability Hardening** | **SEALED** | B45/B47/B48/B49/B50/B51 substantiated with executable gate evidence |
| **v3.2.5** | **Console Overhaul** | **IN PROGRESS** | UI overhaul + GitHub standards + safety/accessibility hardening (B46/B52-B65) |

---

_Updated by /ql-* commands automatically_


