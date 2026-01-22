# Concept: The Viability Assessment Protocol (The Consequence)

**Context**: When a user overrides the System and writes code that contradicts the Plan ("Adapt"), they trigger a **Viability Assessment**.
**Philosophy**: "You can break the rules, but you must pay the 'Documentation Tax'. Code never exists without a Spec."

---

## 1. The Workflow: "The Trial"

When the User clicks **[Adapt Plan]** on a Quarantined file, the following process executes immediately. The code remains locked until this completes.

### Step 1: Automated Audit (The Detective)

The System (Antigravity Auditor) reads three inputs:

1.  **The Evidence**: The Quarantined Code (e.g., `src/server/index.ts` with new logic).
2.  **The Law**: The Current Spec (`specs/feat_004.md`).
3.  **The Constitution**: The Global Rules (`REPO_CONSTITUTION.md`).

### Step 2: Impact Analysis (The Judgment)

The Auditor evaluates the "Drift":

- **Constraint Violation**: Does the code break hard rules? (e.g., "Used `axios` instead of `fetch`").
- **Scope Creep**: Does the code add features not in the Spec? (e.g., "Added a user login route").
- **Architecture Break**: Does the code bypass established patters? (e.g., "Direct SQL instead of Service Layer").

### Step 3: The Verdict (The Report)

The User is presented with a **Viability Report** in the Dashboard:

> **⚠️ Viability Assessment: HIGH RISK**
>
> 1.  **Violation**: New Dependency `express` detected. Violates `fastify` constraint.
> 2.  **Scope**: Added `auth` middleware. Not in Spec.
>
> **The Cost (Required Actions):**
> To keep this code, you must:
>
> - [ ] Accept Update to `package.json` (Add dependency).
> - [ ] Accept Update to `specs/feat_004.md` (Add Auth requirement).
> - [ ] Accept Update to `Design Documents/Architecture.md`.

---

## 2. The Consequence: "The Documentation Tax"

This is the key behavioral enforcement.

- **Validation**: You cannot just "Keep" the code.
- **Transaction**: You must **Review and Commit** the updates to the documentation _first_.
- **Friction**: This intentional friction discourages lazy "Vibe Coding". It makes sticking to the process the "Path of Least Resistance," while still allowing innovation if you are willing to do the work to document it.

## 3. The "Rollback" (The Fail State)

If the Viability Assessment returns a **CRITICAL** violation (e.g., "breaks the build" or "violates security policy"), the **[Adapt]** option is disabled.

- The user _must_ fix the code or Revert.
- "You cannot Legislate this code into existence. It is fundamentally broken."

---

## Technical Mechanic

1.  **Quarantine**: Code is moved to `.failsafe/quarantine/src/...`.
2.  **Diff**: `git diff --no-index src/ original/`.
3.  **LLM Analysis**: "Given this diff and this spec, generate a list of requirement changes."
4.  **Patch Generation**: Create a `.patch` for the markdown files.
5.  **Application**: If User accepts, apply Markdown patches -> Move code back to `src/` -> Unlock.
