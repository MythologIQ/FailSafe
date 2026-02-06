# MythologIQ: FailSafe (feat. QoreLogic)

**Token Efficient Governance for AI-assisted development**

FailSafe provides a governance framework for AI coding assistants, ensuring consistent, traceable, and compliant development workflows.

## Features

- **QoreLogic Workflows**: Structured governance commands (`/ql-bootstrap`, `/ql-plan`, `/ql-implement`, etc.)
- **Genesis Agents**: Specialized AI personas (Governor, Judge, Specialist) for different workflow phases
- **Merkle-Chained Ledger**: Cryptographic audit trail for all governance decisions
- **Unified AI Support**: VSCode Copilot prompts + Claude Code commands in one extension

## What's Included

This extension provides governance for both VSCode Copilot and Claude Code:

- **VSCode Copilot**: `.github/prompts/` and `.github/copilot-instructions/`
- **Claude Code**: `.claude/commands/` for slash command integration

## Installation

Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MythologIQ.mythologiq-failsafe) or search "MythologIQ FailSafe" in your VS Code extensions.

## Quick Start

1. Open a workspace
2. Run `/ql-bootstrap` to initialize governance
3. Use `/ql-status` to check current state
4. Run `/ql-help` for available commands

## Commands

| Command | Description |
|---------|-------------|
| `/ql-bootstrap` | Initialize governance in workspace |
| `/ql-status` | Show current governance state |
| `/ql-plan` | Create implementation plan |
| `/ql-implement` | Execute implementation |
| `/ql-audit` | Run governance audit |
| `/ql-validate` | Validate Merkle chain |
| `/ql-substantiate` | Seal session with proof |

## Documentation

- [GitHub Repository](https://github.com/MythologIQ/FailSafe)
- [Changelog](https://github.com/MythologIQ/FailSafe/blob/main/FailSafe/PROD-Extension/VSCode/CHANGELOG.md)

## License

MIT
