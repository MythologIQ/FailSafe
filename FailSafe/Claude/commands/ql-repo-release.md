---
name: ql-repo-release
description: /ql-repo-release - Release Discipline Enforcement
---

# /ql-repo-release - Release Discipline Enforcement

<skill>
  <trigger>/ql-repo-release</trigger>
  <phase>RELEASE</phase>
  <persona>Governor</persona>
  <output>Version bump, CHANGELOG update, tag creation</output>
</skill>

## Purpose

Enforce consistent release discipline: semantic versioning, CHANGELOG updates, and git tags.

## Execution Protocol

### Step 1: Pre-Release Checks

```bash
# Current branch
git branch --show-current
```

IF on `main`:
- WARN: "Release should be prepared on a feature branch"
- PROMPT: "Create release branch? (recommended)"

```bash
# Check for uncommitted changes
git status --porcelain
```

IF uncommitted changes:
- ABORT: "Commit or stash changes before release"

### Step 2: Determine Current Version

```bash
cat package.json | jq -r '.version'
```

Store as `current_version`.

### Step 3: Prompt Version Bump

```markdown
Current version: [current_version]

Select bump type:
- [ ] MAJOR (breaking changes) -> [X+1].0.0
- [ ] MINOR (new features) -> [X].[Y+1].0
- [ ] PATCH (bug fixes) -> [X].[Y].[Z+1]
```

AWAIT user selection.
Calculate `new_version`.

### Step 4: Gather Changes Since Last Tag

```bash
git describe --tags --abbrev=0
git log [last_tag]..HEAD --oneline --no-merges
```

Categorize commits by prefix:
- `feat:` -> Added
- `fix:` -> Fixed
- `refactor:` / `chore:` -> Changed
- `docs:` -> Documentation

### Step 5: Update CHANGELOG.md

Prepend entry:
```markdown
## [new_version] - YYYY-MM-DD

### Added
- [feat commits]

### Changed
- [refactor/chore commits]

### Fixed
- [fix commits]
```

Stage: `git add CHANGELOG.md`

### Step 6: Update Version Files

```bash
npm version [new_version] --no-git-tag-version
git add package.json
```

### Step 7: Create Release Branch

```bash
git checkout -b release/v[new_version]
git commit -m "chore(release): prepare v[new_version]"
```

### Step 8: Tag Preparation (After Merge)

```bash
git checkout main
git pull
git tag -a v[new_version] -m "Release [new_version]"
git push origin v[new_version]
```

## Constraints

- **NEVER tag on feature branches**
- **CHANGELOG must be updated before tag**
- **Semantic versioning strictly enforced**
- **Never force push tags**
- **User owns merge decision**

---
_Audit: /ql-repo-audit | Seal: /ql-substantiate_
