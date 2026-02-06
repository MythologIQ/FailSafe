# Workspace Isolation Instructions

## 1. Core Principles

1.  **Application Code Root**: All development work, source code, and AI packaging must be contained within the designated application container directory (as defined in `.failsafe/workspace-config.json`).
2.  **Workspace Governance Root**: The workspace root is reserved for AI governance (`.agent/`, `.claude/`, `.qorelogic/`), documentation (`docs/`), and essential configuration.
3.  **Prohibited Actions**: Never move application source files (e.g., code, build scripts, specific target constraints) out of the application container into the workspace root.
4.  **No Ghost Files**: Do not create temporary or unmanaged files in the root that belong in the application source.

## 2. Rationale

This isolation ensures that:

- AI agents assigned to governance tasks do not accidentally modify application code.
- The repository remains clean and follows a "Containerized" development pattern.
- Privacy is easier to enforce (e.g., ignoring the entire governance stack for public repos).

---

_Enforced by /compliance isolation_
