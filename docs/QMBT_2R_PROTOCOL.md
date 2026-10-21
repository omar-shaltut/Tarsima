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
unresolved. This draft does not invent an API retry, omission, or quota-shortfall
policy. Restaurant retrieval remains validation infrastructure, not a halal
endorsement; production compliance filtering remains mandatory and unchanged.

## Human decisions before pre-registration

| Decision | State |
| --- | --- |
| Holdout-selection procedure | `HUMAN_DECISION_REQUIRED` |
| Final holdout identities | `HUMAN_DECISION_REQUIRED` |
| Retrieval depth K | `18` — **FROZEN HUMAN DECISION** |
| Development-only method for validating K | `PRIOR_CASES_SINGLE_PASS_STRUCTURAL_QUOTA_FEASIBILITY` — **FROZEN HUMAN DECISION** |
| Stop conditions depending on unvalidated live API behavior | `HUMAN_DECISION_REQUIRED` |

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
entity IDs. API acceptance of the requested depth, actual development quota
fill, and live-dependent stop conditions remain operational questions. Semantic
quality, affinity magnitudes, evaluator preference, or confirmatory holdout
output must not be used to change K.

No holdout-selection procedure, holdout identities, or live-dependent stop
conditions are chosen here. The development-only validation method is frozen
below, but this draft still authorizes no live retrieval. The four-case aggregate
framework below is inherited; it does not designate replacement profiles or
cities. Development validation must not inspect new confirmatory outputs or
tune on holdouts. Any eventual completion requires human review, a committed
pre-registration, and successful repository validation before a separately
authorized confirmatory run.

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
- API outcome/status;
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
response set that cannot fill a quota is structural evidence of
`DEVELOPMENT_K_NOT_FEASIBLE`; K must not be increased or retuned automatically.

Transport/API errors, rate limits, malformed responses, or other incomplete
requests are not reclassified as K failures by this method. Their retry/stop
handling belongs to the separately frozen live-API stop conditions, which remain
`HUMAN_DECISION_REQUIRED`.

No evaluator is run, no semantic or baseline advantage is scored, no affinity
comparison is used, and no new holdout is accessed. Exact repeatability across
multiple live passes is not a success criterion for this structural gate. Any
stability study, if later justified, must be registered separately and cannot be
used to retune K.

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
  "human_decisions": {
    "holdout_selection_procedure": "HUMAN_DECISION_REQUIRED",
    "final_holdout_identities": "HUMAN_DECISION_REQUIRED",
    "retrieval_depth_K": 18,
    "depth_development_validation_method": "PRIOR_CASES_SINGLE_PASS_STRUCTURAL_QUOTA_FEASIBILITY",
    "live_api_stop_conditions": "HUMAN_DECISION_REQUIRED"
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
K decision, development-only validation method, and unresolved-decision state
are pinned too, so prose-only changes cannot bypass the static contract.

Stop at PR review. Holdout selection, live calls, execution harnesses, UI,
agent-loop expansion, policy changes, and merging are outside this draft task.
