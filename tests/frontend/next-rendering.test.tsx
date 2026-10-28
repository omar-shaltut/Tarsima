import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { executeFixtureForFrontend } from '../../src/frontend/demo.ts';
import type { JudgeExperienceFrontendPayload } from '../../src/frontend/presentation.ts';
import { JudgeExperience } from '../../src/ui/judge-experience/JudgeExperience.tsx';
import { JudgeInputExperience } from '../../src/ui/judge-experience/JudgeInputExperience.tsx';
import type { FixtureRun } from '../../src/judge-experience/types.ts';

const fixtureUrl = new URL('../fixtures/judge-experience/ready.json', import.meta.url);

function readyFixture(): FixtureRun {
  return JSON.parse(readFileSync(fixtureUrl, 'utf8')) as FixtureRun;
}

async function readyPayload(): Promise<JudgeExperienceFrontendPayload> {
  return executeFixtureForFrontend(readyFixture());
}

function render(payload: JudgeExperienceFrontendPayload): string {
  return renderToStaticMarkup(createElement(JudgeExperience, { payload }));
}

test('Next presentation renders Tarsima and keeps fixture implementation details off the primary surface', async () => {
  const html = render(await readyPayload());
  assert.match(html, />Tarsima</);
  assert.doesNotMatch(html, /TastePassport/i);
  assert.doesNotMatch(html, /Judge Experience\s*·?\s*Fixture/i);
});

test('Next presentation preserves fixed slot order and never sorts by source rank', async () => {
  const payload = await readyPayload();
  const html = render(payload);
  const names = payload.cards.map((card) => card.name).filter((name): name is string => Boolean(name));
  assert.equal(names.length, 3);
  const positions = names.map((name) => html.indexOf(name));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('trust evidence precedes the collapsed six-step trace in document order', async () => {
  const payload = await readyPayload();
  assert.equal(payload.progress.length, 6);
  const html = render(payload);
  const trustPosition = html.indexOf(payload.evidence_note);
  const tracePosition = html.indexOf('How these picks were chosen');
  assert.ok(trustPosition >= 0 && tracePosition > trustPosition);
  for (const item of payload.progress) assert.match(html, new RegExp(item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('FAILED state renders no recommendation venue names', async () => {
  const payload = await readyPayload();
  const failed: JudgeExperienceFrontendPayload = {
    ...payload,
    state: 'FAILED',
    state_label: 'Run could not be safely presented',
    summary: null,
  };
  const html = render(failed);
  assert.match(html, /could not safely present shared picks/i);
  for (const card of payload.cards) {
    if (card.name) assert.doesNotMatch(html, new RegExp(card.name));
  }
});

test('Next presentation source contains no forbidden recommendation claims', () => {
  const source = readFileSync(new URL('../../src/ui/judge-experience/JudgeExperience.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /perfect match/i);
  assert.doesNotMatch(source, /unique(?:ly)? matched/i);
  assert.doesNotMatch(source, /#1 overall/i);
});

test('Arabic presentation localizes fixed UI while preserving selected venue names', async () => {
  const payload = await readyPayload();
  const html = renderToStaticMarkup(
    createElement(JudgeExperience, {payload, locale: 'ar'}),
  );

  assert.match(html, /اختياراتكما المشتركة/);
  assert.match(html, /ذوقكما المشترك/);
  assert.match(html, /مطابقة مشتركة/);
  assert.match(html, /كيف تم اختيار هذه الأماكن/);
  assert.doesNotMatch(html, /Your Shared Picks/);
  assert.match(html, /href="\/en"/);
  assert.match(html, /href="\/ar" aria-current="page"/);

  for (const card of payload.cards) {
    if (card.name) assert.match(html, new RegExp(card.name));
  }

  if (payload.summary) assert.match(html, new RegExp(payload.summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});


test('judge input renders three unresolved tastes per person before any recommendation exists', () => {
  const html = renderToStaticMarkup(
    createElement(JudgeInputExperience, {locale: 'en'}),
  );

  assert.match(html, /What do you both love\?/);
  assert.match(html, /Your tastes/);
  assert.match(html, /Find our shared picks/);
  assert.equal((html.match(/<input/g) ?? []).length, 7);
  assert.doesNotMatch(html, /Shared picks across three parts of the city/);
});

test('judge input renders localized Arabic controls before any recommendation exists', () => {
  const html = renderToStaticMarkup(
    createElement(JudgeInputExperience, {locale: 'ar'}),
  );

  assert.match(html, /ما الأشياء التي يحبها كل منكما؟/);
  assert.match(html, /ذوقك/);
  assert.match(html, /اعثر على اختياراتنا المشتركة/);
  assert.equal((html.match(/<input/g) ?? []).length, 7);
  assert.match(html, /href="\/ar" aria-current="page"/);
  assert.doesNotMatch(html, /Shared picks across three parts of the city/);
});
