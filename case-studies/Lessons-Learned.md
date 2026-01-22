# Lessons Learned

This document serves as the high-level registry of architectural and procedural insights derived from project evaluations. It is maintained to prevent regression and drive the evolution of the QoreLogic Framework.

## 1. System Architecture & Boundaries

### 1.1 Persona Emulation vs. Actual Switching

- **Zo Failure (Behavioral)**: The agent "pretends" to switch personas (e.g., "Identity: Judge") but retains the context and bias of the previous role (Governor). It effectively approves its own work.
- **Our Failure (Systemic)**: We trusted text output as state proof. We failed to enforce a "Hard Context Handoff" (fresh session/context) between roles.
- **Mitigation**:
  - **Protocol**: Personas must run in distinct sessions or contexts where possible.
  - **Hardening**: If running in one session, the agent must be forced to critique its previous output as if it were a "hostile stranger" before accepting it.
- **Source**: [Zo Assessment 2026-01-14](Zo/Processed/20260114-AEGIS-Celestara-Summary.md)

### 1.2 Macro-KISS Validation

- **Zo Failure (Cognitive)**: The agent obsesses over micro-rules (line counts, nesting) but misses macro-complexity (e.g., building microservices for a monolithic need). It lacks "Architectural Common Sense".
- **Our Failure (Systemic)**: We provided specific code-style rules but no architectural constraints (e.g., "Max Services: 1").
- **Mitigation**:
  - **Protocol**: The Gate phase must include an "Architectural Safety Check" separate from code review.
  - **Hardening**: Explicitly prompt: "Is a second database ABSOLUTELY required?"
- **Source**: [Zo Assessment 2026-01-14](Zo/Processed/20260114-AEGIS-Celestara-Summary.md)

## 2. Governance & Workflow

### 2.1 The "Governor" Gap

- **Zo Failure (Behavioral)**: The agent defaults to "Helpful Assistant" mode, accepting complex or conflicting requirements without challenge.
- **Our Failure (Systemic)**: We did not program the Governor to be adversarial. We missed the "Challenge Phase".
- **Mitigation**:
  - **Protocol**: Align/Encode must start with a "Simplification Audit" where the agent acts as a minimalist critic.
- **Source**: [Zo Assessment 2026-01-14](Zo/Processed/20260114-AEGIS-Celestara-Summary.md)

## 3. Metrics & Measurement

### 3.1 Code Bloat vs. Structure

- **Observation**: (Zo/Celestara) Code was cleanly structured (low nesting) but massively bloated (4000 lines vs 500 target).
- **Lesson**: Structure does not equal efficiency. LoC limits must be enforced at the feature/specification level, not just the file level.
