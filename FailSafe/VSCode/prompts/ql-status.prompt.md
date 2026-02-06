---
name: ql-status
description: /ql-status - Lifecycle Diagnostic
---

# /ql-status - Quick Lifecycle Check

<skill>
  <trigger>/ql-status</trigger>
  <phase>ANY</phase>
  <persona>Governor</persona>
  <output>Compact status with stage and next action</output>
</skill>

## Purpose

Quick, low-token diagnostic of project health. Read-minimal by design.

## Execution (Decision Tree)

### Step 1: Existence Checks Only

```
Glob: docs/META_LEDGER.md     -> has_ledger
Glob: docs/ARCHITECTURE_PLAN.md -> has_plan
Glob: .agent/staging/AUDIT_REPORT.md -> has_audit
```

**Do NOT read file contents yet.**

### Step 2: Determine State

```
IF !has_ledger:
  STATE = "UNINITIALIZED"
  NEXT = "/ql-bootstrap (first-time workspace setup only)"
  DONE (output immediately)

IF !has_plan:
  STATE = "ALIGN/ENCODE"
  NEXT = "Create ARCHITECTURE_PLAN.md OR use /ql-plan for new feature"
  DONE

IF !has_audit:
  # Only now read first 15 lines for Risk Grade
  Read: docs/ARCHITECTURE_PLAN.md (limit: 15)
  Extract: "Risk Grade: L[1-3]"

  IF L2 or L3:
    STATE = "GATED"
    NEXT = "/ql-audit"
  ELSE:
    STATE = "READY"
    NEXT = "/ql-implement"
  DONE

IF has_audit:
  # Read first 10 lines for verdict
  Read: .agent/staging/AUDIT_REPORT.md (limit: 10)

  IF contains "PASS":
    STATE = "IMPLEMENTING"
    NEXT = "Continue work, /ql-plan for new feature, or /ql-substantiate when done"
  ELSE IF contains "VETO":
    STATE = "BLOCKED"
    NEXT = "Address audit findings, re-run /ql-audit"
  DONE
```

### Important: New Feature vs New Workspace

| Scenario | Command | Description |
|----------|---------|-------------|
| **New workspace** (no META_LEDGER) | `/ql-bootstrap` | Initialize DNA, CONCEPT, ARCHITECTURE_PLAN, META_LEDGER |
| **New feature** (workspace exists) | `/ql-plan` | Create plan-*.md with phases, affected files, tests |
| **Resume work** (audit exists) | Continue or `/ql-status` | Check current state and next action |

**Note**: `/ql-bootstrap` is for **workspace initialization only**. For planning new features in an existing workspace, use `/ql-plan`.

### Step 3: Chain Spot-Check (Optional)

Only if user requests integrity check:
```
Read: docs/META_LEDGER.md (last 30 lines only via offset)
Check: Last entry has SHA256 hash format
Report: "Chain: OK" or "Chain: Verify with /ql-validate"
```

Full verification deferred to `/ql-validate`.

### Step 4: Output

```markdown
## Status: [STATE]

| Check | Result |
|-------|--------|
| Ledger | [exists/missing] |
| Plan | [exists/missing] |
| Audit | [PASS/VETO/pending] |
| Chain | [OK/unverified] |

**Next**: [NEXT]
```

## Token Budget

- Skill load: ~1.5KB
- Max additional reads: <3KB
- Target total: <5KB context impact

## Constraints

- **NEVER** load persona files (identity is implicit)
- **NEVER** read entire files when partial suffices
- **NEVER** enumerate src/**/*
- **ALWAYS** use existence checks before content reads
- **ALWAYS** stop at first determination (short-circuit)

---
_Full verification: /ql-validate | Full details: ask for expanded status_
