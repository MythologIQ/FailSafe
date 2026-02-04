# QoreLogic A.E.G.I.S. Installation Guide for Claude Code

## Prerequisites

- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code` or similar)
- A project directory where you want to apply the framework

## Drop-In Bundle Layout

Copy the `qorelogic/Claude/.claude/` folder into your workspace as `.claude/`. The bundle mirrors the workspace layout and is safe to drop in as-is:

```
qorelogic/Claude/
|-- .claude/
|   |-- agents/
|   |   `-- .gitkeep
|   |-- improvements/
|   |   `-- .gitkeep
|   |-- hooks/
|   |   |-- cognitive-reset.json
|   |   |-- kiss-razor-gate.json
|   |   |-- orphan-detection.json
|   |   |-- security-path-alert.json
|   |   `-- session-seal.json
|   |-- commands/
|   |   |-- agents/
|   |   |   |-- ql-governor.md
|   |   |   |-- ql-judge.md
|   |   |   `-- ql-specialist.md
|   |   |-- references/
|   |   |   |-- ql-implement-patterns.md
|   |   |   |-- ql-refactor-examples.md
|   |   |   |-- ql-substantiate-templates.md
|   |   |   `-- ql-validate-reports.md
|   |   |-- scripts/
|   |   |   |-- calculate-session-seal.py
|   |   |   |-- install.py
|   |   |   `-- validate-ledger.py
|   |   |-- ql-audit.md
|   |   |-- ql-bootstrap.md
|   |   |-- ql-governor-persona.md
|   |   |-- ql-help.md
|   |   |-- ql-implement.md
|   |   |-- ql-judge-persona.md
|   |   |-- ql-organize.md
|   |   |-- ql-plan.md
|   |   |-- ql-refactor.md
|   |   |-- ql-specialist-persona.md
|   |   |-- ql-status.md
|   |   |-- ql-substantiate.md
|   |   `-- ql-validate.md
|   |-- templates/
|   |   |-- ARCHITECTURE_PLAN.md
|   |   |-- CLAUDE.md.tpl
|   |   |-- CONCEPT.md
|   |   |-- META_LEDGER.md
|   |   |-- SHADOW_GENOME.md
|   |   `-- SYSTEM_STATE.md
|   |-- docs/
|   |   |-- AEGIS_SELF_AUDIT.md
|   |   `-- MERKLE_ITERATION_GUIDE.md
|   `-- README.md
|-- INSTALL.md
`-- manifest.json
```

## Quick Install (Recommended)

Run the installer from any workspace inside FailSafe. It will locate the bundle,
copy it to your workspace, and register skills, hooks, and subagents in
`settings.json` automatically.

Workspace-local install is the default and recommended. Use `--user` only if you explicitly want a global config.

### macOS / Linux / Windows (Python)

```bash
python qorelogic/Claude/.claude/commands/scripts/install.py
```

This installs to `.claude/` in your current workspace (project-local), which is
the recommended default for quick agent lookup and workspace-specific configuration.

### User-Level Install (Optional)

```bash
python qorelogic/Claude/.claude/commands/scripts/install.py --user
```

**What it does**:

- Finds the FailSafe root automatically (no manual path edits)
- Copies `qorelogic/Claude/.claude/` into `.claude/` (or `~/.claude/` with `--user`)
- Merges skills, hooks, and subagents into `settings.json` without removing existing entries
- Writes a backup to `settings.json.bak` if `settings.json` already exists

---

## Installation Methods (Manual)

Claude Code can use either **workspace-local** or **user-level** config folders. The recommended approach is to install QoreLogic into your **workspace** (`.claude/`) for quick agent lookup and project-specific configuration.

### Method 1: Workspace-Local Install (Recommended)

#### macOS / Linux

```bash
# Create workspace config directory
mkdir -p .claude

# Copy the QoreLogic framework into workspace
cp -r /path/to/FailSafe/qorelogic/Claude/.claude/* .claude/
```

#### Windows (PowerShell)

```powershell
# Create workspace config directory
New-Item -ItemType Directory -Force ".claude" | Out-Null

# Copy the QoreLogic framework into workspace
Copy-Item -Recurse -Force "C:\\path\\to\\FailSafe\\qorelogic\\Claude\\.claude\\*" ".claude\\"
```

### Method 2: User-Level Install (Optional)

If you prefer a global installation across all projects:

#### macOS / Linux

```bash
# Create user config directory
mkdir -p ~/.claude

# Copy the QoreLogic framework into user config
cp -r /path/to/FailSafe/qorelogic/Claude/.claude/* ~/.claude/
```

#### Windows (PowerShell)

```powershell
# Create user config directory
New-Item -ItemType Directory -Force "$env:USERPROFILE\\.claude" | Out-Null

# Copy the QoreLogic framework into user config
Copy-Item -Recurse -Force "C:\\path\\to\\FailSafe\\qorelogic\\Claude\\*" "$env:USERPROFILE\\.claude\\"
```

### Method 3: Project Link (Legacy)

If you have a user-level install and want to link it to your project:

```bash
# From your project root, link to user config
ln -s ~/.claude .claude
```

Windows (PowerShell):

```powershell
# Creates a directory junction to your user config
New-Item -ItemType Junction -Path ".claude" -Target "$env:USERPROFILE\\.claude" | Out-Null
```

## Configuration (Manual Only)

### 1. Register Subagents

Add to your workspace `.claude/settings.json` (or `~/.claude/settings.json` for user-level install on Windows: `%USERPROFILE%\\.claude\\settings.json`):

```json
{
  "subagents": {
    "ql-governor": "commands/agents/ql-governor.md",
    "ql-judge": "commands/agents/ql-judge.md",
    "ql-specialist": "commands/agents/ql-specialist.md"
  }
}
```

If you are using a **user-level** `~/.claude/` instead of the workspace, paths remain as shown above (no prefix needed).

### 2. Register Skills (Slash Commands)

```json
{
  "skills": {
    "ql-bootstrap": "commands/ql-bootstrap.md",
    "ql-governor-persona": "commands/ql-governor-persona.md",
    "ql-status": "commands/ql-status.md",
    "ql-audit": "commands/ql-audit.md",
    "ql-help": "commands/ql-help.md",
    "ql-implement": "commands/ql-implement.md",
    "ql-judge-persona": "commands/ql-judge-persona.md",
    "ql-organize": "commands/ql-organize.md",
    "ql-plan": "commands/ql-plan.md",
    "ql-refactor": "commands/ql-refactor.md",
    "ql-specialist-persona": "commands/ql-specialist-persona.md",
    "ql-validate": "commands/ql-validate.md",
    "ql-substantiate": "commands/ql-substantiate.md"
  }
}
```

### 3. Configure Hooks (Optional but Recommended)

Hooks provide automated enforcement. Add to settings:

```json
{
  "hooks": {
    "PreToolUse": {
      "Write": ["hooks/kiss-razor-gate.json", "hooks/orphan-detection.json"],
      "Edit": ["hooks/kiss-razor-gate.json", "hooks/security-path-alert.json"]
    },
    "PostToolUse": {
      "Read": ["hooks/cognitive-reset.json"]
    },
    "Stop": ["hooks/session-seal.json"]
  }
}
```

**Note**: Hook execution depends on Claude Code's hook support. If hooks aren't available in your version, use the skills manually.

## Context Hygiene Policy

We do **not** delete standard folders (e.g., `todo/`, `scratch/`, `inbox/`) during installation or organization. Default behavior is:

- **Do not delete** context-heavy folders.
- **Do not surface** them in outputs or suggested move lists unless explicitly authorized.
- If cleanup is needed, **quarantine** to `Archive/` or `Documents/` only with user approval.

## Other Components (Optional)

Claude Code does not require a daemon or separate installer for core QoreLogic behavior. The drop-in files above are sufficient.

If you want enforcement beyond Claude Code (for example, VS Code or Cursor):

- Use the standard extension installation flow for your editor.
- See `qorelogic/VSCode/.failsafe/config/README.md` for the Sentinel Daemon and Trust Engine details if you choose to enable them.
- For full platform setup beyond Claude Code, see the root `README.md`.

## Verification

After installation, verify everything is working:

```bash
# In Claude Code, run:
/ql-status
```

You should see:

```
Status: UNINITIALIZED
No QoreLogic DNA detected in this project.
Directive: Run /ql-bootstrap to initialize the A.E.G.I.S. lifecycle.
```

## Quick Start

### Initialize a New Project

```bash
# Start Claude Code in your project
claude

# Initialize QoreLogic DNA
/ql-bootstrap

# Follow the prompts to define:
# - One-sentence "Why"
# - Three "Vibe" keywords
# - File tree (blueprint)
# - Risk grade (L1/L2/L3)
```

### Standard Workflow

```bash
# 1. Check current status
/ql-status

# 1a. View command summary
/ql-help

# 2. For L2/L3 changes, run audit first
/ql-audit

# 3. Implement with KISS enforcement
/ql-implement

# 4. Refactor if needed
/ql-refactor src/some-file.ts

# 5. Validate Merkle chain
/ql-validate

# 6. Seal the session
/ql-substantiate
```

## Directory Structure After Installation

```
Project (workspace-local install - recommended):
your-project/
|-- .claude/                     # Claude Code configuration (workspace-local)
|   |-- settings.json            # Your Claude Code settings
|   |-- commands/                # Slash commands (skills)
|   |   |-- agents/              # QoreLogic personas
|   |   |   |-- ql-governor.md
|   |   |   |-- ql-judge.md
|   |   |   `-- ql-specialist.md
|   |   |-- references/          # Supporting patterns/templates
|   |   |-- scripts/             # Python utilities
|   |   |-- ql-bootstrap.md
|   |   |-- ql-help.md
|   |   |-- ql-status.md
|   |   |-- ql-audit.md
|   |   |-- ql-implement.md
|   |   |-- ql-organize.md
|   |   |-- ql-plan.md
|   |   |-- ql-refactor.md
|   |   |-- ql-validate.md
|   |   `-- ql-substantiate.md
|   |-- hooks/                   # Automated enforcement
|   |   |-- kiss-razor-gate.json
|   |   |-- security-path-alert.json
|   |   |-- session-seal.json
|   |   |-- cognitive-reset.json
|   |   `-- orphan-detection.json
|   |-- agents/                  # General agent definitions
|   |-- docs/                    # Framework documentation
|   |-- improvements/            # Improvement tracking
|   `-- templates/               # Document templates
|       |-- CONCEPT.md
|       |-- ARCHITECTURE_PLAN.md
|       |-- META_LEDGER.md
|       |-- SYSTEM_STATE.md
|       `-- SHADOW_GENOME.md
|-- .agent/                      # Runtime artifacts (created by /ql-bootstrap)
|   `-- staging/
|       `-- AUDIT_REPORT.md
|-- docs/                        # Project documentation (created by /ql-bootstrap)
|   |-- CONCEPT.md
|   |-- ARCHITECTURE_PLAN.md
|   |-- META_LEDGER.md
|   |-- SYSTEM_STATE.md
|   `-- SHADOW_GENOME.md
`-- src/                         # Your source code

User profile (user-level install - optional):
~/.claude/                       # Claude Code configuration (user-level)
|-- settings.json                # Your Claude Code settings
|-- commands/                    # Slash commands (skills)
|   |-- agents/                  # QoreLogic personas
|   |   |-- ql-governor.md
|   |   |-- ql-judge.md
|   |   `-- ql-specialist.md
|   |-- references/
|   |-- scripts/
|   |-- ql-bootstrap.md
|   |-- ql-help.md
|   |-- ql-status.md
|   |-- ql-audit.md
|   |-- ql-implement.md
|   |-- ql-organize.md
|   |-- ql-plan.md
|   |-- ql-refactor.md
|   |-- ql-validate.md
|   `-- ql-substantiate.md
|-- hooks/                       # Automated enforcement
|   |-- kiss-razor-gate.json
|   |-- security-path-alert.json
|   |-- session-seal.json
|   |-- cognitive-reset.json
|   `-- orphan-detection.json
|-- agents/                      # General agent definitions
|-- docs/                        # Framework documentation
|-- improvements/                # Improvement tracking
`-- templates/                   # Document templates
    |-- CONCEPT.md
    |-- ARCHITECTURE_PLAN.md
    |-- META_LEDGER.md
    |-- SYSTEM_STATE.md
    `-- SHADOW_GENOME.md
```

## Troubleshooting

### "Skill not found" Error

Ensure skills are registered in `.claude/settings.json` (or `~/.claude/settings.json` for user-level install on Windows: `%USERPROFILE%\\.claude\\settings.json`) and paths are correct.

### "Chain broken" Error

Run `/ql-validate` to identify the break point. See `docs/MERKLE_ITERATION_GUIDE.md` for recovery options.

### Hooks Not Triggering

- Verify Claude Code version supports hooks
- Check hook file paths in settings
- Hooks may require specific Claude Code configurations

### "Gate locked" Error

Run `/ql-audit` to generate a PASS verdict before implementation.

## Upgrading

To upgrade to a newer version:

```bash
# Backup your project-specific customizations
cp .claude/settings.json .claude/settings.backup.json

# Copy new version
cp -r /path/to/new-FailSafe/qorelogic/Claude/.claude/* .claude/

# Restore customizations
# (manually merge settings if needed)
```

For user-level installs, replace `.claude/` with `~/.claude/` in the paths above.

## Uninstallation

To remove QoreLogic from a project:

```bash
# Remove Claude Code integration (workspace-local)
rm -rf .claude/commands/ql-*.md
rm -rf .claude/commands/agents/ql-*.md
rm -rf .claude/hooks/*.json
rm -rf .claude/templates/

# Optionally remove project DNA (preserves history)
# WARNING: This removes traceability
rm -rf docs/META_LEDGER.md docs/CONCEPT.md docs/ARCHITECTURE_PLAN.md
rm -rf docs/SYSTEM_STATE.md docs/SHADOW_GENOME.md
rm -rf .agent/
```

For user-level installs, replace `.claude/` with `~/.claude/` in the paths above.

---

## Support

For issues or questions:

1. Check the [MERKLE_ITERATION_GUIDE.md](docs/MERKLE_ITERATION_GUIDE.md)
2. Review the [README.md](README.md)
3. Run `/ql-status` for diagnostic information
