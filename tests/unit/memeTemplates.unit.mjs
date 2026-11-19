// Meme Template Library: data sanity + every listed template ships its pictures.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  MEME_TEMPLATES,
  getTemplateByPath,
  getTemplateBySlug,
  templateTextLayers
} from '../../src/data/memeTemplates.js';
import { resolveRouteFromLocation, getCanonicalPathForState } from '../../src/data/seoRoutes.js';
import { buildTemplateJsonLd } from '../../src/utils/templateSeo.js';

const publicFile = (p) => fileURLToPath(new URL(`../../public${p}`, import.meta.url));

test('every listed template has its full image and thumbnail', () => {
  assert.ok(MEME_TEMPLATES.length >= 15);
  for (const t of MEME_TEMPLATES) {
    for (const p of [t.image, t.thumb]) {
      assert.ok(existsSync(publicFile(p)), `missing ${p}`);
      assert.ok(statSync(publicFile(p)).size < 250_000, `${p} is too big`);
    }
  }
});

test('templates have unique slugs, sane caption boxes and examples that fit them', () => {
  const slugs = new Set();
  for (const t of MEME_TEMPLATES) {
    assert.ok(!slugs.has(t.slug), `duplicate ${t.slug}`);
    slugs.add(t.slug);
    assert.ok(t.slots.length >= 1 && t.slots.length <= 6, t.slug);
    for (const s of t.slots) {
      for (const k of ['x', 'y', 'w', 'h']) assert.ok(s[k] > 0 && s[k] <= 1, `${t.slug} ${s.label} ${k}`);
      assert.ok(s.x - s.w / 2 >= -0.001 && s.x + s.w / 2 <= 1.001, `${t.slug} ${s.label} overflows x`);
      assert.ok(s.y - s.h / 2 >= -0.001 && s.y + s.h / 2 <= 1.001, `${t.slug} ${s.label} overflows y`);
    }
    for (const ex of t.examples) assert.equal(ex.length, t.slots.length, `${t.slug} example length`);
    assert.ok(t.description.length <= 300 && t.meaning.length > 80, t.slug);
    assert.equal(t.faq.length, 4);
  }
});

test('template URLs resolve both ways', () => {
  for (const t of MEME_TEMPLATES) {
    assert.equal(getTemplateByPath(t.path), t);
    const r = resolveRouteFromLocation(t.path, '');
    assert.equal(r.viewMode, 'templates');
    assert.equal(r.templateSlug, t.slug);
    assert.equal(getCanonicalPathForState({ viewMode: 'templates', templateSlug: t.slug, showStudio: true }), t.path);
  }
  assert.equal(resolveRouteFromLocation('/templates', '').templateSlug, null);
  assert.equal(getCanonicalPathForState({ viewMode: 'templates' }), '/templates');
  assert.equal(resolveRouteFromLocation('/gif-meme-maker', '').matchedPath, '/meme-generator');
});

test('editor layers follow the caption boxes', () => {
  const t = getTemplateBySlug('two-buttons');
  const layers = templateTextLayers(t, (o) => ({ type: 'text', ...o }), ['a', 'b']);
  assert.deepEqual(layers.map((l) => l.label), t.slots.map((s) => s.label));
  assert.deepEqual(layers.map((l) => l.text), ['a', 'b', '']);
  assert.equal(layers[0].slot, 'top');
  assert.equal(layers[2].slot, 'bottom');
});

test('template JSON-LD carries the FAQ, image and breadcrumb', () => {
  const ld = buildTemplateJsonLd(MEME_TEMPLATES[0], 'https://www.thememes.net');
  const types = ld['@graph'].map((n) => n['@type']);
  assert.deepEqual(types, ['WebPage', 'ImageObject', 'BreadcrumbList', 'FAQPage']);
  assert.match(ld['@graph'][1].contentUrl, /^https:\/\/www\.thememes\.net\/meme-templates\/.+\.webp$/);
});
