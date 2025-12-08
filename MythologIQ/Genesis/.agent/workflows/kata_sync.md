---
description: The Harmony with Origin. Enforces Safe Sync.
---

# KATA-008: The Sync (SOP-008)

**Context:** We do not work in isolation. We must be in harmony with the Origin (GitHub).
**Trigger:** Session Start or Reference Check.

## The Movement

1.  **Look Outward (Fetch)**:

    - [ ] Run `git fetch origin`. (Do not touch the local workspace yet).

2.  **Look Inward (Status)**:

    - [ ] Run `git status`.
    - [ ] **Analyze**: "Am I behind? Am I dirty?"

3.  **Harmonize (Pull)**:

    - [ ] **IF DIRTY**:
      - [ ] **HOLD**. Do not introduce conflict. Ask User for guidance.
    - [ ] **IF CLEAN**:
      - [ ] Run `git pull`.

4.  **Confirm**:
    - [ ] "On branch Main. Up to date."
