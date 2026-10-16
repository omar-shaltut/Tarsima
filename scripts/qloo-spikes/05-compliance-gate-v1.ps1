# TastePassport - Quality + Compliance Gate v1
# Historical spike preserved as tested.
# Known limitations discovered:
# - Trigger could disagree with the final Reason.
# - Food/cafe places could PASS without explicit halal evidence.
# - Some off-scope places such as gyms could survive.
# This version is kept for reproducibility; prefer Gate v2 for further work.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

function Get-PlaceSearchText {
    param($Place)

    $parts = @()
    if ($Place.name) { $parts += [string]$Place.name }

    if ($Place.tags) {
        $parts += @(
            $Place.tags |
            ForEach-Object {
                if ($_.name) { [string]$_.name }
            }
        )
    }

    if ($Place.properties) {
        if ($Place.properties.address) {
            $parts += [string]$Place.properties.address
        }
        if ($Place.properties.description) {
            $parts += [string]$Place.properties.description
        }
    }

    return (($parts -join " ") -replace '\s+', ' ').Trim().ToLowerInvariant()
}

function Get-QualityDecision {
    param($Place)

    $text = Get-PlaceSearchText $Place

    $medicalTerms = @(
        "hospital", "clinic", "medical", "surgery", "surgical",
        "plastic surgery", "dental", "dentist", "hair transplant",
        "aesthetic clinic", "medical aesthetic", "cerrahi",
        "saç ekimi", "diş estetiği"
    )

    foreach ($term in $medicalTerms) {
        if ($text.Contains($term)) {
            return [PSCustomObject]@{
                Status = "REJECT"
                Reason = "OFF_SCOPE_MEDICAL"
                Match  = $term
            }
        }
    }

    $lodgingTerms = @(
        "hotel", "hostel", "lodge", "lodging",
        "guesthouse", "guest house", "resort"
    )

    foreach ($term in $lodgingTerms) {
        if ($text.Contains($term)) {
            return [PSCustomObject]@{
                Status = "REJECT"
                Reason = "OFF_SCOPE_LODGING"
                Match  = $term
            }
        }
    }

    return [PSCustomObject]@{
        Status = "PASS"
        Reason = "RELEVANT"
        Match  = ""
    }
}

function Get-ComplianceDecision {
    param($Place)

    $text = Get-PlaceSearchText $Place

    $blockedTerms = @(
        "casino", "gambling", "betting", "sportsbook",
        "nightclub", "strip club", "adult entertainment",
        "wine", "winery", "beer", "brewery", "liquor",
        "cocktail", "cocktails", "full bar", "bar onsite",
        "rooftop bar", "alcohol"
    )

    foreach ($term in $blockedTerms) {
        if ($text.Contains($term)) {
            return [PSCustomObject]@{
                Status = "BLOCK"
                Reason = "BLOCKED_CATEGORY"
                Match  = $term
            }
        }
    }

    $reviewTerms = @(
        "hookah", "shisha", "hamam", "hammam", "spa", "massage",
        "church", "cathedral", "synagogue", "temple", "nightlife"
    )

    foreach ($term in $reviewTerms) {
        if ($text.Contains($term)) {
            return [PSCustomObject]@{
                Status = "REVIEW"
                Reason = "MANUAL_POLICY_REVIEW"
                Match  = $term
            }
        }
    }

    return [PSCustomObject]@{
        Status = "PASS"
        Reason = "NO_FLAG"
        Match  = ""
    }
}

function Evaluate-TastePassportPlace {
    param($Place)

    $quality = Get-QualityDecision $Place
    $compliance = Get-ComplianceDecision $Place

    $finalStatus = "PASS"
    $finalReason = "PASS"

    if ($quality.Status -eq "REJECT") {
        $finalStatus = "REJECT"
        $finalReason = $quality.Reason
    }

    if ($compliance.Status -eq "BLOCK") {
        $finalStatus = "BLOCK"
        $finalReason = $compliance.Reason
    }
    elseif ($compliance.Status -eq "REVIEW" -and $finalStatus -eq "PASS") {
        $finalStatus = "REVIEW"
        $finalReason = $compliance.Reason
    }

    $tagNames = @()
    if ($Place.tags) {
        $tagNames = @(
            $Place.tags |
            Select-Object -First 6 |
            ForEach-Object { $_.name }
        )
    }

    [PSCustomObject]@{
        Name     = $Place.name
        Affinity = [math]::Round([double]$Place.query.affinity,4)
        Status   = $finalStatus
        Reason   = $finalReason
        Trigger  = if ($compliance.Match) {
            $compliance.Match
        } elseif ($quality.Match) {
            $quality.Match
        } else {
            ""
        }
        Tags     = ($tagNames -join " | ")
        EntityId = $Place.entity_id
    }
}

$evaluatedA = @($placesA | ForEach-Object { Evaluate-TastePassportPlace $_ })
$evaluatedB = @($placesB | ForEach-Object { Evaluate-TastePassportPlace $_ })

function Show-GateMetrics {
    param([string]$ProfileName, [array]$Results)

    $pass   = @($Results | Where-Object Status -eq "PASS")
    $review = @($Results | Where-Object Status -eq "REVIEW")
    $block  = @($Results | Where-Object Status -eq "BLOCK")
    $reject = @($Results | Where-Object Status -eq "REJECT")

    Write-Host ""
    Write-Host $ProfileName
    Write-Host "----------------------------------------------"
    Write-Host "Total candidates:" $Results.Count
    Write-Host "PASS:" $pass.Count
    Write-Host "REVIEW:" $review.Count
    Write-Host "BLOCK:" $block.Count
    Write-Host "REJECT:" $reject.Count

    return $pass
}

Write-Host ""
Write-Host "=============================================="
Write-Host " GATE V1 DECISIONS - PROFILE A"
Write-Host "=============================================="
$evaluatedA | Format-Table Name, Affinity, Status, Reason, Trigger -AutoSize -Wrap

Write-Host ""
Write-Host "=============================================="
Write-Host " GATE V1 DECISIONS - PROFILE B"
Write-Host "=============================================="
$evaluatedB | Format-Table Name, Affinity, Status, Reason, Trigger -AutoSize -Wrap

$passA = @(Show-GateMetrics -ProfileName "PROFILE A" -Results $evaluatedA)
$passB = @(Show-GateMetrics -ProfileName "PROFILE B" -Results $evaluatedB)

$minimumFinalCandidates = 5

Write-Host ""
Write-Host "AGENT REFINEMENT DECISION"

if ($passA.Count -lt $minimumFinalCandidates) {
    Write-Host "PROFILE A: REFINE"
} else {
    Write-Host "PROFILE A: ACCEPT"
}

if ($passB.Count -lt $minimumFinalCandidates) {
    Write-Host "PROFILE B: REFINE"
} else {
    Write-Host "PROFILE B: ACCEPT"
}

Write-Host ""
Write-Host "=== Gate v1 complete ==="
