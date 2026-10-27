# PROFILE_RESOLUTION_V1

## Purpose

This slice defines the minimum grounded path from user taste inputs to Qloo entity IDs without changing the frozen Judge Experience schema or recommendation authority.

Target path:

user taste text
-> Qloo entity search
-> explicit candidate selection
-> request-local resolved profile
-> existing Judge Experience engine

## Scope

This slice may add:

- a server-side Qloo entity-search boundary;
- normalized search candidates;
- explicit user/caller selection of Qloo entities;
- request-local profile registration;
- a `ProfileResolverAdapter` implementation backed by that registered selection.

This slice does not authorize:

- recommendation-policy changes;
- automatic first-result selection;
- LLM-controlled entity selection;
- changes to `JudgeExperienceRunRequest`;
- changes to `ResolvedProfile`;
- holdout access;
- explanation-provider wiring;
- production deployment.

## Existing engine boundary

The existing engine continues to receive only:

- `side`;
- `profile_ref`.

`profile_ref` remains an opaque reference.

A request-local profile registry maps each accepted `profile_ref` to the selected Qloo entity IDs.

The engine does not receive raw taste text.

## User taste contract

Each person supplies:

- 3 to 5 taste seeds;
- one destination city for the shared run.

Each accepted taste seed must resolve to one explicitly selected Qloo entity.

A resolved profile must contain 3 to 5 unique Qloo entity IDs.

Duplicate selected entity IDs are rejected before engine execution. The system must not silently collapse multiple taste seeds into one entity.

No personal identifiers are required or sent to Qloo.

## Qloo entity-search request

Provider operation:

`GET /search`

Verified across current Qloo references:

- `query=<user supplied taste text>`;
- bounded result count through `take`;
- match-oriented ordering through `sort_by=match`.

Entity-type parameter spelling is not frozen yet:

- the official hackathon example uses singular `type=<urn:entity:...>`;
- the current public Qloo reference documents `types` as an array.

V1 must not guess between these forms. The contract-discovery smoke call will verify the event-host behavior before implementation.

Event-host validation confirmed that `/search` succeeds without any entity-type filter. Therefore V1 default search uses no `type` parameter. Entity-type filtering remains optional and may be introduced only when needed to disambiguate a query.

V1 candidate count:

`take=8`

Authentication remains server-side through:

`QLOO_API_KEY`

with:

`X-Api-Key`

The event-authorized Qloo base URL remains separately configurable.

## Candidate-selection authority

Search results are candidates only.

The system must not silently treat the first Qloo search result as the user's intended entity.

Before an entity ID becomes profile evidence, the caller must explicitly select a candidate.

The selection surface should expose enough verified provider metadata to distinguish candidates when available, such as:

- entity name;
- entity type/subtype;
- optional disambiguation metadata.

An LLM may later help interpret user intent, but it may not silently convert an ambiguous search result into accepted profile evidence.

## Response mapping

The event-host `/search` response contract was verified by one bounded contract-discovery smoke call.

Verified successful response:

- top-level object contains `results`;
- `results` is an array;
- each candidate exposes:
  - `entity_id` as string;
  - `name` as string;
  - `types` as an array of strings;
  - `properties` as an object when present;
  - `popularity`;
  - `disambiguation` as a string in the verified response;
  - `tags`.

Verified request behavior on the event host:

- `GET /search`;
- `query=<text>`;
- singular `type=<urn:entity:...>` is accepted;
- `take` is accepted;
- `sort_by=match` is accepted;
- authentication uses `X-Api-Key`.

Parser requirements:

- require top-level `results` array;
- require non-empty string `entity_id` for accepted candidates;
- require string `name` for displayable candidates;
- accept `types` only when it is an array of strings;
- treat optional provider metadata as optional;
- fail closed on malformed envelope or malformed required candidate fields;
- never infer missing entity IDs or synthesize candidates.

The contract-discovery gate is now satisfied. Offline parser implementation is authorized.

## Profile registration

After explicit candidate selection, server-side code creates a request-local profile entry:

`profile_ref -> selected Qloo entity IDs`

The `ProfileResolverAdapter` resolves only registered profile references.

It must fail closed when:

- the profile reference is unknown;
- the side does not match;
- fewer than 3 unique entity IDs are present;
- more than 5 unique entity IDs are present;
- any selected entity ID is invalid.

The adapter returns the existing `ResolvedProfile` shape without schema changes.

## Transport policy

Entity search must use bounded transport behavior.

V1 should preserve the existing live-Qloo principles:

- bounded timeout;
- maximum 3 attempts;
- retry only transport failures, HTTP 408, HTTP 429, and HTTP 5xx;
- bounded `Retry-After`;
- no content-based retry;
- no silent query mutation after results are returned.

## Failure behavior

No search result:

- return an explicit no-candidate state;
- do not fabricate an entity.

Ambiguous result:

- require explicit candidate selection;
- do not auto-resolve.

Malformed provider response:

- fail closed.

Provider unavailable:

- fail closed for live profile resolution;
- do not substitute fixture evidence into a live run.

## Validation requirements

Offline tests must cover:

- request mapping;
- authentication header;
- bounded candidate count;
- candidate normalization;
- malformed response failure;
- retry policy;
- timeout behavior;
- secret non-disclosure;
- explicit-selection requirement;
- 3-to-5 unique seed enforcement;
- unknown profile reference failure;
- side mismatch failure;
- unchanged `ResolvedProfile` output contract.

## Gate

The successful event-host `/search` response envelope has been verified. Response parser implementation is authorized within this frozen contract.

No recommendation call is authorized by this document.
