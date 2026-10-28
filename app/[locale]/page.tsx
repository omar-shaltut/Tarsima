import {getLocale} from 'next-intl/server';
import {normalizeJudgeLocale} from '../../src/i18n/judge-translator';
import {JudgeInputExperience} from '../../src/ui/judge-experience/JudgeInputExperience';

export default async function Page() {
  const locale = await getLocale();

  return (
    <JudgeInputExperience
      locale={normalizeJudgeLocale(locale)}
    />
  );
}