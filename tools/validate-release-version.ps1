param([string]$Version)

$pkg = Get-Content "FailSafe/extension/package.json" | ConvertFrom-Json
$changelog = Get-Content "CHANGELOG.md" -Raw

$cleanVersion = $Version -replace '^v', ''
if ($pkg.version -ne $cleanVersion) {
    Write-Error "Version mismatch: tag=$cleanVersion, package.json=$($pkg.version)"
    exit 1
}
if ($changelog -notmatch [regex]::Escape($cleanVersion)) {
    Write-Error "Version $cleanVersion not found in CHANGELOG.md"
    exit 1
}
Write-Host "Version $cleanVersion validated against package.json and CHANGELOG.md"
