<#
.SYNOPSIS
    Monitors bundle sizes for marketplace limits.

.DESCRIPTION
    Checks PROD-Extension package sizes against limits.
    VSCode Marketplace limit: 50MB (default, can request more)

.EXAMPLE
    .\bundle-size.ps1
#>

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptRoot
$OutputDir = Join-Path $RepoRoot "PROD-Extension"

# Limits in bytes
$Limits = @{
    VSCode = 50 * 1024 * 1024  # 50MB
    Claude = $null              # No limit
    Antigravity = $null         # No limit
}

$WarningThreshold = 0.8  # Warn at 80% of limit

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $colors = @{ Info = "Cyan"; Success = "Green"; Warning = "Yellow"; Error = "Red" }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

function Get-DirectorySize {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        return 0
    }
    
    $size = (Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
    return $size
}

function Format-Size {
    param([long]$Bytes)
    
    if ($Bytes -ge 1GB) {
        return "{0:N2} GB" -f ($Bytes / 1GB)
    } elseif ($Bytes -ge 1MB) {
        return "{0:N2} MB" -f ($Bytes / 1MB)
    } elseif ($Bytes -ge 1KB) {
        return "{0:N2} KB" -f ($Bytes / 1KB)
    } else {
        return "$Bytes bytes"
    }
}

Write-Log "FailSafe Bundle Size Monitor" -Level Info
Write-Log "Output: $OutputDir" -Level Info
Write-Log ""

$targets = @("Antigravity", "Claude", "VSCode")
$hasViolation = $false

foreach ($target in $targets) {
    $targetPath = Join-Path $OutputDir $target
    $size = Get-DirectorySize -Path $targetPath
    $limit = $Limits[$target]
    
    $sizeFormatted = Format-Size -Bytes $size
    
    if ($limit) {
        $limitFormatted = Format-Size -Bytes $limit
        $percentage = [math]::Round(($size / $limit) * 100, 1)
        
        if ($size -gt $limit) {
            Write-Log "$target`: $sizeFormatted / $limitFormatted ($percentage%) EXCEEDED" -Level Error
            $hasViolation = $true
        } elseif ($size -gt ($limit * $WarningThreshold)) {
            Write-Log "$target`: $sizeFormatted / $limitFormatted ($percentage%) WARNING" -Level Warning
        } else {
            Write-Log "$target`: $sizeFormatted / $limitFormatted ($percentage%) OK" -Level Success
        }
    } else {
        Write-Log "$target`: $sizeFormatted (no limit)" -Level Info
    }
}

Write-Log ""
if ($hasViolation) {
    Write-Log "BUNDLE SIZE CHECK FAILED" -Level Error
    exit 1
} else {
    Write-Log "BUNDLE SIZE CHECK PASSED" -Level Success
    exit 0
}
