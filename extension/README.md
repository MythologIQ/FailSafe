# MythologIQ FailSafe

Complete AI governance for modern development. Real-time monitoring, trust verification, and audit trails for autonomous agent workflows.

## Features

### Sentinel Monitoring
- File-level heuristic analysis detecting security vulnerabilities and code smells
- Optional LLM-assisted deep analysis via local Ollama models
- Real-time file watching with intelligent event queuing

### Trust Engine
- Progressive trust model based on Lewicki-Bunker research (CBT → KBT → IBT)
- Agent reputation tracking with automatic trust adjustments
- Quarantine system for policy violators

### SOA Ledger
- Merkle-chained audit trail for all governance decisions
- Tamper-evident logging with SHA-256 verification
- Full history of agent actions and verdicts

### L3 Escalation
- Human-in-the-loop approval for security-critical paths
- SLA tracking for response times
- Configurable escalation policies

## Quick Start

1. Install the extension
2. Open any workspace
3. Press `Ctrl+Alt+F` (Windows/Linux) or `Cmd+Alt+F` (Mac) to open Dashboard
4. Sentinel begins monitoring automatically

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| FailSafe: Open Dashboard | `Ctrl+Alt+F` | Main governance dashboard |
| FailSafe: Focus Cortex | `Ctrl+Alt+C` | NLP command interface |
| FailSafe: Audit Current File | `Ctrl+Alt+A` | Manual file audit |
| FailSafe: Sentinel Status | - | View monitoring status |
| FailSafe: View SOA Ledger | - | Browse audit history |
| FailSafe: Review L3 Queue | - | Approve pending escalations |

## Configuration

Access via **Settings > Extensions > FailSafe**

| Setting | Default | Description |
|---------|---------|-------------|
| `failsafe.sentinel.enabled` | `true` | Enable Sentinel monitoring |
| `failsafe.sentinel.mode` | `heuristic` | Analysis mode (heuristic/llm-assisted/hybrid) |
| `failsafe.sentinel.localModel` | `phi3:mini` | Ollama model for LLM mode |
| `failsafe.qorelogic.strictMode` | `false` | Block on all warnings |
| `failsafe.qorelogic.l3SLA` | `120` | L3 response SLA (seconds) |

## Requirements

- VS Code 1.74.0 or higher
- (Optional) Ollama for LLM-assisted mode

## License

MIT - See [LICENSE](LICENSE) for details.

## Links

- [GitHub Repository](https://github.com/MythologIQ/failsafe)
- [Issue Tracker](https://github.com/MythologIQ/failsafe/issues)
