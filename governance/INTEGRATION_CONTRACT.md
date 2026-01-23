# FAILSAFE: THE SOVEREIGNTY PROTOCOL (Integration Contract)

> "Execution tools gain power by operating within FailSafe's constraints, not by absorbing its logic."

This contract defines the mandatory interface between FailSafe (The Governor) and any external or internal Execution System (ES). Adherence is non-negotiable.

---

## 1. REGISTRATION OF INTENT

Before initiating any action that modifies the system state, the ES MUST:

1.  **Request Alignment**: Submit a structured `Intent Request` encompassing the _Purpose_, _Scope_, and _Success Criteria_.
2.  **Await Blueprinting**: Wait for FailSafe to generate or approve an `ARCHITECTURE_PLAN.md`.
3.  **Accept Risk Grade**: FailSafe will assign a Risk Grade (L1, L2, or L3). The ES acknowledges the required gates for this grade.

## 2. THE EXECUTION WINDOW

Once an intent is approved, an `Execution Window` is opened.

- **Window Sovereignty**: All actions taken by the ES during this window MUST be attributable to the active Intent ID.
- **Drift Detection**: If an action is taken outside the scope of the Intent, FailSafe will trigger a **Drift Lock**, suspending the window.
- **§4 Compliance**: All code generated MUST pass the §4 Simplicity Razor (Micro KISS) before it is committed to the main branch.

## 3. VERDICT-GATED PIPELINE

The ES must respect the status of the Governance Gates:
| Status | ES Action Permitted |
| :--- | :--- |
| **PULSE** | Alignment in progress. ES may read but NOT write. |
| **PASS** | Implementation permitted within scope. |
| **VETO** | Execution blocked. ES must remediate the blueprint and re-submit. |
| **SEALED** | Session closed. Action immutable. |

## 4. OUTCOME SUBSTANTIATION

Upon completion of the implementation, the ES MUST:

1.  **Submit Evidence**: Provide proof of success (e.g., successful build, passing tests, visual verification artifact).
2.  **Trigger Audit**: Invoke the `aegis-substantiate` workflow.
3.  **Verification Check**: Sentinel will audit the outcome against the original blueprint's "Promise".

## 5. RECOVERY & CONTINUITY

- **Session Persistence**: The ES must assume the session can terminate at any point.
- **Governance Resumption**: On restart, the ES must first query FailSafe for the `Current Governance State` before resuming any work.
- **Unresolved Risk Alert**: The ES is responsible for surfacing any "Unresolved Risks" flagged by FailSafe from a previous session.

---

## CONFORMITY LEVELS

### Level 1: Passive Observation

System logs intent but does not block. (Not recommended for L2/L3).

### Level 2: Active Monitoring

Sentinel alerts on every violation but allows the ES to continue (Soft Guardrail).

### Level 3: Hard Enforcement

FailSafe is integrated into the toolchain. Violations physically block the ES (e.g., pre-commit hooks, protected files). **This is the target state for FailSafe.**
