import {getLocale} from 'next-intl/server';
import {getJudgeFrontendPayload} from '../../src/frontend/server';
import {normalizeJudgeLocale} from '../../src/i18n/judge-translator';
import {JudgeExperience} from '../../src/ui/judge-experience/JudgeExperience';

export default async function Page() {
  const [payload, locale] = await Promise.all([
    getJudgeFrontendPayload(),
    getLocale(),
  ]);

  return (
    <JudgeExperience
      payload={payload}
      locale={normalizeJudgeLocale(locale)}
    />
  );
}
