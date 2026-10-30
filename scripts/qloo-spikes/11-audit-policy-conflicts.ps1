# Tarsima - Policy Conflict / False-Negative Audit
# Diagnostic only. Does not change Gate v2.1 policy or statuses.
# Scans ALL current candidates for direct policy-relevant Qloo tag IDs/types,
# independent of the regex pattern that originally decided the v2.1 verdict.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

. "$PSScriptRoot\07-compliance-gate-v2.1.ps1" *> $null

function Get-DirectPolicySignals {
    param($Place)

    $signals = @()

    foreach ($tag in @($Place.tags)) {
        if (-not $tag) { continue }

        $name = [string]$tag.name
        $id   = [string]$tag.id
        $type = [string]$tag.type

        # Direct alcohol/bar evidence. Prefer tag IDs/types over free-text names.
        if (
            $id -match ':(alcohol|wine|beer|cocktails?|spirits|full_bar|bar_onsite|wine_list|brewery|liquor|winery)$' -or
            ($type -match '^urn:tag:(offerings:place|beverage_offering:qloo|amenities:place|amenity:qloo)$' -and
             $name -match '^(Alcohol|Wine|Beer|Cocktails?|Spirits|Full bar|Bar onsite|Wine list|Brewery|Liquor|Winery)$')
        ) {
            $signals += [PSCustomObject]@{ Kind='ALCOHOL_DIRECT'; Name=$name; Id=$id; Type=$type }
            continue
        }

        # Halal is positive evidence, not final verification.
        if ($id -match ':(halal|halal_food)$') {
            $signals += [PSCustomObject]@{ Kind='HALAL_SIGNAL'; Name=$name; Id=$id; Type=$type }
            continue
        }

        # Review-only signals in current conservative policy.
        if ($id -match ':(hookah|shisha)$') {
            $signals += [PSCustomObject]@{ Kind='REVIEW_HOOKAH'; Name=$name; Id=$id; Type=$type }
            continue
        }
    }

    return @($signals)
}

function Get-AuditRows {
    param(
        [string]$Profile,
        [array]$Places
    )

    foreach ($place in (Get-UniqueEntities $Places)) {
        $result = Evaluate-PlaceV21 $place
        $signals = @(Get-DirectPolicySignals $place)

        $alcohol = @($signals | Where-Object Kind -eq 'ALCOHOL_DIRECT')
        $halal   = @($signals | Where-Object Kind -eq 'HALAL_SIGNAL')
        $review  = @($signals | Where-Object Kind -eq 'REVIEW_HOOKAH')

        $flags = @()
        if ($alcohol.Count -gt 0) { $flags += 'ALCOHOL_DIRECT' }
        if ($halal.Count -gt 0)   { $flags += 'HALAL_SIGNAL' }
        if ($review.Count -gt 0)  { $flags += 'REVIEW_HOOKAH' }
        if ($alcohol.Count -gt 0 -and $halal.Count -gt 0) { $flags += 'CONFLICT_HALAL_AND_ALCOHOL' }

        # Detect likely false-negative / state mismatch against current v2.1 verdict.
        $mismatch = @()
        if ($alcohol.Count -gt 0 -and $result.Status -ne 'BLOCK') {
            $mismatch += 'ALCOHOL_NOT_BLOCKED'
        }
        if ($halal.Count -gt 0 -and $result.Status -eq 'PASS') {
            $mismatch += 'HALAL_ONLY_PASS_REQUIRES_POLICY_CHANGE'
        }
        if ($review.Count -gt 0 -and $result.Status -eq 'PASS') {
            $mismatch += 'REVIEW_SIGNAL_NOT_REVIEWED'
        }

        [PSCustomObject]@{
            Profile        = $Profile
            Name           = $place.name
            Affinity       = [math]::Round([double]$place.query.affinity,4)
            CurrentStatus  = $result.Status
            CurrentReason  = $result.Reason
            Signals        = ($flags -join '+')
            AlcoholTags    = (($alcohol | ForEach-Object { "$($_.Name) [$($_.Type)]" }) -join ' | ')
            HalalTags      = (($halal   | ForEach-Object { "$($_.Name) [$($_.Type)]" }) -join ' | ')
            ReviewTags     = (($review  | ForEach-Object { "$($_.Name) [$($_.Type)]" }) -join ' | ')
            Mismatch       = ($mismatch -join '+')
            EntityId       = $place.entity_id
        }
    }
}

$rows = @(
    Get-AuditRows -Profile 'A' -Places @($placesA)
    Get-AuditRows -Profile 'B' -Places @($placesB)
)

Write-Host ""
Write-Host "============================================================"
Write-Host " POLICY CONFLICT / FALSE-NEGATIVE AUDIT - 50 CANDIDATES"
Write-Host "============================================================"
Write-Host ""

Write-Host "MISMATCHES / POLICY CHANGES"
$rows |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_.Mismatch) } |
    Select-Object Profile, Name, CurrentStatus, CurrentReason, Signals, Mismatch, AlcoholTags, HalalTags, ReviewTags |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "DIRECT POLICY SIGNALS (ALL CANDIDATES)"
$rows |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_.Signals) } |
    Select-Object Profile, Name, CurrentStatus, Signals, AlcoholTags, HalalTags, ReviewTags |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "SUMMARY"
Write-Host "Candidates:" $rows.Count
Write-Host "With direct alcohol signal:" (@($rows | Where-Object { $_.Signals -match 'ALCOHOL_DIRECT' })).Count
Write-Host "With halal signal:" (@($rows | Where-Object { $_.Signals -match 'HALAL_SIGNAL' })).Count
Write-Host "With hookah/shisha review signal:" (@($rows | Where-Object { $_.Signals -match 'REVIEW_HOOKAH' })).Count
Write-Host "With halal+alcohol conflict:" (@($rows | Where-Object { $_.Signals -match 'CONFLICT_HALAL_AND_ALCOHOL' })).Count
Write-Host "With state mismatch/policy change:" (@($rows | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Mismatch) })).Count

Write-Host ""
Write-Host "============================================================"
Write-Host " POLICY CONFLICT AUDIT COMPLETE"
Write-Host "============================================================"
