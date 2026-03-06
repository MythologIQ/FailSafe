param ([string]$Action, [string]$AgentName, [string]$SystemScope="Personal", [int]$TimeoutSeconds=300)
$LockDir = Join-Path $PSScriptRoot ".agent\locks\$SystemScope"
if (!(Test-Path $LockDir)) { New-Item -ItemType Directory -Path $LockDir -Force | Out-Null }
function Get-LockFile([string]$name) { Join-Path $LockDir "$name.lock" }
switch ($Action) {
  "Acquire" {
      $MyLock = Get-LockFile $AgentName
      $GlobalLock = Get-ChildItem $LockDir -Filter "*.lock" | Where-Object { $_.Name -ne "$AgentName.lock" }
      if ($GlobalLock) { Throw "LOCKED by $($GlobalLock.BaseName)" }
      @{ Agent=$AgentName; Time=(Get-Date) } | ConvertTo-Json | Out-File $MyLock
      Write-Host "Locked: $AgentName"
  }
  "Release" { Remove-Item (Get-LockFile $AgentName) -ErrorAction SilentlyContinue }
}
