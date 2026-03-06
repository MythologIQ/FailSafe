<#
.SYNOPSIS
  Local pre-push validation gate (pre-GitHub CI/CD).

.DESCRIPTION
  Runs deterministic local checks before push:
    - Branch policy validation
    - Extension compile + tests
    - Release metadata preflight
    - VSIX package validation (includes help docs checks)
#>

param(
  [switch]$AllowMainBranch,
  [switch]$SkipBranchPolicy,
  [switch]$SkipTests,
  [switch]$SkipVsixPackaging
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ExtensionRoot = Join-Path $RepoRoot "FailSafe/extension"
$BranchPolicyValidator = Join-Path $RepoRoot "tools/reliability/validate-branch-policy.ps1"
$NpmCmd = if ($IsWindows) { "npm.cmd" } else { "npm" }
$PowerShellCmd = if (Get-Command pwsh -ErrorAction SilentlyContinue) {
  "pwsh"
} elseif (Get-Command powershell -ErrorAction SilentlyContinue) {
  "powershell"
} else {
  $null
}

if (!(Test-Path $ExtensionRoot)) {
  Write-Error "Missing extension root at $ExtensionRoot"
  exit 1
}

if (-not $PowerShellCmd) {
  Write-Error "PowerShell host not found (expected 'pwsh' or 'powershell')."
  exit 1
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host "[STEP] $Name" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    Write-Error "$Name failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
  }
}

Write-Host "[INFO] Running local pre-push CI/CD gate..." -ForegroundColor Cyan

if (-not $SkipBranchPolicy) {
  if (!(Test-Path $BranchPolicyValidator)) {
    Write-Error "Missing branch policy validator at $BranchPolicyValidator"
    exit 1
  }
  $branchArgs = @()
  if ($AllowMainBranch) { $branchArgs += "-AllowMain" }
  Invoke-Step "Branch policy validation" {
    & $PowerShellCmd -NoProfile -File $BranchPolicyValidator @branchArgs
  }
}

Invoke-Step "Extension compile" {
  Push-Location $ExtensionRoot
  try {
    & $NpmCmd run compile
  } finally {
    Pop-Location
  }
}

Invoke-Step "Release metadata preflight" {
  Push-Location $ExtensionRoot
  try {
    & node ./scripts/validate-vsix.cjs --source-only
  } finally {
    Pop-Location
  }
}

if (-not $SkipTests) {
  Invoke-Step "Extension tests (npm run test:all)" {
    Push-Location $ExtensionRoot
    try {
      & $NpmCmd run test:all
    } finally {
      Pop-Location
    }
  }
}

if (-not $SkipVsixPackaging) {
  Invoke-Step "Package VSIX" {
    Push-Location $ExtensionRoot
    try {
      & npx @vscode/vsce package
    } finally {
      Pop-Location
    }
  }

  Invoke-Step "Validate packaged VSIX" {
    Push-Location $ExtensionRoot
    try {
      & $NpmCmd run validate:vsix
    } finally {
      Pop-Location
    }
  }
}

Write-Host "[PASS] Local pre-push CI/CD gate passed." -ForegroundColor Green
exit 0
