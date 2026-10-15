# TastePassport — Project Constitution v1.1

## 0. Compliance gate

No feature, recommendation, content source, monetization path, or presentation choice may be added merely to improve competition odds if it conflicts with the project owner's religious commitments.

When a religious ruling is unclear, the project does not guess or optimize around the uncertainty. The feature is marked for review and excluded from the user-facing MVP until clarified.

Decision order:

1. Compliance
2. Competition rules
3. Product value
4. Technical feasibility

## 1. Problem

People relocating to a new city do not merely lack information; they lack a culturally familiar starting point. Generic travel tools optimize for popularity, not personal fit.

TastePassport asks a different question:

> What are the local equivalents of the things I already love?

## 2. Primary user

International students, expats, relocated workers, and people moving permanently or semi-permanently to another city.

## 3. Product promise

The user provides 3–5 taste seeds from different domains and a destination city. TastePassport converts those signals into a Qloo-grounded taste profile and returns local matches that feel like a cultural translation of the user's existing preferences.

## 4. Non-negotiable Qloo principle

If Qloo could be removed and replaced with a good LLM prompt without materially changing the product, the design has failed.

Qloo must be the recommendation decision source. Any LLM layer may plan, evaluate, and narrate, but it may not freely invent final recommendations.

## 5. Agent loop

1. Understand
2. Resolve taste seeds to Qloo entities
3. Build a taste profile
4. Discover local candidates
5. Evaluate fit, diversity, and quality
6. Refine when needed
7. Explain grounded results

Maximum refinement loops in the MVP: **2**.

## 6. User experience

Input:
- 3–5 things the user loves
- destination city

Output:
- a small set of strong recommendations, not a long generic list
- evidence explaining why each item matches the user's taste
- visible agent progress tied to real workflow stages

## 7. Winning demo

Primary demo:
- same city
- two very different taste profiles
- clearly different local recommendations

Closing demo:
- same user
- three different cities
- visibly different cultural translations

## 8. Internal readiness tests

The project is not considered submission-ready unless all answers are yes:

- Can a judge understand the idea in 15 seconds?
- Is Qloo essential?
- Is there a real agent loop?
- Are recommendations grounded?
- Is recommendation evidence visible?
- Is the target user and pain point clear?
- Does the demo run end to end?
- Does the interface look like a product rather than a notebook?

## 9. MVP stack

- Next.js
- TypeScript
- Node.js
- Qloo API
- Vercel
- GitHub

No local GPU, database, or custom model training is required for the MVP.

## 10. Explicit non-goals before submission

Do not build:
- authentication
- payments
- reservations
- native mobile apps
- complex maps
- a social network
- recommendation history
- a user database
- custom model training
- large multilingual support
- enterprise dashboards

These may be explored after the hackathon only if they serve the product and pass the compliance gate.
