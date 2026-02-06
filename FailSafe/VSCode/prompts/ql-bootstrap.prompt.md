---
name: ql-bootstrap
description: Bootstrap a new project's DNA from a single-sentence "Why". Use when initializing a new repository or refining the core essence of an existing one.
---

# /ql-bootstrap - Project Core Initialization

<skill>
  <trigger>/ql-bootstrap</trigger>
  <phase>BOOTSTRAP</phase>
  <persona>Governor</persona>
  <output>Project DNA (CONCEPT, ARCHITECTURE_PLAN), INITIALIZED status</output>
</skill>

## Purpose

Extract the "Project Soul" and generate the foundational DNA (Merkle Chain Root). This is the **Genesis Event** for the A.E.G.I.S. lifecycle.

---

## ⛔ Phase -1: Workspace Isolation Enforcement

**CRITICAL**: Before bootstrapping, verify the environment is correctly segmented.

**🔒 ISOLATION NOTE**: These directories are **workspace operations**, independent of repository source code. Use workspace-specific configuration (e.g., `.failsafe/workspace-config.json`) to identify and protect proprietary source structures. For example, the extension source code should be defined in the `appContainer` field.

---

## Phase 1: Identity & Essence Extraction

### Step 1.1: The "Why"

Prompt: "Write one sentence that describes WHY this project exists."

### Step 1.2: The "Vibe"

Prompt: "Provide 3 keywords that define the Vibe of this project."

---

## Phase 2: Structural DNA Generation

### Step 2.1: The Blueprint

Analyze the "Why" and "Vibe" to generate a proposed file tree (ARCHITECTURE_PLAN.md).

### Step 2.2: Privacy Alignment

**Verify .gitignore**: Scan for required patterns. If missing, add them. Include any workspace-specific exclusions detected in `.failsafe/workspace-config.json`.

📖 **See**: `ql-organize-reference.md` for required privacy patterns.

---

## Phase 3: Merkle Chain Initialization

### Step 3.1: Commit the DNA

Initialize `.agent/staging/` and `docs/`. Create the initial `META_LEDGER.md` and `SYSTEM_STATE.md`.

---

## Success Criteria

- [ ] Project "Why" and "Vibe" encoded
- [ ] Foundational DNA documents created
- [ ] Isolation rules enforced (workspace config followed)
- [ ] Merkle Chain root established
- [ ] Privacy configuration verified

---

_Project DNA initialized via /ql-bootstrap_
