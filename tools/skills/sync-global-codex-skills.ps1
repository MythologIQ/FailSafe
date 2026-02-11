param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot,
  [Parameter(Mandatory = $false)]
  [string]$GlobalSkillsRoot,
  [Parameter(Mandatory = $false)]
  [switch]$PruneMissing
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$ExplicitRoot)
  if ($ExplicitRoot) {
    return (Resolve-Path $ExplicitRoot).Path
  }
  try {
    $gitRoot = git -C $PSScriptRoot rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
      return $gitRoot.Trim()
    }
  } catch {}
  return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

$repo = Resolve-RepoRoot -ExplicitRoot $RepoRoot
$sourceRoot = Join-Path $repo "FailSafe\VSCode\skills"
$targetRoot = if ($GlobalSkillsRoot) { $GlobalSkillsRoot } else { Join-Path $HOME ".codex\skills\custom" }
$quarantineRoot = Join-Path $targetRoot "_quarantine"

if (-not (Test-Path $sourceRoot)) {
  Write-Host "[FAIL] Source skills root not found: $sourceRoot" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
New-Item -ItemType Directory -Path $quarantineRoot -Force | Out-Null

$activeSourceSkills = @(Get-ChildItem -Path $sourceRoot -Directory | Where-Object { $_.Name -notlike "_*" })
$activeNames = @($activeSourceSkills | Select-Object -ExpandProperty Name)

foreach ($skill in $activeSourceSkills) {
  $dst = Join-Path $targetRoot $skill.Name
  if (-not (Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst | Out-Null
  }
  Copy-Item -Path (Join-Path $skill.FullName "*") -Destination $dst -Recurse -Force
}

if ($PruneMissing) {
  $targetSkills = @(Get-ChildItem -Path $targetRoot -Directory | Where-Object { $_.Name -notlike "_*" })
  foreach ($dir in $targetSkills) {
    if ($dir.Name -in $activeNames) { continue }
    $dst = Join-Path $quarantineRoot $dir.Name
    if (Test-Path $dst) {
      $suffix = (Get-Date).ToString("yyyyMMddHHmmss")
      $dst = Join-Path $quarantineRoot "$($dir.Name)-$suffix"
    }
    Move-Item -Path $dir.FullName -Destination $dst
  }
}

Write-Host "[OK] Synced active repository skills to global Codex skills."
Write-Host " - Source: $sourceRoot"
Write-Host " - Target: $targetRoot"
Write-Host " - Skills synced: $($activeNames.Count)"
Write-Host " - Prune missing: $PruneMissing"
exit 0
