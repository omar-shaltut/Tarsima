import { getJudgeFrontendPayload } from '../src/frontend/server';
import { JudgeExperience } from '../src/ui/judge-experience/JudgeExperience';

export default async function Page() {
  const payload = await getJudgeFrontendPayload();
  return <JudgeExperience payload={payload} />;
}
