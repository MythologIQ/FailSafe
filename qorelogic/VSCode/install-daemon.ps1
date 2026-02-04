param(
  [string]$WorkspaceRoot = (Get-Location).Path,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$extensionDir = Join-Path $repoRoot "extension"

if (-not (Test-Path $extensionDir)) {
  throw "Extension folder not found at $extensionDir"
}

$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if (-not $codeCmd) {
  $codeCmd = Get-Command code.cmd -ErrorAction SilentlyContinue
}
if (-not $codeCmd) {
  throw "VS Code CLI 'code' not found. Install VS Code and ensure 'code' is on PATH."
}

if (-not $SkipBuild) {
  Push-Location $extensionDir
  npm install
  npm run compile
  npm run patch:better-sqlite3
  npm run rebuild:vscode
  npm run package
  Pop-Location
}

$vsix = Get-ChildItem -Path $extensionDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $vsix) {
  throw "No VSIX found in $extensionDir. Run with -SkipBuild:$false to build one."
}

& $codeCmd.Source --install-extension $vsix.FullName --force

# Seed .failsafe/config if missing (do not overwrite)
$configSource = Join-Path $repoRoot "qorelogic\VSCode\.failsafe\config"
$configTarget = Join-Path $WorkspaceRoot ".failsafe\config"
if ((Test-Path $configSource) -and (-not (Test-Path $configTarget))) {
  New-Item -ItemType Directory -Force -Path $configTarget | Out-Null
  Copy-Item -Recurse -Force (Join-Path $configSource "*") $configTarget
  Write-Host "Seeded .failsafe/config in $WorkspaceRoot"
} elseif (Test-Path $configTarget) {
  Write-Host "Found existing .failsafe/config in $WorkspaceRoot (left unchanged)"
}

Write-Host "Sentinel daemon installed via VS Code extension."
