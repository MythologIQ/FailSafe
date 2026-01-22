---
description: Workflow for planning large-scale architectural changes or new modules.
---

# Architecture Planning Workflow

## 1. Scope Definition

- **Goal:** Define boundaries.
- **Action:**
  - Identify affected modules/components.
  - Identify data flow changes.
  - Identify new dependencies.

## 2. Dependency Analysis

- **Action:**
  - **Search:** Check for existing patterns in `src/`.
  - **Verify:** Does this break the existing architecture (e.g., Circular dependencies)?

## 3. Blueprinting

- **Action:**
  - Create `ARCHITECTURE_PLAN.md`.
  - **Output:**
    - Directory Structure (Proposed).
    - Interfaces / Types (Draft).
    - Data Models.

## 4. Review Gate

- **Action:**
  - **Present** the plan to the User.
  - **Question:** "Does this align with the project's long-term goals?"
