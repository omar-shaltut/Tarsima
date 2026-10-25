# TARSIMA Next.js Frontend V1

Implementation slice 1 migrates the validated `JUDGE_FRONTEND_V1` presentation surface into Next.js without changing recommendation authority.

## Baseline

- Base branch: `feat/frontend-consumption-v1`
- Base head: `ee8f119576bd968f2eafb548504564497912b61d`
- Brand system: TARSIMA Brand System V1

## Invariants

- `JUDGE_FRONTEND_V1` remains the browser/presentation boundary.
- React does not intersect, rank, select, dedupe, substitute, or reorder venues.
- Qloo/fixture evidence and deterministic reconciliation remain upstream.
- AI explanation copy is rendered only after the existing deterministic validator passes.
- No live Qloo call, holdout access, image provider, or LLM provider is added.

## Slice 1 gate

- Next app bootstraps.
- Existing tests remain green.
- New server-render tests remain green.
- Production build succeeds.
- Fixture READY render preserves Culture → Outdoor → City Life order.
- Raw evidence remains excluded from presentation payloads.

Mobile visual review and deployment remain later gates.
