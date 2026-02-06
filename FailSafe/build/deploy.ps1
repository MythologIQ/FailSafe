<#
.SYNOPSIS
    Deploys source files to PROD-Extension packages.

.DESCRIPTION
    Copies environment-specific source files to PROD-Extension/ with correct
    installation structure for each target environment.

.PARAMETER Target
    Which target to build. Options: All, Antigravity, Claude, VSCode

.PARAMETER DryRun
    Show what would be done without making changes.

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Target Claude
    .\deploy.ps1 -DryRun
#>

param(
    [ValidateSet("All", "Antigravity", "Claude", "VSCode")]
    [string]$Target = "All",

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot

# Source directories (environment-specific source)
$ClaudeSource = Join-Path $RepoRoot "Claude"
$AntigravitySource = Join-Path $RepoRoot "Antigravity"
$VSCodeSource = Join-Path $RepoRoot "VSCode"

# Output directory
$OutputDir = Join-Path $RepoRoot "PROD-Extension"

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $colors = @{ Info = "Cyan"; Success = "Green"; Warning = "Yellow"; Error = "Red" }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

function Join-Paths {
    # Helper to join multiple path segments (Windows PS v1 compatible)
    param([string[]]$Paths)
    $result = $Paths[0]
    for ($i = 1; $i -lt $Paths.Length; $i++) {
        $result = Join-Path $result $Paths[$i]
    }
    return $result
}

function Copy-Directory {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Filter = "*"
    )

    if (-not (Test-Path $Source)) {
        Write-Log "Source not found: $Source" -Level Warning
        return
    }

    if ($DryRun) {
        Write-Log "Would copy: $Source -> $Destination"
        return
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    }

    Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force
    Write-Log "Copied: $Source -> $Destination" -Level Success
}

function Deploy-Claude {
    Write-Log "Deploying Claude package..." -Level Info

    $targetDir = Join-Paths @($OutputDir, "Claude", ".claude", "commands")

    # Genesis workflows -> commands/
    $genesisWorkflows = Join-Paths @($ClaudeSource, "Genesis", "workflows")
    Copy-Directory -Source $genesisWorkflows -Destination $targetDir

    # Genesis agents -> commands/agents/
    $genesisAgents = Join-Paths @($ClaudeSource, "Genesis", "agents")
    $targetAgents = Join-Path $targetDir "agents"
    Copy-Directory -Source $genesisAgents -Destination $targetAgents

    # Qorelogic workflows -> commands/
    $qorelogicWorkflows = Join-Paths @($ClaudeSource, "Qorelogic", "workflows")
    Copy-Directory -Source $qorelogicWorkflows -Destination $targetDir

    # v2.0.0 commands (ql-repo-*, agents, references)
    $commands = Join-Path $ClaudeSource "commands"
    if (Test-Path $commands) {
        # Copy skill files directly
        Get-ChildItem -Path $commands -Filter "*.md" | ForEach-Object {
            $dest = Join-Path $targetDir $_.Name
            if (-not $DryRun) {
                Copy-Item $_.FullName $dest -Force
                Write-Log "Copied: $($_.Name)" -Level Success
            } else {
                Write-Log "Would copy: $($_.Name)"
            }
        }

        # Copy agents subfolder
        $commandAgents = Join-Path $commands "agents"
        if (Test-Path $commandAgents) {
            Copy-Directory -Source $commandAgents -Destination $targetAgents
        }

        # Copy references subfolder
        $commandRefs = Join-Path $commands "references"
        $targetRefs = Join-Path $targetDir "references"
        if (Test-Path $commandRefs) {
            Copy-Directory -Source $commandRefs -Destination $targetRefs
        }
    }

    Write-Log "Claude package complete" -Level Success
}

function Deploy-Antigravity {
    Write-Log "Deploying Antigravity package..." -Level Info

    $targetBase = Join-Path $OutputDir "Antigravity"

    # Genesis workflows -> .agent/workflows/
    $genesisWorkflows = Join-Paths @($AntigravitySource, "Genesis", "workflows")
    $targetWorkflows = Join-Paths @($targetBase, ".agent", "workflows")
    Copy-Directory -Source $genesisWorkflows -Destination $targetWorkflows

    # Genesis agents -> .qorelogic/orbits/
    $genesisAgents = Join-Paths @($AntigravitySource, "Genesis", "agents")
    $targetAgents = Join-Paths @($targetBase, ".qorelogic", "orbits")
    Copy-Directory -Source $genesisAgents -Destination $targetAgents

    # Qorelogic workflows -> .agent/workflows/
    $qorelogicWorkflows = Join-Paths @($AntigravitySource, "Qorelogic", "workflows")
    Copy-Directory -Source $qorelogicWorkflows -Destination $targetWorkflows

    # Skills -> .qorelogic/skills/
    $skills = Join-Path $AntigravitySource "skills"
    $targetSkills = Join-Paths @($targetBase, ".qorelogic", "skills")
    if (Test-Path $skills) {
        Copy-Directory -Source $skills -Destination $targetSkills
    }

    Write-Log "Antigravity package complete" -Level Success
}

function Deploy-VSCode {
    Write-Log "Deploying VSCode package..." -Level Info

    $targetBase = Join-Path $OutputDir "VSCode"

    # Prompts -> .github/prompts/
    $prompts = Join-Path $VSCodeSource "prompts"
    $targetPrompts = Join-Paths @($targetBase, ".github", "prompts")
    Copy-Directory -Source $prompts -Destination $targetPrompts

    # Agents -> .github/copilot-instructions/
    $agents = Join-Path $VSCodeSource "agents"
    $targetAgents = Join-Paths @($targetBase, ".github", "copilot-instructions")
    if (Test-Path $agents) {
        Copy-Directory -Source $agents -Destination $targetAgents
    }

    # Instructions -> .failsafe/config/
    $instructions = Join-Path $VSCodeSource "instructions"
    $targetConfig = Join-Paths @($targetBase, ".failsafe", "config")
    if (Test-Path $instructions) {
        Copy-Directory -Source $instructions -Destination $targetConfig
    }

    # Skills -> .failsafe/skills/
    $skills = Join-Path $VSCodeSource "skills"
    $targetSkills = Join-Paths @($targetBase, ".failsafe", "skills")
    if (Test-Path $skills) {
        Copy-Directory -Source $skills -Destination $targetSkills
    }

    Write-Log "VSCode package complete" -Level Success
}

# Main execution
Write-Log "FailSafe PROD-Extension Deployment" -Level Info
Write-Log "Output: $OutputDir" -Level Info

if ($DryRun) {
    Write-Log "DRY RUN - No files will be modified" -Level Warning
}

$targets = if ($Target -eq "All") {
    @("Claude", "Antigravity", "VSCode")
} else {
    @($Target)
}

foreach ($t in $targets) {
    switch ($t) {
        "Claude" { Deploy-Claude }
        "Antigravity" { Deploy-Antigravity }
        "VSCode" { Deploy-VSCode }
    }
}

Write-Log "Deployment complete!" -Level Success
