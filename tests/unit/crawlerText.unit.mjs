// What search engines read before the app starts: wordmark once, no placeholder copy, honest counts.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChromeSignSvg } from '../../src/components/chromeBrandSvg.js';
import { SEO_ROUTES, ARCADE_GAME_COUNT, getCanonicalPathForState, resolveRouteFromLocation } from '../../src/data/seoRoutes.js';
import { ARCADE_GAMES_CATALOG, BOSS_SCREENS_CATALOG } from '../../src/data/arcadeGamesCatalog.js';

const visibleText = (html) =>
  html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('the neon wordmark reads "THE MEMES .NET" exactly once', () => {
  for (const opts of [{}, { showFlow: true }, { compact: true }]) {
    assert.equal(visibleText(buildChromeSignSvg({ uid: 't', ...opts })), 'THE MEMES .NET');
  }
});

test('SEO copy has no placeholder words and uses the real game count', () => {
  assert.equal(ARCADE_GAME_COUNT, ARCADE_GAMES_CATALOG.length);
  for (const r of SEO_ROUTES) {
    const copy = [r.title, r.description, r.h1, ...r.introParagraphs].join(' ');
    assert.doesNotMatch(copy, /\bseed memes\b|\bstarter memes\b|Loading fresh memes/i, r.path);
    for (const m of copy.matchAll(/\b(\d+)\s+(?:free\s+)?(?:retro\s+|browser\s+|arcade\s+|meme\s+|&\s+)*games\b/gi)) {
      assert.equal(Number(m[1]), ARCADE_GAME_COUNT, `${r.path}: "${m[0]}"`);
    }
  }
});

test('prank screens hub routes and every prank returns to it', () => {
  const hub = SEO_ROUTES.find((r) => r.path === '/prank-screens');
  assert.ok(hub);
  assert.equal(resolveRouteFromLocation('/prank-screens', '').viewMode, 'pranks');
  assert.equal(getCanonicalPathForState({ viewMode: 'pranks' }), '/prank-screens');
  for (const p of BOSS_SCREENS_CATALOG) {
    const r = resolveRouteFromLocation(p.path, '');
    assert.equal(r.viewMode, 'pranks', p.path);
    assert.equal(r.bossKeyActive, true, p.path);
  }
});

test('prank screen labels carry no Microsoft / Apple company names', () => {
  for (const p of BOSS_SCREENS_CATALOG) assert.doesNotMatch(`${p.label} ${p.pitch}`, /microsoft|apple inc/i, p.id);
});
