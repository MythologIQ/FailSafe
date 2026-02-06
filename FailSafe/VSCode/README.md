# VSCode Copilot - Source

Extension source code for VSCode GitHub Copilot environment.

## Structure

```
VSCode/
├── prompts/              # Slash commands (.prompt.md files)
│   ├── ql-bootstrap.prompt.md
│   ├── ql-help.prompt.md
│   ├── ql-status.prompt.md
│   ├── ql-plan.prompt.md
│   ├── ql-audit.prompt.md
│   ├── ql-implement.prompt.md
│   ├── ql-refactor.prompt.md
│   ├── ql-validate.prompt.md
│   ├── ql-substantiate.prompt.md
│   └── ql-organize.prompt.md
│
├── agents/               # Custom agents (.agent.md files)
│   ├── ql-governor.agent.md      (pending)
│   ├── ql-judge.agent.md         (pending)
│   └── ql-specialist.agent.md    (pending)
│
└── instructions/         # Conditional instructions (.instructions.md)
    └── (none yet)
```

**Note**: Structure follows official VSCode Copilot documentation:

- Prompts in `prompts/` → deploy to `.github/prompts/`
- Agents in `agents/` → deploy to `.github/`
- Instructions in `instructions/` → deploy to `.github/instructions/`

## Constraints

**VSCode-Specific**:

- Prompt files: `.prompt.md` extension (slash commands)
- Agent files: `.agent.md` extension (custom agents)
- Instruction files: `.instructions.md` extension (conditional rules)
- YAML frontmatter required (name, description)

See: `../targets/VSCode/constraints.yml`

## Deployment

Built packages deploy to: `../PROD-Extension/VSCode/`

**Deployment paths**:

```powershell
# Prompts (slash commands)
Copy-Item prompts/*.prompt.md .github/prompts/

# Agents (custom AI agents)
Copy-Item agents/*.agent.md .github/

# Instructions (conditional rules)
Copy-Item instructions/*.instructions.md .github/instructions/
```

## Source Format

Files in this directory are **VSCode-native** format:

- `.prompt.md` for reusable prompts (invoked as `/ql-plan`)
- `.agent.md` for custom agent definitions
- `.instructions.md` for file-type specific rules

No transformation needed - these are ready for direct deployment to `.github/` directory.
