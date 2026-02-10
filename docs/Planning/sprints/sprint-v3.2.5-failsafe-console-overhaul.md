# Sprint Plan: v3.2.5 FailSafe Console Overhaul

## Sprint Intent

Implement the FailSafe Console overhaul with profile-based UX, enforceable workflow evidence, and hard branch/PR governance aligned to GitHub standards.

## Persona Task Map

| Persona | Responsibility | Deliverables |
|---|---|---|
| Governor | Scope integrity and GitHub governance policy | branch/PR standards contract, policy docs |
| Specialist | UI, workflow, and validator implementation | route/profile surfaces, reliability/security tooling |
| Judge | Acceptance and substantiation quality | journey acceptance evidence, seal readiness |

## In Scope

- Branch-first and PR-first enforcement in local and CI validation paths.
- Console information architecture: `/home`, `/run/:runId`, `/workflows`, `/skills`, `/genome`, `/reports`, `/settings`.
- Experience profiles and configuration precedence model.
- Workflow run and evidence contracts (run/stage/claim/evidence/attempt).
- Security and skill registry policy enforcement surfaces.
- Spec-driven acceptance tests for five core journeys.

## Out of Scope

- Multi-tenant remote cloud execution.
- IDE replacement behavior.
- Marketplace release packaging changes unrelated to v3.2.5 scope.

## Execution Sequence

1. Finalize governance and branch/PR enforcement checks.
2. Implement profile-driven UI foundation and route shell.
3. Integrate workflow run and evidence data contracts.
4. Implement permissions and skill registry policy surfaces.
5. Validate against journey acceptance + adversarial checks.
6. Substantiate with reproducible evidence bundle outputs.

## Gate Checklist

- [ ] GitHub governance checks fail invalid branch/merge paths.
- [ ] Guided profile produces first-win lane with minimal friction.
- [ ] Verified claims require evidence refs.
- [ ] Permission defaults deny `shell.exec` and `network.http`.
- [ ] Unpinned skill execution is blocked or explicit conditional consent path is logged.
- [ ] Headless parity for gate outcomes is demonstrated.

## PASS Criteria

- All v3.2.5 scoped backlog tasks are complete with linked evidence.
- `validate.ps1`, lint, compile, and reliability validators pass.
- Journey acceptance tests pass for P1-P5.
- Export bundles include required machine and human review outputs.
- Governance artifacts (`BACKLOG`, `META_LEDGER`, `SYSTEM_STATE`) remain consistent.

## Fail Conditions

- Branch/PR standards remain documentation-only without enforcement checks.
- Any verified claim exists without evidence.
- Acceptance criteria from console spec remain unmapped or untested.
- Profile behavior diverges from configuration precedence contract.
