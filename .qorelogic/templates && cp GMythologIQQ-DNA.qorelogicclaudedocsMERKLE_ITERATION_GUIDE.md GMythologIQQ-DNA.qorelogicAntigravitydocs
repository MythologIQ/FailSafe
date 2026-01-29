# Shadow Genome

## Purpose

The Shadow Genome documents **failure modes** - approaches that were rejected, patterns that failed, and lessons learned. This creates institutional memory to prevent repeated mistakes.

---

## Failure Categories

| Code | Category | Description |
|------|----------|-------------|
| `COMPLEXITY_VIOLATION` | §4 Razor breach | Function/file too long, nesting too deep |
| `SECURITY_STUB` | Incomplete security | TODO/placeholder in auth/security code |
| `GHOST_PATH` | Disconnected UI | UI element without backend handler |
| `HALLUCINATION` | Invalid dependency | Library that doesn't exist or wasn't verified |
| `ORPHAN` | Dead code | File not connected to build path |
| `SPEC_DRIFT` | Blueprint mismatch | Implementation doesn't match specification |
| `CHAIN_BREAK` | Merkle violation | Hash chain integrity compromised |

---

## Failure Log

<!--
Each failure is documented with:
- Date and iteration
- What was attempted
- Why it failed
- Pattern to avoid
- Resolution (if any)
-->

---

### Failure #1: [TITLE]

**Date**: [ISO 8601]
**Iteration**: [N]
**Verdict ID**: [from AUDIT_REPORT if applicable]
**Category**: [CATEGORY_CODE]

#### What Was Attempted
<!--
Describe the approach that was rejected or failed.
-->

[Description of the attempted approach]

#### Why It Failed
<!--
Specific violations or issues identified.
-->

- Violation 1: [details]
- Violation 2: [details]

#### Pattern to Avoid
<!--
Generalized lesson - what should be done differently?
-->

**Anti-Pattern**: [What not to do]

**Correct Pattern**: [What to do instead]

#### Resolution
<!--
Was this fixed? How? Or was the approach abandoned?
-->

| Status | Action Taken |
|--------|--------------|
| [FIXED \| ABANDONED \| PENDING] | [Description] |

#### Related Entries
- Ledger Entry: #[N]
- Audit Report: [link or reference]

---

### Failure #2: [TITLE]

[... same structure ...]

---

## Pattern Library (Extracted Lessons)

<!--
Aggregate lessons from failures into reusable patterns.
-->

### §4 Razor Violations

| Anti-Pattern | Correct Pattern | Examples |
|--------------|-----------------|----------|
| 50+ line functions | Split at 40 lines | See Failure #X |
| 4+ nesting levels | Early returns | See Failure #Y |
| Nested ternaries | Named functions | See Failure #Z |

### Security Patterns

| Anti-Pattern | Correct Pattern | Examples |
|--------------|-----------------|----------|
| `// TODO: auth` | Full implementation | See Failure #X |
| Hardcoded tokens | Environment vars | See Failure #Y |

### Architecture Patterns

| Anti-Pattern | Correct Pattern | Examples |
|--------------|-----------------|----------|
| God objects | Single responsibility | See Failure #X |
| Orphan files | Import tracing | See Failure #Y |

---

## Failure Statistics

| Category | Count | Last Occurrence |
|----------|-------|-----------------|
| COMPLEXITY_VIOLATION | [N] | [date] |
| SECURITY_STUB | [N] | [date] |
| GHOST_PATH | [N] | [date] |
| HALLUCINATION | [N] | [date] |
| ORPHAN | [N] | [date] |
| SPEC_DRIFT | [N] | [date] |
| CHAIN_BREAK | [N] | [date] |

**Total Failures Recorded**: [N]
**Failures Resolved**: [N]
**Patterns Extracted**: [N]

---

## Usage Notes

1. **Add entries when**:
   - /ql-audit returns VETO
   - Implementation fails §4 checks
   - Dead code is discovered
   - Any rejected approach

2. **Review entries when**:
   - Starting similar work
   - Seeing repeated violations
   - Onboarding new team members

3. **Extract patterns when**:
   - Same failure type occurs 3+ times
   - A clear anti-pattern emerges

---

*Shadow Genome maintained by The QoreLogic Judge*
*"Learn from failure to prevent its repetition."*
