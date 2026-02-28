---
name: ql-repo-release
description: /ql-repo-release - Release Discipline Enforcement
---

# /ql-repo-release - Release Discipline Enforcement

<skill>
  <trigger>/ql-repo-release</trigger>
  <phase>RELEASE</phase>
  <persona>Governor</persona>
  <output>Version bump, CHANGELOG update, artifact inspection, tag creation</output>
</skill>

## Purpose

Enforce consistent release discipline: semantic versioning, CHANGELOG updates, built-artifact inspection, and git tags.

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

### Step 7: Build Release Artifacts

```bash
cd FailSafe/build
./build-release.ps1
```

Expected outputs:
- `FailSafe/artifacts/mythologiq-failsafe-[new_version]-openvsx.vsix`
- `FailSafe/artifacts/mythologiq-failsafe-[new_version]-vscode.vsix`

### Step 8: Inspect Packaged Payloads Before Publish

Inspect the built VSIX files directly. Do not trust source README or package files alone.

```bash
tar -xOf FailSafe/artifacts/mythologiq-failsafe-[new_version]-openvsx.vsix extension/readme.md | head -60
tar -xOf FailSafe/artifacts/mythologiq-failsafe-[new_version]-openvsx.vsix extension.vsixmanifest | grep Description
tar -xOf FailSafe/artifacts/mythologiq-failsafe-[new_version]-vscode.vsix extension/readme.md | head -60
tar -xOf FailSafe/artifacts/mythologiq-failsafe-[new_version]-vscode.vsix extension.vsixmanifest | grep Description
```

Required verification:
- README header version matches `[new_version]`
- `What's New` content reflects the intended release scope
- manifest description matches current marketplace copy
- packaged payload reflects current repo state rather than a stale artifact

IF packaged README or manifest is stale:
- ABORT publish
- rebuild artifacts from current inputs
- re-inspect before continuing

### Step 9: Create Release Branch

```bash
git checkout -b release/v[new_version]
git commit -m "chore(release): prepare v[new_version]"
```

### Step 10: Tag Preparation (After Merge)

```bash
git checkout main
git pull
git tag -a v[new_version] -m "Release [new_version]"
git push origin v[new_version]
```

## Constraints

- **NEVER tag on feature branches**
- **CHANGELOG must be updated before tag**
- **Built artifacts must be inspected before publish**
- **Semantic versioning strictly enforced**
- **Never force push tags**
- **User owns merge decision**

## Hardening Note

Add deterministic packaging and publishing protections to `/ql-repo-release` or a future `/ql-deploy` workflow:

- verify artifact SHA-256 hashes before publish
- fail release if packaged `readme.md` or `extension.vsixmanifest` does not match expected version and marketplace copy
- publish only from freshly built artifacts, never from previously cached files in `FailSafe/artifacts/`
- record artifact hashes and inspected filenames in release evidence
- add marketplace post-publish verification so rendered listing content is checked against the uploaded artifact

---
_Audit: /ql-repo-audit | Seal: /ql-substantiate_
