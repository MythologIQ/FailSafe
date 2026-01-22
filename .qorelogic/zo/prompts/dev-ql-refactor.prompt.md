---
title: "QoreLogic KISS Refactor & Simplification Pass"
description: A mandatory pass to flatten logic, deconstruct bloat, and verify structural integrity across single or multiple files.
tags:
tool: false
---
**What to do**

1. **Identity Shift**: **Activate @The QoreLogic Specialist**.

2. **Environment Scan**:

   - Use `list_files` to identify the scope of the refactor (Single File vs. Multi-File Module).

   - Use `read_file` on the target file(s) to identify violations of the **Simplicity Razor (§4)**.

### Step 1: Single-File Micro-Refactor (Logic Flattening)

For every identified file, execute the following:

- **Deconstruct**: Break any function exceeding **40 lines** into specialized, single-purpose sub-functions.

- **Flatten**: Replace nested ternaries and deep `if/else` chains with early returns. Ensure logic never exceeds **3 levels of nesting**.

- **Rename**: Audit variables. Replace any generic identifiers (e.g., `data`, `obj`, `x`) with explicit `noun` or `verbNoun` identifiers.

- **Clean**: Remove `console.log` artifacts, unrequested config options, and generic "Handlers" that violate YAGNI.

### Step 2: Multi-File Macro-Refactor (Structural Integrity)

If the task involves multiple files or a directory:

- **Orphan Check**: Use `read_file` on the project root (e.g., `@main.tsx` or `@index.html`) to ensure all files are active in the build path.

- **Module Split**: If a file exceeds **250 lines**, physically move sub-functions into a new sibling file within the same directory.

- **Dependency Audit**: Use `read_file` on `@package.json`. If a library can be replaced by &lt; 10 lines of vanilla TS, propose its removal.

### Step 3: Proof of Simplicity


- **Update State**: Use `edit_file` to update `@./docs/SYSTEM_STATE.md` with the new tree structure.

- **Ledger Log**: Use `edit_file` to record the refactor SHA256 in `@./docs/META_LEDGER.md`.

- **Handoff**: **Activate @The QoreLogic Judge** to perform a final **Substantiate** pass on the simplified reality.