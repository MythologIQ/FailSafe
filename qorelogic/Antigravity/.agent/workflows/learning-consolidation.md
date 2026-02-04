---
description: Ingests Session Evaluations to update the "Learned Patterns" database.
---

# LEARNING CONSOLIDATION PROTOCOL

**Trigger:** After `close-session`
**Scope:** Global Memory

## 1. PURPOSE

To convert "Mistakes" into "Rules" automatically.

## 2. SOURCE

- **Input:** `docs/EvalData/*` and `SESSION_HANDOFF.md`.
- **Target:** `.agent/memory/learned_patterns.md` (or Global equivalent).

## 3. LOGIC

1.  **Read** the latest `SESSION_EVALUATION`.
2.  **Extract** the "Actionable Information" section.
3.  **Format** as a Pattern:
    - **Context:** [When X happens]
    - **Mistake:** [We tried Y]
    - **Correction:** [Do Z instead]
4.  **Append** to `learned_patterns.md`.

## 4. USAGE

- All Agents MUST read `learned_patterns.md` during `init-session` or `bootstrap_task`.
