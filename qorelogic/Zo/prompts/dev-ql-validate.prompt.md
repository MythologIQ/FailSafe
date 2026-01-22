---
title: QoreLogic Merkle Chain Validator
description: "Recalculates and verifies the cryptographic integrity of the project's Meta Ledger."
tags:
tool: false
---
**What to do**

1. **Identity Shift**: **Activate @The QoreLogic Judge**.

2. **Scan Dataset**:

   - Use `read_file` on `@./docs/META_LEDGER.md`.

   - Use `list_files` to identify all referenced documents in the ledger (e.g., `CONCEPT.md`, `ARCHITECTURE_PLAN.md`).

3. **Audit the Chain**:

   - **Recalculate**: For every entry since Genesis, calculate the SHA256 hash of the content plus the previous entry's hash.

   - **Compare**: Ensure the calculated `entry_hash[n]` matches the recorded `hash(entry[n] + previous_hash[n-1])`.

4. **Status Report**:

   - **Success**: If the chain is unbroken, return: "✅ **Chain Valid**. Integrity verified for \[Project Name\].".

   - **Failure**: If a mismatch is detected, return: "⛔ **Chain Broken** at Entry #\[ID\]. Manual audit required.".

