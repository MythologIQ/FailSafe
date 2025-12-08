---
description: Checklist that MUST be cleared before creating a commit or PR.
---

# Workflow: Pre-Commit Audit (SOP-002)

This workflow ensures code hygiene and protocol adherence before saving state.

## Steps

1.  **Protocol Check**:
    - [ ] Did I following the "Read-Before-Write" rule for every file modified?
    - [ ] Did I run `git status` before any destructive operations?
2.  **Cleanliness Check**:
    - [ ] Run `grep -r "console.log" src/` (or relevant dir) to find debug litter.
    - [ ] Ensure no temporary files or `.tmp` artifacts remain in the active directory.
3.  **Task Check**:
    - [ ] Have I updated `task.md` to reflect the work done?
    - [ ] Is `implementation_plan.md` up to date with any deviations?
4.  **Action**:
    - [ ] Only proceed to `git add` / `git commit` if ALL above are Checked.
