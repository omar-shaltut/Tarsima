# Tarsima - Personalization Comparison Spike
# Verified test:
# Same city (Istanbul), two different taste signals
# Interstellar vs Ratatouille

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

$baseUrl = "https://hackathon.api.qloo.com"
$city = "Istanbul"

$interstellarId = "057DA9D9-399B-437E-8BCA-A80E499125EF"
$ratatouilleId  = "414043B1-8210-4997-8110-9E8B40D06814"

function Get-IstanbulPlaces {
    param(
        [string]$EntityId,
        [int]$Take = 20
    )

    $url = "$baseUrl/v2/insights" +
           "?filter.type=urn%3Aentity%3Aplace" +
           "&signal.interests.entities=$EntityId" +
           "&filter.location.query=$city" +
           "&filter.location.radius=0" +
           "&take=$Take"

    $response = Invoke-RestMethod `
        -Uri $url `
        -Headers $headers `
        -Method Get

    return @($response.results.entities)
}

Write-Host ""
Write-Host "Querying Istanbul for Interstellar..."
$placesA = Get-IstanbulPlaces -EntityId $interstellarId

Write-Host "Querying Istanbul for Ratatouille..."
$placesB = Get-IstanbulPlaces -EntityId $ratatouilleId

Write-Host ""
Write-Host "======================================"
Write-Host "PROFILE A - INTERSTELLAR"
Write-Host "======================================"

$placesA |
    Select-Object `
        name,
        @{Name="affinity";Expression={$_.query.affinity}} |
    Format-Table -AutoSize

Write-Host ""
Write-Host "======================================"
Write-Host "PROFILE B - RATATOUILLE"
Write-Host "======================================"

$placesB |
    Select-Object `
        name,
        @{Name="affinity";Expression={$_.query.affinity}} |
    Format-Table -AutoSize

$aIds = @($placesA.entity_id)
$bIds = @($placesB.entity_id)

$shared = @(
    $placesA |
    Where-Object {
        $bIds -contains $_.entity_id
    }
)

$unionIds = @(
    $aIds + $bIds |
    Sort-Object -Unique
)

if ($unionIds.Count -gt 0) {
    $jaccard = $shared.Count / $unionIds.Count
}
else {
    $jaccard = 0
}

Write-Host ""
Write-Host "======================================"
Write-Host "PERSONALIZATION METRICS"
Write-Host "======================================"

Write-Host "Interstellar results:" $placesA.Count
Write-Host "Ratatouille results:" $placesB.Count
Write-Host "Shared places:" $shared.Count
Write-Host ("Jaccard overlap: {0:P2}" -f $jaccard)

Write-Host ""
Write-Host "Shared places:"

if ($shared.Count -eq 0) {
    Write-Host "None"
}
else {
    $shared |
        Select-Object `
            name,
            @{Name="affinity";Expression={$_.query.affinity}} |
        Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== Personalization comparison complete ==="
