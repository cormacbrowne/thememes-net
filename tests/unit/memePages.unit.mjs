// Plan 2.2 — Meme pages, battle pages, readable slugs, rewrite order, and tidy watermark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { memeSlug, memePath, memeUrl, extractTemplateSlug } from '../../src/utils/memeSeo.js';
import { resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('memeSlug, memePath and memeUrl generate readable /m/<id>/<slug> URLs while keeping seeds static', () => {
  assert.equal(memeSlug("My Boss's Face at 9 AM!"), 'my-bosss-face-at-9-am');
  assert.equal(memeSlug('Café & Résumé'), 'cafe-resume');
  assert.equal(
    memePath({ id: '11111111-2222-4333-8444-555555555555', title: 'Monday Mood' }),
    '/m/11111111-2222-4333-8444-555555555555/monday-mood'
  );
  assert.equal(
    memePath({ id: 'seed-dank-01', title: 'Ignored Title' }),
    '/m/seed-dank-01'
  );
  assert.equal(
    memeUrl({ id: '11111111-2222-4333-8444-555555555555', title: 'Monday Mood' }),
    'https://www.thememes.net/m/11111111-2222-4333-8444-555555555555/monday-mood'
  );
});

test('extractTemplateSlug parses /meme-templates/<slug>.webp paths cleanly', () => {
  assert.equal(extractTemplateSlug('/meme-templates/two-buttons.webp'), 'two-buttons');
  assert.equal(
    extractTemplateSlug('https://www.thememes.net/meme-templates/drake-reject-approve.webp?v=2'),
    'drake-reject-approve'
  );
  assert.equal(extractTemplateSlug('/seed/seed-dank-01.webp'), null);
  assert.equal(extractTemplateSlug(''), null);
});

test('resolveRouteFromLocation resolves /m/<id>/<slug>, /battle/<id> and /battle/<id>/e/<entryId>', () => {
  const memeRoute = resolveRouteFromLocation('/m/11111111-2222-4333-8444-555555555555/monday-mood', '');
  assert.equal(memeRoute.theaterMemeId, '11111111-2222-4333-8444-555555555555');
  assert.equal(memeRoute.isDedicatedLanding, true);

  const bId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const eId = '11111111-2222-4333-8444-555555555555';
  const battleRoute = resolveRouteFromLocation(`/battle/${bId}`, '');
  assert.equal(battleRoute.battleId, bId);
  assert.equal(battleRoute.battleEntryId, null);
  assert.equal(battleRoute.isDedicatedLanding, true);

  const entryRoute = resolveRouteFromLocation(`/battle/${bId}/e/${eId}`, '');
  assert.equal(entryRoute.battleId, bId);
  assert.equal(entryRoute.battleEntryId, eId);
  assert.equal(entryRoute.matchedPath, `/battle/${bId}/e/${eId}`);
});

test('vercel.json rewrites put specific meme and battle routes before catch-all', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.functions['api/battle-og.js'], 'api/battle-og.js function config exists');

  const sources = vercel.rewrites.map((r) => r.source);
  const idxMemeSlug = sources.indexOf('/m/:id/:slug');
  const idxMemeId = sources.indexOf('/m/:id');
  const idxBattleEntry = sources.indexOf('/battle/:battleId/e/:entryId');
  const idxBattleId = sources.indexOf('/battle/:battleId');
  const idxCatchAll = sources.findIndex((s) => s.includes('api/not-found') || s.startsWith('/((?!_vercel/'));

  assert.ok(idxMemeSlug >= 0 && idxMemeId > idxMemeSlug, '/m/:id/:slug precedes /m/:id');
  assert.ok(idxBattleEntry >= 0 && idxBattleId > idxBattleEntry, '/battle/:battleId/e/:entryId precedes /battle/:battleId');
  assert.ok(idxCatchAll > idxMemeId && idxCatchAll > idxBattleId, 'all meme/battle rewrites precede catch-all');
});

test('watermark pill opacity is tidied to 0.72 while keeping readable text sizing', () => {
  const mutator = read('src/utils/canvasMutator.js');
  assert.match(mutator, /ctx\.globalAlpha\s*=\s*0\.72;/);
});
