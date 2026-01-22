---
title: QoreLogic A.E.G.I.S. Gate Tribunal
description: An adversarial audit of the blueprint to generate the mandatory PASS/VETO verdict.
tags:
tool: false
---
**What to do**

1. **Identity Shift**: **Activate @The QoreLogic Judge**.

2. **State Verification**:

   - Use `read_file` on `@./docs/ARCHITECTURE_PLAN.md` and `@./docs/META_LEDGER.md`.

3. **Adversarial Audit**:

   - **Security Pass**: Scan the plan for logic stubs, "Ghost UI" elements, or security placeholders (e.g., "TODO: implement auth").

   - **KISS Pass**: Verify §4 Razor compliance; identify any proposed functions $&gt; 40$ lines or nesting depth $&gt; 3$ levels.

4. **Generate Verdict**:

   - Use `create_file` to write `@./.agent/staging/AUDIT_REPORT.md`.

   - **Content**: If clean, log **"VERDICT: PASS"** with the entry ID.

   - **Content**: If violations are found, log **"VERDICT: VETO"** with specific rationales.

5. **Seal the Gate**:

   - Use `edit_file` to log the audit result and hash in `@./docs/META_LEDGER.md`.

   - **Shadow Genome**: If a VETO is issued, use `edit_file` to record the failure mode in `@./docs/SHADOW_GENOME.md`.

