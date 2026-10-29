import { Agent, OpenAIProvider, Runner, tool } from '@openai/agents';
import { z } from 'zod';

import type {
  ExplanationRequest,
  ExplanationSourceAdapter,
} from './adapters.ts';
import type { ExplanationPayload } from './types.ts';
import { validateExplanation } from './validator.ts';

const MODEL_ID = 'gemini-3.6-flash';
const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

const explanationSlotSchema = z
  .object({
    slot_id: z.enum(['CULTURE', 'OUTDOORS', 'CITY_LIFE']),
    entity_id: z.string().min(1),
    name: z.string().nullable(),
    rank_a: z.number().int().positive(),
    rank_b: z.number().int().positive(),
    why_it_works: z.string().min(1).max(320),
  })
  .strict();

const explanationPayloadSchema = z
  .object({
    slots: z.array(explanationSlotSchema).max(3),
    shared_taste_summary: z.string().min(1).max(320).nullable(),
  })
  .strict();

export interface GroundedSelectionSnapshot {
  readonly destination_city: string;
  readonly slots: readonly {
    readonly slot_id: 'CULTURE' | 'OUTDOORS' | 'CITY_LIFE';
    readonly resolved_category:
      | 'art_gallery'
      | 'book_store'
      | 'museum'
      | 'park'
      | 'restaurant'
      | 'shopping_mall'
      | null;
    readonly entity_id: string;
    readonly name: string | null;
    readonly display_type: string | null;
    readonly rank_a: number;
    readonly rank_b: number;
  }[];
}

export type AgenticExplanationExecutor = (
  request: ExplanationRequest,
) => Promise<ExplanationPayload>;

export function buildGroundedSelectionSnapshot(
  request: ExplanationRequest,
): GroundedSelectionSnapshot {
  return {
    destination_city: request.destination_city,
    slots: request.slots.flatMap((slot) => {
      if (slot.status !== 'SHARED_PRIMARY' || slot.selected === null) {
        return [];
      }

      return [
        {
          slot_id: slot.slot_id,
          resolved_category: slot.resolved_category,
          entity_id: slot.selected.entity_id,
          name: slot.selected.name,
          display_type: slot.selected.display_type,
          rank_a: slot.selected.rank_a,
          rank_b: slot.selected.rank_b,
        },
      ];
    }),
  };
}

export async function executeGeminiAgentExplanation(
  request: ExplanationRequest,
): Promise<ExplanationPayload> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for agentic explanation.');
  }

  const groundedSelection = buildGroundedSelectionSnapshot(request);

  let groundedSelectionRead = false;

  const readGroundedSelection = tool({
    name: 'read_grounded_selection',
    description:
      'Read the immutable Tarsima venue selection that has already been chosen by deterministic code.',
    parameters: z.object({}).strict(),
    execute: async () => {
      groundedSelectionRead = true;
      return groundedSelection;
    },
  });

  const agent = new Agent({
    name: 'Tarsima Grounded Explanation Agent',
    model: MODEL_ID,
    instructions: [
      'You explain an immutable recommendation result produced by Tarsima.',
      'You are not allowed to recommend or select venues.',
      'You must call read_grounded_selection before answering.',
      'Use only facts returned by read_grounded_selection.',
      'Preserve slot_id, entity_id, name, rank_a, and rank_b exactly.',
      'Do not add, remove, substitute, or reorder selected slots.',
      'Do not claim that a venue is unique, perfect, guaranteed, or #1 overall.',
      'Do not invent venue attributes, user preferences, or cultural facts.',
      'A why_it_works explanation may refer only to the shared Qloo evidence, the returned category or display type, and the returned source ranks.',
      'After reading the tool, return raw JSON only. Do not use Markdown or code fences.',
      'The JSON must contain exactly two top-level keys: slots and shared_taste_summary.',
      'Each slots item must contain exactly: slot_id, entity_id, name, rank_a, rank_b, and why_it_works.',
      'shared_taste_summary must be a string or null.',
      'Keep explanations concise and factual.',
    ].join('\n'),
    tools: [readGroundedSelection],
    modelSettings: {
      toolChoice: 'auto',
      parallelToolCalls: false,
      reasoning: { effort: 'low' },
      maxTokens: 4096,
    },
  });

  const modelProvider = new OpenAIProvider({
    apiKey,
    baseURL: GEMINI_OPENAI_BASE_URL,
    useResponses: false,
  });

  const runner = new Runner({
    modelProvider,
    tracingDisabled: true,
  });

  const result = await runner.run(
    agent,
    'Read the grounded Tarsima selection and return only the structured explanation.',
    {
      maxTurns: 2,
    },
  );

  if (!groundedSelectionRead) {
    throw new Error(
      'Agent did not read the grounded selection before producing an explanation.',
    );
  }

  if (!result.finalOutput) {
    throw new Error('Agent did not produce an explanation.');
  }

  let rawOutput: unknown;

  try {
    rawOutput = JSON.parse(result.finalOutput);
  } catch {
    throw new Error('Agent did not produce valid JSON.');
  }

  const parsedOutput = explanationPayloadSchema.safeParse(rawOutput);

  if (!parsedOutput.success) {
    throw new Error('Agent explanation did not match the local schema.');
  }

  return parsedOutput.data;
}

export class AgenticExplanationAdapter implements ExplanationSourceAdapter {
  readonly adapter_id = 'GEMINI_AGENTIC_EXPLANATION_ADAPTER_V1';
  private readonly executor: AgenticExplanationExecutor;

  constructor(
    executor: AgenticExplanationExecutor = executeGeminiAgentExplanation,
  ) {
    this.executor = executor;
  }

  async explain(request: ExplanationRequest): Promise<ExplanationPayload> {
    const payload = await this.executor(request);
    const validation = validateExplanation(request.slots, payload);

    if (validation.status !== 'PASS') {
      throw new Error('Agent explanation failed deterministic validation.');
    }

    return payload;
  }
}
