# Process Upgrade Audit: Migrating to A.E.G.I.S.

## Objective

Upgrade the development environment to enforce the "Strict Gating" and "Atomic Protocols" defined in `The_FailSafe_Method.md`.

## Gap Analysis

### 1. Workflow Drift (`.agent/workflows/`)

- **Current State**: `start_feature.md` (SOP-004) assumes a "User Approval" gate but lacks a **System Validation** gate.
- **Missing**:
  - "The Zero-Phase" (Dependency Check) before Implementation Plan.
  - "Atomic Write" Protocol for Specs.
- **Risk**: Agents can approve "vague" plans and immediately start coding without validating environment readiness.

### 2. Missing CLI Tooling (`package.json`)

- **Current State**: We have `npm run test` and `npm run compile`.
- **Missing**: Discrete commands to run the Gates independently.
  - `npm run gate:deps` (Run DependencyGate)
  - `npm run gate:audit` (Run IntegrityGate)
  - `npm run gate:spec` (Run SpecGate)
- **Risk**: Gates are locked inside the VS Code Extension runtime, making them hard to use in a CI/Process loop.

### 3. Verification Gaps (`pre_commit_audit.md`)

- **Current State**: Focuses on "Cleanup" (console.log, tmp files).
- **Missing**: **Active Substantiation**.
  - Requirement to run `verify_gates.ts` or similar proof scripts.
- **Risk**: Committing code that "looks clean" but fails the Gates.

### 4. Prompt Integration

- **Current State**: The "FailSafe Protocol" text exists only in `The_FailSafe_Method.md`.
- **Missing**: A dedicated `.agent/FAILSAFE_PROMPT.md` file for easy injection into context.
- **Risk**: The "Agent Integration" step relies on human memory to copy-paste the protocol.

## Upgrade Plan

### Phase 1: Tooling (The Enforcers)

1.  **Refactor**: Extract Gate logic into a CLI-friendly runner (e.g., `scripts/gate-runner.ts`).
2.  **Update**: Add `gate:*` scripts to `package.json`.

### Phase 2: Workflow (The Law)

1.  **Update**: `start_feature.md` to include `npm run gate:deps` as a mandatory step.
2.  **Update**: `pre_commit_audit.md` to require `npm run gate:all`.
3.  **Create**: `.agent/FAILSAFE_PROMPT.md` with the System Prompt directive.

### Phase 3: Validation

1.  **Simulate**: Run a "Mock Feature" through the upgraded workflow to verify the new friction points work as intended.
