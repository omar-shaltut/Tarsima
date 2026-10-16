# TastePassport - Multi-Signal Personalization Spike
# Verified experiment structure:
# Profile A: Interstellar + MUJI + The Martian
# Profile B: Ratatouille + IKEA + The Little Prince
# Known limitation from the first run: IKEA did not resolve as urn:entity:brand.

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

$baseUrl = "https://hackathon.api.qloo.com"
$city = "Istanbul"

function Test-QlooEntityType {
    param($Entity, [string]$ExpectedType)

    $types = @()
    if ($Entity.types) { $types += @($Entity.types) }
    if ($Entity.subtype) { $types += [string]$Entity.subtype }
    if ($Entity.type -and $Entity.type -ne "urn:entity") { $types += [string]$Entity.type }

    return ($types -contains $ExpectedType)
}

function Resolve-TasteSeed {
    param([string]$Name, [string]$ExpectedType)

    Write-Host "Resolving:" $Name

    $encodedName = [uri]::EscapeDataString($Name)
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/search?query=$encodedName&take=20" `
        -Headers $headers `
        -Method Get

    $results = @($response.results)

    $match = $results |
        Where-Object {
            $_.name -ieq $Name -and
            (Test-QlooEntityType $_ $ExpectedType)
        } |
        Select-Object -First 1

    if (-not $match) {
        $match = $results |
            Where-Object { Test-QlooEntityType $_ $ExpectedType } |
            Select-Object -First 1
    }

    if (-not $match) {
        Write-Host "WARNING: Could not resolve expected type for $Name ($ExpectedType)"
        return $null
    }

    return [PSCustomObject]@{
        InputName    = $Name
        ResolvedName = $match.name
        ExpectedType = $ExpectedType
        EntityId     = $match.entity_id
    }
}

function Get-MultiSignalPlaces {
    param([array]$Seeds, [string]$City, [int]$Take = 25)

    $validSeeds = @($Seeds | Where-Object { $_ -and $_.EntityId })
    if ($validSeeds.Count -eq 0) {
        throw "No valid taste seeds available."
    }

    $entityList = (($validSeeds | ForEach-Object { $_.EntityId }) -join ",")
    $encodedEntities = [uri]::EscapeDataString($entityList)
    $encodedCity = [uri]::EscapeDataString($City)

    $url = "$baseUrl/v2/insights" +
           "?filter.type=urn%3Aentity%3Aplace" +
           "&signal.interests.entities=$encodedEntities" +
           "&filter.location.query=$encodedCity" +
           "&filter.location.radius=0" +
           "&take=$Take"

    $response = Invoke-RestMethod `
        -Uri $url `
        -Headers $headers `
        -Method Get

    return @($response.results.entities)
}

$profileA = @(
    Resolve-TasteSeed "Interstellar" "urn:entity:movie"
    Resolve-TasteSeed "MUJI" "urn:entity:brand"
    Resolve-TasteSeed "The Martian" "urn:entity:book"
) | Where-Object { $_ }

$profileB = @(
    Resolve-TasteSeed "Ratatouille" "urn:entity:movie"
    Resolve-TasteSeed "IKEA" "urn:entity:brand"
    Resolve-TasteSeed "The Little Prince" "urn:entity:book"
) | Where-Object { $_ }

Write-Host ""
Write-Host "PROFILE A RESOLVED"
$profileA | Format-Table InputName, ResolvedName, ExpectedType, EntityId -AutoSize

Write-Host ""
Write-Host "PROFILE B RESOLVED"
$profileB | Format-Table InputName, ResolvedName, ExpectedType, EntityId -AutoSize

Write-Host "Profile A valid seeds:" $profileA.Count
Write-Host "Profile B valid seeds:" $profileB.Count

if ($profileA.Count -lt 2 -or $profileB.Count -lt 2) {
    throw "A profile has fewer than two valid signals."
}

$placesA = Get-MultiSignalPlaces -Seeds $profileA -City $city
$placesB = Get-MultiSignalPlaces -Seeds $profileB -City $city

Write-Host ""
Write-Host "PROFILE A - TOP 15"
$placesA |
    Select-Object -First 15 `
        name,
        @{Name="affinity";Expression={[math]::Round([double]$_.query.affinity,4)}} |
    Format-Table -AutoSize

Write-Host ""
Write-Host "PROFILE B - TOP 15"
$placesB |
    Select-Object -First 15 `
        name,
        @{Name="affinity";Expression={[math]::Round([double]$_.query.affinity,4)}} |
    Format-Table -AutoSize

$aIds = @($placesA.entity_id)
$bIds = @($placesB.entity_id)

$shared = @($placesA | Where-Object { $bIds -contains $_.entity_id })
$unionIds = @($aIds + $bIds | Sort-Object -Unique)

$jaccard = if ($unionIds.Count -gt 0) {
    $shared.Count / $unionIds.Count
} else {
    0
}

Write-Host ""
Write-Host "MULTI-SIGNAL PERSONALIZATION METRICS"
Write-Host "City:" $city
Write-Host "Profile A seeds:" $profileA.Count
Write-Host "Profile B seeds:" $profileB.Count
Write-Host "Profile A places:" $placesA.Count
Write-Host "Profile B places:" $placesB.Count
Write-Host "Shared places:" $shared.Count
Write-Host ("Jaccard overlap: {0:P2}" -f $jaccard)

Write-Host ""
Write-Host "=== Multi-signal test complete ==="
