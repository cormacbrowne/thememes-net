// Plan 1.1 — "Real numbers only".
// Every vote / reaction / remix count shown on the site must come from the database
// (public.votes, public.reactions, memes.mutation_count). These tests fail if seeded,
// hard-coded or invented counts come back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STARTER_MEMES, getMemeRarityTier } from '../../src/data/starterMemes.js';
import { ENGAGEMENT_TIERS } from '../../src/config/engagementTiers.js';
import { SAMPLE_MEMES_IN_FEED } from '../../src/config/featureFlags.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const ZERO_REACTIONS = { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 };

test('sample memes carry no vote, reaction or remix counts', () => {
  assert.ok(STARTER_MEMES.length > 0);
  for (const m of STARTER_MEMES) {
    assert.equal(m.score, 0, `${m.id} has a seeded score`);
    assert.equal(m.mutation_count, 0, `${m.id} has a seeded remix count`);
    assert.deepEqual(m.reactions, ZERO_REACTIONS, `${m.id} has seeded reactions`);
  }
});

test('sample memes have a fixed date, never one relative to page load', () => {
  const dates = new Set(STARTER_MEMES.map((m) => m.created_at));
  assert.equal(dates.size, 1);
  const t = Date.parse([...dates][0]);
  assert.ok(Date.now() - t > 24 * 3600 * 1000, 'sample date looks like "just now"');
});

test('seed data source has no hard-coded count literals', () => {
  const src = read('src/data/starterMemes.js');
  const seedBlock = src.slice(src.indexOf('const RAW_SEED_MEMES'), src.indexOf('export const STARTER_MEMES'));
  assert.ok(seedBlock.length > 100);
  assert.doesNotMatch(seedBlock, /\bscore:\s*[1-9]/);
  assert.doesNotMatch(seedBlock, /mutation_count:\s*[1-9]/);
  assert.doesNotMatch(seedBlock, /'🔥':\s*[1-9]/);
});

test('sample memes stay out of the feed unless the owner switches them on', () => {
  assert.equal(SAMPLE_MEMES_IN_FEED, false);
  const feed = read('src/hooks/useFeed.js');
  assert.match(feed, /const FEED_SAMPLE_MEMES = SAMPLE_MEMES_IN_FEED \? STARTER_MEMES : \[\];/);
  // STARTER_MEMES may only be referenced through the flag.
  const uses = feed.match(/STARTER_MEMES/g) || [];
  assert.equal(uses.length, 2, 'useFeed should only import STARTER_MEMES and gate it with the flag');
});

test('engagement badges come only from real counts', () => {
  const old = '2026-01-01T00:00:00.000Z';
  const now = Date.parse('2026-11-20T12:00:00.000Z');
  const real = (o) => ({ id: 'abc', created_at: old, score: 0, mutation_count: 0, reactions: ZERO_REACTIONS, ...o });

  for (const seed of STARTER_MEMES.slice(0, 5)) {
    assert.equal(getMemeRarityTier(seed, now).label, null, 'sample memes never get a badge');
  }
  assert.equal(getMemeRarityTier(real({}), now).label, null);
  assert.equal(
    getMemeRarityTier(real({ score: ENGAGEMENT_TIERS.heating.minScore }), now).tier,
    'heating'
  );
  assert.equal(
    getMemeRarityTier(real({ score: ENGAGEMENT_TIERS.supernova.minScore }), now).tier,
    'supernova'
  );
  assert.equal(getMemeRarityTier(real({ score: ENGAGEMENT_TIERS.heating.minScore - 1 }), now).tier, 'standard');
  const hourAgo = new Date(now - 3600 * 1000).toISOString();
  assert.equal(getMemeRarityTier(real({ created_at: hourAgo }), now).label, '✨ NEW');
  const threeDaysAgo = new Date(now - 3 * 86400 * 1000).toISOString();
  assert.equal(getMemeRarityTier(real({ created_at: threeDaysAgo }), now).label, '🌱 FRESH');
});

test('games and arena never invent vote numbers', () => {
  const hilow = read('src/components/HigherOrLowerGame.jsx');
  assert.doesNotMatch(hilow, /Math\.max\(\s*[1-9]\d*\s*,\s*Math\.floor/, 'no minimum fake score');
  assert.doesNotMatch(hilow, /STARTER_MEMES/);
  const feed = read('src/hooks/useFeed.js');
  assert.doesNotMatch(feed, /Math\.max\(10, Number\(pickedMeme\.score/);
});

test('database: new memes start at zero and old baselines are backed up', () => {
  const sql = read('supabase/migrations/20261120000001_real_counts_only.sql');
  assert.match(sql, /create table if not exists public\.meme_count_baseline_backup/);
  assert.match(sql, /before insert on public\.memes/);
  assert.match(sql, /alter column base_score set default 0/);
  const publish = read('supabase/functions/publish-meme/index.ts');
  assert.doesNotMatch(publish, /\bscore:\s*1\b/);
});
