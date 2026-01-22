# Merkle Chain Iteration Guide

## The Challenge: Iterative Development

Software development is inherently iterative. Features change, requirements evolve, and code gets refactored. The Merkle chain must support this reality while maintaining traceability.

## Chain Design for Iteration

### Linear Chain (Not Branching)

The QoreLogic Merkle chain is **strictly linear**. Each entry builds on the previous one, regardless of iteration:

```
GENESIS → ENCODE → AUDIT → IMPLEMENT → SEAL → ENCODE_v2 → AUDIT_v2 → IMPLEMENT_v2 → SEAL_v2
   #1       #2       #3       #4         #5       #6          #7          #8           #9
```

This is intentional:
- Simple to validate (single chain)
- Clear chronological history
- No merge conflicts
- Easy to audit

### Iteration Markers

Each entry includes an `Iteration` field:

```markdown
**Iteration**: 2
**Type**: ENCODE_UPDATE
```

This allows filtering entries by iteration while maintaining a single chain.

## Handling Common Iterative Scenarios

### Scenario 1: Feature Change Mid-Implementation

You're implementing Feature A, but requirements change.

**Correct Approach**:
1. Seal the current state (even if incomplete)
2. Update ARCHITECTURE_PLAN.md with changes
3. Create new ENCODE_UPDATE entry
4. Run /ql-audit on the updated plan
5. Continue implementation

**Chain Result**:
```
... → IMPLEMENT_partial (#4) → ENCODE_UPDATE (#5) → AUDIT (#6) → IMPLEMENT (#7) → ...
```

### Scenario 2: Refactoring Existing Code

You need to refactor code created in a previous iteration.

**Correct Approach**:
1. Run /ql-refactor
2. This creates a REFACTOR entry
3. The entry hashes the refactored files
4. Chain continues normally

**Chain Result**:
```
... → SEAL (#5) → REFACTOR (#6) → ...
```

### Scenario 3: Bug Fix After Seal

A bug is discovered after a session was sealed.

**Correct Approach**:
1. Start new iteration (ENCODE_UPDATE for the fix)
2. Run /ql-audit (can be L1 for minor fixes)
3. Implement fix
4. Seal new session

**Chain Result**:
```
... → SEAL (#5) → ENCODE_BUGFIX (#6) → AUDIT_L1 (#7) → IMPLEMENT (#8) → SEAL (#9)
```

### Scenario 4: Parallel Features (NOT Supported)

Two developers working on different features simultaneously.

**This model does NOT support branching.** Options:
1. Sequential development (one feature at a time)
2. Separate projects with separate chains
3. Micro-commit pattern (very small iterations)

## Entry Types for Iteration

| Type | When Used | Hash Includes |
|------|-----------|---------------|
| GENESIS | Project initialization | CONCEPT + ARCHITECTURE_PLAN |
| ENCODE | Initial blueprint | ARCHITECTURE_PLAN |
| ENCODE_UPDATE | Blueprint changes | Updated ARCHITECTURE_PLAN + diff |
| AUDIT | Gate tribunal | AUDIT_REPORT |
| IMPLEMENT | Code creation | Modified source files |
| REFACTOR | Code restructuring | Modified source files |
| SEAL | Session complete | All artifacts |

## Validation Logic for Iterations

The /ql-validate command handles iterations by:

1. **Ignoring iteration boundaries**: Chain validation is purely sequential
2. **Verifying hash continuity**: Each entry's `previous_hash` must match the prior entry's `chain_hash`
3. **Content verification**: Optionally verify content hashes still match current files (may fail for old iterations)

### Validation Pseudocode

```python
def validate_chain(ledger):
    entries = parse_entries(ledger)
    expected_previous = GENESIS_ZERO_HASH

    for entry in entries:
        # Calculate expected chain hash
        expected_chain = sha256(entry.content_hash + expected_previous)

        # Verify recorded matches expected
        if entry.chain_hash != expected_chain:
            return ChainBroken(entry.id)

        # Move to next
        expected_previous = entry.chain_hash

    return ChainValid(total=len(entries))
```

### Deep Validation (Optional)

For thorough audits, verify content hashes match current files:

```python
def deep_validate(ledger):
    # ... basic chain validation ...

    # For RECENT entries only (last iteration)
    for entry in recent_entries:
        current_content = read_files(entry.artifacts)
        current_hash = sha256(current_content)

        if current_hash != entry.content_hash:
            return ContentDrift(entry.id)

    return DeepValid()
```

**Note**: Old iterations may have content drift (files changed). This is expected and not a chain break.

## Best Practices for Iteration

### DO:
- ✓ Seal sessions before major changes
- ✓ Use ENCODE_UPDATE when requirements change
- ✓ Keep iterations small and focused
- ✓ Run /ql-validate regularly

### DON'T:
- ✗ Don't skip audit for L2/L3 changes
- ✗ Don't modify old ledger entries
- ✗ Don't expect old content hashes to still match
- ✗ Don't branch the chain

## Recovery from Issues

### Issue: Forgot to seal before starting new work

**Solution**: Create a "retrospective seal" entry:
```markdown
### Entry #N: RETROSPECTIVE_SEAL

**Type**: SEAL_RETROSPECTIVE
**Note**: Sealing previous work before new iteration
```

### Issue: Content hash mismatch in old entry

**This is normal for old iterations.** The chain is still valid if:
- `chain_hash` values form a proper sequence
- Content drift is expected (files were modified in later iterations)

### Issue: Chain actually broken

If `chain_hash` sequence is broken:
1. Identify the break point
2. Document in ledger notes
3. Option A: Restore from backup
4. Option B: Create a "chain repair" entry documenting the gap
5. Continue with new chain from repair point

## Example: Three-Iteration Chain

```markdown
### Entry #1: GENESIS
Iteration: 0
Previous: 0x000...
Chain: 0xabc...

### Entry #2: AUDIT
Iteration: 1
Previous: 0xabc...
Chain: 0xdef...

### Entry #3: IMPLEMENT
Iteration: 1
Previous: 0xdef...
Chain: 0x123...

### Entry #4: SEAL
Iteration: 1
Previous: 0x123...
Chain: 0x456...

### Entry #5: ENCODE_UPDATE (new feature)
Iteration: 2
Previous: 0x456...
Chain: 0x789...

### Entry #6: AUDIT
Iteration: 2
Previous: 0x789...
Chain: 0xaaa...

### Entry #7: IMPLEMENT
Iteration: 2
Previous: 0xaaa...
Chain: 0xbbb...

### Entry #8: SEAL
Iteration: 2
Previous: 0xbbb...
Chain: 0xccc...

### Entry #9: REFACTOR (cleanup)
Iteration: 3
Previous: 0xccc...
Chain: 0xddd...

### Entry #10: SEAL
Iteration: 3
Previous: 0xddd...
Chain: 0xeee...
```

**Validation**: Only checks that each `previous_hash` matches the prior `chain_hash`.

---

*This design ensures iterative development while maintaining full traceability.*
