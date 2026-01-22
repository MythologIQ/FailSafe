# The FailSafe Method

> **A Manifesto for Deterministic AI Development**

## The Crisis: Vaporware & Drift

AI Agents are powerful engines of creation, but they suffer from a critical flaw: **Hallucination**.

- They invent files that do not exist.
- They promise features they have not built.
- They "drift" from the original requirements, creating chaotic, unmaintainable codebases.

We call this **"Vaporware Development"**—a state where the _idea_ of the software is perfect in the Agent's mind, but the _reality_ is broken.

## The Solution: Active Enforcement

**FailSafe** is not just a tool; it is a discipline. It reverses the power dynamic. Instead of the Human chasing the Agent's errors, the System forces the Agent to prove its truth before it can proceed.

## The Three Pillars of FailSafe

### 1. Zero Hallucination

**"If it is not in the File System, it does not exist."**
We do not accept "plans" that reference phantom files. We do not accept import paths that break. Every claim made by the Agent must be backed by verifiable, existing reality.

### 2. The Engineer's Contract (Spec-Driven)

**"Code is downstream of Design."**
No code is written until the **Specification** is crystallized. The Spec is not a suggestion; it is a binding contract. The Agent is the contractor. If the implementation deviates from the Spec, it is rejected by the Gates.

### 3. The No-Loophole Protocol

**"The UI IS the Process."**
Discipline cannot be optional. You cannot "just ask" the Agent to skip a step or "fix it quick."

- The Design Phase allows only Design edits.
- The Build Phase is locked until the Design is certified.
- The Workflow is linear, deterministic, and enforced by the environment itself.

## The Protocol: A.E.G.I.S.

We follow the **A.E.G.I.S.** Loop—a deterministic cycle that ensures no step is skipped and no hallucination survives.

### **A** - Align (The Strategy)

_Define the "Why" and the "Vibe" before touching code._

1.  **Formulate the Prism**: Define the "Provocations" and "Impossible Ideas" (The Soul).
2.  **Lock the Strategy**: Explicitly define the **Pain**, the **Value**, and the **Anti-Goal**.
3.  **Output**: `concept.json` (State: `CRYSTALLIZED`).

### **E** - Encode (The Contract)

_Translate the Vision into Law._

1.  **Draft the Blueprint**: Map the High-Level System Architecture.
2.  **Write the Spec**: Define strict Types, Interfaces, and Logic.
    - _Protocol_: Use **Atomic Writes** (Full Overwrite) for Contracts to prevent "Patch Drift".
3.  **Output**:
    - `BLUEPRINT.md` (Architecture Map).
    - `SPEC.md` (The Engineer's Contract).

### **G** - Gate (The Checkpoint)

_The System auditing the Plan before execution begins._

1.  **The Zero-Phase**: Run `DependencyGate` **BEFORE** any code is written.
    - _Rule_: if `package.json` misses a Spec dependency, STOP. Harden the environment first.
2.  **Security Audit**: Run `integrity-gate` to prevent vulnerable dependencies.
3.  **Architecture Check**: Ensure `package.json` matches the Spec's requirements.
4.  **Output**:
    - `npm install` (Validated Dependencies).
    - `package.json` (Hardened).
    - `audit-report.json` (Clean Bill of Health).

### **I** - Implement (The Build)

_The Agent building within the Bounds._

1.  **Environment Awareness**: Verify OS/Shell context (e.g., Windows/PowerShell vs Linux/Bash).
2.  **Generate Code**: The Agent writes the implementation.
3.  **Active Enforcement**: `fs-gate` watches every file path typed.
    - _If path exists_: Green Light.
    - _If path is phantom_: **BLOCK**. Red Squiggly. Agent must stop and create the file.
4.  **Output**:
    - `src/` (Source Code matching Spec).
    - `test/` (Verification Scripts).

### **S** - Substantiate (The Proof)

_Proving the Reality matches the Promise._

1.  **Automated Validation**: Run the `verify_*.ts` scripts.
2.  **Visual Verification**: Inspect the Decorators and UI.
3.  **Handoff**: Create "Proof of Work".
4.  **Output**:
    - `walkthrough.md` (Evidence of Execution).
    - `failsafe.log` (Audit Trail).
    - `ValidationReport` (Green Checkmarks).

---

**FailSafe**: _Trust, but Verify._

---

## Agent Integration (The Universal Protocol)

FailSafe is now a **Universal Bridge**. Whether you are using Cursor, Antigravity, or a CLI Agent (Claude/Codex), the protocol remains the same. The System enforces these rules via the "Oversight Kernel".

### The 4 Laws of FailSafe (System Prompt)

> **FAILSAFE PROTOCOL ACTIVE**
>
> 1.  **Read-First**: You must read `BLUEPRINT.md` and `SPEC.md` before writing code.
> 2.  **Gate-First**: You must run validation checks (`npm audit`, dependency checks) _before_ implementation.
> 3.  **Atomic-Contracts**: You must fully overwrite Specifications; never patch them.
> 4.  **No-Hallucination**: You must run verification scripts (`verify_*.ts`) after every major step.

### Bootcamp Protocol (Initialization)

When starting a session in _any_ agent, run the bootstrap command to load the "Constitution" and "Context Map":

`> failsafe init`
