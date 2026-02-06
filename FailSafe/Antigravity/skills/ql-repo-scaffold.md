# /ql-repo-scaffold - Generate Governance Scaffold

Generate missing repository governance files from templates. Detects project context (name, license, email) and substitutes variables. Never overwrites existing files. Always stages but never auto-commits.

## Quick Reference

**Trigger**: `/ql-repo-scaffold`
**Persona**: Specialist
**Output**: Created community files, staged for commit

## Generated Files

| File | Source |
|------|--------|
| CODE_OF_CONDUCT.md | Contributor Covenant template |
| CONTRIBUTING.md | Standard guide template |
| SECURITY.md | Security policy template |
| GOVERNANCE.md | Project governance template |
| .github/ISSUE_TEMPLATE/*.yml | Issue templates |
| .github/PULL_REQUEST_TEMPLATE.md | PR template |

## Variables

- `{{PROJECT_NAME}}` - From package.json or folder name
- `{{LICENSE_TYPE}}` - From LICENSE file
- `{{MAINTAINER_EMAIL}}` - From git config or package.json
- `{{YEAR}}` - Current year

## Next Steps

1. Review staged files: `git status`
2. Customize as needed
3. Commit: `git commit -m "docs: add community files"`
