import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicExplanationAdapter } from '../../src/judge-experience/deterministic-explanation-adapter.ts';
import type { SlotResult } from '../../src/judge-experience/types.ts';
import { validateExplanation } from '../../src/judge-experience/validator.ts';

const SHARED_SLOT: SlotResult = {
  slot_id: 'CULTURE',
  status: 'SHARED_PRIMARY',
  resolved_category: 'museum',
  selected: {
    entity_id: '11111111-1111-4111-8111-111111111111',
    name: 'Example Museum',
    display_type: 'Museum',
    retrieval_category: 'museum',
    rank_a: 2,
    rank_b: 4,
    worst_rank: 4,
    total_rank: 6,
  },
};

test('copies immutable selected evidence into deterministic explanation', async () => {
  const adapter = new DeterministicExplanationAdapter();

  const payload = await adapter.explain({
    run_id: 'run-1',
    destination_city: 'Paris',
    slots: [SHARED_SLOT],
  });

  assert.deepEqual(payload, {
    slots: [
      {
        slot_id: 'CULTURE',
        entity_id: '11111111-1111-4111-8111-111111111111',
        name: 'Example Museum',
        rank_a: 2,
        rank_b: 4,
        why_it_works:
          'Selected from shared Qloo evidence surfaced for both taste profiles.',
      },
    ],
    shared_taste_summary: null,
  });
});

test('produces explanation accepted by the existing deterministic validator', async () => {
  const adapter = new DeterministicExplanationAdapter();

  const payload = await adapter.explain({
    run_id: 'run-2',
    destination_city: 'Paris',
    slots: [SHARED_SLOT],
  });

  assert.deepEqual(validateExplanation([SHARED_SLOT], payload), {
    status: 'PASS',
    reasons: [],
  });
});

test('fails closed when shared-primary selection evidence is missing', async () => {
  const adapter = new DeterministicExplanationAdapter();

  const malformedSlot: SlotResult = {
    slot_id: 'CULTURE',
    status: 'SHARED_PRIMARY',
    resolved_category: 'museum',
    selected: null,
  };

  await assert.rejects(
    adapter.explain({
      run_id: 'run-3',
      destination_city: 'Paris',
      slots: [malformedSlot],
    }),
    /missing immutable selection evidence/i,
  );
});
