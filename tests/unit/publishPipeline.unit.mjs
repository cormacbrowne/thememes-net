// Unit tests for the publish-meme Edge Function's shared modules (Phase 33 task 33.2).
// Run: npm run test:unit   (node --test; no browser, no network, no live database)
// All images are synthetic, generated in-test by ImageMagick.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as Magick from '@imagemagick/magick-wasm';
import {
  sniffImageType,
  buildQuarantinePath,
  isOwnQuarantinePath,
  parsePublishRequest,
  sanitizeOverlay,
  fitWithin,
  dHashFromRgb,
  hammingDistanceHex,
  sha256Hex,
  decideStatus,
  PUBLISH_ERRORS
} from '../../supabase/functions/_shared/publishCore.js';
import { transcodeImage } from '../../supabase/functions/_shared/imageCodec.js';
import { moderateImage, moderateText } from '../../supabase/functions/_shared/moderation.js';

const require = createRequire(import.meta.url);
const UID = '11111111-2222-4333-8444-555555555555';
const OBJ = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const enc = new TextEncoder();
const hasBytes = (hay, needle) => Buffer.from(hay).includes(Buffer.from(needle));

before(async () => {
  const wasmPath = require.resolve('@imagemagick/magick-wasm/magick.wasm');
  await Magick.initializeImageMagick(fs.readFileSync(wasmPath));
});

function makeImage(format, width = 64, height = 48) {
  const { ImageMagick, MagickColor, MagickFormat } = Magick;
  return ImageMagick.read(new MagickColor(200, 40, 90), width, height, (img) => {
    img.quality = 90;
    return img.write(MagickFormat[format], (d) => new Uint8Array(d));
  });
}

/** Insert a fake EXIF APP1 segment containing GPS tags right after the JPEG SOI marker. */
function withFakeGpsExif(jpeg) {
  const payload = enc.encode('Exif\0\0MM\0*GPSLatitude=51.5007;GPSLongitude=-0.1246;Model=TestPhone');
  const len = payload.length + 2;
  const seg = new Uint8Array([0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...payload]);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.slice(0, 2), 0);
  out.set(seg, 2);
  out.set(jpeg.slice(2), 2 + seg.length);
  return out;
}

test('magic bytes: real types are recognised, renamed HTML is not', () => {
  assert.equal(sniffImageType(makeImage('Png')), 'png');
  assert.equal(sniffImageType(makeImage('Jpeg')), 'jpeg');
  assert.equal(sniffImageType(makeImage('WebP')), 'webp');
  assert.equal(sniffImageType(makeImage('Gif')), 'gif');
  assert.equal(sniffImageType(enc.encode('<!doctype html><script>alert(1)</script>')), null);
  assert.equal(sniffImageType(enc.encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(sniffImageType(new Uint8Array([0x89, 0x50])), null);
});

test('quarantine paths are server-chosen and scoped to the caller', () => {
  const path = buildQuarantinePath(UID, OBJ);
  assert.equal(path, `${UID}/${OBJ}`);
  assert.ok(isOwnQuarantinePath(path, UID));
  assert.ok(!isOwnQuarantinePath(path, '99999999-2222-4333-8444-555555555555'));
  assert.ok(!isOwnQuarantinePath(`${UID}/../${OBJ}`, UID));
  assert.ok(!isOwnQuarantinePath(`${UID}/${OBJ}/x`, UID));
  assert.ok(!isOwnQuarantinePath(`${UID}/evil.html`, UID));
  assert.throws(() => buildQuarantinePath('nope', OBJ));
});

test('publish request: author is never taken from the body; fields are cleaned', () => {
  const r = parsePublishRequest(
    {
      path: `${UID}/${OBJ}`,
      title: '<b>hello</b>\u0000 world',
      category: 'NOT-A-CATEGORY',
      author: 'TheMemesHQ',
      author_name: 'TheMemesHQ',
      overlay: { layers: [{ text: 'top <img src=x>', x: 1, onclick: 'bad()', nested: { a: 1 } }] },
      parentId: 'not-a-uuid'
    },
    UID
  );
  assert.ok(r.ok);
  assert.equal(r.value.title, 'bhello/b world');
  assert.equal(r.value.category, 'dank');
  assert.equal(r.value.parentId, null);
  assert.ok(!('author' in r.value) && !('author_name' in r.value));
  assert.deepEqual(r.value.overlay.layers[0], { text: 'top img src=x', x: 1 });
  assert.deepEqual(r.value.texts, ['bhello/b world', 'top img src=x']);
  assert.equal(parsePublishRequest({ path: `${'9'.repeat(8)}-2222-4333-8444-555555555555/${OBJ}` }, UID).ok, false);
});

test('overlay: oversized or malformed JSON is dropped', () => {
  assert.equal(sanitizeOverlay('{not json').overlay, null);
  assert.equal(sanitizeOverlay({ layers: [{ text: 'x'.repeat(40000) }] }).overlay, null);
  assert.equal(sanitizeOverlay({ nope: true }).overlay, null);
});

test('fitWithin caps the longest side at 1600 and never upscales', () => {
  assert.deepEqual(fitWithin(4000, 2000), { width: 1600, height: 800, scaled: true });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600, scaled: false });
});

test('dHash: identical pixels give distance 0', () => {
  const rgb = new Uint8Array(9 * 8 * 3).map((_, i) => (i * 37) % 255);
  const h = dHashFromRgb(rgb);
  assert.equal(h.length, 16);
  assert.equal(hammingDistanceHex(h, dHashFromRgb(rgb)), 0);
});

test('sha256Hex matches a known vector', async () => {
  assert.equal(
    await sha256Hex(enc.encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('decision table fails closed', () => {
  const ok = { decision: 'approve' };
  const review = { decision: 'review' };
  const reject = { decision: 'reject' };
  assert.equal(decideStatus(ok, ok), 'approved');
  assert.equal(decideStatus(ok, review), 'pending');
  assert.equal(decideStatus(review, ok), 'pending');
  assert.equal(decideStatus(ok, reject), 'rejected');
  assert.equal(decideStatus(undefined, ok), 'pending');
  assert.equal(decideStatus(null, null), 'pending');
});

test('moderation placeholders never auto-approve (fail closed until 33.3/33.4)', async () => {
  assert.equal((await moderateImage({})).decision, 'review');
  assert.equal((await moderateText({ texts: ['this is fine'] })).decision, 'review');
});

test('JPEG with GPS EXIF comes out as WebP with no EXIF/GPS', () => {
  const dirty = withFakeGpsExif(makeImage('Jpeg', 120, 90));
  assert.ok(hasBytes(dirty, 'GPSLatitude'));
  const out = transcodeImage(Magick, dirty, sniffImageType(dirty));
  assert.equal(out.contentType, 'image/webp');
  assert.equal(sniffImageType(out.data), 'webp');
  assert.ok(!hasBytes(out.data, 'GPS'));
  assert.ok(!hasBytes(out.data, 'Exif'));
  assert.ok(!hasBytes(out.data, 'TestPhone'));
  assert.equal(out.width, 120);
  assert.equal(out.phash.length, 16);
});

test('polyglot: HTML appended to a PNG does not survive re-encoding', () => {
  const png = makeImage('Png');
  const tail = enc.encode('<html><script>alert(document.cookie)</script></html>');
  const poly = new Uint8Array([...png, ...tail]);
  assert.equal(sniffImageType(poly), 'png');
  const out = transcodeImage(Magick, poly, 'png');
  assert.ok(!hasBytes(out.data, '<script'));
});

test('large stills are scaled down to 1600 px', () => {
  const out = transcodeImage(Magick, makeImage('Png', 3200, 1000), 'png');
  assert.equal(out.width, 1600);
  assert.equal(out.height, 500);
});

test('GIF is re-written as GIF with a WebP poster', () => {
  const out = transcodeImage(Magick, makeImage('Gif', 40, 30), 'gif');
  assert.equal(out.kind, 'gif');
  assert.equal(sniffImageType(out.data), 'gif');
  assert.equal(sniffImageType(out.poster.data), 'webp');
});

test('garbage behind valid magic bytes is rejected, not passed through', () => {
  const fake = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...enc.encode('not really a png at all')]);
  assert.throws(() => transcodeImage(Magick, fake, 'png'), (e) => e.code === PUBLISH_ERRORS.UNDECODABLE);
  assert.throws(() => transcodeImage(Magick, fake, 'svg'), (e) => e.code === PUBLISH_ERRORS.UNSUPPORTED);
});
