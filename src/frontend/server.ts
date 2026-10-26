import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FixtureRun } from '../judge-experience/types.ts';
import { executeFixtureForFrontend } from './demo.ts';
import type { JudgeExperienceFrontendPayload } from './presentation.ts';

export async function getJudgeFrontendPayload(): Promise<JudgeExperienceFrontendPayload> {
  const fixturePath = join(
    process.cwd(),
    'tests',
    'fixtures',
    'judge-experience',
    'ready.json',
  );
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as FixtureRun;
  return executeFixtureForFrontend(fixture);
}
