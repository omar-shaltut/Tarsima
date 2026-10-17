# TastePassport - Taste Translation Validation Spike
# Purpose: test whether cross-domain seeds materially change Qloo local-place results.
# This script intentionally excludes LLM planning, agentic refinement, and compliance verdicts.

param(
    [string]$City = "Istanbul",
    [int]$Take = 25,
    [string]$OutputRoot = "artifacts/taste-translation-validation"
)

if (-not $headers -or -not $headers["X-Api-Key"]) {
    throw "Qloo authentication header is missing. Create `$headers first."
}

$ErrorActionPreference = "Stop"
$baseUrl = "https://hackathon.api.qloo.com"
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$runDir = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Test-QlooEntityType {
    param($Entity, [string]$ExpectedType)

    $types = @()
    if ($Entity.types) { $types += @($Entity.types | ForEach-Object { [string]$_ }) }
    if ($Entity.subtype) { $types += [string]$Entity.subtype }
    if ($Entity.type -and $Entity.type -ne "urn:entity") { $types += [string]$Entity.type }

    return ($types -contains $ExpectedType)
}

function Resolve-TasteSeedStrict {
    param(
        [string]$Name,
        [string]$ExpectedType
    )

    $encodedName = [uri]::EscapeDataString($Name)
    $url = "$baseUrl/search?query=$encodedName&take=20"
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $results = @($response.results)

    $exact = @(
        $results |
        Where-Object {
            $_.name -ieq $Name -and (Test-QlooEntityType $_ $ExpectedType)
        }
    )

    if ($exact.Count -eq 1) {
        $match = $exact[0]
        return [PSCustomObject]@{
            InputName    = $Name
            ResolvedName = [string]$match.name
            ExpectedType = $ExpectedType
            EntityId     = [string]$match.entity_id
            Status       = "RESOLVED"
            Candidates   = @()
        }
    }

    $typedCandidates = @(
        $results |
        Where-Object { Test-QlooEntityType $_ $ExpectedType } |
        Select-Object -First 10 |
        ForEach-Object {
            [PSCustomObject]@{
                Name     = [string]$_.name
                EntityId = [string]$_.entity_id
            }
        }
    )

    return [PSCustomObject]@{
        InputName    = $Name
        ResolvedName = $null
        ExpectedType = $ExpectedType
        EntityId     = $null
        Status       = if ($exact.Count -gt 1) { "AMBIGUOUS_EXACT_MATCH" } else { "UNRESOLVED" }
        Candidates   = $typedCandidates
    }
}

function Get-FlatValue {
    param($Value)

    if ($null -eq $Value) { return @() }
    if ($Value -is [string]) { return @([string]$Value) }

    if ($Value -is [System.Collections.IEnumerable]) {
        $output = @()
        foreach ($item in $Value) {
            if ($null -eq $item) { continue }
            if ($item.PSObject.Properties['name']) {
                $output += [string]$item.name
            } else {
                $output += [string]$item
            }
        }
        return @($output)
    }

    return @([string]$Value)
}

function Get-PlaceCategoryTokens {
    param($Place)

    $parts = @()
    foreach ($propertyName in @('category','categories','type','types','subtype','subtypes')) {
        if ($Place.PSObject.Properties[$propertyName]) {
            $parts += Get-FlatValue $Place.$propertyName
        }
        if ($Place.properties -and $Place.properties.PSObject.Properties[$propertyName]) {
            $parts += Get-FlatValue $Place.properties.$propertyName
        }
    }

    if ($Place.tags) {
        $parts += @($Place.tags | ForEach-Object { if ($_.name) { [string]$_.name } })
    }

    return @(
        $parts |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        ForEach-Object { $_.Trim().ToLowerInvariant() } |
        Sort-Object -Unique
    )
}

function Test-FoodSignal {
    param([array]$Tokens, [string]$Name)

    $text = ((@($Tokens) + @($Name)) -join ' ').ToLowerInvariant()
    return ($text -match '\brestaurant\b|\bcafe\b|\bcoffee\b|\bbakery\b|\bfood\b|\bdessert\b|\bice cream\b|\bdining\b|\bkebab\b')
}

function Convert-PlaceForExport {
    param($Place, [int]$Rank)

    $tokens = Get-PlaceCategoryTokens $Place
    $address = $null
    if ($Place.properties -and $Place.properties.address) {
        $address = [string]$Place.properties.address
    }

    $affinity = $null
    if ($Place.query -and $null -ne $Place.query.affinity) {
        $affinity = [double]$Place.query.affinity
    }

    return [PSCustomObject]@{
        Rank           = $Rank
        Name           = [string]$Place.name
        EntityId       = [string]$Place.entity_id
        Affinity       = $affinity
        Address        = $address
        CategoryTokens = @($tokens)
        FoodSignal     = [bool](Test-FoodSignal -Tokens $tokens -Name ([string]$Place.name))
    }
}

function Get-QlooPlaces {
    param(
        [array]$ResolvedSeeds,
        [string]$City,
        [int]$Take
    )

    $ids = @($ResolvedSeeds | ForEach-Object { $_.EntityId })
    if ($ids.Count -eq 0) { throw "Arm has no resolved seeds." }

    $entityList = $ids -join ','
    $encodedEntities = [uri]::EscapeDataString($entityList)
    $encodedCity = [uri]::EscapeDataString($City)

    $url = "$baseUrl/v2/insights" +
           "?filter.type=urn%3Aentity%3Aplace" +
           "&signal.interests.entities=$encodedEntities" +
           "&filter.location.query=$encodedCity" +
           "&filter.location.radius=0" +
           "&take=$Take"

    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $entities = @($response.results.entities)

    $exported = @()
    for ($i = 0; $i -lt $entities.Count; $i++) {
        $exported += Convert-PlaceForExport -Place $entities[$i] -Rank ($i + 1)
    }

    return [PSCustomObject]@{
        RequestUrl = $url
        Candidates = @($exported)
    }
}

function Get-Jaccard {
    param([array]$A, [array]$B)

    $aIds = @($A | ForEach-Object { $_.EntityId } | Where-Object { $_ } | Sort-Object -Unique)
    $bIds = @($B | ForEach-Object { $_.EntityId } | Where-Object { $_ } | Sort-Object -Unique)
    $shared = @($aIds | Where-Object { $bIds -contains $_ })
    $union = @($aIds + $bIds | Sort-Object -Unique)

    if ($union.Count -eq 0) { return 0.0 }
    return [double]($shared.Count / $union.Count)
}

function Get-TopKOverlap {
    param([array]$A, [array]$B, [int]$K = 10)

    $aIds = @($A | Select-Object -First $K | ForEach-Object { $_.EntityId })
    $bIds = @($B | Select-Object -First $K | ForEach-Object { $_.EntityId })
    if ($K -le 0) { return 0.0 }
    $shared = @($aIds | Where-Object { $bIds -contains $_ } | Sort-Object -Unique)
    return [double]($shared.Count / $K)
}

function Get-TokenFrequency {
    param([array]$Candidates)

    $freq = @{}
    foreach ($candidate in $Candidates) {
        foreach ($token in @($candidate.CategoryTokens)) {
            if (-not $freq.ContainsKey($token)) { $freq[$token] = 0 }
            $freq[$token]++
        }
    }

    return @(
        $freq.GetEnumerator() |
        Sort-Object Value -Descending, Name |
        Select-Object -First 30 |
        ForEach-Object {
            [PSCustomObject]@{ Token = $_.Name; Count = $_.Value }
        }
    )
}

function New-ArmDefinition {
    param([string]$ProfileId, [string]$ArmId, [array]$Seeds)
    return [PSCustomObject]@{
        ProfileId = $ProfileId
        ArmId      = $ArmId
        Seeds      = @($Seeds)
    }
}

$profiles = @{
    A = @(
        [PSCustomObject]@{ Name = 'Interstellar';      Type = 'urn:entity:movie' }
        [PSCustomObject]@{ Name = 'MUJI';              Type = 'urn:entity:brand' }
        [PSCustomObject]@{ Name = 'The Martian';       Type = 'urn:entity:book' }
    )
    B = @(
        [PSCustomObject]@{ Name = 'Ratatouille';       Type = 'urn:entity:movie' }
        [PSCustomObject]@{ Name = 'IKEA';              Type = 'urn:entity:brand' }
        [PSCustomObject]@{ Name = 'The Little Prince'; Type = 'urn:entity:book' }
    )
}

Write-Host "Resolving seeds strictly..."
$resolvedProfiles = @{}
$resolutionFailures = @()

foreach ($profileId in @('A','B')) {
    $resolved = @()
    foreach ($seed in $profiles[$profileId]) {
        $r = Resolve-TasteSeedStrict -Name $seed.Name -ExpectedType $seed.Type
        $resolved += $r
        Write-Host ("[{0}] {1} -> {2}" -f $profileId, $seed.Name, $r.Status)
        if ($r.Status -ne 'RESOLVED') { $resolutionFailures += $r }
    }
    $resolvedProfiles[$profileId] = @($resolved)
}

$resolutionPath = Join-Path $runDir 'seed-resolution.json'
$resolvedProfiles | ConvertTo-Json -Depth 10 | Set-Content -Path $resolutionPath -Encoding UTF8

if ($resolutionFailures.Count -gt 0) {
    Write-Host ""
    Write-Host "VALIDATION STOPPED: one or more seeds did not resolve exactly."
    Write-Host "Inspect:" $resolutionPath
    $resolutionFailures | Format-Table InputName, ExpectedType, Status -AutoSize
    exit 2
}

$arms = @()
foreach ($profileId in @('A','B')) {
    $otherProfileId = if ($profileId -eq 'A') { 'B' } else { 'A' }
    $targetSeeds = @($resolvedProfiles[$profileId])
    $counterSeeds = @($resolvedProfiles[$otherProfileId])

    $arms += New-ArmDefinition $profileId 'TARGET' $targetSeeds
    $arms += New-ArmDefinition $profileId 'COUNTERPROFILE' $counterSeeds

    for ($i = 0; $i -lt $targetSeeds.Count; $i++) {
        $ablated = @()
        for ($j = 0; $j -lt $targetSeeds.Count; $j++) {
            if ($j -ne $i) { $ablated += $targetSeeds[$j] }
        }
        $arms += New-ArmDefinition $profileId ("ABLATE_{0}" -f ($i + 1)) $ablated
        $arms += New-ArmDefinition $profileId ("SINGLE_{0}" -f ($i + 1)) @($targetSeeds[$i])
    }
}

$runResults = @()
foreach ($arm in $arms) {
    Write-Host ("Running {0}/{1}..." -f $arm.ProfileId, $arm.ArmId)
    try {
        $qloo = Get-QlooPlaces -ResolvedSeeds $arm.Seeds -City $City -Take $Take
        $candidates = @($qloo.Candidates)
        $foodCount = @($candidates | Where-Object FoodSignal).Count
        $foodShare = if ($candidates.Count -gt 0) { [double]($foodCount / $candidates.Count) } else { 0.0 }

        $result = [PSCustomObject]@{
            ProfileId       = $arm.ProfileId
            ArmId           = $arm.ArmId
            City            = $City
            TimestampUtc    = (Get-Date).ToUniversalTime().ToString('o')
            Seeds           = @($arm.Seeds | Select-Object InputName, ResolvedName, ExpectedType, EntityId)
            RequestUrl      = $qloo.RequestUrl
            CandidateCount  = $candidates.Count
            FoodSignalShare = $foodShare
            TokenFrequency  = @(Get-TokenFrequency $candidates)
            Candidates      = $candidates
            Status          = 'OK'
            Error           = $null
        }
    }
    catch {
        $result = [PSCustomObject]@{
            ProfileId       = $arm.ProfileId
            ArmId           = $arm.ArmId
            City            = $City
            TimestampUtc    = (Get-Date).ToUniversalTime().ToString('o')
            Seeds           = @($arm.Seeds | Select-Object InputName, ResolvedName, ExpectedType, EntityId)
            RequestUrl      = $null
            CandidateCount  = 0
            FoodSignalShare = $null
            TokenFrequency  = @()
            Candidates      = @()
            Status          = 'FAILED'
            Error           = $_.Exception.Message
        }
    }

    $runResults += $result
    $armFile = ("{0}-{1}.json" -f $arm.ProfileId, $arm.ArmId).ToLowerInvariant()
    $result | ConvertTo-Json -Depth 12 | Set-Content -Path (Join-Path $runDir $armFile) -Encoding UTF8
}

$comparisons = @()
foreach ($profileId in @('A','B')) {
    $target = $runResults | Where-Object { $_.ProfileId -eq $profileId -and $_.ArmId -eq 'TARGET' -and $_.Status -eq 'OK' } | Select-Object -First 1
    if (-not $target) { continue }

    foreach ($other in ($runResults | Where-Object { $_.ProfileId -eq $profileId -and $_.ArmId -ne 'TARGET' -and $_.Status -eq 'OK' })) {
        $comparisons += [PSCustomObject]@{
            ProfileId   = $profileId
            AgainstArm  = $other.ArmId
            Jaccard     = Get-Jaccard -A $target.Candidates -B $other.Candidates
            Top10Overlap = Get-TopKOverlap -A $target.Candidates -B $other.Candidates -K 10
        }
    }
}

$blindPackets = @()
foreach ($profileId in @('A','B')) {
    $profileRuns = @($runResults | Where-Object { $_.ProfileId -eq $profileId -and $_.Status -eq 'OK' -and $_.ArmId -in @('TARGET','COUNTERPROFILE') })
    if ($profileRuns.Count -lt 2) { continue }

    $lists = @()
    foreach ($run in $profileRuns) {
        $lists += [PSCustomObject]@{
            HiddenArmKey = $run.ArmId
            Places = @($run.Candidates | Select-Object -First 10 | Select-Object Name, Address)
        }
    }

    $randomized = @($lists | Sort-Object { Get-Random })
    $letter = [byte][char]'A'
    $publicLists = @()
    $answerKey = @()
    foreach ($list in $randomized) {
        $label = [char]$letter
        $publicLists += [PSCustomObject]@{ Label = [string]$label; Places = $list.Places }
        $answerKey += [PSCustomObject]@{ Label = [string]$label; Arm = $list.HiddenArmKey }
        $letter++
    }

    $blindPackets += [PSCustomObject]@{
        ProfileId = $profileId
        Seeds = @($resolvedProfiles[$profileId] | Select-Object InputName, ExpectedType)
        Lists = $publicLists
        AnswerKey = $answerKey
    }
}

$summary = [PSCustomObject]@{
    RunId        = $timestamp
    City         = $City
    Take         = $Take
    Profiles     = @('A','B')
    ArmCount     = $runResults.Count
    FailedArms   = @($runResults | Where-Object Status -eq 'FAILED' | Select-Object ProfileId, ArmId, Error)
    Comparisons  = $comparisons
    ArmSummary   = @($runResults | Select-Object ProfileId, ArmId, Status, CandidateCount, FoodSignalShare)
}

$summary | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $runDir 'summary.json') -Encoding UTF8
$blindPackets | ForEach-Object {
    $public = [PSCustomObject]@{ ProfileId = $_.ProfileId; Seeds = $_.Seeds; Lists = $_.Lists }
    $public | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $runDir ("blind-{0}.json" -f $_.ProfileId.ToLowerInvariant())) -Encoding UTF8
}
$blindPackets | Select-Object ProfileId, AnswerKey | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $runDir 'blind-answer-key.json') -Encoding UTF8

Write-Host ""
Write-Host "=============================================="
Write-Host "TASTE TRANSLATION VALIDATION RUN COMPLETE"
Write-Host "=============================================="
Write-Host "Output:" $runDir
Write-Host ""
$summary.ArmSummary | Format-Table ProfileId, ArmId, Status, CandidateCount, @{Name='FoodShare';Expression={ if ($null -eq $_.FoodSignalShare) { '-' } else { '{0:P0}' -f $_.FoodSignalShare } }} -AutoSize
Write-Host ""
$comparisons | Format-Table ProfileId, AgainstArm, @{Name='Jaccard';Expression={'{0:P1}' -f $_.Jaccard}}, @{Name='Top10Overlap';Expression={'{0:P1}' -f $_.Top10Overlap}} -AutoSize
Write-Host ""
Write-Host "Blind packets and answer key were written separately. Do not show the answer key to evaluators."
