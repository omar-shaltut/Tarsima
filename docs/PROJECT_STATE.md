# TARSIMA Project State

**Recovered checkpoint date:** 2026-10-26  
**Repository:** `omar-shaltut/TastePassport`  
**Active implementation branch:** `feat/tarsima-nextjs-frontend-v1`  
**Open PR:** #18 — `Implement TARSIMA Next.js Frontend V1`  
**Recovered code baseline SHA before this checkpoint:** `a67911c6fcf72014599176e795cebe90eb0a9005`  
**Verified Vercel preview source SHA:** `f9bc4d7b61f46842c184ebfdc7863e00fe602310`

This file records the project state reconstructed from GitHub, local PowerShell output, browser screenshots, true-device screenshots, and the verified Vercel preview deployment after a ChatGPT conversation-sync loss. GitHub remains the source of truth for committed code. Screenshot-derived facts are explicitly labeled and are not treated as repository-verifiable implementation facts unless the code/CI also supports them.

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

Recovered code baseline: `a67911c6fcf72014599176e795cebe90eb0a9005`.

GitHub Actions on that exact SHA:

- `Repository Validation` run `40234331898`: **SUCCESS**.
- `Implementation Skeleton Validation` run `40234331917`: **SUCCESS**.

Recovery documentation head before this Vercel checkpoint: `f9bc4d7b61f46842c184ebfdc7863e00fe602310`.

GitHub Actions on that exact SHA:

- `Repository Validation` run `40238508312`: **SUCCESS**.
- `Implementation Skeleton Validation` run `40238508318`: **SUCCESS**.

Earlier scaffold integrity validation on `5b1e423bad762be609d6148f333f82909250a796` also recorded:

- `npm ci`: PASS.
- strict TypeScript / Next surface typecheck: PASS.
- all tests: PASS — 29 tests, 0 failures.
- deterministic fixture smoke: PASS.
- minimized frontend payload smoke: PASS.
- production `next build`: PASS.
- raw evidence boundary: PASS.

Any later code-bearing commit still requires its own validation. Documentation-only checkpoint commits do not change the runtime implementation, but their exact-head CI status should still be recorded before calling that head green.

## 6. Browser and mobile visual evidence

### Desktop

The Next.js Tarsima surface was run locally at `http://localhost:3000` and visually reviewed during the recovered session. Desktop refinements listed above were implemented before the recovered baseline SHA.

The verified Vercel preview was also visually reviewed in a desktop browser in English and Arabic:

- English / LTR: **VISUAL PASS**.
- Arabic localized rendering: **RENDER PASS**.
- Full native RTL layout: **NOT YET VERIFIED**.

The Arabic screenshots show translated Arabic content without visible clipping, overlap, or grid breakage. However, the page structure still appears visually LTR in important positions: the wordmark remains on the left, the city pill remains on the right, and the cards remain visually ordered Culture → Outdoor → City Life from left to right. Therefore the Arabic evidence must not be described as a full RTL-layout pass yet.

This localization distinction is presentation-only and does not change recommendation ordering, slot authority, or deterministic reconciliation.

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

### Project setup

Confirmed from CLI output and prior screenshots:

- Vercel team: `tarsima`.
- Vercel project: `tarsima/tarsima`.
- Framework auto-detected as Next.js.
- Git auto-deploy connection was deliberately **not** enabled during CLI setup.
- The repository remains `omar-shaltut/TastePassport`; the Vercel project name does not rename the repository.

### First deployment

The first Vercel deployment was created while the local repository was still at:

`a67911c6fcf72014599176e795cebe90eb0a9005`

Because it was the project's first deployment, Vercel assigned it to production automatically. That first deployment is **not** the canonical PR #18 validation deployment and must not be described as deploying the later recovery-documentation head.

Production alias created by Vercel:

- `https://tarsima.vercel.app`

No subsequent `--prod` overwrite was performed during this checkpoint.

### Canonical PR #18 preview validation

Before the canonical preview deployment, the local branch was fast-forwarded to:

`f9bc4d7b61f46842c184ebfdc7863e00fe602310`

The local working tree was then verified clean with `git status --short`.

Vercel preview metadata:

- Deployment ID: `dpl_7ksvWsDoSPLRYjQLK9HsQ8qif7he`
- Target: `preview`
- Status: **Ready**
- URL: `https://tarsima-l25k7xnif-tarsima.vercel.app`
- Created: 2026-10-26 01:22:44 GMT+0200
- Build region: `iad1`
- Build machine: 2 vCPU / 8192 MiB

Build evidence:

- Next.js `16.4.3` detected.
- `next build` executed.
- optimized production build compiled successfully.
- TypeScript completed successfully.
- static page generation completed `3/3`.
- deployment completed.
- final Vercel status: **Ready**.

Protected preview smoke evidence:

- Deployment Protection was enabled.
- `vercel curl` generated a deployment-protection bypass token successfully.
- the protected preview returned the real Tarsima HTML, including the TARSIMA page title, London fixture city, all three shared-pick cards, trust strip, and collapsed selection trace.

Browser smoke evidence:

- English / LTR preview: **VISUAL PASS**.
- Arabic translated rendering: **RENDER PASS**.
- Native RTL layout behavior: **NOT YET VERIFIED**.

Current verdict:

- `VERCEL_PROJECT_SETUP = CONFIRMED`
- `VERCEL_PREVIEW_SOURCE_SHA = f9bc4d7b61f46842c184ebfdc7863e00fe602310`
- `VERCEL_PREVIEW_TARGET = PREVIEW`
- `VERCEL_BUILD_V1 = PASS`
- `VERCEL_PREVIEW_STATUS = READY`
- `VERCEL_PROTECTED_CURL_SMOKE = PASS`
- `VERCEL_BROWSER_SMOKE_EN = VISUAL PASS`
- `VERCEL_BROWSER_SMOKE_AR_RENDER = PASS`
- `VERCEL_RTL_LOCALIZATION = NOT_YET_VERIFIED`

The user also reports connecting Vercel to ChatGPT; that remains user-reported external setup and is not repository-verifiable.

## 9. Local working-tree state

During local `npm run dev`, Next.js reported automatically updating `tsconfig.json` to add `.next/dev/types/**/*.ts` to `include`, and updated `next-env.d.ts`. Those generated local changes were deliberately restored from `HEAD` rather than committed as unrelated changes.

Vercel CLI created a local `.vercel/` directory and added `.vercel` to `.gitignore`. The `.gitignore` edit was restored from `HEAD`; `.vercel/` was then excluded **locally only** through `.git/info/exclude` so the Vercel project link remains available without modifying the repository.

Immediately before the canonical preview deployment:

- `git rev-parse HEAD` = `f9bc4d7b61f46842c184ebfdc7863e00fe602310`
- `git status --short` = empty

Therefore the canonical preview deployment was launched from a clean local tree at the recorded source SHA.

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
- production overwrite with `vercel --prod`;
- enabling automatic Git-triggered Vercel deployment without a separate decision.

## 11. Validation gate status and next unresolved product gate

The deployment/build gate for the fixture-backed Tarsima Next.js surface is **PASS**:

1. local source state verified clean at the recorded preview source SHA;
2. Vercel preview target verified;
3. Vercel production build completed successfully;
4. protected HTTP smoke returned the real application;
5. desktop English/LTR visual smoke passed;
6. Arabic translated rendering passed without visible breakage;
7. prior responsive and physical-device visual evidence remains valid.

Full Arabic RTL localization remains an **open presentation gate** because the screenshots do not yet prove RTL-native structural direction.

PR #18 remains intentionally **Draft**. Passing the deployment gate does **not** make the fixture data judge-final and does not authorize live Qloo or LLM integration.

The next unresolved product gates are:

- decide and validate the intended Arabic RTL structural behavior if Arabic is judge-facing;
- separately control the transition from fixture-backed presentation evidence to grounded judge-final content/integration.

Any such transition must preserve the frozen Qloo/deterministic/AI authority boundaries and requires explicit authorization before any new Qloo network call or holdout access.

This checkpoint is intended to make future recovery deterministic even if chat history becomes unavailable or desynchronized across devices.
