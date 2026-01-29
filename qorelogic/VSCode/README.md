# QoreLogic A.E.G.I.S. Framework for VS Code (FailSafe)

A governance framework for AI-assisted development using the FailSafe VS Code extension, providing real-time interceptors, intent tracking, and local sentinel monitoring.

## Overview

This adaptation focuses on deep integration with the VS Code extension host:

- **Interceptors**: `onWillSaveTextDocument` hooks for real-time enforcement.
- **Intent Service**: Tracking the "Why" behind code changes.
- **Sentinel Daemon**: Local file system watching and heuristic scanning.
- **Trust Engine**: Reputation scoring for multiple AI agents.

## Directory Structure (Source)

```
qorelogic/VSCode/
├── README.md                    # This file
├── policies/                    # Governance rules
│   ├── risk_grading.json        # L1/L2/L3 classification
│   ├── citation_policy.json     # Reference validation
│   └── trust_dynamics.json      # Agent reputation rules
└── templates/                   # Scaffolds for governance documents
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
