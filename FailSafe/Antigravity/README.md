# Antigravity (Gemini) - Source

Extension source code for Gemini/Antigravity AI environment.

## Structure

```
Antigravity/
├── Genesis/              # Bootstrap & initialization workflows
│   ├── workflows/
│   │   ├── ql-bootstrap.md
│   │   ├── ql-help.md
│   │   └── ql-status.md
│   └── templates/
│
├── Qorelogic/            # Core governance workflows & agents
│   ├── workflows/
│   │   ├── ql-plan.md
│   │   ├── ql-audit.md
│   │   ├── ql-implement.md
│   │   ├── ql-refactor.md
│   │   ├── ql-validate.md
│   │   ├── ql-substantiate.md
│   │   └── ql-organize.md
│   ├── agents/
│   │   ├── ql-governor-persona.md
│   │   ├── ql-judge-persona.md
│   │   └── ql-specialist-persona.md
│   └── policies/
│
└── Sentinel/             # Monitoring & enforcement
    └── workflows/
```

## Constraints

**Antigravity-Specific**:

- Workflow descriptions ≤ 250 characters
- YAML frontmatter format
- `.md` file extension

See: `../targets/Antigravity/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/Antigravity/`

## Source Format

Files in this directory are **Antigravity-native** format (Markdown with YAML frontmatter, ≤250 char descriptions).

No transformation needed - these are ready for direct deployment.
