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
- [ ] [B25] validate.ps1 - Add Gold Standard checks | v2.0.0

**Phase 5: Self-Application (FailSafe)** ✅
- [x] [B22] FailSafe repo community files + .github/ templates ✅ | v2.0.0

**Phase 6: Multi-Environment Sync** ✅
- [x] [B23] Antigravity skill sync ✅ | v2.0.0
- [x] [B24] VSCode prompt sync ✅ | v2.0.0

**Phase 7: Specialized Agents** ✅
- [x] [B27] ql-technical-writer agent - Documentation quality ✅ | v2.0.0
- [x] [B28] ql-ux-evaluator agent - UI/UX testing (Playwright) ✅ | v2.0.0

### v3.0.0 Horizon (UI + Analytics)
<!-- Note: May become addon extension if core extension size limits -->

**Alternate Views**
- [ ] [B6] Create FailSafe/extension/src/genesis/components/ folder | v3.0.0
- [ ] [B7] Implement KanbanView.ts - Kanban column visualization | v3.0.0
- [ ] [B8] Implement TimelineView.ts - Gantt-style timeline | v3.0.0
- [ ] [B9] Risk markers on roadmap visualization | v3.0.0
- [ ] [B10] Milestone support in PlanManager | v3.0.0
- [ ] [B11] UI polish and theme refinements | v3.0.0

**Token Analytics**
- [ ] [B29] Token ROI Dashboard - "Without FailSafe" vs "With FailSafe" comparison | v3.0.0

## Wishlist (Nice to Have)
<!-- All wishlist items promoted to Backlog with version tags -->

---

## Version Summary

| Version | Codename | Status | Description |
|---------|----------|--------|-------------|
| v1.0.7 | Beta | ✅ RELEASED | Current marketplace |
| v1.1.0 | Pathfinder | ✅ IMPLEMENTED | Event-sourced Plans |
| v1.2.0 | Navigator | ✅ IMPLEMENTED | Roadmap View |
| **v1.2.2** | **Cleanup** | ✅ **COMPLETE** | Blockers D1-D3, B1-B2 |
| **v1.3.0** | **Autopilot** | ✅ **COMPLETE** | B3-B5 all done |
| v2.0.0 | Governance | ✅ COMPLETE | Gold Standard + ambient (B12-B28) |
| **v2.0.1** | **Tooltip Remediation** | ✅ **COMPLETE** | Template modularization + tooltips (B30) |
| v3.0.0 | Horizon | Planned | UI + Analytics (B6-B11, B29) |

---

_Updated by /ql-* commands automatically_
