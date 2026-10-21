param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Amendment {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "QMBT-2R direct-location amendment validation failed: $Message" }
}

function Read-Text {
    param([string]$RelativePath)
    $path = Join-Path $RepositoryRoot $RelativePath
    Assert-Amendment (Test-Path -LiteralPath $path -PathType Leaf) "Missing $RelativePath."
    return [IO.File]::ReadAllText($path).Replace("`r`n", "`n")
}

function Get-Sha256 {
    param([string]$Text)
    return [Convert]::ToHexString(
        [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text))
    ).ToLowerInvariant()
}

# Preserve the previously reviewed QMBT-2R baseline as historical protocol evidence.
& (Join-Path $PSScriptRoot 'Test-Qmbt2rProtocol.ps1') -RepositoryRoot $RepositoryRoot > $null

# Enforce the machine-readable effective geography contract.
& (Join-Path $PSScriptRoot 'Test-Qmbt2rDirectLocation.ps1') -RepositoryRoot $RepositoryRoot > $null

$amendment = Read-Text 'docs/QMBT_2R_PROTOCOL_DIRECT_LOCATION_AMENDMENT.md'
$expectedHash = 'b67bb2517457b3b45cad74b218224e7c908452ed58dcb4e72923aac81768829f'
Assert-Amendment ((Get-Sha256 $amendment) -ceq $expectedHash) 'Frozen amendment text changed. Human review is required.'

$required = @(
    'Decision identifier: `QMBT-2R-LOC-DIRECT-QUERY-V1`',
    'Supersedes: `QMBT-2R-LOC-v1` for effective QMBT-2R city operationalization.',
    'No pre-Seed Qloo locality Entity Search or unique `urn:entity:locality` resolution is required before the Seed Commit.',
    'The effective machine-readable city geography contract is `config/qmbt-2r/direct-location-queries-v1.json`.',
    'Every place retrieval uses `filter.location.radius=0`.',
    '`filter.location` locality UUIDs, WKT points or polygons, geohashes, coordinate fallbacks, and `signal.location` are prohibited for this policy.',
    'The Seed Commit contains reviewed city identities and the frozen direct-query manifest values; Qloo locality IDs are not required.',
    'Total registered shape: 4 cases × 3 conditions × 6 categories = 72 category retrieval requests.',
    'The exact Istanbul and London `filter.location.query` strings must be frozen in a separately reviewed development manifest before live authorization.',
    'No live Qloo call, Seed Commit, holdout ranking, profile-seed resolution, or confirmatory execution is authorized by this amendment.'
)
foreach ($fragment in $required) {
    Assert-Amendment ($amendment.Contains($fragment)) "Required amendment fragment missing: $fragment"
}

Write-Output 'QMBT-2R direct-location protocol amendment validation passed: historical protocol preserved; QMBT-2R-LOC-DIRECT-QUERY-V1 supersession, manifest/radius/no-fallback contract, and development-only 72-request shape are frozen. No live calls executed.'