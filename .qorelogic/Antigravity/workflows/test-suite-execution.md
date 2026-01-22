---
description: Universal protocol for executing tests in any environment.
---

# Test Suite Execution Workflow

## 1. Discovery

- **Action:**
  - Check `package.json` for `scripts.test`.
  - Check for `pytest`, `cargo test`, `go test`.
  - Determines the **Test Command**.

## 2. Targeted Execution (The "Scalpel")

- **Goal:** Run ONLY relevant tests.
- **Action:**
  - **IF** `Task` modified `X.ts`:
    - Run `npm test -- X.test.ts`.
  - **IF** `Task` modified `Y.py`:
    - Run `pytest tests/test_Y.py`.
  - **RATIONALE:** Running the full suite takes too long and hides the signal.

## 3. Full Regression (The "Hammer")

- **Trigger:** End of `feature_development` or `refactor`.
- **Action:**
  - Run the full test command (e.g., `npm test`).
  - **IF** failures:
    - **Trigger** `debug_protocol`.

## 4. Visual Verification (The "Human Check")

- **Trigger:** UI Changes.
- **Action:**
  - **Notify User:** " Automated tests passed. Please verify visual output."
  - **Optional:** Take a screenshot using `browser_action` if enabled.
