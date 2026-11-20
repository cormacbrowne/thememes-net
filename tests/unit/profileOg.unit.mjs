import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderProfileOgPng } from '../../api/_pngCard.js';
import { mergeCreatorProfilePayload, normalizeCreatorHandle } from '../../src/utils/creatorProfiles.js';

test('renderProfileOgPng produces a valid 1200x630 PNG image buffer', () => {
  const png = renderProfileOgPng({
    handle: 'PixelWizard86',
    level: 6,
    levelTitle: 'Viral Architect',
    battleWins: 3,
    streakDays: 12,
    avatarId: 'neon-cat'
  });

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 2048);
  // PNG signature
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // IHDR chunk width (bytes 16..19) and height (bytes 20..23)
  assert.equal(png.subarray(12, 16).toString('ascii'), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('mergeCreatorProfilePayload maps bio, levelInfo, streakDays, battleWins and 10 config badges', () => {
  const parsed = normalizeCreatorHandle('@PixelWizard86');
  const profile = mergeCreatorProfilePayload({
    parsed,
    serverData: {
      ok: true,
      handle: 'PixelWizard86',
      found: true,
      verified: true,
      avatar_id: 'neon-cat',
      bio: 'Pixel memes & arcade wins only',
      xp: 1600,
      streak_days: 9,
      best_streak: 14,
      follower_count: 25,
      is_caption_king: true,
      caption_wins: 3,
      battle_entries: 4,
      podium_finishes: 3,
      stats: { memes_count: 2, total_score: 140, total_remixes: 1, wholesome_memes: 1 },
      memes: [],
      high_scores: []
    }
  });

  assert.equal(profile.bio, 'Pixel memes & arcade wins only');
  assert.equal(profile.levelInfo.level, 5);
  assert.equal(profile.levelInfo.title, 'Template Wizard');
  assert.equal(profile.streakDays, 9);
  assert.equal(profile.captionWins, 3);
  assert.equal(profile.badges.length, 10);
  assert.ok(profile.badges.some((b) => b.id === 'caption-king' && b.unlocked));
  assert.ok(profile.badges.some((b) => b.id === 'wholesome-hero' && b.unlocked));
});

test('api/creator-og.js and seoEngine.js wire profile-og-image URL', () => {
  const creatorOg = fs.readFileSync('api/creator-og.js', 'utf8');
  const seoEngine = fs.readFileSync('src/utils/seoEngine.js', 'utf8');
  assert.match(creatorOg, /\/api\/profile-og-image\?handle=/);
  assert.match(seoEngine, /\/api\/profile-og-image\?handle=/);
});
