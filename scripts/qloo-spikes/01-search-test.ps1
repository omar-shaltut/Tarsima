# TastePassport - Qloo Search Spike
# Verified working test: Interstellar entity resolution

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

$query = [uri]::EscapeDataString("Interstellar")

$result = Invoke-RestMethod `
    -Uri "https://hackathon.api.qloo.com/search?query=$query" `
    -Headers $headers `
    -Method Get

$result.results |
    Select-Object `
        name,
        entity_id,
        @{Name="types";Expression={$_.types -join ", "}} |
    Format-Table -AutoSize
