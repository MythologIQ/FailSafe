# FailSafe - AI Governance Extension

**Physical Isolation**: This directory contains **100% application/extension code**. Workspace governance operates at the parent level.

---

## Structure

```
FailSafe/                           # 🔒 APP CONTAINER
├── Antigravity/                    # Gemini/Antigravity source
│   ├── Genesis/                    # Bootstrap & initialization
│   ├── Qorelogic/                  # Core governance
│   └── Sentinel/                   # Monitoring & enforcement
│
├── Claude/                         # Claude CLI source
│   ├── Genesis/
│   ├── Qorelogic/
│   └── Sentinel/
│
├── VSCode/                         # VSCode Copilot source
│   ├── Genesis/
│   ├── Qorelogic/
│   └── Sentinel/
│
├── ROAD/                           # Universal/shared
│   ├── visuals/                    # UI assets, diagrams
│   ├── scripts/                    # Cross-environment utilities
│   └── schemas/                    # Shared data schemas
│
├── PROD-Extension/                 # Production packages
│   ├── Antigravity/
│   ├── Claude/
│   └── VSCode/
│
├── build/                          # Build & validation scripts
├── targets/                        # Environment constraints
└── docs/                           # App-specific documentation

```

---

## Isolation Principle

### Workspace Level (Parent Directory)

```
G:\MythologIQ\FailSafe\            # WORKSPACE ROOT
├── .agent/                         # Active workspace workflows
├── .claude/                        # Active workspace commands
├── .qorelogic/                     # Workspace configuration
└── docs/                           # Workspace governance
    ├── META_LEDGER.md
    ├── SYSTEM_STATE.md
    ├── CONCEPT.md
    └── ARCHITECTURE_PLAN.md
```

**Purpose**: Governance, session state, active AI instructions

### App Level (This Directory)

```
G:\MythologIQ\FailSafe\FailSafe\   # APP CONTAINER
├── Antigravity/                    # Extension source for Gemini
├── Claude/                         # Extension source for Claude
├── VSCode/                         # Extension source for VSCode
└── [build infrastructure]
```

**Purpose**: Extension development, source code, build artifacts

---

## Key Benefits

✅ **Zero Confusion**: Workspace operations cannot accidentally touch app code  
✅ **Physical Boundary**: Different directory trees = different concerns  
✅ **Clear Gitignore**: Public repos can exclude `FailSafe/` entirely  
✅ **Mental Model**: "Am I in FailSafe/? Then I'm doing app development."

---

## Build & Deployment Pipeline

### Three Variants, Three Destinations

| Variant | Source | Artifact | Destination |
|---------|--------|----------|-------------|
| **Antigravity** | `FailSafe/Antigravity/` | `.vsix` | [OpenVSX](https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe-antigravity) |
| **Claude** | `FailSafe/Claude/` | `.zip` | [GitHub Releases](https://github.com/MythologIQ/FailSafe) |
| **VSCode** | `FailSafe/VSCode/` | `.vsix` | [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe) |

### Pipeline Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. SOURCE                    2. DEPLOY                   3. BUILD          │
│  ────────                     ────────                    ───────           │
│                                                                             │
│  FailSafe/Antigravity/  ──►  PROD-Extension/Antigravity/  ──►  .vsix       │
│  FailSafe/Claude/       ──►  PROD-Extension/Claude/       ──►  .zip        │
│  FailSafe/VSCode/       ──►  PROD-Extension/VSCode/       ──►  .vsix       │
│                                                                             │
│  (Environment-specific       (Deployment-ready             (Publishable    │
│   source code)                folder structure)             artifacts)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Edit Source Files

Source files organized by AI environment:

```
FailSafe/Antigravity/           # For Gemini/Cursor (Antigravity extension)
├── Genesis/workflows/          # ql-bootstrap.md, ql-status.md, ql-help.md
├── Genesis/agents/             # ql-governor.md, ql-judge.md, ql-specialist.md
├── Qorelogic/workflows/        # ql-audit.md, ql-plan.md, ql-implement.md, etc.
└── skills/                     # SKILL.md files

FailSafe/Claude/                # For Claude CLI
├── Genesis/workflows/          # Same structure, Claude format
├── Genesis/agents/
├── Qorelogic/workflows/
└── commands/                   # ql-repo-*.md, agents/, references/

FailSafe/VSCode/                # For VSCode Copilot
├── prompts/                    # *.prompt.md files
├── agents/                     # *.agent.md files
├── instructions/               # *.instructions.md files
└── skills/                     # SKILL.md files
```

### Step 2: Deploy to PROD-Extension

```powershell
cd FailSafe/build
.\deploy.ps1                    # Copies sources to deployment structure
```

This transforms source files into the folder structure each environment expects:

```
PROD-Extension/Antigravity/     # .agent/workflows/, .qorelogic/orbits/
PROD-Extension/Claude/          # .claude/commands/
PROD-Extension/VSCode/          # .github/prompts/, .github/copilot-instructions/
```

### Step 3: Build Artifacts

```powershell
cd FailSafe/build
.\build-release.ps1             # Creates publishable artifacts
```

Output in `FailSafe/artifacts/`:

```
mythologiq-failsafe-antigravity-X.X.X.vsix    # → OpenVSX
failsafe-claude-vX.X.X.zip                     # → GitHub
mythologiq-failsafe-X.X.X.vsix                 # → VSCode Marketplace
```

### Step 4: Publish

```powershell
# Antigravity → OpenVSX
npx ovsx publish artifacts/mythologiq-failsafe-antigravity-X.X.X.vsix -p $OVSX_TOKEN

# VSCode → VSCode Marketplace
npx vsce publish --packagePath artifacts/mythologiq-failsafe-X.X.X.vsix --pat $VSCE_TOKEN

# Claude → Manual upload to GitHub releases (linked in main README.md)
```

---

## Development Workflows

### Working on Extension

```bash
cd FailSafe/
# Now in app container - edit Antigravity/, Claude/, VSCode/ source
```

### Using QoreLogic Governance

```bash
cd ..  # Back to workspace root
/ql-bootstrap
/ql-plan
/ql-implement
# Governance operates at workspace level, never enters FailSafe/
```

---

## Migration Status

**Old Structure**:

- `src/` → Moved to `FailSafe/_CANONICAL_SOURCE_OLD/`
- `qorelogic/` → Moved to `FailSafe/_STAGING_OLD/`

**New Structure**:

- Environment-specific source in `Antigravity/`, `Claude/`, `VSCode/`
- Each environment has Genesis, Qorelogic, Sentinel modules

---

_This container ensures complete physical isolation between workspace governance and application development._
