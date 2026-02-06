<#
.SYNOPSIS
    Validates canonical source files against constraints.
.DESCRIPTION
    Checks all source files for constraint violations before transformation.
    Returns non-zero exit code if any violations found.
#>

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path # .../FailSafe/build
$FailSafeContainer = Split-Path -Parent $ScriptRoot           # .../FailSafe
$RepoRoot = Split-Path -Parent $FailSafeContainer           # .../ (True Root)

# Paths - Updated for Physical Isolation v3.0.2
$FailSafeContainer = Join-Path $RepoRoot "FailSafe"
$AntigravitySrc = Join-Path $FailSafeContainer "Antigravity"
$ClaudeSrc = Join-Path $FailSafeContainer "Claude"
$VSCodeSrc = Join-Path $FailSafeContainer "VSCode"
$ExtensionSrc = Join-Path $FailSafeContainer "extension"
$TargetsDir = Join-Path $FailSafeContainer "targets"

$violations = @()

function Write-Log {
    param([string]$Message, [string]$Level = "Info")
    $colors = @{ Info = "Cyan"; Success = "Green"; Warning = "Yellow"; Error = "Red" }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

function Validate-Antigravity {
    Write-Log "Validating Antigravity Workflows (Limit: 250 chars)"
    
    if (Test-Path $AntigravitySrc) {
        $workflows = Get-ChildItem -Path $AntigravitySrc -Recurse -Filter "*.md"
        foreach ($wf in $workflows) {
            $content = Get-Content $wf.FullName -Raw
            if ($content -match 'description:\s*"?(.*?)"?(?:\r?\n|$)') {
                $desc = $matches[1].Trim()
                $len = $desc.Length
                if ($len -gt 250) {
                    $script:violations += @{ File = $wf.FullName; Rule = "Antigravity description too long ($len chars)" }
                    Write-Log "$($wf.Name): FAIL ($len chars)" -Level Error
                } else {
                    Write-Log "$($wf.Name): PASS ($len chars)" -Level Success
                }
            }
        }
    }
}

function Validate-VSCode {
    Write-Log "Validating VSCode Copilot Prompts (Flat Structure)"
    
    if (Test-Path (Join-Path $VSCodeSrc "Genesis")) {
        $script:violations += @{ File = $VSCodeSrc; Rule = "VSCode source must be flattened to prompts/ directory" }
        Write-Log "VSCode Structure: FAIL (Module directories found)" -Level Error
    }

    if (Test-Path (Join-Path $VSCodeSrc "prompts")) {
        $prompts = Get-ChildItem -Path (Join-Path $VSCodeSrc "prompts") -Filter "*.md"
        foreach ($p in $prompts) {
            if ($p.Name -notmatch "\.prompt\.md$") {
                 $script:violations += @{ File = $p.FullName; Rule = "VSCode workflows must use .prompt.md extension" }
                 Write-Log "$($p.Name): FAIL (Incorrect extension)" -Level Error
            } else {
                 Write-Log "$($p.Name): PASS" -Level Success
            }
        }
    }
}

function Validate-Isolation {
    Write-Log "Validating Physical Isolation Boundary"
    
    $ForbiddenRootDirs = @("src", "extension", "qorelogic", "Sentinel")
    foreach ($dir in $ForbiddenRootDirs) {
        $path = Join-Path $RepoRoot $dir
        if (Test-Path $path) {
            $script:violations += @{ File = $path; Rule = "Physical Isolation Violation: App code found at root" }
            Write-Log "Isolation: FAIL ($dir found at root)" -Level Error
        }
    }
    
    if (Test-Path (Join-Path $FailSafeContainer "extension")) {
        Write-Log "Isolation: PASS (extension containerized)" -Level Success
    } else {
        $script:violations += @{ File = $FailSafeContainer; Rule = "extension/ missing from app container" }
        Write-Log "Isolation: FAIL (extension missing from FailSafe/)" -Level Error
    }
}

function Validate-Agents {
    Write-Log "Validating Agent Personas across environments"
    
    $CoreAgents = @("ql-governor", "ql-judge", "ql-specialist")
    
    # Antigravity
    $agAgentsDir = Join-Path $AntigravitySrc "Genesis/agents"
    if (Test-Path $agAgentsDir) {
        foreach ($agent in $CoreAgents) {
            $path = Join-Path $agAgentsDir "$agent.md"
            if (!(Test-Path $path)) {
                $script:violations += @{ File = $agAgentsDir; Rule = "Missing Antigravity agent: $agent" }
                Write-Log "Antigravity Agents: FAIL ($agent missing)" -Level Error
            }
        }
    }

    # Claude
    $cAgentsDir = Join-Path $ClaudeSrc "Genesis/agents"
    if (Test-Path $cAgentsDir) {
        foreach ($agent in $CoreAgents) {
            $path = Join-Path $cAgentsDir "$agent.md"
            if (!(Test-Path $path)) {
                $script:violations += @{ File = $cAgentsDir; Rule = "Missing Claude agent: $agent" }
                Write-Log "Claude Agents: FAIL ($agent missing)" -Level Error
            }
        }
    }

    # VSCode
    $vAgentsDir = Join-Path $VSCodeSrc "agents"
    if (Test-Path $vAgentsDir) {
        foreach ($agent in $CoreAgents) {
            $path = Join-Path $vAgentsDir "$agent.agent.md"
            if (!(Test-Path $path)) {
                $script:violations += @{ File = $vAgentsDir; Rule = "Missing VSCode agent: $agent" }
                Write-Log "VSCode Agents: FAIL ($agent missing)" -Level Error
            } else {
                $content = Get-Content $path -Raw
                if ($content -match 'tools:\s*\[(.*?)\]') {
                    $tools = $matches[1]
                    if ($tools -match 'replace_file_content' -or $tools -match 'list_dir') {
                        $script:violations += @{ File = $path; Rule = "VSCode Agent uses invalid platform tools" }
                        Write-Log "VSCode Tools: FAIL ($agent contains Antigravity tools)" -Level Error
                    }
                }
            }
        }
    }
}

function Validate-Skills {
    Write-Log "Validating Skill Packaging"
    
    $Platforms = @($AntigravitySrc, $VSCodeSrc)
    foreach ($plat in $Platforms) {
        if (Test-Path $plat) {
            $skillsDir = Join-Path $plat "skills"
            if (Test-Path $skillsDir) {
                $skillFolders = Get-ChildItem -Path $skillsDir -Directory
                foreach ($folder in $skillFolders) {
                    $skillMd = Join-Path $folder.FullName "SKILL.md"
                    if (!(Test-Path $skillMd)) {
                        $script:violations += @{ File = $folder.FullName; Rule = "Skill folder missing SKILL.md" }
                        Write-Log "Skills: FAIL ($($folder.Name) missing SKILL.md)" -Level Error
                    }
                }
            }
        }
    }
}

function Validate-Security {
    Write-Log "Validating Security Hygiene"
    
    $tokens = @(".vsce-token", ".ovsx-token")
    foreach ($token in $tokens) {
        $rootPath = Join-Path $RepoRoot $token
        if (Test-Path $rootPath) {
            $script:violations += @{ File = $rootPath; Rule = "Security Violation: Token found at root" }
            Write-Log "Security: FAIL ($token leaked to root)" -Level Error
        }
    }
    
    $tokenDir = Join-Path $RepoRoot ".claude"
    if (Test-Path $tokenDir) {
        Write-Log "Security: PASS (.claude/ secured)" -Level Success
    }
}

# Main execution
Write-Log "FailSafe Compliance Audit (v3.0.2)" -Level Info
Write-Log "Container: $FailSafeContainer" -Level Info
Write-Log ""

Validate-Isolation
Validate-Security
Validate-Agents
Validate-Skills
Validate-Antigravity
Validate-VSCode

Write-Log ""
if ($violations.Count -gt 0) {
    Write-Log "VALIDATION FAILED: $($violations.Count) violation(s)" -Level Error
    Write-Log ""
    $violations | ForEach-Object {
        Write-Host "  - $($_.File): $($_.Rule)" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Log "VALIDATION PASSED" -Level Success
    exit 0
}
