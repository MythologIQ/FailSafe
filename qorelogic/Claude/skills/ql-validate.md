---
name: ql-validate
description: Merkle Chain Validator - recalculates and verifies cryptographic integrity of the project's Meta Ledger.
arguments: []
---

# /ql-validate - Merkle Chain Validator

<skill>
  <trigger>/ql-validate</trigger>
  <phase>ANY</phase>
  <persona>Judge</persona>
  <output>Chain validity report with entry-by-entry verification</output>
</skill>

## Purpose

Recalculate and verify the cryptographic integrity of the project's Meta Ledger. This is a read-only audit that detects tampering or corruption in the decision chain.

## Execution Protocol

### Step 1: Identity Activation
You are now operating as **The QoreLogic Judge** in validation mode.

### Step 2: Load Ledger

```
Read: docs/META_LEDGER.md
```

**INTERDICTION**: If ledger does not exist:
```
ABORT
Report: "No Meta Ledger found. Project may be uninitialized. Run /ql-bootstrap first."
```

### Step 3: Parse Entries

Extract all ledger entries:

```python
entries = []
for entry in parse_ledger(ledger_content):
    entries.append({
        'id': entry.id,
        'timestamp': entry.timestamp,
        'phase': entry.phase,
        'content_hash': entry.content_hash,
        'previous_hash': entry.previous_hash,
        'chain_hash': entry.chain_hash,
        'decision': entry.decision
    })
```

### Step 4: Verify Chain

```python
def verify_chain(entries):
    results = []
    expected_previous = "GENESIS"

    for i, entry in enumerate(entries):
        # Calculate expected chain hash
        expected_chain = sha256(entry.content_hash + expected_previous)

        # Compare with recorded
        is_valid = (entry.chain_hash == expected_chain)

        results.append({
            'entry_id': entry.id,
            'expected_chain': expected_chain,
            'recorded_chain': entry.chain_hash,
            'valid': is_valid
        })

        if not is_valid:
            return {
                'status': 'BROKEN',
                'broken_at': i + 1,
                'results': results
            }

        expected_previous = entry.chain_hash

    return {
        'status': 'VALID',
        'total_entries': len(entries),
        'results': results
    }
```

### Step 5: Generate Report

#### If Chain Valid:

```markdown
# Merkle Chain Validation Report

**Timestamp**: [ISO 8601]
**Auditor**: The QoreLogic Judge

---

## Chain Status: VALID ✓

The cryptographic integrity of the Meta Ledger has been verified.

### Summary

| Metric | Value |
|--------|-------|
| Total Entries | [count] |
| Genesis Hash | [first 8 chars]... |
| Latest Hash | [first 8 chars]... |
| Chain Length | [count] links |

### Entry-by-Entry Verification

| Entry | Phase | Timestamp | Hash Prefix | Status |
|-------|-------|-----------|-------------|--------|
| #1 | GENESIS | [date] | [8 chars] | ✓ |
| #2 | [phase] | [date] | [8 chars] | ✓ |
| ... | ... | ... | ... | ✓ |

### Chain Visualization

```
GENESIS ─┬─→ #1 (bootstrap)
         │    hash: [prefix]...
         │
         ├─→ #2 (audit)
         │    hash: [prefix]...
         │    prev: [#1 prefix]...
         │
         └─→ #[N] (latest)
              hash: [prefix]...
              prev: [#N-1 prefix]...
```

---

*Chain integrity confirmed. All decisions are traceable.*
```

#### If Chain Broken:

```markdown
# Merkle Chain Validation Report

**Timestamp**: [ISO 8601]
**Auditor**: The QoreLogic Judge

---

## Chain Status: BROKEN ✗

**CRITICAL**: The cryptographic integrity has been compromised.

### Break Location

| Attribute | Value |
|-----------|-------|
| Broken At | Entry #[X] |
| Last Valid | Entry #[X-1] |
| Break Type | [HASH_MISMATCH / MISSING_ENTRY / SEQUENCE_GAP] |

### Discrepancy Details

**Entry #[X]**:
- Recorded Chain Hash: `[recorded]`
- Expected Chain Hash: `[calculated]`
- Content Hash: `[content_hash]`
- Previous Hash: `[previous_hash]`

### Possible Causes

1. **Manual Edit**: The ledger file was modified outside the A.E.G.I.S. workflow
2. **Corruption**: File system corruption or incomplete write
3. **Tampering**: Deliberate modification of decision history
4. **Sync Conflict**: Multiple sessions modified the ledger concurrently

### Required Action

**DATASET LOCKED**

No implementation may proceed until integrity is restored.

Options:
1. **Restore from Backup**: If a clean backup exists, restore docs/META_LEDGER.md
2. **Rebuild Chain**: Re-run all phases from the broken point with new hashes
3. **Manual Audit**: Investigate the discrepancy and document the resolution

### Entry-by-Entry Verification

| Entry | Phase | Hash Prefix | Status |
|-------|-------|-------------|--------|
| #1 | GENESIS | [8 chars] | ✓ |
| #2 | [phase] | [8 chars] | ✓ |
| #[X] | [phase] | [8 chars] | ✗ BREAK |
| #[X+1] | [phase] | [8 chars] | ? (unverified) |

---

*Chain integrity compromised. Manual intervention required.*
```

### Step 6: Reference Document Verification (Optional)

If chain is valid, optionally verify referenced documents still exist:

```
Glob: docs/CONCEPT.md
Glob: docs/ARCHITECTURE_PLAN.md
Glob: .agent/staging/AUDIT_REPORT.md
```

```markdown
### Referenced Document Status

| Document | Exists | Last Modified |
|----------|--------|---------------|
| docs/CONCEPT.md | ✓/✗ | [date] |
| docs/ARCHITECTURE_PLAN.md | ✓/✗ | [date] |
| .agent/staging/AUDIT_REPORT.md | ✓/✗ | [date] |
```

### Step 7: Content Hash Verification (Deep Audit)

For thorough validation, recalculate content hashes:

```python
def deep_verify():
    for entry in entries:
        if entry.phase == 'BOOTSTRAP':
            # Verify genesis hash
            concept = read_file('docs/CONCEPT.md')
            arch = read_file('docs/ARCHITECTURE_PLAN.md')
            expected = sha256(concept + arch)

        elif entry.phase == 'GATE':
            # Verify audit hash
            report = read_file('.agent/staging/AUDIT_REPORT.md')
            expected = sha256(report)

        # Compare with recorded content_hash
        if expected != entry.content_hash:
            return f"Content drift at Entry #{entry.id}"

    return "Content integrity verified"
```

```markdown
### Deep Content Verification

| Entry | Document | Content Match |
|-------|----------|---------------|
| #1 | CONCEPT + ARCHITECTURE | ✓/✗ |
| #2 | AUDIT_REPORT | ✓/✗ |
| ... | ... | ... |
```

## Final Report Summary

```markdown
## Validation Complete

| Check | Result |
|-------|--------|
| Chain Integrity | [VALID / BROKEN at #X] |
| Total Entries | [count] |
| Documents Present | [count]/[expected] |
| Content Integrity | [VERIFIED / DRIFT at #X] |

### Disposition

[Chain is trustworthy / Chain requires repair before proceeding]

---
*Validation performed by The QoreLogic Judge*
```

## Constraints

- **NEVER** modify any files during validation
- **NEVER** skip any entry in the chain
- **ALWAYS** report exact break location if chain is broken
- **ALWAYS** lock dataset if chain is compromised
- **ALWAYS** provide remediation guidance for broken chains
