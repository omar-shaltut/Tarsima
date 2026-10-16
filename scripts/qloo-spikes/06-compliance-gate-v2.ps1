# TastePassport - Quality + Compliance Gate v2
# Conservative MVP policy.
# REVIEW is a product/compliance state, not a religious ruling.
# This version fixes Gate v1 issues by:
# - rejecting fitness/off-scope categories,
# - requiring explicit evidence before food places PASS,
# - keeping unknown categories in REVIEW,
# - aligning Evidence with the final decision reason.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

function Get-PlaceEvidence {
    param($Place)

    $name = if ($Place.name) {
        ([string]$Place.name).ToLowerInvariant()
    } else { "" }

    $tags = @()
    if ($Place.tags) {
        $tags = @(
            $Place.tags |
            ForEach-Object {
                if ($_.name) { ([string]$_.name).ToLowerInvariant() }
            }
        )
    }

    $tagText = ($tags -join " ")

    $description = ""
    if ($Place.properties -and $Place.properties.description) {
        $description = ([string]$Place.properties.description).ToLowerInvariant()
    }

    [PSCustomObject]@{
        Name        = $name
        Tags        = $tagText
        Description = $description
        Full        = "$name $tagText $description"
    }
}

function Find-Pattern {
    param([string]$Text, [array]$Patterns)

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
        [string]$Evidence
    )

    [PSCustomObject]@{
        Name     = $Place.name
        Affinity = [math]::Round([double]$Place.query.affinity,4)
        Status   = $Status
        Reason   = $Reason
        Evidence = $Evidence
        EntityId = $Place.entity_id
    }
}

function Evaluate-PlaceV2 {
    param($Place)

    $e = Get-PlaceEvidence $Place

    # 1. Hard quality exclusions
    $lodgingPattern = Find-Pattern -Text $e.Name -Patterns @(
        '\bhotel\b', '\bhostel\b', '\blodge\b', '\bresort\b',
        '\bsuites?\b', '\bguesthouse\b'
    )

    if ($lodgingPattern) {
        return New-GateResult $Place "REJECT" "OFF_SCOPE_LODGING" $lodgingPattern
    }

    $medicalPattern = Find-Pattern -Text $e.Full -Patterns @(
        '\bhospital\b', '\bmedical clinic\b', '\bplastic surgery\b',
        '\bhair transplant\b', '\bdental aesthetics?\b',
        '\bcerrahi\b', '\bsaç ekimi\b', '\bdiş estetiği\b'
    )

    if ($medicalPattern) {
        return New-GateResult $Place "REJECT" "OFF_SCOPE_MEDICAL" $medicalPattern
    }

    $fitnessPattern = Find-Pattern -Text $e.Full -Patterns @(
        '\bgym\b', '\bfitness\b', '\bcardio equipment\b', '\bpersonal training\b'
    )

    if ($fitnessPattern) {
        return New-GateResult $Place "REJECT" "OFF_SCOPE_FITNESS" $fitnessPattern
    }

    # 2. Deterministic compliance block from explicit metadata
    $blockedPattern = Find-Pattern -Text $e.Full -Patterns @(
        '\bcasino\b', '\bgambling\b', '\bbetting\b', '\bsportsbook\b',
        '\bnightclub\b', '\bstrip club\b', '\badult entertainment\b',
        '\bwinery\b', '\bwine\b', '\bbeer\b', '\bbrewery\b',
        '\bliquor\b', '\balcohol\b', '\bcocktails?\b',
        '\bfull bar\b', '\bbar onsite\b', '\brooftop bar\b'
    )

    if ($blockedPattern) {
        return New-GateResult $Place "BLOCK" "BLOCKED_CATEGORY" $blockedPattern
    }

    # 3. Policy / fiqh review queue
    $reviewPattern = Find-Pattern -Text $e.Full -Patterns @(
        '\bhookah\b', '\bshisha\b',
        '\bhamam\b', '\bhammam\b', '\bspa\b', '\bmassage\b',
        '\bchurch\b', '\bcathedral\b', '\bsynagogue\b', '\btemple\b',
        '\bnightlife\b'
    )

    if ($reviewPattern) {
        return New-GateResult $Place "REVIEW" "POLICY_REVIEW_REQUIRED" $reviewPattern
    }

    # 4. Food/cafe detection: do not infer halal status from silence
    $foodPattern = Find-Pattern -Text $e.Full -Patterns @(
        '\brestaurant\b', '\bcafe\b', '\bcoffee\b', '\bbakery\b',
        '\bkebab\b', '\bfood\b', '\bice cream\b', '\bdessert\b', '\bdining\b'
    )

    if ($foodPattern) {
        $halalPattern = Find-Pattern -Text $e.Full -Patterns @('\bhalal\b')

        if ($halalPattern) {
            return New-GateResult $Place "PASS" "FOOD_WITH_EXPLICIT_HALAL_SIGNAL" $halalPattern
        }

        return New-GateResult $Place "REVIEW" "FOOD_HALAL_STATUS_UNKNOWN" $foodPattern
    }

    # 5. Positive non-food discovery categories
    $positivePattern = Find-Pattern -Text $e.Full -Patterns @(
        '\bmosque\b', '\bpark\b', '\bbridge\b', '\bmuseum\b',
        '\blandmark\b', '\bhistoric\b', '\bhistorical\b',
        '\bmonument\b', '\bmarket\b', '\bbookstore\b', '\blibrary\b',
        '\baqueduct\b', '\bfountain\b', '\bnature\b',
        '\bwalking paths?\b', '\bcultural\b'
    )

    if ($positivePattern) {
        return New-GateResult $Place "PASS" "RELEVANT_NONFOOD_PLACE" $positivePattern
    }

    # 6. Unknown category: never auto-display solely because affinity is high
    return New-GateResult $Place "REVIEW" "QUALITY_OR_CATEGORY_UNCLEAR" ""
}

$gateA2 = @($placesA | ForEach-Object { Evaluate-PlaceV2 $_ })
$gateB2 = @($placesB | ForEach-Object { Evaluate-PlaceV2 $_ })

function Show-GateV2 {
    param([string]$Profile, [array]$Results)

    Write-Host ""
    Write-Host "=============================================="
    Write-Host " $Profile - GATE V2"
    Write-Host "=============================================="

    $Results |
        Format-Table Name, Affinity, Status, Reason, Evidence -AutoSize -Wrap

    $pass   = @($Results | Where-Object Status -eq "PASS")
    $review = @($Results | Where-Object Status -eq "REVIEW")
    $block  = @($Results | Where-Object Status -eq "BLOCK")
    $reject = @($Results | Where-Object Status -eq "REJECT")

    Write-Host ""
    Write-Host "TOTAL:" $Results.Count
    Write-Host "PASS:" $pass.Count
    Write-Host "REVIEW:" $review.Count
    Write-Host "BLOCK:" $block.Count
    Write-Host "REJECT:" $reject.Count

    Write-Host ""
    Write-Host "AUTO-DISPLAY:"

    if ($pass.Count -eq 0) {
        Write-Host "None"
    } else {
        $pass | Format-Table Name, Affinity, Reason -AutoSize
    }

    Write-Host ""
    Write-Host "AGENT DECISION:"

    if ($pass.Count -ge 5) {
        Write-Host "ACCEPT"
    } else {
        Write-Host "REFINE"
        Write-Host "Reason: fewer than 5 PASS candidates."
    }
}

Show-GateV2 -Profile "PROFILE A" -Results $gateA2
Show-GateV2 -Profile "PROFILE B" -Results $gateB2

Write-Host ""
Write-Host "=============================================="
Write-Host " GATE V2 TEST COMPLETE"
Write-Host "=============================================="
