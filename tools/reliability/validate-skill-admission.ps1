param(
  [Parameter(Mandatory = $false)]
  [string]$SkillPath,
  [Parameter(Mandatory = $false)]
  [ValidateSet("Verified", "Conditional", "Quarantined")]
  [string]$MinimumTrust = "Conditional"
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

function Get-RelativePath {
  param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$Path
  )
  $baseUri = New-Object System.Uri(($Base.TrimEnd('\') + '\'))
  $pathUri = New-Object System.Uri($Path)
  $relativeUri = $baseUri.MakeRelativeUri($pathUri)
  return [System.Uri]::UnescapeDataString($relativeUri.ToString().Replace('/', '\'))
}

function Get-TrustRank {
  param([string]$Trust)
  switch ($Trust) {
    "Quarantined" { return 0 }
    "Conditional" { return 1 }
    "Verified" { return 2 }
    default { return -1 }
  }
}

$repoRoot = Get-RepoRoot
$registryPath = Join-Path $repoRoot ".failsafe\skill-registry\registry.json"

if (-not (Test-Path $registryPath)) {
  Write-Host "[FAIL] Skill registry not found: $registryPath" -ForegroundColor Red
  exit 1
}

$raw = Get-Content $registryPath -Raw
if ([string]::IsNullOrWhiteSpace($raw)) {
  Write-Host "[FAIL] Skill registry is empty: $registryPath" -ForegroundColor Red
  exit 1
}

$parsed = $raw | ConvertFrom-Json
$entries = @()
if ($parsed -is [System.Array]) {
  $entries = @($parsed)
} else {
  $entries = @($parsed)
}
if ($entries.Count -eq 0) {
  Write-Host "[FAIL] Skill registry has no entries." -ForegroundColor Red
  exit 1
}

foreach ($entry in $entries) {
  if (-not $entry.id -or -not $entry.skillPath -or -not $entry.trustTier -or -not $entry.evidence.admissionRecord) {
    Write-Host "[FAIL] Malformed registry entry detected." -ForegroundColor Red
    exit 1
  }
  $recordPath = Join-Path $repoRoot $entry.evidence.admissionRecord
  if (-not (Test-Path $recordPath)) {
    Write-Host "[FAIL] Missing admission record referenced by registry: $recordPath" -ForegroundColor Red
    exit 1
  }
}

if (-not $SkillPath) {
  Write-Host ("[OK] Registry integrity passed with " + $entries.Count + " entries.") -ForegroundColor Green
  exit 0
}

$skillAbsPath = Resolve-Path $SkillPath -ErrorAction Stop
$skillRelPath = Get-RelativePath -Base $repoRoot -Path $skillAbsPath.Path
$candidates = @($entries | Where-Object { $_.skillPath -eq $skillRelPath } | Sort-Object -Property timestamp -Descending)
if ($candidates.Count -eq 0) {
  Write-Host "[FAIL] Skill has not been admitted: $skillRelPath" -ForegroundColor Red
  exit 1
}

$latest = $candidates[0]
$latestRank = Get-TrustRank -Trust $latest.trustTier
$minimumRank = Get-TrustRank -Trust $MinimumTrust

if ($latest.trustTier -eq "Quarantined") {
  Write-Host "[FAIL] Skill is quarantined and blocked: $skillRelPath" -ForegroundColor Red
  exit 1
}

if ($latestRank -lt $minimumRank) {
  Write-Host "[FAIL] Skill trust tier below required minimum ($MinimumTrust): $skillRelPath -> $($latest.trustTier)" -ForegroundColor Red
  exit 1
}

if ($latest.runtimeEligibility -ne "Allowed") {
  Write-Host "[FAIL] Skill runtime eligibility is blocked: $skillRelPath" -ForegroundColor Red
  exit 1
}

Write-Host ("[OK] Skill admission valid: " + $skillRelPath + " (" + $latest.trustTier + ")") -ForegroundColor Green
exit 0
