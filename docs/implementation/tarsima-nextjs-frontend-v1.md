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

## Frontend V1 gate

- Next app bootstraps.
- Existing tests remain green.
- New server-render tests remain green.
- Production build succeeds.
- Fixture READY render preserves Culture → Outdoor → City Life order.
- Raw evidence remains excluded from presentation payloads.

Mobile and true-device visual review have passed. A Vercel preview was validated on an earlier PR #18 checkpoint. Native `en` / `ar` localization, RTL rendering, and a simple language selector are now implemented on the current branch. The remaining Frontend V1 deployment-facing gate is a preview smoke from the current head.
