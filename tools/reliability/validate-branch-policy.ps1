param(
  [Parameter(Mandatory = $false)]
  [string]$BranchName,
  [Parameter(Mandatory = $false)]
  [switch]$AllowMain,
  [Parameter(Mandatory = $false)]
  [switch]$RequirePlanOrFeature
)

$ErrorActionPreference = "Stop"

function Get-CurrentBranch {
  if ($env:GITHUB_HEAD_REF) {
    return $env:GITHUB_HEAD_REF.Trim()
  }
  if ($env:GITHUB_REF_NAME) {
    return $env:GITHUB_REF_NAME.Trim()
  }
  try {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0 -and $branch) {
      return $branch.Trim()
    }
  } catch {}
  return $null
}

$effectiveBranch = if ($BranchName) { $BranchName } else { Get-CurrentBranch }
if (-not $effectiveBranch) {
  Write-Host "[FAIL] Unable to determine current git branch." -ForegroundColor Red
  exit 1
}

$allowedPattern = '^(plan|feat|fix|release|hotfix)\/[a-z0-9][a-z0-9\-._]*$'
$isMain = $effectiveBranch -eq "main"

if ($isMain -and -not $AllowMain) {
  Write-Host "[FAIL] Protected branch 'main' requires PR-first flow. Use a feature/plan branch." -ForegroundColor Red
  exit 1
}

if (-not $isMain -and $effectiveBranch -notmatch $allowedPattern) {
  Write-Host "[FAIL] Branch '$effectiveBranch' violates naming policy: $allowedPattern" -ForegroundColor Red
  exit 1
}

if ($RequirePlanOrFeature -and $effectiveBranch -notmatch '^(plan|feat)\/') {
  Write-Host "[FAIL] Branch '$effectiveBranch' is not a plan/feat branch required for this workflow step." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Branch policy passed for '$effectiveBranch'" -ForegroundColor Green
exit 0
