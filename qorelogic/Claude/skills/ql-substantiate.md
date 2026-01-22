---
name: ql-substantiate
description: A.E.G.I.S. Substantiation and Session Seal - verifies implementation against blueprint and cryptographically seals the session.
arguments: []
---

# /ql-substantiate - Session Seal

<skill>
  <trigger>/ql-substantiate</trigger>
  <phase>SUBSTANTIATE</phase>
  <persona>Judge</persona>
  <output>Updated META_LEDGER.md with final seal, SYSTEM_STATE.md snapshot</output>
</skill>

## Purpose

The final phase of the A.E.G.I.S. lifecycle. Verify that implementation matches the encoded blueprint (Reality = Promise), then cryptographically seal the session.

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

```markdown
### Reality vs Promise Comparison

| Planned (Blueprint) | Actual (src/) | Status |
|---------------------|---------------|--------|
| src/index.ts | src/index.ts | ✓ EXISTS |
| src/utils/helpers.ts | src/utils/helpers.ts | ✓ EXISTS |
| src/components/Button.tsx | [missing] | ✗ MISSING |
| [not planned] | src/temp.ts | ⚠ UNPLANNED |
```

**Findings**:
- **MISSING**: Planned but not created → FAIL
- **UNPLANNED**: Created but not in blueprint → WARNING (document in ledger)
- **EXISTS**: Matches → PASS

### Step 4: Functional Verification

#### Test Audit
```
Glob: tests/**/*.test.{ts,tsx,js}
Read: Test files
```

```markdown
### Test Coverage

| Component | Test File | Status |
|-----------|-----------|--------|
| [component] | [test file] | ✓ EXISTS |
| [component] | [missing] | ✗ NO TEST |
```

#### Visual Silence Verification (if frontend)
```
Grep: "color:" in src/**/*.{css,tsx}
Grep: "background:" in src/**/*.{css,tsx}
```

Check for violations:
```markdown
### Visual Silence Audit

| File | Line | Violation |
|------|------|-----------|
| [file] | [line] | Hardcoded color: #ff0000 |
```

#### Console.log Artifacts
```
Grep: "console.log" in src/**/*
```

```markdown
### Debug Artifacts

| File | Line | Content |
|------|------|---------|
| [file] | [line] | console.log('debug') |
```

### Step 5: §4 Razor Final Check

```markdown
### Simplicity Compliance

| File | Lines | Max Function | Max Nesting | Status |
|------|-------|--------------|-------------|--------|
| [file] | [X]/250 | [X]/40 | [X]/3 | ✓/✗ |
```

### Step 6: Sync System State

Map the final physical tree:

```
Glob: src/**/*
Glob: tests/**/*
Glob: docs/**/*
```

Create/Update `docs/SYSTEM_STATE.md`:

```markdown
# System State

**Sealed**: [ISO 8601]
**Sealed By**: Judge (substantiation)
**Session ID**: [hash prefix]

## File Tree (Reality)

```
project/
├── docs/
│   ├── CONCEPT.md
│   ├── ARCHITECTURE_PLAN.md
│   ├── META_LEDGER.md
│   └── SYSTEM_STATE.md
├── src/
│   └── [actual tree]
├── tests/
│   └── [actual tree]
└── .agent/
    └── staging/
        └── AUDIT_REPORT.md
```

## Metrics

| Metric | Value |
|--------|-------|
| Total Source Files | [count] |
| Total Test Files | [count] |
| Total Lines of Code | [count] |
| §4 Violations | 0 |
| Test Coverage | [estimate]% |

## Blueprint Compliance

| Promised | Delivered | Match |
|----------|-----------|-------|
| [count] files | [count] files | [100%/%] |
```

### Step 7: Final Merkle Seal

Calculate session seal:

```python
# Gather all relevant content
concept = read_file('docs/CONCEPT.md')
architecture = read_file('docs/ARCHITECTURE_PLAN.md')
audit_report = read_file('.agent/staging/AUDIT_REPORT.md')
system_state = read_file('docs/SYSTEM_STATE.md')
source_files = read_all_files('src/')

# Calculate final hash
final_content = concept + architecture + audit_report + system_state + source_files
content_hash = sha256(final_content)

# Get previous hash from ledger
previous_hash = get_latest_hash('docs/META_LEDGER.md')

# Calculate chain hash (the seal)
session_seal = sha256(content_hash + previous_hash)
```

Update `docs/META_LEDGER.md`:

```markdown
---

### Entry #[N]: SESSION SEAL

**Timestamp**: [ISO 8601]
**Phase**: SUBSTANTIATE
**Author**: Judge
**Type**: FINAL_SEAL

**Session Summary**:
- Files Created: [count]
- Files Modified: [count]
- Tests Added: [count]
- Blueprint Compliance: [percentage]%

**Content Hash**:
```
SHA256(all_artifacts)
= [content_hash]
```

**Previous Hash**: [from entry N-1]

**Session Seal**:
```
SHA256(content_hash + previous_hash)
= [session_seal]
```

**Verdict**: SUBSTANTIATED. Reality matches Promise.

---

*Chain Status: SEALED*
*Next Session: Run /ql-bootstrap for new feature or /ql-status to review*
```

### Step 8: Cleanup Staging

```
Clear: .agent/staging/
```

Preserve only the final AUDIT_REPORT.md (or archive it).

### Step 9: Final Report

```markdown
# Substantiation Report

**Timestamp**: [ISO 8601]
**Session Seal**: [session_seal prefix]...

---

## Verdict: SUBSTANTIATED ✓

Reality matches Promise. Session cryptographically sealed.

---

### Verification Summary

| Check | Result |
|-------|--------|
| Blueprint Compliance | [count]/[count] files |
| Test Coverage | [count] test files |
| Visual Silence | [PASS/violations found] |
| Debug Artifacts | [none/count found] |
| §4 Razor | COMPLIANT |
| Merkle Chain | VALID |

### Session Artifacts

| Artifact | Status | Hash Prefix |
|----------|--------|-------------|
| docs/CONCEPT.md | Sealed | [8 chars] |
| docs/ARCHITECTURE_PLAN.md | Sealed | [8 chars] |
| docs/META_LEDGER.md | Updated | [8 chars] |
| docs/SYSTEM_STATE.md | Updated | [8 chars] |
| .agent/staging/AUDIT_REPORT.md | Archived | [8 chars] |

### Disposition

```
Session: SEALED
Ledger: UPDATED
State: SYNCHRONIZED
```

---

*Substantiated. Reality matches Promise. Session Sealed at [seal_prefix]...*

**Next Actions**:
- New feature: `/ql-bootstrap`
- Check status: `/ql-status`
- Validate chain: `/ql-validate`
```

## Failure Scenarios

### If Reality ≠ Promise:

```markdown
## Verdict: SUBSTANTIATION FAILED ✗

Implementation does not match blueprint.

### Discrepancies

| Type | Details | Required Action |
|------|---------|-----------------|
| MISSING | [file] not created | Implement or update blueprint |
| UNPLANNED | [file] not in blueprint | Remove or update blueprint |
| VIOLATION | §4 breach in [file] | Run /ql-refactor |

### Disposition

Session NOT sealed. Address discrepancies and re-run substantiation.
```

## Constraints

- **NEVER** seal a session with Reality ≠ Promise
- **NEVER** skip any verification step
- **NEVER** seal with §4 violations present
- **ALWAYS** update SYSTEM_STATE.md before sealing
- **ALWAYS** calculate proper chain hash
- **ALWAYS** document any unplanned files in ledger
- **ALWAYS** verify chain integrity before sealing
