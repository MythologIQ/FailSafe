<#
.SYNOPSIS
  Validate documentation coherence against shipped v4.3.2 implementation.

.DESCRIPTION
  Local pre-CI guard to catch common documentation drift:
    - release/version mismatches across key docs
    - brainstorm voice route/capability mismatch between code and docs
    - missing sealed voice entries in SYSTEM_STATE when voice routes are shipped
#>

param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$violations = @()

function Add-Violation {
  param([string]$Rule, [string]$Detail)
  $script:violations += "${Rule}: ${Detail}"
}

function Assert-FilePattern {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Rule
  )
  if (!(Test-Path $Path)) {
    Add-Violation -Rule $Rule -Detail "Missing file: $Path"
    return
  }
  $raw = Get-Content $Path -Raw
  if ($raw -notmatch $Pattern) {
    Add-Violation -Rule $Rule -Detail "Pattern not found in $Path"
  }
}

function Assert-FileNotPattern {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Rule
  )
  if (!(Test-Path $Path)) {
    Add-Violation -Rule $Rule -Detail "Missing file: $Path"
    return
  }
  $raw = Get-Content $Path -Raw
  if ($raw -match $Pattern) {
    Add-Violation -Rule $Rule -Detail "Disallowed pattern found in $Path"
  }
}

Write-Host "[INFO] Running docs coherence validation..." -ForegroundColor Cyan

$extensionPackagePath = Join-Path $RepoRoot "FailSafe/extension/package.json"
if (!(Test-Path $extensionPackagePath)) {
  Add-Violation -Rule "DOCS-BASELINE" -Detail "Missing extension package.json"
} else {
  $pkg = Get-Content $extensionPackagePath -Raw | ConvertFrom-Json
  $version = [string]$pkg.version
  $escapedVersion = [regex]::Escape($version)

  Assert-FilePattern -Path (Join-Path $RepoRoot "README.md") `
    -Pattern ("Current Release\*\*:\s*v" + $escapedVersion + "\b") `
    -Rule "DOCS-VERSION-ROOT-README"
  Assert-FilePattern -Path (Join-Path $RepoRoot "FailSafe/extension/README.md") `
    -Pattern ("Current Release\*\*:\s*v" + $escapedVersion + "\b") `
    -Rule "DOCS-VERSION-EXT-README"
  Assert-FilePattern -Path (Join-Path $RepoRoot "CHANGELOG.md") `
    -Pattern ("##\s+\[" + $escapedVersion + "\]") `
    -Rule "DOCS-VERSION-ROOT-CHANGELOG"
  Assert-FilePattern -Path (Join-Path $RepoRoot "FailSafe/extension/CHANGELOG.md") `
    -Pattern ("##\s+\[" + $escapedVersion + "\]") `
    -Rule "DOCS-VERSION-EXT-CHANGELOG"
}

$consoleServerPath = Join-Path $RepoRoot "FailSafe/extension/src/roadmap/ConsoleServer.ts"
$voiceShipped = $false
if (Test-Path $consoleServerPath) {
  $serverRaw = Get-Content $consoleServerPath -Raw
  if ($serverRaw -match "/api/v1/brainstorm/transcript") {
    $voiceShipped = $true
  }
}

if ($voiceShipped) {
  $voiceSpec = Join-Path $RepoRoot "docs/specs/VOICE_BRAINSTORM_SPEC.md"
  $componentHelp = Join-Path $RepoRoot "FailSafe/extension/docs/COMPONENT_HELP.md"
  $processGuide = Join-Path $RepoRoot "FailSafe/extension/docs/PROCESS_GUIDE.md"
  $extensionReadme = Join-Path $RepoRoot "FailSafe/extension/README.md"
  $systemState = Join-Path $RepoRoot "docs/SYSTEM_STATE.md"

  Assert-FilePattern -Path $voiceSpec `
    -Pattern "/api/v1/brainstorm/transcript" `
    -Rule "DOCS-VOICE-SPEC-ROUTE"
  Assert-FilePattern -Path $componentHelp `
    -Pattern "STT/TTS roundtrip\s*\|\s*implemented" `
    -Rule "DOCS-VOICE-COMPONENT-STATUS"
  Assert-FilePattern -Path $processGuide `
    -Pattern "voice-assisted and manual" `
    -Rule "DOCS-VOICE-PROCESS-STATUS"
  Assert-FilePattern -Path $extensionReadme `
    -Pattern "Voice-Brainstorm Status[\s\S]*Implemented" `
    -Rule "DOCS-VOICE-README-STATUS"
  Assert-FilePattern -Path $systemState `
    -Pattern "#131[\s\S]*#132" `
    -Rule "DOCS-VOICE-SYSTEM-STATE-LEDGER"

  Assert-FileNotPattern -Path $extensionReadme `
    -Pattern 'not shipped in `v\d+\.\d+\.\d+`' `
    -Rule "DOCS-VOICE-NOT-SHIPPED-CLAIM"
  Assert-FileNotPattern -Path $processGuide `
    -Pattern "spec-stage|not part of shipped UI|not shipped" `
    -Rule "DOCS-VOICE-PROCESS-DOWNGRADE"
}

if ($violations.Count -gt 0) {
  Write-Host "[ERROR] DOCS COHERENCE FAILED: $($violations.Count) violation(s)" -ForegroundColor Red
  foreach ($v in $violations) {
    Write-Host "  - $v" -ForegroundColor Red
  }
  exit 1
}

Write-Host "[SUCCESS] Docs coherence validation passed." -ForegroundColor Green
exit 0
