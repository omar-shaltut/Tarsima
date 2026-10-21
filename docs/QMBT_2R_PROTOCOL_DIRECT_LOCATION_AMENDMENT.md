# QMBT-2R Direct-Location Protocol Amendment

Status: FROZEN AMENDMENT / NO LIVE EXECUTION AUTHORIZED

Issue: #10

Decision identifier: `QMBT-2R-LOC-DIRECT-QUERY-V1`

Supersedes: `QMBT-2R-LOC-v1` for effective QMBT-2R city operationalization.

## Scope

This amendment changes only QMBT-2R city operationalization. It preserves all non-locality decisions in `docs/QMBT_2R_PROTOCOL.md`, including retrieval-native independent retrieval, Qloo ordering, the six category quotas, `retrieval_depth_K = 18`, `SINGLE_SHOT_REMOTE_SEED_COMMIT`, evaluator rules, and the bounded transport retry policy.

The earlier locality-ID protocol, V1/V2 harnesses, and failed V1/V2 results remain audit history. They are not deleted, rewritten, or treated as successful evidence.

## Effective city operationalization

The controlling city policy is `QMBT-2R-LOC-DIRECT-QUERY-V1`.

1. No pre-Seed Qloo locality Entity Search or unique `urn:entity:locality` resolution is required before the Seed Commit.
2. The eight holdout city candidates remain exactly the previously reviewed candidates; no city may be replaced because of V1/V2 locality outcomes.
3. The effective machine-readable city geography contract is `config/qmbt-2r/direct-location-queries-v1.json`.
4. Each candidate uses exactly its frozen `filter.location.query` value from that manifest.
5. Every place retrieval uses `filter.location.radius=0`.
6. Researcher latitude/longitude remains audit metadata only and is not an operational geography filter.
7. `filter.location` locality UUIDs, WKT points or polygons, geohashes, coordinate fallbacks, and `signal.location` are prohibited for this policy.
8. A completed valid response that is sparse, empty, or fails quota assembly must not trigger query mutation, city replacement, alternate geography, or content-based retry.
9. Personalized and `UNSIGNALED_QLOO_BASELINE` conditions use the same frozen city query and radius.
10. The Seed Commit contains reviewed city identities and the frozen direct-query manifest values; Qloo locality IDs are not required.
11. Holdout ranking continues to use researcher-committed `canonical_id`; direct-query text and API outputs do not influence deterministic ranking.
12. After the Seed Commit, a selected city query must not be edited, normalized differently, replaced, or supplemented because of retrieval output.
13. If an exact frozen query cannot complete under the registered transport policy, stop as `INCOMPLETE_EXECUTION_API_OR_TRANSPORT` and request human review.
14. From the first confirmatory retrieval onward, selected holdout cities and their exact direct-query values are immutable for that registered experiment.

## Explicit supersession of earlier protocol text

For city operationalization only, this amendment supersedes earlier QMBT-2R statements that require:

- a pre-Seed locality-resolution pass for all eight cities;
- a unique Qloo `urn:entity:locality` ID before the Seed Commit;
- committing locality IDs before deterministic holdout ranking;
- using `filter.location=<frozen qloo locality id>` for confirmatory retrieval; or
- prohibiting `filter.location.query` for confirmatory retrieval.

Those statements remain historical protocol evidence but are no longer effective requirements after this reviewed amendment. No other frozen QMBT-2R decision is superseded.

## Development-only direct-location validation preregistration

A future live mechanism check may use only already-exposed Pair2/Pair3 × Istanbul/London development material. This amendment freezes the shape of that future check but does not authorize execution.

- Four development cases: Pair2 × Istanbul, Pair2 × London, Pair3 × Istanbul, Pair3 × London.
- Three independent conditions per case: profile side A, profile side B, and `UNSIGNALED_QLOO_BASELINE`.
- Six frozen categories per condition with `take=18`.
- Total registered shape: 4 cases × 3 conditions × 6 categories = 72 category retrieval requests.
- The exact Istanbul and London `filter.location.query` strings must be frozen in a separately reviewed development manifest before live authorization.
- Every development request must use `filter.location.radius=0` and the same no-fallback rules as the holdout architecture.
- No new holdout city or holdout profile may be inspected.
- No evaluator, semantic score, baseline-advantage score, holdout ranking, Seed Commit, or confirmatory evidence is produced by this mechanism check.
- Completed valid responses are never retried because their contents are sparse, empty, weak, or unfavorable.
- Any live development pass requires repository validation of its exact harness and manifest plus new explicit human authorization.
- After that pass, stop for human review. It does not automatically authorize Seed Commit creation or confirmatory execution.

## Repository enforcement

The effective direct-location manifest is validated by:

- `scripts/validation/Test-Qmbt2rDirectLocation.ps1`
- `scripts/validation/Test-Qmbt2rDirectLocation.Tests.ps1`

This amendment itself must also be pinned by offline validation before any live use.

## Stop gate

No live Qloo call, Seed Commit, holdout ranking, profile-seed resolution, or confirmatory execution is authorized by this amendment.

After repository validation succeeds for the exact protocol-amendment implementation, stop for human review before any live development request.