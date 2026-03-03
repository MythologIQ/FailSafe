<#
.SYNOPSIS
  SemVer 2.0.0 Release Version Validator for FailSafe

.DESCRIPTION
  Enforces Semantic Versioning 2.0.0 (https://semver.org/spec/v2.0.0.html)
  across package.json, CHANGELOG.md, and git tags.

  Checks performed:
    1. SemVer 2.0.0 format compliance (no leading zeroes, valid pre-release/build)
    2. package.json <-> tag version alignment
    3. CHANGELOG.md entry existence
    4. Monotonic version ordering (new > last released tag)
    5. MAJOR/MINOR/PATCH increment rules against diff category
    6. Pre-release label validation
    7. Reset rules (patch->0 on minor bump, minor+patch->0 on major bump)

.PARAMETER Version
  The version string to validate. Accepts "vX.Y.Z" or "X.Y.Z" format.
  Supports pre-release: "1.2.3-alpha.1" and build metadata: "1.2.3+build.42"

.PARAMETER DiffCategory
  Optional. The nature of changes in this release.
  Valid values: "breaking", "feature", "fix", "none"
    - "breaking" requires MAJOR bump (or any bump if MAJOR is 0)
    - "feature"  requires at minimum a MINOR bump
    - "fix"      requires at minimum a PATCH bump
    - "none"     informational only, no enforcement

.PARAMETER DryRun
  If set, prints what the next valid version(s) would be without validation.

.EXAMPLE
  .\tools\validate-release-version.ps1 -Version v4.3.0
  .\tools\validate-release-version.ps1 -Version v5.0.0 -DiffCategory breaking
  .\tools\validate-release-version.ps1 -DryRun
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Version,

    [Parameter(Mandatory = $false)]
    [string]$DiffCategory,

    [switch]$DryRun
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

# Default DiffCategory
if (-not $DiffCategory) { $DiffCategory = "none" }
$validCategories = @("breaking", "feature", "fix", "none")
if ($validCategories -notcontains $DiffCategory) {
    Write-Error "Invalid DiffCategory '$DiffCategory'. Must be one of: $($validCategories -join ', ')"
    exit 1
}

# ============================================================================
# SemVer 2.0.0 Parser (PS5-compatible, no complex regex)
# ============================================================================

function Parse-SemVer {
    param([string]$VersionString)
    $clean = $VersionString -replace '^v', ''

    # Split off build metadata (after +)
    $buildMeta = $null
    $preRelease = $null
    $remaining = $clean

    $plusIdx = $remaining.IndexOf('+')
    if ($plusIdx -ge 0) {
        $buildMeta = $remaining.Substring($plusIdx + 1)
        $remaining = $remaining.Substring(0, $plusIdx)
    }

    # Split off pre-release (after first - that follows X.Y.Z)
    if ($remaining -match '^(\d+\.\d+\.\d+)-(.+)$') {
        $preRelease = $Matches[2]
        $remaining = $Matches[1]
    }

    # Validate core X.Y.Z (no leading zeroes, spec rule 2)
    if ($remaining -notmatch '^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)$') {
        return $null
    }
    $major = [int]$Matches['major']
    $minor = [int]$Matches['minor']
    $patch = [int]$Matches['patch']

    # Validate pre-release identifiers (spec rule 9)
    if ($preRelease) {
        foreach ($id in ($preRelease -split '\.')) {
            if ($id -eq '') { return $null }
            if (($id -match '^\d+$') -and ($id -match '^0\d')) { return $null }
            if ($id -notmatch '^[0-9a-zA-Z-]+$') { return $null }
        }
    }

    # Validate build metadata identifiers (spec rule 10)
    if ($buildMeta) {
        foreach ($id in ($buildMeta -split '\.')) {
            if ($id -eq '') { return $null }
            if ($id -notmatch '^[0-9a-zA-Z-]+$') { return $null }
        }
    }

    $isPre = $false
    if ($preRelease) { $isPre = $true }

    return @{
        Raw          = $clean
        Major        = $major
        Minor        = $minor
        Patch        = $patch
        PreRelease   = $preRelease
        BuildMeta    = $buildMeta
        IsPreRelease = $isPre
        Core         = "$major.$minor.$patch"
    }
}

# ============================================================================
# SemVer 2.0.0 Precedence Comparator (spec rule 11)
# ============================================================================

function Compare-SemVer {
    param($A, $B)

    if ($A.Major -ne $B.Major) { return [Math]::Sign($A.Major - $B.Major) }
    if ($A.Minor -ne $B.Minor) { return [Math]::Sign($A.Minor - $B.Minor) }
    if ($A.Patch -ne $B.Patch) { return [Math]::Sign($A.Patch - $B.Patch) }

    # Pre-release has lower precedence than normal (spec 11.3)
    if (-not $A.IsPreRelease -and $B.IsPreRelease) { return 1 }
    if ($A.IsPreRelease -and -not $B.IsPreRelease) { return -1 }
    if (-not $A.IsPreRelease -and -not $B.IsPreRelease) { return 0 }

    # Both pre-release: compare dot-separated identifiers (spec 11.4)
    $aIds = $A.PreRelease -split '\.'
    $bIds = $B.PreRelease -split '\.'
    $len = [Math]::Min($aIds.Length, $bIds.Length)

    for ($i = 0; $i -lt $len; $i++) {
        $aIsNum = $aIds[$i] -match '^\d+$'
        $bIsNum = $bIds[$i] -match '^\d+$'

        if ($aIsNum -and $bIsNum) {
            $cmp = [int]$aIds[$i] - [int]$bIds[$i]
            if ($cmp -ne 0) { return [Math]::Sign($cmp) }
        }
        elseif ($aIsNum -and -not $bIsNum) {
            return -1
        }
        elseif (-not $aIsNum -and $bIsNum) {
            return 1
        }
        else {
            $cmp = [string]::Compare($aIds[$i], $bIds[$i], [StringComparison]::Ordinal)
            if ($cmp -ne 0) { return [Math]::Sign($cmp) }
        }
    }

    return [Math]::Sign($aIds.Length - $bIds.Length)
}

function Get-BumpCategory {
    param($Old, $New)
    if ($New.Major -gt $Old.Major) { return "major" }
    if ($New.Major -lt $Old.Major) { return "none" }
    if ($New.Minor -gt $Old.Minor) { return "minor" }
    if ($New.Minor -lt $Old.Minor) { return "none" }
    if ($New.Patch -gt $Old.Patch) { return "patch" }
    if ($New.IsPreRelease -and -not $Old.IsPreRelease) { return "prerelease" }
    if ($New.IsPreRelease -and $Old.IsPreRelease) { return "prerelease" }
    return "none"
}

function Get-NextVersions {
    param($Current)
    $vMajor = $Current.Major
    $vMinor = $Current.Minor
    $vPatch = $Current.Patch
    return @{
        NextPatch    = "$vMajor.$vMinor.$($vPatch + 1)"
        NextMinor    = "$vMajor.$($vMinor + 1).0"
        NextMajor    = "$($vMajor + 1).0.0"
        NextPreAlpha = "$vMajor.$vMinor.$($vPatch + 1)-alpha.1"
        NextPreBeta  = "$vMajor.$vMinor.$($vPatch + 1)-beta.1"
        NextPreRC    = "$vMajor.$vMinor.$($vPatch + 1)-rc.1"
    }
}

# ============================================================================
# Source of Truth: package.json + git tags
# ============================================================================

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
    $repoRoot = Split-Path -Parent $PSScriptRoot
}

$packageJsonPath = Join-Path $repoRoot "FailSafe" | Join-Path -ChildPath "extension" | Join-Path -ChildPath "package.json"
$changelogPath = Join-Path $repoRoot "CHANGELOG.md"

if (-not (Test-Path $packageJsonPath)) {
    Write-Error "package.json not found at $packageJsonPath"
    exit 1
}

$pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$pkgVersion = Parse-SemVer $pkg.version

if (-not $pkgVersion) {
    Write-Error "package.json version '$($pkg.version)' is NOT valid SemVer 2.0.0"
    exit 1
}

# Collect and sort all semver-valid tags
$rawTags = git tag -l "v*" 2>$null
$parsedTags = @()
if ($rawTags) {
    foreach ($tag in $rawTags) {
        $parsed = Parse-SemVer $tag
        if ($parsed) {
            $parsed.TagName = $tag
            $parsedTags += $parsed
        }
    }
    $parsedTags = $parsedTags | Sort-Object -Property {
        $_.Major * 1000000 + $_.Minor * 1000 + $_.Patch
    } -Descending
}

$lastTag = $null
if ($parsedTags.Count -gt 0) { $lastTag = $parsedTags[0] }

# ============================================================================
# DRY RUN MODE
# ============================================================================

if ($DryRun) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "  SemVer 2.0.0 - Next Version Planner" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host ""

    $pkgLabel = $pkgVersion.Core
    if ($pkgVersion.IsPreRelease) { $pkgLabel = $pkgLabel + "-" + $pkgVersion.PreRelease }
    Write-Host "  package.json:  $pkgLabel" -ForegroundColor White

    if ($lastTag) {
        $tagLabel = "v" + $lastTag.Core
        if ($lastTag.IsPreRelease) { $tagLabel = $tagLabel + "-" + $lastTag.PreRelease }
        Write-Host "  Last git tag:  $tagLabel" -ForegroundColor White
    } else {
        Write-Host "  Last git tag:  [none]" -ForegroundColor Yellow
    }
    Write-Host ""

    $baseline = $pkgVersion
    if ($lastTag) { $baseline = $lastTag }
    $next = Get-NextVersions $baseline

    Write-Host "  Valid next versions from $($baseline.Core):" -ForegroundColor Gray
    Write-Host ""
    Write-Host "    Fix (backward-compatible bug fix):" -ForegroundColor Green
    Write-Host "      $($next.NextPatch)" -ForegroundColor White
    Write-Host ""
    Write-Host "    Feature (backward-compatible new functionality):" -ForegroundColor Blue
    Write-Host "      $($next.NextMinor)" -ForegroundColor White
    Write-Host ""
    Write-Host "    Breaking (backward-incompatible change):" -ForegroundColor Red
    Write-Host "      $($next.NextMajor)" -ForegroundColor White
    Write-Host ""
    Write-Host "    Pre-release:" -ForegroundColor Magenta
    Write-Host "      $($next.NextPreAlpha)   (alpha)" -ForegroundColor White
    Write-Host "      $($next.NextPreBeta)    (beta)" -ForegroundColor White
    Write-Host "      $($next.NextPreRC)      (release candidate)" -ForegroundColor White
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    exit 0
}

# ============================================================================
# VALIDATION MODE
# ============================================================================

if (-not $Version) {
    Write-Error "Either -Version or -DryRun is required."
    exit 1
}

$errors = @()
$warnings = @()

# Check 1: SemVer 2.0.0 format compliance
$targetVersion = Parse-SemVer $Version
if (-not $targetVersion) {
    $errors += "FAIL [SEMVER-FORMAT] '$Version' is not valid SemVer 2.0.0. Must match: MAJOR.MINOR.PATCH[-prerelease][+build]"
} else {
    Write-Host "PASS [SEMVER-FORMAT] '$($targetVersion.Raw)' is valid SemVer 2.0.0" -ForegroundColor Green
}

if ($errors.Count -gt 0) {
    foreach ($e in $errors) { Write-Error $e }
    exit 1
}

# Exclude the current target tag/version from "last release" calculations.
$comparisonTags = @($parsedTags | Where-Object { $_.Raw -ne $targetVersion.Raw })
$previousTag = $null
if ($comparisonTags.Count -gt 0) { $previousTag = $comparisonTags[0] }

# Check 2: package.json alignment
if ($targetVersion.Core -ne $pkgVersion.Core -or $targetVersion.PreRelease -ne $pkgVersion.PreRelease) {
    $errors += "FAIL [PKG-ALIGN] Tag version '$($targetVersion.Raw)' != package.json version '$($pkgVersion.Raw)'"
} else {
    Write-Host "PASS [PKG-ALIGN] Tag matches package.json ($($pkgVersion.Raw))" -ForegroundColor Green
}

# Check 3: CHANGELOG entry
if (Test-Path $changelogPath) {
    $changelogContent = Get-Content $changelogPath -Raw
    $escapedVersion = [regex]::Escape($targetVersion.Core)
    if ($changelogContent -notmatch "\[$escapedVersion\]") {
        $errors += "FAIL [CHANGELOG] Version $($targetVersion.Core) not found in CHANGELOG.md"
    } else {
        Write-Host "PASS [CHANGELOG] Version $($targetVersion.Core) documented in CHANGELOG.md" -ForegroundColor Green
    }
} else {
    $warnings += "WARN [CHANGELOG] CHANGELOG.md not found at $changelogPath"
}

# Check 4: Monotonic ordering (new must be > last tag)
if ($previousTag) {
    $cmp = Compare-SemVer $targetVersion $previousTag
    if ($cmp -le 0) {
        $errors += "FAIL [MONOTONIC] Version $($targetVersion.Raw) is not greater than last tag $($previousTag.Raw). Versions must only increase."
    } else {
        Write-Host "PASS [MONOTONIC] $($targetVersion.Raw) > $($previousTag.Raw) (last tag)" -ForegroundColor Green
    }
} else {
    Write-Host "PASS [MONOTONIC] No prior tags -- first release" -ForegroundColor Green
}

# Check 5: Diff category enforcement
if ($DiffCategory -ne "none" -and $previousTag) {
    $bumpCat = Get-BumpCategory $previousTag $targetVersion

    switch ($DiffCategory) {
        "breaking" {
            if ($previousTag.Major -gt 0 -and $bumpCat -ne "major") {
                $errors += "FAIL [BUMP-RULE] Breaking changes require MAJOR bump ($($previousTag.Major + 1).0.0), got $($targetVersion.Raw). SemVer spec rule 8."
            } elseif ($previousTag.Major -eq 0) {
                $warnings += "WARN [BUMP-RULE] Major version 0: breaking changes allowed without major bump per spec rule 4."
            } else {
                Write-Host "PASS [BUMP-RULE] Breaking change -> MAJOR bump correct" -ForegroundColor Green
            }
        }
        "feature" {
            if ($bumpCat -eq "patch" -or $bumpCat -eq "none") {
                $errors += "FAIL [BUMP-RULE] New features require at minimum MINOR bump, got $bumpCat ($($targetVersion.Raw)). SemVer spec rule 7."
            } else {
                Write-Host "PASS [BUMP-RULE] Feature change -> MINOR+ bump correct" -ForegroundColor Green
            }
        }
        "fix" {
            if ($bumpCat -eq "none") {
                $errors += "FAIL [BUMP-RULE] Bug fixes require at minimum PATCH bump. SemVer spec rule 6."
            } else {
                Write-Host "PASS [BUMP-RULE] Fix -> PATCH+ bump correct" -ForegroundColor Green
            }
        }
    }
}

# Check 6: Reset rules (spec rule 7: patch resets on minor, rule 8: both reset on major)
if ($previousTag) {
    if ($targetVersion.Major -gt $previousTag.Major) {
        if ($targetVersion.Minor -ne 0 -or $targetVersion.Patch -ne 0) {
            $errors += "FAIL [RESET-RULE] MAJOR bump requires MINOR and PATCH reset to 0. Got $($targetVersion.Raw), expected $($targetVersion.Major).0.0"
        } else {
            Write-Host "PASS [RESET-RULE] MAJOR bump resets MINOR.PATCH to 0" -ForegroundColor Green
        }
    }
    elseif ($targetVersion.Minor -gt $previousTag.Minor -and $targetVersion.Major -eq $previousTag.Major) {
        if ($targetVersion.Patch -ne 0) {
            $errors += "FAIL [RESET-RULE] MINOR bump requires PATCH reset to 0. Got $($targetVersion.Raw), expected $($targetVersion.Major).$($targetVersion.Minor).0"
        } else {
            Write-Host "PASS [RESET-RULE] MINOR bump resets PATCH to 0" -ForegroundColor Green
        }
    }
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
if ($warnings.Count -gt 0) {
    foreach ($w in $warnings) { Write-Host $w -ForegroundColor Yellow }
}

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Red
    Write-Host "  RELEASE BLOCKED -- $($errors.Count) SemVer violation(s)" -ForegroundColor Red
    Write-Host "=======================================================" -ForegroundColor Red
    foreach ($e in $errors) { Write-Error $e }
    exit 1
} else {
    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "  RELEASE APPROVED -- $($targetVersion.Raw) passes all SemVer 2.0.0 checks" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    exit 0
}
