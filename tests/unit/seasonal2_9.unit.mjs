// Unit tests for Phase 2.9 seasonal features (Christmas & New Year) & /year-in-memes.
// Run: node --test tests/unit/seasonal2_9.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  VALID_SEASONAL_SKINS,
  getActiveSeasonalSkin,
  TWELVE_DAYS_OF_MEMES,
  buildTwelveDaysSchedule
} from '../../src/config/seasonal.js';
import { BOSS_SCREENS_CATALOG } from '../../src/data/arcadeGamesCatalog.js';
import {
  PRANK_DISGUISE_TO_PATH,
  SEO_ROUTES,
  resolveRouteFromLocation,
  getCanonicalPathForState
} from '../../src/data/seoRoutes.js';

test('getActiveSeasonalSkin respects flags, auto calendar windows, and ?season override', () => {
  assert.deepEqual(VALID_SEASONAL_SKINS, ['off', 'christmas', 'newyear', 'auto']);
  assert.equal(getActiveSeasonalSkin({ flag: 'off', now: new Date('2026-12-20T12:00:00Z') }), 'off');
  assert.equal(getActiveSeasonalSkin({ flag: 'christmas' }), 'christmas');
  assert.equal(getActiveSeasonalSkin({ flag: 'newyear' }), 'newyear');

  assert.equal(getActiveSeasonalSkin({ flag: 'auto', now: new Date('2026-12-15T12:00:00Z') }), 'christmas');
  assert.equal(getActiveSeasonalSkin({ flag: 'auto', now: new Date('2026-12-29T12:00:00Z') }), 'newyear');
  assert.equal(getActiveSeasonalSkin({ flag: 'auto', now: new Date('2027-01-03T12:00:00Z') }), 'newyear');
  assert.equal(getActiveSeasonalSkin({ flag: 'auto', now: new Date('2026-07-10T12:00:00Z') }), 'off');

  assert.equal(
    getActiveSeasonalSkin({ flag: 'off', search: '?season=christmas' }),
    'christmas'
  );
  assert.equal(
    getActiveSeasonalSkin({ flag: 'christmas', search: '?season=off' }),
    'off'
  );
});

test('12 Days of Memes covers 13–24 Dec 2026 with neutral copy and battle images', () => {
  assert.equal(TWELVE_DAYS_OF_MEMES.length, 12);
  const starterSrc = fs.readFileSync(new URL('../../src/data/starterMemes.js', import.meta.url), 'utf8');
  const schedule = buildTwelveDaysSchedule(2026);
  assert.deepEqual(
    schedule.map((d) => d.battleDay),
    Array.from({ length: 12 }, (_, i) => `2026-12-${13 + i}`)
  );
  assert.equal(new Set(schedule.map((d) => d.defaultImageUrl)).size, 12);

  for (const item of schedule) {
    assert.equal(item.theme, '12 Days of Memes');
    assert.ok(starterSrc.includes(`id: '${item.defaultTemplateId}'`), `Valid template ${item.defaultTemplateId}`);
    assert.match(item.defaultImageUrl, /^\/seed\/battle-[a-z0-9-]+\.webp$/);
    assert.doesNotMatch(item.defaultImageUrl, /otter/);
    assert.ok(fs.existsSync(new URL(`../../public${item.defaultImageUrl}`, import.meta.url)), item.defaultImageUrl);
    assert.doesNotMatch(`${item.title} ${item.prompt}`, /slack|mariah|carey|die hard|sellotape|last friday/i);
  }
});

test('Holiday soundboard pads (jinglebells & hohoho) are synthesized and documented in docs/ASSETS.md', () => {
  const engineSrc = fs.readFileSync(new URL('../../src/utils/soundEngine.js', import.meta.url), 'utf8');
  const assetsDoc = fs.readFileSync(new URL('../../docs/ASSETS.md', import.meta.url), 'utf8');

  assert.match(engineSrc, /id:\s*'jinglebells'/);
  assert.match(engineSrc, /id:\s*'hohoho'/);
  assert.match(engineSrc, /playJingleBells\s*\(/);
  assert.match(engineSrc, /playHoHoHo\s*\(/);
  assert.match(assetsDoc, /jinglebells/i);
  assert.match(assetsDoc, /hohoho/i);
  assert.match(assetsDoc, /royalty-free/i);
});

test('Office Secret Santa prank & Year in Memes routes are cleanly wired', () => {
  const santaCatalog = BOSS_SCREENS_CATALOG.find((p) => p.id === 'secretsanta');
  assert.ok(santaCatalog, 'secretsanta exists in BOSS_SCREENS_CATALOG');
  assert.equal(santaCatalog.path, '/fake-secret-santa-prank');
  assert.doesNotMatch(`${santaCatalog.label} ${santaCatalog.pitch}`, /microsoft|apple inc|zoom/i);

  assert.equal(PRANK_DISGUISE_TO_PATH.secretsanta, '/fake-secret-santa-prank');
  assert.ok(SEO_ROUTES.some((r) => r.path === '/fake-secret-santa-prank'));
  assert.ok(SEO_ROUTES.some((r) => r.path === '/year-in-memes'));

  const santaResolved = resolveRouteFromLocation('/fake-secret-santa-prank', '');
  assert.equal(santaResolved.bossKeyActive, true);
  assert.equal(santaResolved.prankDisguise, 'secretsanta');
  assert.equal(
    getCanonicalPathForState({ bossKeyActive: true, prankDisguise: 'secretsanta' }),
    '/fake-secret-santa-prank'
  );

  const mainSrc = fs.readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8');
  assert.match(mainSrc, /isYearInMemesRoute/);
  assert.match(mainSrc, /<YearInMemesPage\s*\/>/);
});

test('Year in Memes Supabase migration locks down execution cleanly and uses search_path', () => {
  const migDir = new URL('../../supabase/migrations/', import.meta.url);
  const files = fs.readdirSync(migDir);
  const yimFiles = files.filter((f) => f.includes('year_in_memes_rpc'));
  assert.ok(yimFiles.length >= 1, 'Expected saved year_in_memes migration file');
  const latestSql = fs.readFileSync(path.join(migDir.pathname.replace(/^\/([A-Za-z]:)/, '$1'), yimFiles.sort().at(-1)), 'utf8');
  assert.match(latestSql, /create or replace function public\.get_year_in_memes/i);
  assert.match(latestSql, /security definer/i);
  assert.match(latestSql, /set search_path to ''/i);
  assert.match(latestSql, /revoke execute on function public\.get_year_in_memes\(integer, integer\) from public/i);
  assert.match(latestSql, /battle_wins/);
});
