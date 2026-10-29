import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgenticExplanationAdapter,
  buildGroundedSelectionSnapshot,
} from '../../src/judge-experience/agentic-explanation-adapter.ts';
import type { ExplanationRequest } from '../../src/judge-experience/adapters.ts';

const REQUEST: ExplanationRequest = {
  run_id: 'run-agent-test',
  destination_city: 'Paris',
  slots: [
    {
      slot_id: 'CULTURE',
      status: 'SHARED_PRIMARY',
      resolved_category: 'museum',
      selected: {
        entity_id: 'culture-1',
        name: 'Museum One',
        display_type: 'museum',
        retrieval_category: 'museum',
        rank_a: 2,
        rank_b: 3,
        worst_rank: 3,
        total_rank: 5,
      },
    },
    {
      slot_id: 'OUTDOORS',
      status: 'SHARED_PRIMARY',
      resolved_category: 'park',
      selected: {
        entity_id: 'outdoors-1',
        name: 'Park One',
        display_type: 'park',
        retrieval_category: 'park',
        rank_a: 1,
        rank_b: 1,
        worst_rank: 1,
        total_rank: 2,
      },
    },
    {
      slot_id: 'CITY_LIFE',
      status: 'NO_SHARED_QLOO_EVIDENCE',
      resolved_category: null,
      selected: null,
    },
  ],
};

test('grounded selection snapshot exposes only immutable selected evidence', () => {
  assert.deepEqual(buildGroundedSelectionSnapshot(REQUEST), {
    destination_city: 'Paris',
    slots: [
      {
        slot_id: 'CULTURE',
        resolved_category: 'museum',
        entity_id: 'culture-1',
        name: 'Museum One',
        display_type: 'museum',
        rank_a: 2,
        rank_b: 3,
      },
      {
        slot_id: 'OUTDOORS',
        resolved_category: 'park',
        entity_id: 'outdoors-1',
        name: 'Park One',
        display_type: 'park',
        rank_a: 1,
        rank_b: 1,
      },
    ],
  });
});

test('agentic explanation adapter accepts grounded immutable output', async () => {
  const adapter = new AgenticExplanationAdapter(async () => ({
    slots: [
      {
        slot_id: 'CULTURE',
        entity_id: 'culture-1',
        name: 'Museum One',
        rank_a: 2,
        rank_b: 3,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
      {
        slot_id: 'OUTDOORS',
        entity_id: 'outdoors-1',
        name: 'Park One',
        rank_a: 1,
        rank_b: 1,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
    ],
    shared_taste_summary:
      'These selections reflect shared Qloo evidence across both profiles.',
  }));

  const result = await adapter.explain(REQUEST);

  assert.equal(result.slots.length, 2);
  assert.equal(result.slots[0]?.entity_id, 'culture-1');
  assert.equal(result.slots[1]?.entity_id, 'outdoors-1');
});

test('agentic explanation adapter rejects tampered immutable evidence', async () => {
  const adapter = new AgenticExplanationAdapter(async () => ({
    slots: [
      {
        slot_id: 'CULTURE',
        entity_id: 'tampered-id',
        name: 'Museum One',
        rank_a: 2,
        rank_b: 3,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
      {
        slot_id: 'OUTDOORS',
        entity_id: 'outdoors-1',
        name: 'Park One',
        rank_a: 1,
        rank_b: 1,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
    ],
    shared_taste_summary: null,
  }));

  await assert.rejects(
    () => adapter.explain(REQUEST),
    /failed deterministic validation/i,
  );
});

test('agentic explanation adapter rejects slot reordering', async () => {
  const adapter = new AgenticExplanationAdapter(async () => ({
    slots: [
      {
        slot_id: 'OUTDOORS',
        entity_id: 'outdoors-1',
        name: 'Park One',
        rank_a: 1,
        rank_b: 1,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
      {
        slot_id: 'CULTURE',
        entity_id: 'culture-1',
        name: 'Museum One',
        rank_a: 2,
        rank_b: 3,
        why_it_works:
          'Selected from shared Qloo evidence for both taste profiles.',
      },
    ],
    shared_taste_summary: null,
  }));

  await assert.rejects(
    () => adapter.explain(REQUEST),
    /failed deterministic validation/i,
  );
});

test('Gemini agent execution fails safely when API key is missing', async () => {
  const previous = process.env.GEMINI_API_KEY;

  try {
    delete process.env.GEMINI_API_KEY;

    const { executeGeminiAgentExplanation } = await import(
      '../../src/judge-experience/agentic-explanation-adapter.ts'
    );

    await assert.rejects(
      () => executeGeminiAgentExplanation(REQUEST),
      /GEMINI_API_KEY is required/i,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previous;
    }
  }
});
