# Qloo fixed-pool API semantics diagnostic.
# NOT confirmatory evidence.
# Protocol: docs/QLOO_FIXED_POOL_DIAGNOSTIC.md

param(
    [string]$City = "Istanbul",
    [string]$CategoryTag = "urn:tag:category:place:art_gallery",
    [int]$Take = 3,
    [string]$OutputRoot = "artifacts/qloo-fixed-pool-diagnostic",
    [switch]$Execute
)

$ErrorActionPreference = "Stop"
$baseUrl = "https://hackathon.api.qloo.com"

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

if ($Take -ne 3) {
    throw "Diagnostic sample retrieval is frozen at Take=3."
}

if (-not $Execute) {
    Write-Host "DIAGNOSTIC SAFETY LOCK: no Qloo calls were made."
    Write-Host "Re-run with -Execute only after review and commit."
    exit 0
}

$profiles = @{
    E = @(
        "3A02361C-987B-4F7E-9AAD-071C3853AD92",
        "29B49E3F-A0EC-42C6-A453-38B1C20D8374",
        "439D7BFD-8F08-4248-AEDA-D816DD865C71"
    )
    F = @(
        "DF788007-B5EA-4F29-872B-96BCB8EEC42F",
        "84B18312-3C2B-41A9-863B-89651C2F6A2C",
        "6A4CF4C4-B833-44E1-A426-BB312130C9F3"
    )
}

function Convert-QlooEntities {
    param($Response)

    $rank = 1

    return @(
        foreach ($entity in @($Response.results.entities)) {
            $affinity = $null

            if ($entity.query -and $null -ne $entity.query.affinity) {
                $affinity = [double]$entity.query.affinity
            }

            [PSCustomObject]@{
                Rank     = $rank
                EntityId = [string]$entity.entity_id
                Name     = [string]$entity.name
                Affinity = $affinity
            }

            $rank++
        }
    )
}

function Invoke-SampleRetrieval {
    param(
        [string]$Condition
    )

    $tagParam = [uri]::EscapeDataString($CategoryTag)
    $cityParam = [uri]::EscapeDataString($City)

    $url = (
        "$baseUrl/v2/insights" +
        "?filter.type=urn%3Aentity%3Aplace" +
        "&filter.tags=$tagParam" +
        "&filter.location.query=$cityParam" +
        "&filter.location.radius=0"
    )

    if ($Condition -ne "UNSIGNALED_QLOO_BASELINE") {
        $seedParam = $profiles[$Condition] -join ","
        $url += "&signal.interests.entities=$seedParam"
    }

    $url += "&take=$Take"

    $response = Invoke-RestMethod `
        -Uri $url `
        -Headers $headers `
        -Method Get

    return [PSCustomObject]@{
        Condition  = $Condition
        RequestUrl = $url
        Results    = @(Convert-QlooEntities -Response $response)
    }
}

function Invoke-SingleEntityScore {
    param(
        [string]$EntityId,
        [string]$Condition,
        [int]$Repeat
    )

    $cityParam = [uri]::EscapeDataString($City)

    $url = (
        "$baseUrl/v2/insights" +
        "?filter.type=urn%3Aentity%3Aplace" +
        "&filter.results.entities=$EntityId" +
        "&filter.location.query=$cityParam" +
        "&filter.location.radius=0"
    )

    if ($Condition -ne "UNSIGNALED_QLOO_BASELINE") {
        $seedParam = $profiles[$Condition] -join ","
        $url += "&signal.interests.entities=$seedParam"
    }

    $url += "&take=1"

    $response = Invoke-RestMethod `
        -Uri $url `
        -Headers $headers `
        -Method Get

    $results = @(Convert-QlooEntities -Response $response)
    $returned = $null

    if ($results.Count -gt 0) {
        $returned = $results[0]
    }

    return [PSCustomObject]@{
        RequestedEntityId = $EntityId
        Condition         = $Condition
        Repeat            = $Repeat
        RequestUrl        = $url
        ReturnedCount     = $results.Count
        ReturnedEntityId  = if ($returned) { $returned.EntityId } else { $null }
        ReturnedName      = if ($returned) { $returned.Name } else { $null }
        Affinity          = if ($returned) { $returned.Affinity } else { $null }
        IdentityMatch     = (
            $results.Count -eq 1 -and
            $returned.EntityId -eq $EntityId
        )
    }
}

$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")

if ([System.IO.Path]::IsPathRooted($OutputRoot)) {
    $resolvedOutputRoot = $OutputRoot
} else {
    $resolvedOutputRoot = Join-Path (Get-Location).Path $OutputRoot
}

$runDir = Join-Path $resolvedOutputRoot $runId
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

Write-Host "Collecting diagnostic sample..."

$retrievalE = Invoke-SampleRetrieval -Condition "E"
$retrievalF = Invoke-SampleRetrieval -Condition "F"
$retrievalBaseline = Invoke-SampleRetrieval -Condition "UNSIGNALED_QLOO_BASELINE"

foreach ($retrieval in @($retrievalE, $retrievalF, $retrievalBaseline)) {
    if ($retrieval.Results.Count -ne $Take) {
        throw "Diagnostic sample retrieval for $($retrieval.Condition) returned $($retrieval.Results.Count), expected $Take."
    }
}

# Deterministic sample:
# first unique entity from E retrieval,
# then first unique entity from F retrieval,
# then first unique entity from baseline retrieval.
$used = @{}
$sample = @()

foreach ($retrieval in @($retrievalE, $retrievalF, $retrievalBaseline)) {
    $selected = $null

    foreach ($item in $retrieval.Results) {
        if (-not $used.ContainsKey($item.EntityId)) {
            $selected = $item
            break
        }
    }

    if ($null -eq $selected) {
        throw "Could not construct 3-entity unique diagnostic sample."
    }

    $used[$selected.EntityId] = $true

    $sample += [PSCustomObject]@{
        SourceCondition = $retrieval.Condition
        EntityId        = $selected.EntityId
        Name            = $selected.Name
    }
}

Write-Host "Testing single-entity scoring semantics..."

$conditions = @(
    "E",
    "F",
    "UNSIGNALED_QLOO_BASELINE"
)

$observations = @()

foreach ($entity in $sample) {
    foreach ($condition in $conditions) {
        foreach ($repeat in @(1, 2)) {
            Write-Host (
                "  {0} / {1} / repeat {2}" -f
                $entity.Name,
                $condition,
                $repeat
            )

            $observations += Invoke-SingleEntityScore `
                -EntityId $entity.EntityId `
                -Condition $condition `
                -Repeat $repeat
        }
    }
}

$identityFailures = @(
    $observations |
    Where-Object { -not $_.IdentityMatch }
)

$personalizedAffinityFailures = @(
    $observations |
    Where-Object {
        $_.Condition -in @("E", "F") -and
        $null -eq $_.Affinity
    }
)

$decision = if (
    $identityFailures.Count -eq 0 -and
    $personalizedAffinityFailures.Count -eq 0
) {
    "PASS_SINGLE_ENTITY_FIXED_POOL_VIABLE"
} else {
    "FAIL_SINGLE_ENTITY_FIXED_POOL_NOT_VIABLE"
}

$gitCommit = $null

try {
    $gitCommit = (git rev-parse HEAD 2>$null).Trim()
} catch {
    $gitCommit = $null
}

$record = [PSCustomObject]@{
    RunId                         = $runId
    Protocol                      = "QLOO_FIXED_POOL_DIAGNOSTIC"
    EvidenceClass                 = "DIAGNOSTIC_NOT_CONFIRMATORY"
    GitCommit                     = $gitCommit
    City                          = $City
    CategoryTag                   = $CategoryTag
    SampleRetrievalTake           = $Take
    Sample                        = $sample
    SampleRetrievals              = @(
        $retrievalE,
        $retrievalF,
        $retrievalBaseline
    )
    Observations                  = $observations
    IdentityFailureCount          = $identityFailures.Count
    PersonalizedAffinityFailures = $personalizedAffinityFailures.Count
    Decision                      = $decision
}

$json = $record | ConvertTo-Json -Depth 12

[System.IO.File]::WriteAllText(
    (Join-Path $runDir "diagnostic-result.json"),
    $json,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host ""
Write-Host "DIAGNOSTIC COMPLETE"
Write-Host "Run directory: $runDir"
Write-Host "Decision: $decision"
Write-Host "Identity failures: $($identityFailures.Count)"
Write-Host "Personalized affinity failures: $($personalizedAffinityFailures.Count)"
