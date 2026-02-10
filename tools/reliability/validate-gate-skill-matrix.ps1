param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("Freeze", "Shrink", "Isolate", "Hypothesize", "Proof", "Commit", "Rollback")]
  [string]$Gate,
  [Parameter(Mandatory = $true)]
  [string]$SkillPath,
  [Parameter(Mandatory = $false)]
  [switch]$RequireSuggested
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  $repoRoot = $null
  try {
    $gitRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
      $repoRoot = $gitRoot.Trim()
    }
  } catch {}
  if (-not $repoRoot) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  }
  return $repoRoot
}

$repoRoot = Get-RepoRoot
$matrixPath = Join-Path $PSScriptRoot "gate-skill-matrix.json"

if (-not (Test-Path $matrixPath)) {
  Write-Host "[FAIL] Matrix file not found: $matrixPath" -ForegroundColor Red
  exit 1
}

$skillAbs = Resolve-Path $SkillPath -ErrorAction Stop
$skillAbsPath = $skillAbs.Path
if (-not (Test-Path $skillAbsPath)) {
  Write-Host "[FAIL] Skill file not found: $SkillPath" -ForegroundColor Red
  exit 1
}

$admissionValidator = Join-Path $PSScriptRoot "validate-skill-admission.ps1"
if (Test-Path $admissionValidator) {
  powershell -File $admissionValidator -SkillPath $skillAbsPath -MinimumTrust Conditional | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Skill admission validation failed before matrix check." -ForegroundColor Red
    exit 1
  }
}

$matrix = Get-Content $matrixPath -Raw | ConvertFrom-Json
$gateSpec = $matrix.$Gate
if (-not $gateSpec) {
  Write-Host "[FAIL] Unknown gate definition: $Gate" -ForegroundColor Red
  exit 1
}

$skillContent = (Get-Content $skillAbsPath -Raw).ToLowerInvariant()

$capabilityPatterns = @{
  "reproducibility capture" = @("repro", "reproduc")
  "environment introspection" = @("environment", "snapshot", "context")
  "command wrappers" = @("wrapper", "command")
  "snapshot tooling" = @("snapshot", "checkpoint")
  "reducer support" = @("reduce", "reducer", "shrink", "minim")
  "minimal repro extraction" = @("minimal repro", "smallest repro", "extraction")
  "ast-aware minimizers" = @("ast", "syntax tree", "minimiz")
  "dependency/path isolation" = @("isolation", "dependency", "path")
  "bisect-friendly traces" = @("bisect", "trace")
  "symbolic analysis helpers" = @("symbolic", "analysis")
  "structured hypothesis logging" = @("hypothesis", "structured")
  "budget attribution" = @("budget", "token", "cost")
  "ranking heuristics" = @("heuristic", "ranking")
  "deterministic verification" = @("deterministic", "verify", "verification")
  "test/invariant execution" = @("test", "invariant")
  "replay automation" = @("replay", "automation")
  "transaction logging" = @("transaction", "ledger", "log")
  "diff rationale capture" = @("rationale", "decision", "diff")
  "risk annotation" = @("risk", "grade")
  "restoration steps" = @("rollback", "restore", "recovery")
  "integrity verification" = @("integrity", "verify")
  "recurrence signature helpers" = @("recurrence", "signature", "pattern")
}

function Test-Capability {
  param(
    [string]$CapabilityName,
    [string]$Content
  )
  if (-not $capabilityPatterns.ContainsKey($CapabilityName)) {
    return $false
  }
  foreach ($token in $capabilityPatterns[$CapabilityName]) {
    if ($Content -match [Regex]::Escape($token)) {
      return $true
    }
  }
  return $false
}

$required = @($gateSpec.required)
$suggested = @($gateSpec.suggested)
$missingRequired = @()
$missingSuggested = @()

foreach ($capability in $required) {
  if (-not (Test-Capability -CapabilityName $capability -Content $skillContent)) {
    $missingRequired += $capability
  }
}
foreach ($capability in $suggested) {
  if (-not (Test-Capability -CapabilityName $capability -Content $skillContent)) {
    $missingSuggested += $capability
  }
}

if ($missingRequired.Count -gt 0) {
  Write-Host "[FAIL] Gate $Gate missing required capabilities in skill ${SkillPath}:" -ForegroundColor Red
  $missingRequired | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 1
}

if ($RequireSuggested -and $missingSuggested.Count -gt 0) {
  Write-Host "[FAIL] Gate $Gate missing suggested capabilities (required by policy):" -ForegroundColor Red
  $missingSuggested | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 1
}

if ($missingSuggested.Count -gt 0) {
  Write-Host "[WARN] Gate $Gate suggested capabilities not found:" -ForegroundColor Yellow
  $missingSuggested | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Yellow }
}

Write-Host "[OK] Gate-to-skill matrix check passed: $Gate <- $SkillPath" -ForegroundColor Green
exit 0
