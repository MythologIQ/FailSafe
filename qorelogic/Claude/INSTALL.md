# QoreLogic A.E.G.I.S. Installation Guide for Claude Code

## Prerequisites

- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code` or similar)
- A project directory where you want to apply the framework

## Installation Methods

### Method 1: Copy to Project (Recommended)

```bash
# Navigate to your project root
cd /path/to/your/project

# Create the .claude directory if it doesn't exist
mkdir -p .claude

# Copy the QoreLogic framework
cp -r /path/to/Q-DNA/.qorelogic/claude/* .claude/
```

### Method 2: Symlink (For Multiple Projects)

```bash
# Create a symlink in your project
ln -s /path/to/Q-DNA/.qorelogic/claude .claude/qorelogic
```

### Method 3: Global Installation

For use across all projects, add to your Claude Code global configuration:

```bash
# Copy to Claude Code's global config directory
# Location varies by OS - check Claude Code documentation
cp -r /path/to/Q-DNA/.qorelogic/claude ~/.claude-code/qorelogic/
```

## Configuration

### 1. Register Subagents

Add to your `.claude/settings.json` or global settings:

```json
{
  "subagents": {
    "ql-governor": ".claude/subagents/ql-governor.md",
    "ql-judge": ".claude/subagents/ql-judge.md",
    "ql-specialist": ".claude/subagents/ql-specialist.md"
  }
}
```

### 2. Register Skills (Slash Commands)

```json
{
  "skills": {
    "ql-bootstrap": ".claude/skills/ql-bootstrap.md",
    "ql-status": ".claude/skills/ql-status.md",
    "ql-audit": ".claude/skills/ql-audit.md",
    "ql-implement": ".claude/skills/ql-implement.md",
    "ql-refactor": ".claude/skills/ql-refactor.md",
    "ql-validate": ".claude/skills/ql-validate.md",
    "ql-substantiate": ".claude/skills/ql-substantiate.md"
  }
}
```

### 3. Configure Hooks (Optional but Recommended)

Hooks provide automated enforcement. Add to settings:

```json
{
  "hooks": {
    "PreToolUse": {
      "Write": [".claude/hooks/kiss-razor-gate.json", ".claude/hooks/orphan-detection.json"],
      "Edit": [".claude/hooks/kiss-razor-gate.json", ".claude/hooks/security-path-alert.json"]
    },
    "PostToolUse": {
      "Read": [".claude/hooks/cognitive-reset.json"]
    },
    "Stop": [".claude/hooks/session-seal.json"]
  }
}
```

**Note**: Hook execution depends on Claude Code's hook support. If hooks aren't available in your version, use the skills manually.

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
your-project/
├── .claude/                      # Claude Code configuration
│   ├── settings.json            # Your Claude Code settings
│   ├── subagents/               # QoreLogic personas
│   │   ├── ql-governor.md
│   │   ├── ql-judge.md
│   │   └── ql-specialist.md
│   ├── skills/                  # Slash commands
│   │   ├── ql-bootstrap.md
│   │   ├── ql-status.md
│   │   ├── ql-audit.md
│   │   ├── ql-implement.md
│   │   ├── ql-refactor.md
│   │   ├── ql-validate.md
│   │   └── ql-substantiate.md
│   ├── hooks/                   # Automated enforcement
│   │   ├── kiss-razor-gate.json
│   │   ├── security-path-alert.json
│   │   ├── session-seal.json
│   │   ├── cognitive-reset.json
│   │   └── orphan-detection.json
│   └── templates/               # Document templates
│       ├── CONCEPT.md
│       ├── ARCHITECTURE_PLAN.md
│       ├── META_LEDGER.md
│       ├── SYSTEM_STATE.md
│       └── SHADOW_GENOME.md
├── .agent/                      # Runtime artifacts (created by /ql-bootstrap)
│   └── staging/
│       └── AUDIT_REPORT.md
├── docs/                        # Project documentation (created by /ql-bootstrap)
│   ├── CONCEPT.md
│   ├── ARCHITECTURE_PLAN.md
│   ├── META_LEDGER.md
│   ├── SYSTEM_STATE.md
│   └── SHADOW_GENOME.md
└── src/                         # Your source code
```

## Troubleshooting

### "Skill not found" Error

Ensure skills are registered in `.claude/settings.json` and paths are correct.

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
cp -r /path/to/new-Q-DNA/.qorelogic/claude/* .claude/

# Restore customizations
# (manually merge settings if needed)
```

## Uninstallation

To remove QoreLogic from a project:

```bash
# Remove Claude Code integration
rm -rf .claude/subagents/ql-*.md
rm -rf .claude/skills/ql-*.md
rm -rf .claude/hooks/*.json
rm -rf .claude/templates/

# Optionally remove project DNA (preserves history)
# WARNING: This removes traceability
rm -rf docs/META_LEDGER.md docs/CONCEPT.md docs/ARCHITECTURE_PLAN.md
rm -rf docs/SYSTEM_STATE.md docs/SHADOW_GENOME.md
rm -rf .agent/
```

---

## Support

For issues or questions:
1. Check the [MERKLE_ITERATION_GUIDE.md](docs/MERKLE_ITERATION_GUIDE.md)
2. Review the [README.md](README.md)
3. Run `/ql-status` for diagnostic information
