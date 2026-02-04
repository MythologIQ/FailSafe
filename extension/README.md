# MythologIQ FailSafe for VS Code

Part of FailSafe - Kernel-style governance for autonomous AI agents.

Local-first safety for AI coding assistants.

![FailSafe Banner](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/icon.png)

## The Problem

AI coding assistants can generate risky code without strong guarantees. This can surface in destructive operations, credential leakage, unsafe file access, or insecure network patterns. Teams need enforceable guardrails, not just suggestions.

## The Solution

FailSafe wraps AI-assisted workflows with enforcement and auditing:

- Real-time policy enforcement to block unsafe operations before they execute
- Structured audit trails for decisions and interventions
- Shared policies so teams apply the same rules everywhere
- Optional deeper review flows for higher-risk changes

## What Is New in the Current Release

- Policy-first workspace setup with clear defaults
- Improved audit visibility and signal clarity
- Streamlined onboarding for new workspaces

## Quick Start

1. Install from the VS Code Marketplace
2. Run `FailSafe: Getting Started` from the Command Palette
3. Start coding - FailSafe protects you automatically

## Safety Alert

```
Blocked: Destructive operation detected

The AI suggested: DELETE FROM users WHERE ...
This violates your safety policy.

[Review Policy] [Allow Once] [Suggest Alternative]
```

## Features

### 1. Real-Time Code Safety

FailSafe analyzes code as you type or paste and blocks dangerous patterns:

| Policy | Default | Description |
|--------|---------|-------------|
| Destructive SQL | On | Block DROP, DELETE, TRUNCATE |
| File Deletes | On | Block rm -rf, unlink, rmtree |
| Secret Exposure | On | Block hardcoded API keys and passwords |
| Privilege Escalation | On | Block sudo, chmod 777 |
| Unsafe Network | Off | Block non-HTTPS calls |

### 2. Multi-Source Review

Request a structured review for higher-risk changes and capture the outcome in the audit log.

### 3. Audit Log Sidebar

Open the FailSafe panel to see:

- Recent blocks and warnings
- Review outcomes
- Export options for compliance

### 4. Team Policies

Share policies via `.vscode/failsafe.json`:

```json
{
  "policies": {
    "blockDestructiveSQL": true,
    "blockFileDeletes": true,
    "blockSecretExposure": true
  },
  "customRules": [
    {
      "name": "no_console_log",
      "pattern": "console\\.log",
      "message": "Remove console.log before committing",
      "severity": "low"
    }
  ]
}
```

## Commands

| Command | Description |
|---------|-------------|
| FailSafe: Getting Started | Interactive onboarding |
| FailSafe: Open Dashboard | Main governance dashboard |
| FailSafe: Audit Current File | Manual file audit |
| FailSafe: View Audit Log | Browse audit history |
| FailSafe: Configure Policies | Open policy configuration |

## Configuration

Open Settings and search for `FailSafe`:

| Setting | Default | Description |
|---------|---------|-------------|
| `failsafe.sentinel.enabled` | `true` | Enable Sentinel monitoring |
| `failsafe.sentinel.mode` | `heuristic` | Analysis mode |
| `failsafe.qorelogic.strictMode` | `false` | Block on all warnings |
| `failsafe.qorelogic.l3SLA` | `120` | Response SLA in seconds |

## Pricing

FailSafe is open source and free to use.

## Privacy

- Local-first: core policy checks run on your machine
- No network: standard mode never sends code anywhere
- Opt-in reviews: external checks are always user-initiated

## Requirements

- VS Code 1.74.0 or later
- Node.js 18+ (for development)

## Contributing

We welcome contributions. See `CONTRIBUTING.md`.

## Terms and Conditions (Beta)

FailSafe is a beta product. It is provided "as is" without warranties of any kind, and may contain bugs, incomplete features, or breaking changes.

By using this software, you acknowledge that it is experimental and agree to use it at your own risk. MythologIQ is not liable for any loss of data, downtime, or other damages arising from use of this beta release.

## License

MIT - See `LICENSE`.

## Links

- GitHub: https://github.com/MythologIQ/FailSafe
- Documentation: FAILSAFE_SPECIFICATION.md
- Issues: https://github.com/MythologIQ/FailSafe/issues
