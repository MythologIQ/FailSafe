# Project Governance

## Overview

FailSafe is maintained by MythologIQ. This document describes how the project is governed.

## Roles

### Maintainers

Maintainers have write access and are responsible for:
- Reviewing and merging pull requests
- Managing releases
- Enforcing code of conduct
- Setting project direction

### Contributors

Anyone who contributes code, documentation, or other improvements.

### Users

Anyone who uses the project and may report issues or request features.

## Decision Making

### Consensus

Most decisions are made through discussion and consensus:
1. Proposal raised in issue or discussion
2. Community feedback gathered
3. Maintainers make final decision

### Voting

For significant changes:
- Maintainers vote
- Simple majority required
- Voting period: 1 week minimum

## Contributions

All contributions follow the process in [CONTRIBUTING.md](CONTRIBUTING.md).

## Branch and Merge Standards

FailSafe enforces branch-first and PR-first development:

- Allowed branch taxonomy:
  - `plan/*`
  - `feat/*`
  - `fix/*`
  - `release/*`
  - `hotfix/*`
- Protected branch rule:
  - `main` is protected and should not receive direct implementation commits in normal flow.
- Merge rule:
  - changes to protected branches must go through pull requests with required checks.
- Evidence rule:
  - PRs must include reliability and validation evidence when applicable.

Validation entrypoints:

- `powershell -File tools/reliability/validate-branch-policy.ps1`
- `powershell -File validate.ps1 -SkipContainerValidation`

## QoreLogic A.E.G.I.S. Governance

This project uses QoreLogic A.E.G.I.S. for AI-assisted development governance:

| Phase | Command | Description |
|-------|---------|-------------|
| ALIGN/ENCODE | `/ql-bootstrap` | Initialize project DNA |
| PLAN | `/ql-plan` | Create implementation plans |
| GATE | `/ql-audit` | Adversarial audit |
| IMPLEMENT | `/ql-implement` | Build with Section 4 Razor |
| SUBSTANTIATE | `/ql-substantiate` | Verify and seal |

All changes to security-critical components (L3) require mandatory audit.

## Releases

- Semantic versioning (MAJOR.MINOR.PATCH)
- Release notes in CHANGELOG.md
- Maintainers approve releases
- Tags created only on main after merge

## Amendments

This governance model may be amended by maintainer consensus.

---
_Last updated: 2026_
