<#
.SYNOPSIS
  Local pre-push validation shortcut (pre-GitHub CI).

.DESCRIPTION
  Runs the full repository validation gate, including docs coherence.
  Use this before pushing to catch drift locally.
#>

param(
  [switch]$AllowMainBranch,
  [switch]$SkipContainerValidation
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$validator = Join-Path $RepoRoot "validate.ps1"

if (!(Test-Path $validator)) {
  Write-Error "Missing validator at $validator"
  exit 1
}

$argsList = @()
if ($AllowMainBranch) { $argsList += "-AllowMainBranch" }
if ($SkipContainerValidation) { $argsList += "-SkipContainerValidation" }

Write-Host "[INFO] Running pre-push local validation..." -ForegroundColor Cyan
& $validator @argsList
exit $LASTEXITCODE
