// Plan 2.1 — Daily Caption Battle v2: server rules and schema guarantees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BATTLE_CAPTION_MAX,
  validateBattleEntryRequest,
  decideEntryWrite
} from '../../supabase/functions/_shared/captionBattleCore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261120144742_daily_battles_v2.sql'), 'utf8');
const LIVE = '11111111-2222-4333-8444-555555555555';

test('entries must target the battle that is live right now', () => {
  assert.equal(validateBattleEntryRequest({ battleId: LIVE, topText: 'hi' }, LIVE).ok, true);
  assert.equal(validateBattleEntryRequest({ battleId: LIVE, topText: 'hi' }, null).error, 'battle_closed');
  assert.equal(
    validateBattleEntryRequest({ battleId: '99999999-2222-4333-8444-555555555555', topText: 'hi' }, LIVE).error,
    'battle_closed'
  );
  assert.equal(validateBattleEntryRequest({ battleId: 'nope', topText: 'hi' }, LIVE).error, 'bad_request');
  assert.equal(validateBattleEntryRequest({ battleId: LIVE }, LIVE).error, 'empty_caption');
});

test('caption length limit (top + bottom) is enforced', () => {
  assert.equal(BATTLE_CAPTION_MAX, 120);
  const ok = validateBattleEntryRequest({ battleId: LIVE, topText: 'a'.repeat(60), bottomText: 'b'.repeat(60) }, LIVE);
  assert.equal(ok.ok, true);
  const tooLong = validateBattleEntryRequest({ battleId: LIVE, topText: 'a'.repeat(61), bottomText: 'b'.repeat(60) }, LIVE);
  assert.equal(tooLong.error, 'caption_too_long');
  assert.equal(validateBattleEntryRequest({ battleId: LIVE, topText: 'a'.repeat(30) }, LIVE, 20).error, 'caption_too_long');
});

test('one entry per player: first time inserts, later edits update, removed entries stay removed', () => {
  assert.equal(decideEntryWrite(null), 'insert');
  assert.equal(decideEntryWrite({ status: 'approved' }), 'update');
  assert.equal(decideEntryWrite({ status: 'pending' }), 'update');
  assert.equal(decideEntryWrite({ status: 'removed' }), 'refuse');
});

test('schema: one battle per day, one entry per user per battle, server-only writes', () => {
  assert.match(sql, /create unique index if not exists battles_one_per_day_idx/);
  assert.match(sql, /create unique index if not exists caption_battle_entries_one_per_user_idx[\s\S]*\(battle_id, user_id\)/);
  assert.match(sql, /revoke insert, update, delete on public\.battles from anon, authenticated/);
  assert.match(sql, /revoke insert, update, delete on public\.battle_awards from anon, authenticated/);
});

test('voting rules live in the database: no own-entry votes, no votes after close', () => {
  assert.match(sql, /'own_entry'/);
  assert.match(sql, /'battle_closed'/);
});

test('live totals stay hidden until the voter has voted on a few entries', () => {
  assert.match(sql, /votes_before_totals integer not null default 3/);
  assert.match(sql, /case when v_show_totals then e\.score end as score/);
});

test('schedule: 09:00 Europe/London for 24 h, cron every 5 minutes, auto template fallback', () => {
  assert.match(sql, /start_local_time time not null default '09:00'/);
  assert.match(sql, /timezone text not null default 'Europe\/London'/);
  assert.match(sql, /duration interval not null default interval '24 hours'/);
  assert.match(sql, /cron\.schedule\('battle-tick', '\*\/5 \* \* \* \*'/);
  assert.match(sql, /create or replace function public\.ensure_daily_battle/);
});

test('results: top 3 get badges and play-money M$, winner goes to the Hall of Fame', () => {
  assert.match(sql, /"rank": 1, "mdollarz": 50, "badge": "battle_champion"/);
  assert.match(sql, /insert into public\.caption_battle_winners/);
  assert.match(sql, /create or replace function public\.claim_battle_award/);
  assert.match(sql, /claimed_at is null/);
});
