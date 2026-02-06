<#
.SYNOPSIS
    Builds release artifacts for distribution.

.DESCRIPTION
    Produces release artifacts:
    - Claude Code: ZIP archive for ~/.claude/commands/
    - Antigravity: VSIX extension for VS Code Marketplace / Open VSX
    - VSCode Copilot: VSIX extension for VS Code Marketplace / Open VSX

.PARAMETER Clean
    Remove existing artifacts before building.

.PARAMETER SkipVsix
    Skip VSIX builds (useful for quick testing).

.EXAMPLE
    .\build-release.ps1
    .\build-release.ps1 -Clean
    .\build-release.ps1 -SkipVsix
#>

param(
    [switch]$Clean,
    [switch]$SkipVsix
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot

# Paths
$ProdExtension = Join-Path $RepoRoot "PROD-Extension"
$ArtifactsDir = Join-Path $RepoRoot "artifacts"

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $colors = @{ Info = "Cyan"; Success = "Green"; Warning = "Yellow"; Error = "Red" }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

# Ensure deploy.ps1 has run first
$claudeCommands = Join-Path $ProdExtension "Claude\.claude\commands"
if (-not (Test-Path $claudeCommands)) {
    Write-Log "PROD-Extension not populated. Running deploy.ps1 first..." -Level Warning
    $deployScript = Join-Path $ScriptRoot "deploy.ps1"
    & $deployScript
}

# Clean artifacts
if ($Clean -and (Test-Path $ArtifactsDir)) {
    Remove-Item -Recurse -Force $ArtifactsDir
    Write-Log "Cleaned artifacts directory" -Level Info
}

# Create artifacts directory
if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
}

# Get governance version from SYSTEM_STATE.md
$systemState = Join-Path $RepoRoot "..\docs\SYSTEM_STATE.md"
$version = "2.0.0"  # Default to current governance version
if (Test-Path $systemState) {
    $content = Get-Content $systemState -Raw
    # Match **Version:** v2.0.1 (markdown bold format)
    if ($content -match "\*\*Version:\*\*\s*v(\d+\.\d+\.\d+)") {
        $version = $Matches[1]
    }
}

Write-Log "Building release artifacts v$version" -Level Info

# Build Claude Code ZIP (Claude CLI uses ZIP, not VSIX)
$claudeSource = Join-Path $ProdExtension "Claude"
$claudeZip = Join-Path $ArtifactsDir "failsafe-claude-v$version.zip"

Write-Log "Building Claude Code artifact (ZIP)..." -Level Info
if (Test-Path $claudeZip) { Remove-Item $claudeZip -Force }
Compress-Archive -Path "$claudeSource\.claude" -DestinationPath $claudeZip -Force
Write-Log "Created: failsafe-claude-v$version.zip" -Level Success

if (-not $SkipVsix) {
    # Build Antigravity VSIX
    $antigravityDir = Join-Path $ProdExtension "Antigravity"
    Write-Log "Building Antigravity VSIX..." -Level Info

    Push-Location $antigravityDir
    try {
        # Install dependencies
        if (-not (Test-Path "node_modules")) {
            Write-Log "  Installing dependencies..." -Level Info
            npm install --silent 2>$null
        }

        # Compile TypeScript
        Write-Log "  Compiling TypeScript..." -Level Info
        npx tsc -p ./ 2>$null

        # Package VSIX
        Write-Log "  Packaging VSIX..." -Level Info
        npx vsce package --out "$ArtifactsDir\mythologiq-failsafe-antigravity-$version.vsix" 2>$null

        Write-Log "Created: mythologiq-failsafe-antigravity-$version.vsix" -Level Success
    }
    catch {
        Write-Log "Failed to build Antigravity VSIX: $_" -Level Error
    }
    finally {
        Pop-Location
    }

    # Build VSCode VSIX
    $vscodeDir = Join-Path $ProdExtension "VSCode"
    Write-Log "Building VSCode VSIX..." -Level Info

    Push-Location $vscodeDir
    try {
        # Install dependencies
        if (-not (Test-Path "node_modules")) {
            Write-Log "  Installing dependencies..." -Level Info
            npm install --silent 2>$null
        }

        # Compile TypeScript
        Write-Log "  Compiling TypeScript..." -Level Info
        npx tsc -p ./ 2>$null

        # Package VSIX
        Write-Log "  Packaging VSIX..." -Level Info
        npx vsce package --out "$ArtifactsDir\mythologiq-failsafe-$version.vsix" 2>$null

        Write-Log "Created: mythologiq-failsafe-$version.vsix" -Level Success
    }
    catch {
        Write-Log "Failed to build VSCode VSIX: $_" -Level Error
    }
    finally {
        Pop-Location
    }
}

# Summary
Write-Log "" -Level Info
Write-Log "=== Release Artifacts ===" -Level Success
Write-Log "Directory: $ArtifactsDir" -Level Info
Write-Log "" -Level Info

Get-ChildItem $ArtifactsDir -Filter "*.zip" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Log "  $($_.Name) (${size}KB)" -Level Success
}

Get-ChildItem $ArtifactsDir -Filter "*.vsix" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    Write-Log "  $($_.Name) (${size}KB)" -Level Success
}

Write-Log "" -Level Info
Write-Log "Main FailSafe Extension VSIX built separately via:" -Level Info
Write-Log "  cd extension && vsce package" -Level Info
