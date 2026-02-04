# QoreLogic A.E.G.I.S. Framework for VS Code (FailSafe)

A governance framework for AI-assisted development using the FailSafe VS Code extension, providing real-time interceptors, intent tracking, and local sentinel monitoring.

## Overview

This adaptation focuses on deep integration with the VS Code extension host:

- **Interceptors**: `onWillSaveTextDocument` hooks for real-time enforcement.
- **Intent Service**: Tracking the "Why" behind code changes.
- **Sentinel Daemon**: Local file system watching and heuristic scanning.
- **Trust Engine**: Reputation scoring for multiple AI agents.

## Bundle Layout (Mirrors Workspace)

```
qorelogic/VSCode/
└── .failsafe/
    └── config/                  # Policies and settings
        ├── README.md            # This file
        ├── COPILOT_INSTRUCTIONS.md
        ├── policies/            # Governance rules
        │   ├── risk_grading.json
        │   ├── citation_policy.json
        │   └── trust_dynamics.json
        └── templates/           # Scaffolds for governance documents
```

## Directory Structure (Workspace Target)

Synced via FailSafe to:

```
.failsafe/
├── config/                      # Policies and settings
│   └── policies/
├── ledger/                      # SOA Ledger DB
└── feedback/                    # Session evaluation reports
```

## Integration with Other Agents

The VS Code extension acts as the primary enforcement gate for all agents in the workspace. Any write attempt by Antigravity or Claude is evaluated against the policies defined here.

## Sentinel Daemon Install

From the FailSafe repo root, run:

- `qorelogic/VSCode/install-daemon.ps1` (PowerShell)
- `qorelogic/VSCode/install-daemon.sh` (macOS/Linux)

## VS Code Configuration Overrides

VS Code settings are treated as **implementation-specific overrides** for the VS Code host. Core configuration still lives in `.failsafe/config/sentinel.yaml`, while VS Code reads and overrides are scoped to this implementation.

Guidelines:

- Keep any VS Code `workspace.getConfiguration('failsafe')` usage in the VS Code implementation layer.
- Core logic should depend on `.failsafe/config/sentinel.yaml` via the shared ConfigManager.
- Claude-specific behavior remains under `qorelogic/Claude`.
