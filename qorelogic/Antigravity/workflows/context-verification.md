---
description: Mandatory protocol to verify files are part of the active render tree/build path.
---

# Context Verification Workflow

## 1. Identify Entry Point

- **Action:**
  - Determine if the app uses `main.tsx`, `index.tsx`, `App.tsx`, `root.tsx` (Remix/Next), or `index.html` as root.
  - **Check:** `package.json` -> `scripts` -> `build` usually hints at the entry.

## 2. Trace the Tree

- **Goal:** Ensure `TargetFile` is actually imported by `Root`.
- **Action:**
  - **Search:** `grep_search` in the Root file for the component/module name.
  - **IF** `grep` returns 0 results:
    - **WARNING:** "Component is ORPHANED or NOT connected to main tree."
    - **Action:** Search for _where_ it is used. `grep_search` codebase wide.
    - **Decision:** Are you editing the `Active` version or a `Legacy` or `Backup` version?

## 3. Global & Architecture Check

- **Action:**
  - Check `docs/` for any `ARCHITECTURE` or `MAP` files.
  - Check `C:\Users\krkna\.gemini\antigravity\global_workflows` (if accessible) for Global Maps.
  - **Verify** your target falls under the active path.

## 4. Confirmation

- **Action:**
  - **IF** verified: "Confirmed [File] is active."
  - **IF** ambiguous: **STOP** and Ask User: "Multiple versions of [File] found. Which is active?"
