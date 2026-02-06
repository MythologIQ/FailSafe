<#
.SYNOPSIS
    Transforms canonical source files to environment-specific deployment packages.

.DESCRIPTION
    Reads YAML files from src/, applies target constraints, and outputs to PROD-Extension/.
    
.PARAMETER Target
    Which target to build. Options: All, Antigravity, Claude, VSCode

.PARAMETER DryRun
    Show what would be done without making changes.

.EXAMPLE
    .\transform.ps1
    .\transform.ps1 -Target Antigravity
    .\transform.ps1 -DryRun
#>

param(
    [ValidateSet("All", "Antigravity", "Claude", "VSCode")]
    [string]$Target = "All",
    
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot

# Paths
$SrcDir = Join-Path $RepoRoot "src"
$TargetsDir = Join-Path $RepoRoot "targets"
$OutputDir = Join-Path $RepoRoot "PROD-Extension"

# Colors
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
}

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $color = $Colors[$Level]
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Read-YamlFile {
    param([string]$Path)
    
    # Simple YAML parser for our schema
    # In production, use powershell-yaml module
    $content = Get-Content $Path -Raw
    
    # Extract frontmatter-style YAML
    # For now, return raw content - full implementation would parse YAML
    return @{
        Raw = $content
        Path = $Path
    }
}

function Get-DescriptionForTarget {
    param(
        [hashtable]$Metadata,
        [hashtable]$Constraints
    )
    
    $maxLength = $Constraints.description.max_length
    $sourceField = $Constraints.description.source_field
    
    # Get the appropriate description
    if ($sourceField -eq "metadata.description.short") {
        $desc = $Metadata.description.short
    } else {
        $desc = $Metadata.description.full
    }
    
    # Truncate if needed
    if ($maxLength -and $desc.Length -gt $maxLength) {
        $desc = $desc.Substring(0, $maxLength - 3) + "..."
        Write-Log "Truncated description to $maxLength chars" -Level Warning
    }
    
    return $desc
}

function Transform-Workflow {
    param(
        [string]$SourcePath,
        [string]$TargetEnv,
        [hashtable]$Constraints
    )
    
    $source = Read-YamlFile -Path $SourcePath
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($SourcePath)
    
    # Determine output path and extension
    $outputBase = $Constraints.paths.workflows
    $extension = $Constraints.file_extension
    if ($Constraints.file_extensions) {
        $extension = $Constraints.file_extensions.workflows
    }
    
    $outputPath = Join-Path $OutputDir $TargetEnv $outputBase "$fileName$extension"
    
    Write-Log "Transform: $SourcePath -> $outputPath"
    
    if (-not $DryRun) {
        # Ensure directory exists
        $outputDir = Split-Path -Parent $outputPath
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
        }
        
        # For now, copy with minimal transformation
        # Full implementation would:
        # 1. Parse YAML
        # 2. Apply description transformation
        # 3. Strip/preserve XML tags based on constraints
        # 4. Generate correct frontmatter format
        # 5. Write output
        
        Copy-Item $SourcePath $outputPath
        Write-Log "Created: $outputPath" -Level Success
    }
}

function Build-Target {
    param([string]$TargetEnv)
    
    Write-Log "Building target: $TargetEnv" -Level Info
    
    # Load constraints
    $constraintsPath = Join-Path $TargetsDir $TargetEnv "constraints.yml"
    if (-not (Test-Path $constraintsPath)) {
        Write-Log "No constraints file found: $constraintsPath" -Level Error
        return
    }
    
    $constraints = Read-YamlFile -Path $constraintsPath
    
    # Create output directory
    $targetOutput = Join-Path $OutputDir $TargetEnv
    if (-not $DryRun -and -not (Test-Path $targetOutput)) {
        New-Item -ItemType Directory -Force -Path $targetOutput | Out-Null
    }
    
    # Transform workflows from each module
    $modules = @("Genesis", "Qorelogic", "Sentinel")
    foreach ($module in $modules) {
        $workflowsDir = Join-Path $SrcDir $module "workflows"
        if (Test-Path $workflowsDir) {
            $workflows = Get-ChildItem -Path $workflowsDir -Filter "*.yml"
            foreach ($workflow in $workflows) {
                Transform-Workflow -SourcePath $workflow.FullName -TargetEnv $TargetEnv -Constraints $constraints
            }
        }
    }
    
    Write-Log "Target $TargetEnv complete" -Level Success
}

# Main execution
Write-Log "FailSafe Build Transform" -Level Info
Write-Log "Source: $SrcDir" -Level Info
Write-Log "Output: $OutputDir" -Level Info

if ($DryRun) {
    Write-Log "DRY RUN - No files will be modified" -Level Warning
}

$targets = if ($Target -eq "All") {
    @("Antigravity", "Claude", "VSCode")
} else {
    @($Target)
}

foreach ($t in $targets) {
    Build-Target -TargetEnv $t
}

Write-Log "Build complete!" -Level Success
