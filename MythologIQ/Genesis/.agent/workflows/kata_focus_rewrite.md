---
description: The Discipline of Attention. Enforces Audit before Action.
---

# KATA-007: The Focus (SOP-007)

**Context:** To write without reading is to speak without listening. It leads to destruction.
**Trigger:** Writing to a file > 100 lines.

## The Movement

1.  **Observe (Read)**:

    - [ ] Run `view_file` on the target.
    - [ ] **Absorb**: Acknowledge the existing components, imports, and structure.

2.  **Meditate (Audit)**:

    - [ ] Compare your "New Code" against the "Observed Reality".
    - [ ] **Challenge**: "Am I dropping `GlobalCommsStream`? Am I deleting the `utils`?"

3.  **Act (Write)**:

    - [ ] **IF FLAWS DETECTED**:
      - [ ] **STOP**. Correct the internal mental model. Retain the imports.
    - [ ] **IF PURE**:
      - [ ] Proceed with `write_to_file`.

4.  **Reflect (Verify)**:
    - [ ] Did the write land true? Verify the critical nodes are still present.
