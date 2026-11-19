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
const L = (...lines) => ({ lines });

test('parseCaptionRequest validates and tidies the idea', () => {
  assert.deepEqual(parseCaptionRequest(null), { ok: false, error: 'bad_request' });
  assert.equal(parseCaptionRequest({ idea: ' ' }).error, 'idea_required');
  assert.equal(parseCaptionRequest({ idea: 'x'.repeat(AI_CAPTION.ideaMax + 1) }).error, 'too_long');
  const r = parseCaptionRequest({ idea: '  my   flight <b>got</b> delayed ', template: 'Drake' });
  assert.equal(r.ok, true);
  assert.equal(r.idea, 'my flight bgot/b delayed');
  assert.equal(r.template, 'Drake');
  assert.equal(r.picture, '');
  assert.deepEqual(r.slots, ['Top line (setup)', 'Bottom line (punchline)']);
  const t = parseCaptionRequest({ idea: 'hi there', slots: ['Left button', ' ', 'Right button', 'x'.repeat(80)] });
  assert.deepEqual(t.slots.map((x) => x.length), [11, 12, 40]);
  assert.equal(parseCaptionRequest({ idea: 'ok', slots: Array(9).fill('a') }).slots.length, 6);
});

test('user prompt includes only the parts that were given', () => {
  assert.match(buildUserPrompt({ idea: 'mondays' }), /^Idea: mondays\nCaption boxes \(2, one line each, in order\): 1\) Top line/);
  assert.match(
    buildUserPrompt({ idea: 'mondays', template: 'Drake', picture: 'a cat', slots: ['A', 'B', 'C'] }),
    /format: Drake[\s\S]*shows: a cat[\s\S]*\(3, one line each, in order\): 1\) A; 2\) B; 3\) C/
  );
});

test('completion request uses structured output and optional reasoning effort', () => {
  const p = { idea: 'mondays', picture: '', template: '', slots: ['Top', 'Bottom'] };
  const withEffort = buildCompletionRequest(p, { model: 'm', reasoningEffort: 'minimal' });
  assert.equal(withEffort.model, 'm');
  assert.equal(withEffort.reasoning_effort, 'minimal');
  assert.equal(withEffort.response_format.type, 'json_schema');
  assert.equal(withEffort.messages[0].role, 'system');
  assert.ok(!('reasoning_effort' in buildCompletionRequest(p, { reasoningEffort: '' })));
});

test('parseCompletion cleans, de-duplicates, caps the options and fits the box count', () => {
  const L = (...lines) => ({ lines });
  const out = parseCompletion(
    reply([
      L('"WHEN THE FLIGHT"', 'IS DELAYED AGAIN'),
      L('when the flight', 'is delayed again'),
      L('', ''),
      L('', 'Gate C17 is my home now'),
      L('A', 'B'),
      L('C', 'D')
    ]),
    2
  );
  assert.deepEqual(out, [
    { lines: ['WHEN THE FLIGHT', 'IS DELAYED AGAIN'], top: 'WHEN THE FLIGHT', bottom: 'IS DELAYED AGAIN' },
    { lines: ['', 'Gate C17 is my home now'], top: '', bottom: 'Gate C17 is my home now' },
    { lines: ['A', 'B'], top: 'A', bottom: 'B' }
  ]);
  const three = parseCompletion(reply([L('one', 'two'), L('a', 'b', 'c', 'extra')]), 3);
  assert.deepEqual(three.map((o) => o.lines), [['one', 'two', ''], ['a', 'b', 'c']]);
  assert.equal(three[1].bottom, 'c');
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
