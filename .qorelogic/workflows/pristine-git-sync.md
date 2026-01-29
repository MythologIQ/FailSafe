---
description: Pristine Git Sync Workflow
---

# Pristine Git Sync Workflow

Use this workflow to ensure the repository remains aligned with GitHub and the local history is clean.

1.  **Assess State**
    - Run `git status`.
    - Run `git remote -v` (verify origin).

2.  **Sync with Remote**
    - Run `git fetch origin`.
    - Run `git status` to check for divergence (ahead/behind).
    - **IF** behind:
      - **NOTIFY** user: "Local branch is behind remote. Pulling updates to maintain alignment."
      - Run `git pull`.

3.  **Secure Local Changes**
    - **IF** there are uncommitted changes (staged or unstaged):
      - **PROPOSE** a commit to the user: "I see uncommitted changes. Shall I commit them to maintain a pristine state?"
      - **WAIT** for approval.
      - **IF** approved, run `git add .` and `git commit -m "type: description"`.

4.  **Push (Optional)**
    - **ASK** user if they want to push changes to GitHub to secure them remotely.
