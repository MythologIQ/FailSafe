---
name: ql-bootstrap
description: Initialize QoreLogic A.E.G.I.S. DNA for a new project by creating CONCEPT, ARCHITECTURE_PLAN, and META_LEDGER with genesis hash. Use when: (1) Starting a new project, (2) First-time QoreLogic setup, or (3) Re-initializing after project reset.
---

# /ql-bootstrap - Project DNA Seeder

<skill>
  <trigger>/ql-bootstrap</trigger>
  <phase>ALIGN + ENCODE</phase>
  <persona>Governor</persona>
  <output>docs/CONCEPT.md, docs/ARCHITECTURE_PLAN.md, docs/META_LEDGER.md</output>
</skill>

## Purpose

Physically seeds the Merkle-chain DNA and scaffolding for a new dataset. This is the **genesis** of the A.E.G.I.S. lifecycle.

## Execution Protocol

### Step 1: Identity Activation

You are now operating as **The QoreLogic Governor**.

### Step 2: Environment Audit

Check for existing QoreLogic DNA:

```
Glob: docs/META_LEDGER.md
Glob: .agent/staging/
```

**INTERDICTION**: If `docs/META_LEDGER.md` exists:

```
ABORT
Report: "Integrity Violation: Genesis already exists. Use /ql-status to resume."
```

### Step 3: Create Directory Structure

Ensure required **workspace** directories exist:

```
.agent/             # Workspace operational directory (NOT repo source)
.agent/staging/     # Session state (NOT repo source)
docs/               # Governance documents (workspace-level)
```

**🔒 ISOLATION NOTE**: These directories are **workspace operations**, independent of any repository source code. If this workspace is the FailSafe development repository, do NOT confuse these with:

- `src/` (extension source code)
- `qorelogic/` (extension legacy source)
- `build/` (extension build scripts)

**See**: `docs/specs/WORKSPACE_ISOLATION_RULES.md` for full isolation governance.

### Step 3.5: Document Privacy Configuration

**CRITICAL FOR PUBLIC/OPEN-SOURCE REPOS**

Before proceeding, determine repository visibility and configure privacy:

```
AskUserQuestion: "Is this repository public/open-source or private?"
```

#### Privacy Pattern Enforcement

The following directories and files contain proprietary AI governance logic, session state, and workspace-specific configuration that MUST NOT be committed to public repositories:

| Category        | Patterns                                            | Reason                       |
| --------------- | --------------------------------------------------- | ---------------------------- |
| AI Governance   | `.agent/`, `.claude/`, `.failsafe/`, `.qorelogic/`  | Proprietary governance state |
| AI Instructions | `CLAUDE.md`, `GEMINI.md`, `COPILOT.md`, `CURSOR.md` | Workspace-specific AI config |
| IDE Settings    | `.vscode/`, `.idea/`, `.cursor/`, `.windsurf/`      | Local contributor settings   |
| Planning Docs   | `plan-*.md`, `docs/`, `Planning/`                   | Private roadmap/strategy     |
| Session State   | `.agent/staging/`                                   | Audit reports, session data  |

**Verify .gitignore**:

```
Read: .gitignore
```

If missing required patterns, add them:

```gitignore
# AI GOVERNANCE (REQUIRED FOR PUBLIC REPOS)
.agent/
.claude/
.failsafe/
.qorelogic/
CLAUDE.md
GEMINI.md

# Planning documents
plan-*.md
docs/

# IDE local settings
.vscode/
```

**Report to user**:

```markdown
## Privacy Configuration

**Repository Type**: [Public/Private]
**Gitignore Status**: [Updated/Already Configured]

### Protected from Public Commit:

- AI governance directories (`.agent/`, `.claude/`, etc.)
- AI instruction files (`CLAUDE.md`, `GEMINI.md`, etc.)
- Planning documents (`plan-*.md`, `docs/`)
- IDE local settings (`.vscode/`)

### Included in Repository:

- Source code (`src/`, `extension/`)
- Public documentation (`README.md`, `CHANGELOG.md`)
- Configuration templates (`.example` files)

⚠️ **Privacy Reminder**: All `/ql-*` commands that create or modify files
will verify paths against gitignore before writing in public repos.

To modify privacy settings later, use `/ql-organize`.
```

### Step 3.6: Artifact Ownership and Stability Guardrails

Classify artifacts before writing files:

| Class | Scope | Ownership | Commit Policy |
| ----- | ----- | --------- | ------------- |
| Core Artifacts | Shared bootstrap assets required in every workspace | FailSafe System | Distributed by scaffold command |
| Generated Custom Artifacts | Workspace-specific outputs generated from prompts/workflows | Workspace owner | Stored in workspace only |
| Proprietary System Artifacts | Internal FailSafe implementation assets and private system internals | FailSafe maintainers | MUST NOT be scaffolded into user workspaces |

Deterministic guardrails:

1. **Structure Stability**: Never remove or rename core sections without a compatibility migration note.
2. **No Silent Deletion**: Any major content reduction requires explicit rationale and replacement mapping.
3. **Artifact Boundary Enforcement**: Keep generated custom artifacts out of packaged core templates.
4. **Proprietary Isolation**: Proprietary artifacts must remain in dedicated proprietary paths and be excluded from VSIX payloads.

### Step 4: ALIGN (The "Why")

Create `docs/CONCEPT.md`:

```markdown
# Project Concept

## Why (One Sentence)

[Single sentence explaining the purpose of this project/feature]

## Vibe (Three Keywords)

1. [Keyword 1 - e.g., "Minimal"]
2. [Keyword 2 - e.g., "Secure"]
3. [Keyword 3 - e.g., "Traceable"]

## Anti-Goals (What This Is NOT)

- [Explicit exclusion 1]
- [Explicit exclusion 2]

---

_Generated by QoreLogic A.E.G.I.S. Bootstrap_
```

**Guidance**: Ask the user to provide:

- One sentence "Why" (if they can't explain it simply, reject the task)
- Three "Vibe" keywords that capture the design philosophy

### Step 5: ENCODE (The "Promise")

Create `docs/ARCHITECTURE_PLAN.md`:

```markdown
# Architecture Plan

## Risk Grade: [L1 | L2 | L3]

### Risk Assessment

- [ ] Contains security/auth logic -> L3
- [ ] Modifies existing APIs -> L2
- [ ] UI-only changes -> L1

## File Tree (The Contract)
```

src/
|-- [planned file 1]
|-- [planned file 2]
`-- [planned directory]/
    `-- [planned file 3]

```

## Interface Contracts

### [Component Name]
- **Input**: [types/parameters]
- **Output**: [return type]
- **Side Effects**: [state changes, API calls]

## Data Flow

```

[Entry Point] -> [Processing] -> [Output]

```

## Dependencies

| Package | Justification | Vanilla Alternative |
|---------|---------------|---------------------|
| [name] | [why needed] | [yes/no - if yes, why not used] |

## Section 4 Razor Pre-Check

- [ ] All planned functions <= 40 lines
- [ ] All planned files <= 250 lines
- [ ] No planned nesting > 3 levels

---
*Blueprint sealed. Awaiting GATE tribunal.*
```

### Step 6: Initialize META_LEDGER

Create `docs/META_LEDGER.md`:

```markdown
# QoreLogic Meta Ledger

## Chain Status: ACTIVE

## Genesis: [ISO timestamp]

---

### Entry #1: GENESIS

**Timestamp**: [ISO 8601]
**Phase**: BOOTSTRAP
**Author**: Governor
**Risk Grade**: [from ARCHITECTURE_PLAN]

**Content Hash**:
```

SHA256(CONCEPT.md + ARCHITECTURE_PLAN.md)
= [calculated hash]

```

**Previous Hash**: GENESIS (no predecessor)

**Decision**: Project DNA initialized. Lifecycle: ALIGN/ENCODE complete.

---

*Chain integrity: VALID*
*Next required action: /ql-audit (if L2/L3) OR /ql-implement (if L1)*
```

### Step 7: Calculate Genesis Hash

```python
import hashlib

# Read the content of both files
concept_content = read_file("docs/CONCEPT.md")
architecture_content = read_file("docs/ARCHITECTURE_PLAN.md")

# Calculate genesis hash
combined = concept_content + architecture_content
genesis_hash = hashlib.sha256(combined.encode()).hexdigest()
```

### Step 8: Routing Decision

Based on Risk Grade:

| Grade | Action                                                                               |
| ----- | ------------------------------------------------------------------------------------ |
| L1    | "DNA Seeded. Low risk. Proceed to /ql-implement."                                    |
| L2    | "DNA Seeded. Logic changes detected. Invoke /ql-audit before implementation."        |
| L3    | "DNA Seeded. CRITICAL: Security path detected. /ql-audit MANDATORY. Dataset LOCKED." |

### Step 9: Final Report

```markdown
## Bootstrap Complete

**Project**: [name]
**Genesis Hash**: [first 8 chars]...
**Risk Grade**: [L1/L2/L3]
**Lifecycle Stage**: ENCODED

### Created Artifacts

- docs/CONCEPT.md OK
- docs/ARCHITECTURE_PLAN.md OK
- docs/META_LEDGER.md OK

### Next Action

[Based on risk grade routing]

---

_DNA Seeded. Dataset Locked. Auto-Router Active._
```

## Constraints

- **NEVER** bootstrap over existing DNA (check first)
- **NEVER** skip the "Why" documentation
- **NEVER** assign L1 to anything touching security/auth
- **ALWAYS** calculate and record genesis hash
- **ALWAYS** require /ql-audit for L2/L3 before implementation
- **ALWAYS** classify artifacts as Core, Generated Custom, or Proprietary before writing
- **ALWAYS** preserve structural compatibility when modifying bootstrap templates
- **NEVER** package proprietary system artifacts inside distributable VSIX payloads

## Success Criteria

Bootstrap succeeds when:

- [ ] CONCEPT.md exists with clear "Why" statement
- [ ] ARCHITECTURE_PLAN.md exists with file tree and risk assessment
- [ ] META_LEDGER.md exists with genesis entry and hash
- [ ] Genesis hash calculated and recorded
- [ ] Risk grade properly assigned (L1/L2/L3)
- [ ] Required directories created (.agent/staging/, docs/)
- [ ] Routing decision provided based on risk grade

## Integration with QoreLogic

This skill implements:

- **Genesis Protocol**: Seeds the Merkle-chain DNA for new projects
- **Risk-Based Routing**: Routes to appropriate gate based on risk grade
- **Hash Chain Initialization**: Establishes cryptographic audit trail from genesis
- **Documentation-First**: Requires concept and architecture before implementation

---

**Remember**: Genesis is the foundation of the entire A.E.G.I.S. lifecycle. A weak genesis compromises the entire chain. Ensure the "Why" is clear and the architecture is sound before proceeding.

