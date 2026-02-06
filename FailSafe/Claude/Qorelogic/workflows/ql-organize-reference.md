---
name: ql-organize-reference
description: Archetype templates, privacy patterns, and indicator mapping for /ql-organize.
---

# /ql-organize - Reference Data

## Archetype Indicators

| Archetype          | Root Indicators              | Primary Source |
| ------------------ | ---------------------------- | -------------- |
| **node-app**       | `package.json`               | `src/`         |
| **python-package** | `pyproject.toml`, `setup.py` | `src/[pkg]/`   |
| **ai-workspace**   | `.agent/`, `META_LEDGER.md`  | `src/`         |

## Required Privacy Patterns (.gitignore)

```gitignore
# AI Governance
.agent/staging/
.claude/
.qorelogic/
.failsafe/

# Environment Tokens
.vsce-token
.ovsx-token
```

## Structure Templates

### Standard Application

```
/
|-- [AppContainer]/
|   |-- src/
|   |-- tests/
|   `-- build/
|-- docs/
|-- .agent/
|-- .claude/
|-- .qorelogic/
`-- .failsafe/
```
