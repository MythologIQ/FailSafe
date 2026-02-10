param(
  [Parameter(Mandatory = $true)]
  [string]$RunId
)

$ErrorActionPreference = "Stop"
$RepoRoot = $null
try {
  $gitRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
  if ($LASTEXITCODE -eq 0 -and $gitRoot) {
    $RepoRoot = $gitRoot.Trim()
  }
} catch {}
if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RunRoot = Join-Path $RepoRoot ".failsafe\reliability-runs\$RunId"
$intentPath = Join-Path $RunRoot "intent-lock.md"
$clarificationPath = Join-Path $RunRoot "clarification-log.md"
$contextPath = Join-Path $RunRoot "meta-system-context-lock.md"

if (!(Test-Path $RunRoot)) {
  Write-Host "[FAIL] Run not found: $RunRoot" -ForegroundColor Red
  exit 1
}

foreach ($required in @($intentPath, $clarificationPath, $contextPath)) {
  if (!(Test-Path $required)) {
    Write-Host "[FAIL] Missing required artifact: $required" -ForegroundColor Red
    exit 1
  }
}

$intent = Get-Content $intentPath -Raw
$clarification = Get-Content $clarificationPath -Raw
$context = Get-Content $contextPath -Raw

$hasExplicitAck = $false
$intentAckLine = ($intent -split "`r?`n" | Where-Object { $_ -match 'Intent acknowledged by user:' } | Select-Object -First 1)
if ($intentAckLine -and $intentAckLine -match 'Intent acknowledged by user:\s*Yes\s*$') {
  $hasExplicitAck = $true
}

$hasExplicitProceed = $false
$proceedLine = ($clarification -split "`r?`n" | Where-Object { $_ -match 'Proceed:' } | Select-Object -First 1)
if ($proceedLine -and $proceedLine -match 'Proceed:\s*Yes\s*$') {
  $hasExplicitProceed = $true
}

$checks = @(
  @{ Name = "Intent objective"; Ok = $intent -match "(?ms)## Objective\s+.+?\S" },
  @{ Name = "Intent success criteria"; Ok = $intent -match "## Success Criteria" },
  @{ Name = "Intent scope"; Ok = $intent -match "## Scope \(Accepted\)" },
  @{ Name = "Intent exclusions"; Ok = $intent -match "## Exclusions \(Out of Scope\)" },
  @{ Name = "Intent constraints"; Ok = $intent -match "## Constraints" },
  @{ Name = "Intent confirmation"; Ok = $hasExplicitAck },
  @{ Name = "Clarification decision"; Ok = $hasExplicitProceed },
  @{ Name = "Meta-system precedence"; Ok = $context -match "Effective precedence" -or $context -match "Precedence Declaration" }
)

$failed = $checks | Where-Object { -not $_.Ok }
if ($failed.Count -gt 0) {
  Write-Host "[FAIL] Intent gate validation failed:" -ForegroundColor Red
  $failed | ForEach-Object { Write-Host (" - " + $_.Name) -ForegroundColor Red }
  exit 1
}

Write-Host "[OK] Intent gate validation passed for run $RunId" -ForegroundColor Green
exit 0
