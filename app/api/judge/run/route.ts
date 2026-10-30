import { NextResponse } from 'next/server';
import { ResilientExplanationAdapter } from '../../../../src/judge-experience/resilient-explanation-adapter';
import { QlooEntitySearchClient } from '../../../../src/judge-experience/profile-resolution';
import { QlooRetrievalAdapter } from '../../../../src/judge-experience/qloo-retrieval-adapter';
import {
  executeJudgeInputRun,
  JudgeInputError,
} from '../../../../src/frontend/judge-input-flow';

export const runtime = 'nodejs';

function jsonError(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError('INVALID_REQUEST', 400);
  }

  const qlooApiKey = process.env.QLOO_API_KEY?.trim();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  if (!qlooApiKey || !geminiApiKey) {
    return jsonError('SERVICE_UNAVAILABLE', 503);
  }

  try {
    const payload = await executeJudgeInputRun(body, {
      entitySearch: new QlooEntitySearchClient({ apiKey: qlooApiKey }),
      retrievalSource: new QlooRetrievalAdapter({ apiKey: qlooApiKey }),
      explanationSource: new ResilientExplanationAdapter({
        forceDeterministic:
          process.env.FORCE_DETERMINISTIC_EXPLANATIONS === 'true',
      }),
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof JudgeInputError) {
      return jsonError(error.code, 400);
    }

    return jsonError('LIVE_RUN_UNAVAILABLE', 502);
  }
}
