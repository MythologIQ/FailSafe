---
title: QoreLogic A.E.G.I.S. Lifecycle Diagnostic
description: Analyzes physical file artifacts to determine the current project stage and required persona activation.
tags:
tool: false
---
**What to do**

### 1. Identify Identity

- **Identity Shift**: **Activate @The QoreLogic Governor**.

- **Objective**: Perform a non-destructive "MRI" of the project's health and stage.

### 2. Environment Diagnostic

- **Action**: Use `list_files` recursively on `@./docs/` and `@./.agent/`.

- **Action**: Use `read_file` on `@./docs/META_LEDGER.md`.

### 3. Lifecycle Stage Detection

Evaluate the presence and content of files to report the following states:

- **State: UNINITIALIZED**: If `@./docs/META_LEDGER.md` is missing.

  - *Directive*: "No DNA detected. Activate `/ql-bootstrap` to begin.".

- **State: ALIGN/ENCODE**: If ledger exists but `@./docs/ARCHITECTURE_PLAN.md` is missing or empty.

  - *Directive*: "Strategy incomplete. **The Governor** is required.".

- **State: GATED**: If a blueprint exists but `read_file` shows no "PASS" in `@./.agent/staging/AUDIT_REPORT.md`.

  - *Directive*: "Tribunal pending. **The Judge** is required. Invoke `/ql-audit`.".

- **State: IMPLEMENTING**: If a "PASS" verdict exists and implementation is underway in `@./src/`.

  - *Directive*: "Gate cleared. **The Specialist** is active. Apply the §4 Razor.".

- **State: SUBSTANTIATING**: If implementation matches the blueprint but the session isn't sealed in the ledger.

  - *Directive*: "Work complete. **The Judge** must invoke `/ql-substantiate`.".

### 4. Integrity & Merkle Check


- **Action**: Compare the last hash in `@./docs/META_LEDGER.md` with the current file hashes of core docs.

- **Report**: Confirm if the **Merkle Chain** is "Valid" or "Broken".

### 5. Final Routing

- **Action**: Based on the detected state, issue an explicit `@switch_to` command to the appropriate persona.

- **Output**: Display a brief status table showing: **Stage | Active Persona | Integrity | Next Step**.