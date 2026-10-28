import { NextResponse } from 'next/server';
import { QlooEntitySearchClient } from '../../../../src/judge-experience/profile-resolution';
import {
  JudgeInputError,
  searchJudgeTasteSeed,
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

  const apiKey = process.env.QLOO_API_KEY?.trim();
  if (!apiKey) {
    return jsonError('SERVICE_UNAVAILABLE', 503);
  }

  try {
    const candidates = await searchJudgeTasteSeed(
      body,
      new QlooEntitySearchClient({ apiKey }),
    );

    return NextResponse.json({ candidates });
  } catch (error) {
    if (error instanceof JudgeInputError) {
      return jsonError(error.code, 400);
    }

    return jsonError('QLOO_SEARCH_UNAVAILABLE', 502);
  }
}
