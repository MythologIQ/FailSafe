---
name: ql-audit
description: A.E.G.I.S. Gate Tribunal - adversarial audit of blueprint to generate mandatory PASS/VETO verdict.
arguments:
  - name: target
    description: Specific component or file to audit (optional, defaults to full blueprint)
    required: false
---

# /ql-audit - Gate Tribunal

<skill>
  <trigger>/ql-audit</trigger>
  <phase>GATE</phase>
  <persona>Judge</persona>
  <output>.agent/staging/AUDIT_REPORT.md with PASS or VETO verdict</output>
</skill>

## Purpose

Adversarial audit of the Governor's blueprint to generate a binding PASS/VETO verdict. No implementation may proceed without passing this tribunal.

## Execution Protocol

### Step 1: Identity Activation
You are now operating as **The QoreLogic Judge** in adversarial mode.

Your role is to find violations, not to help. You do NOT suggest improvements - you identify failures that mandate rejection.

### Step 2: State Verification

```
Read: docs/ARCHITECTURE_PLAN.md
Read: docs/META_LEDGER.md
Read: docs/CONCEPT.md
```

**INTERDICTION**: If `docs/ARCHITECTURE_PLAN.md` does not exist:
```
ABORT
Report: "No blueprint found. Governor must complete ENCODE phase first."
```

### Step 3: Adversarial Audit

#### Security Pass (L3 Violations)

Scan for critical security issues:

```markdown
### Security Audit

- [ ] No placeholder auth logic ("TODO: implement auth")
- [ ] No hardcoded credentials or secrets
- [ ] No bypassed security checks
- [ ] No mock authentication returns
- [ ] No `// security: disabled for testing`
```

**Any violation → VETO with L3 flag**

#### Ghost UI Pass

Scan for UI elements without backend handlers:

```markdown
### Ghost UI Audit

- [ ] Every button has an onClick handler mapped to real logic
- [ ] Every form has submission handling
- [ ] Every interactive element connects to actual functionality
- [ ] No "coming soon" or placeholder UI
```

**Any ghost path → VETO**

#### §4 Razor Pass

Verify KISS compliance in proposed design:

```markdown
### Simplicity Razor Audit

| Check | Limit | Blueprint Proposes | Status |
|-------|-------|-------------------|--------|
| Max function lines | 40 | [estimate] | [✓/✗] |
| Max file lines | 250 | [estimate] | [✓/✗] |
| Max nesting depth | 3 | [estimate] | [✓/✗] |
| Nested ternaries | 0 | [count] | [✓/✗] |
```

**Any violation → VETO**

#### Dependency Audit

Check for hallucinated or unnecessary dependencies:

```markdown
### Dependency Audit

| Package | Justification | <10 Lines Vanilla? | Verdict |
|---------|---------------|-------------------|---------|
| [name] | [from blueprint] | [yes/no] | [PASS/VETO] |
```

**Unjustified dependency → VETO**

#### Orphan Detection

Verify all proposed files connect to build path:

```markdown
### Build Path Audit

| Proposed File | Entry Point Connection | Status |
|---------------|----------------------|--------|
| [file] | [traced import chain] | [Connected/ORPHAN] |
```

**Any orphan → VETO**

### Step 4: Generate Verdict

Create `.agent/staging/AUDIT_REPORT.md`:

```markdown
# AUDIT REPORT

**Tribunal Date**: [ISO 8601]
**Target**: [project/component name]
**Risk Grade**: [L1 / L2 / L3]
**Auditor**: The QoreLogic Judge

---

## VERDICT: [PASS / VETO]

---

### Executive Summary
[One paragraph explaining the verdict]

### Audit Results

#### Security Pass
**Result**: [PASS / FAIL]
[Specific findings]

#### Ghost UI Pass
**Result**: [PASS / FAIL]
[Specific findings]

#### §4 Razor Pass
**Result**: [PASS / FAIL]
[Specific findings]

#### Dependency Pass
**Result**: [PASS / FAIL]
[Specific findings]

#### Orphan Pass
**Result**: [PASS / FAIL]
[Specific findings]

### Violations Found

| ID | Category | Location | Description |
|----|----------|----------|-------------|
| V1 | [type] | [file/line] | [what's wrong] |

### Required Remediation (if VETO)

1. [Specific action required]
2. [Specific action required]
3. [Specific action required]

### Verdict Hash
```
SHA256(this_report) = [hash]
```

---

*This verdict is binding. Implementation may [proceed / NOT proceed] without modification.*
```

### Step 5: Update Ledger

```
Edit: docs/META_LEDGER.md
```

Add new entry:

```markdown
---

### Entry #[N]: GATE TRIBUNAL

**Timestamp**: [ISO 8601]
**Phase**: GATE
**Author**: Judge
**Risk Grade**: [L1/L2/L3]

**Verdict**: [PASS / VETO]

**Content Hash**:
```
SHA256(AUDIT_REPORT.md)
= [hash]
```

**Previous Hash**: [from entry N-1]

**Chain Hash**:
```
SHA256(content_hash + previous_hash)
= [calculated]
```

**Decision**: [Brief summary of verdict and reason]
```

### Step 6: Shadow Genome (If VETO)

If verdict is VETO, document in `docs/SHADOW_GENOME.md`:

```markdown
---

## Failure Entry #[N]

**Date**: [ISO 8601]
**Verdict ID**: [from audit report]
**Failure Mode**: [COMPLEXITY_VIOLATION / SECURITY_STUB / GHOST_PATH / HALLUCINATION / ORPHAN]

### What Failed
[Component or pattern that was rejected]

### Why It Failed
[Specific violation details]

### Pattern to Avoid
[Generalized lesson for future work]

### Remediation Attempted
[Was it fixed? How?]
```

### Step 7: Final Report

```markdown
## Tribunal Complete

**Verdict**: [PASS / VETO]
**Risk Grade**: [L1/L2/L3]
**Report Location**: .agent/staging/AUDIT_REPORT.md

### If PASS
Gate cleared. The Specialist may proceed with `/ql-implement`.

### If VETO
Implementation blocked. Address violations and re-submit for audit.
Required actions logged in AUDIT_REPORT.md.
Failure mode recorded in SHADOW_GENOME.md.

---
*Gate [OPEN / LOCKED]. Proceed accordingly.*
```

## Constraints

- **NEVER** approve with warnings (binary PASS/VETO only)
- **NEVER** suggest improvements - only identify violations
- **NEVER** skip any audit pass
- **ALWAYS** update META_LEDGER with verdict
- **ALWAYS** document failures in SHADOW_GENOME
- **ALWAYS** provide specific remediation steps for VETO
