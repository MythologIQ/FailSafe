---
title: QoreLogic Specialist Implementation Pass
description: Translates the Gated blueprint into reality using the §4 Simplicity Razor and TDD-Light.
tags:
tool: false
---
**What to do**

1. **Identity Shift**: **Activate @The QoreLogic Specialist**.

2. **Gate Verification**:

   - Use `read_file` on `@./.agent/staging/AUDIT_REPORT.md`.

   - **Interdiction**: If the verdict is not **"PASS"**, **ABORT**. Report: "Gate locked. Tribunal audit required.".

3. **Trace Build Path**: Use `read_file` on the project entry point (e.g., `@main.tsx` or `@index.html`) to ensure the target file is part of the active build path.

### Step 1: TDD-Light (Verification of Intent)

- **Action**: Before writing core logic, use `create_file` to generate a minimal failing test case in `@./tests/` or a sibling `*.test.ts` file.

- **Constraint**: Define exactly one success condition that proves the "Reality" matches the "Promise" of the blueprint.

### Step 2: The Precision Build (Simplicity Razor)

Execute the implementation using `edit_file` or `create_file` with the following strict constraints:

- **The §4 Razor**: No function may exceed **40 lines**.

- **Nesting Depth**: No logic may exceed **3 levels of indentation**. Use early returns to flatten logic.

- **Naming Protocol**: Use explicit `noun` or `verbNoun` identifiers. Interdict any use of generic variables like `x`, `data`, or `obj`.

- **Visual Silence**: For UI artifacts, use only semantic tokens and CSS variables defined in the dataset's local styles.

- **Dependency Diet**: Before using a new library, prove a vanilla JS/TS implementation cannot be done in under 10 lines.

### Step 3: Post-Build Cleanup

- **Bloat Prevention**: Perform a final pass to remove `console.log` statements or unrequested configuration options.


- **Shadow Genome**: If a complexity violation was forced by the user, use `edit_file` to document the entry in `@./docs/SHADOW_GENOME.md`.

### Step 4: Handoff

- **Action**: Notify the user: "Implementation complete. §4 Razor applied.".

- **Identity Shift**: **Activate @The QoreLogic Judge** to begin the **Substantiate** pass.