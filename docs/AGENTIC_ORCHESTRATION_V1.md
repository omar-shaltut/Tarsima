# AGENTIC_ORCHESTRATION_V1

## Status

DESIGN_FROZEN
COMPLETE

## Purpose

Add the minimum real agent behavior required for the Tarsima submission without transferring recommendation authority from deterministic code to an LLM.

## Frozen provider stack

- Provider: Google Gemini API
- Agent framework: `@openai/agents@0.21.0`
- Schema validation: `zod@4.6.7`
- Model: `gemini-3.6-flash`
- Model selection is explicit in code and must not rely on the SDK default.
- Authentication uses server-side `GEMINI_API_KEY` only.

## Existing authority boundary

The existing Tarsima pipeline remains authoritative for:

1. user-input validation;
2. Qloo entity verification;
3. request-local profile resolution;
4. Qloo evidence retrieval;
5. reconciliation;
6. `LEXIMIN_RANK_V1` ordering;
7. slot fallback;
8. deduplication;
9. final venue selection;
10. explanation validation.

The agent must not alter any of these decisions.

## Agent responsibility

Gate 4 introduces one bounded explanation agent.

The agent may:

- invoke one application-owned function tool to read the immutable deterministic selection;
- interpret that grounded selection;
- produce a concise shared-taste summary;
- produce a grounded explanation for each selected slot.

The agent may not:

- query Qloo directly;
- choose categories;
- select venues;
- add venues;
- remove venues;
- reorder slots;
- alter entity IDs;
- alter venue names;
- alter source ranks;
- claim unsupported uniqueness, perfection, or guaranteed preference;
- bypass deterministic validation.

## Tool contract

The agent receives exactly one function tool:

`read_grounded_selection`

The tool:

- is created per explanation request;
- is closure-bound to the immutable `ExplanationRequest`;
- accepts no destination, entity, ranking, or policy overrides;
- returns only the already-selected slots and destination needed for explanation;
- must not perform new recommendation retrieval;
- must not mutate application state.

The first model turn must call the tool.

The implementation must prevent the tool from becoming an alternate recommendation path.

## Structured output contract

The agent final output must be raw JSON text that Tarsima parses locally with `JSON.parse()` and validates against a strict Zod schema compatible with the existing `ExplanationPayload`.

For every selected slot it must preserve exactly:

- `slot_id`;
- `entity_id`;
- `name`;
- `rank_a`;
- `rank_b`.

Only natural-language explanation fields are generative.

## Final deterministic validation

`validateExplanation()` remains the final authority.

Any model output that changes immutable selection evidence or violates the truth contract must fail validation.

Local JSON/Zod validation does not replace Tarsima's deterministic alidateExplanation() authority.

## Failure behavior

Agent/provider/tool failures must fail closed.

Gate 4 must not silently allow the LLM to:

- fabricate missing evidence;
- substitute another venue;
- bypass validation;
- change recommendation policy.

Fixture and deterministic explanation adapters remain available for deterministic tests and non-agent test paths.

## Runtime boundary

Agent execution is server-side only.

`GEMINI_API_KEY` must never be:

- returned to the browser;
- committed;
- logged;
- included in test fixtures;
- included in error responses.

## Implementation shape

The preferred implementation is:

`AgenticExplanationAdapter implements ExplanationSourceAdapter`

Flow:

`immutable selected slots`
→ `bounded Agents SDK run`
→ `read_grounded_selection tool`
→ `raw JSON final output`
→ `JSON.parse() + strict local Zod validation`
→ `existing validateExplanation()`
→ `existing frontend payload`

No ranking or retrieval engine rewrite is authorized.

## Validation requirements

Before Gate 4 can be COMPLETE:

- typecheck PASS;
- existing tests PASS;
- new adapter unit tests PASS;
- tool cannot modify immutable selection;
- execution fails closed if `read_grounded_selection` was not actually executed before final output;
- raw model JSON parses and passes the strict local Zod schema for `ExplanationPayload`;
- validator rejects tampered model output;
- missing `GEMINI_API_KEY` fails safely;
- provider failure fails safely;
- live Gemini smoke PASS when a local server-side key is available;
- full live Qloo + agent path PASS;
- no secret leakage;
- build PASS.

## Explicit non-goals

Not authorized in Gate 4:

- multi-agent architecture;
- handoffs;
- agent memory;
- browser tools;
- web-search tools;
- MCP;
- computer-use tools;
- direct Qloo access by the LLM;
- autonomous recommendation ranking;
- UI expansion;
- schema redesign;
- production deployment.

## Completion principle

The agent explains and orchestrates a bounded tool call.

It does not recommend independently.

Deterministic Tarsima code remains the recommendation authority.
