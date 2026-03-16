# QoreLogic Skill Routing

## SHIELD Lifecycle Flow

S → H → I → E → L → D

| Phase | Primary Skill | Predecessor | Successor | Fallback |
|-------|--------------|-------------|-----------|----------|
| SECURE INTENT | `/ql-research` | (entry point) | `/ql-plan` | — |
| HYPOTHESIZE | `/ql-plan` | `/ql-research` | `/ql-audit` | — |
| INTERROGATE | `/ql-audit` | `/ql-plan` | `/ql-implement` (PASS) | Fix + re-audit (VETO) |
| EXECUTE | `/ql-implement` | `/ql-audit` PASS | `/ql-substantiate` | `/ql-debug` (on failure) |
| LOCK PROOF | `/ql-substantiate` | `/ql-implement` | `/ql-repo-release` | Fail → fix → re-substantiate |
| DELIVER | `/ql-repo-release` | `/ql-substantiate` | (cycle complete) | — |

## Support Skills (Any Phase)

| Skill | When to Suggest |
|-------|----------------|
| `/ql-status` | User is lost or resuming work |
| `/ql-validate` | Before handoff, after manual ledger edits |
| `/ql-compliance` | Before release, after restructuring |
| `/ql-organize` | Repository structure needs cleanup |
| `/ql-debug` | Implementation fails or produces unexpected results |
| `/ql-refactor` | Post-implementation maintenance |
| `/ql-repo-audit` | New workspace or governance gap suspected |
| `/ql-repo-scaffold` | Missing governance files detected |
| `/ql-document` | Release metadata authoring during `/ql-repo-release`, or standalone documentation |

## Proactive Suggestion Signals

Context-aware recommendations. An agent SHOULD suggest a skill when:

| Signal | Detected When | Suggest |
|--------|--------------|---------|
| No research brief | User says "new feature" and no `.failsafe/governance/RESEARCH_BRIEF.md` | `/ql-research` |
| Prior research exists | Topic matches an entry in `docs/research/INDEX.md` | Load prior brief before `/ql-research` |
| Plan exists, no audit | `plan-*.md` exists but no AUDIT_REPORT | `/ql-audit` |
| PASS verdict, no implementation | AUDIT_REPORT shows PASS, no impl ledger entry | `/ql-implement` |
| Implementation done, no seal | Impl entry exists, no SUBSTANTIATE entry | `/ql-substantiate` |
| Sealed, not released | SUBSTANTIATE entry exists, no DELIVER entry | `/ql-repo-release` |
| Chain unverified | Multiple sessions since last `/ql-validate` | `/ql-validate` |
| Files at repo root | Source files outside app container | `/ql-organize` |
