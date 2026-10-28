import { randomUUID } from 'node:crypto';
import type {
  ExplanationSourceAdapter,
  JudgeExperienceRunRequest,
  RetrievalSourceAdapter,
} from '../judge-experience/adapters.ts';
import { executeWithAdaptersEnvelope } from '../judge-experience/adapter-runner.ts';
import { DeterministicExplanationAdapter } from '../judge-experience/deterministic-explanation-adapter.ts';
import {
  RequestLocalProfileResolver,
  type QlooEntitySearchCandidate,
  type QlooEntitySearchRequest,
} from '../judge-experience/profile-resolution.ts';
import {
  buildFrontendPayload,
  type JudgeExperienceFrontendPayload,
} from './presentation.ts';

export interface JudgeTasteSelection {
  readonly query: string;
  readonly entity_id: string;
}

export interface JudgeInputRunRequest {
  readonly destination_city: string;
  readonly person_a: readonly JudgeTasteSelection[];
  readonly person_b: readonly JudgeTasteSelection[];
}

export interface QlooEntitySearchSource {
  search(
    request: QlooEntitySearchRequest,
  ): Promise<readonly QlooEntitySearchCandidate[]>;
}

export interface JudgeInputFlowDependencies {
  readonly entitySearch: QlooEntitySearchSource;
  readonly retrievalSource: RetrievalSourceAdapter;
  readonly explanationSource?: ExplanationSourceAdapter;
  readonly idFactory?: () => string;
}

export type JudgeInputErrorCode =
  | 'INVALID_REQUEST'
  | 'SELECTION_NOT_VERIFIED';

export class JudgeInputError extends Error {
  readonly code: JudgeInputErrorCode;

  constructor(code: JudgeInputErrorCode, message: string) {
    super(message);
    this.name = 'JudgeInputError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new JudgeInputError(
      'INVALID_REQUEST',
      `${label} must be a non-empty string.`,
    );
  }

  return value.trim();
}

function parseTasteSelections(
  value: unknown,
  label: string,
): readonly JudgeTasteSelection[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 5) {
    throw new JudgeInputError(
      'INVALID_REQUEST',
      `${label} must contain 3 through 5 taste seeds.`,
    );
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new JudgeInputError(
        'INVALID_REQUEST',
        `${label}[${index}] must be an object.`,
      );
    }

    return {
      query: requiredText(item.query, `${label}[${index}].query`),
      entity_id: requiredText(
        item.entity_id,
        `${label}[${index}].entity_id`,
      ),
    };
  });
}

export function parseJudgeSearchRequest(
  value: unknown,
): { readonly query: string } {
  if (!isRecord(value)) {
    throw new JudgeInputError(
      'INVALID_REQUEST',
      'Search request must be an object.',
    );
  }

  return {
    query: requiredText(value.query, 'query'),
  };
}

export function parseJudgeInputRunRequest(
  value: unknown,
): JudgeInputRunRequest {
  if (!isRecord(value)) {
    throw new JudgeInputError(
      'INVALID_REQUEST',
      'Run request must be an object.',
    );
  }

  return {
    destination_city: requiredText(
      value.destination_city,
      'destination_city',
    ),
    person_a: parseTasteSelections(value.person_a, 'person_a'),
    person_b: parseTasteSelections(value.person_b, 'person_b'),
  };
}

export async function searchJudgeTasteSeed(
  value: unknown,
  entitySearch: QlooEntitySearchSource,
): Promise<readonly QlooEntitySearchCandidate[]> {
  const request = parseJudgeSearchRequest(value);
  return entitySearch.search({ query: request.query });
}

async function verifySelections(
  selections: readonly JudgeTasteSelection[],
  entitySearch: QlooEntitySearchSource,
): Promise<readonly string[]> {
  const entityIds: string[] = [];

  for (const selection of selections) {
    const candidates = await entitySearch.search({
      query: selection.query,
    });

    const verified = candidates.find(
      (candidate) => candidate.entity_id === selection.entity_id,
    );

    if (!verified) {
      throw new JudgeInputError(
        'SELECTION_NOT_VERIFIED',
        'A selected Qloo entity could not be verified against its taste seed.',
      );
    }

    entityIds.push(verified.entity_id);
  }

  if (new Set(entityIds).size !== entityIds.length) {
    throw new JudgeInputError(
      'INVALID_REQUEST',
      'A profile cannot contain duplicate selected Qloo entities.',
    );
  }

  return entityIds;
}

export async function executeJudgeInputRun(
  value: unknown,
  dependencies: JudgeInputFlowDependencies,
): Promise<JudgeExperienceFrontendPayload> {
  const input = parseJudgeInputRunRequest(value);

  const [personAEntityIds, personBEntityIds] = await Promise.all([
    verifySelections(input.person_a, dependencies.entitySearch),
    verifySelections(input.person_b, dependencies.entitySearch),
  ]);

  const idFactory = dependencies.idFactory ?? randomUUID;
  const runId = idFactory();
  const profileARef = `A:${idFactory()}`;
  const profileBRef = `B:${idFactory()}`;

  const profileResolver = new RequestLocalProfileResolver([
    {
      side: 'A',
      profile_ref: profileARef,
      qloo_seed_entity_ids: personAEntityIds,
    },
    {
      side: 'B',
      profile_ref: profileBRef,
      qloo_seed_entity_ids: personBEntityIds,
    },
  ]);

  const request: JudgeExperienceRunRequest = {
    run_id: runId,
    destination_city: input.destination_city,
    person_a: { profile_ref: profileARef },
    person_b: { profile_ref: profileBRef },
  };

  const envelope = await executeWithAdaptersEnvelope(request, {
    profileResolver,
    retrievalSource: dependencies.retrievalSource,
    explanationSource:
      dependencies.explanationSource ??
      new DeterministicExplanationAdapter(),
  });

  return buildFrontendPayload(request, envelope);
}
