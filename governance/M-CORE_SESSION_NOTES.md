# M-CORE IMPLEMENTATION - SESSION NOTES

**Date**: 2026-01-23  
**Phase**: ENCODE (Sprint M-Core.1 - Foundation)  
**Status**: IN PROGRESS

---

## WORK COMPLETED

### 1. Governance Foundation Established ✓

Created the Core Axioms and Integration Contract that define FailSafe's authority:

- `governance/FAILSAFE_AXIOMS.md` - The 5 Prime Axioms
- `governance/ALIGNMENT_MAP.md` - Mapping existing artifacts to Axioms
- `governance/INTEGRATION_CONTRACT.md` - Sovereignty Protocol for execution systems
- `governance/M-CORE_IMPLEMENTATION_PLAN.md` - Detailed blueprint for implementation

### 2. Type System Defined ✓

- `extension/src/governance/types/IntentTypes.ts`
  - Complete TypeScript schema for Intent artifacts
  - Immutability contracts enforced at type level
  - Verdict types (ALLOW/BLOCK/ESCALATE)
  - History tracking schema

### 3. Intent Manifest Manager ✓

- `extension/src/governance/IntentManifest.ts`
  - CRUD operations for Intent lifecycle
  - Append-only history log (JSONL format)
  - Intent archival on SEAL
  - Immutability enforcement (no edits after SEALED)
  - File system scaffolding for `.failsafe/manifest/`

### 4. Enforcement Engine (Partial) ✓

- `extension/src/governance/EnforcementEngine.ts`
  - Axiom 1 (Alignment): Drift detection, Intent requirement
  - Axiom 2 (Integrity): Scope boundary enforcement
  - Axiom 3 (Sovereignty): Gate status validation
  - Verdict generation with user-facing remediation guidance

---

## NEXT STEPS (Sprint M-Core.2 & M-Core.3)

### Immediate (M-Core.2 - Enforcement Integration)

1. **VS Code Hook Integration**
   - Hook `workspace.onWillSaveTextDocument`
   - Hook `workspace.onDidCreateFiles`
   - Call EnforcementEngine.evaluateAction() before writes
   - Display verdict in UI (notification or blocking modal)

2. **Command Registration**
   - `failsafe.createIntent` - Opens Intent creation wizard
   - `failsafe.sealIntent` - Finalizes current Intent
   - `failsafe.checkGateStatus` - Shows current Intent status

3. **Genesis UI Integration**
   - Show active Intent in The Dojo sidebar
   - Display Intent scope in Living Graph (highlight nodes)
   - Alert banner when no Intent is active

### Short-Term (M-Core.3 - Recovery & Persistence)

4. **Session Manager**
   - Implement startup recovery protocol
   - Merkle chain verification on activation
   - Session lock mechanism (`.failsafe/session/LOCKED` file)
   - Unresolved risk alert queue

5. **Testing Strategy**
   - Unit tests for IntentManifest and EnforcementEngine
   - E2E test: Drift detection flow
   - E2E test: Session recovery after restart

---

## DESIGN DECISIONS

### Decision 1: JSONL for History (not SQLite)

**Rationale**: Append-only JSONL is simpler and avoids SQLite dependency for this MVP. Can migrate to DB later if performance requires.

### Decision 2: Single Active Intent

**Rationale**: Prevents execution window overlap and enforces linear Merkle chain. Multi-Intent support is deferred to post-MVP.

### Decision 3: Path Normalization

**Rationale**: Windows/Unix path separator differences handled via normalization. Prevents false positives in scope checking.

---

## RISKS IDENTIFIED

1. **Performance**: File save hooks may add latency. Mitigation: Cache Intent in memory; async Sentinel verification.
2. **User Friction**: Blocking saves without Intent may frustrate users. Mitigation: Clear remediation messages; ESCALATE for ambiguous cases.
3. **Backward Compat**: Existing workspaces have no .failsafe/ structure. Mitigation: Auto-scaffold on first activation; feature flag for strict mode.

---

## OUTSTANDING QUESTIONS

1. **Q**: Should we auto-create an Intent for the first detected file save if none exists?  
   **A**: TBD - Discuss with user. Lean toward BLOCK to enforce intentionality.

2. **Q**: How should we handle Intent scope wildcards (e.g., `src/**/*.ts`)?  
   **A**: Implement glob matching in Axiom 2 enforcement (use `minimatch` library).

3. **Q**: Should Sentinel verification be synchronous or async?  
   **A**: Async. Fire-and-forget for L1; await verdict for L2/L3.

---

## PROGRESS AGAINST M-CORE PLAN

| Deliverable                   | Status          | Completion                         |
| ----------------------------- | --------------- | ---------------------------------- |
| D1: Intent Manifest System    | **COMPLETE**    | 100%                               |
| D2: Enforcement Engine        | **PARTIAL**     | 60% (Axioms 1-3 done; 4-5 pending) |
| D3: Session Recovery          | **NOT STARTED** | 0%                                 |
| D4: Integration with Existing | **NOT STARTED** | 0%                                 |

**Overall M-Core Progress**: ~40%

---

## NEXT SESSION HANDOFF

**Priority**: Wire EnforcementEngine to VS Code file save hooks and test Drift detection.

**Current Blocker**: Need to decide on auto-Intent creation policy. Recommend forcing explicit Intent creation to maintain Axiom 1 purity.

**Estimated Time to MVP**: 2-3 more sessions (6-9 hours).
