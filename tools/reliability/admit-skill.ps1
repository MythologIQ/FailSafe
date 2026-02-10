param(
  [Parameter(Mandatory = $true)]
  [string]$SkillPath,
  [Parameter(Mandatory = $false)]
  [string]$Source = "local",
  [Parameter(Mandatory = $false)]
  [string]$Owner = "unknown",
  [Parameter(Mandatory = $false)]
  [string]$VersionPin = "unversioned",
  [Parameter(Mandatory = $false)]
  [string[]]$DeclaredPermissions = @(),
  [Parameter(Mandatory = $false)]
  [string[]]$IntendedWorkflows = @()
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

function Get-Slug {
  param([Parameter(Mandatory = $true)][string]$Value)
  $slug = $Value.ToLowerInvariant() -replace '[^a-z0-9\-]+', '-' -replace '-+', '-'
  $slug = $slug.Trim('-')
  if ([string]::IsNullOrWhiteSpace($slug)) { return "skill" }
  return $slug
}

function New-Check {
  param(
    [string]$Name,
    [bool]$Pass,
    [string]$Notes
  )
  return [PSCustomObject]@{
    name = $Name
    pass = $Pass
    notes = $Notes
  }
}

function Normalize-StringList {
  param(
    [Parameter(Mandatory = $false)]
    [string[]]$Values
  )
  $normalized = @()
  foreach ($value in $Values) {
    if ([string]::IsNullOrWhiteSpace($value)) { continue }
    $parts = $value -split ','
    foreach ($part in $parts) {
      $trimmed = $part.Trim()
      if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
        $normalized += $trimmed
      }
    }
  }
  return @($normalized | Select-Object -Unique)
}

function Write-Registry {
  param(
    [Parameter(Mandatory = $true)][string]$RegistryPath,
    [Parameter(Mandatory = $true)][object]$Entry
  )
  $existing = @()
  if (Test-Path $RegistryPath) {
    $raw = Get-Content $RegistryPath -Raw
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
      $parsed = $raw | ConvertFrom-Json
      if ($parsed -is [System.Array]) {
        $existing = @($parsed)
      } else {
        $existing = @($parsed)
      }
    }
  }

  $updated = @($existing + $Entry) | Sort-Object -Property timestamp, id
  $updated | ConvertTo-Json -Depth 10 | Set-Content $RegistryPath
}

$repoRoot = Get-RepoRoot
$skillAbsPath = Resolve-Path $SkillPath -ErrorAction Stop
$skillAbsPath = $skillAbsPath.Path
$skillRelPath = Get-RelativePath -Base $repoRoot -Path $skillAbsPath

$admissionsDir = Join-Path $repoRoot ".failsafe\skill-admissions"
$registryDir = Join-Path $repoRoot ".failsafe\skill-registry"
$registryPath = Join-Path $registryDir "registry.json"
$templatePath = Join-Path $repoRoot "docs\Planning\templates\reliability\skill-admission-record.template.md"

if (-not (Test-Path $skillAbsPath)) {
  Write-Host "[FAIL] Skill file not found: $SkillPath" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Path $admissionsDir -Force | Out-Null
New-Item -ItemType Directory -Path $registryDir -Force | Out-Null

$content = Get-Content $skillAbsPath -Raw
$lines = $content -split "`r?`n"
$skillName = (($lines | Where-Object { $_ -match '^\*\*Skill Name:\*\*\s*(.+)$' } | Select-Object -First 1) -replace '^\*\*Skill Name:\*\*\s*', '').Trim()
if (-not $skillName) {
  $heading = ($lines | Where-Object { $_ -match '^#\s+.+$' } | Select-Object -First 1)
  if ($heading) {
    $skillName = ($heading -replace '^#\s+', '').Trim()
  }
}
if (-not $skillName) {
  $skillName = [System.IO.Path]::GetFileName([System.IO.Path]::GetDirectoryName($skillAbsPath))
}
$declaredVersion = (($lines | Where-Object { $_ -match '^\*\*Version:\*\*\s*(.+)$' } | Select-Object -First 1) -replace '^\*\*Version:\*\*\s*', '').Trim()
if (-not $declaredVersion) { $declaredVersion = "unknown" }
$purpose = (($lines | Where-Object { $_ -match '^\*\*Purpose:\*\*\s*(.+)$' } | Select-Object -First 1) -replace '^\*\*Purpose:\*\*\s*', '').Trim()

$requiredMetadataPresent = (-not [string]::IsNullOrWhiteSpace($skillName)) -and (-not [string]::IsNullOrWhiteSpace($purpose))
$requiredSectionsPresent = ($content -match '(?m)^##\s+Usage\s*$') -and ($content -match '(?m)^##\s+Skill Instructions\s*$')

$prohibitedPatterns = @(
  'Remove-Item\s+.+-Recurse\s+-Force',
  '\brm\s+-rf\b',
  '\bdel\s+/f\s+/s\s+/q\b',
  'Invoke-Expression',
  'curl\s+.+\|\s*(bash|sh|pwsh|powershell)',
  'format\s+[a-z]:'
)
$prohibitedHits = @()
foreach ($pattern in $prohibitedPatterns) {
  if ($content -match $pattern) {
    $prohibitedHits += $pattern
  }
}
$prohibitedPatternFree = ($prohibitedHits.Count -eq 0)

$stageIntakePass = $true
$staticChecks = @(
  (New-Check -Name "required metadata present" -Pass $requiredMetadataPresent -Notes "Skill Name + Purpose required"),
  (New-Check -Name "required sections present" -Pass $requiredSectionsPresent -Notes "Usage + Skill Instructions required"),
  (New-Check -Name "no prohibited patterns" -Pass $prohibitedPatternFree -Notes (($prohibitedHits -join '; ')))
)
$stageStaticPass = ($staticChecks | Where-Object { -not $_.pass }).Count -eq 0

$allowedWorkflows = @("ql-plan", "ql-implement", "ql-audit", "ql-substantiate", "ql-organize")
$workflowFallback = @("ql-plan", "ql-implement", "ql-substantiate")
$normalizedWorkflows = Normalize-StringList -Values $IntendedWorkflows
if ($normalizedWorkflows.Count -eq 0) {
  $normalizedWorkflows = $workflowFallback
}
$invalidWorkflows = @($normalizedWorkflows | Where-Object { $_ -notin $allowedWorkflows })
$compatibilityMap = @($normalizedWorkflows | Where-Object { $_ -in $allowedWorkflows })
if ($compatibilityMap.Count -eq 0) {
  $compatibilityMap = $workflowFallback
}

$riskTier = "low"
$effectivePermissions = @(Normalize-StringList -Values $DeclaredPermissions | ForEach-Object { $_.ToLowerInvariant() })
if (($effectivePermissions | Where-Object { $_ -match '(write|shell|exec|network|git)' }).Count -gt 0) {
  $riskTier = "high"
} elseif (($effectivePermissions | Where-Object { $_ -match '(read|metadata|inspect)' }).Count -gt 0) {
  $riskTier = "medium"
}
$stageGovernancePass = ($invalidWorkflows.Count -eq 0)

$dryRunPass = $stageStaticPass -and $stageGovernancePass
$dryRunNotes = "Static dry-run only; command execution intentionally blocked."

$trustTier = "Verified"
$runtimeEligibility = "Allowed"
if (-not $stageIntakePass -or -not $stageStaticPass -or -not $stageGovernancePass -or -not $dryRunPass) {
  $trustTier = "Quarantined"
  $runtimeEligibility = "Blocked"
}

$admissionTime = Get-Date
$timestamp = $admissionTime.ToString("o")
$stamp = $admissionTime.ToString("yyyyMMdd-HHmmss")
$admissionId = "$stamp-$(Get-Slug $skillName)"
$recordPath = Join-Path $admissionsDir "$admissionId.md"
$recordRelPath = Get-RelativePath -Base $repoRoot -Path $recordPath

$staticNotes = @()
if (-not $requiredMetadataPresent) { $staticNotes += "Missing Skill Name and/or Purpose metadata" }
if (-not $requiredSectionsPresent) { $staticNotes += "Missing Usage and/or Skill Instructions sections" }
if (-not $prohibitedPatternFree) { $staticNotes += "Prohibited patterns: $($prohibitedHits -join ', ')" }
if ($staticNotes.Count -eq 0) { $staticNotes = @("All static checks passed") }
$governanceNotes = if ($stageGovernancePass) {
  "risk=$riskTier; compatible=$($compatibilityMap -join ', ')"
} else {
  "Invalid workflows: $($invalidWorkflows -join ', ')"
}

$template = $null
if (Test-Path $templatePath) {
  $template = Get-Content $templatePath -Raw
} else {
  $template = @"
# Skill Admission Record

- Admission ID: [admission-id]
- Timestamp: [iso-8601]
- Skill Path: [workspace-relative-skill-path]
- Source: [source]
- Owner: [owner]
- Version Pin: [version-pin]
- Declared Permissions: [permissions]
- Intended Workflows: [workflows]

## Stage Results

| Stage | Result | Evidence |
|---|---|---|
| Intake | [PASS/FAIL] | [notes] |
| Static Compliance | [PASS/FAIL] | [notes] |
| Governance Fit | [PASS/FAIL] | [risk-tier + compatibility] |
| Sandbox Dry-Run | [PASS/FAIL] | [notes] |
| Trust Decision | [Verified/Conditional/Quarantined] | [rationale] |
| Registry Write | [PASS/FAIL] | [registry-path] |

## Static Compliance Checks

- Required metadata present: [PASS/FAIL]
- Required sections present: [PASS/FAIL]
- Prohibited patterns found: [PASS/FAIL]
- Notes: [static-notes]

## Governance Fit

- Risk Tier: [low/medium/high]
- Compatibility Map: [workflow list]
- Constraints: [constraints]

## Sandbox Dry-Run Evidence

- Dry-run mode: static text validation
- Command execution attempted: no
- Notes: [sandbox-notes]

## Final Decision

- Trust Tier: [Verified/Conditional/Quarantined]
- Runtime Eligibility: [Allowed/Blocked]
- Follow-up Actions: [actions]
"@
}
$record = $template
$record = $record.Replace("[admission-id]", $admissionId)
$record = $record.Replace("[iso-8601]", $timestamp)
$record = $record.Replace("[workspace-relative-skill-path]", $skillRelPath)
$record = $record.Replace("[source]", $Source)
$record = $record.Replace("[owner]", $Owner)
$record = $record.Replace("[version-pin]", $VersionPin)
$record = $record.Replace("[permissions]", (($effectivePermissions -join ", ")))
$record = $record.Replace("[workflows]", (($normalizedWorkflows -join ", ")))
$record = $record.Replace("| Intake | [PASS/FAIL] | [notes] |", "| Intake | PASS | path resolved and source metadata captured |")
$record = $record.Replace("| Static Compliance | [PASS/FAIL] | [notes] |", "| Static Compliance | $(if ($stageStaticPass) { 'PASS' } else { 'FAIL' }) | $($staticNotes -join '; ') |")
$record = $record.Replace("| Governance Fit | [PASS/FAIL] | [risk-tier + compatibility] |", "| Governance Fit | $(if ($stageGovernancePass) { 'PASS' } else { 'FAIL' }) | $governanceNotes |")
$record = $record.Replace("| Sandbox Dry-Run | [PASS/FAIL] | [notes] |", "| Sandbox Dry-Run | $(if ($dryRunPass) { 'PASS' } else { 'FAIL' }) | $dryRunNotes |")
$record = $record.Replace("| Trust Decision | [Verified/Conditional/Quarantined] | [rationale] |", "| Trust Decision | $trustTier | Deterministic stage outcomes |")
$record = $record.Replace("| Registry Write | [PASS/FAIL] | [registry-path] |", "| Registry Write | PASS | .failsafe\\skill-registry\\registry.json |")
$record = $record.Replace("- Required metadata present: [PASS/FAIL]", "- Required metadata present: $(if ($requiredMetadataPresent) { 'PASS' } else { 'FAIL' })")
$record = $record.Replace("- Required sections present: [PASS/FAIL]", "- Required sections present: $(if ($requiredSectionsPresent) { 'PASS' } else { 'FAIL' })")
$record = $record.Replace("- Prohibited patterns found: [PASS/FAIL]", "- Prohibited patterns found: $(if ($prohibitedPatternFree) { 'PASS' } else { 'FAIL' })")
$record = $record.Replace("- Notes: [static-notes]", "- Notes: $($staticNotes -join '; ')")
$record = $record.Replace("- Risk Tier: [low/medium/high]", "- Risk Tier: $riskTier")
$record = $record.Replace("- Compatibility Map: [workflow list]", "- Compatibility Map: $($compatibilityMap -join ', ')")
$record = $record.Replace("- Constraints: [constraints]", "- Constraints: external skill execution disabled unless trust tier is Verified or Conditional")
$record = $record.Replace("- Notes: [sandbox-notes]", "- Notes: $dryRunNotes")
$record = $record.Replace("- Trust Tier: [Verified/Conditional/Quarantined]", "- Trust Tier: $trustTier")
$record = $record.Replace("- Runtime Eligibility: [Allowed/Blocked]", "- Runtime Eligibility: $runtimeEligibility")
$record = $record.Replace("- Follow-up Actions: [actions]", "- Follow-up Actions: $(if ($trustTier -eq 'Quarantined') { 'Fix failing checks and re-admit before use.' } else { 'No blockers.' })")
Set-Content $recordPath $record

$entry = [PSCustomObject]@{
  id = $admissionId
  timestamp = $timestamp
  skillName = $skillName
  skillPath = $skillRelPath
  source = $Source
  owner = $Owner
  versionPin = $VersionPin
  declaredVersion = $declaredVersion
  declaredPermissions = $effectivePermissions
  intendedWorkflows = $normalizedWorkflows
  compatibilityMap = $compatibilityMap
  riskTier = $riskTier
  trustTier = $trustTier
  runtimeEligibility = $runtimeEligibility
  staticChecks = $staticChecks
  stage = [PSCustomObject]@{
    intake = $stageIntakePass
    staticCompliance = $stageStaticPass
    governanceFit = $stageGovernancePass
    sandboxDryRun = $dryRunPass
  }
  evidence = [PSCustomObject]@{
    admissionRecord = $recordRelPath
  }
}

Write-Registry -RegistryPath $registryPath -Entry $entry

Write-Host "[OK] Skill admission complete: $skillRelPath" -ForegroundColor Green
Write-Host ("[OK] Trust tier: " + $trustTier + " | Runtime: " + $runtimeEligibility) -ForegroundColor Green
Write-Host ("[OK] Record: " + $recordRelPath) -ForegroundColor Green
Write-Host ("[OK] Registry: .failsafe\skill-registry\registry.json") -ForegroundColor Green

if ($trustTier -eq "Quarantined") {
  exit 2
}
exit 0
