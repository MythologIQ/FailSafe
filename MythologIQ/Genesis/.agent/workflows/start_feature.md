---
description: Workflow to launch a new feature adhering to Spec-Driven Development.
---

# Workflow: Start Feature (SOP-004)

This workflow ensures that NO coding happens before a Plan, and NO Plan happens before a Spec.

## Steps

1.  **Define the Objective**:
    - [ ] Update `task.md` with the high-level goal.
2.  **Create the Spec**:
    - [ ] Copy `.gemini/specs/_TEMPLATE.md` to `.gemini/specs/[feature_name].md`.
    - [ ] Fill out all sections (Context, User Stories, Delta Plan).
3.  **The Gatekeeper (User Approval)**:
    - [ ] **STOP**. Call `notify_user` to review the Spec.
    - [ ] **WAIT** for approval.
4.  **Create Implementation Plan**:
    - [ ] Once Spec is LGTM, create `implementation_plan.md`.
    - [ ] Map the Spec's "Deltas" to file operations.
5.  **Execute**:
    - [ ] Proceed to Agentic Mode (Builder).
