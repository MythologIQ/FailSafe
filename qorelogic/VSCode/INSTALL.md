# Sentinel Daemon Installer (VS Code)

The Sentinel daemon runs inside the FailSafe VS Code extension.

## Prerequisites

- Node.js + npm
- VS Code CLI (`code`) on PATH

## Install (PowerShell)

```powershell
# From repo root
.\qorelogic\VSCode\install-daemon.ps1 -WorkspaceRoot "C:\path\to\workspace"
```

## Install (macOS/Linux)

```bash
# From repo root
./qorelogic/VSCode/install-daemon.sh --workspace /path/to/workspace
```

## Options

- `-SkipBuild` (PowerShell) / `--skip-build` (bash): use an existing `.vsix` in `extension/`.
- `-WorkspaceRoot` (PowerShell) / `--workspace` (bash): where to seed `.failsafe/config` if missing.

The installer seeds `.failsafe/config` only if it does not already exist.
