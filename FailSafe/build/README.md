# Build Infrastructure

Scripts for deploying source files and creating release artifacts.

## Scripts

| Script              | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `deploy.ps1`        | Deploy source → `PROD-Extension/` packages     |
| `build-release.ps1` | Create release ZIP artifacts                   |
| `validate.ps1`      | Validate constraints before deployment         |
| `bundle-size.ps1`   | Monitor bundle sizes for marketplace limits    |

## Build Process

### 1. Deploy Source Files

```powershell
# Deploy all environments (Claude, Antigravity, VSCode)
.\deploy.ps1

# Deploy specific target
.\deploy.ps1 -Target Claude
.\deploy.ps1 -Target Antigravity
.\deploy.ps1 -Target VSCode

# Dry run (preview changes)
.\deploy.ps1 -DryRun
```

This copies environment-specific source files to `PROD-Extension/` with the correct installation structure:

| Source                      | Destination                            |
| --------------------------- | -------------------------------------- |
| `Claude/Genesis/workflows/` | `PROD-Extension/Claude/.claude/commands/` |
| `Claude/commands/`          | `PROD-Extension/Claude/.claude/commands/` |
| `Antigravity/Genesis/`      | `PROD-Extension/Antigravity/.agent/`   |
| `VSCode/prompts/`           | `PROD-Extension/VSCode/.github/prompts/` |

### 2. Build Release Artifacts

```powershell
# Build all ZIP artifacts
.\build-release.ps1

# Clean and rebuild
.\build-release.ps1 -Clean
```

This creates release artifacts in `artifacts/`:

| Artifact                        | Contents                              |
| ------------------------------- | ------------------------------------- |
| `failsafe-claude-v*.zip`        | Claude Code slash commands            |
| `failsafe-antigravity-v*.zip`   | Antigravity/Gemini workflows          |
| `failsafe-vscode-copilot-v*.zip`| VSCode Copilot prompts                |

### 3. Build VSCode Extension

The VSCode Extension VSIX is built separately:

```powershell
cd extension
npm install
npm run compile
vsce package        # Creates .vsix for VS Code Marketplace
ovsx package        # Creates .vsix for Open VSX
```

## Full Release Build

```powershell
# 0. Validate release gates (includes version coherence)
powershell -File ..\validate.ps1

# 1. Deploy source files
.\deploy.ps1

# 2. Build release ZIPs
.\build-release.ps1 -Clean

# 3. Build extension VSIX
cd extension && vsce package
```

## Release Version Gate

Release packaging and publish now enforce version coherence across:

- `FailSafe/extension/package.json`
- `docs/SYSTEM_STATE.md` (`**Version:** vX.Y.Z`)
- `FailSafe/PROD-Extension/VSCode/package.json`
- `FailSafe/PROD-Extension/Antigravity/package.json`

Validator: `tools/reliability/validate-release-version.ps1`

## Directory Structure

```
FailSafe/
├── Claude/           # Claude source files
├── Antigravity/      # Antigravity source files
├── VSCode/           # VSCode Copilot source files
├── PROD-Extension/   # Deployment packages (generated)
├── artifacts/        # Release ZIPs (generated)
├── extension/        # VSCode Extension project
└── build/            # Build scripts (this folder)
```
