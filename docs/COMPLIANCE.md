# Tarsima — Compliance Policy

This file defines product-level guardrails for the project owner. It is not a religious fatwa and does not claim to resolve disputed religious questions. Where a ruling is unclear, the project uses **REVIEW** and excludes the item from the user-facing MVP until the owner obtains a reliable ruling.

## Status model

- **PASS** — allowed for the MVP.
- **BLOCK** — must never be recommended or promoted.
- **REVIEW** — uncertain or context-dependent; excluded until clarified.

## BLOCK categories

The MVP must not recommend or promote:

- alcohol, bars, pubs, wineries, breweries, or drinking-focused venues;
- gambling, betting, casinos, lotteries, or wagering services;
- pornography, sexual services, sexually explicit entertainment, or venues centered on them;
- recreational drugs, intoxicants, or venues centered on them;
- deceptive, fraudulent, or clearly unlawful activity;
- fabricated reviews, fabricated usage metrics, fake testimonials, or invented evidence;
- recommendations not actually grounded in upstream data while being presented as if they were;
- monetization tied directly to blocked categories.

## REVIEW categories

The following are not automatically approved for the MVP and must be reviewed before user-facing inclusion:

- music-centered venues or entertainment;
- nightlife not already covered by BLOCK;
- mixed-purpose events where permissibility depends on the specific content;
- financial products involving interest, derivatives, gambling-like mechanics, or unclear structures;
- any category where the governing ruling is disputed or context-sensitive.

Until reviewed, these are excluded from final recommendations.

## PASS-oriented MVP focus

Prefer recommendation domains with low compliance ambiguity, such as:

- suitable restaurants and cafés;
- libraries and bookshops;
- museums, landmarks, and cultural heritage sites, subject to content review where needed;
- parks and nature;
- neighborhoods and markets;
- design, architecture, and retail;
- family-friendly activities;
- educational and professional spaces;
- non-problematic local experiences.

## Enforcement architecture

The intended pipeline is:

`Qloo candidates → Compliance Gate → Agent evaluation → Final recommendations`

The Compliance Gate must run **before** user-facing output.

Where possible, rules should be deterministic and auditable using category, tag, keyword, and entity metadata. The project must not rely solely on an LLM to remember compliance requirements.

## Truthfulness rules

The project must not:

- exaggerate what Qloo returned;
- invent recommendation evidence;
- claim real-world testing that did not occur;
- fabricate users, judges, partners, traction, revenue, or metrics;
- misrepresent third-party content, licensing, or attribution;
- bypass competition rules for the sake of winning.

## Privacy rules

The MVP should minimize personal data collection. No user database is planned. If any data persistence is later added, collection must be limited to what is necessary, transparent to the user, and reviewed under this policy.

## Change control

Any new feature or recommendation category must be evaluated in this order:

1. Is it clearly PASS, BLOCK, or REVIEW?
2. Does it comply with competition rules?
3. Does it materially improve the product?
4. Is it worth the implementation cost before the deadline?

If step 1 is unresolved, implementation stops until reviewed.
