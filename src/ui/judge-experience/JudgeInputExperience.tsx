'use client';

import {useState} from 'react';
import type {JudgeExperienceFrontendPayload} from '../../frontend/presentation';
import type {QlooEntitySearchCandidate} from '../../judge-experience/profile-resolution';
import {
  createJudgeTranslator,
  type JudgeLocale,
} from '../../i18n/judge-translator';
import {JudgeExperience} from './JudgeExperience';

type SearchState = 'idle' | 'loading' | 'done' | 'error';

interface SeedRow {
  readonly id: number;
  readonly query: string;
  readonly candidates: readonly QlooEntitySearchCandidate[];
  readonly selectedId: string | null;
  readonly searchState: SearchState;
}

function initialRows(start: number): readonly SeedRow[] {
  return [0, 1, 2].map((offset) => ({
    id: start + offset,
    query: '',
    candidates: [],
    selectedId: null,
    searchState: 'idle' as const,
  }));
}

function replaceRow(
  rows: readonly SeedRow[],
  id: number,
  update: (row: SeedRow) => SeedRow,
): readonly SeedRow[] {
  return rows.map((row) => (row.id === id ? update(row) : row));
}

export function JudgeInputExperience({
  locale,
}: {
  locale: JudgeLocale;
}) {
  const t = createJudgeTranslator(locale);
  const [destination, setDestination] = useState('');
  const [personA, setPersonA] = useState<readonly SeedRow[]>(() =>
    initialRows(1),
  );
  const [personB, setPersonB] = useState<readonly SeedRow[]>(() =>
    initialRows(101),
  );
  const [payload, setPayload] =
    useState<JudgeExperienceFrontendPayload | null>(null);
  const [runState, setRunState] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );

  function rowsFor(side: 'A' | 'B') {
    return side === 'A' ? personA : personB;
  }

  function setRows(
    side: 'A' | 'B',
    updater: (
      rows: readonly SeedRow[],
    ) => readonly SeedRow[],
  ) {
    if (side === 'A') {
      setPersonA(updater);
    } else {
      setPersonB(updater);
    }
  }

  function updateQuery(side: 'A' | 'B', id: number, query: string) {
    setRows(side, (rows) =>
      replaceRow(rows, id, (row) => ({
        ...row,
        query,
        candidates: [],
        selectedId: null,
        searchState: 'idle',
      })),
    );
  }

  async function searchSeed(side: 'A' | 'B', id: number) {
    const row = rowsFor(side).find((item) => item.id === id);
    if (!row || row.query.trim().length === 0) return;

    setRows(side, (rows) =>
      replaceRow(rows, id, (item) => ({
        ...item,
        searchState: 'loading',
        candidates: [],
        selectedId: null,
      })),
    );

    try {
      const response = await fetch('/api/judge/search', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({query: row.query}),
      });

      if (!response.ok) throw new Error('search failed');

      const body = (await response.json()) as {
        candidates?: readonly QlooEntitySearchCandidate[];
      };
      const candidates = Array.isArray(body.candidates)
        ? body.candidates
        : [];

      setRows(side, (rows) =>
        replaceRow(rows, id, (item) => ({
          ...item,
          candidates,
          selectedId: null,
          searchState: 'done',
        })),
      );
    } catch {
      setRows(side, (rows) =>
        replaceRow(rows, id, (item) => ({
          ...item,
          candidates: [],
          selectedId: null,
          searchState: 'error',
        })),
      );
    }
  }

  function selectCandidate(
    side: 'A' | 'B',
    id: number,
    entityId: string,
  ) {
    setRows(side, (rows) =>
      replaceRow(rows, id, (item) => ({
        ...item,
        selectedId: entityId,
      })),
    );
  }

  function addSeed(side: 'A' | 'B') {
    setRows(side, (rows) => {
      if (rows.length >= 5) return rows;

      const nextId =
        Math.max(...rows.map((row) => row.id)) + 1;

      return [
        ...rows,
        {
          id: nextId,
          query: '',
          candidates: [],
          selectedId: null,
          searchState: 'idle',
        },
      ];
    });
  }

  function removeSeed(side: 'A' | 'B', id: number) {
    setRows(side, (rows) =>
      rows.length <= 3
        ? rows
        : rows.filter((row) => row.id !== id),
    );
  }

  function complete(rows: readonly SeedRow[]) {
    return rows.every(
      (row) =>
        row.query.trim().length > 0 &&
        row.selectedId !== null,
    );
  }

  async function runExperience() {
    if (
      destination.trim().length === 0 ||
      !complete(personA) ||
      !complete(personB)
    ) {
      setRunState('error');
      return;
    }

    setRunState('loading');

    try {
      const response = await fetch('/api/judge/run', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          destination_city: destination,
          person_a: personA.map((row) => ({
            query: row.query,
            entity_id: row.selectedId,
          })),
          person_b: personB.map((row) => ({
            query: row.query,
            entity_id: row.selectedId,
          })),
        }),
      });

      if (!response.ok) throw new Error('run failed');

      const nextPayload =
        (await response.json()) as JudgeExperienceFrontendPayload;

      setPayload(nextPayload);
      setRunState('idle');
    } catch {
      setRunState('error');
    }
  }

  function resetExperience() {
    setPayload(null);
    setRunState('idle');
  }

  function renderSeedGroup(
    side: 'A' | 'B',
    rows: readonly SeedRow[],
  ) {
    const title =
      side === 'A' ? t('input.personA') : t('input.personB');

    return (
      <section className="taste-person-card">
        <div className="taste-person-heading">
          <span className="person-avatar" aria-hidden="true">
            {side}
          </span>
          <h2>{title}</h2>
        </div>

        <div className="taste-seed-list">
          {rows.map((row, index) => (
            <div className="taste-seed" key={row.id}>
              <div className="taste-seed-heading">
                <label htmlFor={`${side}-${row.id}`}>
                  {t('input.seedLabel', {number: index + 1})}
                </label>
                {rows.length > 3 ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => removeSeed(side, row.id)}
                  >
                    {t('input.removeSeed')}
                  </button>
                ) : null}
              </div>

              <div className="taste-search-row">
                <input
                  id={`${side}-${row.id}`}
                  type="text"
                  value={row.query}
                  placeholder={t('input.seedPlaceholder')}
                  onChange={(event) =>
                    updateQuery(side, row.id, event.target.value)
                  }
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={
                    row.searchState === 'loading' ||
                    row.query.trim().length === 0
                  }
                  onClick={() => void searchSeed(side, row.id)}
                >
                  {row.searchState === 'loading'
                    ? t('input.searching')
                    : t('input.search')}
                </button>
              </div>

              {row.searchState === 'error' ? (
                <p className="input-message input-message-error">
                  {t('input.searchFailed')}
                </p>
              ) : null}

              {row.searchState === 'done' &&
              row.candidates.length === 0 ? (
                <p className="input-message">
                  {t('input.noCandidates')}
                </p>
              ) : null}

              {row.candidates.length > 0 ? (
                <fieldset className="candidate-list">
                  <legend>{t('input.selectPrompt')}</legend>
                  {row.candidates.map((candidate) => (
                    <label
                      className="candidate-option"
                      key={candidate.entity_id}
                    >
                      <input
                        type="radio"
                        name={`${side}-${row.id}-candidate`}
                        checked={
                          row.selectedId === candidate.entity_id
                        }
                        onChange={() =>
                          selectCandidate(
                            side,
                            row.id,
                            candidate.entity_id,
                          )
                        }
                      />
                      <span className="candidate-copy">
                        <strong>
                          <bdi dir="auto">{candidate.name}</bdi>
                        </strong>
                        {candidate.disambiguation ? (
                          <span>
                            {t('input.candidateDetail')}: {' '}
                            <bdi dir="auto">
                              {candidate.disambiguation}
                            </bdi>
                          </span>
                        ) : null}
                        {candidate.types.length > 0 ? (
                          <span>
                            {t('input.candidateType')}: {' '}
                            <bdi dir="auto">
                              {candidate.types.join(', ')}
                            </bdi>
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </div>
          ))}
        </div>

        {rows.length < 5 ? (
          <button
            className="text-button add-taste-button"
            type="button"
            onClick={() => addSeed(side)}
          >
            + {t('input.addSeed')}
          </button>
        ) : null}
      </section>
    );
  }

  if (payload) {
    return (
      <>
        <JudgeExperience payload={payload} locale={locale} />
        <div className="restart-row">
          <button
            className="secondary-button"
            type="button"
            onClick={resetExperience}
          >
            {t('input.restart')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="topbar">
        <a
          className="brand-link"
          href={`/${locale}`}
          aria-label={t('homeAria')}
        >
          <span className="brand-wordmark">Tarsima</span>
        </a>
        <nav
          className="language-switcher"
          aria-label={t('language.aria')}
        >
          <a
            href="/en"
            aria-current={locale === 'en' ? 'page' : undefined}
          >
            EN
          </a>
          <span aria-hidden="true">|</span>
          <a
            href="/ar"
            aria-current={locale === 'ar' ? 'page' : undefined}
          >
            AR
          </a>
        </nav>
      </header>

      <main className="page-shell input-page">
        <section
          className="input-hero"
          aria-labelledby="judge-input-title"
        >
          <p className="eyebrow">{t('input.eyebrow')}</p>
          <h1 id="judge-input-title">{t('input.title')}</h1>
          <p>{t('input.lead')}</p>
        </section>

        <section className="destination-field">
          <label htmlFor="destination">
            {t('input.destinationLabel')}
          </label>
          <input
            id="destination"
            type="text"
            value={destination}
            placeholder={t('input.destinationPlaceholder')}
            onChange={(event) => {
              setDestination(event.target.value);
              if (runState === 'error') setRunState('idle');
            }}
          />
        </section>

        <div className="taste-grid">
          {renderSeedGroup('A', personA)}
          {renderSeedGroup('B', personB)}
        </div>

        <section className="run-panel">
          {runState === 'error' ? (
            <p className="input-message input-message-error">
              {destination.trim().length === 0 ||
              !complete(personA) ||
              !complete(personB)
                ? t('input.incomplete')
                : t('input.runFailed')}
            </p>
          ) : null}

          <button
            className="primary-button"
            type="button"
            disabled={runState === 'loading'}
            onClick={() => void runExperience()}
          >
            {runState === 'loading'
              ? t('input.running')
              : t('input.run')}
          </button>
        </section>
      </main>
    </>
  );
}
