---
description: Mandatory pre-coding workflow for UI tasks. defines visuals, assets, and hierarchy.
---

# UI Design Studio Workflow

## 1. Visual Requirement Gathering

- **Goal:** Define what it looks like BEFORE coding.
- **Action:**
  - **Search:** Check codebase for icon libraries (e.g., `lucide-react`, `heroicons`, or custom `Icons.tsx`).
  - **Check:** Read `index.css`, `tailwind.config.js`, or `App.css` for current variables/tokens.

## 2. Asset Generation (If needed)

- **Goal:** Create missing assets.
- **Action:**
  - **IF** distinct UI paradigm is needed:
    - Trigger `generate_image` to create a mockup.
    - **Prompt:** "Create a modern UI for [feature] matching the existing style..."

## 3. Design Specification

- **Goal:** Create the "Blueprint".
- **Action:**
  - Create a temporary artifact `DESIGN_SPEC.md` (or append to task).
  - **Define:**
    - Layout (Flex/Grid).
    - Colors (Variables/Tokens).
    - Interactions (Hover, Focus).
    - Responsive behavior (Mobile/Desktop).

## 4. User Sign-Off

- **Goal:** Prevent subjective rejection.
- **Action:**
  - **ASK User:** "I propose this design [Summary/Image]. Proceed?"
  - **WAIT** for affirmation (unless `SafeToAutoRun` allows minor UI).

## 5. Handoff

- **Action:**
  - Proceed to `feature_development`.
