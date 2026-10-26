import {createTranslator} from 'next-intl';
import ar from '../../messages/ar.json';
import en from '../../messages/en.json';

export type JudgeLocale = 'en' | 'ar';

const messagesByLocale = {
  en,
  ar,
} as const;

export function normalizeJudgeLocale(locale: string): JudgeLocale {
  return locale === 'ar' ? 'ar' : 'en';
}

export function createJudgeTranslator(locale: JudgeLocale) {
  return createTranslator({
    locale,
    messages: messagesByLocale[locale],
    namespace: 'judge',
  });
}
