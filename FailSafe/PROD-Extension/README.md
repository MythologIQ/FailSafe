# PROD-Extension

Production-ready deployment packages for each environment.

**⚠️ GENERATED DIRECTORY** — Do not edit files here directly.

## Contents

```
PROD-Extension/
├── Antigravity/    # Gemini deployment package
├── Claude/         # Claude CLI deployment package
└── VSCode/         # Copilot deployment package
```

## How Files Get Here

1. Author canonical source in `src/`
2. Run `.\build\transform.ps1`
3. Transformed files appear here

## Deployment

Each subdirectory is a complete, ready-to-deploy package:

```bash
# Antigravity
cp -r PROD-Extension/Antigravity/.agent/* ~/.agent/
cp -r PROD-Extension/Antigravity/.qorelogic/* ~/.qorelogic/

# Claude
cp -r PROD-Extension/Claude/.claude/* ~/.claude/

# VSCode
cp -r PROD-Extension/VSCode/.github/* .github/
```

Or use the environment-specific install scripts in each package.
