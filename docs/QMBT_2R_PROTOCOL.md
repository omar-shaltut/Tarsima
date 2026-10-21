# QMBT-2R — Retrieval-Native Quota-Matched Validation

Status: DRAFT / NOT YET PRE-REGISTERED

This successor skeleton is for human review only. It authorizes no live
retrieval, holdout inspection, experiment execution, or product architecture
change. Passing static validation does not pre-register the protocol.

## Evidence and scope

- [QMBT-1](QMBT_1_PROTOCOL.md) stopped as
  [INVALID_EXECUTION_API_SEMANTICS](QMBT_1_INVALID_RUN_20261020.md).
- The separately registered [fixed-pool diagnostic](QLOO_FIXED_POOL_DIAGNOSTIC.md)
  [failed](QLOO_FIXED_POOL_DIAGNOSTIC_RESULT_20261020.md). Neither record is
  evidence for or against the product hypothesis; both remain unchanged.
- Fixed-pool rescoring is retired. No current QMBT-1 harness is repurposed or
  unlocked by this document.
- Pair2/Pair3 × Istanbul/London material is development/diagnostic only.
  The next confirmatory run requires a new holdout set. No new holdouts have
  been selected or inspected for this draft.

## Estimand and approved retrieval design

The estimand is **end-to-end profile-conditioned retrieval quality versus
unsignaled retrieval**, not common-pool reranking.

Each condition retrieves independently within the same six structural category
quotas. Qloo remains the venue-selection decision source and supplies the
within-category ordering. The baseline is `UNSIGNALED_QLOO_BASELINE`, omitting
`signal.interests.entities`; it must not be described as a popularity baseline.
Conditions need not return identical entity sets. There is no union-pool
rescoring, intersection-only selection, synthetic scoring, zero-imputation of
omitted entities, or LLM invention, substitution, or reordering of venues.

The final target remains 3 unique entities per category and 18 unique entities
per condition. The inherited category-ID priority for cross-category
deduplication, backfill, and final display is:

1. Art gallery — `urn:tag:category:place:art_gallery`
2. Book store — `urn:tag:category:place:book_store`
3. Museum — `urn:tag:category:place:museum`
4. Park — `urn:tag:category:place:park`
5. Restaurant — `urn:tag:category:place:restaurant`
6. Shopping mall — `urn:tag:category:place:shopping_mall`

An entity appears once per final list; later category blocks backfill in Qloo
return order after earlier blocks claim an entity. `retrieval_depth_K` is frozen
at `18` by human decision. Empirical feasibility of filling these quotas remains
an operational question. The frozen retry/stop policy below governs incomplete
API attempts only; it must never be used to resample a completed valid response
or improve a returned list. Restaurant retrieval remains validation
infrastructure, not a halal endorsement; production compliance filtering remains
mandatory and unchanged.

## Human decisions before pre-registration

| Decision | State |
| --- | --- |
| Holdout-selection procedure | `COMMIT_SEEDED_FROZEN_POOL_SELECTION_V1` — **FROZEN HUMAN DECISION** |
| Final holdout identities | `HUMAN_DECISION_REQUIRED` |
| Retrieval depth K | `18` — **FROZEN HUMAN DECISION** |
| Development-only method for validating K | `PRIOR_CASES_SINGLE_PASS_STRUCTURAL_QUOTA_FEASIBILITY` — **FROZEN HUMAN DECISION** |
| Live API retry/stop conditions | `EXACT_REQUEST_BOUNDED_RETRY_V1` — **FROZEN HUMAN DECISION** |

`retrieval_depth_K = 18` is frozen before any new retrieval. It is derived
structurally, not tuned on taste quality. For category position `j` in the fixed
priority order, earlier categories can have assigned at most `3(j-1)` unique
entity IDs. To guarantee 3 current-category candidates remain after excluding
all earlier assignments, a response containing `K` distinct current-category
entity IDs must satisfy:

`K >= 3(j-1) + 3 = 3j`

With six categories, the worst case is `j = 6`, so `K >= 18`. QMBT-2R therefore
freezes the smallest worst-case structural depth: `K = 18`.

This is a combinatorial backfill bound, not an empirical claim about Qloo API
behavior. It applies only when a category retrieval returns at least 18 distinct
entity IDs. API acceptance of the requested depth and actual development quota
fill remain operational questions. Semantic quality, affinity magnitudes,
evaluator preference, or confirmatory holdout output must not be used to change
K.

The holdout-selection procedure is frozen below, but the candidate pool and
final holdout identities are not chosen here. Building and committing that pool
is a separate human review gate because the seed commit irreversibly determines
the deterministic ranking. The development-only validation method and live API
retry/stop policy are also frozen, but this draft still authorizes no live
retrieval. The four-case aggregate framework below is inherited; it does not
designate replacement profiles or cities. Development validation must not
inspect new confirmatory outputs or tune on holdouts. Any eventual completion
requires human review, a committed pre-registration, and successful repository
validation before a separately authorized confirmatory run.

## Development-only validation method for K=18

Method identifier:
`PRIOR_CASES_SINGLE_PASS_STRUCTURAL_QUOTA_FEASIBILITY`.

Purpose: test whether the frozen retrieval design can structurally produce the
required quota-matched lists on development-only material. This gate must not
measure or optimize taste quality.

The development dataset is limited to the already-exposed
Pair2/Pair3 × Istanbul/London cases. For each of the four profile-pair × city
cases, run exactly three independent conditions: profile side A, profile side B,
and `UNSIGNALED_QLOO_BASELINE`. Each condition requests the six frozen categories
independently with `take = 18`. This is one registered structural pass:
4 cases × 3 conditions × 6 categories = 72 category retrieval requests.

For each completed category response, record at minimum:

- request condition, city, category ID, and requested `take`;
- API outcome/status and attempt count;
- returned entity count and distinct entity-ID count;
- returned entity IDs in Qloo order;
- cross-category duplicate skips;
- selected count for the category; and
- final unique entity count for the condition.

List construction is deterministic. Traverse the six frozen categories in the
frozen priority order. Within each category, traverse returned entities in Qloo
order and select the first three entity IDs not already selected by an earlier
category. Duplicate IDs are skipped. Do not use affinity magnitude, generated
explanations, LLM judgment, synthetic scores, zero-imputation, intersection-only
selection, substitution, or venue reordering.

A completed development condition satisfies the structural gate only if it
produces exactly 3 selected entities in every category and exactly 18 unique
entities overall. All 12 development conditions must satisfy that gate for the
structural result to be `DEVELOPMENT_K_FEASIBLE`.

A returned distinct-ID count below 18 is telemetry, not by itself a failure, if
the deterministic assembly still fills all six quotas. Conversely, a completed
valid response set that cannot fill a quota is structural evidence of
`DEVELOPMENT_K_NOT_FEASIBLE`; the request must not be retried because of its
content, and K must not be increased or retuned automatically.

Transport/API errors, rate limits, malformed or truncated responses, and other
incomplete attempts are handled only by the frozen
`EXACT_REQUEST_BOUNDED_RETRY_V1` policy below. They are not reclassified as K
failures.

No evaluator is run, no semantic or baseline advantage is scored, no affinity
comparison is used, and no new holdout is accessed. Exact repeatability across
multiple successful live passes is not a success criterion for this structural
gate. Any stability study, if later justified, must be registered separately
and cannot be used to retune K.

## Live API retry and stop policy

Policy identifier: `EXACT_REQUEST_BOUNDED_RETRY_V1`.

The purpose of retry is to recover from an incomplete API attempt, never to
resample a completed Qloo recommendation response. Every attempt and outcome
must be logged. A retry must preserve the same request semantics and all
experiment parameters, including profile signals, city, category, filters,
`take = 18`, and condition. No parameter mutation, fallback category, entity
substitution, or result-based retry is allowed.

A category request has at most three total attempts: the initial attempt plus
at most two retries. Retry is permitted only for:

- network connection failure or client timeout;
- HTTP `408`;
- HTTP `429`;
- HTTP `5xx`; or
- HTTP `2xx` whose body is truncated, cannot be parsed as JSON, or lacks the
  required result container needed to enumerate returned entities.

For retryable outcomes other than `429`, wait 2 seconds before attempt 2 and
8 seconds before attempt 3. For `429`, use a valid `Retry-After` value when it is
120 seconds or less; if the header is absent or invalid, use the same 2-second /
8-second fallback. A `Retry-After` value greater than 120 seconds aborts the
registered run rather than extending or modifying the protocol.

HTTP `4xx` responses other than `408` and `429` are non-retryable and abort the
registered run. A parseable `2xx` response with a valid result container is a
completed response even when it contains zero entities, fewer than 18 entities,
duplicate IDs, or no optional affinity value. Such a completed response must
never be retried because of its content.

The first completed valid response is accepted. Previously successful category
requests must not be repeated within the same registered run. If a retryable
request still has no completed valid response after three attempts, or any
non-retryable condition occurs, abort the entire registered run as
`INCOMPLETE_EXECUTION_API_OR_TRANSPORT`. Partial results must not be evaluated.

A new registered run after such an abort requires explicit human authorization.
It must use the same frozen protocol unless a separately reviewed protocol
amendment is committed first. Partial outputs from the aborted run must not be
used to change K, categories, holdouts, thresholds, retry rules, or any other
confirmatory choice.

Completed valid responses that fail quota assembly are retrieval outcomes, not
transport errors. In development they produce `DEVELOPMENT_K_NOT_FEASIBLE` under
the frozen structural gate. In confirmatory execution, the affected case is
`CONFIRMATORY_CASE_STRUCTURAL_FAIL`, receives no semantic/baseline positive
credit, and remains part of the four-case denominator. It must not be dropped,
replaced, or retried for a different result.

## Holdout selection procedure

Policy identifier: `COMMIT_SEEDED_FROZEN_POOL_SELECTION_V1`.

The purpose is to choose confirmatory holdouts without inspecting Qloo Insights
or recommendation outputs for candidate cities or profiles. The candidate pool
must be created and human-reviewed before any holdout-selection computation or
Qloo recommendation retrieval.

The frozen pool contains exactly:

- 8 city candidates, all different from the prior development cities Istanbul
  and London, each with an explicit committed `canonical_id`, country, city
  label, latitude, and longitude;
- 6 profile-pair candidates; each pair contains two profiles, and each profile
  contains exactly one movie, one brand, and one book seed; and
- no seed entity used in Pair2 or Pair3, no seed entity repeated anywhere in the
  candidate pool, and no profile intentionally centered on nightlife, alcohol,
  gambling, or another prohibited theme.

Candidate eligibility and all explicit `canonical_id` strings must be reviewed
before the pool is committed. No Qloo Insights/recommendation call may be used
to decide whether a city, profile, pair, or seed enters the pool.

The commit containing the complete candidate pool and the deterministic
selection algorithm is the **Seed Commit**. After that commit exists, its full
Git commit SHA is the selection seed. The Seed Commit must not be amended,
rebased, squashed, force-rewritten, or otherwise replaced. If repository history
makes that SHA unreachable or ambiguous before selection is frozen, stop for
human review rather than silently deriving a new seed.

For every candidate, compute:

`SHA256(seed_commit_sha | QMBT-2R | candidate_type | canonical_id)`

where the separators are the literal ASCII ` | ` sequence shown above and the
input is UTF-8. Rank ascending by the lowercase hexadecimal SHA-256 digest, with
`canonical_id` ascending as the deterministic collision tiebreaker.

Select the first two ranked city candidates and the first two ranked profile-pair
candidates. Their cross-product defines exactly four confirmatory
profile-pair × city cases. No taste-quality, affinity, evaluator, quota-fill,
popularity, or recommendation output may influence this ranking or selection.

Only after those provisional profile pairs are selected may exact seed-entity
resolution be performed for their 12 seeds. Entity resolution is not a Qloo
Insights/recommendation preflight and must not retrieve venue recommendations.
If any of the six seeds in a provisional pair cannot be resolved unambiguously
to exactly one intended entity, reject the entire pair and advance to the next
profile pair in the already-frozen hash ranking. Do not substitute a single
seed, edit the pair, or inspect recommendation outputs to decide replacement.
Continue deterministically until two fully resolved pairs are obtained. If the
six-pair pool cannot supply two fully resolved pairs, stop for human review; do
not expand the pool post hoc.

The two selected cities receive no recommendation preflight. Their committed
coordinates are used as frozen. A later quota shortfall is handled by the
frozen structural-failure rules; it cannot justify replacing a city.

After entity resolution, commit the selected city identities/coordinates,
selected profile pairs, all 12 resolved entity IDs, the Seed Commit SHA, ranking
digests, and any whole-pair deterministic skips. Only then may a later human
review change protocol status from `DRAFT / NOT YET PRE-REGISTERED` to a
pre-registered state, after repository validation passes.

From the first confirmatory retrieval onward, holdout cities, selected profile
pairs, seed identities, resolved entity IDs, K, category framework, evaluator
thresholds, and selection policy are immutable for that registered experiment.
No failed or weak confirmatory output may trigger replacement or reselection.

## Static contract

This machine-readable contract records approved decisions and unresolved
fields only. It is not an executable retrieval configuration. Prose cannot
override it or the unchanged evaluator sections below. Altering a frozen
decision requires a separately reviewed protocol decision, not a validator
update to make a failing check pass.

```json
{
  "protocol": "QMBT-2R",
  "status": "DRAFT / NOT YET PRE-REGISTERED",
  "execution_allowed": false,
  "ci_live_qloo_allowed": false,
  "estimand": "END_TO_END_PROFILE_CONDITIONED_RETRIEVAL_VS_UNSIGNALED",
  "retrieval": "QUOTA_MATCHED_INDEPENDENT_RETRIEVAL",
  "recommendation_source": "QLOO",
  "fixed_pool_rescoring": false,
  "synthetic_scores": false,
  "zero_imputation": false,
  "intersection_only_selection": false,
  "llm_venue_reordering": false,
  "category_ids": ["art_gallery", "book_store", "museum", "park", "restaurant", "shopping_mall"],
  "quota_per_category": 3,
  "target_entities_per_condition": 18,
  "within_category_order": "QLOO_RETURN_ORDER",
  "baseline": "UNSIGNALED_QLOO_BASELINE",
  "baseline_signal_interests_entities": false,
  "evaluator_count": 4,
  "semantic_min_agreement": 3,
  "baseline_min_agreement": 3,
  "baseline_both_sides_required": true,
  "aggregate_min_positive_cases": 3,
  "aggregate_case_count": 4,
  "aggregate_both_cities_required": true,
  "aggregate_both_pairs_required": true,
  "blind_packet_entities": 18,
  "answer_key_hidden_until_all_responses": true,
  "requires_new_holdout_set": true,
  "prior_case_role": "DEVELOPMENT_DIAGNOSTIC_ONLY",
  "holdout_selection_policy": {
    "policy_id": "COMMIT_SEEDED_FROZEN_POOL_SELECTION_V1",
    "city_pool_size": 8,
    "profile_pair_pool_size": 6,
    "selected_city_count": 2,
    "selected_profile_pair_count": 2,
    "confirmatory_cross_product_case_count": 4,
    "exclude_prior_development_cities": true,
    "exclude_prior_seed_entities": true,
    "unique_seed_entities_across_pool": true,
    "prohibited_theme_exclusion_required": true,
    "qloo_insights_for_pool_construction_allowed": false,
    "seed_commit_history_rewrite_allowed": false,
    "ranking_hash": "SHA256(seed_commit_sha | QMBT-2R | candidate_type | canonical_id)",
    "rank_ascending": true,
    "canonical_id_collision_tiebreak_ascending": true,
    "entity_resolution_after_selection_only": true,
    "qloo_recommendation_preflight_allowed": false,
    "unresolved_seed_rejects_entire_pair": true,
    "single_seed_substitution_allowed": false,
    "advance_by_frozen_pair_rank": true,
    "pool_expansion_after_resolution_failure_allowed": false,
    "final_holdouts_require_post_resolution_commit": true,
    "post_first_confirmatory_reselection_allowed": false
  },
  "live_api_policy": {
    "policy_id": "EXACT_REQUEST_BOUNDED_RETRY_V1",
    "max_attempts_per_request": 3,
    "retryable_outcomes": ["NETWORK_OR_TIMEOUT", "HTTP_408", "HTTP_429", "HTTP_5XX", "MALFORMED_OR_TRUNCATED_2XX"],
    "fallback_backoff_seconds": [2, 8],
    "retry_after_max_seconds": 120,
    "nonretryable_http_4xx_except": [408, 429],
    "retry_payload_mutation_allowed": false,
    "accept_first_valid_response": true,
    "retry_completed_valid_response": false,
    "abort_entire_run_on_nonretryable_or_exhausted": true,
    "partial_results_evaluable": false,
    "fresh_run_requires_human_authorization": true,
    "completed_quota_shortfall_retryable": false,
    "development_quota_shortfall_classification": "DEVELOPMENT_K_NOT_FEASIBLE",
    "confirmatory_quota_shortfall_classification": "CONFIRMATORY_CASE_STRUCTURAL_FAIL",
    "exhausted_or_nonretryable_classification": "INCOMPLETE_EXECUTION_API_OR_TRANSPORT"
  },
  "human_decisions": {
    "holdout_selection_procedure": "COMMIT_SEEDED_FROZEN_POOL_SELECTION_V1",
    "final_holdout_identities": "HUMAN_DECISION_REQUIRED",
    "retrieval_depth_K": 18,
    "depth_development_validation_method": "PRIOR_CASES_SINGLE_PASS_STRUCTURAL_QUOTA_FEASIBILITY",
    "live_api_stop_conditions": "EXACT_REQUEST_BOUNDED_RETRY_V1"
  }
}
```

## Blind semantic evaluation

For each profile-pair × city case:

- compare the two quota-matched personalized lists;
- randomize X/Y;
- show profile seeds;
- show venue names;
- show no Qloo affinity values;
- show no generated explanations;
- show no answer key.

Four independent model evaluators are required.

A semantic case is operationally positive only when at least 3 of 4 evaluators:

1. assign both lists to the correct profiles; and
2. judge the distinction meaningfully taste-related rather than mainly generic/category-driven.

## Baseline evaluation

For each profile side:

- compare that profile's quota-matched personalized list against the quota-matched UNSIGNALED_QLOO_BASELINE;
- randomize X/Y;
- use the same blind restrictions.

Baseline advantage for a profile side is operationally positive only when at least 3 of 4 evaluators:

1. identify the personalized list as the better fit; and
2. judge that advantage meaningfully taste-related rather than mainly generic/category-driven.

A profile-pair × city case has positive baseline advantage only when both profile sides pass.

## Aggregate success rule

The success threshold is unchanged from the prior formal retest.

`SUPPORTED_FOR_NEXT_STAGE` requires at least 3 of the 4 confirmatory cases to have both:

1. positive semantic evidence; and
2. positive baseline advantage.

Those positive cases must collectively include:

- both cities; and
- both profile pairs.

No lower 2-of-4 threshold is permitted.

## Validation and review gate

The three evaluation sections above are inherited verbatim from QMBT-1. Blind
packets retain all 18 entities, without Top-10 truncation; answer keys remain
hidden until all evaluator responses have been collected. Numerical ranking
or affinity differences alone do not establish success. These are operational
criteria, not statistical-significance claims.

Run the following from the repository root, entirely offline:

```powershell
./scripts/validation/Test-Qmbt2rProtocol.ps1
./scripts/validation/Test-Qmbt2rProtocol.Tests.ps1
```

Repository CI retains its existing PowerShell syntax and QMBT-1 safety checks
and runs these new checks. The static validator pins the historical evidence
records and scans repository workflows for direct live-Qloo indicators such as
the hackathon API host, `QLOO_API_KEY`, or execution/reference of the Qloo spike
scripts. It intentionally does not freeze the number or complete contents of
unrelated workflows, so safe CI evolution remains possible. The Qloo evidence
audit may access public GitHub-hosted Qloo documentation, but it does not call
the Qloo API or use Qloo secrets. The checks validate the contract, frozen
evaluator text, evidence preservation, and absence of direct live-Qloo CI
execution indicators; they cannot establish API feasibility or empirically
validate the hypothesis. The approved scope, retrieval-design prose, frozen
K decision, development-only validation method, live API retry/stop policy,
holdout-selection policy, and remaining unresolved final holdout identities are
pinned too, so prose-only changes cannot bypass the static contract.

Stop at PR review. Holdout selection, live calls, execution harnesses, UI,
agent-loop expansion, policy changes, and merging are outside this draft task.
