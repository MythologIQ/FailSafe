# FAILSAFE: ALIGNMENT MAP

This document maps existing FailSafe documentation and implementation artifacts to the **Prime Axioms**. It serves as an audit of current governance coverage and identifies gaps where the substrate is not yet enforceable.

---

## AXIOM 1: THE LAW OF ALIGNMENT (Intent over Action)

| Existing Artifact                          | Feature/Component | Alignment Status                                               |
| :----------------------------------------- | :---------------- | :------------------------------------------------------------- |
| `FAILSAFE_SPECIFICATION.md`                | Genesis Wizard    | **SUPPORTED**: Captures intent before implementation.          |
| `qorelogic/workflows/aegis-bootstrap.yaml` | Bootstrap         | **SUPPORTED**: Initializes project DNA.                        |
| `GapAudit.md`                              | Sprint 0.1        | **GAP**: Blueprint-to-Action binding is currently manual/weak. |

## AXIOM 2: THE LAW OF INTEGRITY (Reality over Claim)

| Existing Artifact                          | Feature/Component | Alignment Status                                                   |
| :----------------------------------------- | :---------------- | :----------------------------------------------------------------- |
| `FAILSAFE_SPECIFICATION.md`                | Sentinel Daemon   | **SUPPORTED**: Heuristic & LLM validation of claims.               |
| `qorelogic/policies/merkle-integrity.yaml` | Merkle Chain      | **SUPPORTED**: Cryptographic linking of decisions.                 |
| `GapAudit.md`                              | Sprint 1.2        | **GAP**: Ledger is JSON-backed; needs SQLite for true persistence. |

## AXIOM 3: THE LAW OF SOVEREIGNTY (Governance over Execution)

| Existing Artifact                   | Feature/Component | Alignment Status                                 |
| :---------------------------------- | :---------------- | :----------------------------------------------- |
| `FAILSAFE_SPECIFICATION.md`         | The Dojo          | **SUPPORTED**: Enforces development cadence.     |
| `qorelogic/orbits/orbit-judge.json` | The Judge         | **SUPPORTED**: Adversarial audit and VETO power. |
| `qorelogic/Antigravity/.qorelogic/README.md`   | Governance Gates  | **SUPPORTED**: L1/L2/L3 risk grading.            |

## AXIOM 4: THE LAW OF PERSISTENCE (Continuity over Time)

| Existing Artifact           | Feature/Component      | Alignment Status                                                     |
| :-------------------------- | :--------------------- | :------------------------------------------------------------------- |
| `.agent/staging/`           | System State Sync      | **SUPPORTED**: Cross-session context management.                     |
| `FAILSAFE_SPECIFICATION.md` | Recovery-First Startup | **GAP**: Implementation does not yet "lock" the session until audit. |

## AXIOM 5: THE LAW OF SIMPLICITY (KISS Enforcement)

| Existing Artifact                    | Feature/Component       | Alignment Status                                        |
| :----------------------------------- | :---------------------- | :------------------------------------------------------ |
| `qorelogic/policies/kiss-razor.yaml` | §4 Razor                | **SUPPORTED**: Enforces line counts and nesting depths. |
| `FAILSAFE_SPECIFICATION.md`          | Hallucination Decorator | **SUPPORTED**: Visual indicator of complexity debt.     |

---

## ENFORCEMENT GAP ANALYSIS

### 1. Intent-Action Binding (Axiom 1)

**Status**: WEAK.
**Remediation**: Create a `governance/INTENT_MANIFEST.md` that tracks every active execution window. Execution tools must request an "Intent ID" to perform modifications.

### 2. Physical Layer Integrity (Axiom 2)

**Status**: MODERATE.
**Remediation**: Upgrade Ledger to SQLite. Implement a `vibe-check` tool that compares the file system hash against the Ledger's "Last Known Good State" on every activation.

### 3. Authority Boundary (Axiom 3)

**Status**: GOOD (Design), WEAK (Enforcement).
**Remediation**: Explicitly define the **Integration Contract** that subagents must follow (e.g., must run `aegis-triage` before `aegis-implement`).
