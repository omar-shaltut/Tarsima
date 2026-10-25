# TARSIMA Project State

**Recovered checkpoint date:** 2026-10-26  
**Repository:** `omar-shaltut/TastePassport`  
**Active implementation branch:** `feat/tarsima-nextjs-frontend-v1`  
**Open PR:** #18 — `Implement TARSIMA Next.js Frontend V1`  
**Recovered code baseline SHA before this checkpoint:** `a67911c6fcf72014599176e795cebe90eb0a9005`

This file records the project state reconstructed from GitHub, local PowerShell output, browser screenshots, and true-device screenshots after a ChatGPT conversation-sync loss. GitHub remains the source of truth for committed code. Screenshot-derived facts are explicitly labeled and are not treated as repository-verifiable implementation facts unless the code/CI also supports them.

## 1. Current implementation status

PR #18 is a stacked draft PR based on PR #17 (`feat/frontend-consumption-v1`, exact base SHA `ee8f119576bd968f2eafb548504564497912b61d`). It migrates the validated `JUDGE_FRONTEND_V1` presentation surface to Next.js while preserving the existing recommendation authority boundary.

Implemented on PR #18:

- Next.js `16.4.3` App Router.
- React / React DOM `19.3.1`.
- Server Components by default.
- Reproducible npm dependency resolution via committed `package-lock.json`.
- Production `next build` in CI.
- Server-only fixture-backed payload composition through the existing `executeFixtureForFrontend` path.
- Presentation-only React components; React does not perform recommendation selection, ranking, dedupe, substitution, or reordering.
- `JUDGE_FRONTEND_V1` remains the minimized presentation boundary.

## 2. Frozen recommendation authority

The current frontend work does **not** change recommendation semantics.

- Qloo / fixture adapter supplies recommendation evidence.
- Same-category reconciliation remains deterministic.
- `LEXIMIN_RANK_V1` remains the within-category shared-match selector.
- `CROSS_CATEGORY_SLOT_CONTRACT_V1` remains fixed:
  - `CULTURE`: museum → art_gallery → book_store
  - `OUTDOORS`: park
  - `CITY_LIFE`: restaurant → shopping_mall
- No cross-category rank arithmetic or global #1 is allowed.
- One entity may appear in at most one final slot.
- Honest empty slots remain valid; one-sided fallback is prohibited.
- Explanation generation occurs only after venue selection.
- The deterministic validator remains final authority over explanation output.
- AI may explain selected places; AI may not select, reorder, substitute, or invent venues.

## 3. TARSIMA Brand System V1

The user-facing brand implemented in PR #18 is **Tarsima**. The repository has intentionally **not** been renamed yet.

Typography:

- Wordmark: Fraunces.
- Editorial headings: Newsreader.
- UI/body: Source Sans 3.
- Fraunces wordmark axes: `opsz 96`, `SOFT 70`, `WONK 1`.

Implemented core palette tokens:

- Brand primary: `#185C55`
- Brand primary hover: `#124A45`
- Primary text: `#172824`
- Muted text: `#66706C`
- Canvas: `#F8F5EE`
- Surface: `#FFFDF8`
- Trust surface: `#E8F0EC`
- Trace: `#193B37`
- Culture accent/surface: `#C86545` / `#F1DDD3`
- Outdoor accent/surface: `#86A98C` / `#DDEADF`
- City Life accent/surface: `#C9C0DF` / `#E5E0EF`

## 4. Recovered presentation refinements

The following refinements are committed on the active branch:

- User-facing profile labels changed from `Person A / Person B` to `You / Partner`.
- Repeated `Culture · Outdoors · City Life` section eyebrow removed.
- Shared evidence badge changed to neutral `Shared match`.
- Rank evidence retained but category scope clarified, e.g. `You · #2 in Museum` and `Partner · #3 in Museum`.
- Trust strip appears immediately after recommendation cards.
- Execution trace is preserved but collapsed by default using native `<details>` with `How these picks were chosen`.
- Desktop fold spacing was tightened without changing recommendation logic.

## 5. CI checkpoint

Exact recovered code baseline: `a67911c6fcf72014599176e795cebe90eb0a9005`.

GitHub Actions on that exact SHA:

- `Repository Validation` run `40234331898`: **SUCCESS**.
- `Implementation Skeleton Validation` run `40234331917`: **SUCCESS**.

Earlier scaffold integrity validation on `5b1e423bad762be609d6148f333f82909250a796` also recorded:

- `npm ci`: PASS.
- strict TypeScript / Next surface typecheck: PASS.
- all tests: PASS — 29 tests, 0 failures.
- deterministic fixture smoke: PASS.
- minimized frontend payload smoke: PASS.
- production `next build`: PASS.
- raw evidence boundary: PASS.

No new code changes should be treated as validated until CI is green on the new exact head.

## 6. Browser and mobile visual evidence

### Desktop

The Next.js Tarsima surface was run locally at `http://localhost:3000` and visually reviewed during the recovered session. Desktop refinements listed above were implemented before the recovered baseline SHA.

### Responsive DevTools

User-provided screenshots document responsive review at:

- `390 × 844`
- `430 × 844`

Observed in both widths:

- single-column recommendation cards;
- no visible horizontal overflow;
- stable header, hero, people chips, rank badges, trust strip, and collapsed trace;
- rank badges wrap instead of clipping;
- Culture / Outdoor / City Life remain equal-weight slots.

### True physical-device review

User-provided screenshots from a physical phone loading the development server over the local network confirm that the current UI renders end-to-end on a real device.

`TRUE_DEVICE_MOBILE_REVIEW_V1 = VISUAL PASS`

This is a visual pass. A console/DOM assertion such as `document.documentElement.scrollWidth <= window.innerWidth` has **not** been recorded as an explicit technical overflow check in this checkpoint.

## 7. Fixture / content limitation

The current surface is still fixture-backed. Generic fixture names such as `Shared Museum`, `Shared Park`, and `Shared City Place`, plus generic fixture explanations, are development evidence and are **not** judge-final content.

Do not fabricate real venue names, match percentages, profile rationales, or venue-specific explanations to make the fixture appear live.

Judge-final content remains dependent on separately authorized, grounded integration work.

## 8. Vercel state

Confirmed from user-provided Vercel screenshots:

- Vercel GitHub integration is connected to `omar-shaltut/TastePassport`.
- A Vercel Hobby team named `Tarsima` exists/was selected.
- The repository reached the Vercel `New Project` import screen.
- Project name shown: `tastepassport`.
- Root directory shown: `./`.
- A Deploy action is available.

**Important branch warning:** the recovered Vercel import screenshot shows GitHub branch `main`, while the validated Next.js Tarsima implementation currently lives on `feat/tarsima-nextjs-frontend-v1` / PR #18. Do **not** treat a deployment from `main` as a deployment of the recovered PR #18 implementation unless branch/source configuration is explicitly verified.

Current deployment verdict:

- `VERCEL_GITHUB_CONNECTION = CONFIRMED`
- `VERCEL_IMPORT_SCREEN_REACHED = CONFIRMED`
- `VERCEL_PR18_SOURCE_BRANCH = NOT YET VERIFIED`
- `VERCEL_DEPLOYMENT_SUCCESS = NOT YET PROVEN`
- No production URL is recorded by this checkpoint.

The user also reports connecting Vercel to ChatGPT; that is not repository-verifiable and is recorded here only as user-reported external setup.

## 9. Local working-tree caution

During local `npm run dev`, Next.js reported automatically updating `tsconfig.json` to add `.next/dev/types/**/*.ts` to `include`.

The GitHub version at the recovered baseline contains `.next/types/**/*.ts` but not `.next/dev/types/**/*.ts`.

Therefore, before the next local commit:

1. inspect `git status`;
2. inspect any `tsconfig.json` diff;
3. decide explicitly whether the Next-generated change is required;
4. do not commit it silently as an unrelated change.

## 10. Explicit non-goals / unauthorized actions

This checkpoint does **not** authorize:

- live Qloo calls;
- holdout access;
- QlooAdapter/live provider execution;
- LLM provider wiring;
- venue image-provider integration;
- algorithm/ranking/slot-contract changes;
- repository rename;
- automatic PR merge;
- treating a Vercel deployment from the wrong branch as PR #18 validation.

## 11. Next validation gate

Before new product implementation:

1. Verify the local working tree is clean or reconcile the Next-generated `tsconfig.json` change deliberately.
2. Verify Vercel is configured to deploy the intended PR #18 branch/preview rather than assuming `main` contains the Next.js Tarsima implementation.
3. Perform the Vercel deployment only after the source branch is correct.
4. Record deployment URL, exact deployed commit SHA, build result, and browser smoke result.
5. Keep PR #18 Draft until deployment/browser gates are explicitly reviewed.

This checkpoint is intended to make future recovery deterministic even if chat history becomes unavailable or desynchronized across devices.
