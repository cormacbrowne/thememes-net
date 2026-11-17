import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { replaceRootContent, replaceRouteJsonLd, toNotFoundShell } from '../../api/_seoShell.js';
import { buildMemeJsonLd, memeSeoDescription } from '../../src/utils/memeSeo.js';

const SHELL = `<!doctype html><html><head><title>Home</title>
<meta name="robots" content="index, follow" />
<meta name="description" content="Home page" />
<link rel="canonical" href="https://www.thememes.net/" />
<script id="tm-dynamic-jsonld" type="application/ld+json">{"@type":"WebApplication"}</script>
</head><body><div id="root"><main><div><nav><a href="/x">x</a></nav></div><p>home text</p></main></div>
</body></html>`;

test('replaceRootContent swaps the whole nested root, leaving no home text behind', () => {
  const out = replaceRootContent(SHELL, '<main>meme</main>');
  assert.match(out, /<div id="root"><main>meme<\/main><\/div>\s*<\/body>/);
  assert.doesNotMatch(out, /home text|href="\/x"/);
});

test('not-found shell is noindex, has no canonical and no route JSON-LD', () => {
  const out = toNotFoundShell(SHELL);
  assert.match(out, /<meta name="robots" content="noindex" \/>/);
  assert.doesNotMatch(out, /rel="canonical"/);
  assert.doesNotMatch(out, /tm-dynamic-jsonld/);
  assert.match(out, /<title>Page not found/);
});

test('replaceRouteJsonLd replaces (not duplicates) and escapes <', () => {
  const out = replaceRouteJsonLd(SHELL, { '@type': 'SocialMediaPosting', headline: '</script><b>' });
  assert.equal((out.match(/tm-dynamic-jsonld/g) || []).length, 1);
  assert.doesNotMatch(out, /WebApplication/);
  assert.doesNotMatch(out, /"<\/script>/);
});

test('meme JSON-LD: image has contentUrl, video uses VideoObject, no remix wording', () => {
  const img = buildMemeJsonLd(
    { id: 'a', title: 'Cat', author_name: 'Bob', score: 5, category: 'dank', created_at: '2026-11-01T00:00:00Z' },
    'https://www.thememes.net/m/a',
    'https://www.thememes.net/seed/a.webp'
  );
  assert.equal(img['@type'], 'SocialMediaPosting');
  assert.equal(img.sharedContent.contentUrl, 'https://www.thememes.net/seed/a.webp');
  assert.equal(img.datePublished, '2026-11-01T00:00:00Z');
  const vid = buildMemeJsonLd({ id: 'v', title: 'Clip', media_type: 'video' }, 'u', 'p.webp');
  assert.equal(vid.video['@type'], 'VideoObject');
  assert.doesNotMatch(memeSeoDescription({ title: 'x' }), /remix/i);
});

test('site-wide JSON-LD keeps only Organization + WebSite (no stale FAQ)', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(json['@graph'].map((x) => x['@type']).sort(), ['Organization', 'WebSite']);
});
