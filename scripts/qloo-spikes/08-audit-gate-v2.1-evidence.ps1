# TastePassport - Gate v2.1 Evidence Audit
# Read-only diagnostic helper for the same 50 candidates used in the v2.1 spike.
# It does not change gate policy or candidate status.
# It identifies which source field (Name / Tags / Categories) actually matched
# the regex evidence that produced each current v2.1 decision.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

# Load Gate v2.1 functions/results into this script scope while suppressing its report.
. "$PSScriptRoot\07-compliance-gate-v2.1.ps1" *> $null

function Get-MatchedFields {
    param(
        $EvidenceObject,
        [string]$Pattern
    )

    if ([string]::IsNullOrWhiteSpace($Pattern)) {
        return "NONE"
    }

    $hits = @()

    if ($EvidenceObject.Name -match $Pattern) {
        $hits += "NAME"
    }

    if ($EvidenceObject.Tags -match $Pattern) {
        $hits += "TAGS"
    }

    if ($EvidenceObject.Categories -match $Pattern) {
        $hits += "CATEGORIES"
    }

    if ($hits.Count -eq 0) {
        return "UNRESOLVED"
    }

    return ($hits -join "+")
}

function Get-MatchingTags {
    param(
        $Place,
        [string]$Pattern
    )

    if (-not $Place.tags -or [string]::IsNullOrWhiteSpace($Pattern)) {
        return ""
    }

    $matches = @(
        $Place.tags |
        Where-Object {
            $_.name -and ((Convert-ToNormalizedText ([string]$_.name)) -match $Pattern)
        } |
        ForEach-Object { [string]$_.name }
    )

    return ($matches -join " | ")
}

function Get-AuditRows {
    param(
        [string]$Profile,
        [array]$Places
    )

    $unique = Get-UniqueEntities $Places

    foreach ($place in $unique) {
        $result = Evaluate-PlaceV21 $place
        $e = Get-PlaceEvidence $place

        [PSCustomObject]@{
            Profile       = $Profile
            Name          = $place.name
            Affinity      = [math]::Round([double]$place.query.affinity,4)
            Status        = $result.Status
            Reason        = $result.Reason
            Pattern       = $result.Evidence
            MatchedFields = Get-MatchedFields -EvidenceObject $e -Pattern $result.Evidence
            MatchingTags  = Get-MatchingTags -Place $place -Pattern $result.Evidence
            Categories    = $e.Categories
            EntityId      = $place.entity_id
        }
    }
}

$auditRows = @(
    Get-AuditRows -Profile "A" -Places @($placesA)
    Get-AuditRows -Profile "B" -Places @($placesB)
)

Write-Host ""
Write-Host "============================================================"
Write-Host " GATE V2.1 EVIDENCE AUDIT - 50 CANDIDATES"
Write-Host "============================================================"
Write-Host ""

$auditRows |
    Select-Object Profile, Name, Affinity, Status, Reason, Pattern, MatchedFields, MatchingTags, Categories |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "SUMMARY BY MATCHED FIELD"
$auditRows |
    Group-Object MatchedFields |
    Sort-Object Count -Descending |
    Select-Object Count, Name |
    Format-Table -AutoSize

Write-Host ""
Write-Host "SUSPICIOUS / HIGH-VALUE AUDIT TARGETS"
Write-Host "(decision evidence comes only from TAGS/CATEGORIES or current status is PASS/REVIEW)"
Write-Host ""

$auditRows |
    Where-Object {
        $_.MatchedFields -notmatch 'NAME' -or
        $_.Status -in @('PASS','REVIEW')
    } |
    Select-Object Profile, Name, Status, Reason, Pattern, MatchedFields, MatchingTags, Categories |
    Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "============================================================"
Write-Host " EVIDENCE AUDIT COMPLETE"
Write-Host "============================================================"
