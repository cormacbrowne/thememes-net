import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ARCADE_GAMES_CATALOG, BOSS_SCREENS_CATALOG } from '../../src/data/arcadeGamesCatalog.js';
import { buildRatingsSummaryMap, sortGamesByRating } from '../../src/utils/gameRatings.js';

test('arcade games and prank screens catalogs are strictly separated with unique ids', () => {
  const gameIds = new Set(ARCADE_GAMES_CATALOG.map((g) => g.id));
  const prankIds = new Set(BOSS_SCREENS_CATALOG.map((p) => p.id));

  assert.equal(gameIds.size, ARCADE_GAMES_CATALOG.length, 'game ids are unique');
  assert.equal(prankIds.size, BOSS_SCREENS_CATALOG.length, 'prank screen ids are unique');

  for (const pid of prankIds) {
    assert.equal(gameIds.has(pid), false, `prank screen "${pid}" must not appear in ARCADE_GAMES_CATALOG`);
  }
});

test('sortGamesByRating puts higher star-rated games at the top of the list', () => {
  const summary = buildRatingsSummaryMap(
    {
      slots: { avgStars: 4.9, count: 12 },
      blackjack: { avgStars: 4.2, count: 5 },
      invaders: { avgStars: 3.1, count: 2 }
    },
    { pinball: 5 }
  );

  const sorted = sortGamesByRating(ARCADE_GAMES_CATALOG, summary);
  assert.equal(sorted[0].id, 'pinball', '5-star rated game sorts to very top');
  assert.equal(sorted[1].id, 'slots', '4.9-star rated game sorts second');
  assert.equal(sorted[2].id, 'blackjack', '4.2-star rated game sorts third');
  assert.equal(sorted[3].id, 'invaders', '3.1-star rated game sorts fourth');
});

test('GameIcon covers every game and prank screen id without duplicates', () => {
  const src = fs.readFileSync(path.resolve('src/components/GameIcon.jsx'), 'utf8');
  for (const item of [...ARCADE_GAMES_CATALOG, ...BOSS_SCREENS_CATALOG]) {
    assert.match(src, new RegExp(`case\\s+'${item.id}'`), `GameIcon should draw unique icon for "${item.id}"`);
  }
});

test('20261117000003_game_ratings migration enforces RLS and safe RPC grants', () => {
  const sql = fs.readFileSync(path.resolve('supabase/migrations/20261117000003_game_ratings.sql'), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.game_ratings from public, anon, authenticated/i);
  assert.match(sql, /create or replace function public\.rate_game/i);
  assert.match(sql, /stars between 1 and 5/i);
  assert.match(sql, /grant execute on function public\.get_game_ratings\(\) to anon, authenticated/i);
});
