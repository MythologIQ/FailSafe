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
$TemplateRoot = Join-Path $RepoRoot "docs\Planning\templates\reliability"

if (Test-Path $RunRoot) {
  Write-Host "[WARN] Run directory already exists: $RunRoot" -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Path $RunRoot -Force | Out-Null

$files = @{
  "repro-capsule.md" = "repro-capsule.template.md"
  "adversarial-review.md" = "adversarial-review.template.md"
  "hypothesis-proof-log.md" = "hypothesis-proof-log.template.md"
  "attempt-transaction.md" = "attempt-transaction.template.md"
  "rollback-record.md" = "rollback-record.template.md"
  "meta-system-context-lock.md" = "meta-system-context-lock.template.md"
  "intent-lock.md" = "intent-lock.template.md"
  "clarification-log.md" = "clarification-log.template.md"
}

foreach ($target in $files.Keys) {
  $sourcePath = Join-Path $TemplateRoot $files[$target]
  $targetPath = Join-Path $RunRoot $target
  if (!(Test-Path $sourcePath)) {
    throw "Missing template: $sourcePath"
  }
  Copy-Item $sourcePath $targetPath -Force
}

$summaryPath = Join-Path $RunRoot "summary.md"
@"
# Reliability Run Summary: $RunId

- Created: $(Get-Date -Format o)
- Run Directory: $RunRoot

## Artifact Checklist

- [ ] repro-capsule.md
- [ ] adversarial-review.md
- [ ] hypothesis-proof-log.md
- [ ] attempt-transaction.md
- [ ] rollback-record.md
- [ ] meta-system-context-lock.md
- [ ] intent-lock.md
- [ ] clarification-log.md

"@ | Set-Content $summaryPath

Write-Host "[OK] Reliability run scaffold created: $RunRoot" -ForegroundColor Green
