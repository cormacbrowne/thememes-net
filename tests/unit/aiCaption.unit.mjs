// Unit tests for the AI Caption Writer helpers. No network.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AI_CAPTION,
  parseCaptionRequest,
  buildUserPrompt,
  buildCompletionRequest,
  parseCompletion
} from '../../supabase/functions/_shared/aiCaptionCore.js';

const reply = (captions) => ({ choices: [{ message: { content: JSON.stringify({ captions }) } }] });

test('parseCaptionRequest validates and tidies the idea', () => {
  assert.deepEqual(parseCaptionRequest(null), { ok: false, error: 'bad_request' });
  assert.equal(parseCaptionRequest({ idea: ' ' }).error, 'idea_required');
  assert.equal(parseCaptionRequest({ idea: 'x'.repeat(AI_CAPTION.ideaMax + 1) }).error, 'too_long');
  const r = parseCaptionRequest({ idea: '  my   flight <b>got</b> delayed ', template: 'Drake' });
  assert.equal(r.ok, true);
  assert.equal(r.idea, 'my flight bgot/b delayed');
  assert.equal(r.template, 'Drake');
  assert.equal(r.picture, '');
});

test('user prompt includes only the parts that were given', () => {
  assert.equal(buildUserPrompt({ idea: 'mondays' }), 'Idea: mondays');
  assert.match(buildUserPrompt({ idea: 'mondays', template: 'Drake', picture: 'a cat' }), /template: Drake[\s\S]*shows: a cat/);
});

test('completion request uses structured output and optional reasoning effort', () => {
  const p = { idea: 'mondays', picture: '', template: '' };
  const withEffort = buildCompletionRequest(p, { model: 'm', reasoningEffort: 'minimal' });
  assert.equal(withEffort.model, 'm');
  assert.equal(withEffort.reasoning_effort, 'minimal');
  assert.equal(withEffort.response_format.type, 'json_schema');
  assert.equal(withEffort.messages[0].role, 'system');
  assert.ok(!('reasoning_effort' in buildCompletionRequest(p, { reasoningEffort: '' })));
});

test('parseCompletion cleans, de-duplicates and caps the options', () => {
  const out = parseCompletion(
    reply([
      { top: '"WHEN THE FLIGHT"', bottom: 'IS DELAYED AGAIN' },
      { top: 'when the flight', bottom: 'is delayed again' },
      { top: '', bottom: '' },
      { top: '', bottom: 'Gate C17 is my home now' },
      { top: 'A', bottom: 'B' },
      { top: 'C', bottom: 'D' }
    ])
  );
  assert.deepEqual(out, [
    { top: 'WHEN THE FLIGHT', bottom: 'IS DELAYED AGAIN' },
    { top: '', bottom: 'Gate C17 is my home now' },
    { top: 'A', bottom: 'B' }
  ]);
});

test('parseCompletion survives junk replies', () => {
  assert.deepEqual(parseCompletion(null), []);
  assert.deepEqual(parseCompletion({ choices: [{ message: { content: 'not json' } }] }), []);
  assert.deepEqual(parseCompletion({ choices: [{ message: { content: '{"captions":"nope"}' } }] }), []);
});

test('quota migration keeps usage server-only and defines the limits', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261119000001_ai_caption_quota.sql', import.meta.url), 'utf8');
  assert.match(sql, /'account_monthly', 25/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.ai_caption_usage from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.ai_caption_quota\(uuid, text, boolean\) to service_role/);
});

test('the OpenAI key is only read inside the Edge Function', () => {
  const fn = readFileSync(new URL('../../supabase/functions/ai-caption/index.ts', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../../src/utils/aiCaption.js', import.meta.url), 'utf8');
  assert.match(fn, /Deno\.env\.get\('OPENAI_API_KEY'\)/);
  assert.doesNotMatch(client, /OPENAI|api\.openai\.com/);
});
