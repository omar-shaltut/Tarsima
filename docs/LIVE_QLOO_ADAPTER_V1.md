# LIVE_QLOO_ADAPTER_V1

## Scope

This slice adds a live Qloo implementation of `RetrievalSourceAdapter` only.

It does not replace:

- `ProfileResolverAdapter`;
- `ExplanationSourceAdapter`;
- deterministic reconciliation/ranking;
- slot fallback;
- deduplication;
- validation;
- the Judge Experience schema.

Fixture-backed profile resolution and explanation remain available while live Qloo retrieval is introduced behind the existing adapter boundary.

## Authority

Qloo supplies upstream candidate evidence.

Qloo does not select the final shared venue.

The deterministic engine remains the sole authority for:

- cross-profile intersection;
- `LEXIMIN_RANK_V1`;
- slot fallback;
- deduplication;
- final venue selection.

## Authentication

Server-side environment variable:

`QLOO_API_KEY`

HTTP header:

`X-Api-Key`

The key must never be returned to the browser, logged, committed, or embedded in client-side code.

## Endpoint

Method:

`GET`

Path:

`/v2/insights`

Default submission base URL:

`https://hackathon.api.qloo.com`

The base URL may be dependency-injected for tests.

## Retrieval request mapping

Internal `RetrievalRequest`:

- `profile.qloo_seed_entity_ids`
- `category`
- `destination_city`
- `side`

maps to:

- `filter.type=urn:entity:place`
- `signal.interests.entities=<comma-separated seed entity IDs>`
- `filter.tags=<category tag>`
- `filter.location.query=<destination_city>`
- `filter.location.radius=0`
- `take=18`

Category mapping:

- `art_gallery` -> `urn:tag:category:place:art_gallery`
- `book_store` -> `urn:tag:category:place:book_store`
- `museum` -> `urn:tag:category:place:museum`
- `park` -> `urn:tag:category:place:park`
- `restaurant` -> `urn:tag:category:place:restaurant`
- `shopping_mall` -> `urn:tag:category:place:shopping_mall`

## Response mapping

A successful provider response must contain:

`results.entities`

as an array.

For each returned entity, in provider order:

- `entity_id` is required and becomes `RankedEntity.entity_id`;
- rank is deterministic provider order, starting at `1`;
- `name` is copied only when supplied as a string, otherwise `null`;
- `display_type` is copied only if a verified string field is available; otherwise `null`.

No ranking value supplied by an LLM is accepted.

No entity without a valid `entity_id` may enter deterministic reconciliation.

## Status mapping

Valid 2xx response with a valid `results.entities` array:

`status = COMPLETE`

An empty valid entity array is still:

`status = COMPLETE`

Provider/transport failure, malformed response, or missing entity container must fail closed. The adapter must not synthesize candidates.

## Transport policy

For V1:

- request timeout is bounded;
- retry only transport failures, HTTP 408, HTTP 429, and HTTP 5xx;
- maximum attempts: 3;
- honor bounded `Retry-After` for 429;
- do not retry valid completed responses based on their content;
- do not alter the destination or category after seeing results.

## Testability

The adapter must support injected:

- `fetch` implementation;
- API base URL;
- API key.

Unit tests must run without a real Qloo key and must verify:

- request construction;
- authentication header;
- category mapping;
- provider-order rank mapping;
- empty valid response;
- malformed response fail-closed behavior;
- nonretryable HTTP failure;
- bounded retry behavior;
- bounded response-body timeout behavior;
- absence of secret leakage.

## Explicit non-goals

This slice does not authorize:

- holdout access;
- arbitrary profile resolution;
- LLM provider wiring;
- recommendation-policy changes;
- schema changes;
- production deployment.

## Gate

Implementation may proceed only against this frozen mapping.

A live Qloo smoke call remains a separate explicit authorization after offline tests pass.
