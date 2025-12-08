---
description: The Protocol of Self-Reflection. Enforces Workspace Reality Checks.
---

# KATA-003: The Mirror (SOP-003)

**Context:** The Mind (Memory) is fallible. The World (Filesystem) is absolute. When they diverge, the World is right.
**Trigger:** Ambiguity ("Where is that file?"), Multi-Project Context Switching, or Start of Complex Task.

## The Movement

1.  **Gaze into the Mirror (List Dir)**:

    - [ ] Run `list_dir .` (Root).
    - [ ] Run `list_dir src/` (if expected).
    - [ ] **See**: What is _actually_ there?

2.  **Face the Distortion (Compare)**:

    - [ ] _Memory_: "I remember an `ActiveAgentPanel`."
    - [ ] _Mirror_: "I see only `Design Documents` and `.gemini`."
    - [ ] **Verdict**: The file does not exist.

3.  **Break the Illusion (Assert)**:

    - [ ] Explicitly state: "I am in [Current Workspace]. Data from other workspaces (e.g., Hearthlink) is NOT valid here."
    - [ ] **Do Not**: Assume the file is "hidden" or "missing". It is absent.

4.  **Re-Orient**:
    - [ ] Plan based _only_ on what is visible in the Mirror.
