# IMPLEMENTATION_PLAN.md

This document formalizes the execution plan for the MythologIQ: FailSafe extension. It integrates the original remediation timeline from `GapAudit.md` with enhanced "Process Hardening" protocols derived from Zo/Celestara lessons learned.

## Phase 1: Foundation & Alignment (Current)

### M0: Spec/Manifest Alignment (Sprint 0.1)

**Goal**: Eliminate drift between `FAILSAFE_SPECIFICATION.md` and `package.json`.

- [ ] **Action**: Update `package.json` to match Spec.
  - Add `onCommand:failsafe.generateFeedback` activation event.
  - Add `failsafe.feedback.outputDir` configuration.
  - Align `main` entry point (`./out/extension/main.js` vs `./out/extension.js`).

### M1: Storage + Ledger Backbone

**Goal**: Establish the filesystem persistence layer.

- [ ] **Sprint 1.1**: `.failsafe` scaffold (ConfigManager).
- [ ] **Sprint 1.2**: SQLite-backed SOA Ledger.

## Phase 2: The Sentinel (Hardened)

### M2: Sentinel Enforcement Engine

**Goal**: Active monitoring with "Zo Mitigation" enhancements.

- [ ] **Sprint 2.1**: Pattern Library (YAML + Custom).
- [ ] **Sprint 2.2**: Structural Checks (File existence).
- [ ] **Sprint 2.3 (NEW)**: **Macro-KISS Architecture Validation**.
  - _Lesson Learned_: Code quality checks missed architectural bloat.
  - _Implementation_: New Sentinel engine `ArchitectureEngine` that checks:
    - Number of active services vs. user count (heuristic).
    - Technology stack coherence (prevent "Polyglot for no reason").
    - Resource cap enforcement.

## Phase 3: Governance & Trust

### M3: QoreLogic Governance Layer

**Goal**: Trust persistence and Persona integrity.

- [ ] **Sprint 3.1**: Trust Engine persistence.
- [ ] **Sprint 3.2**: Shadow Genome (Failure Archival).
- [ ] **Sprint 3.3 (NEW)**: **Hardened Persona Protocol**.
  - _Lesson Learned_: "Text-based" persona switching failed.
  - _Implementation_:
    - Enforce "Stop & Reload" context breaks.
    - Governor prompt must include "Adversarial Phase".
    - Judge prompt must include "Stranger Protocol" (assume all input is hostile).

## Phase 4: User Experience

### M4: Genesis UI

**Goal**: Visualization and Feedback.

- [ ] **Sprint 4.1**: Wireframes and Sidebar views.
- [ ] **Sprint 4.2**: Living Graph implementation.
- [ ] **Sprint 4.3 (NEW)**: **Community Feedback Loop**.
  - Implement `failsafe.generateFeedback` command.
  - Output GUID-stamped JSON to `.failsafe/feedback`.
  - (Future) Github Issue integration.

## Execution Log

| Date       | Sprint | Action         | Status      |
| ---------- | ------ | -------------- | ----------- |
| 2026-01-22 | M0.1   | Spec Alignment | In Progress |
