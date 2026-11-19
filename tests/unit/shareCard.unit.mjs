// Share cards: link-preview pictures for every meme.
// Run: npm run test:unit
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as Magick from '@imagemagick/magick-wasm';
import { renderShareCard, fitInCard, sniffCardSource, SHARE_CARD } from '../../supabase/functions/_shared/shareCard.js';
import { shareCardUrl, hasShareCard, shareCardAlt } from '../../src/utils/memeSeo.js';

const require = createRequire(import.meta.url);
before(async () => {
  await Magick.initializeImageMagick(fs.readFileSync(require.resolve('@imagemagick/magick-wasm/magick.wasm')));
});

const bar = new Uint8Array(fs.readFileSync(new URL('../../public/og/share-bar.png', import.meta.url)));

test('share card is a 1200×630 JPEG of a reasonable size', () => {
  const meme = new Uint8Array(fs.readFileSync(new URL('../../public/meme-templates/two-buttons.webp', import.meta.url)));
  const jpg = renderShareCard(Magick, meme, bar);
  assert.equal(sniffCardSource(jpg), 'jpeg');
  assert.ok(jpg.length > 10_000 && jpg.length < 400_000, `size ${jpg.length}`);
  Magick.ImageMagick.read(jpg, (img) => {
    assert.equal(img.width, SHARE_CARD.width);
    assert.equal(img.height, SHARE_CARD.height);
  });
});

test('the meme is contain-fitted above the brand bar, centred', () => {
  const wide = fitInCard(1080, 608);
  assert.ok(wide.y + wide.height <= SHARE_CARD.height - SHARE_CARD.bar);
  assert.equal(wide.x, (SHARE_CARD.width - wide.width) / 2);
  const tall = fitInCard(600, 1800);
  assert.equal(tall.height, SHARE_CARD.height - SHARE_CARD.bar - SHARE_CARD.pad * 2);
  assert.ok(tall.width < 200);
});

test('anything that is not an image is refused', () => {
  assert.throws(() => renderShareCard(Magick, new TextEncoder().encode('<svg onload=alert(1)>hello</svg>'), bar), /unsupported_source/);
  assert.equal(sniffCardSource(new Uint8Array([1, 2, 3])), null);
});

test('only real meme ids get a share-card URL', () => {
  assert.match(shareCardUrl('1CA112BD-F88D-4D27-92C5-E2EAD474B6DA'), /share-card\?id=1ca112bd-f88d-4d27-92c5-e2ead474b6da$/);
  assert.match(shareCardUrl('seed-tech-01'), /share-card\?id=seed-tech-01$/);
  for (const bad of ['local-123', '', null, '../etc', 'seed-x-01/../../a']) assert.equal(hasShareCard(bad), false, String(bad));
  assert.equal(shareCardAlt({ title: 'Pizza at home' }), 'Pizza at home (meme on THE MEMES.net)');
});
