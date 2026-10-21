$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$validator = Join-Path $PSScriptRoot 'Test-Qmbt2rDirectLocationProtocolAmendment.ps1'
$script:passed = 0

$fixtureFiles = @(
    'docs/QMBT_2R_PROTOCOL.md',
    'docs/QMBT_2R_PROTOCOL_DIRECT_LOCATION_AMENDMENT.md',
    'docs/QMBT_1_PROTOCOL.md',
    'docs/QMBT_1_INVALID_RUN_20261020.md',
    'docs/QLOO_FIXED_POOL_DIAGNOSTIC.md',
    'docs/QLOO_FIXED_POOL_DIAGNOSTIC_RESULT_20261020.md',
    'config/qmbt-2r/direct-location-queries-v1.json',
    '.github/workflows/validation.yml',
    '.github/workflows/qloo-evidence-audit.yml'
)

function New-Fixture {
    $root = Join-Path ([IO.Path]::GetTempPath()) ('qmbt2r-direct-amendment-' + [guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $root
    foreach ($relativePath in $fixtureFiles) {
        $source = Join-Path $repositoryRoot $relativePath
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
        $destination = Join-Path $root $relativePath
        $null = New-Item -ItemType Directory -Path (Split-Path $destination) -Force
        Copy-Item -LiteralPath $source -Destination $destination
    }
    return $root
}

function Assert-Rejected {
    param([string]$Name, [scriptblock]$Mutation)
    $root = New-Fixture
    try {
        & $Mutation $root
        $rejected = $false
        try { & $validator -RepositoryRoot $root > $null } catch {
            if ($_.Exception.Message -notlike 'QMBT-2R direct-location amendment validation failed:*' -and
                $_.Exception.Message -notlike 'QMBT-2R validation failed:*' -and
                $_.Exception.Message -notlike 'QMBT-2R direct-location validation failed:*') { throw }
            $rejected = $true
        }
        if (-not $rejected) { throw "Unsafe amendment mutation was accepted: $Name" }
        $script:passed++
    } finally {
        Remove-Item -LiteralPath $root -Recurse -Force
    }
}

& $validator -RepositoryRoot $repositoryRoot
$script:passed++

$mutations = @(
    @{ Name = 'Change successor policy'; Old = 'QMBT-2R-LOC-DIRECT-QUERY-V1'; New = 'QMBT-2R-LOC-DIRECT-QUERY-V2' },
    @{ Name = 'Remove supersession'; Old = 'Supersedes: `QMBT-2R-LOC-v1`'; New = 'Does not supersede: `QMBT-2R-LOC-v1`' },
    @{ Name = 'Require locality ID again'; Old = 'No pre-Seed Qloo locality Entity Search'; New = 'A pre-Seed Qloo locality Entity Search' },
    @{ Name = 'Change effective manifest'; Old = 'config/qmbt-2r/direct-location-queries-v1.json'; New = 'config/qmbt-2r/other.json' },
    @{ Name = 'Change radius'; Old = 'filter.location.radius=0'; New = 'filter.location.radius=1000' },
    @{ Name = 'Allow WKT fallback'; Old = 'WKT points or polygons'; New = 'WKT points or polygons are allowed fallback options and' },
    @{ Name = 'Allow query mutation'; Old = 'must not trigger query mutation'; New = 'may trigger query mutation' },
    @{ Name = 'Use locality IDs in Seed Commit'; Old = 'Qloo locality IDs are not required'; New = 'Qloo locality IDs are required' },
    @{ Name = 'Change development material'; Old = 'Pair2/Pair3 × Istanbul/London'; New = 'new holdout profiles × new holdout cities' },
    @{ Name = 'Change request count'; Old = '72 category retrieval requests'; New = '144 category retrieval requests' },
    @{ Name = 'Authorize live calls'; Old = 'No live Qloo call, Seed Commit, holdout ranking, profile-seed resolution, or confirmatory execution is authorized by this amendment.'; New = 'Live Qloo execution is authorized by this amendment.' }
)

foreach ($mutation in $mutations) {
    Assert-Rejected $mutation.Name {
        param($root)
        $path = Join-Path $root 'docs/QMBT_2R_PROTOCOL_DIRECT_LOCATION_AMENDMENT.md'
        $text = [IO.File]::ReadAllText($path)
        $text = $text.Replace($mutation.Old, $mutation.New)
        [IO.File]::WriteAllText($path, $text)
    }
}

Write-Output "QMBT-2R direct-location amendment mutation tests passed: $script:passed checks."