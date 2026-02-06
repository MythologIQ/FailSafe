---
name: ql-repo-scaffold
description: /ql-repo-scaffold - Generate Governance Scaffold
---

# /ql-repo-scaffold - Generate Governance Scaffold

<skill>
  <trigger>/ql-repo-scaffold</trigger>
  <phase>IMPLEMENT</phase>
  <persona>Specialist</persona>
  <output>Created community files from templates</output>
</skill>

## Purpose

Generate missing repository governance files. Uses templates with variable substitution for project-specific values.

## Execution Protocol

### Step 1: Detect Project Context

```bash
# Project name
cat package.json | jq -r '.name' 2>/dev/null || basename $(pwd)

# License type
head -1 LICENSE 2>/dev/null | grep -oE '(MIT|Apache|GPL|BSD|ISC)' || echo "MIT"

# Maintainer email
git config user.email || cat package.json | jq -r '.author.email' 2>/dev/null

# Current year
date +%Y
```

Store as:
- `{{PROJECT_NAME}}`
- `{{LICENSE_TYPE}}`
- `{{MAINTAINER_EMAIL}}`
- `{{YEAR}}`

### Step 2: Run Audit First

```
Execute: /ql-repo-audit (internal)
Capture: List of MISSING files
```

IF no missing files:
- REPORT: "Repository already meets Gold Standard"
- DONE

### Step 3: Generate Missing Files

For each file marked MISSING, load template and substitute variables:

| Missing File | Template |
|--------------|----------|
| CODE_OF_CONDUCT.md | Contributor Covenant |
| CONTRIBUTING.md | Standard guide |
| SECURITY.md | Security policy |
| GOVERNANCE.md | Project governance |
| .github/ISSUE_TEMPLATE/*.yml | Issue templates |
| .github/PULL_REQUEST_TEMPLATE.md | PR template |

### Step 4: Stage Files

```bash
git add [created files]
```

### Step 5: Report

```markdown
## Scaffold Complete

**Project**: {{PROJECT_NAME}}
**License**: {{LICENSE_TYPE}}

### Files Created

| File | Path | Status |
|------|------|--------|
| [name] | [path] | Created & Staged |

### Next Steps

1. Review staged files: `git status`
2. Customize content as needed
3. Commit: `git commit -m "docs: add community governance files"`
4. Verify: `/ql-repo-audit`
```

## Constraints

- **NEVER overwrite existing files**
- **ALWAYS stage** (never auto-commit)
- **Template substitution must be idempotent**
- **User owns final review and commit**

---
_Audit first: /ql-repo-audit_
