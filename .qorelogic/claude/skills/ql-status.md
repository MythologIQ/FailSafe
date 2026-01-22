---
name: ql-status
description: Lifecycle diagnostic - analyzes project artifacts to determine current A.E.G.I.S. stage and required actions.
arguments: []
---

# /ql-status - Lifecycle Diagnostic

<skill>
  <trigger>/ql-status</trigger>
  <phase>ANY</phase>
  <persona>Governor</persona>
  <output>Status table with stage, persona, integrity, next step</output>
</skill>

## Purpose

Perform a non-destructive "MRI" of the project's health and lifecycle stage. This command never modifies files - it only reads and reports.

## Execution Protocol

### Step 1: Identity Activation
You are now operating as **The QoreLogic Governor** in diagnostic mode.

### Step 2: Environment Scan

Gather project state:

```
Glob: docs/META_LEDGER.md
Glob: docs/CONCEPT.md
Glob: docs/ARCHITECTURE_PLAN.md
Glob: .agent/staging/AUDIT_REPORT.md
Glob: docs/SYSTEM_STATE.md
Glob: src/**/*
```

### Step 3: Lifecycle Stage Detection

Evaluate file presence and content to determine state:

#### State: UNINITIALIZED
**Condition**: `docs/META_LEDGER.md` does not exist

```markdown
## Status: UNINITIALIZED

No QoreLogic DNA detected in this project.

**Directive**: Run `/ql-bootstrap` to initialize the A.E.G.I.S. lifecycle.
```

#### State: ALIGN/ENCODE
**Condition**: Ledger exists BUT `docs/ARCHITECTURE_PLAN.md` is missing or empty

```markdown
## Status: ALIGN/ENCODE

Strategy documentation incomplete. The Governor is required.

**Missing**:
- [ ] docs/ARCHITECTURE_PLAN.md

**Directive**: Complete the ENCODE phase with technical blueprint.
```

#### State: GATED (Awaiting Tribunal)
**Condition**: Blueprint exists BUT no "PASS" verdict in `.agent/staging/AUDIT_REPORT.md`

```markdown
## Status: GATED

Blueprint exists but tribunal pending. The Judge is required.

**Risk Grade**: [from ARCHITECTURE_PLAN]

**Directive**: Invoke `/ql-audit` to generate PASS/VETO verdict.
```

#### State: IMPLEMENTING
**Condition**: "PASS" verdict exists AND implementation is underway in `src/`

```markdown
## Status: IMPLEMENTING

Gate cleared. The Specialist is active.

**Implementation Progress**:
- Files created: [count]
- Files remaining: [count based on blueprint]

**Directive**: Continue implementation. Apply the §4 Razor.
```

#### State: SUBSTANTIATING
**Condition**: Implementation appears complete BUT session not sealed in ledger

```markdown
## Status: SUBSTANTIATING

Work complete. The Judge must verify and seal.

**Directive**: Invoke `/ql-substantiate` to seal the session.
```

#### State: SEALED
**Condition**: Final seal entry exists in META_LEDGER

```markdown
## Status: SEALED

Session complete. Reality matches Promise.

**Last Seal**: [hash prefix] at [timestamp]

**Directive**: Start new feature with `/ql-bootstrap` or modify existing with appropriate routing.
```

### Step 4: Merkle Chain Integrity Check

```python
# Read the ledger
ledger = read_file("docs/META_LEDGER.md")

# Extract all entries
entries = parse_entries(ledger)

# Verify chain
previous_hash = "GENESIS"
chain_valid = True
broken_at = None

for i, entry in enumerate(entries):
    expected_hash = sha256(entry.content + previous_hash)
    if entry.recorded_hash != expected_hash:
        chain_valid = False
        broken_at = i + 1
        break
    previous_hash = entry.recorded_hash
```

**Integrity Report**:
```markdown
### Merkle Chain Integrity

| Check | Result |
|-------|--------|
| Chain Status | [VALID / BROKEN] |
| Total Entries | [count] |
| Last Valid Entry | #[number] |
| Broken At | [#number or N/A] |
```

If broken:
```markdown
**WARNING**: Chain integrity compromised at Entry #[X].
Manual audit required. Do not proceed with implementation.
```

### Step 5: Routing Recommendation

Based on detected state, provide explicit routing:

```markdown
### Recommended Action

| Current State | Active Persona | Next Command |
|---------------|----------------|--------------|
| [state] | [Governor/Judge/Specialist] | [/ql-xxx] |
```

### Step 6: Full Status Report

```markdown
# QoreLogic Status Report

**Timestamp**: [ISO 8601]
**Project**: [from CONCEPT.md or directory name]

## Lifecycle Stage

| Attribute | Value |
|-----------|-------|
| **Stage** | [UNINITIALIZED / ALIGN / ENCODE / GATED / IMPLEMENTING / SUBSTANTIATING / SEALED] |
| **Active Persona** | [Governor / Judge / Specialist / None] |
| **Risk Grade** | [L1 / L2 / L3 / Unknown] |
| **Chain Integrity** | [VALID / BROKEN at #X] |

## Artifact Status

| Artifact | Status | Last Modified |
|----------|--------|---------------|
| docs/CONCEPT.md | [✓ / ✗ / Missing] | [date or N/A] |
| docs/ARCHITECTURE_PLAN.md | [✓ / ✗ / Missing] | [date or N/A] |
| docs/META_LEDGER.md | [✓ / ✗ / Missing] | [date or N/A] |
| .agent/staging/AUDIT_REPORT.md | [PASS / VETO / Missing] | [date or N/A] |
| docs/SYSTEM_STATE.md | [✓ / ✗ / Missing] | [date or N/A] |

## Implementation Progress

| Metric | Value |
|--------|-------|
| Planned Files | [count from blueprint] |
| Created Files | [count in src/] |
| Completion | [percentage]% |

## Next Step

**Command**: `/ql-[xxx]`
**Reason**: [why this is the next required action]

---
*Status generated by QoreLogic Governor*
```

## Constraints

- **NEVER** modify any files during status check
- **ALWAYS** verify Merkle chain integrity
- **ALWAYS** provide explicit next action
- **ALWAYS** identify the correct active persona
