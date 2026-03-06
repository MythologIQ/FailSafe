# File Movement Index

**Generated**: 2026-03-06T07:30:00Z
**Operation**: /ql-organize
**Total Files Moved**: 30
**Total Files Deleted**: 8

---

## Executive Summary

- **Plan files relocated**: 19 (root -> docs/Planning/)
- **Scripts relocated**: 2 (root -> scripts/)
- **Duplicate PNGs deleted**: 8 (root, copies already in src/roadmap/ui/)
- **Directories renamed**: 1 (docs/Deep Review -> docs/deep-review)
- **Directories protected**: 10

---

## Protected Directories

| Directory        | Rationale                                    |
| ---------------- | -------------------------------------------- |
| `.agent/`        | Managed governance staging area              |
| `.claude/`       | Claude Code agent configuration              |
| `.failsafe/`     | FailSafe runtime configuration               |
| `.qorelogic/`    | QoreLogic governance framework               |
| `.github/`       | GitHub workflows and templates               |
| `.vscode/`       | VS Code workspace settings                   |
| `FailSafe/`      | Extension source tree (app domain)           |
| `FailSafe-Pro/`  | Proprietary extension (gitignored)           |
| `PRIVATE/`       | Confidential strategy documents (gitignored) |
| `docs/`          | Existing doc structure (reorganized in-place)|

---

## File Movement Log

### Plans -> docs/Planning/

| # | File Name | Original Path | New Path | Type |
|---|-----------|---------------|----------|------|
| 1 | plan-audit-remediation-v1.md | `./` | `docs/Planning/` | .md |
| 2 | plan-audit-remediation-v2.md | `./` | `docs/Planning/` | .md |
| 3 | plan-brainstorm-fixes.md | `./` | `docs/Planning/` | .md |
| 4 | plan-command-center-fixes.md | `./` | `docs/Planning/` | .md |
| 5 | plan-command-center-polish.md | `./` | `docs/Planning/` | .md |
| 6 | plan-console-noise-fix.md | `./` | `docs/Planning/` | .md |
| 7 | plan-governance-gaps.md | `./` | `docs/Planning/` | .md |
| 8 | plan-governance-gaps-v2.md | `./` | `docs/Planning/` | .md |
| 9 | plan-governance-gaps-v3.md | `./` | `docs/Planning/` | .md |
| 10 | plan-unified-command-center.md | `./` | `docs/Planning/` | .md |
| 11 | plan-v4.2.0-the-answer.md | `./` | `docs/Planning/` | .md |
| 12 | plan-v4.2.0-the-answer-v2.md | `./` | `docs/Planning/` | .md |
| 13 | plan-v4.2.0-the-answer-v3.md | `./` | `docs/Planning/` | .md |
| 14 | plan-v430-veto-remediation.md | `./` | `docs/Planning/` | .md |
| 15 | plan-v4-3-2-performance-polish.md | `./` | `docs/Planning/` | .md |
| 16 | plan-v4-3-2-performance-polish-v2.md | `./` | `docs/Planning/` | .md |
| 17 | plan-v4-3-2-performance-polish-v3.md | `./` | `docs/Planning/` | .md |
| 18 | plan-voice-brainstorm.md | `./` | `docs/Planning/` | .md |
| 19 | plan-voice-brainstorm-v5.md | `./` | `docs/Planning/` | .md |

### Scripts -> scripts/

| # | File Name | Original Path | New Path | Type |
|---|-----------|---------------|----------|------|
| 1 | lock_manager.ps1 | `./` | `scripts/` | .ps1 |
| 2 | validate.ps1 | `./` | `scripts/` | .ps1 |

### Deleted (Duplicates)

| # | File Name | Original Path | Canonical Copy | Type |
|---|-----------|---------------|----------------|------|
| 1 | audit.png | `./` | `FailSafe/extension/src/roadmap/ui/audit.png` | .png |
| 2 | config.png | `./` | `FailSafe/extension/src/roadmap/ui/config.png` | .png |
| 3 | laws.png | `./` | `FailSafe/extension/src/roadmap/ui/laws.png` | .png |
| 4 | mindmap.png | `./` | `FailSafe/extension/src/roadmap/ui/mindmap.png` | .png |
| 5 | operations.png | `./` | `FailSafe/extension/src/roadmap/ui/operations.png` | .png |
| 6 | overview.png | `./` | `FailSafe/extension/src/roadmap/ui/overview.png` | .png |
| 7 | risks.png | `./` | `FailSafe/extension/src/roadmap/ui/risks.png` | .png |
| 8 | skills.png | `./` | `FailSafe/extension/src/roadmap/ui/skills.png` | .png |

### Directory Renames

| # | Original Path | New Path | Rationale |
|---|---------------|----------|-----------|
| 1 | `docs/Deep Review/` | `docs/deep-review/` | Normalize to kebab-case, eliminate spaces |

---

## Integrity Verification

- [x] All movements logged
- [x] No duplicate entries
- [x] All original paths documented
- [x] All new paths documented
- [x] Protected directories listed
- [x] Deletion rationale documented (canonical copies cited)

---

_This index provides complete traceability of all file movements during organization._
