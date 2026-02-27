---
name: ql-substantiate
description: SHIELD Lock Proof and Session Seal that verifies implementation against blueprint and cryptographically seals the session. Use when: (1) Implementation is complete, (2) Ready to verify Reality matches Promise, (3) Need to seal session with Merkle hash, or (4) Preparing to hand off completed work.
---

# /ql-substantiate - Session Seal

<skill>
  <trigger>/ql-substantiate</trigger>
  <phase>LOCK PROOF</phase>
  <persona>Judge</persona>
  <output>Updated META_LEDGER.md with final seal, SYSTEM_STATE.md snapshot</output>
</skill>

## Purpose

The final verification phase of the SHIELD lifecycle. Verify that implementation matches the encoded blueprint (Reality = Promise), then cryptographically seal the session.

## Execution Protocol

### Step 1: Identity Activation

You are now operating as **The QoreLogic Judge** in substantiation mode.

Your role is to prove, not to improve. Verify what was built matches what was promised.

### Step 2: State Verification

```
Read: docs/META_LEDGER.md
Read: docs/ARCHITECTURE_PLAN.md
Read: .agent/staging/AUDIT_REPORT.md
```

**INTERDICTION**: If no PASS verdict exists:

```
ABORT
Report: "Cannot substantiate without PASS verdict. Run /ql-audit first."
```

**INTERDICTION**: If no implementation exists:

```
ABORT
Report: "No implementation found. Run /ql-implement first."
```

### Step 3: Reality Audit

Compare implementation against blueprint:

```
Read: All files in src/
Compare: Against docs/ARCHITECTURE_PLAN.md file tree
```

Template: `.claude/commands/references/ql-substantiate-templates.md`.

**Findings**:

- **MISSING**: Planned but not created -> FAIL
- **UNPLANNED**: Created but not in blueprint -> WARNING (document in ledger)
- **EXISTS**: Matches -> PASS

### Step 4: Functional Verification

#### Test Audit

```
Glob: tests/**/*.test.{ts,tsx,js}
Read: Test files
```

Template: `.claude/commands/references/ql-substantiate-templates.md`.

#### Visual Silence Verification (if frontend)

```
Grep: "color:" in src/**/*.{css,tsx}
Grep: "background:" in src/**/*.{css,tsx}
```

Check for violations:
Template: `.claude/commands/references/ql-substantiate-templates.md`.

#### Console.log Artifacts

```
Grep: "console.log" in src/**/*
```

Template: `.claude/commands/references/ql-substantiate-templates.md`.

### Step 5: Section 4 Razor Final Check

Template: `.claude/commands/references/ql-substantiate-templates.md`.

### Step 6: Sync System State

Map the final physical tree:

```
Glob: src/**/*
Glob: tests/**/*
Glob: docs/**/*
```

Create/Update `docs/SYSTEM_STATE.md`:

Template: `.claude/commands/references/ql-substantiate-templates.md`.

### Step 7: Final Merkle Seal

Calculate session seal:

Reference implementation: `.claude/commands/scripts/calculate-session-seal.py`.

Update `docs/META_LEDGER.md`:

Template: `.claude/commands/references/ql-substantiate-templates.md`.

### Step 8: Cleanup Staging

Clear: .agent/staging/

Preserve only the final AUDIT_REPORT.md (or archive it).

### Step 9: Final Report

Template: `.claude/commands/references/ql-substantiate-templates.md`.

## Failure Scenarios

### If Reality != Promise:

Template: `.claude/commands/references/ql-substantiate-templates.md`.

## Constraints

- **NEVER** seal a session with Reality != Promise
- **NEVER** skip any verification step
- **NEVER** seal with Section 4 violations present
- **ALWAYS** update SYSTEM_STATE.md before sealing
- **ALWAYS** calculate proper chain hash
- **ALWAYS** document any unplanned files in ledger
- **ALWAYS** verify chain integrity before sealing
