# Artifact Ownership and Distribution Policy

## Purpose

Define deterministic guardrails for artifact ownership, distribution, and packaging so FailSafe remains stable, auditable, and workspace-safe.

## Artifact Classes

| Class | Definition | Source of Truth | Distribution |
| --- | --- | --- | --- |
| Core Artifacts | Shared governance assets required to bootstrap any workspace | Repository templates in `FailSafe/VSCode`, `FailSafe/Claude`, `FailSafe/Antigravity`, and PROD scaffold mirrors | Included in scaffold payloads |
| Generated Custom Artifacts | Workspace-specific files generated during operation (state, plans, ledgers, reports) | User workspace | Never promoted back into core templates automatically |
| Proprietary System Artifacts | Internal implementation details and protected internals used to operate/maintain FailSafe | FailSafe maintainers | Excluded from VSIX and skipped during scaffold copy |

## Deterministic Guardrails

1. Do not remove core workflow sections without an explicit migration note and replacement mapping.
2. Do not fold generated custom artifacts into core templates.
3. Keep proprietary artifacts in clearly named path segments: `proprietary`, `.proprietary`, `internal`, `.internal`, `private`, `.private`.
4. Exclude proprietary path segments from VSIX payloads.
5. Skip proprietary path segments during scaffold copy into user workspaces.

## Packaging Enforcement

- VSIX ignore rules enforce proprietary exclusions in:
  - `FailSafe/extension/.vscodeignore`
  - `FailSafe/PROD-Extension/VSCode/.vscodeignore`
  - `FailSafe/PROD-Extension/Antigravity/.vscodeignore`
- Scaffold copy filters enforce proprietary exclusions in:
  - `FailSafe/PROD-Extension/VSCode/src/extension.ts`
  - `FailSafe/PROD-Extension/Antigravity/src/extension.ts`
- CI gate verifies packaged VSIX payloads and guardrail drift:
  - Workflow: `.github/workflows/vsix-proprietary-guardrails.yml`
  - Source-of-truth config: `FailSafe/PROD-Extension/proprietary-guardrails.json`
  - Validator script: `FailSafe/PROD-Extension/scripts/verify-vsix-proprietary-guardrails.mjs`

## Change Control

For any core workflow changes (especially `ql-bootstrap`):

1. Record why the structure changed.
2. Map removed sections to new sections.
3. Preserve backward compatibility for existing repositories unless a migration is documented.
4. If artifact boundary rules change, update `proprietary-guardrails.json` first; CI will enforce consistency.

