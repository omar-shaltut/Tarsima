# TastePassport - Matched Tag Type Audit
# Diagnostic only. Does not change policy or statuses.
# For every v2.1 candidate, prints the exact Qloo tag(s) whose NAME matched
# the regex evidence, including tag id/type. This avoids Unicode hardcoding.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

. "$PSScriptRoot\07-compliance-gate-v2.1.ps1" *> $null

function Get-MatchedTagRows {
    param(
        [string]$Profile,
        [array]$Places
    )

    foreach ($place in (Get-UniqueEntities $Places)) {
        $result = Evaluate-PlaceV21 $place
        $pattern = [string]$result.Evidence

        if ([string]::IsNullOrWhiteSpace($pattern) -or -not $place.tags) {
            continue
        }

        $matchedTags = @(
            $place.tags |
            Where-Object {
                $_.name -and ((Convert-ToNormalizedText ([string]$_.name)) -match $pattern)
            }
        )

        if ($matchedTags.Count -eq 0) {
            [PSCustomObject]@{
                Profile   = $Profile
                Name      = $place.name
                Status    = $result.Status
                Reason    = $result.Reason
                Pattern   = $pattern
                TagName   = "<none>"
                TagId     = ""
                TagType   = ""
                EntityId  = $place.entity_id
            }
            continue
        }

        foreach ($tag in $matchedTags) {
            [PSCustomObject]@{
                Profile   = $Profile
                Name      = $place.name
                Status    = $result.Status
                Reason    = $result.Reason
                Pattern   = $pattern
                TagName   = [string]$tag.name
                TagId     = [string]$tag.id
                TagType   = [string]$tag.type
                EntityId  = $place.entity_id
            }
        }
    }
}

$rows = @(
    Get-MatchedTagRows -Profile "A" -Places @($placesA)
    Get-MatchedTagRows -Profile "B" -Places @($placesB)
)

Write-Host ""
Write-Host "============================================================"
Write-Host " MATCHED TAG TYPE AUDIT - ALL CURRENT V2.1 DECISIONS"
Write-Host "============================================================"
Write-Host ""

$rows |
    Sort-Object Profile, Name, TagType, TagName |
    Select-Object Profile, Name, Status, Reason, Pattern, TagName, TagType, TagId |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "SUMMARY BY TAG TYPE"
$rows |
    Group-Object TagType |
    Sort-Object Count -Descending |
    Select-Object Count, Name |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "POTENTIALLY CONTEXTUAL / NON-ENTITY TAG MATCHES"
Write-Host ""

$rows |
    Where-Object {
        $_.TagType -match 'nearby_attraction|neighborhood_characteristic|interests|view|setting|visit_intent|audience|customer_identity|ambience'
    } |
    Select-Object Profile, Name, Status, Reason, TagName, TagType, TagId |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "============================================================"
Write-Host " MATCHED TAG TYPE AUDIT COMPLETE"
Write-Host "============================================================"
