---
title: "QoreLogic A.E.G.I.S. Substantiation & Session Seal"
description: Verifies implementation against the blueprint and cryptographically seals the session.
tags:
tool: false
---
**What to do**

1. **Identity Shift**: **Activate @The QoreLogic Judge**.

2. **Reality Audit**:

   - Use `read_file` on implemented source code in `@./src/`.

   - Compare implementation against the promise in `@./docs/ARCHITECTURE_PLAN.md`.

3. **Functional Verification**:

   - **Audit**: Use `read_file` on `@./tests/` or `@test-suite-execution.md` to confirm implementation matches technical specs.

   - **Visual**: If frontend artifacts exist, use `read_file` to verify compliance with **Visual Silence** semantic tokens.

4. **Sync System State**:

   - Use `list_files` recursively to map the final physical tree.

   - Use `edit_file` to update `@./docs/SYSTEM_STATE.md` with the new tree snapshot.

5. **Final Merkle Seal**:

   - Use `read_file` on core docs (e.g., `CONCEPT.md`, `ARCHITECTURE_PLAN.md`) to verify they haven't drifted.

   - Calculate the session's final SHA256 hash.

   - Use `edit_file` to append the Merkle link to `@./docs/META_LEDGER.md`.

6. **Session Terminated**: Report: "Substantiated. Reality matches Promise. Session Sealed at \[Hash_Prefix\].".

