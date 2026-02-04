# Skills and Subagents Analysis

## Based on Anthropic's Skill Creator Guidelines

**Date**: 2026-02-03
**Purpose**: Analyze existing skills/subagents against Anthropic's skill creator best practices

---

## Executive Summary

This analysis evaluates all skills and subagents across the QoreLogic project against Anthropic's skill creator guidelines. Key findings:

- **8 Claude skills** - All under 500 lines, but need frontmatter improvements
- **2 Antigravity skills** - One exceeds 500 lines (log-decision.md at 535 lines)
- **3 Claude subagents** - Different structure, need alignment with skill format
- **Overall**: Skills are well-structured but can benefit from progressive disclosure and better frontmatter

---

## Anthropic Skill Creator Guidelines Reference

### Core Principles

1. **Concise is Key** - Context window is a public good
2. **Set Appropriate Degrees of Freedom** - Match specificity to task fragility
3. **Progressive Disclosure** - Three-level loading system (metadata → body → resources)
4. **No Extraneous Files** - Only SKILL.md and optional bundled resources

### Frontmatter Requirements

- `name` (required) - The skill name
- `description` (required) - Primary triggering mechanism, must include "when to use"

### Recommended Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name + description)
│   └── Markdown instructions (< 500 lines)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation loaded as needed
    └── assets/           - Files used in output
```

---

## Claude Skills Analysis

### 1. ql-audit.md (278 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-audit
description: A.E.G.I.S. Gate Tribunal - adversarial audit of blueprint to generate mandatory PASS/VETO verdict.
arguments:
  - name: target
    description: Specific component or file to audit (optional, defaults to full blueprint)
    required: false
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description to include specific triggers:
   ```yaml
   description: Adversarial audit of blueprint to generate mandatory PASS/VETO verdict. Use when Claude needs to review architecture plans before implementation for: (1) L2/L3 risk grade work, (2) Security-critical paths, (3) Architecture changes, or any work requiring formal approval before proceeding.
   ```
2. Remove non-standard `arguments` section from frontmatter
3. Consider moving detailed examples to `references/audit-examples.md`

**Length Status:** ✅ Under 500 lines

---

### 2. ql-bootstrap.md (219 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-bootstrap
description: Initialize QoreLogic A.E.G.I.S. DNA for a new project - creates CONCEPT, ARCHITECTURE_PLAN, and META_LEDGER with genesis hash.
arguments:
  - name: project_name
    description: Name of the project being initialized
    required: false
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: Initialize QoreLogic A.E.G.I.S. DNA for a new project by creating CONCEPT, ARCHITECTURE_PLAN, and META_LEDGER with genesis hash. Use when: (1) Starting a new project, (2) First-time QoreLogic setup, or (3) Re-initializing after project reset.
   ```
2. Remove non-standard `arguments` section

**Length Status:** ✅ Under 500 lines

---

### 3. ql-help.md (30 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-help
description: Quick reference - summarizes the purpose of other QoreLogic commands.
arguments: []
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: Quick reference that summarizes the purpose and usage of all QoreLogic commands. Use when: (1) Need to understand available commands, (2) Unsure which command to use, or (3) Looking for command overview.
   ```

**Length Status:** ✅ Very concise, well-structured

---

### 4. ql-implement.md (307 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-implement
description: Specialist Implementation Pass - translates gated blueprint into reality using §4 Simplicity Razor and TDD-Light.
arguments:
  - name: target
    description: Specific file or component to implement (optional)
    required: false
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: Specialist Implementation Pass that translates gated blueprint into reality using §4 Simplicity Razor and TDD-Light methodology. Use when: (1) Implementing after PASS verdict from /ql-audit, (2) Building features from approved architecture plans, or (3) Creating code under KISS constraints.
   ```
2. Consider moving detailed code examples to `references/code-patterns.md`

**Length Status:** ✅ Under 500 lines

---

### 5. ql-refactor.md (364 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-refactor
description: KISS Refactor and Simplification Pass - flatten logic, deconstruct bloat, verify structural integrity.
arguments:
  - name: target
    description: File or directory to refactor (required)
    required: true
  - name: scope
    description: "single-file" or "multi-file" (defaults to single-file)
    required: false
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: KISS Refactor and Simplification Pass that flattens logic, deconstructs bloat, and verifies structural integrity. Use when: (1) Code violates §4 Simplicity Razor, (2) Functions exceed 40 lines or files exceed 250 lines, (3) Nesting depth exceeds 3 levels, or (4) General code cleanup needed.
   ```
2. **Strong candidate for progressive disclosure** - Move extensive examples to `references/refactor-examples.md`
3. Current examples (lines 58-149) could be extracted to reference file

**Length Status:** ✅ Under 500 lines, but heavy on examples

---

### 6. ql-status.md (221 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-status
description: Lifecycle diagnostic - analyzes project artifacts to determine current A.E.G.I.S. stage and required actions.
arguments: []
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: Lifecycle diagnostic that analyzes project artifacts to determine current A.E.G.I.S. stage and required actions. Use when: (1) Unsure of project state, (2) Need to determine next required action, (3) Verifying Merkle chain integrity, or (4) Starting work on existing project.
   ```

**Length Status:** ✅ Under 500 lines, well-structured

---

### 7. ql-substantiate.md (337 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-substantiate
description: A.E.G.I.S. Substantiation and Session Seal - verifies implementation against blueprint and cryptographically seals the session.
arguments: []
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: A.E.G.I.S. Substantiation and Session Seal that verifies implementation against blueprint and cryptographically seals the session. Use when: (1) Implementation is complete, (2) Ready to verify Reality matches Promise, (3) Need to seal session with Merkle hash, or (4) Preparing to hand off completed work.
   ```
2. Consider moving hash calculation examples to `references/merkle-patterns.md`

**Length Status:** ✅ Under 500 lines

---

### 8. ql-validate.md (288 lines) ✓

**Frontmatter:**

```yaml
---
name: ql-validate
description: Merkle Chain Validator - recalculates and verifies cryptographic integrity of the project's Meta Ledger.
arguments: []
---
```

**Assessment:**

- ✅ Has name and description
- ⚠️ Description could be more comprehensive about when to use
- ⚠️ Arguments section not part of Anthropic's standard frontmatter

**Recommendations:**

1. Enhance description:
   ```yaml
   description: Merkle Chain Validator that recalculates and verifies cryptographic integrity of the project's Meta Ledger. Use when: (1) Verifying chain integrity before handoff, (2) Detecting tampering or corruption, (3) Auditing decision history, or (4) Validating after manual ledger edits.
   ```
2. Consider moving Python code examples to `scripts/validate-chain.py`

**Length Status:** ✅ Under 500 lines, well-structured

---

## Antigravity Skills Analysis

### 1. log-decision.md (535 lines) ⚠️ OVER LIMIT

**Current Structure:**

```markdown
# Log Decision Skill

## Implement Meta-Ledger for Auditable Decision Tracking

**Skill Name:** log-decision
**Version:** 1.0
**Purpose:** Implement QoreLogic SOA Ledger for development decisions
```

**Assessment:**

- ❌ No YAML frontmatter (Anthropic standard)
- ❌ OVER 500 lines (535 lines)
- ⚠️ Uses custom header format instead of standard frontmatter
- ✅ Comprehensive content with good examples

**Recommendations:**

1. **Add proper frontmatter:**

   ```yaml
   ---
   name: log-decision
   description: Implement QoreLogic SOA Ledger for auditable decision tracking with Merkle-chained audit trail. Use when: (1) Logging architecture decisions, (2) Recording security changes, (3) Documenting scope changes, (4) Tracking tech stack decisions, (5) Recording quality gates, (6) Any L1/L2/L3 decision requiring audit trail.
   ---
   ```

2. **Apply progressive disclosure** - Split into:
   - `SKILL.md` - Core workflow (< 500 lines)
   - `references/decision-taxonomy.md` - Decision type taxonomy (lines 52-68)
   - `references/decision-examples.md` - All examples (lines 282-373)
   - `references/ledger-structure.md` - File structure (lines 376-442)

3. **Extract Python code** to `scripts/calculate-hash.py` (lines 145-167)

**Length Status:** ❌ EXCEEDS 500 lines - requires progressive disclosure

---

### 2. track-shadow-genome.md (345 lines) ✓

**Current Structure:**

```markdown
# Track Shadow Genome Skill

## Record Failed Approaches to Prevent Repetition

**Skill Name:** track-shadow-genome
**Version:** 1.0
**Purpose:** Implement QoreLogic Shadow Genome for meta-governance - learn from failures
```

**Assessment:**

- ❌ No YAML frontmatter (Anthropic standard)
- ✅ Under 500 lines
- ⚠️ Uses custom header format instead of standard frontmatter
- ✅ Good structure with clear taxonomy

**Recommendations:**

1. **Add proper frontmatter:**

   ```yaml
   ---
   name: track-shadow-genome
   description: Record failed approaches to prevent repetition using QoreLogic Shadow Genome principle. Use when: (1) Rejecting proposed approach, (2) Abandoning implemented solution, (3) Finding security vulnerability, (4) Reducing scope, (5) Timeline slip due to wrong approach, (6) Any "we should have known better" moment.
   ---
   ```

2. **Apply progressive disclosure** - Split into:
   - `SKILL.md` - Core workflow
   - `references/failure-taxonomy.md` - Failure mode taxonomy (lines 49-65)
   - `references/shadow-examples.md` - All examples (lines 142-207)

**Length Status:** ✅ Under 500 lines

---

## Claude Subagents Analysis

### 1. ql-governor.md (124 lines)

**Current Structure:**

```markdown
# QoreLogic Governor Subagent

<agent>
  <name>ql-governor</name>
  <description>Senior Architect and A.E.G.I.S. Orchestrator for ALIGN and ENCODE phases.</description>
  <tools>Read, Write, Edit, Glob, Grep</tools>
</agent>
```

**Assessment:**

- ✅ Clear identity and purpose
- ⚠️ Uses XML-like agent tags (not Anthropic standard)
- ✅ Well-structured with clear directives
- ⚠️ Could benefit from skill-like frontmatter

**Recommendations:**

1. Consider converting to skill format with frontmatter:

   ```yaml
   ---
   name: ql-governor
   description: Senior Architect and A.E.G.I.S. Orchestrator responsible for ALIGN and ENCODE phases. Use when: (1) Creating project strategy, (2) Writing technical blueprints, (3) Assigning risk grades, (4) Managing Merkle-chain governance.
   ---
   ```

2. Keep XML tags if they serve specific framework purpose

---

### 2. ql-judge.md (181 lines)

**Current Structure:**

```markdown
# QoreLogic Judge Subagent

<agent>
  <name>ql-judge</name>
  <description>Hardline Security Auditor and Architecture Veto Engine for GATE and SUBSTANTIATE phases.</description>
  <tools>Read, Glob, Grep</tools>
</agent>
```

**Assessment:**

- ✅ Clear identity and purpose
- ⚠️ Uses XML-like agent tags (not Anthropic standard)
- ✅ Well-structured with clear veto authority
- ⚠️ Could benefit from skill-like frontmatter

**Recommendations:**

1. Consider converting to skill format with frontmatter:

   ```yaml
   ---
   name: ql-judge
   description: Hardline Security Auditor and Architecture Veto Engine for GATE and SUBSTANTIATE phases. Use when: (1) Auditing architecture plans before implementation, (2) Verifying implementation matches blueprint, (3) Blocking non-compliant code, (4) L3 security path review required.
   ---
   ```

2. Keep XML tags if they serve specific framework purpose

---

### 3. ql-specialist.md (220 lines)

**Current Structure:**

```markdown
# QoreLogic Specialist Subagent

<agent>
  <name>ql-specialist</name>
  <description>Senior Domain Expert and Implementation Engine for the IMPLEMENT phase.</description>
  <tools>Read, Write, Edit, Bash, Glob, Grep</tools>
</agent>
```

**Assessment:**

- ✅ Clear identity and purpose
- ⚠️ Uses XML-like agent tags (not Anthropic standard)
- ✅ Well-structured with clear constraints
- ⚠️ Could benefit from skill-like frontmatter

**Recommendations:**

1. Consider converting to skill format with frontmatter:

   ```yaml
   ---
   name: ql-specialist
   description: Senior Domain Expert and Implementation Engine for the IMPLEMENT phase. Use when: (1) Implementing after PASS verdict, (2) Building under §4 Simplicity Razor, (3) Applying TDD-Light methodology, (4) Creating production code from approved blueprints.
   ---
   ```

2. Keep XML tags if they serve specific framework purpose

---

## Additional Planning Protocol

The user provided a planning protocol following Rich Hickey's "Simple Made Easy" principles. This could be incorporated as a new skill:

### Proposed: ql-plan.md

```yaml
---
name: ql-plan
description: Planning protocol following Rich Hickey's "Simple Made Easy" principles for creating implementation plans. Use when: (1) Designing complex features, (2) Planning multi-phase implementations, (3) Architecting new components, or (4) Any work requiring systematic planning before implementation.
---

# Planning Protocol - Simple Made Easy

## Core Principles

### Choose SIMPLE over EASY
- Strive for un-braided, composable designs
- Minimize incidental complexity
- Favor objective simplicity over subjective ease

### Detect Complecting
- Keep concerns independent (state & time, data & behavior, configuration & code)
- Favor composition over interleaving

### Prefer Values, Resist State
- Immutable data is default
- Mutable state must be narrowly scoped, well-named, and justified

### Assess by Artifacts
- Judge by long-term properties: clarity, changeability, robustness
- "Easy to start" is not sufficient

### Declarative > Imperative
- Describe WHAT, not HOW
- Lean on data, configuration, queries, and rule systems

### Polymorphism à la Carte
- Separate data definitions, behavior specifications, and their connections
- Avoid inheritance hierarchies that entangle unrelated facets

### Guard-rails Are Not Simplicity
- Seek to remove complexity first
- Tests, static checks, and refactors cannot compensate for complex design

## Planning Steps

### Step 1: Understand Goals
Ask clarifying questions to understand what to accomplish

### Step 2: Research Existing Code
Use existing code as foundation for plan

### Step 3: Create Plan File
Create plan markdown file with:
- Specific code changes (concise, minimal prose)
- Incremental phases (2-3 logical phases)
- Well-typed, self-documenting interfaces
- Unit test descriptions grouped with phases
- Affected files and change summaries at top of each phase

### Step 4: Avoid Common Pitfalls
- NO exploration steps (grep, consult docs)
- NO backwards compatibility concerns
- NO feature gating or release plans
- NO concluding errata (future considerations, next steps)
- Call out open questions at TOP of plan

### Step 5: Review Plan
- Ensure precision and consistency
- Follow "Simple Made Easy" principles
- Flag open questions clearly
```

---

## Summary of Recommendations

### High Priority

1. **log-decision.md** - Exceeds 500 lines, requires progressive disclosure
2. **All Claude skills** - Enhance frontmatter descriptions with "when to use" triggers
3. **All Antigravity skills** - Add proper YAML frontmatter

### Medium Priority

1. **ql-refactor.md** - Extract examples to reference file
2. **ql-implement.md** - Extract code examples to reference file
3. **ql-substantiate.md** - Extract hash examples to reference file
4. **ql-validate.md** - Extract Python code to scripts/

### Low Priority

1. **Subagents** - Consider adding skill-like frontmatter
2. **Create new skill** - ql-plan.md for planning protocol

---

## Next Steps

1. Review and approve this analysis
2. Prioritize which skills to enhance first
3. Apply progressive disclosure to log-decision.md
4. Enhance frontmatter for all skills
5. Extract reference files as needed
6. Consider creating ql-plan.md skill
