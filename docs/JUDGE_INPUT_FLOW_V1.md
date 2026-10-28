# JUDGE_INPUT_FLOW_V1

## Purpose

This slice replaces the fixed judge-facing fixture inputs with the minimum real user input flow required for a grounded end-to-end Tarsima demonstration.

It preserves the existing recommendation authority model:

user inputs
-> Qloo entity search
-> explicit candidate selection
-> server-side selection verification
-> request-local profile resolution
-> live Qloo retrieval
-> deterministic reconciliation/ranking
-> deterministic grounded explanation bridge
-> existing Tarsima presentation

## Scope

Gate 3 may add:

- destination-city input;
- 3 to 5 taste seeds for person A;
- 3 to 5 taste seeds for person B;
- server-side Qloo entity search;
- explicit candidate selection for every seed;
- server-side verification that each selected entity came from the corresponding Qloo search;
- request-local profile registration;
- live Qloo retrieval through the existing adapter;
- a deterministic explanation bridge that copies immutable selected venue evidence into the existing explanation contract;
- English and Arabic judge-facing input states;
- explicit loading and failure states.

Gate 3 does not authorize:

- LLM or agent-provider wiring;
- automatic first-result selection;
- LLM-controlled entity resolution;
- recommendation-policy changes;
- ranking changes;
- schema changes;
- holdout access;
- production deployment;
- repository-wide branding rename.

## Input contract

The judge-facing UI accepts:

- one non-empty destination city;
- 3 to 5 non-empty taste seeds for person A;
- 3 to 5 non-empty taste seeds for person B.

No personal identifiers are required.

Raw taste text is used only for entity resolution. The existing Judge Experience engine continues to receive only opaque `profile_ref` values and resolved Qloo entity IDs.

## Candidate-selection flow

For every taste seed:

1. server-side code calls the existing Qloo entity-search client;
2. the UI receives normalized candidates only;
3. the user explicitly selects exactly one candidate;
4. no first result is automatically accepted.

The selection surface exposes:

- candidate name;
- Qloo entity types;
- disambiguation text when present.

A seed with no candidates cannot become profile evidence.

## Selection verification

Client-provided entity IDs are not trusted as profile evidence by themselves.

Before profile registration, server-side code revalidates each selected entity ID against a bounded Qloo search for its corresponding raw taste seed.

If the selected ID is not present in the verified candidate set, the run fails closed.

This avoids introducing persistent server session state solely for candidate provenance.

## Profile registration

After all selected entities are verified:

- person A receives a server-generated request-local `profile_ref`;
- person B receives a server-generated request-local `profile_ref`;
- the existing `RequestLocalProfileResolver` registers the selected IDs;
- existing 3-to-5, UUID, duplicate-ID, unknown-reference, and side-mismatch rules remain authoritative.

## Live retrieval

The run uses the existing `QlooRetrievalAdapter`.

`QLOO_API_KEY` remains server-side only.

The browser must never receive:

- the API key;
- provider authorization headers;
- raw provider error bodies;
- internal retry diagnostics.

Live-provider failures fail closed.

## Deterministic explanation bridge

Gate 3 does not add an LLM.

To satisfy the existing immutable explanation-validation contract without fixture text, Gate 3 may add a temporary deterministic `ExplanationSourceAdapter`.

For each already-selected slot, it copies only:

- `slot_id`;
- `entity_id`;
- `name`;
- `rank_a`;
- `rank_b`;

and emits a fixed grounded explanation stating that the venue was selected from shared Qloo evidence for both profiles.

The bridge:

- must not invent attributes;
- must not add new evidence;
- must not change venue selection;
- must not reorder slots;
- must not claim uniqueness, perfection, or guaranteed preference;
- should leave `shared_taste_summary` null.

Gate 4 may replace this bridge with validated agent/LLM explanation while preserving the same deterministic authority boundary.

## HTTP boundary

Gate 3 uses two server-only Next.js route-handler boundaries:

- `POST /api/judge/search`
- `POST /api/judge/run`

`/api/judge/search`:

- validates one raw taste seed;
- performs bounded Qloo entity search;
- returns normalized candidates only.

`/api/judge/run`:

- validates destination and 3-to-5 seeds per side;
- verifies every selected candidate server-side;
- registers request-local profiles;
- executes live Qloo retrieval and deterministic selection;
- applies the deterministic explanation bridge;
- returns the existing `JUDGE_FRONTEND_V1` payload.

No route may expose secrets or raw provider responses.

## UI boundary

The UI may:

- collect inputs;
- request candidate searches;
- display Qloo candidates;
- collect explicit selections;
- submit the final run;
- render returned presentation payloads and safe failure states.

The UI may not:

- rank Qloo candidates for recommendation purposes;
- select a candidate automatically;
- alter resolved entity IDs;
- select, substitute, reorder, or deduplicate final venues;
- generate explanation claims.

## Failure behavior

Fail closed when:

- destination city is empty;
- either person has fewer than 3 or more than 5 seeds;
- any seed is empty;
- any seed has no selectable candidate;
- a selected candidate cannot be verified against its seed;
- selected entity IDs collapse to duplicates within a profile;
- Qloo search or retrieval fails;
- the existing deterministic execution or validation contract fails.

User-facing errors must remain generic and must not disclose secrets or raw provider internals.

## Validation requirements

Tests must cover:

- 3-to-5 seed enforcement;
- destination validation;
- search request mapping;
- explicit-selection behavior;
- selection-tampering rejection;
- duplicate selected-entity rejection;
- API-key non-disclosure;
- request-local profile registration;
- live retrieval adapter composition;
- deterministic explanation bridge identity preservation;
- existing validator compatibility;
- unchanged deterministic ranking authority;
- `JUDGE_FRONTEND_V1` output compatibility;
- English input rendering;
- Arabic RTL input rendering;
- safe failure rendering;
- typecheck;
- full automated test suite;
- production build.

## Gate

Implementation is authorized only within this document.

Gate 3 is complete when a judge can enter two sets of real taste seeds plus a destination, explicitly resolve each seed to Qloo evidence, execute the live deterministic recommendation path, and see the existing Tarsima result presentation without any fixture-backed user input or LLM authority.

Production deployment remains separately gated.
