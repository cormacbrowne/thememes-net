// Unit tests for Phase 2.7 homepage redesign & Wholesome category.
// Run: node --test tests/unit/homepageAndWholesome.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CATEGORY_SLUG_TO_ID,
  CATEGORY_ID_TO_SLUG,
  resolveRouteFromLocation,
  getCanonicalPathForState
} from '../../src/data/seoRoutes.js';

test('Wholesome category and homepage featured category order are wired consistently', () => {
  const catSrc = fs.readFileSync(new URL('../../src/data/memeCategories.js', import.meta.url), 'utf8');
  assert.match(catSrc, /\{\s*id:\s*'wholesome',\s*label:\s*'Wholesome'/);
  assert.match(
    catSrc,
    /export const HOMEPAGE_FEATURED_CATEGORY_IDS\s*=\s*\[\s*'wholesome',\s*'dank',\s*'tech',\s*'gaming',\s*'relatable'\s*\]/
  );
  assert.match(catSrc, /export const HOMEPAGE_FEATURED_LABELS\s*=\s*\{\s*tech:\s*'Programming'/);
  assert.equal(CATEGORY_SLUG_TO_ID.wholesome, 'wholesome');
  assert.equal(CATEGORY_ID_TO_SLUG.wholesome, 'wholesome');

  const route = resolveRouteFromLocation('/memes/wholesome', '');
  assert.equal(route.viewMode, 'feed');
  assert.equal(route.category, 'wholesome');
  assert.equal(getCanonicalPathForState({ viewMode: 'feed', category: 'wholesome' }), '/memes/wholesome');
});

test('Homepage renders Battle-first Daily Hub, Trending Feed, and Fun Extras without DualDirectionHero', () => {
  const app = fs.readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
  assert.equal(app.includes('<HomeDailyHub'), true);
  assert.equal(app.includes('<HomeFunExtras'), true);
  assert.equal(app.includes('<DualDirectionHero'), false);

  const hubIdx = app.indexOf('<HomeDailyHub');
  const feedIdx = app.indexOf('id="tm-memes-feed-start"');
  const extrasIdx = app.indexOf('<HomeFunExtras');
  assert.ok(hubIdx > 0 && feedIdx > hubIdx && extrasIdx > feedIdx);
});
