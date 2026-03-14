---
name: ql-help
description: >
  Command Summary
user-invocable: true
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

---
name: ql-help
description: Quick reference that summarizes the purpose and usage of all QoreLogic commands. Use when: (1) Need to understand available commands, (2) Unsure which command to use, or (3) Looking for command overview.
---

# /ql-help - Command Summary

<skill>
  <trigger>/ql-help</trigger>
  <phase>ANY</phase>
  <persona>Governor</persona>
  <output>Concise summary of available QoreLogic commands</output>
</skill>

## Quick Reference

| Command | Phase | Purpose |
|---------|-------|---------|
| `/ql-status` | ANY | Check lifecycle state and next action |
| `/ql-research` | SECURE INTENT | Investigate before planning |
| `/ql-plan` | HYPOTHESIZE | Create implementation plan |
| `/ql-audit` | INTERROGATE | Adversarial audit (PASS/VETO) |
| `/ql-implement` | EXECUTE | Build from audited plan |
| `/ql-substantiate` | LOCK PROOF | Verify and seal session |
| `/ql-repo-release` | DELIVER | Tag and push to pipeline |
| `/ql-debug` | ANY | Diagnose failures |
| `/ql-refactor` | EXECUTE | Post-implementation cleanup |
| `/ql-validate` | ANY | Verify Merkle chain integrity |
| `/ql-compliance` | ANY | Repository isolation audit |
| `/ql-organize` | ANY | Repository structure cleanup |
| `/ql-repo-audit` | ANY | Full governance audit |
| `/ql-repo-scaffold` | ANY | Generate missing governance files |
| `/ql-document` | ANY | Author verified technical documentation |

## Workflow Chains

**Standard feature**: `/ql-research` â†’ `/ql-plan` â†’ `/ql-audit` â†’ `/ql-implement` â†’ `/ql-substantiate` â†’ `/ql-repo-release`

**Quick fix (L1)**: `/ql-plan` â†’ `/ql-implement` â†’ `/ql-substantiate`

**Diagnostics**: `/ql-status` â†’ (routes to next action)

Full routing table: `.claude/commands/references/ql-skill-routing.md`


