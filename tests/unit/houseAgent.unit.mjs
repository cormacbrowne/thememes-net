// Workstream 1 — house agents: topic filter, duplicate check, idempotency, hot score,
// 1-in-4 house cap, template mirror and the LLM wrapper's budget/retry rules. No network.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  topicRuleBlock,
  filterTopics,
  isNearDuplicate,
  captionSimilarity,
  runKey,
  runOnce,
  memeSlotForHour,
  memesForSlot,
  localParts,
  hotScore,
  capHouseShare,
  safeEqual,
  slugify
} from '../../supabase/functions/_shared/houseAgentCore.js';
import { HOUSE_TEMPLATES, buildHouseOverlay } from '../../supabase/functions/_shared/houseTemplates.js';
import { parseTrendsRss, EVERGREEN_TOPICS } from '../../supabase/functions/_shared/houseTopics.js';
import { generateJson, pickProvider, LlmError } from '../../supabase/functions/_shared/llm.js';
import { STUDIO_TEMPLATES } from '../../src/data/starterMemes.js';

const env = (vars) => ({ get: (k) => vars[k] });

// ---------------------------------------------------------------- topic filter
test('topic rules drop every blocked category', () => {
  const blocked = {
    death: 'Famous actor dies aged 80',
    disaster: 'Earthquake hits coast',
    crime: 'Man arrested after robbery',
    war: 'Missile strikes overnight',
    politics: 'General election poll results',
    religion: 'Pope visits city',
    health: 'Bird flu outbreak spreads',
    minors: 'Schoolgirl goes viral',
    sexual: 'Celebrity nude leak'
  };
  for (const [reason, topic] of Object.entries(blocked)) {
    assert.equal(topicRuleBlock(topic)?.reason, reason, topic);
  }
  assert.equal(topicRuleBlock('Mondays'), null);
  assert.equal(topicRuleBlock('new phone launch'), null);
});

test('owner blocked_topics are dropped', () => {
  assert.equal(topicRuleBlock('Taylor Swift tour dates', ['taylor swift'])?.reason, 'blocked_topics');
});

test('filterTopics fails closed: needs rules pass AND explicit safe=true', () => {
  const topics = ['Mondays', 'Wi-Fi', 'Election night', 'Some celebrity', 'Pets'];
  const verdicts = [
    { topic: 'mondays', safe: true, reason: 'harmless' },
    { topic: 'Wi-Fi', safe: false, reason: 'unsure' },
    { topic: 'Election night', safe: true, reason: 'model said ok' },
    { topic: 'Pets', safe: 'yes', reason: 'not a boolean' }
    // 'Some celebrity' has no verdict at all
  ];
  const { kept, dropped } = filterTopics(topics, verdicts, []);
  assert.deepEqual(kept, ['Mondays']);
  const reasons = Object.fromEntries(dropped.map((d) => [d.topic, d.reason]));
  assert.equal(reasons['Election night'], 'politics'); // rules beat the model
  assert.equal(reasons['Some celebrity'], 'no_verdict');
  assert.match(reasons['Wi-Fi'], /^llm:/);
  assert.match(reasons.Pets, /^llm:/);
});

test('evergreen list itself passes the rule layer', () => {
  for (const t of EVERGREEN_TOPICS) assert.equal(topicRuleBlock(t), null, t);
});

test('Google Trends RSS titles are parsed, channel title skipped', () => {
  const xml = `<rss><channel><title>Daily Search Trends</title>
    <item><title>Arsenal</title></item><item><title><![CDATA[Black Friday deals &amp; more]]></title></item></channel></rss>`;
  assert.deepEqual(parseTrendsRss(xml), ['Arsenal', 'Black Friday deals & more']);
});

// ---------------------------------------------------------------- duplicates
test('duplicate check: same template + near-identical caption within the window', () => {
  const recent = [{ template_id: 'tpl-two-buttons', lines: ['GO TO BED EARLY', 'START A NEW SERIES AT 1 AM'] }];
  assert.equal(isNearDuplicate({ template_id: 'tpl-two-buttons', lines: ['Go to bed early!', 'start a new series at 1am'] }, recent), false);
  assert.equal(isNearDuplicate({ template_id: 'tpl-two-buttons', lines: ['go to bed early', 'start a new series at 1 am'] }, recent), true);
  assert.equal(isNearDuplicate({ template_id: 'tpl-this-is-fine', lines: ['go to bed early', 'start a new series at 1 am'] }, recent), false);
  assert.equal(isNearDuplicate({ template_id: 'tpl-two-buttons', lines: ['Mondays', 'exist'] }, recent), false);
  assert.ok(captionSimilarity(['a b c d e'], ['a b c d e f']) >= 0.8);
});

// ---------------------------------------------------------------- idempotency
test('runKey is (task, local date, slot) and a second run with the same key does nothing', async () => {
  const key = runKey('daily_memes', '2026-11-21', 'morning');
  assert.equal(key, 'daily_memes:2026-11-21:morning');
  assert.throws(() => runKey('nope', '2026-11-21', 'x'));

  const claimed = new Set();
  const store = { claim: async (k) => (claimed.has(k) ? false : (claimed.add(k), true)) };
  let posts = 0;
  const work = async () => {
    posts += 1;
    return { status: 'ok' };
  };
  assert.equal((await runOnce(store, key, work)).status, 'ok');
  const second = await runOnce(store, key, work);
  assert.equal(second.status, 'skipped');
  assert.equal(second.reason, 'already_ran');
  assert.equal(posts, 1);
});

test('meme slots follow the London clock (GMT and BST map to the same slots)', () => {
  // 08:15 UTC: 08:15 GMT in winter, 09:15 BST in summer → both 'morning'
  assert.equal(memeSlotForHour(localParts(new Date('2026-01-15T08:15:00Z')).hour).slot, 'morning');
  assert.equal(memeSlotForHour(localParts(new Date('2026-07-15T08:15:00Z')).hour).slot, 'morning');
  assert.equal(memeSlotForHour(localParts(new Date('2026-07-15T13:15:00Z')).hour).slot, 'midday');
  assert.equal(memeSlotForHour(localParts(new Date('2026-07-15T18:15:00Z')).hour).slot, 'evening');
  assert.equal(localParts(new Date('2026-07-15T23:30:00Z')).date, '2026-07-16');
  assert.deepEqual([0, 1, 2].map((i) => memesForSlot(6, i)), [2, 2, 2]);
  assert.deepEqual([0, 1, 2].map((i) => memesForSlot(7, i)), [3, 2, 2]);
});

// ---------------------------------------------------------------- hot score & house cap
test('hot score = (reactions + 2*comments + 1) / (hours + 2)^1.5', () => {
  assert.equal(hotScore({ reactions: 0, comments: 0, hoursSincePost: 0 }), 1 / Math.pow(2, 1.5));
  assert.equal(hotScore({ reactions: 5, comments: 2, hoursSincePost: 7 }), 10 / 27);
  assert.ok(hotScore({ reactions: 10, hoursSincePost: 1 }) > hotScore({ reactions: 10, hoursSincePost: 10 }));
  assert.ok(hotScore({ comments: 3 }) > hotScore({ reactions: 5 }));
  assert.equal(hotScore({ reactions: -4 }), hotScore({}));
});

test('Hot never shows more than 1 house meme in any 4 consecutive cards', () => {
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `h${i}`, is_house: true })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `u${i}`, is_house: false }))
  ];
  const out = capHouseShare(rows);
  for (let i = 0; i + 4 <= out.length; i += 1) {
    assert.ok(out.slice(i, i + 4).filter((r) => r.is_house).length <= 1, `window at ${i}`);
  }
  // humans keep their order, the hottest house meme is still first
  assert.deepEqual(out.filter((r) => !r.is_house).map((r) => r.id), rows.filter((r) => !r.is_house).map((r) => r.id));
  assert.equal(out[0].id, 'h0');
  // house memes that would need more humans than exist are dropped (10 humans → at most 4 house)
  assert.equal(out.filter((r) => r.is_house).length, 4);
  // a feed with no house memes is untouched
  const humans = rows.filter((r) => !r.is_house);
  assert.deepEqual(capHouseShare(humans), humans);
});

test('get_hot_feed SQL uses the same formula and gap as the JS mirror', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261120220011_house_agents.sql', import.meta.url), 'utf8');
  assert.match(sql, /\(rx\.total \+ 2 \* cc\.n \+ 1\)/);
  assert.match(sql, /, 1\.5\)/);
  assert.match(sql, /3 \* h\.k \+ max\(h\.natural_before - 3 \* h\.k\)/);
});

// ---------------------------------------------------------------- templates & overlay
test('house templates mirror the studio library', () => {
  const studio = new Map(STUDIO_TEMPLATES.map((t) => [t.id, t]));
  for (const t of HOUSE_TEMPLATES) {
    const s = studio.get(t.id);
    assert.ok(s, `${t.id} missing from STUDIO_TEMPLATES`);
    assert.equal(s.src, `/seed/${t.id}.webp`);
    assert.equal(s.category, t.category);
    assert.equal(s.layoutId, t.layoutId);
  }
});

test('house overlay is live and laid out like the Forge classic/drake layouts', () => {
  const ov = buildHouseOverlay('tpl-two-buttons', ['WHEN THE WIFI', 'DROPS']);
  assert.equal(ov.live, true);
  assert.equal(ov.burned, false);
  assert.deepEqual(ov.layers.map((l) => l.y), [0.1, 0.9]);
  assert.equal(buildHouseOverlay('tpl-drake-compare', ['old', 'new']).layers[0].x, 0.75);
  assert.equal(buildHouseOverlay('tpl-two-buttons', ['', 'only bottom']).layers.length, 1);
});

// ---------------------------------------------------------------- LLM wrapper
test('provider choice: Anthropic when its key is set, else OpenAI', () => {
  assert.deepEqual(pickProvider(env({ ANTHROPIC_API_KEY: 'x', OPENAI_API_KEY: 'y' })), { provider: 'anthropic', model: 'claude-haiku-5-5' });
  assert.deepEqual(pickProvider(env({ OPENAI_API_KEY: 'y', AI_CAPTION_MODEL: 'gpt-5-mini' })), { provider: 'openai', model: 'gpt-5-mini' });
  assert.deepEqual(pickProvider(env({ OPENAI_API_KEY: 'y', AGENT_MODEL: 'm' })).model, 'm');
  assert.equal(pickProvider(env({})).provider, 'none');
});

test('LLM: budget stops the run before any call', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response('{}');
  };
  await assert.rejects(
    generateJson({ system: 's', user: 'u', schema: {} }, { env: env({ OPENAI_API_KEY: 'k' }), budgetLeft: 0, fetchImpl }),
    (e) => e instanceof LlmError && e.code === 'budget_exceeded'
  );
  assert.equal(calls, 0);
});

test('LLM: one retry, then tokens are reported', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return new Response('oops', { status: 500 });
    return new Response(JSON.stringify({ usage: { total_tokens: 42 }, choices: [{ message: { content: '{"ok":true}' } }] }));
  };
  const out = await generateJson({ system: 's', user: 'u', schema: {} }, { env: env({ OPENAI_API_KEY: 'k' }), budgetLeft: 1000, fetchImpl });
  assert.deepEqual(out.data, { ok: true });
  assert.equal(out.tokens, 42);
  assert.equal(calls, 2);
});

test('LLM: a call that overshoots the budget is refused', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ usage: { total_tokens: 500 }, choices: [{ message: { content: '{}' } }] }));
  await assert.rejects(
    generateJson({ system: 's', user: 'u', schema: {} }, { env: env({ OPENAI_API_KEY: 'k' }), budgetLeft: 100, fetchImpl }),
    (e) => e.code === 'budget_exceeded' && e.tokens === 500
  );
});

test('LLM: Anthropic refusal is not retried', async () => {
  let calls = 0;
  const anthropic = {
    messages: {
      create: async () => {
        calls += 1;
        return { stop_reason: 'refusal', usage: { input_tokens: 10, output_tokens: 0 }, content: [] };
      }
    }
  };
  await assert.rejects(
    generateJson({ system: 's', user: 'u', schema: {} }, { env: env({ ANTHROPIC_API_KEY: 'k' }), budgetLeft: 1000, anthropic }),
    (e) => e.code === 'refused'
  );
  assert.equal(calls, 1);
});

test('misc helpers', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('', ''), false);
  assert.equal(slugify('HOUSEPLANT DRAMA!'), 'houseplant-drama');
});

test('house content can never win: SQL guards are present', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261120220011_house_agents.sql', import.meta.url), 'utf8');
  const close = sql.slice(sql.indexOf('create or replace function public.close_battle'), sql.indexOf('grant execute on function public.close_battle'));
  assert.match(close, /set rank = null\s+where battle_id = p_battle_id and is_house/);
  assert.match(close, /status = 'approved' and not is_house/);
  assert.match(close, /not e\.is_house and e\.rank between 1 and 3/);
  assert.match(close, /not e\.is_house and e\.rank = 1/);
  const boards = sql.slice(sql.indexOf('create or replace function public.get_weekly_leaderboards'), sql.indexOf('create or replace view public.memes_feed_view'));
  assert.equal((boards.match(/is_house/g) || []).length >= 5, true);
  assert.match(sql, /not public\.is_house_user\(m\.user_id\)/); // bounty prize
});
