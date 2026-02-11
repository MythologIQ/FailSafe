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
$vsRoot = Join-Path $repo "FailSafe\VSCode\skills"
$agentRoot = Join-Path $repo ".agent\skills"
$registryPath = Join-Path $repo "FailSafe\VSCode\skills\SOURCE_REGISTRY.md"

$script:Failures = @()

Assert-Condition -Condition (Test-Path $vsRoot) -Message "Missing VSCode skills root: $vsRoot"
Assert-Condition -Condition (Test-Path $agentRoot) -Message "Missing .agent skills root: $agentRoot"
Assert-Condition -Condition (Test-Path $registryPath) -Message "Missing source registry: $registryPath"

$vsSkills = Get-ActiveSkillDirs -Root $vsRoot
$agentSkills = Get-ActiveSkillDirs -Root $agentRoot

$vsNames = @($vsSkills | ForEach-Object { $_.Name } | Sort-Object -Unique)
$agentNames = @($agentSkills | ForEach-Object { $_.Name } | Sort-Object -Unique)

$missingInAgent = @($vsNames | Where-Object { $_ -notin $agentNames })
$missingInVs = @($agentNames | Where-Object { $_ -notin $vsNames })

if ($missingInAgent.Count -gt 0) {
  $script:Failures += "Skill parity gap: present in VSCode only -> $($missingInAgent -join ', ')"
}
if ($missingInVs.Count -gt 0) {
  $script:Failures += "Skill parity gap: present in .agent only -> $($missingInVs -join ', ')"
}

foreach ($root in @($vsRoot, $agentRoot)) {
  foreach ($dir in (Get-ActiveSkillDirs -Root $root)) {
    $skillPath = Join-Path $dir.FullName "SKILL.md"
    $sourcePath = Join-Path $dir.FullName "SOURCE.yml"

    Assert-Condition -Condition (Test-Path $skillPath) -Message "Missing SKILL.md: $skillPath"
    Assert-Condition -Condition (Test-Path $sourcePath) -Message "Missing SOURCE.yml: $sourcePath"
    if (-not (Test-Path $skillPath) -or -not (Test-Path $sourcePath)) {
      continue
    }

    $skillRaw = Get-Content $skillPath -Raw
    $sourceRaw = Get-Content $sourcePath -Raw

    Assert-Condition -Condition ($skillRaw.TrimStart().StartsWith('---')) -Message "Missing YAML frontmatter in SKILL.md: $skillPath"
    Assert-Condition -Condition ($skillRaw -match "(?m)^name:\s*.+$") -Message "Missing frontmatter name in SKILL.md: $skillPath"
    Assert-Condition -Condition ($skillRaw -match "(?m)^description:\s*.+$") -Message "Missing frontmatter description in SKILL.md: $skillPath"

    Assert-Condition -Condition ($sourceRaw -match "(?m)^source:\s*$") -Message "Missing source block in SOURCE.yml: $sourcePath"
    Assert-Condition -Condition ($sourceRaw -match "(?m)^creator:\s*$") -Message "Missing creator block in SOURCE.yml: $sourcePath"
  }
}

if ($script:Failures.Count -gt 0) {
  Write-Host "[FAIL] Skill metadata validation failed." -ForegroundColor Red
  foreach ($failure in $script:Failures) {
    Write-Host " - $failure" -ForegroundColor Red
  }
  exit 1
}

Write-Host "[OK] Skill metadata validation passed." -ForegroundColor Green
Write-Host " - VSCode active skills: $($vsNames.Count)"
Write-Host " - .agent active skills: $($agentNames.Count)"
exit 0
