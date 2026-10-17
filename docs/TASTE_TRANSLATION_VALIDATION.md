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
- IKEA — brand
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
