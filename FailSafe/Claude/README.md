# Claude CLI - Source

Extension source code for Claude CLI environment.

## Structure

```
Claude/
├── commands/             # v2.0.0 Governance skills (matches .claude/commands/)
│   ├── ql-repo-audit.md
│   ├── ql-repo-scaffold.md
│   ├── ql-repo-release.md
│   ├── agents/
│   │   ├── ql-technical-writer.md
│   │   └── ql-ux-evaluator.md
│   └── references/
│       └── github-api-helpers.md
│
├── Genesis/              # Bootstrap & initialization commands
│   ├── workflows/
│   │   ├── ql-bootstrap.md
│   │   ├── ql-help.md
│   │   └── ql-status.md
│   └── agents/
│       ├── ql-governor.md
│       ├── ql-judge.md
│       └── ql-specialist.md
│
├── Qorelogic/            # Core governance commands & agents
│   ├── workflows/
│   │   ├── ql-plan.md
│   │   ├── ql-audit.md
│   │   ├── ql-implement.md
│   │   ├── ql-refactor.md
│   │   ├── ql-validate.md
│   │   ├── ql-substantiate.md
│   │   └── ql-organize.md
│   └── agents/
│       ├── ql-governor-persona.md
│       ├── ql-judge-persona.md
│       └── ql-specialist-persona.md
│
└── Sentinel/             # Monitoring & enforcement
    └── workflows/
```

## Constraints

**Claude-Specific**:

- No description length limits
- XML-style skill tags supported
- `.md` file extension

See: `../targets/Claude/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/Claude/`

## Source Format

Files in this directory are **Claude-native** format (Markdown with XML skill tags).

No transformation needed - these are ready for direct deployment.
