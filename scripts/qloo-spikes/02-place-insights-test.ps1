# Tarsima - Qloo Place Insights Spike
# Verified flow: Interstellar -> Istanbul places

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

$entityId = "057DA9D9-399B-437E-8BCA-A80E499125EF"
$city = "Istanbul"

$url = "https://hackathon.api.qloo.com/v2/insights" +
       "?filter.type=urn%3Aentity%3Aplace" +
       "&signal.interests.entities=$entityId" +
       "&filter.location.query=$city" +
       "&filter.location.radius=0" +
       "&take=20"

$places = Invoke-RestMethod `
    -Uri $url `
    -Headers $headers `
    -Method Get

$places.results.entities |
    Select-Object `
        name,
        entity_id,
        @{Name="affinity";Expression={$_.query.affinity}},
        @{Name="address";Expression={$_.properties.address}} |
    Format-Table -AutoSize
