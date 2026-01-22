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

- [x] **Sprint 1.1**: `.failsafe` scaffold (ConfigManager).
- [x] **Sprint 1.2**: SQLite-backed SOA Ledger.

### M1.5: Tribunal Remediation (CRITICAL - 2026-01-22)

**Goal**: Address critical findings from External Tribunal audit (Codex, Claude, GLM 4.7).

**Source**: `.agent/staging/responses/AGENT_*.md`

- [ ] **Sprint 1.5.1 [P0]**: **Harden `verifyChain()` Implementation**
  - _Finding_: Chain verification is "cryptographic theater"—hashes are not recalculated, signatures are not validated (Claude: CWE-345, CWE-347).
  - _Action_:
    1. Recalculate `entryHash` from all persisted fields during verification.
    2. Verify HMAC signature against recalculated hash.
    3. Replace genesis placeholders with computed values.

- [ ] **Sprint 1.5.2 [P0]**: **Fix Extension Lifecycle (close() on deactivate)**
  - _Finding_: `ledgerManager.close()` is never called; database locks persist across VS Code restarts (GLM 4.7: Edge Case #6).
  - _Action_:
    1. Move `ledgerManager` to module scope in `main.ts`.
    2. Call `ledgerManager.close()` in `deactivate()`.
    3. Guard `initialize()` against double-initialization.

- [ ] **Sprint 1.5.3 [P1]**: **Migrate Secret Storage**
  - _Finding_: HMAC signing secret stored in unencrypted `globalState` (Claude: CWE-522).
  - _Action_: Use VS Code's `SecretStorage` API (`context.secrets`).

- [ ] **Sprint 1.5.4 [P2]**: **Harden ConfigManager**
  - _Finding_: `fs.mkdirSync` failures crash extension; YAML writes are non-atomic (Codex, GLM 4.7).
  - _Action_:
    1. Wrap `fs.mkdirSync` in try-catch with user-friendly error.
    2. Implement atomic write (write to `.tmp`, then rename).

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

| Date       | Sprint | Action                        | Status      |
| ---------- | ------ | ----------------------------- | ----------- |
| 2026-01-22 | M0.1   | Spec Alignment                | ✅ Complete |
| 2026-01-22 | M1.1   | ConfigManager Scaffold        | ✅ Complete |
| 2026-01-22 | M1.2   | SQLite Ledger Implementation  | ✅ Complete |
| 2026-01-22 | M1.5   | External Tribunal Audit       | ✅ Complete |
| 2026-01-22 | M1.5.1 | Harden verifyChain [P0]       | ✅ Complete |
| 2026-01-22 | M1.5.2 | Fix deactivate lifecycle [P0] | ✅ Complete |
| 2026-01-22 | M1.5.3 | Migrate SecretStorage [P1]    | ✅ Complete |
| 2026-01-22 | M1.5.4 | Harden ConfigManager [P2]     | ✅ Complete |
