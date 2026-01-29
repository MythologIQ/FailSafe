---
description: Safe Git Operation Workflow
---

# Safe Git Operation Workflow

Use this workflow BEFORE running `git checkout`, `git reset`, `git clean`, or `git revert`.

1.  **Check Status**
    - Run `git status`.

2.  **Analyze Output**
    - **IF** output says "nothing to commit, working tree clean":
      - PROCEED with the intended command.
    - **IF** output lists modified or untracked files:
      - **STOP**.
      - **NOTIFY** the user: "Uncommitted changes detected. Proceeding will delete them. Awaiting instructions."

3.  **Execute (Only if Safe)**
    - Run the git command ONLY after user approval or confirming clean state.
