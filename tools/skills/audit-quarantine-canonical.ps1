param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot,
  [Parameter(Mandatory = $false)]
  [string]$OutputPath
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
$quarantine = Join-Path $repo "FailSafe\VSCode\skills\_quarantine"
$activeRoot = Join-Path $repo "FailSafe\VSCode\skills"
$out = if ($OutputPath) { $OutputPath } else { Join-Path $repo "FailSafe\VSCode\skills\CANONICAL_SKILL_RESOLUTION_REPORT.md" }

if (-not (Test-Path $quarantine)) {
  Write-Host "[FAIL] Quarantine path not found: $quarantine" -ForegroundColor Red
  exit 1
}

$sources = @(
  @{ name = "elevenlabs/skills"; path = Join-Path $repo "tmp\elevenlabs-skills"; web = "https://github.com/elevenlabs/skills" },
  @{ name = "wshobson/agents"; path = Join-Path $repo "tmp\wshobson-agents"; web = "https://github.com/wshobson/agents" },
  @{ name = "openai/skills"; path = Join-Path $repo "tmp\openai-skills"; web = "https://github.com/openai/skills" },
  @{ name = "github/spec-kit"; path = Join-Path $repo "tmp\github-spec-kit"; web = "https://github.com/github/spec-kit" }
)

$skills = @(Get-ChildItem -Path $quarantine -Directory | Select-Object -ExpandProperty Name | Sort-Object -Unique)
$matchRows = @()
$unresolved = @()
$aliasResolved = @()

$aliasMap = @{
  "elevenlabs-agents" = "agents"
  "elevenlabs-music" = "music"
  "elevenlabs-setup-api-key" = "setup-api-key"
  "elevenlabs-sound-effects" = "sound-effects"
  "elevenlabs-speech-to-text" = "speech-to-text"
  "elevenlabs-text-to-speech" = "text-to-speech"
}

foreach ($skill in $skills) {
  if ($aliasMap.ContainsKey($skill)) {
    $target = $aliasMap[$skill]
    if (Test-Path (Join-Path $activeRoot $target)) {
      $aliasResolved += [PSCustomObject]@{
        alias = $skill
        canonical = $target
      }
      continue
    }
  }

  $found = $false
  foreach ($src in $sources) {
    if (-not (Test-Path $src.path)) { continue }
    $hits = @(Get-ChildItem -Path $src.path -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq $skill -and (Test-Path (Join-Path $_.FullName "SKILL.md"))
      })
    foreach ($hit in $hits) {
      $relative = $hit.FullName.Substring($src.path.Length).TrimStart('\')
      $matchRows += [PSCustomObject]@{
        skill = $skill
        source = $src.name
        path = $relative
        repo = $src.web
      }
      $found = $true
    }
  }
  if (-not $found) {
    $unresolved += $skill
  }
}

$lines = @()
$lines += "# Canonical Skill Resolution Report"
$lines += ""
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
$lines += ""
$lines += "## Sources Scanned"
foreach ($src in $sources) {
  $exists = Test-Path $src.path
  $lines += "- $($src.name) -> $($src.path) (present=$exists)"
}
$lines += ""
$lines += "## Alias-Resolved (Canonical Already Active)"
if ($aliasResolved.Count -eq 0) {
  $lines += "- None"
} else {
  foreach ($row in ($aliasResolved | Sort-Object alias)) {
    $lines += "- $($row.alias) -> $($row.canonical)"
  }
}
$lines += ""
$lines += "## Exact Name + SKILL.md Matches"
if ($matchRows.Count -eq 0) {
  $lines += "- None"
} else {
  foreach ($row in ($matchRows | Sort-Object skill, source)) {
    $lines += "- $($row.skill) from $($row.source) at $($row.path)"
  }
}
$lines += ""
$lines += "## Unresolved Quarantine Skills"
if ($unresolved.Count -eq 0) {
  $lines += "- None"
} else {
  foreach ($skill in $unresolved) {
    $lines += "- $skill"
  }
}

New-Item -ItemType Directory -Path (Split-Path -Parent $out) -Force | Out-Null
Set-Content -Path $out -Value ($lines -join "`r`n")

Write-Host "[OK] Canonical audit report written: $out"
Write-Host " - Matches: $($matchRows.Count)"
Write-Host " - Alias resolved: $($aliasResolved.Count)"
Write-Host " - Unresolved: $($unresolved.Count)"
exit 0
