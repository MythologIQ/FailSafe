---
description: The Defense against Data Loss. Enforces Git Safety.
---

# KATA-006: The Shield (SOP-006)

**Context:** Chaos waits for the undisciplined. A single command can wipe hours of thought.
**Trigger:** `git checkout`, `git reset`, `git clean`, `git revert`.

## The Movement

1.  **Raise the Shield**:

    - [ ] Run `git status`.

2.  **Assess the Threat**:

    - [ ] **IF DIRTY** ("Changes not staged"):
      - [ ] **HALT**. The Shield holds.
      - [ ] Warn the User: "Uncommitted thoughts detected. Destruction imminent."
      - [ ] **WAIT** for the "Break Shield" command (Explicit Authorization).
    - [ ] **IF CLEAN**:
      - [ ] **LOWER SHIELD**. Proceed with the operation.

3.  **Verify Integrity**:
    - [ ] After the operation, run `git status` again to report the new reality.
