param(
  [Parameter(Mandatory = $true)]
  [string]$RunId
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

function Add-Failure {
  param([string]$Message)
  $script:Failures += $Message
}

function Require-Pattern {
  param(
    [string]$Content,
    [string]$Pattern,
    [string]$FailureMessage
  )
  if ($Content -notmatch $Pattern) {
    Add-Failure $FailureMessage
  }
}

$repoRoot = Get-RepoRoot
$runRoot = Join-Path $repoRoot ".failsafe\reliability-runs\$RunId"

if (-not (Test-Path $runRoot)) {
  Write-Host "[FAIL] Run not found: $runRoot" -ForegroundColor Red
  exit 1
}

$requiredFiles = @(
  "repro-capsule.md",
  "adversarial-review.md",
  "hypothesis-proof-log.md",
  "attempt-transaction.md",
  "rollback-record.md",
  "summary.md",
  "intent-lock.md",
  "clarification-log.md",
  "meta-system-context-lock.md"
)

$Failures = @()

foreach ($file in $requiredFiles) {
  $path = Join-Path $runRoot $file
  if (-not (Test-Path $path)) {
    Add-Failure "Missing required artifact: $file"
    continue
  }
  $raw = Get-Content $path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    Add-Failure "Artifact is empty: $file"
  }
}

# Intent gate is mandatory and already has a dedicated validator.
$intentValidator = Join-Path $PSScriptRoot "validate-intent-gate.ps1"
if (Test-Path $intentValidator) {
  powershell -File $intentValidator -RunId $RunId | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Add-Failure "Intent gate validation failed for run: $RunId"
  }
}

$reproPath = Join-Path $runRoot "repro-capsule.md"
if (Test-Path $reproPath) {
  $repro = Get-Content $reproPath -Raw
  Require-Pattern -Content $repro -Pattern "(?m)^- Date:\s*\S+" -FailureMessage "repro-capsule.md missing Date value"
  Require-Pattern -Content $repro -Pattern "(?m)^- Branch:\s*\S+" -FailureMessage "repro-capsule.md missing Branch value"
  Require-Pattern -Content $repro -Pattern "(?m)^- Commit:\s*\S+" -FailureMessage "repro-capsule.md missing Commit value"
  Require-Pattern -Content $repro -Pattern "(?m)^- PASS when:\s*\S+" -FailureMessage "repro-capsule.md missing PASS predicate"
  Require-Pattern -Content $repro -Pattern "(?m)^- FAIL when:\s*\S+" -FailureMessage "repro-capsule.md missing FAIL predicate"
}

$adversarialPath = Join-Path $runRoot "adversarial-review.md"
if (Test-Path $adversarialPath) {
  $adv = Get-Content $adversarialPath -Raw
  Require-Pattern -Content $adv -Pattern "(?m)^- Approved with changes:\s*(Yes|No)\s*$" -FailureMessage "adversarial-review.md missing final decision"
}

$attemptPath = Join-Path $runRoot "attempt-transaction.md"
if (Test-Path $attemptPath) {
  $attempt = Get-Content $attemptPath -Raw
  Require-Pattern -Content $attempt -Pattern "(?m)^- Attempt ID:\s*\S+" -FailureMessage "attempt-transaction.md missing Attempt ID"
  Require-Pattern -Content $attempt -Pattern "(?m)^- Decision:\s*(COMMIT|UNDO)\s*$" -FailureMessage "attempt-transaction.md missing COMMIT/UNDO decision"
}

$rollbackPath = Join-Path $runRoot "rollback-record.md"
if (Test-Path $rollbackPath) {
  $rollback = Get-Content $rollbackPath -Raw
  $hasNoRollback = $rollback -match "(?mi)no rollback required"
  $hasRestoredSignal = $rollback -match "(?m)^- State restored:\s*(Yes|No)\s*$"
  if (-not $hasNoRollback -and -not $hasRestoredSignal) {
    Add-Failure "rollback-record.md must indicate restoration status or 'No rollback required'"
  }
}

$contextPath = Join-Path $runRoot "meta-system-context-lock.md"
if (Test-Path $contextPath) {
  $context = Get-Content $contextPath -Raw
  $checkedCount = ([regex]::Matches($context, "(?m)^  - \[x\]")).Count
  if ($checkedCount -eq 0) {
    Add-Failure "meta-system-context-lock.md must classify step as protocol/product/both with [x]"
  }
}

$summaryPath = Join-Path $runRoot "summary.md"
if (Test-Path $summaryPath) {
  $summary = Get-Content $summaryPath -Raw
  if ($summary -match "(?m)^- \[ \]") {
    Add-Failure "summary.md has unchecked artifact checklist items"
  }
}

if ($Failures.Count -gt 0) {
  Write-Host "[FAIL] Reliability run validation failed:" -ForegroundColor Red
  $Failures | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 1
}

Write-Host "[OK] Reliability run validation passed for run $RunId" -ForegroundColor Green
exit 0

