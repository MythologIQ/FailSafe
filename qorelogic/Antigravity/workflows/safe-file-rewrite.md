---
description: Safe File Rewrite Workflow (Universal) - Prevents data loss during edits.
---

# Safe File Rewrite Workflow

## 1. Analysis

- **Goal:** Ensure we don't accidentally delete critical sections.
- **Action:**
  - **Read** the current file.
  - **Identify** "Load Bearing" lines:
    - Imports.
    - Exports.
    - Key Function Signatures.

## 2. The Preservation Check

- **Action:**
  - **Compare** your proposed new code with the "Load Bearing" list.
  - **Question:** "Am I removing `import React`? Am I removing `export default`?"
  - **IF** yes: **STOP** and correct the code.

## 3. Execution

- **Action:**
  - Use `replace_file_content` for surgical edits (Preferred).
  - Use `write_to_file` ONLY if rewriting the WHOLE file (Riskier).

## 4. Integrity Verification

- **Action:**
  - **Run** `grep_search` on the file for the Key Imports identified in Step 1.
  - **IF** missing:
    - **IMMEDIATELY** revert or patch.
    - **Trigger** `debug_protocol` ("I accidentally deleted imports").
