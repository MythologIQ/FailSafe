# MythologIQ FailSafe for VS Code

Part of FailSafe - kernel-style governance for autonomous AI agents.

Local-first safety for AI coding assistants.

![FailSafe Banner](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/icon.png)

## The Problem

AI coding assistants can generate risky code without strong guarantees. Teams need enforceable guardrails, auditability, and clear workflows around high-risk changes.

## The Solution

FailSafe adds governance and visibility at the editor boundary:

- Save-time intent gate that can block writes outside an active Intent
- Sentinel daemon for file-change audits (heuristic by default, optional LLM-assisted and hybrid modes via local Ollama)
- SOA ledger with a built-in viewer for audit history
- Genesis UI panels for dashboards, living graph, and stream views
- MCP server for external tools to trigger audits and write ledger entries

## Highlights (v1.0.3)

- Dashboard and Living Graph webviews
- File watcher and manual audit command
- SOA ledger viewer and L3 approval queue
- Feedback capture and export
- QoreLogic propagation to detected systems

## Quick Start

1. Install from the VS Code Marketplace or Open VSX.
2. Open a workspace.
3. Run `FailSafe: Open Dashboard` or press `Ctrl+Alt+F`.
4. Run `FailSafe: Audit Current File` to generate a verdict.

## Safety Alert

```
FailSafe Blocked: AXIOM 1 VIOLATION: No active Intent exists.
Remediation: Create an Intent before modifying files.

[Create Intent] [View Active Intent]
```

## Features

### 1. Save-Time Governance Gate

FailSafe evaluates save operations against the active Intent and can block unsafe writes.

### 2. Sentinel Monitoring and Audits

- File watcher queues audits for code changes
- Manual audits via command
- Modes: `heuristic`, `llm-assisted`, `hybrid` (LLM requires a configured local endpoint)

### 3. SOA Ledger and L3 Queue

- Append-only ledger database for audit entries
- L3 approvals surfaced in the UI

### 4. Genesis UI

- Dashboard, Living Graph, Cortex Stream, Dojo, and Sentinel panels

### 5. Feedback Capture

- Generate, view, and export feedback snapshots

### 6. QoreLogic Propagation

Detect and propagate governance bundles to supported systems via `FailSafe: Sync Multi-Agent Framework`.

## Commands

| Command | Description |
|---------|-------------|
| FailSafe: Open Dashboard | Main governance dashboard |
| FailSafe: Open Living Graph | Visualization view |
| FailSafe: Focus Cortex Omnibar | Intent-aware omnibar |
| FailSafe: Sentinel Status | Show monitoring status |
| FailSafe: Audit Current File | Manual file audit |
| FailSafe: View SOA Ledger | Browse audit history |
| FailSafe: Review L3 Queue | Review pending approvals |
| FailSafe: Generate Feedback | Capture feedback snapshot |
| FailSafe: View Feedback | Open feedback panel |
| FailSafe: Export Feedback | Export feedback to JSON |
| FailSafe: Sync Multi-Agent Framework | Propagate QoreLogic bundles |

## Configuration

Open Settings and search for `FailSafe`:

| Setting | Default | Description |
|---------|---------|-------------|
| `failsafe.genesis.livingGraph` | `true` | Enable Living Graph visualization |
| `failsafe.genesis.cortexOmnibar` | `true` | Enable Cortex Omnibar |
| `failsafe.genesis.theme` | `starry-night` | Genesis UI theme |
| `failsafe.sentinel.enabled` | `true` | Enable Sentinel monitoring |
| `failsafe.sentinel.mode` | `heuristic` | Sentinel operating mode |
| `failsafe.sentinel.localModel` | `phi3:mini` | Ollama model for LLM-assisted mode |
| `failsafe.sentinel.ollamaEndpoint` | `http://localhost:11434` | Ollama API endpoint |
| `failsafe.qorelogic.ledgerPath` | `.failsafe/ledger/soa_ledger.db` | Ledger database path |
| `failsafe.qorelogic.strictMode` | `false` | Block on all warnings |
| `failsafe.qorelogic.l3SLA` | `120` | L3 response SLA (seconds) |
| `failsafe.feedback.outputDir` | `.failsafe/feedback` | Feedback output directory |

## Workspace Files

FailSafe seeds a `.failsafe/` directory in your workspace for configuration, ledger, and feedback output. Optional policy overrides can be placed at:

- `.failsafe/config/policies/risk_grading.json`
- `.failsafe/config/policies/citation_policy.json`

## Privacy

- Heuristic mode runs locally
- LLM-assisted and hybrid modes use the configured Ollama endpoint

## Requirements

- VS Code 1.74.0 or later
- Node.js 18+ (for development)
- Ollama (optional, for LLM-assisted mode)

## Contributing

Contributions are welcome via GitHub issues and pull requests.

## Terms and Conditions (Beta)

FailSafe is a beta product. It is provided "as is" without warranties of any kind, and may contain bugs, incomplete features, or breaking changes.

By using this software, you acknowledge that it is experimental and agree to use it at your own risk. MythologIQ is not liable for any loss of data, downtime, or other damages arising from use of this beta release.

## License

MIT - See `LICENSE`.

## Links

- GitHub: https://github.com/MythologIQ/FailSafe
- Issues: https://github.com/MythologIQ/FailSafe/issues
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe
- Open VSX: https://open-vsx.org/extension/MythologIQ/mythologiq-failsafe
- Documentation: FAILSAFE_SPECIFICATION.md
