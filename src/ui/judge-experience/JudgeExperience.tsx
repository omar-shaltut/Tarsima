import type {
  FrontendRecommendationCard,
  JudgeExperienceFrontendPayload,
} from '../../frontend/presentation.ts';

function slotClass(slotId: FrontendRecommendationCard['slot_id']): string {
  if (slotId === 'CULTURE') return 'slot-culture';
  if (slotId === 'OUTDOORS') return 'slot-outdoor';
  return 'slot-city';
}

function rankText(label: string, rank: number | null, categoryLabel: string | null): string | null {
  if (rank === null) return null;
  return categoryLabel ? `${label} · #${rank} in ${categoryLabel}` : `${label} · #${rank}`;
}

function PickCard({ card }: { card: FrontendRecommendationCard }) {
  const cardClass = `pick-card ${slotClass(card.slot_id)}${card.status === 'SHARED_PRIMARY' ? '' : ' pick-card-empty'}`;

  if (card.status !== 'SHARED_PRIMARY') {
    return (
      <article className={cardClass}>
        <p className="slot-label">{card.slot_label}</p>
        <h3>No shared match</h3>
        <p className="card-copy">{card.empty_message}</p>
      </article>
    );
  }

  const rankA = rankText('You', card.rank_a, card.category_label);
  const rankB = rankText('Partner', card.rank_b, card.category_label);

  return (
    <article className={cardClass}>
      <p className="slot-label">{card.slot_label}</p>
      <div className="category-tile" aria-hidden="true">
        <span>{card.display_type || card.category_label || 'Shared place'}</span>
      </div>
      <h3>{card.name || 'Shared Qloo venue'}</h3>
      <div className="evidence-row" aria-label="Qloo source evidence">
        <span className="shared-badge">Shared match</span>
        {rankA ? <span className="rank-badge">{rankA}</span> : null}
        {rankB ? <span className="rank-badge">{rankB}</span> : null}
      </div>
      {card.why_it_works ? (
        <div className="reason-box">
          <p className="reason-label">Why it works for both</p>
          <p className="card-copy">{card.why_it_works}</p>
        </div>
      ) : null}
    </article>
  );
}

function FailureState({ label }: { label: string }) {
  return (
    <main className="page-shell">
      <section className="failure-card">
        <p className="eyebrow">Unable to verify</p>
        <h1>We could not safely present shared picks.</h1>
        <p>{label}</p>
        <p className="muted">No venue is substituted or invented when evidence or validation fails.</p>
      </section>
    </main>
  );
}

export function JudgeExperience({ payload }: { payload: JudgeExperienceFrontendPayload }) {
  if (payload.state === 'FAILED') return <FailureState label={payload.state_label} />;

  return (
    <>
      <header className="topbar">
        <a className="brand-link" href="/" aria-label="Tarsima home">
          <span className="brand-wordmark">Tarsima</span>
        </a>
        <span className="city-pill">{payload.destination_city}</span>
      </header>

      <main className="page-shell">
        <section className="hero" aria-labelledby="shared-picks-title">
          <div className="hero-meta">
            <span className="status-pill">{payload.state_label}</span>
          </div>
          <p className="eyebrow">Your shared taste</p>
          <h1 id="shared-picks-title">Your Shared Picks</h1>
          <p className="hero-lead">Three ways to experience {payload.destination_city} together.</p>
          <p className="hero-copy">
            {payload.summary || 'Qloo surfaced shared evidence across your two taste profiles.'}
          </p>
          <div className="people-row" aria-label="Taste profiles">
            {payload.people.map((person) => (
              <span className="person-chip" key={person.side}>
                <span className="person-avatar" aria-hidden="true">{person.side}</span>
                <span>{person.label}</span>
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="shared-picks-section">
          <div className="section-heading">
            <p className="eyebrow">Culture · Outdoors · City Life</p>
            <h2 id="shared-picks-section">Shared picks across three parts of the city</h2>
          </div>
          <div className="pick-grid">
            {payload.cards.map((card) => <PickCard card={card} key={card.slot_id} />)}
          </div>
        </section>

        <section className="trust-strip" aria-label="How recommendation authority is separated">
          <span className="trust-mark" aria-hidden="true">Q</span>
          <p>{payload.evidence_note}</p>
        </section>

        <details className="trace-panel">
          <summary>How these picks were chosen</summary>
          <ol className="trace-list">
            {payload.progress.map((item) => (
              <li key={item.key}>
                <span className={item.completed ? 'trace-check trace-check-done' : 'trace-check'} aria-hidden="true">
                  {item.completed ? '✓' : '•'}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </details>
      </main>
    </>
  );
}
