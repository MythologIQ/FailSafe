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
