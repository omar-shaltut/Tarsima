import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  RetrievalRequest,
  RetrievalSourceAdapter,
} from '../../src/judge-experience/adapters.ts';
import type {
  Category,
  RetrievalResult,
} from '../../src/judge-experience/types.ts';
import {
  executeJudgeInputRun,
  JudgeInputError,
  parseJudgeInputRunRequest,
  searchJudgeTasteSeed,
  type QlooEntitySearchSource,
} from '../../src/frontend/judge-input-flow.ts';

const SEED_IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
] as const;

const PLACE_IDS = {
  museum: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  park: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  restaurant: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
} as const;

function selection(query: string, entityId: string) {
  return { query, entity_id: entityId };
}

function validInput() {
  return {
    destination_city: 'Paris',
    person_a: [
      selection('The Matrix', SEED_IDS[0]),
      selection('Radiohead', SEED_IDS[1]),
      selection('Murakami', SEED_IDS[2]),
    ],
    person_b: [
      selection('Inception', SEED_IDS[3]),
      selection('Björk', SEED_IDS[4]),
      selection('Calvino', SEED_IDS[5]),
    ],
  };
}

class StubSearch implements QlooEntitySearchSource {
  readonly calls: string[] = [];

  async search({ query }: { readonly query: string }) {
    this.calls.push(query);

    const all = validInput().person_a.concat(validInput().person_b);
    const match = all.find((item) => item.query === query);

    return match
      ? [
          {
            entity_id: match.entity_id,
            name: query,
            types: ['urn:entity:test'],
            disambiguation: null,
          },
        ]
      : [];
  }
}

class StubRetrieval implements RetrievalSourceAdapter {
  readonly adapter_id = 'TEST_RETRIEVAL';
  readonly requests: RetrievalRequest[] = [];

  async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    this.requests.push(request);

    const entityByCategory: Partial<Record<Category, string>> = {
      museum: PLACE_IDS.museum,
      park: PLACE_IDS.park,
      restaurant: PLACE_IDS.restaurant,
    };

    const entityId = entityByCategory[request.category];

    return {
      side: request.side,
      category: request.category,
      destination_city: request.destination_city,
      status: 'COMPLETE',
      entities: entityId
        ? [
            {
              entity_id: entityId,
              rank: 1,
              name: `${request.category} place`,
              display_type: request.category,
            },
          ]
        : [],
    };
  }
}

test('requires destination and 3 through 5 seeds for each person', () => {
  assert.throws(
    () =>
      parseJudgeInputRunRequest({
        destination_city: '',
        person_a: [],
        person_b: [],
      }),
    (error: unknown) =>
      error instanceof JudgeInputError &&
      error.code === 'INVALID_REQUEST',
  );

  const input = validInput();
  assert.throws(
    () =>
      parseJudgeInputRunRequest({
        ...input,
        person_a: input.person_a.slice(0, 2),
      }),
    /3 through 5 taste seeds/i,
  );
});

test('search returns candidates without automatically selecting one', async () => {
  const source: QlooEntitySearchSource = {
    async search() {
      return [
        {
          entity_id: SEED_IDS[0],
          name: 'First',
          types: ['urn:entity:test'],
          disambiguation: null,
        },
        {
          entity_id: SEED_IDS[1],
          name: 'Second',
          types: ['urn:entity:test'],
          disambiguation: null,
        },
      ];
    },
  };

  const candidates = await searchJudgeTasteSeed(
    { query: 'taste' },
    source,
  );

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0]?.name, 'First');
  assert.equal(candidates[1]?.name, 'Second');
});

test('rejects a selected entity that cannot be reverified for its seed', async () => {
  const input = validInput();
  const tampered = {
    ...input,
    person_a: [
      {
        ...input.person_a[0],
        entity_id: '99999999-9999-4999-8999-999999999999',
      },
      ...input.person_a.slice(1),
    ],
  };

  await assert.rejects(
    executeJudgeInputRun(tampered, {
      entitySearch: new StubSearch(),
      retrievalSource: new StubRetrieval(),
    }),
    (error: unknown) =>
      error instanceof JudgeInputError &&
      error.code === 'SELECTION_NOT_VERIFIED',
  );
});

test('rejects duplicate selected entities within one profile', async () => {
  const input = validInput();
  const duplicateId = SEED_IDS[0];

  const entitySearch: QlooEntitySearchSource = {
    async search({ query }) {
      const mapped =
        query === input.person_a[1]?.query
          ? duplicateId
          : new StubSearch().search({ query }).then(
              (items) => items[0]?.entity_id ?? '',
            );

      const entityId =
        typeof mapped === 'string' ? mapped : await mapped;

      return entityId
        ? [
            {
              entity_id: entityId,
              name: query,
              types: ['urn:entity:test'],
              disambiguation: null,
            },
          ]
        : [];
    },
  };

  const duplicateInput = {
    ...input,
    person_a: [
      input.person_a[0],
      { ...input.person_a[1], entity_id: duplicateId },
      input.person_a[2],
    ],
  };

  await assert.rejects(
    executeJudgeInputRun(duplicateInput, {
      entitySearch,
      retrievalSource: new StubRetrieval(),
    }),
    /duplicate selected Qloo entities/i,
  );
});

test('executes verified profiles through existing deterministic ranking and frontend contract', async () => {
  const entitySearch = new StubSearch();
  const retrievalSource = new StubRetrieval();
  const ids = ['run-1', 'profile-a', 'profile-b'];
  let index = 0;

  const payload = await executeJudgeInputRun(validInput(), {
    entitySearch,
    retrievalSource,
    idFactory: () => ids[index++] ?? 'unexpected',
  });

  assert.equal(payload.schema_version, 'JUDGE_FRONTEND_V1');
  assert.equal(payload.state, 'READY');
  assert.equal(payload.destination_city, 'Paris');
  assert.deepEqual(
    payload.cards.map((card) => card.entity_id),
    [
      PLACE_IDS.museum,
      PLACE_IDS.park,
      PLACE_IDS.restaurant,
    ],
  );

  assert.equal(retrievalSource.requests.length, 12);

  const personAProfiles = retrievalSource.requests
    .filter((request) => request.side === 'A')
    .map((request) => request.profile.qloo_seed_entity_ids);

  assert.ok(
    personAProfiles.every(
      (idsForRequest) =>
        JSON.stringify(idsForRequest) ===
        JSON.stringify(SEED_IDS.slice(0, 3)),
    ),
  );

  assert.equal(payload.summary, null);
  assert.ok(
    payload.cards.every(
      (card) =>
        card.status !== 'SHARED_PRIMARY' ||
        card.why_it_works ===
          'Selected from shared Qloo evidence surfaced for both taste profiles.',
    ),
  );
});
