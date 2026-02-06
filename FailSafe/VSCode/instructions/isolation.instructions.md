---
name: Physical Isolation Rule
description: Enforce the v3.0.2 separation of workspace governance and application code.
applyTo: ["**/*"]
---

# QoreLogic Isolation Rule

When working in this repository, you must strictly adhere to the **Physical Isolation Boundary**:

1.  **Application Code Root**: All development work, source code, and AI packaging must be contained within the `FailSafe/` directory.
2.  **Governance Root**: The root directory is reserved for workspace operational metadata (`.agent/`, `.claude/`, `.qorelogic/`, `docs/`).
3.  **Prohibited Actions**: Never move application source files (e.g., `.ts`, `.md` source, build scripts) out of the `FailSafe/` container into the workspace root.
4.  **Reference**: Follow the rules defined in `docs/specs/WORKSPACE_ISOLATION_RULES.md`.
