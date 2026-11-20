// Plan 1.2 — content clean-up guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ROUTES, ARCADE_GAME_COUNT } from '../../src/data/seoRoutes.js';
import { ARCADE_GAMES_CATALOG } from '../../src/data/arcadeGamesCatalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('remix titles are never prefixed (prefixes used to stack: "REMIX: REMIX: …")', () => {
  const forge = read('src/components/forge/MemeForge.jsx');
  assert.doesNotMatch(forge, /`REMIX: /);
  assert.doesNotMatch(forge, /`Caption: \$\{parent/);
});

test('arcade game count is calculated from the game list, never hard-coded', () => {
  assert.equal(ARCADE_GAME_COUNT, ARCADE_GAMES_CATALOG.length);
  const lobby = SEO_ROUTES.find((r) => r.path === '/games');
  const text = [lobby.h1, ...(lobby.introParagraphs || [])].join(' ');
  assert.match(text, new RegExp(`\\b${ARCADE_GAME_COUNT} free`, 'i'));

  const files = ['src/data/seoRoutes.js', 'scripts/generate-og-cards.mjs', 'scripts/prerender-seo.mjs', 'index.html'];
  for (const f of files) {
    const src = read(f);
    const hit = src.match(/\b\d{1,2}\+? (?:free )?(?:retro |arcade |neon |browser[- ]based arcade )?(?:games|cabinets|cabinet games)\b/i);
    assert.equal(hit, null, `${f} hard-codes a game count: "${hit?.[0]}"`);
  }
});
