# QoreLogic Universal Propagation Script (Nuanced)
# Purpose: IDE-Agnostic synchronization of QoreLogic Identity to active AI systems.

param (
    [string]$Action = "Sync",
    [string]$Target = "All"
)

$workspaceRoot = Get-Location
$sourceDir = Join-Path $workspaceRoot "qorelogic"
$logger = @{
    Info = { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
    Warn = { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
    Succ = { param($msg) Write-Host "[OK]   $msg" -ForegroundColor Green }
}

function Detect-Environment {
    $env_info = @{
        Host = "Standard CLI"
        Nuances = @()
    }

    # Detect Cursor
    if ($env:CURSOR_BIN_PATH -or (Get-Process | Where-Object { $_.ProcessName -like "*Cursor*" })) {
        $env_info.Host = "Cursor"
        $env_info.Nuances += "Cursor Rules (.cursor/rules)"
    }

    # Detect VS Code
    if ($env:VSCODE_GIT_ASKPASS_MAIN -or (Get-Process | Where-Object { $_.ProcessName -like "*Code*" })) {
        if ($env_info.Host -eq "Standard CLI") {
            $env_info.Host = "VS Code"
        }
    }

    return $env_info
}

function Propagate-System {
    param($systemId, $sourcePath, $targetPath)

    if (Test-Path $sourcePath) {
        &$logger.Info("Propagating QoreLogic to $systemId -> $targetPath")
        if (!(Test-Path $targetPath)) { New-Item -ItemType Directory -Force -Path $targetPath | Out-Null }
        
        # Specific Nuance: Don't just wipe, merge if possible
        Copy-Item -Path "$sourcePath\*" -Destination $targetPath -Recurse -Force
        &$logger.Succ("$systemId Identity Seeded.")
    }
}

# --- Main Execution ---

$envInfo = Detect-Environment
&$logger.Info("Environment Detected: $($envInfo.Host)")
foreach ($nuance in $envInfo.Nuances) { &$logger.Info("Applying Nuance: $nuance") }

# 1. Antigravity
Propagate-System "Antigravity" (Join-Path $sourceDir "Antigravity\.qorelogic") (Join-Path $workspaceRoot ".qorelogic")
Propagate-System "Workflows" (Join-Path $sourceDir "Antigravity\.agent\workflows") (Join-Path $workspaceRoot ".agent\workflows")

# 2. Claude
Propagate-System "Claude" (Join-Path $sourceDir "Claude\\.claude") (Join-Path $workspaceRoot ".claude")

# 3. Cursor (Nuanced)
Propagate-System "Cursor" (Join-Path $sourceDir "Cursor") (Join-Path $workspaceRoot ".cursor")

# 4. Codex
Propagate-System "Codex" (Join-Path $sourceDir "Codex") (Join-Path $workspaceRoot ".google-code-assist")

# 5. KiloCode
Propagate-System "KiloCode" (Join-Path $sourceDir "KiloCode") (Join-Path $workspaceRoot ".kilo")

# 6. VS Code (FailSafe & Copilot)
Propagate-System "VSCode" (Join-Path $sourceDir "VSCode\.failsafe\config") (Join-Path $workspaceRoot ".failsafe\config")

&$logger.Succ("Universal Framework Synchronization Complete.")
