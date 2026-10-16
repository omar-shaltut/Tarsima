# TastePassport - Quality + Compliance Gate v2.1
# Conservative MVP policy.
# REVIEW is a product/compliance state, not a religious ruling.
#
# Improvements over v2:
# - normalizes diacritics so Hotel / Hôtel are treated consistently,
# - checks lodging/medical/fitness against name + Qloo tags/category metadata,
# - treats an explicit Qloo "halal" tag as a metadata signal only,
# - deduplicates by entity_id before evaluation,
# - deduplicates PASS results by normalized display name before ACCEPT/REFINE,
# - keeps unknown categories in REVIEW rather than auto-displaying them.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

function Convert-ToNormalizedText {
    param([AllowNull()][string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    $formD = $Text.ToLowerInvariant().Normalize([System.Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder

    foreach ($char in $formD.ToCharArray()) {
        $category = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)

        if ($category -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }

    return (($builder.ToString().Normalize([System.Text.NormalizationForm]::FormC)) -replace '\s+', ' ').Trim()
}

function Convert-ToFlatText {
    param($Value)

    if ($null -eq $Value) {
        return ""
    }

    if ($Value -is [string]) {
        return [string]$Value
    }

    if ($Value -is [System.Collections.IEnumerable]) {
        $parts = @()
        foreach ($item in $Value) {
            if ($null -ne $item) {
                if ($item.PSObject.Properties['name']) {
                    $parts += [string]$item.name
                }
                else {
                    $parts += [string]$item
                }
            }
        }
        return ($parts -join ' ')
    }

    return [string]$Value
}

function Get-PlaceEvidence {
    param($Place)

    $rawName = [string]$Place.name

    $tagNames = @()
    if ($Place.tags) {
        $tagNames = @(
            $Place.tags |
            ForEach-Object {
                if ($_.name) { [string]$_.name }
            }
        )
    }

    $categoryParts = @()

    foreach ($propertyName in @('category','categories','type','types','subtype','subtypes')) {
        if ($Place.PSObject.Properties[$propertyName]) {
            $categoryParts += Convert-ToFlatText $Place.$propertyName
        }

        if ($Place.properties -and $Place.properties.PSObject.Properties[$propertyName]) {
            $categoryParts += Convert-ToFlatText $Place.properties.$propertyName
        }
    }

    $nameText = Convert-ToNormalizedText $rawName
    $tagsText = Convert-ToNormalizedText ($tagNames -join ' ')
    $categoryText = Convert-ToNormalizedText ($categoryParts -join ' ')

    [PSCustomObject]@{
        RawName       = $rawName
        Name          = $nameText
        Tags          = $tagsText
        Categories    = $categoryText
        Classification = ("$nameText $tagsText $categoryText" -replace '\s+', ' ').Trim()
    }
}

function Find-Pattern {
    param(
        [string]$Text,
        [array]$Patterns
    )

    foreach ($pattern in $Patterns) {
        if ($Text -match $pattern) {
            return $pattern
        }
    }

    return $null
}

function New-GateResult {
    param(
        $Place,
        [string]$Status,
        [string]$Reason,
        [string]$Evidence,
        [string]$NormalizedName
    )

    [PSCustomObject]@{
        Name           = $Place.name
        NormalizedName = $NormalizedName
        Affinity       = [math]::Round([double]$Place.query.affinity,4)
        Status         = $Status
        Reason         = $Reason
        Evidence       = $Evidence
        EntityId       = $Place.entity_id
    }
}

function Get-UniqueEntities {
    param([array]$Places)

    $seen = @{}
    $output = @()

    foreach ($place in ($Places | Sort-Object { [double]$_.query.affinity } -Descending)) {
        $key = if ($place.entity_id) {
            [string]$place.entity_id
        }
        else {
            $fallbackName = Convert-ToNormalizedText ([string]$place.name)
            $fallbackAddress = ""
            if ($place.properties -and $place.properties.address) {
                $fallbackAddress = Convert-ToNormalizedText ([string]$place.properties.address)
            }
            "$fallbackName|$fallbackAddress"
        }

        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $output += $place
        }
    }

    return @($output)
}

function Get-DistinctPassesByName {
    param([array]$Results)

    $seen = @{}
    $output = @()

    foreach ($result in ($Results | Where-Object Status -eq 'PASS' | Sort-Object Affinity -Descending)) {
        $key = if ([string]::IsNullOrWhiteSpace($result.NormalizedName)) {
            [string]$result.EntityId
        }
        else {
            [string]$result.NormalizedName
        }

        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $output += $result
        }
    }

    return @($output)
}

function Evaluate-PlaceV21 {
    param($Place)

    $e = Get-PlaceEvidence $Place
    $text = $e.Classification

    # 1. Hard quality exclusions
    $lodgingPattern = Find-Pattern -Text $text -Patterns @(
        '\bhotel\b', '\bhostel\b', '\blodge\b', '\bresort\b',
        '\bsuites?\b', '\bguesthouse\b', '\bguest house\b',
        '\blodging\b', '\baccommodation\b', '\bbed and breakfast\b',
        '\bboutique hotel\b'
    )

    if ($lodgingPattern) {
        return New-GateResult $Place 'REJECT' 'OFF_SCOPE_LODGING' $lodgingPattern $e.Name
    }

    $medicalPattern = Find-Pattern -Text $text -Patterns @(
        '\bhospital\b', '\bmedical\b', '\bclinic\b', '\bplastic surgery\b',
        '\bhair transplant\b', '\bdental\b', '\bdentist\b',
        '\bcerrahi\b', '\bsac ekimi\b', '\bdis estetigi\b'
    )

    if ($medicalPattern) {
        return New-GateResult $Place 'REJECT' 'OFF_SCOPE_MEDICAL' $medicalPattern $e.Name
    }

    $fitnessPattern = Find-Pattern -Text $text -Patterns @(
        '\bgym\b', '\bfitness\b', '\bcardio equipment\b', '\bpersonal training\b'
    )

    if ($fitnessPattern) {
        return New-GateResult $Place 'REJECT' 'OFF_SCOPE_FITNESS' $fitnessPattern $e.Name
    }

    # 2. Deterministic compliance block from explicit Qloo metadata/name signals
    $blockedPattern = Find-Pattern -Text $text -Patterns @(
        '\bcasino\b', '\bgambling\b', '\bbetting\b', '\bsportsbook\b',
        '\bnightclub\b', '\bstrip club\b', '\badult entertainment\b',
        '\bwinery\b', '\bwine\b', '\bbeer\b', '\bbrewery\b',
        '\bliquor\b', '\balcohol\b', '\bcocktails?\b',
        '\bfull bar\b', '\bbar onsite\b', '\brooftop bar\b'
    )

    if ($blockedPattern) {
        return New-GateResult $Place 'BLOCK' 'BLOCKED_CATEGORY' $blockedPattern $e.Name
    }

    # 3. Conservative review queue. REVIEW is not a religious ruling.
    $reviewPattern = Find-Pattern -Text $text -Patterns @(
        '\bhookah\b', '\bshisha\b',
        '\bhamam\b', '\bhammam\b', '\bspa\b', '\bmassage\b',
        '\bchurch\b', '\bcathedral\b', '\bsynagogue\b', '\btemple\b',
        '\bnightlife\b'
    )

    if ($reviewPattern) {
        return New-GateResult $Place 'REVIEW' 'POLICY_REVIEW_REQUIRED' $reviewPattern $e.Name
    }

    # 4. Food/cafe detection.
    # A PASS here means only that Qloo supplied an explicit halal metadata tag.
    # It is not an independent certification or guarantee by TastePassport.
    $foodPattern = Find-Pattern -Text $text -Patterns @(
        '\brestaurant\b', '\bcafe\b', '\bcoffee\b', '\bbakery\b',
        '\bkebab\b', '\bfood\b', '\bice cream\b', '\bdessert\b', '\bdining\b'
    )

    if ($foodPattern) {
        $halalPattern = Find-Pattern -Text $e.Tags -Patterns @('\bhalal\b')

        if ($halalPattern) {
            return New-GateResult $Place 'PASS' 'QLOO_EXPLICIT_HALAL_SIGNAL' $halalPattern $e.Name
        }

        return New-GateResult $Place 'REVIEW' 'FOOD_HALAL_STATUS_UNKNOWN' $foodPattern $e.Name
    }

    # 5. Positive non-food discovery categories
    $positivePattern = Find-Pattern -Text $text -Patterns @(
        '\bmosque\b', '\bpark\b', '\bbridge\b', '\bmuseum\b',
        '\blandmark\b', '\bhistoric\b', '\bhistorical\b',
        '\bmonument\b', '\bmarket\b', '\bbookstore\b', '\blibrary\b',
        '\baqueduct\b', '\bfountain\b', '\bnature\b',
        '\bwalking paths?\b', '\bcultural\b'
    )

    if ($positivePattern) {
        return New-GateResult $Place 'PASS' 'RELEVANT_NONFOOD_PLACE' $positivePattern $e.Name
    }

    # 6. Unknown category: do not auto-display solely because Qloo affinity is high
    return New-GateResult $Place 'REVIEW' 'QUALITY_OR_CATEGORY_UNCLEAR' '' $e.Name
}

$uniquePlacesA = Get-UniqueEntities @($placesA)
$uniquePlacesB = Get-UniqueEntities @($placesB)

$gateA21 = @($uniquePlacesA | ForEach-Object { Evaluate-PlaceV21 $_ })
$gateB21 = @($uniquePlacesB | ForEach-Object { Evaluate-PlaceV21 $_ })

function Show-GateV21 {
    param(
        [string]$Profile,
        [array]$OriginalPlaces,
        [array]$UniquePlaces,
        [array]$Results
    )

    $pass = @($Results | Where-Object Status -eq 'PASS')
    $review = @($Results | Where-Object Status -eq 'REVIEW')
    $block = @($Results | Where-Object Status -eq 'BLOCK')
    $reject = @($Results | Where-Object Status -eq 'REJECT')
    $displayPass = Get-DistinctPassesByName $Results

    Write-Host ""
    Write-Host "=============================================="
    Write-Host " $Profile - GATE V2.1"
    Write-Host "=============================================="

    $Results |
        Select-Object Name, Affinity, Status, Reason, Evidence |
        Format-Table -AutoSize -Wrap

    Write-Host ""
    Write-Host "RAW CANDIDATES:" $OriginalPlaces.Count
    Write-Host "UNIQUE ENTITIES:" $UniquePlaces.Count
    Write-Host "PASS:" $pass.Count
    Write-Host "REVIEW:" $review.Count
    Write-Host "BLOCK:" $block.Count
    Write-Host "REJECT:" $reject.Count
    Write-Host "DISTINCT DISPLAY PASS:" $displayPass.Count

    Write-Host ""
    Write-Host "AUTO-DISPLAY:"

    if ($displayPass.Count -eq 0) {
        Write-Host "None"
    }
    else {
        $displayPass |
            Select-Object Name, Affinity, Reason |
            Format-Table -AutoSize
    }

    Write-Host ""
    Write-Host "AGENT DECISION:"

    if ($displayPass.Count -ge 5) {
        Write-Host "ACCEPT"
    }
    else {
        Write-Host "REFINE"
        Write-Host "Reason: fewer than 5 distinct PASS candidates."
    }
}

Show-GateV21 -Profile 'PROFILE A' -OriginalPlaces @($placesA) -UniquePlaces $uniquePlacesA -Results $gateA21
Show-GateV21 -Profile 'PROFILE B' -OriginalPlaces @($placesB) -UniquePlaces $uniquePlacesB -Results $gateB21

Write-Host ""
Write-Host "=============================================="
Write-Host " GATE V2.1 TEST COMPLETE"
Write-Host "=============================================="
