import assert from 'node:assert/strict';
import test from 'node:test';
import {
  QlooEntitySearchClient,
  RequestLocalProfileResolver,
} from '../../src/judge-experience/profile-resolution.ts';
import type { QlooFetch } from '../../src/judge-experience/qloo-retrieval-adapter.ts';

const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
] as const;

test('builds default cross-domain Qloo search without type', async () => {
  let capturedUrl = '';
  let capturedHeaders: Headers | null = null;

  const fetchImpl: QlooFetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = new Headers(init?.headers);

    return new Response(
      JSON.stringify({
        results: [
          {
            entity_id: IDS[0],
            name: 'The Matrix',
            types: ['urn:entity:movie'],
            disambiguation: '1999 film',
          },
        ],
      }),
      { status: 200 },
    );
  };

  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  const candidates = await client.search({ query: 'The Matrix' });
  const url = new URL(capturedUrl);

  assert.equal(url.pathname, '/search');
  assert.equal(url.searchParams.get('query'), 'The Matrix');
  assert.equal(url.searchParams.get('take'), '8');
  assert.equal(url.searchParams.get('sort_by'), 'match');
  assert.equal(url.searchParams.has('type'), false);
  assert.equal(capturedHeaders?.get('x-api-key'), 'test-secret');

  assert.deepEqual(candidates, [
    {
      entity_id: IDS[0],
      name: 'The Matrix',
      types: ['urn:entity:movie'],
      disambiguation: '1999 film',
    },
  ]);
});

test('adds an explicit entity type only when requested', async () => {
  let capturedUrl = '';

  const fetchImpl: QlooFetch = async (input) => {
    capturedUrl = String(input);
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  };

  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    baseUrl: 'https://example.test',
    fetchImpl,
  });

  await client.search({
    query: 'The Matrix',
    entityType: 'urn:entity:movie',
  });

  const url = new URL(capturedUrl);
  assert.equal(url.searchParams.get('type'), 'urn:entity:movie');
});

test('accepts an empty valid results array', async () => {
  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl: async () =>
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
  });

  assert.deepEqual(await client.search({ query: 'unknown thing' }), []);
});

test('fails closed on malformed search response envelope', async () => {
  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl: async () =>
      new Response(JSON.stringify({ results: {} }), { status: 200 }),
  });

  await assert.rejects(
    client.search({ query: 'The Matrix' }),
    /missing results/i,
  );
});

test('fails closed when a candidate lacks entity_id', async () => {
  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'The Matrix',
              types: ['urn:entity:movie'],
            },
          ],
        }),
        { status: 200 },
      ),
  });

  await assert.rejects(
    client.search({ query: 'The Matrix' }),
    /without entity_id/i,
  );
});

test('fails closed when candidate types are malformed', async () => {
  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              entity_id: IDS[0],
              name: 'The Matrix',
              types: 'urn:entity:movie',
            },
          ],
        }),
        { status: 200 },
      ),
  });

  await assert.rejects(
    client.search({ query: 'The Matrix' }),
    /malformed types/i,
  );
});

test('does not retry nonretryable HTTP failures or expose the secret', async () => {
  let calls = 0;

  const client = new QlooEntitySearchClient({
    apiKey: 'super-secret-value',
    fetchImpl: async () => {
      calls += 1;
      return new Response('bad request', { status: 400 });
    },
    sleepImpl: async () => {},
  });

  let message = '';
  try {
    await client.search({ query: 'The Matrix' });
    assert.fail('Expected entity search to fail.');
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert.equal(calls, 1);
  assert.match(message, /nonretryable HTTP 400/i);
  assert.equal(message.includes('super-secret-value'), false);
});

test('retries bounded retryable failures and then succeeds', async () => {
  let calls = 0;
  const sleeps: number[] = [];

  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl: async () => {
      calls += 1;

      if (calls < 3) {
        return new Response('temporary failure', { status: 500 });
      }

      return new Response(
        JSON.stringify({
          results: [
            {
              entity_id: IDS[0],
              name: 'The Matrix',
              types: ['urn:entity:movie'],
            },
          ],
        }),
        { status: 200 },
      );
    },
    sleepImpl: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
  });

  const result = await client.search({ query: 'The Matrix' });

  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [2_000, 8_000]);
  assert.equal(result[0]?.entity_id, IDS[0]);
});

test('registers and resolves a request-local profile without schema changes', async () => {
  const resolver = new RequestLocalProfileResolver([
    {
      side: 'A',
      profile_ref: 'run-a',
      qloo_seed_entity_ids: [IDS[0], IDS[1], IDS[2]],
    },
  ]);

  const resolved = await resolver.resolveProfile({
    side: 'A',
    profile_ref: 'run-a',
  });

  assert.deepEqual(resolved, {
    side: 'A',
    profile_ref: 'run-a',
    qloo_seed_entity_ids: [IDS[0], IDS[1], IDS[2]],
  });
});

test('rejects profiles with fewer than 3 or more than 5 seeds', () => {
  const resolver = new RequestLocalProfileResolver();

  assert.throws(
    () =>
      resolver.registerProfile({
        side: 'A',
        profile_ref: 'too-few',
        qloo_seed_entity_ids: [IDS[0], IDS[1]],
      }),
    /3 through 5/i,
  );

  assert.throws(
    () =>
      resolver.registerProfile({
        side: 'A',
        profile_ref: 'too-many',
        qloo_seed_entity_ids: [
          IDS[0],
          IDS[1],
          IDS[2],
          IDS[3],
          IDS[4],
          '66666666-6666-4666-8666-666666666666',
        ],
      }),
    /3 through 5/i,
  );
});

test('rejects duplicate or invalid Qloo entity IDs', () => {
  const resolver = new RequestLocalProfileResolver();

  assert.throws(
    () =>
      resolver.registerProfile({
        side: 'A',
        profile_ref: 'duplicate',
        qloo_seed_entity_ids: [IDS[0], IDS[1], IDS[1]],
      }),
    /duplicate/i,
  );

  assert.throws(
    () =>
      resolver.registerProfile({
        side: 'A',
        profile_ref: 'invalid',
        qloo_seed_entity_ids: [IDS[0], IDS[1], 'not-a-uuid'],
      }),
    /invalid Qloo entity ID/i,
  );
});

test('fails closed for unknown references and side mismatch', async () => {
  const resolver = new RequestLocalProfileResolver([
    {
      side: 'A',
      profile_ref: 'run-a',
      qloo_seed_entity_ids: [IDS[0], IDS[1], IDS[2]],
    },
  ]);

  await assert.rejects(
    resolver.resolveProfile({
      side: 'A',
      profile_ref: 'missing',
    }),
    /unknown reference/i,
  );

  await assert.rejects(
    resolver.resolveProfile({
      side: 'B',
      profile_ref: 'run-a',
    }),
    /side mismatch/i,
  );
});

test('bounds entity-search response body parsing with the request timeout', async () => {
  const fetchImpl: QlooFetch = async (_input, init) =>
    ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () =>
        await new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    }) as Response;

  const client = new QlooEntitySearchClient({
    apiKey: 'test-secret',
    fetchImpl,
    timeoutMs: 5,
    maxAttempts: 1,
  });

  await assert.rejects(
    client.search({ query: 'The Matrix' }),
    /response body exceeded timeout/i,
  );
});
