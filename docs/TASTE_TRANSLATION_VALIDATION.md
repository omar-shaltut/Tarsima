# TastePassport — Taste Translation Validation Spike

## Status

Validation gate. This document does **not** adopt the product thesis. It defines the experiment required to decide whether the cross-domain taste-translation claim is worth building around.

## Question

Do cross-domain taste seeds materially and reproducibly change local-place recommendations beyond generic popularity, category bias, or post-hoc explanation?

## Scope

This spike isolates translation quality from the agent loop and compliance architecture.

Included:
- strict seed resolution;
- same-city comparisons;
- contrasting taste profiles;
- counter-profile controls;
- seed ablations;
- entity overlap metrics;
- category/tag composition export;
- blind-evaluation packets.

Excluded:
- LLM planning or diagnosis;
- iterative REFINE loops;
- natural-language explanations;
- halal or other compliance verdicts;
- maps, chat UI, itineraries, or multi-city product flows.

## Experimental principle

The experiment must be able to fail.

A successful run is not evidence by itself. Evidence comes from differences between treatment and control arms that survive blind evaluation and seed ablation.

## Profiles

Start with two deliberately contrasting profiles already used in the repository:

### Profile A
- Interstellar — movie
- MUJI — brand
- The Martian — book

### Profile B
- Ratatouille — movie
- Anthropologie — brand
  - Originally specified as IKEA; replaced before downstream retrieval after strict type resolution found no IKEA urn:entity:brand result.
- The Little Prince — book

A seed that cannot be resolved unambiguously must not be silently replaced. The run must stop and report the resolution failure so the profile can be repaired explicitly.

## Arms

For each profile and city, run:

1. **TARGET** — all seeds from the profile.
2. **COUNTERPROFILE** — all seeds from the contrasting profile.
3. **ABLATE_1..N** — remove one seed at a time from TARGET.
4. **SINGLE_1..N** — each seed alone, for diagnostic attribution.

A city-only/popularity baseline should be added only after its Qloo API semantics are verified. The spike must not fabricate a no-seed baseline by changing unrelated parameters.

## Required outputs

Every arm writes machine-readable JSON containing:
- profile and arm identifiers;
- city;
- exact resolved seed names, types, and entity IDs;
- raw candidate entity IDs and names;
- affinity returned by Qloo when present;
- raw tags and category-like fields when present;
- address when present;
- timestamp;
- request URL with secret-free parameters.

The runner also writes a summary with:
- candidate count;
- pairwise Jaccard overlap between arms;
- top-k overlap;
- rank-aware overlap diagnostic;
- unique-candidate count;
- tag/category token frequencies;
- food-signal share using a transparent diagnostic vocabulary;
- unresolved/failed arms.

Food classification in this spike is diagnostic only. It is not a compliance verdict and must not reuse PASS/REVIEW/REJECT semantics.

## Blind evaluation

Do not show LLM explanations.

For each profile, create a packet containing:
- the profile seed list;
- anonymized candidate lists from TARGET and controls;
- no arm labels;
- no Qloo affinity scores;
- no generated rationale.

Ask the evaluator to:
1. choose which list best matches the profile;
2. rate each list 1–5 for taste fit;
3. rate non-obviousness 1–5;
4. flag recommendations that look generic/touristic;
5. optionally state which seed appears to influence the list.

## Validation criteria

Do **not** treat any single threshold as proven truth. The first run is diagnostic. Before using the experiment as a product gate, pre-register thresholds from pilot behavior and sample size.

However, the thesis should be considered in serious trouble if any of the following persist after fixing clear implementation errors:
- TARGET and COUNTERPROFILE have high overlap and are hard to distinguish;
- removing individual seeds causes little or no reproducible change;
- output composition is nearly identical across contrasting profiles;
- blind evaluators cannot identify TARGET above chance-like behavior;
- candidate sets are dominated by the same generic places regardless of seeds;
- non-food retrieval is structurally absent when relevant non-food entities exist in the source.

## Interpretation matrix

- **Different TARGET vs controls + meaningful ablation effects:** supports the translation hypothesis.
- **Different lists but blind evaluators see no taste fit:** personalization exists, taste translation remains unproven.
- **Food-heavy but profile-sensitive results:** implementation/product-presentation problem; not automatically thesis failure.
- **Food-heavy and profile-insensitive results:** strong evidence against the current Qloo strategy or translation thesis.
- **Seed-resolution failures:** data/integration problem; do not interpret downstream results.

## Decision gate

No expansion of the agent loop or trust architecture should be justified by this thesis until the validation packet has been reviewed and the team records one of:

- `SUPPORTED_FOR_NEXT_STAGE`
- `INCONCLUSIVE_RETEST`
- `QLOO_STRATEGY_NEEDS_REVISION`
- `PRODUCT_THESIS_NOT_SUPPORTED`

The experiment result, not architectural preference, determines the next stage.

## Observed validation result - 2026-10-17

Run: `20261017T100744Z`
City: Istanbul
Profiles:
- A: Interstellar + MUJI + The Martian
- B: Ratatouille + Anthropologie + The Little Prince

### Seed resolution

All six final seeds resolved exactly by expected entity type.

`IKEA` was replaced with `Anthropologie` before downstream retrieval because Qloo search returned IKEA only as `urn:entity:place`, not as `urn:entity:brand`. No recommendation results had been inspected before this replacement.

### Initial unconstrained retrieval

All 16 TARGET / COUNTERPROFILE / ABLATE / SINGLE arms completed with 25 candidates.

TARGET vs COUNTERPROFILE:
- Jaccard: 47.1%
- Top-10 overlap: 30.0%

Ablation showed material seed sensitivity:
- Profile A without MUJI: Jaccard 8.7%, Top-10 overlap 10.0%
- Profile B without Anthropologie: Jaccard 2.0%, Top-10 overlap 0.0%
- Profile B without The Little Prince: Jaccard 100.0%, Top-10 overlap 100.0%

This confirms that seed changes can materially affect unconstrained retrieval, but does not by itself establish meaningful taste translation.

### Blind evaluation

Before revealing the answer key:
- Profile A: INDETERMINATE, low confidence
- Profile B: selected List B, low-to-moderate confidence

The answer key showed List B was TARGET for both profiles.

Interpretation:
- Profile B produced one blind hit.
- Profile A was not distinguishable with confidence.
- The two blind packets used the same TARGET/COUNTERPROFILE pair in opposite profile contexts, so they are not independent trials.

### Food-signal metric invalidation

The initial `FoodSignalShare` metric is not valid as a category-collapse measure.

The implementation searched across all tag names, so hotel entities were marked as food-related when they merely had tags such as `Dining` or the amenity `Restaurant`.

Example:
- `Romantic Hotel Istanbul`
- primary genre: Hotel
- place category: Lodging / Hotel
- restaurant signal came from an amenity tag, not the entity's primary category

Therefore the reported 96% food share must not be used as evidence for food-category collapse.

### Retrieval-space diagnosis

Using Qloo primary genre / place-category fields showed the unconstrained TARGET results were heavily hospitality-oriented.

Profile A TARGET:
- approximately 20 of 25 results were Hotel/Hostel-like

Profile B TARGET:
- approximately 21 of 25 results were Hotel/Hostel-like

Excluding hotel/lodging tags caused results to shift mainly toward cafes, restaurants, bakeries, and bars rather than toward a broad set of cultural/local-place categories.

Adding further exclusions produced long-tail restaurant/hospitality variants rather than robust diversification.

Conclusion: blacklist-style category exclusion is not an acceptable diversification strategy.

### Positive category-controlled probes

Positive `filter.tags` probes were run to separate taste effects from category-selection effects.

#### Museum

Profile A vs Profile B:
- shared candidates: 23
- union: 27
- Jaccard: 85.2%
- Top-10 overlap: 90.0%
- Spearman rank correlation: 0.841
- Pearson affinity correlation: 0.986
- mean affinity delta: 0.0538
- affinity-delta standard deviation: 0.0070

#### Art gallery

Only 7 candidates were returned for each profile.

Profile A vs Profile B:
- shared candidates: 7 / 7
- Jaccard: 100.0%
- Spearman rank correlation: 0.893
- Pearson affinity correlation: 0.999
- mean affinity delta: 0.0506
- affinity-delta standard deviation: 0.0071

#### Book store

Profile A vs Profile B:
- shared candidates: 23
- union: 27
- Jaccard: 85.2%
- Top-10 overlap: 100.0%
- Spearman rank correlation: 0.947
- Pearson affinity correlation: 0.992

Across all three controlled categories, contrasting taste profiles produced largely the same candidate sets and strongly correlated rankings.

### Fixed mixed-category pool

A fixed pool of 21 candidates was created from Museum, Book store, and Art gallery results and passed to both profiles using `filter.results.entities`.

Profile A vs Profile B:
- Top-10 overlap: 100.0%
- Spearman rank correlation: 0.969
- Pearson affinity correlation: 0.995

This shows that even with the same mixed-category candidate pool, the two contrasting profiles produced nearly identical top results and highly correlated affinity scores.

### Current interpretation

Confirmed:
- Qloo responds to cross-domain seed changes.
- Some ablations materially change unconstrained retrieval.
- Qloo can score a fixed candidate pool.

Not confirmed:
- strong taste-sensitive candidate discovery within a controlled category;
- strong taste-sensitive reranking within a fixed mixed-category pool;
- meaningful cross-domain taste translation sufficient to justify the current Qloo-only product architecture.

The high Pearson correlations and relatively stable affinity offsets are consistent with a possible profile-level score shift rather than strong item-specific discrimination. This is an observed hypothesis, not a claim about Qloo's internal architecture.

### Decision gate

`QLOO_STRATEGY_NEEDS_REVISION`

The evidence does not justify proceeding to the agent loop, final trust architecture, or UI on the assumption that Qloo-only cross-domain place discovery is validated.

The product thesis itself is not yet rejected. The next stage should test a revised architecture or revised use of Qloo against explicit baselines before implementation expands.
