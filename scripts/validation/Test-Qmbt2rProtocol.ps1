param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

# Offline only: read protocol/workflow text. Never load a retrieval harness.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Protocol {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "QMBT-2R validation failed: $Message" }
}

function Read-RepositoryText {
    param([string]$RelativePath)
    $path = Join-Path $RepositoryRoot $RelativePath
    Assert-Protocol (Test-Path -LiteralPath $path -PathType Leaf) "Missing $RelativePath."
    return [IO.File]::ReadAllText($path).Replace("`r`n", "`n")
}

function Assert-NoDuplicateJsonKeys {
    param([System.Text.Json.JsonElement]$Element)
    if ($Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Object) {
        $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($property in $Element.EnumerateObject()) {
            Assert-Protocol ($names.Add($property.Name)) "Duplicate contract key: $($property.Name)."
            Assert-NoDuplicateJsonKeys $property.Value
        }
    } elseif ($Element.ValueKind -eq [System.Text.Json.JsonValueKind]::Array) {
        foreach ($item in $Element.EnumerateArray()) { Assert-NoDuplicateJsonKeys $item }
    }
}

function Assert-ContractValue {
    param($Expected, $Actual, [string]$Location = 'contract')
    if ($Expected -is [Collections.IDictionary]) {
        Assert-Protocol ($Actual -is [Collections.IDictionary]) "$Location must be an object."
        $expectedKeys = @($Expected.Keys | Sort-Object)
        $actualKeys = @($Actual.Keys | Sort-Object)
        Assert-Protocol (($expectedKeys -join '|') -ceq ($actualKeys -join '|')) "$Location has missing or unknown fields."
        foreach ($key in $expectedKeys) {
            Assert-ContractValue $Expected[$key] $Actual[$key] "$Location.$key"
        }
    } elseif ($Expected -is [array]) {
        Assert-Protocol ($Actual -is [array]) "$Location must be an array."
        Assert-Protocol ($Expected.Count -eq $Actual.Count) "$Location has changed length."
        for ($i = 0; $i -lt $Expected.Count; $i++) {
            Assert-ContractValue $Expected[$i] $Actual[$i] "$Location[$i]"
        }
    } else {
        $expectedJson = ConvertTo-Json -InputObject $Expected -Compress
        $actualJson = ConvertTo-Json -InputObject $Actual -Compress
        Assert-Protocol ($expectedJson -ceq $actualJson) "$Location changed from its frozen or unresolved value."
    }
}

function Get-UniqueSection {
    param([string]$Text, [string]$Heading)
    $pattern = '(?ms)^## ' + [regex]::Escape($Heading) + '\n(.*?)(?=^## |\z)'
    $sections = [regex]::Matches($Text, $pattern)
    Assert-Protocol ($sections.Count -eq 1) "Expected exactly one '$Heading' section."
    return $sections[0].Groups[1].Value.Trim()
}

function Get-TextHash {
    param([string]$Text)
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($Text))).ToLowerInvariant()
}

$draft = Read-RepositoryText 'docs/QMBT_2R_PROTOCOL.md'
$statuses = [regex]::Matches($draft, '(?m)^Status: .*$')
Assert-Protocol ($statuses.Count -eq 1 -and $statuses[0].Value -ceq 'Status: DRAFT / NOT YET PRE-REGISTERED') 'Draft must not authorize execution or claim pre-registration.'
$blocks = [regex]::Matches($draft, '(?ms)^```json\n(.*?)\n```$')
Assert-Protocol ($blocks.Count -eq 1) 'Expected exactly one JSON static contract.'
$json = $blocks[0].Groups[1].Value
try {
    $document = [System.Text.Json.JsonDocument]::Parse($json)
    try { Assert-NoDuplicateJsonKeys $document.RootElement } finally { $document.Dispose() }
    $contract = ConvertFrom-Json -InputObject $json -AsHashtable -Depth 100
} catch {
    throw "QMBT-2R validation failed: Invalid static contract. $($_.Exception.Message)"
}

# These values encode approved history, not a proposed threshold revision.
# Every unresolved design field must stay unresolved in this draft task.
$expected = @{
    protocol = 'QMBT-2R'
    status = 'DRAFT / NOT YET PRE-REGISTERED'
    execution_allowed = $false
    ci_live_qloo_allowed = $false
    estimand = 'END_TO_END_PROFILE_CONDITIONED_RETRIEVAL_VS_UNSIGNALED'
    retrieval = 'QUOTA_MATCHED_INDEPENDENT_RETRIEVAL'
    recommendation_source = 'QLOO'
    fixed_pool_rescoring = $false
    synthetic_scores = $false
    zero_imputation = $false
    intersection_only_selection = $false
    llm_venue_reordering = $false
    category_ids = @('art_gallery', 'book_store', 'museum', 'park', 'restaurant', 'shopping_mall')
    quota_per_category = 3
    target_entities_per_condition = 18
    within_category_order = 'QLOO_RETURN_ORDER'
    baseline = 'UNSIGNALED_QLOO_BASELINE'
    baseline_signal_interests_entities = $false
    evaluator_count = 4
    semantic_min_agreement = 3
    baseline_min_agreement = 3
    baseline_both_sides_required = $true
    aggregate_min_positive_cases = 3
    aggregate_case_count = 4
    aggregate_both_cities_required = $true
    aggregate_both_pairs_required = $true
    blind_packet_entities = 18
    answer_key_hidden_until_all_responses = $true
    requires_new_holdout_set = $true
    prior_case_role = 'DEVELOPMENT_DIAGNOSTIC_ONLY'
    human_decisions = @{
        holdout_selection_procedure = 'HUMAN_DECISION_REQUIRED'
        final_holdout_identities = 'HUMAN_DECISION_REQUIRED'
        retrieval_depth_K = 'HUMAN_DECISION_REQUIRED'
        depth_development_validation_method = 'HUMAN_DECISION_REQUIRED'
        live_api_stop_conditions = 'HUMAN_DECISION_REQUIRED'
    }
}
Assert-ContractValue $expected $contract

# Protect the normative prose as well as JSON: a prose-only replacement of
# the method or an unresolved placeholder must not bypass the contract check.
$sectionPins = @{
    'Evidence and scope' = '44a8a38766bd5edcc544bdd0273cf3d90ad0e7083fdedcc5e8a55d3bc368b459'
    'Estimand and approved retrieval design' = '8faed6811a82f45d268fbc28be4485afb19815917940729691733ac3f405514c'
    'Human decisions before pre-registration' = '0045dc0052f8bc9619dd48c238de940fa51f84b94a471d1fe8f8ca00019295e0'
}
foreach ($heading in $sectionPins.Keys) {
    $section = Get-UniqueSection $draft $heading
    Assert-Protocol ((Get-TextHash $section) -ceq $sectionPins[$heading]) "Approved scope, method, or unresolved decisions changed in '$heading'. Human review required."
}

# Pin immutable evidence and known offline CI definitions. Workflow pins are
# intentionally fail-closed: review complete jobs before approving changes.
# Normalize line endings so checks also work in CRLF checkouts.
$pins = @{
    'docs/QMBT_1_PROTOCOL.md' = '2ca54524c33e45237034dcb76f252e7ff7bba23f8bfee2901e9631099f21f7f6'
    'docs/QMBT_1_INVALID_RUN_20261020.md' = 'f0e098bcccb2222a83460d1b8becf8216b162a34f941d6b2946ac71c88d304b6'
    'docs/QLOO_FIXED_POOL_DIAGNOSTIC.md' = 'e4ac05b9291b28585b55807647dfc85e22ef5b5b74057fcc178ce5f5403c0fed'
    'docs/QLOO_FIXED_POOL_DIAGNOSTIC_RESULT_20261020.md' = '18d44a8ac82f3df78910e9c431b01c5d4ac31782f66d4b81fe8ff7789dd77832'
    '.github/workflows/validation.yml' = '6d15fc97be067051aefece6eb647c3d7906935fbfb193105ed971c8d96ca4e29'
    '.github/workflows/qloo-evidence-audit.yml' = 'bc496dd3b0bee0a43f1cfed3d0cc3ed9e45708f59e5efb3988180ea516c27ced'
}
foreach ($relativePath in $pins.Keys) {
    $text = Read-RepositoryText $relativePath
    $hash = Get-TextHash $text
    Assert-Protocol ($hash -ceq $pins[$relativePath]) "Protected evidence or reviewed offline CI changed: $relativePath. Human review required."
}

$workflows = @(Get-ChildItem -LiteralPath (Join-Path $RepositoryRoot '.github/workflows') -Recurse -File |
    Where-Object { $_.Extension -in @('.yml', '.yaml') })
Assert-Protocol ($workflows.Count -eq 2) 'Unreviewed or missing CI workflow; live execution must not enter CI.'
foreach ($workflow in $workflows) {
    $relativePath = [IO.Path]::GetRelativePath($RepositoryRoot, $workflow.FullName).Replace('\', '/')
    Assert-Protocol ($pins.ContainsKey($relativePath)) "Unreviewed workflow: $relativePath."
}

$historical = Read-RepositoryText 'docs/QMBT_1_PROTOCOL.md'
foreach ($heading in @('Blind semantic evaluation', 'Baseline evaluation', 'Aggregate success rule')) {
    $frozenSection = Get-UniqueSection $historical $heading
    $draftSection = Get-UniqueSection $draft $heading
    Assert-Protocol ($draftSection -ceq $frozenSection) "Frozen evaluator text changed in '$heading'."
}

Write-Output 'QMBT-2R static validation passed: draft only; frozen contract/evaluators/evidence and reviewed offline CI preserved. No live calls executed.'
