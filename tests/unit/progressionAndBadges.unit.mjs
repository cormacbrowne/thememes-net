import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEVELS,
  XP_AWARDS,
  applyDailyActivity,
  getLevelForXp,
  getLondonDateKey,
  getLondonIsoWeek,
  getLondonWeekStartDateKey
} from '../../src/config/progression.js';
import { BADGE_CONFIG, evaluateBadges } from '../../src/config/badges.js';

test('LEVELS provides 10 family-friendly progression levels without profanity', () => {
  assert.equal(LEVELS.length, 10);
  const combined = LEVELS.map((l) => l.title.toLowerCase()).join(' ');
  assert.doesNotMatch(combined, /shit|fuck|damn|bitch|crap/);
  assert.equal(getLevelForXp(0).level, 1);
  assert.equal(getLevelForXp(850).level, 4);
  assert.equal(getLevelForXp(9500).level, 10);
  assert.equal(getLevelForXp(9500).progressPct, 100);
});

test('applyDailyActivity increments daily streak and grants 1 free freeze per ISO week', () => {
  // Day 1
  const d1 = applyDailyActivity({}, '2026-11-16'); // Monday 2026-W47
  assert.equal(d1.streakDays, 1);
  assert.equal(d1.freezeUsed, false);

  // Same day repeated action stays at 1
  const d1Again = applyDailyActivity(d1, '2026-11-16');
  assert.equal(d1Again.streakDays, 1);
  assert.equal(d1Again.changed, false);

  // Consecutive Tuesday
  const d2 = applyDailyActivity(d1Again, '2026-11-17');
  assert.equal(d2.streakDays, 2);

  // Missed Wednesday, return Thursday (gap=2) -> consumes 2026-W47 freeze!
  const d4 = applyDailyActivity(d2, '2026-11-19');
  assert.equal(d4.streakDays, 3);
  assert.equal(d4.freezeUsed, true);
  assert.equal(d4.freezeAvailable, false);
  assert.equal(d4.freezeUsedWeek, '2026-W47');

  // Missed Friday in the same week -> freeze already spent -> resets to 1
  const d6 = applyDailyActivity(d4, '2026-11-21');
  assert.equal(d6.streakDays, 1);

  // Next Monday starts 2026-W48 -> freeze available again
  const nextMon = applyDailyActivity(
    { streakDays: 5, bestStreak: 5, lastActiveDay: '2026-11-22', freezeUsedWeek: '2026-W47' },
    '2026-11-24'
  );
  assert.equal(getLondonIsoWeek('2026-11-24'), '2026-W48');
  assert.equal(nextMon.freezeUsed, true);
  assert.equal(nextMon.streakDays, 6);
});

test('getLondonWeekStartDateKey aligns to Monday in Europe/London', () => {
  assert.equal(getLondonWeekStartDateKey('2026-11-20'), '2026-11-16'); // Friday -> Monday
  assert.equal(getLondonWeekStartDateKey('2026-11-22'), '2026-11-16'); // Sunday -> Monday
  assert.match(getLondonDateKey(new Date('2026-11-20T12:00:00Z')), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(XP_AWARDS.meme_created > 0);
});

test('BADGE_CONFIG evaluates all 10 required badges declaratively', () => {
  assert.equal(BADGE_CONFIG.length, 10);
  const locked = evaluateBadges({});
  assert.equal(locked.filter((b) => b.unlocked).length, 0);

  const unlocked = evaluateBadges({
    memeCount: 1,
    battleEntries: 1,
    podiumFinishes: 1,
    captionWins: 1,
    isCaptionKing: true,
    streakDays: 30,
    totalUpvotes: 120,
    remixesSpawned: 5,
    wholesomeMemes: 1
  });
  assert.equal(unlocked.filter((b) => b.unlocked).length, 10);
  assert.ok(unlocked.some((b) => b.id === 'caption-king' && b.unlocked));
  assert.ok(unlocked.some((b) => b.id === 'wholesome-hero' && b.unlocked));
});
