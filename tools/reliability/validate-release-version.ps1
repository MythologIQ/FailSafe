<#
.SYNOPSIS
  Validates release version coherence across primary release artifacts.
.DESCRIPTION
  Ensures docs/SYSTEM_STATE.md and marketplace package manifests align with
  FailSafe/extension/package.json version before release packaging/publish.
#>

param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

$ExtensionPackagePath = Join-Path $RepoRoot "FailSafe/extension/package.json"
$SystemStatePath = Join-Path $RepoRoot "docs/SYSTEM_STATE.md"
$VSCodeProdPackagePath = Join-Path $RepoRoot "FailSafe/PROD-Extension/VSCode/package.json"
$AntigravityProdPackagePath = Join-Path $RepoRoot "FailSafe/PROD-Extension/Antigravity/package.json"

$failures = @()

function Add-Failure {
  param([string]$Message)
  $script:failures += $Message
}

function Read-PackageVersion {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    Add-Failure "Missing package manifest: $Path"
    return $null
  }

  try {
    $pkg = Get-Content -Path $Path -Raw | ConvertFrom-Json
    return [string]$pkg.version
  }
  catch {
    Add-Failure "Failed to parse JSON: $Path"
    return $null
  }
}

$releaseVersion = Read-PackageVersion -Path $ExtensionPackagePath
if ([string]::IsNullOrWhiteSpace($releaseVersion)) {
  Add-Failure "Unable to determine release version from $ExtensionPackagePath"
}

if (-not (Test-Path $SystemStatePath)) {
  Add-Failure "Missing system state file: $SystemStatePath"
} else {
  $content = Get-Content -Path $SystemStatePath -Raw
  $match = [regex]::Match($content, "\*\*Version:\*\*\s*v(\d+\.\d+\.\d+)")
  if (-not $match.Success) {
    Add-Failure "Could not parse semantic version from docs/SYSTEM_STATE.md (**Version:** vX.Y.Z)."
  } elseif ($releaseVersion -and $match.Groups[1].Value -ne $releaseVersion) {
    Add-Failure "Version mismatch: docs/SYSTEM_STATE.md ($($match.Groups[1].Value)) != extension/package.json ($releaseVersion)"
  }
}

$vscodeVersion = Read-PackageVersion -Path $VSCodeProdPackagePath
if ($releaseVersion -and $vscodeVersion -and $vscodeVersion -ne $releaseVersion) {
  Add-Failure "Version mismatch: PROD-Extension/VSCode/package.json ($vscodeVersion) != extension/package.json ($releaseVersion)"
}

$antigravityVersion = Read-PackageVersion -Path $AntigravityProdPackagePath
if ($releaseVersion -and $antigravityVersion -and $antigravityVersion -ne $releaseVersion) {
  Add-Failure "Version mismatch: PROD-Extension/Antigravity/package.json ($antigravityVersion) != extension/package.json ($releaseVersion)"
}

if ($failures.Count -gt 0) {
  Write-Host "[FAIL] Release version coherence validation failed:" -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host "  - $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "[OK] Release version coherence validation passed (v$releaseVersion)." -ForegroundColor Green
exit 0
