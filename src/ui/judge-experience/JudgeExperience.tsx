import type {
  FrontendRecommendationCard,
  JudgeExperienceFrontendPayload,
} from '../../frontend/presentation.ts';
import {
  createJudgeTranslator,
  type JudgeLocale,
} from '../../i18n/judge-translator.ts';

type JudgeTranslator = ReturnType<typeof createJudgeTranslator>;

type ProgressKey =
  | 'RESOLVING_PROFILES'
  | 'RETRIEVING_QLOO'
  | 'RECONCILING'
  | 'ASSEMBLING_SLOTS'
  | 'EXPLAINING'
  | 'VALIDATING';

const PROGRESS_KEYS: readonly ProgressKey[] = [
  'RESOLVING_PROFILES',
  'RETRIEVING_QLOO',
  'RECONCILING',
  'ASSEMBLING_SLOTS',
  'EXPLAINING',
  'VALIDATING',
];

function isProgressKey(key: string): key is ProgressKey {
  return PROGRESS_KEYS.includes(key as ProgressKey);
}

function slotClass(slotId: FrontendRecommendationCard['slot_id']): string {
  if (slotId === 'CULTURE') return 'slot-culture';
  if (slotId === 'OUTDOORS') return 'slot-outdoor';
  return 'slot-city';
}

function rankText(
  t: JudgeTranslator,
  label: string,
  rank: number | null,
  categoryLabel: string | null,
): string | null {
  if (rank === null) return null;

  return categoryLabel
    ? t('card.rank', {person: label, rank, category: categoryLabel})
    : t('card.rankNoCategory', {person: label, rank});
}

function PickCard({
  card,
  t,
}: {
  card: FrontendRecommendationCard;
  t: JudgeTranslator;
}) {
  const cardClass = `pick-card ${slotClass(card.slot_id)}${card.status === 'SHARED_PRIMARY' ? '' : ' pick-card-empty'}`;
  const slotLabel = t(`slot.${card.slot_id}`);

  if (card.status !== 'SHARED_PRIMARY') {
    const emptyMessage =
      card.status === 'EVIDENCE_UNAVAILABLE'
        ? t('card.evidenceUnavailable', {slot: slotLabel})
        : t('card.noSharedQlooEvidence', {slot: slotLabel});

    return (
      <article className={cardClass}>
        <p className="slot-label">{slotLabel}</p>
        <h3>{t('card.noSharedMatch')}</h3>
        <p className="card-copy">{emptyMessage}</p>
      </article>
    );
  }

  const categoryLabel = card.category
    ? t(`category.${card.category}`)
    : card.category_label;

  const rankA = rankText(t, t('person.A'), card.rank_a, categoryLabel);
  const rankB = rankText(t, t('person.B'), card.rank_b, categoryLabel);

  return (
    <article className={cardClass}>
      <p className="slot-label">{slotLabel}</p>
      <div className="category-tile" aria-hidden="true">
        <span>
          {card.category
            ? t(`category.${card.category}`)
            : card.display_type || card.category_label || t('card.sharedPlace')}
        </span>
      </div>
      <h3><bdi dir="auto">{card.name || t('card.sharedQlooVenue')}</bdi></h3>
      <div className="evidence-row" aria-label={t('card.evidenceAria')}>
        <span className="shared-badge">{t('card.sharedMatch')}</span>
        {rankA ? <span className="rank-badge">{rankA}</span> : null}
        {rankB ? <span className="rank-badge">{rankB}</span> : null}
      </div>
      {card.why_it_works ? (
        <div className="reason-box">
          <p className="reason-label">{t('card.whyBoth')}</p>
          <p className="card-copy"><bdi dir="auto">{card.why_it_works}</bdi></p>
        </div>
      ) : null}
    </article>
  );
}

function FailureState({t}: {t: JudgeTranslator}) {
  return (
    <main className="page-shell">
      <section className="failure-card">
        <p className="eyebrow">{t('failure.eyebrow')}</p>
        <h1>{t('failure.title')}</h1>
        <p>{t('state.FAILED')}</p>
        <p className="muted">{t('failure.note')}</p>
      </section>
    </main>
  );
}

export function JudgeExperience({
  payload,
  locale = 'en',
}: {
  payload: JudgeExperienceFrontendPayload;
  locale?: JudgeLocale;
}) {
  const t = createJudgeTranslator(locale);

  if (payload.state === 'FAILED') return <FailureState t={t} />;

  return (
    <>
      <header className="topbar">
        <a className="brand-link" href={`/${locale}`} aria-label={t('homeAria')}>
          <span className="brand-wordmark">Tarsima</span>
        </a>
        <span className="city-pill">{payload.destination_city}</span>
      </header>

      <main className="page-shell">
        <section className="hero" aria-labelledby="shared-picks-title">
          <div className="hero-meta">
            <span className="status-pill">{t(`state.${payload.state}`)}</span>
          </div>
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1 id="shared-picks-title">{t('hero.title')}</h1>
          <p className="hero-lead">
            {t('hero.lead', {city: payload.destination_city})}
          </p>
          <p className="hero-copy">
            <bdi dir="auto">{payload.summary || t('hero.summaryFallback')}</bdi>
          </p>
          <div className="people-row" aria-label={t('hero.peopleAria')}>
            {payload.people.map((person) => (
              <span className="person-chip" key={person.side}>
                <span className="person-avatar" aria-hidden="true">
                  {person.side}
                </span>
                <span>{t(`person.${person.side}`)}</span>
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="shared-picks-section">
          <div className="section-heading">
            <h2 id="shared-picks-section">{t('section.title')}</h2>
          </div>
          <div className="pick-grid">
            {payload.cards.map((card) => (
              <PickCard card={card} key={card.slot_id} t={t} />
            ))}
          </div>
        </section>

        <section className="trust-strip" aria-label={t('trust.aria')}>
          <span className="trust-mark" aria-hidden="true">Q</span>
          <p>{t('trust.note')}</p>
        </section>

        <details className="trace-panel">
          <summary>{t('trace.summary')}</summary>
          <ol className="trace-list">
            {payload.progress.map((item) => (
              <li key={item.key}>
                <span
                  className={item.completed ? 'trace-check trace-check-done' : 'trace-check'}
                  aria-hidden="true"
                >
                  {item.completed ? '✓' : '•'}
                </span>
                <span>
                  {isProgressKey(item.key) ? t(`trace.${item.key}`) : item.label}
                </span>
              </li>
            ))}
          </ol>
        </details>
      </main>
    </>
  );
}
