---
description: Standard workflow for implementing a feature after design/planning is complete.
---

# Feature Development Workflow

## 1. Setup

- **Action:**
  - Create/Checkout feature branch (if using git).
  - Review `DESIGN_SPEC` or `TASK` to ensure clarity.

## 2. Test Driven Development (TDD) - Light

- **Action:**
  - **IF Logic:** Write a failing unit test for the new helper/utility.
  - **IF UI:** Write a test that checks for the component rendering (even if empty).

## 3. Implementation

- **Action:**
  - **Execute:** Write the code.
  - **Constraint:** Follow the `context_verification` findings (edit the correct file).
  - Use `safe_file_rewrite` for large edits.

## 4. Verification (The "Human Check")

- **Action:**
  - **Run Tests:** `test_suite_execution`.
  - **Visual Check:**
    - **IF** `native-visual-verification.md` exists globally or locally:
      - **Execute** it.
    - **ELSE**:
      - Manually verify via `browser_subagent` if available.

## 5. Polish

- **Action:**
  - Check for Lint errors.
  - Check for formatting.
  - Ensure no `console.log` left behind.

## 6. SIMPLIFICATION PASS (KISS)

- **Constraint:** Before submitting, you must audit your own code.
- **Action:**
  - Read `maintainability-kiss.md` (Global).
  - **Check Size:** Are any functions > 50 lines? Split them.
  - **Check Logic:** Are there nested turnaries? Expand them.
  - **Check Deps:** Did I add a library for a simple task? Remove it.
