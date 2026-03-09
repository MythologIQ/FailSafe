param(
  [Parameter(Mandatory = $false)]
  [string]$RepoRoot
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

function Get-ActiveSkillDirs {
  param([string]$Root)
  if (-not (Test-Path $Root)) {
    return @()
  }
  return @(Get-ChildItem -Path $Root -Directory | Where-Object { $_.Name -notlike "_*" })
}

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    $script:Failures += $Message
  }
}

$repo = Resolve-RepoRoot -ExplicitRoot $RepoRoot

# Single source of truth: .claude/skills/ (consolidated from VSCode/Antigravity/.agent)
$claudeSkillsRoot = Join-Path $repo ".claude\skills"
$claudeAgentsRoot = Join-Path $repo ".claude\agents"

$script:Failures = @()

Assert-Condition -Condition (Test-Path $claudeSkillsRoot) -Message "Missing canonical skills root: $claudeSkillsRoot"
Assert-Condition -Condition (Test-Path $claudeAgentsRoot) -Message "Missing canonical agents root: $claudeAgentsRoot"

# Validate skill structure
$claudeSkills = Get-ActiveSkillDirs -Root $claudeSkillsRoot
$skillNames = @($claudeSkills | ForEach-Object { $_.Name } | Sort-Object -Unique)

foreach ($dir in $claudeSkills) {
  $skillPath = Join-Path $dir.FullName "SKILL.md"

  Assert-Condition -Condition (Test-Path $skillPath) -Message "Missing SKILL.md: $skillPath"
  if (-not (Test-Path $skillPath)) {
    continue
  }

  $skillRaw = Get-Content $skillPath -Raw

  Assert-Condition -Condition ($skillRaw.TrimStart().StartsWith('---')) -Message "Missing YAML frontmatter in SKILL.md: $skillPath"
  Assert-Condition -Condition ($skillRaw -match "(?m)^name:\s*.+$") -Message "Missing frontmatter name in SKILL.md: $skillPath"
  Assert-Condition -Condition ($skillRaw -match "(?m)^description:\s*.+$") -Message "Missing frontmatter description in SKILL.md: $skillPath"
}

# Validate agent structure
$agentFiles = @(Get-ChildItem -Path $claudeAgentsRoot -Filter "*.md" -File -ErrorAction SilentlyContinue)
$agentNames = @($agentFiles | ForEach-Object { $_.BaseName } | Sort-Object -Unique)

foreach ($agentFile in $agentFiles) {
  $agentRaw = Get-Content $agentFile.FullName -Raw

  Assert-Condition -Condition ($agentRaw.TrimStart().StartsWith('---')) -Message "Missing YAML frontmatter in agent: $($agentFile.FullName)"
  Assert-Condition -Condition ($agentRaw -match "(?m)^name:\s*.+$") -Message "Missing frontmatter name in agent: $($agentFile.FullName)"
}

if ($script:Failures.Count -gt 0) {
  Write-Host "[FAIL] Skill metadata validation failed." -ForegroundColor Red
  foreach ($failure in $script:Failures) {
    Write-Host " - $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "[OK] Skill metadata validation passed." -ForegroundColor Green
Write-Host " - Claude Code skills: $($skillNames.Count)"
Write-Host " - Claude Code agents: $($agentNames.Count)"
exit 0
