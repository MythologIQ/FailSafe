# QoreLogic A.E.G.I.S. Installation Guide for Antigravity

## Prerequisites

- Antigravity AI platform access
- A project workspace where you want to apply the framework

## Installation Methods

### Method 1: Copy to Workspace (Recommended)

```bash
# Navigate to your workspace root
cd /path/to/your/workspace

# Create the QoreLogic directory
mkdir -p .qorelogic

# Copy the Antigravity framework
cp -r /path/to/Q-DNA/.qorelogic/Antigravity/* .qorelogic/
```

### Method 2: Reference from Central Location

Configure Antigravity to reference the framework from a central location:

```yaml
# In your workspace configuration
qorelogic:
  framework_path: /path/to/Q-DNA/.qorelogic/Antigravity
  auto_load: true
```

## Configuration

### 1. Register Orbits

Configure your Antigravity workspace to recognize QoreLogic orbits:

```yaml
# workspace.yaml or antigravity.config.yaml
orbits:
  ql-governor:
    config: .qorelogic/orbits/orbit-governor.json
    auto_activate: false

  ql-judge:
    config: .qorelogic/orbits/orbit-judge.json
    auto_activate: false

  ql-specialist:
    config: .qorelogic/orbits/orbit-specialist.json
    auto_activate: false

  ql-sentinel:
    config: .qorelogic/orbits/orbit-sentinel.json
    auto_activate: true  # Always watching
```

### 2. Register Workflows

```yaml
# workspace.yaml
workflows:
  aegis-bootstrap:
    path: .qorelogic/workflows/aegis-bootstrap.yaml
    command: "/aegis-bootstrap"

  aegis-status:
    path: .qorelogic/workflows/aegis-status.yaml
    command: "/aegis-status"

  aegis-gate:
    path: .qorelogic/workflows/aegis-gate.yaml
    command: "/aegis-gate"

  aegis-implement:
    path: .qorelogic/workflows/aegis-implement.yaml
    command: "/aegis-implement"

  aegis-refactor:
    path: .qorelogic/workflows/aegis-refactor.yaml
    command: "/aegis-refactor"

  aegis-validate:
    path: .qorelogic/workflows/aegis-validate.yaml
    command: "/aegis-validate"

  aegis-substantiate:
    path: .qorelogic/workflows/aegis-substantiate.yaml
    command: "/aegis-substantiate"

  aegis-triage:
    path: .qorelogic/workflows/aegis-triage.yaml
    command: "/aegis-triage"
    auto_trigger: true  # Route all requests through triage
```

### 3. Register Policies

```yaml
# workspace.yaml
policies:
  - path: .qorelogic/policies/kiss-razor.yaml
    enabled: true
    priority: 1

  - path: .qorelogic/policies/security-gate.yaml
    enabled: true
    priority: 0  # Highest priority

  - path: .qorelogic/policies/merkle-integrity.yaml
    enabled: true
    priority: 2

  - path: .qorelogic/policies/orphan-detection.yaml
    enabled: true
    priority: 3

  - path: .qorelogic/policies/cognitive-budget.yaml
    enabled: true
    priority: 4
```

## Verification

After installation, verify everything is working:

```bash
# In Antigravity, run:
/aegis-status
```

Expected output:
```
Status: UNINITIALIZED
No QoreLogic DNA detected in this workspace.
Directive: Run /aegis-bootstrap to initialize the A.E.G.I.S. lifecycle.
```

## Quick Start

### Initialize a New Project

```yaml
# Run the bootstrap workflow
/aegis-bootstrap

# You'll be prompted for:
# - One-sentence "Why"
# - Three "Vibe" keywords
# - File tree (blueprint)
# - Risk grade (L1/L2/L3)
```

### Standard Workflow

```yaml
# 1. Check current status
/aegis-status

# 2. For L2/L3 changes, run gate audit first
/aegis-gate

# 3. Implement with KISS enforcement
/aegis-implement

# 4. Refactor if needed
/aegis-refactor target=src/some-file.ts

# 5. Validate Merkle chain
/aegis-validate

# 6. Seal the session
/aegis-substantiate
```

## Directory Structure After Installation

```
your-workspace/
├── .qorelogic/                  # QoreLogic framework
│   ├── orbits/                  # Agent configurations
│   │   ├── orbit-governor.json
│   │   ├── orbit-judge.json
│   │   ├── orbit-specialist.json
│   │   └── orbit-sentinel.json
│   ├── workflows/               # Execution pipelines
│   │   ├── aegis-bootstrap.yaml
│   │   ├── aegis-status.yaml
│   │   ├── aegis-gate.yaml
│   │   ├── aegis-implement.yaml
│   │   ├── aegis-refactor.yaml
│   │   ├── aegis-validate.yaml
│   │   ├── aegis-substantiate.yaml
│   │   └── aegis-triage.yaml
│   ├── policies/                # Rule enforcement
│   │   ├── kiss-razor.yaml
│   │   ├── security-gate.yaml
│   │   ├── merkle-integrity.yaml
│   │   ├── orphan-detection.yaml
│   │   └── cognitive-budget.yaml
│   ├── templates/               # Document scaffolds
│   │   ├── CONCEPT.md
│   │   ├── ARCHITECTURE_PLAN.md
│   │   ├── META_LEDGER.md
│   │   ├── SYSTEM_STATE.md
│   │   └── SHADOW_GENOME.md
│   └── docs/                    # Supporting docs
│       └── MERKLE_ITERATION_GUIDE.md
├── .agent/                      # Runtime artifacts
│   └── staging/
│       └── AUDIT_REPORT.md
├── docs/                        # Project documentation
│   ├── CONCEPT.md
│   ├── ARCHITECTURE_PLAN.md
│   ├── META_LEDGER.md
│   ├── SYSTEM_STATE.md
│   └── SHADOW_GENOME.md
└── src/                         # Your source code
```

## Orbit Auto-Routing

The Sentinel orbit automatically routes requests based on file paths:

| Path Pattern | Orbit | Policy |
|--------------|-------|--------|
| `*/security/*`, `*/auth/*` | orbit-judge | security-gate |
| `*/src/*`, `*/components/*` | orbit-specialist | kiss-razor |
| `*/docs/*` | orbit-governor | merkle-integrity |

## Policy Execution Order

Policies run in priority order (0 = highest):

1. **security-gate** (priority 0) - Block security path violations
2. **kiss-razor** (priority 1) - Enforce KISS constraints
3. **merkle-integrity** (priority 2) - Verify chain integrity
4. **orphan-detection** (priority 3) - Check build path
5. **cognitive-budget** (priority 4) - Manage context

## Troubleshooting

### "Workflow not found"
Ensure workflows are registered in your workspace configuration.

### "Policy blocked operation"
Check the Sentinel alerts for specific policy violation details.

### "Chain integrity failure"
Run `/aegis-validate` to identify the break point. See MERKLE_ITERATION_GUIDE.md.

### "Orbit routing failed"
Verify file paths match expected patterns. Check Sentinel logs.

### "Gate locked"
Run `/aegis-gate` to generate a PASS verdict before implementation.

## Upgrading

To upgrade to a newer version:

```bash
# Backup your customizations
cp .qorelogic/workspace.yaml .qorelogic/workspace.yaml.backup

# Copy new version
cp -r /path/to/new-Q-DNA/.qorelogic/Antigravity/* .qorelogic/

# Restore customizations
# (manually merge if needed)
```

## Uninstallation

To remove QoreLogic from a workspace:

```bash
# Remove framework
rm -rf .qorelogic/orbits
rm -rf .qorelogic/workflows
rm -rf .qorelogic/policies

# Optionally remove project DNA
rm -rf docs/META_LEDGER.md docs/CONCEPT.md docs/ARCHITECTURE_PLAN.md
rm -rf docs/SYSTEM_STATE.md docs/SHADOW_GENOME.md
rm -rf .agent/
```

---

## Support

For issues:
1. Check [MERKLE_ITERATION_GUIDE.md](docs/MERKLE_ITERATION_GUIDE.md)
2. Review [README.md](README.md)
3. Run `/aegis-status` for diagnostics
