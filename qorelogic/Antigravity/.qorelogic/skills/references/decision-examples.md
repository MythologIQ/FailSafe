# Decision Examples

## Example Ledger Entry (JSON)

```json
{
  "entry_id": 5,
  "timestamp": "2025-12-24T16:00:00Z",
  "decision_type": "ARCHITECTURE",
  "decision": "Use SQLite for Phases 1-2, defer PostgreSQL until 100+ agent scale",
  "rationale": "KISS principle - no proven bottleneck yet. Database audit shows <100 TPS sufficient for pilot. SQLite simpler, zero ops overhead, suitable for single-node deployment.",
  "evidence": [
    "Database audit: current load <10 TPS",
    "SQLite supports <100 TPS per documentation",
    "PostgreSQL adds deployment complexity without current benefit"
  ],
  "alternatives_considered": [
    "PostgreSQL: Rejected - no proven scalability need",
    "MongoDB: Rejected - relational data better fit",
    "MySQL: Rejected - no advantages over SQLite for this scale"
  ],
  "trade_offs": {
    "accepting": "Single-writer limit (~100 TPS), migration cost if scale exceeds",
    "gaining": "Simplicity, zero-ops deployment, file-based backups"
  },
  "approver": "Lead Reviewer",
  "risk_grade": "L2",
  "reversibility": "Medium - migration to PostgreSQL possible but requires schema export/import",
  "dependencies": [
    "Database hardening plan (Week 2)",
    "Backup strategy (requires file-based approach)"
  ],
  "timeline_impact": "Saves 1 week setup time vs PostgreSQL deployment",
  "related_decisions": [3, 4],
  "previous_hash": "b4a1f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "entry_hash": "c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}
```

## L3 Approval Template

```markdown
## WARNING: L3 APPROVAL REQUIRED

This decision requires explicit user approval before implementation.

**Decision:** {decision}
**Risk Grade:** L3 CRITICAL
**Impact:** {impact description}

**Approval Status:** PENDING
**Approval Deadline:** {24 hours from now}

**To approve, user must:**

1. Review decision, rationale, and evidence
2. Confirm understanding of trade-offs
3. Provide written approval: "APPROVED: Entry #{entry_id}"
4. Sign approval (optional but recommended)

**Until approved:**

- Implementation blocked
- Related work can proceed if not dependent
- Decision remains in CONDITIONAL status
```

---

## Example 1: Architecture Decision (L2)

**Command:**

```
/log-decision ARCHITECTURE "Use SQLite for Phases 1-2" "KISS - no proven bottleneck" L2
```

**Output:**

```markdown
OK: Meta-Ledger Updated: Entry #5

**Decision Type:** ARCHITECTURE (L2)
**Decision:** Use SQLite for Phases 1-2
**Approver:** Lead Reviewer
**Status:** APPROVED (L2 - Lead Reviewer authority)

**Hash Chain:** OK (Integrity verified)
**File Updated:** docs/META_LEDGER.md

**Next Steps:**

- Implementation can proceed
- No user approval required (L2)
```

## Example 2: Security Decision (L3)

**Command:**

```
/log-decision SECURITY "Migrate passphrase to platform keystore" "Fix CRITICAL vulnerability" L3
```

**Output:**

```markdown
WARNING: Meta-Ledger Updated: Entry #6 (PENDING APPROVAL)

**Decision Type:** SECURITY (L3 CRITICAL)
**Decision:** Migrate passphrase storage to platform keystore
**Impact:** Fixes CRITICAL security vulnerability (plaintext master passphrase)

**Status:** CONDITIONAL - Awaiting user approval
**Approval Required By:** 2025-12-25 16:00:00 UTC (24 hours)

**Rationale:**
Current plaintext storage at ~/.qorelogic/security/identity.secret creates single point of compromise. Platform keystore (Windows Credential Manager, macOS Keychain, Linux Secret Service) provides OS-level encryption and access control.

**Trade-offs:**

- **Accepting:** Platform dependency, different implementation per OS
- **Gaining:** Hardware-backed encryption, audit trail, no plaintext secrets

**Reversibility:** Low - migration one-way, manual keystore deletion needed to rollback

**User Action Required:**
Please review and respond with:

- "APPROVED: Entry #6" to proceed with implementation
- "CONDITIONAL: Entry #6 - {concerns}" to request changes
- "REJECTED: Entry #6 - {rationale}" to block implementation

**File Updated:** docs/META_LEDGER.md (entry marked CONDITIONAL)
```

## Example 3: Scope Change (L2)

**Command:**

```
/log-decision SCOPE_CHANGE "Defer PyVeritas to Phase 3" "Focus on validated features first" L2
```

**Output:**

```markdown
OK: Meta-Ledger Updated: Entry #7

**Decision Type:** SCOPE_CHANGE (L2)
**Decision:** Defer PyVeritas implementation to Phase 3 (Week 9+)
**Approver:** Lead Reviewer
**Status:** APPROVED

**Rationale:**
PyVeritas is aspirational (80% accuracy per research, not validated). Focus Phases 1-2 on working features (CBMC wrapper, Z3 integration) with proven ROI. Re-evaluate PyVeritas after baseline comparison in Week 5.

**Impact:**

- Phase 1-2: Tier 3 verification uses CBMC + Z3 (proven tools)
- Phase 3: Evaluate PyVeritas based on validation data
- Documentation: Update to reflect current vs. planned status

**Timeline Impact:** None - removes unproven work from critical path

**Hash Chain:** OK (Integrity verified)
**File Updated:** docs/META_LEDGER.md
```
