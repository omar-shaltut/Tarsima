# Tarsima - Tag Provenance Audit
# Diagnostic only. Does not change policy or statuses.
# Prints raw Qloo tag objects (name/id/type) for the candidates that remain
# unresolved after the v2.1 evidence audit, plus known false-positive controls.

if (-not $placesA -or -not $placesB) {
    throw "Run the multi-signal spike first so `$placesA and `$placesB exist."
}

$targets = @(
    @{ Profile='A'; Name='Turkish Street Cafe' },
    @{ Profile='A'; Name='Otantik Cafe' },
    @{ Profile='A'; Name='Cinili Cafe' },
    @{ Profile='A'; Name='Cesme Art Cafe' },
    @{ Profile='B'; Name='Ceviz Ağacı' },
    @{ Profile='B'; Name='Gönül Kahvesi' },
    @{ Profile='B'; Name='Şehzade Kebap Sarayı' },
    @{ Profile='B'; Name='MADO Salacak' },
    @{ Profile='B'; Name='Kahve Deryası Taşdelen' },
    @{ Profile='B'; Name='Paçacı Kadir Usta' },
    @{ Profile='B'; Name='İnci Bosphorus' },
    @{ Profile='B'; Name='Mado' }
)

function Show-TargetTags {
    param(
        [string]$Profile,
        [string]$Name,
        [array]$Places
    )

    $matches = @($Places | Where-Object { $_.name -eq $Name } | Sort-Object { [double]$_.query.affinity } -Descending)

    if ($matches.Count -eq 0) {
        Write-Host "[$Profile] $Name -- NOT FOUND"
        return
    }

    foreach ($place in $matches) {
        $affinity = [math]::Round([double]$place.query.affinity,4)
        Write-Host ""
        Write-Host "============================================================"
        Write-Host "[$Profile] $($place.name) | Affinity: $affinity | EntityId: $($place.entity_id)"
        Write-Host "============================================================"

        if (-not $place.tags) {
            Write-Host "No tags"
            continue
        }

        $place.tags |
            Select-Object name, id, type |
            Sort-Object type, name |
            Format-Table -AutoSize -Wrap
    }
}

foreach ($target in $targets) {
    $places = if ($target.Profile -eq 'A') { @($placesA) } else { @($placesB) }
    Show-TargetTags -Profile $target.Profile -Name $target.Name -Places $places
}

Write-Host ""
Write-Host "============================================================"
Write-Host " TAG PROVENANCE AUDIT COMPLETE"
Write-Host "============================================================"
