# TARSIMA Submission Readiness V1

## Purpose

This document freezes the submission-completion path after the Frontend V1 stack was merged to `main`.

It is a planning and validation checkpoint only. It does not authorize runtime, ranking, schema, provider, or production-deployment changes by itself.

## Confirmed repository state

- Frontend V1 and submission-foundation PRs through `#21` are merged.
- `main` is synchronized at merge commit:
  `830605cf6114623aef6f60d9b3bca48bc621c6d6`.
- English and Arabic presentation paths are implemented.
- `/en` uses LTR presentation.
- `/ar` uses native RTL presentation.
- Responsive and physical-device visual review has passed for the current Frontend V1 surface.
- Existing recommendation selection remains deterministic.
- Fixture mode remains available for deterministic tests.
- Live Qloo retrieval and profile-resolution foundations are implemented behind server-side adapter boundaries.
- Judge-facing real-input flow is implemented in `feat/judge-input-flow-v1` and validated locally against live Qloo.
- No production overwrite has been authorized.
- Gemini-backed bounded agentic explanation wiring is implemented and validated; deterministic recommendation authority remains unchanged.

## Frozen authority boundaries

These boundaries remain unchanged for the submission slice:

1. Qloo or validated fixture evidence is upstream evidence.
2. Deterministic code owns recommendation intersection, ranking, fallback, and deduplication.
3. An LLM or agent must not invent, substitute, reorder, or independently select final venues.
4. Natural-language explanation happens only after deterministic selection.
5. Deterministic validation remains the final authority.
6. Secrets must remain server-side and must never be committed.
7. No holdout access is authorized without an explicit gate.

## TARSIMA_SUBMISSION_SLICE_V1

The minimum submission-completion path is:

### Gate 1 — Submission architecture freeze

Define the smallest end-to-end flow that qualifies as the submission without changing the product's deterministic authority model.

Target flow:

`User taste inputs + destination`
→ `profile resolution`
→ `live Qloo evidence retrieval`
→ `deterministic reconciliation/ranking`
→ `validated explanation`
→ `Tarsima presentation`

Status: COMPLETE

### Gate 2 — Live Qloo adapter

Implement the live provider behind the existing adapter boundary.

Requirements:

- API key is server-side only.
- Existing deterministic engine remains unchanged unless a separately documented incompatibility is proven.
- Returned evidence must preserve provenance required by the current contracts.
- Invalid or insufficient provider responses fail closed.
- Fixture mode remains available for deterministic tests.
- Live-provider tests must not expose secrets.

Status: COMPLETE

### Gate 3 — Judge-facing input flow

Replace the fixed judge demonstration inputs with the minimum real input surface needed for an end-to-end demonstration.

The UI must not acquire recommendation authority.

Validated in Gate 3:

- real destination + 3–5 taste seeds per person;
- explicit Qloo candidate selection;
- server-side re-verification of selected entity IDs;
- request-local profile resolution;
- live Qloo retrieval;
- unchanged deterministic reconciliation/ranking;
- deterministic grounded explanation bridge wired through the bounded Gemini-backed agent adapter;
- English and Arabic/RTL desktop rendering;
- mobile responsive rendering;
- HTTP `/api/judge/search` and `/api/judge/run` live smoke;
- no production deployment.

Status: COMPLETE

### Gate 4 — Agentic orchestration

Add only the minimum agent behavior required by the submission.

The agent may:

- interpret user intent;
- coordinate supported tools/adapters;
- request evidence;
- decide whether another supported evidence-retrieval step is needed;
- generate grounded explanation after deterministic selection.

The agent may not:

- invent venues;
- replace deterministic ranking;
- bypass evidence validation;
- silently change recommendation policy.

Provider/framework choice is frozen as Google Gemini API (`gemini-3.6-flash`) through `@openai/agents@0.21.0`; live Gemini validation and the full live Qloo + agent path have passed.

Status: COMPLETE

### Gate 5 — End-to-end validation

Validate the complete live path:

- typecheck;
- automated tests;
- build;
- live Qloo smoke;
- deterministic-output validation;
- English smoke;
- Arabic/RTL smoke;
- mobile smoke;
- secret-leak review;
- failure-state review.

Status: COMPLETE

### Gate 6 — Public deployment

Deploy the validated submission surface only after the live path passes.

Production deployment remains separately gated from preview validation.

Status: PENDING

### Gate 7 — Repository submission hardening

Update repository-facing documentation to reflect the actual final product:

- Tarsima branding;
- current architecture;
- Qloo integration;
- deterministic/agent authority boundary;
- local setup;
- required environment variables;
- testing instructions;
- public demo link;
- license verification.

Status: PENDING

### Gate 8 — Submission package

Prepare the final submission materials:

- concise problem statement;
- solution statement;
- why Qloo is essential;
- architecture explanation;
- agentic behavior explanation;
- deterministic safety/grounding explanation;
- repository link;
- public demo link;
- screenshots where useful;
- testing/judge instructions.

External competition requirements must be re-verified against the current official rules before final submission.

Status: PENDING

### Gate 9 — Final judge-mode smoke

Test the submission exactly as an external judge would encounter it:

- public URL opens without privileged access;
- primary flow is understandable without developer context;
- no secret or internal diagnostic information is exposed;
- expected success path works;
- expected failure path degrades safely;
- submitted links and descriptions match the deployed implementation.

Status: PENDING

### Gate 10 — Submit

Submit only after all preceding gates are closed or an explicitly documented exception is accepted.

Status: PENDING

## Explicit non-goals before submission

Do not add work merely for polish if it threatens completion.

Deferred unless proven necessary:

- additional locales beyond `en` and `ar`;
- Git history rewrite for legacy branding;
- recommendation-algorithm redesign;
- schema redesign;
- venue image provider;
- speculative personalization features;
- additional destination categories;
- production infrastructure refactors;
- judge-only visual effects.

## Next technical task

Proceed to Gate 6 — Public deployment only after preserving the validated Gate 5 configuration and authority boundaries.

## Completion principle

From this checkpoint onward:

**completion > expansion**

The remaining work should reduce submission risk, not increase product scope.
