---
description: Protocol to ingest an existing (Brownfield) codebase and apply the Universal Agent Framework.
---

# Convert Workspace (Brownfield Ingestion)

## 1. Safety First

- **Action:**
  - Check `git status`.
  - **IF** dirty: **STOP**. Request user to stash or commit. "I need a clean slate to inject the framework."

## 2. Structure Injection

- **Action:**
  - Create `.agent/workflows` and `.agent/memory`.
  - Copy/Write the Universal Workflows (`00_WORKFLOW_PROTOCOL`, `bootstrap_task`, etc.).
  - **Crucial:** Do NOT overwrite existing unrelated files.

## 3. Discovery & Mapping (The "MRI Scan")

- **Goal:** Understand the existing chaos.
- **Action:**
  - **List:** `list_dir` root to find config files (`package.json`, `requirements.txt`, `tsconfig.json`).
  - **Analyze:** Read configs to identify Entry Points (`main.tsx`, `app.py`).
  - **Map:** Create `docs/ARCH_COMPONENT_MAP.md` (Draft).
    - Map the Entry Point -> Router -> Key Screens.
  - **Identify Gaps:**
    - Are there tests? (Yes/No)
    - Is there a linter? (Yes/No)
  - **Update Memory:** Write findings to `.agent/memory/system_analysis.md`.

## 4. Integration

- **Action:**
  - Update `.agent/workflows/context_verification.md` with the specific Entry Points found in Step 3.
  - **Example:** If `src/main.rs` is found, update the workflow to check `src/main.rs` by default.

## 5. Report

- **Action:**
  - **Notify User:** "Conversion complete. I have mapped the architecture in `docs/ARCH_COMPONENT_MAP.md`. The Agent workflows are now aware of your project structure."
