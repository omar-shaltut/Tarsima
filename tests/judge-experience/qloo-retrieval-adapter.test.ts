import assert from 'node:assert/strict';
import test from 'node:test';
import type { RetrievalRequest } from '../../src/judge-experience/adapters.ts';
import {
  QlooRetrievalAdapter,
  type QlooFetch,
} from '../../src/judge-experience/qloo-retrieval-adapter.ts';

function request(): RetrievalRequest {
  return {
    side: 'A',
    category: 'museum',
    destination_city: 'London',
    profile: {
      side: 'A',
      profile_ref: 'fixture-a',
      qloo_seed_entity_ids: ['seed-1', 'seed-2', 'seed-3'],
    },
  };
}

test('builds the frozen Qloo request and authenticates server-side', async () => {
  let capturedUrl = '';
  let capturedHeaders: Headers | null = null;

  const fetchImpl: QlooFetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);

    return new Response(
      JSON.stringify({
        results: {
          entities: [
            {
              entity_id: 'entity-1',
              name: 'Museum One',
              display_type: 'Museum',
            },
          ],
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  };

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
    baseUrl: 'https://example.test',
  });

  const result = await adapter.retrieve(request());
  const url = new URL(capturedUrl);

  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.pathname, '/v2/insights');
  assert.equal(url.searchParams.get('filter.type'), 'urn:entity:place');
  assert.equal(
    url.searchParams.get('signal.interests.entities'),
    'seed-1,seed-2,seed-3',
  );
  assert.equal(
    url.searchParams.get('filter.tags'),
    'urn:tag:category:place:museum',
  );
  assert.equal(url.searchParams.get('filter.location.query'), 'London');
  assert.equal(url.searchParams.get('filter.location.radius'), '0');
  assert.equal(url.searchParams.get('take'), '18');
  assert.equal(capturedHeaders?.get('x-api-key'), 'test-secret');

  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(result.entities, [
    {
      entity_id: 'entity-1',
      rank: 1,
      name: 'Museum One',
      display_type: 'Museum',
    },
  ]);
});

test('preserves provider order as deterministic rank order', async () => {
  const fetchImpl: QlooFetch = async () =>
    new Response(
      JSON.stringify({
        results: {
          entities: [
            { entity_id: 'second-name', name: 'First Provider Result' },
            { entity_id: 'first-name', name: 'Second Provider Result' },
          ],
        },
      }),
      { status: 200 },
    );

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
  });

  const result = await adapter.retrieve(request());

  assert.deepEqual(
    result.entities.map((entity) => [entity.entity_id, entity.rank]),
    [
      ['second-name', 1],
      ['first-name', 2],
    ],
  );
});

test('accepts an empty valid results.entities array as COMPLETE', async () => {
  const fetchImpl: QlooFetch = async () =>
    new Response(
      JSON.stringify({
        results: {
          entities: [],
        },
      }),
      { status: 200 },
    );

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
  });

  const result = await adapter.retrieve(request());

  assert.equal(result.status, 'COMPLETE');
  assert.deepEqual(result.entities, []);
});

test('fails closed when results.entities is missing', async () => {
  const fetchImpl: QlooFetch = async () =>
    new Response(JSON.stringify({ results: {} }), { status: 200 });

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
  });

  await assert.rejects(
    adapter.retrieve(request()),
    /missing results\.entities/i,
  );
});

test('fails closed when an entity has no valid entity_id', async () => {
  const fetchImpl: QlooFetch = async () =>
    new Response(
      JSON.stringify({
        results: {
          entities: [{ name: 'Missing identifier' }],
        },
      }),
      { status: 200 },
    );

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
  });

  await assert.rejects(
    adapter.retrieve(request()),
    /without entity_id/i,
  );
});

test('does not retry a nonretryable HTTP failure', async () => {
  let calls = 0;

  const fetchImpl: QlooFetch = async () => {
    calls += 1;
    return new Response('bad request', { status: 400 });
  };

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
    sleepImpl: async () => {},
  });

  await assert.rejects(
    adapter.retrieve(request()),
    /nonretryable HTTP 400/i,
  );

  assert.equal(calls, 1);
});

test('retries bounded retryable responses and then succeeds', async () => {
  let calls = 0;
  const sleeps: number[] = [];

  const fetchImpl: QlooFetch = async () => {
    calls += 1;

    if (calls < 3) {
      return new Response('temporary failure', { status: 500 });
    }

    return new Response(
      JSON.stringify({
        results: {
          entities: [{ entity_id: 'entity-after-retry' }],
        },
      }),
      { status: 200 },
    );
  };

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
    sleepImpl: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
  });

  const result = await adapter.retrieve(request());

  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [2_000, 8_000]);
  assert.equal(result.entities[0]?.entity_id, 'entity-after-retry');
});

test('honors bounded Retry-After for HTTP 429', async () => {
  let calls = 0;
  const sleeps: number[] = [];

  const fetchImpl: QlooFetch = async () => {
    calls += 1;

    if (calls === 1) {
      return new Response('rate limited', {
        status: 429,
        headers: { 'retry-after': '1' },
      });
    }

    return new Response(
      JSON.stringify({
        results: {
          entities: [],
        },
      }),
      { status: 200 },
    );
  };

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
    sleepImpl: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
  });

  await adapter.retrieve(request());

  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1_000]);
});

test('does not expose the API key in thrown provider errors', async () => {
  const apiKey = 'super-secret-key';

  const fetchImpl: QlooFetch = async () =>
    new Response('unauthorized', { status: 401 });

  const adapter = new QlooRetrievalAdapter({
    apiKey,
    fetchImpl,
  });

  await assert.rejects(
    adapter.retrieve(request()),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(apiKey), false);
      return true;
    },
  );
});

test('bounds response body parsing with the request timeout', async () => {
  const fetchImpl: QlooFetch = async (_input, init) => {
    const signal = init?.signal;

    return {
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () =>
        await new Promise<never>((_resolve, reject) => {
          if (!signal) {
            reject(new Error('missing abort signal'));
            return;
          }

          if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }

          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    } as Response;
  };

  const adapter = new QlooRetrievalAdapter({
    apiKey: 'test-secret',
    fetchImpl,
    timeoutMs: 5,
    maxAttempts: 1,
  });

  await assert.rejects(
    adapter.retrieve(request()),
    /response body exceeded timeout/i,
  );
});
