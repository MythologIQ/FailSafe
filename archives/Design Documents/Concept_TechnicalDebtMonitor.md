# Concept: The Technical Debt Monitor (The Long Tail)

**Question**: "Is updating the plan enough?"
**Answer**: No. A plan that is constantly "Adapted" to fit ad-hoc code becomes a **Frankenstein Plan**. It loses cohesion.

**The Risk**:

1.  **Complexity Creep**: Code patched onto code creates spaghetti.
2.  **Fragility**: "Valid" code can still be brittle.
3.  **Loss of Intent**: The original "Why" (Strategic Core) gets diluted by the "How" (Tactical fixes).

---

## 1. The Mechanic: "The Cohesion Score"

FailSafe does not just validate _correctness_ (Does it work?); it validates _cleanliness_ (Is it good?).

### The Metric

We track a **Cohesion Score** (0-100%) for the Project.

- **Base Score**: 100%.
- **Penalty**: Every "Forced Adaptation" subtracts points based on severity.
  - _Small Refactor_: -1%.
  - _Architecture Bypass_: -15%.
  - _Dependency Injection Violation_: -5%.

## 2. The UX: "The Debt Meter"

In the Dashboard, next to "Hallucination Rate", we add **"Technical Debt"**.

- **Green (0-10%)**: Clean, Strategic execution.
- **Yellow (10-30%)**: Tactical focus. "We are compromising."
- **Red (>30%)**: "Bankruptcy imminent. Refactor required."

## 3. The Protocol: "The Bankruptcy declaration"

If Debt exceeds 40%:

1.  **Lockdown**: The System enters **REFRACTOR ONLY** Mode.
2.  **Constraint**: No new features allowed.
3.  **Action**: User/Agent must perform "Cleanup Tasks" (Consolidate logic, remove unused files, update docs) to "Pay Down" the debt and unlock Feature Mode.

---

## Summary

Updating the Plan legitimizes the _current action_, but the Debt Monitor tracks the _cumulative damage_ to the system's integrity. It ensures we don't just "Document our way to a bad codebase."
