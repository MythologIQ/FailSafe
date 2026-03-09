# File Movement Index

**Generated**: 2026-03-09T22:00:00Z
**Updated**: 2026-03-09T19:00:00Z
**Operation**: /ql-organize (Session 2) + Repository Consolidation

---

## Executive Summary

- **Files reorganized**: 21
- **Files removed (consolidation)**: 175 (duplicate/redundant files)
- **Directories created**: 2
- **Directories protected**: 4 (reduced from 7)

---

## Repository Consolidation (2026-03-09)

The following folders were removed as part of repository consolidation to establish `.claude/` as the single source of truth for AI skills:

### Removed Folders

| Folder | Files Removed | Reason |
|--------|---------------|--------|
| `FailSafe/Antigravity/` | 20 | Duplicated `.claude/skills/` content |
| `FailSafe/VSCode/` | 127 | Outdated Copilot prompt format |
| `FailSafe/targets/` | 7 | Build system no longer uses constraints |
| `FailSafe/PROD-Extension/` | 42 | Build artifacts should be generated, not tracked |

### Removed Root Images

| File | Reason |
|------|--------|
| `FailSafe-AuditLog.PNG` | Duplicate of `FailSafe/extension/media/` |
| `FailSafe-Mindmap.png` | Duplicate |
| `FailSafe-Operations.PNG` | Duplicate |
| `FailSafe-Overview.PNG` | Duplicate |
| `FailSafe-Sidebar.PNG` | Duplicate |
| `FailSafe-Skills.png` | Duplicate |

---

## Protected Directories

| Directory | Rationale |
| --------- | --------- |
| `FailSafe/extension/` | VS Code extension source |
| `docs/` | Tracked governance documentation |
| `.claude/` | AI agent configuration (canonical location) |
| `.failsafe/` | Governance artifacts (gitignored) |

---

## Post-Consolidation Structure

```
FailSafe/
├── .claude/                    # AI skills & agents (CANONICAL)
│   ├── agents/
│   └── skills/
├── .failsafe/                  # Governance artifacts
├── docs/                       # Documentation
├── FailSafe/
│   ├── extension/              # VS Code extension source
│   │   ├── media/              # Images (single location)
│   │   └── src/                # TypeScript source
│   └── ScreenShots/            # Application screenshots
├── README.md                   # Single root README
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE
```

---

## Previous Organization Session

### Directory Creation Log

| Directory | Created At | Purpose |
| --------- | ---------- | ------- |
| `.failsafe/archive/completion-markers/` | 2026-03-09T22:00:00Z | Archive stale milestone markers |
| `.failsafe/archive/stale-configs/` | 2026-03-09T22:00:00Z | Archive misplaced config files |

### File Movement Log

#### Plans to `.failsafe/governance/plans/`

| # | File Name | Original Path | New Path |
| - | --------- | ------------- | -------- |
| 1 | plan-proprietary-skills-v1.md | `./` | `.failsafe/governance/plans/` |
| 2 | plan-workspace-isolation-v1.md | `./` | `.failsafe/governance/plans/` |

#### Completion Markers to `.failsafe/archive/`

7 stale completion markers archived from `docs/` to `.failsafe/archive/completion-markers/`

#### Duplicate Plan Files Removed

11 plan files removed from root (identical copies in `.failsafe/governance/plans/`)

---

## Remaining Root Files

### Standard Repository Files (tracked)
- `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `GOVERNANCE.md`, `FILE_INDEX.md`

### Configuration (tracked)
- `.gitignore`, `.gitattributes`, `.nvmrc`, `.socket.yml`, `socket.yml`

### Brand Assets (tracked)
- `icon.png`, `icon-bw.png`, `icon-pro.png`, `icon-pro-256.png`, `sidebar-icon.png`, `sidebar-icon.svg`

---

## Integrity Verification

- [x] All movements logged
- [x] Consolidation changes documented
- [x] Protected directories updated
- [x] Single source of truth established (`.claude/`)

---

_This index provides complete traceability of all file movements and consolidation._
