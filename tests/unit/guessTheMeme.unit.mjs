import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  formatCountdownHms,
  formatGuessShareCard,
  computeStreakFromDates
} from '../../src/utils/guessTheMeme.js';
import { resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

test('formatGuessShareCard outputs spoiler-free Wordle-style result with thememes.net/daily', () => {
  const card = formatGuessShareCard({
    puzzleNumber: 142,
    solvedCount: 3,
    totalRounds: 5,
    shareGrid: '🟥🟩🟨🟩🟥',
    streak: 6
  });
  assert.equal(
    card,
    'THE MEMES #142 🎯 3/5\n🟥🟩🟨🟩🟥\n🔥 Streak: 6\nthememes.net/daily'
  );
});

test('computeStreakFromDates computes consecutive win streaks up to today or yesterday', () => {
  const active = computeStreakFromDates(
    ['2026-11-16', '2026-11-18', '2026-11-19', '2026-11-20'],
    '2026-11-20'
  );
  assert.equal(active.currentStreak, 3);
  assert.equal(active.bestStreak, 3);

  const missedTwoDays = computeStreakFromDates(['2026-11-15', '2026-11-16'], '2026-11-20');
  assert.equal(missedTwoDays.currentStreak, 0);
  assert.equal(missedTwoDays.bestStreak, 2);
});

test('formatCountdownHms formats millisecond delta cleanly as HH:MM:SS', () => {
  assert.equal(formatCountdownHms((3 * 3600 + 7 * 60 + 9) * 1000), '03:07:09');
  assert.equal(formatCountdownHms(0), '00:00:00');
});

test('/daily resolves to /games/guess-the-meme in router and vercel.json redirects', () => {
  const route = resolveRouteFromLocation('/daily', '');
  assert.equal(route.viewMode, 'guess');
  assert.equal(route.matchedPath, '/games/guess-the-meme');

  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  const dailyRedir = vercel.redirects.find((r) => r.source === '/daily');
  assert.ok(dailyRedir);
  assert.equal(dailyRedir.destination, '/games/guess-the-meme');
  assert.equal(dailyRedir.statusCode, 301);
});
