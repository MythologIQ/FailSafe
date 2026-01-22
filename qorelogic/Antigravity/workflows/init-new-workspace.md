---
description: Protocol to initialize a brand new empty workspace with the Universal Agent Framework.
---

# Initialize New Workspace

## 1. Directory Structure Setup

- **Action:**
  - Create `.agent` directory.
  - Create `.agent/workflows`, `.agent/rules`, `.agent/memory` subdirectories.
  - Create `docs` directory (standard location for architecture/concepts).

## 2. Inject Universal Protocols

- **Action:**
  - Write `00_WORKFLOW_PROTOCOL.md` to `.agent/workflows/`.
  - Write standard workflows (`bootstrap_task`, `debug_protocol`, `context_verification`) to `.agent/workflows/`.

## 3. Project Configuration

- **Action:**
  - **Prompt User:** "What is the primary tech stack? (e.g., React/Vite, Python/FastAPI, Node/Express)."
  - Create `docs/TECH_STACK.md` with the user's input.
  - Initialize Git (if not present): `git init`.

## 4. First Memory

- **Action:**
  - Create `.agent/memory/project_context.md`.
  - Write:
    ```markdown
    # Project Context

    - Status: Initialization
    - Stack: [User Defined]
    - Primary Goal: [User Defined]
    ```

## 5. Handoff

- **Action:**
  - **Notify User:** "Workspace initialized. Universal Protocols active. Ready for first task."
