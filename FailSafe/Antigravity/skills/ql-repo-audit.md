# /ql-repo-audit - Repository Governance Audit

Audit repository against GitHub Gold Standard. Check community files (README, LICENSE, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, GOVERNANCE, CHANGELOG), GitHub templates (issue templates, PR template), and README links. Uses `gh api repos/{owner}/{repo}/community/profile` for GitHub score. Read-only audit with gap report output.

## Quick Reference

**Trigger**: `/ql-repo-audit`
**Persona**: Judge
**Output**: Gap report with local score (X/12) and GitHub API score

## Files Checked

| Category | Files |
|----------|-------|
| Community | README.md, LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, GOVERNANCE.md, CHANGELOG.md |
| Templates | .github/ISSUE_TEMPLATE/*.yml, .github/PULL_REQUEST_TEMPLATE.md |
| README Links | Contributing, Security, Roadmap |

## Remediation

Run `/ql-repo-scaffold` to auto-generate missing files.
