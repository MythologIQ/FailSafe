param(
  [string]$WorkspaceRoot = (Get-Location).Path,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vsInstaller = Resolve-Path (Join-Path $scriptDir "..\VSCode\install-daemon.ps1")

& $vsInstaller -WorkspaceRoot $WorkspaceRoot -SkipBuild:$SkipBuild
