# MythologIQ FailSafe for VS Code

Token Efficient Governance for AI-assisted development in VSCode or Cursor.

Local-first safety for AI coding assistants.

**Current Release**: v3.5.2 (2026-02-11)

![FailSafe Banner](https://raw.githubusercontent.com/MythologIQ/FailSafe/main/icon.png)

## The Problem

AI coding assistants can generate risky code without strong guarantees. Teams need enforceable guardrails, auditability, and clear workflows around high-risk changes.

## The Solution

FailSafe adds governance and visibility at the editor boundary:

- Save-time intent gate that can block writes outside an active Intent
- Sentinel daemon for file-change audits (heuristic, LLM-assisted, and hybrid modes)
- SOA ledger with a built-in viewer for audit history
- Two primary UI screens: `FailSafe Sidebar` and `FailSafe Operations Hub`
- MCP server for external tools to trigger audits and write ledger entries

## Highlights

- FailSafe Sidebar for compact governance at-a-glance context
- FailSafe Operations Hub for extended workflow and planning operations
- File watcher and manual audit command
- SOA ledger viewer and L3 approval queue
- Feedback capture and export
- QoreLogic propagation to detected systems

## Quick Start

1. Install from the VS Code Marketplace or Open VSX.
2. Open a workspace.
3. Run `FailSafe: Open Operations Hub (Browser Popout)` or press `Ctrl+Alt+F`.
4. Run `FailSafe: Audit Current File` to generate a verdict.

## Safety Alert

```
FailSafe Blocked: AXIOM 1 VIOLATION: No active Intent exists.
Remediation: Create an Intent before modifying files.

[Create Intent] [View Active Intent]
```

## Features

### 1. Save-Time Governance Gate

FailSafe evaluates save operations against the active Intent and can block writes when no active Intent exists or when a file is out of scope.

### 2. Sentinel Monitoring and Audits

- File watcher queues audits for code changes
- Manual audits via command
- Modes: `heuristic`, `llm-assisted`, `hybrid` (LLM uses the configured endpoint)

### 3. SOA Ledger and L3 Queue

- Append-only ledger database for audit entries
- L3 approvals surfaced in the UI

### 4. UI Screens

- FailSafe Sidebar (compact view)
- FailSafe Operations Hub (extended popout/editor view)
- Skills view now includes `Recommended`, `All Relevant`, `All Installed`, and `Other Available` to keep full skill visibility.

### Sidebar UI (v3.5.2)

![FailSafe Sidebar UI v3.5.2](media/sidebar-ui-3.5.2.png)

### 5. Operations Hub UX (UI-02 + Extended Popout)

- Compact sidebar webpanel (`UI-02`) provides phase status, prioritized feature counters, Sentinel state, and workspace health at-a-glance.
- `Open FailSafe Operations Hub` opens the extended popout console for deeper workflow views (Home, Run, Skills, Governance, Activity, Reports, Settings).
- Branding is consistent across shell surfaces, including FailSafe icon usage in header and favicon contexts.

### 6. Skill Governance and Provenance

- Installed skills are discovered from FailSafe workspace roots (`FailSafe/VSCode/skills`, `.agent/skills`, `.github/skills`) with project-first precedence.
- Phase-aware relevance ranking returns `recommended`, `allRelevant`, and `otherAvailable` groupings.
- Skill metadata includes provenance fields (creator, source repo/path, source type/priority, admission state, trust tier, version pin).
- `SOURCE.yml` metadata is ingested to preserve attribution and authorship for bundled and imported skills.

### 7. Checkpoint Reliability Backbone

- Checkpoint events are stored in a local SQLite ledger (`failsafe_checkpoints`) with typed events and parent-chain integrity checks.
- Hub APIs expose checkpoint summaries and recent checkpoint history for UI transparency.

### 8. Feedback Capture

- Generate, view, and export feedback snapshots

### 9. QoreLogic Propagation

Supported via internal sync flows when enabled by workspace governance configuration.

## Commands

| Command                              | Description                 |
| ------------------------------------ | --------------------------- |
| FailSafe: Open Operations Hub (Browser Popout) | Main governance popout |
| FailSafe: Open Operations Hub (Browser) | Browser launch alias |
| FailSafe: Open Operations Hub (Editor Tab) | Compact hub in editor |
| FailSafe: Audit Current File         | Manual file audit           |
| FailSafe: Secure Workspace           | Apply workspace hardening baseline |
| FailSafe: Panic Stop                 | Stop active monitoring and guard actions |
| FailSafe: Resume Monitoring          | Resume Sentinel monitoring |

## Configuration

Open Settings and search for `FailSafe`:

| Setting                            | Default                          | Description                        |
| ---------------------------------- | -------------------------------- | ---------------------------------- |
| `failsafe.genesis.livingGraph`     | `true`                           | Enable Living Graph visualization  |
| `failsafe.genesis.cortexOmnibar`   | `true`                           | Enable Cortex Omnibar              |
| `failsafe.genesis.theme`           | `starry-night`                   | Genesis UI theme                   |
| `failsafe.sentinel.enabled`        | `true`                           | Enable Sentinel monitoring         |
| `failsafe.sentinel.mode`           | `heuristic`                      | Sentinel operating mode            |
| `failsafe.sentinel.localModel`     | `phi3:mini`                      | Ollama model for LLM-assisted mode |
| `failsafe.sentinel.ollamaEndpoint` | `http://localhost:11434`         | Ollama API endpoint                |
| `failsafe.sentinel.ragEnabled`     | `true`                           | Persist Sentinel observations to local RAG store |
| `failsafe.qorelogic.ledgerPath`    | `.failsafe/ledger/soa_ledger.db` | Ledger database path               |
| `failsafe.qorelogic.strictMode`    | `false`                          | Block on all warnings              |
| `failsafe.qorelogic.l3SLA`         | `120`                            | L3 response SLA (seconds)          |
| `failsafe.bootstrap.autoInstallGit`| `true`                           | Auto-install Git (if missing) and initialize repo during bootstrap |
| `failsafe.feedback.outputDir`      | `.failsafe/feedback`             | Feedback output directory          |

If `.failsafe/config/sentinel.yaml` exists, it overrides settings. The initializer seeds it with `mode: hybrid` unless you change it.

## Workspace Files

FailSafe seeds a `.failsafe/` directory in your workspace for configuration, ledger, and feedback output. The primary workspace config is `.failsafe/config/sentinel.yaml`. Optional policy overrides can be placed at:

- `.failsafe/config/policies/risk_grading.json`
- `.failsafe/config/policies/citation_policy.json`

## Privacy

- Heuristic mode runs locally
- LLM-assisted and hybrid modes call the configured endpoint

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

## Publishing

To publish a new version of FailSafe, use the automated Python script which handles staging, artifact generation, and multi-marketplace upload:

```bash
# From workspace root
python FailSafe/build/publish.py
```

**Prerequisites:**

- `deploy.ps1` and `build-release.ps1` must be present in `FailSafe/build/`.
- Valid tokens must be present in `.claude/.vsce-token` and `.claude/.ovsx-token`.
