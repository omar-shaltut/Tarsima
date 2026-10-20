# Qloo Fixed-Pool API Semantics Diagnostic

Status: PRE-REGISTERED DIAGNOSTIC — NOT CONFIRMATORY EVIDENCE

## Context

QMBT-1 run `20261020T224345Z` stopped as:

`INVALID_EXECUTION_API_SEMANTICS`

because a personalized request using `filter.results.entities` did not return the exact frozen entity set supplied by the harness.

This diagnostic does not test the TastePassport product hypothesis and must not be counted as QMBT evidence.

## Question

Can Qloo reproducibly score a known place entity under a profile when that entity is supplied individually through:

`filter.results.entities=<ONE_ENTITY_ID>`

without omitting that entity?

## Diagnostic method

Use a small place sample obtained independently from a normal place retrieval.

For each sampled place entity:

1. call Qloo with exactly one entity ID in `filter.results.entities`;
2. score it under Profile E;
3. score it under Profile F;
4. score it under `UNSIGNALED_QLOO_BASELINE`;
5. repeat the same calls once to test reproducibility.

Record for every request:

- requested entity ID;
- whether the entity was returned;
- returned entity ID;
- affinity if present;
- condition;
- request parameters excluding authentication secrets.

## Pass criteria

The single-entity method is considered technically viable for fixed-pool scoring only if:

1. every requested place entity is returned in every condition;
2. returned ID exactly matches requested ID;
3. personalized calls provide usable affinity values;
4. repeated calls do not change entity presence semantics.

## Failure criteria

The method is rejected if any requested entity is omitted under any required condition or if entity identity is inconsistent.

No missing entity may be assigned an invented affinity such as zero.

## Decision consequence

PASS:
A protocol amendment may be designed using deterministic per-entity scoring, followed by a new preregistered confirmatory run.

FAIL:
Do not attempt another fixed-pool QMBT formulation based on `filter.results.entities`; reconsider the retrieval/scoring strategy before further confirmatory testing.
