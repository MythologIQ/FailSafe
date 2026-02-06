# GitHub API Helper Reference

## Overview

Reference for GitHub API operations used by `/ql-repo-*` skills. Uses `gh` CLI which handles authentication automatically.

## Authentication

```bash
# Check if gh is authenticated
gh auth status
```

**Graceful Fallback**: If `gh` CLI is not available or not authenticated, skills should fall back to local-only operations.

## Community Profile

```bash
gh api repos/{owner}/{repo}/community/profile
gh api repos/{owner}/{repo}/community/profile --jq '.health_percentage'
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `health_percentage` | number | 0-100, GitHub's health score |
| `files.code_of_conduct` | object | `{url, html_url}` if detected |
| `files.contributing` | object | `{url, html_url}` if detected |
| `files.license` | object | `{spdx_id, url}` if detected |
| `files.readme` | object | `{url, html_url}` if detected |
| `files.security` | object | `{url, html_url}` if detected |

## Labels

```bash
gh label list
gh label create "bug" --description "Something isn't working" --color "d73a4a"
```

## Issues

```bash
gh issue create --title "[Bug] [blocker-id]" --body "[from BACKLOG.md]"
gh issue list --state open
gh issue close [number]
```

## Pull Requests

```bash
gh pr create --title "feat: description" --body "Details"
gh pr list
gh pr merge [number] --merge
```

## Releases

```bash
gh release create v[X.Y.Z] --generate-notes
gh release create v[X.Y.Z] --title "v[X.Y.Z]" --notes-file CHANGELOG.md
gh release list
```

## Error Handling

```bash
if gh auth status &>/dev/null; then
  HEALTH=$(gh api repos/{owner}/{repo}/community/profile --jq '.health_percentage')
else
  HEALTH="N/A (gh not authenticated)"
fi
```

---
_Used by: /ql-repo-audit, /ql-repo-scaffold, /ql-repo-release_
