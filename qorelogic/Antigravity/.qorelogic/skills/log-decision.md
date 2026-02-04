---
name: log-decision
description: Implement QoreLogic SOA Ledger for auditable decision tracking with Merkle-chained audit trail. Use when: (1) Logging architecture decisions, (2) Recording security changes, (3) Documenting scope changes, (4) Tracking tech stack decisions, (5) Recording quality gates, (6) Any L1/L2/L3 decision requiring audit trail.
---

# Log Decision Skill

## Implement Meta-Ledger for Auditable Decision Tracking

**Skill Name:** log-decision
**Version:** 1.1
**Purpose:** Implement QoreLogic SOA Ledger for development decisions

---

## Usage

```
/log-decision <decision_type> <decision> <rationale> [risk_grade]
```

Or invoke in conversation:

> "Let's log this architecture decision to the meta-ledger..."

---

## What This Skill Does

Implements QoreLogic's **SOA Ledger** principle for meta-governance: maintaining a Merkle-chained,
cryptographically signed audit trail of all major development decisions. Enables traceability,
accountability, and rollback capability.

---

## Skill Instructions

When this skill is invoked:

### 1. Gather Decision Details

Collect comprehensive information.

**Required Fields:**

- **decision_type:** Category from taxonomy (see references)
- **decision:** What was decided (concise)
- **rationale:** Why this decision was made
- **evidence:** Supporting data/citations
- **approver:** Who approved (Lead Reviewer, User, etc.)
- **risk_grade:** L1/L2/L3 classification

**Optional Fields:**

- **alternatives_considered**
- **trade_offs**
- **reversibility**
- **dependencies**
- **timeline_impact**

### 2. Classify Decision Type

Use standardized taxonomy. See: `qorelogic/Antigravity/.qorelogic/skills/references/decision-taxonomy.md`.

### 3. Validate Risk Grade

Ensure correct L1/L2/L3 classification. See: `qorelogic/Antigravity/.qorelogic/skills/references/decision-taxonomy.md`.

### 4. Load Current Ledger State

Read `docs/META_LEDGER.md` to get:

- Last entry ID
- Previous entry hash
- Current chain status

### 5. Create New Entry

Generate the ledger entry payload and hash fields. For example payloads, see:
`qorelogic/Antigravity/.qorelogic/skills/references/decision-examples.md`.

### 6. Calculate Hash

Use deterministic hashing for chain linkage. Reference implementation:
`qorelogic/Antigravity/.qorelogic/skills/scripts/calculate-hash.py`.

### 7. Append to Ledger

Append the new entry to `docs/META_LEDGER.md`. Structure reference:
`qorelogic/Antigravity/.qorelogic/skills/references/ledger-structure.md`.

### 8. Validate Chain Integrity

After appending, validate the chain. Reference implementation:
`qorelogic/Antigravity/.qorelogic/skills/scripts/calculate-hash.py`.

### 9. Check L3 Approval Requirements

If risk_grade is L3, require explicit user approval before implementation. See:
`qorelogic/Antigravity/.qorelogic/skills/references/decision-examples.md`.

---

## Success Criteria

This skill succeeds when:

1. **Complete Audit Trail:** All major decisions logged, zero gaps
2. **Chain Integrity:** 100% hash chain validation passes
3. **L3 Compliance:** All L3 decisions have user approval before implementation
4. **Traceability:** Can trace any implementation back to decision rationale
5. **Accountability:** Clear approver for every decision
6. **Reversibility Analysis:** Know cost/risk of undoing any decision

---

## Integration with QoreLogic

This skill implements:

- **SOA Ledger:** Merkle-chained audit trail
- **Risk Grading:** L1/L2/L3 classification with approval workflows
- **Progressive Formalization:** Decision -> Evidence -> Hash -> Signature
- **Divergence Doctrine:** Transparent decision-making, no hidden choices

---

## When to Use

Invoke this skill for:

- Architecture decisions (component structure, database choice, etc.)
- Security changes (cryptography, auth, key management)
- Scope changes (add/remove features, timeline adjustments)
- Tech stack changes (new dependencies, frameworks, languages)
- Quality gates (coverage thresholds, performance SLAs)
- Deployment architecture
- Budget allocations
- Any decision that affects multiple developers or phases

**Don't use for:**

- Trivial choices (variable names, code formatting)
- Implementation details (which loop type to use)
- Personal preferences without technical impact

---

## Output

This skill will:

1. Create/update `docs/META_LEDGER.md`
2. Add new entry with hash chain link
3. Validate entire chain integrity
4. Flag L3 items for user approval
5. Generate approval request if needed
6. Update ledger statistics

---

## Notes

- Meta-Ledger is append-only - never delete or edit entries
- L3 decisions block implementation until approved
- Hash chain enables tamper detection - any modification breaks chain
- Decisions are reversible but reversals must also be logged
- Future decisions can reference past entries by ID
- Quarterly audits should validate chain integrity

---

**Remember:** The meta-ledger isn't bureaucracy - it's institutional memory. When someone asks
"why did we choose X?", the answer is in the ledger with full context and rationale.
