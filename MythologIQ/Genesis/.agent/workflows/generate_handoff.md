---
description: Workflow to preserve context and state for the next session/agent.
---

# Workflow: Generate Handoff (SOP-003)

This workflow generates a structured JSON packet to minimize "Amnesia."

## Steps

1.  **Identify State**:
    - [ ] What is currently broken?
    - [ ] What was the last successful command?
2.  **Compile JSON**:
    - [ ] Create/Update `.gemini/HANDOFF_PACKET.json` (or verify `notify_user` output contains it).
    - [ ] Schema:
      ```json
      {
        "timestamp": "ISO-8601",
        "current_status": "BROKEN | STABLE | IN_PROGRESS",
        "last_action": "Description of last tool call",
        "next_immediate_step": "Exact command or tool to run next",
        "active_files": ["list", "of", "hot", "files"]
      }
      ```
3.  **Notify User**:
    - [ ] Send the summary via `notify_user`.
