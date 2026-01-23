# M-CORE: GOVERNING SUBSTRATE - IMPLEMENTATION PLAN

**Phase**: ENCODE (Architecture Blueprint)  
**Risk Grade**: L3 (Security-Critical, Foundation)  
**Target Completion**: Sprint 0.0 (Pre-remediation)

---

## OBJECTIVE

Transform FailSafe from documentation into **enforceable infrastructure** by implementing the Prime Axioms as code-level constraints.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE SUBSTRATE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  Intent Manifest │◄────────┤ Enforcement      │            │
│  │  (Immutable Log) │         │ Engine           │            │
│  └────────┬─────────┘         └────────┬─────────┘            │
│           │                            │                       │
│           │  ┌──────────────────┐      │                       │
│           └─►│ Session Manager  │◄─────┘                       │
│              │ (Recovery/Lock)  │                              │
│              └──────────────────┘                              │
│                       │                                         │
│              ┌────────▼────────┐                               │
│              │  Verdict Engine │                               │
│              │ (ALLOW/BLOCK/   │                               │
│              │  ESCALATE)      │                               │
│              └─────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DELIVERABLES

### D1: Intent Manifest System

**Purpose**: Immutable binding of Intent → Action → Outcome

**Files**:

- `extension/src/governance/IntentManifest.ts` - Core manifest management
- `extension/src/governance/types/IntentTypes.ts` - Type definitions
- `.failsafe/manifest/active_intent.json` - Current execution window
- `.failsafe/manifest/intent_history.jsonl` - Append-only log

**Schema**:

```typescript
interface Intent {
  id: string; // UUID
  type: "feature" | "refactor" | "bugfix" | "security";
  createdAt: string; // ISO timestamp
  purpose: string; // One-sentence "why"
  scope: {
    files: string[]; // Affected file paths
    modules: string[]; // Affected modules
    riskGrade: "L1" | "L2" | "L3";
  };
  blueprint?: string; // Path to ARCHITECTURE_PLAN.md
  status: "PULSE" | "PASS" | "VETO" | "SEALED";
  evidence?: {
    testsPassed: boolean;
    buildSucceeded: boolean;
    visualVerified: boolean;
  };
  merkleRef?: string; // Ledger entry linking
}
```

**Enforcement Points**:

1. **File Write Hook**: Before any file modification, verify active Intent exists
2. **Scope Guard**: Reject writes to files outside Intent.scope.files
3. **Drift Detection**: Flag actions taken without Intent ID

---

### D2: Enforcement Engine

**Purpose**: Evaluate proposed actions against Axioms and return verdict

**Files**:

- `extension/src/governance/EnforcementEngine.ts` - Core evaluation logic
- `extension/src/governance/rules/AxiomRules.ts` - Axiom implementations

**API**:

```typescript
interface EnforcementEngine {
  evaluateAction(action: ProposedAction): Verdict;
  enforceAxiom(axiom: AxiomType, context: ActionContext): VerdictResult;
}

type Verdict =
  | { status: "ALLOW"; reason: string }
  | { status: "BLOCK"; violation: string; remediation: string }
  | { status: "ESCALATE"; escalationTo: "L3_QUEUE"; reason: string };
```

**Axiom Implementations**:

- **Axiom 1 (Alignment)**: Check activeIntent !== null before write
- **Axiom 2 (Integrity)**: Queue Sentinel verification for all claims
- **Axiom 3 (Sovereignty)**: Enforce gate status (PULSE/PASS/VETO)
- **Axiom 4 (Persistence)**: Verify session continuity on restart
- **Axiom 5 (Simplicity)**: Invoke §4 Razor checks pre-commit

---

### D3: Session Recovery & Locking

**Purpose**: Prove survivability across cold restarts

**Files**:

- `extension/src/governance/SessionManager.ts` - Session lifecycle
- `.failsafe/session/current_session.json` - State snapshot
- `.failsafe/session/unresolved_risks.json` - Alert queue

**Recovery Protocol**:

```
Extension Activation
    │
    ▼
┌────────────────────────┐
│ Load Session State     │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Check Unresolved Risks │──► If exists: LOCK & Alert User
└───────┬────────────────┘
        │ No risks
        ▼
┌────────────────────────┐
│ Verify Merkle Chain    │──► If broken: LOCK & Require Repair
└───────┬────────────────┘
        │ Chain valid
        ▼
┌────────────────────────┐
│ Resume Governance      │──► READY state
└────────────────────────┘
```

**Locking Mechanism**:

- Create `.failsafe/session/LOCKED` file on critical failure
- Block all write operations until manual unlock (via command)
- Display alert in Genesis UI with remediation steps

---

### D4: Integration with Existing Systems

**VS Code Extension**:

- Hook `workspace.onWillSaveTextDocument` → EnforcementEngine.evaluateAction()
- Hook `workspace.onDidCreateFiles` → Verify against Intent.scope.files
- Register command `failsafe.unlockSession` for manual override

**Sentinel Daemon**:

- Emit `claim_detected` events to EnforcementEngine
- Update Intent.evidence on verification pass/fail

**QoreLogic Ledger**:

- Link Intent IDs to Ledger entries (merkleRef field)
- Record Verdicts in SOA Ledger for auditability

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Sprint M-Core.1)

**Scope**: Types, Intent Manifest, basic storage  
**Deliverables**:

- IntentTypes.ts with complete schema
- IntentManifest.ts with CRUD operations
- File system scaffold for .failsafe/manifest/
- Unit tests for Intent creation/retrieval

**Acceptance**:

- Can create Intent with all required fields
- Intent persists to JSON and survives reload
- Intent history is append-only

---

### Phase 2: Enforcement (Sprint M-Core.2)

**Scope**: EnforcementEngine, Axiom Rules  
**Deliverables**:

- EnforcementEngine.ts with evaluateAction() core
- AxiomRules.ts implementing all 5 Axioms
- Integration with VS Code file hooks
- E2E test: File write blocked without Intent

**Acceptance**:

- Attempting to save file without active Intent triggers BLOCK verdict
- BLOCK verdict displays user-facing error with remediation
- ALLOW verdict permits write and logs to Intent history

---

### Phase 3: Recovery (Sprint M-Core.3)

**Scope**: SessionManager, startup locking  
**Deliverables**:

- SessionManager.ts with recovery protocol
- Startup sequence modified to check session state
- Unresolved risk alert UI in Genesis
- Command: `failsafe.unlockSession`

**Acceptance**:

- Extension restart loads previous session state
- If Merkle chain broken, extension shows LOCKED modal
- User can view unresolved risks and remediate
- Unlock command clears lock after user confirmation

---

### Phase 4: Integration (Sprint M-Core.4)

**Scope**: Wire to Sentinel, QoreLogic, Genesis UI  
**Deliverables**:

- Sentinel emits events to EnforcementEngine
- Intent status displayed in The Dojo sidebar
- Living Graph shows Intent scope highlighting
- L3 Queue shows pending Intent approvals

**Acceptance**:

- Sentinel verification updates Intent.evidence
- Active Intent visible in Genesis UI
- Graph nodes within Intent scope are highlighted
- Session lock status shows in Dojo

---

## TESTING STRATEGY

### Unit Tests

- Intent CRUD operations
- Axiom rule evaluation (all 5)
- Verdict generation logic
- Session state serialization

### Integration Tests

- File save hook → EnforcementEngine flow
- Sentinel → Intent evidence update
- Merkle chain verification on startup
- Lock/unlock cycle

### E2E Tests (Playwright)

1. **Intent Lifecycle**: Create intent → Open window → Write file → Substantiate
2. **Drift Detection**: Write file outside Intent scope → Verify BLOCK
3. **Session Recovery**: Force restart → Verify state restoration
4. **Lock State**: Break chain → Verify LOCKED modal → Unlock flow

---

## RISKS & MITIGATIONS

| Risk                               | Severity | Mitigation                                                  |
| ---------------------------------- | -------- | ----------------------------------------------------------- |
| Performance impact on file saves   | L2       | Cache Intent in memory; async verification                  |
| User friction from false positives | L2       | ESCALATE verdict for ambiguous cases                        |
| Backward compat with existing FS   | L3       | Feature flag: `failsafe.governance.strict` (default: false) |
| Merkle chain corruption            | L3       | Daily backups to .failsafe/backups/; repair tool            |

---

## SUCCESS CRITERIA

1. ✓ Intent Manifest creates immutable Intent-Action binding
2. ✓ EnforcementEngine blocks writes without active Intent
3. ✓ Session survives restart without loss of governance state
4. ✓ User can unlock session after reviewing unresolved risks
5. ✓ All 5 Axioms have corresponding enforcement rules in code
6. ✓ E2E tests prove Drift is detected and blocked

---

## NEXT ACTIONS

1. **Governor Approval**: Review this blueprint for PASS/VETO verdict
2. **Judge Audit**: Security review of Intent schema and lock mechanism
3. **Specialist Implementation**: Begin Phase 1 (Foundation)

**Estimated Effort**: 4 sprints × 2-3 hours = 8-12 hours total

---

_Blueprint Status: AWAITING_GATE_  
_Risk Grade: L3_  
_Requires: Tribunal Audit before implementation_
