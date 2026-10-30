import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExplanationRequest,
  ExplanationSourceAdapter,
} from '../../src/judge-experience/adapters.ts';
import {
  isExplanationAvailabilityFailure,
  ResilientExplanationAdapter,
} from '../../src/judge-experience/resilient-explanation-adapter.ts';

const REQUEST: ExplanationRequest = {
  run_id: 'run-resilient-test',
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
  ],
};

const FALLBACK_PAYLOAD = {
  slots: [
    {
      slot_id: 'CULTURE' as const,
      entity_id: 'culture-1',
      name: 'Museum One',
      rank_a: 2,
      rank_b: 3,
      why_it_works:
        'Selected from shared Qloo evidence surfaced for both taste profiles.',
    },
  ],
  shared_taste_summary: null,
};

test('availability classifier accepts 429 and rejects ordinary errors', () => {
  assert.equal(
    isExplanationAvailabilityFailure({
      name: 'RateLimitError',
      status: 429,
      message: 'RESOURCE_EXHAUSTED',
    }),
    true,
  );

  assert.equal(
    isExplanationAvailabilityFailure(
      new Error('Agent explanation failed deterministic validation.'),
    ),
    false,
  );
});

test('resilient adapter falls back when primary is rate limited', async () => {
  const warnings: string[] = [];

  const primary: ExplanationSourceAdapter = {
    adapter_id: 'TEST_PRIMARY',
    async explain() {
      const error = new Error('RESOURCE_EXHAUSTED') as Error & {
        status: number;
        name: string;
      };
      error.status = 429;
      error.name = 'RateLimitError';
      throw error;
    },
  };

  const fallback: ExplanationSourceAdapter = {
    adapter_id: 'TEST_FALLBACK',
    async explain() {
      return FALLBACK_PAYLOAD;
    },
  };

  const adapter = new ResilientExplanationAdapter({
    primary,
    fallback,
    logWarning: (message) => warnings.push(message),
  });

  const result = await adapter.explain(REQUEST);

  assert.deepEqual(result, FALLBACK_PAYLOAD);
  assert.equal(warnings.length, 1);
});

test('resilient adapter does not hide non-availability failures', async () => {
  let fallbackCalled = false;

  const primary: ExplanationSourceAdapter = {
    adapter_id: 'TEST_PRIMARY',
    async explain() {
      throw new Error('Agent explanation failed deterministic validation.');
    },
  };

  const fallback: ExplanationSourceAdapter = {
    adapter_id: 'TEST_FALLBACK',
    async explain() {
      fallbackCalled = true;
      return FALLBACK_PAYLOAD;
    },
  };

  const adapter = new ResilientExplanationAdapter({
    primary,
    fallback,
    logWarning: () => {},
  });

  await assert.rejects(
    () => adapter.explain(REQUEST),
    /failed deterministic validation/i,
  );

  assert.equal(fallbackCalled, false);
});

test('resilient adapter supports forced deterministic mode', async () => {
  let primaryCalled = false;

  const primary: ExplanationSourceAdapter = {
    adapter_id: 'TEST_PRIMARY',
    async explain() {
      primaryCalled = true;
      return FALLBACK_PAYLOAD;
    },
  };

  const fallback: ExplanationSourceAdapter = {
    adapter_id: 'TEST_FALLBACK',
    async explain() {
      return FALLBACK_PAYLOAD;
    },
  };

  const adapter = new ResilientExplanationAdapter({
    primary,
    fallback,
    forceDeterministic: true,
    logWarning: () => {},
  });

  const result = await adapter.explain(REQUEST);

  assert.deepEqual(result, FALLBACK_PAYLOAD);
  assert.equal(primaryCalled, false);
});
