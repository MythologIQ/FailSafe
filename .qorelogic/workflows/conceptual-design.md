---
description: Workflow for abstract brainstorming, architectural planning, and ambiguity resolution.
---

# Conceptual Design Workflow

## 1. Deconstruct the Idea

- **Goal:** Break down a vague request into concrete parts.
- **Action:**
  - Identify the Core Value Prop.
  - Identify the Target User/Persona.
  - List the Key Features (MVP).

## 2. Research & Inspiration

- **Action:**
  - **Search:** `search_web` for "modern [feature] UI examples" or "best practice for [feature]".
  - **Internal Search:** Check `docs` for similar existing implementations.

## 3. Options Analysis

- **Goal:** Provide choices, not just one path.
- **Action:**
  - **Option A:** The "Simple" (MVC) approach.
  - **Option B:** The "Rich" (Premium) approach.
  - **Option C:** The "Experimental" approach.

## 4. Synthesis

- **Action:**
  - Create `docs/concepts/CONCEPT_[Name].md` (or similar path).
  - Document the chosen path.

## 5. Review

- **Action:**
  - **Prompt User:** "I have outlined the concept. Which option do you prefer?"
