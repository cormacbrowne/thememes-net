// Unit tests for Phase 33 task 33.9 — Video upload pause + tighter GIF policy (<= 8 MB, <= 10 s, <= 300 frames).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as Magick from '@imagemagick/magick-wasm';
import {
  PUBLISH_LIMITS,
  PUBLISH_ERRORS,
  isVideoBytes,
  inspectGif,
  sniffImageType
} from '../../supabase/functions/_shared/publishCore.js';
import { transcodeImage } from '../../supabase/functions/_shared/imageCodec.js';
import {
  ACCEPT_MEDIA,
  MEDIA_LIMITS,
  VIDEO_PAUSED_ERROR,
  validateFile
} from '../../src/utils/mediaPipeline.js';
import { PUBLISH_ERROR_MESSAGES } from '../../src/utils/publishMeme.js';

const require = createRequire(import.meta.url);

before(async () => {
  const wasmPath = require.resolve('@imagemagick/magick-wasm/magick.wasm');
  await Magick.initializeImageMagick(fs.readFileSync(wasmPath));
});

/** Build a valid minimal synthetic GIF89a with N frames and a given per-frame delay in centiseconds. */
function makeSyntheticGif({ frames = 2, delayCs = 10, comment = '' } = {}) {
  const out = [];
  // Header: GIF89a + LSD (1x1, no global color table)
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
  out.push(1, 0, 1, 0, 0x00, 0, 0);
  if (comment) {
    const c = Buffer.from(comment, 'utf8');
    out.push(0x21, 0xfe, c.length, ...c, 0x00);
  }
  const dLo = delayCs & 0xff;
  const dHi = (delayCs >> 8) & 0xff;
  for (let i = 0; i < frames; i += 1) {
    // Graphic Control Extension (delay in 1/100 s)
    out.push(0x21, 0xf9, 0x04, 0x00, dLo, dHi, 0x00, 0x00);
    // Image Descriptor (1x1 with local 2-color table: 0x80)
    out.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x80);
    // 2-entry local color table (6 bytes)
    out.push(0, 0, 0, 255, 255, 255);
    // LZW min code size 2 + 1 data sub-block + block terminator
    out.push(0x02, 0x02, 0x44, 0x01, 0x00);
  }
  out.push(0x3b); // Trailer
  return new Uint8Array(out);
}

test('33.9 + 36.V: ACCEPT_MEDIA takes videos again (owner-approved), GIF limits stay tight', () => {
  assert.match(ACCEPT_MEDIA, /video\/mp4/i);
  assert.match(ACCEPT_MEDIA, /\.mov\b/i);
  assert.match(ACCEPT_MEDIA, /image\/gif/);
  assert.equal(MEDIA_LIMITS.GIF_MAX_BYTES, 8 * 1024 * 1024);
  assert.equal(MEDIA_LIMITS.GIF_MAX_SEC, 10);
  assert.equal(MEDIA_LIMITS.GIF_MAX_FRAMES, 300);
  assert.match(PUBLISH_ERROR_MESSAGES.video_paused, /coming back soon/i);
  assert.equal(VIDEO_PAUSED_ERROR, PUBLISH_ERROR_MESSAGES.video_paused);
});

test('33.9: isVideoBytes detects MP4 ftyp, WebM EBML, and AVI headers', () => {
  const mp4 = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x00, 0x00, 0x00]);
  const avi = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]);
  const gif = makeSyntheticGif({ frames: 1 });
  assert.equal(isVideoBytes(mp4), true);
  assert.equal(isVideoBytes(webm), true);
  assert.equal(isVideoBytes(avi), true);
  assert.equal(isVideoBytes(gif), false);
});

test('33.9: inspectGif enforces frame count and duration calculations', () => {
  const shortGif = makeSyntheticGif({ frames: 10, delayCs: 10 });
  assert.deepEqual(inspectGif(shortGif), { valid: true, frames: 10, durationSec: 1 });

  const tooLongDuration = makeSyntheticGif({ frames: 25, delayCs: 50 }); // 12.5s
  const durInfo = inspectGif(tooLongDuration);
  assert.equal(durInfo.valid, true);
  assert.equal(durInfo.frames, 25);
  assert.ok(durInfo.durationSec > PUBLISH_LIMITS.MAX_GIF_SEC);

  const tooManyFrames = makeSyntheticGif({ frames: 301, delayCs: 2 });
  const frameInfo = inspectGif(tooManyFrames);
  assert.equal(frameInfo.valid, true);
  assert.ok(frameInfo.frames > PUBLISH_LIMITS.MAX_GIF_FRAMES);
});

test('33.9: transcodeImage strips GIF metadata and rejects >8MB, >10s, and >300 frame GIFs', () => {
  const cleanSrc = makeSyntheticGif({ frames: 3, delayCs: 10, comment: 'SECRET_EXIF_GPS' });
  assert.equal(sniffImageType(cleanSrc), 'gif');
  const out = transcodeImage(Magick, cleanSrc, 'gif');
  assert.equal(out.kind, 'gif');
  assert.equal(out.frames, 3);
  assert.equal(out.samples.length, 3);
  assert.equal(Buffer.from(out.data).includes(Buffer.from('SECRET_EXIF_GPS')), false);

  const oversized = new Uint8Array(PUBLISH_LIMITS.MAX_GIF_BYTES + 1);
  oversized.set(cleanSrc, 0);
  assert.throws(
    () => transcodeImage(Magick, oversized, 'gif'),
    (e) => e.code === PUBLISH_ERRORS.GIF_TOO_LARGE
  );

  const longGif = makeSyntheticGif({ frames: 11, delayCs: 100 }); // 11s
  assert.throws(
    () => transcodeImage(Magick, longGif, 'gif'),
    (e) => e.code === PUBLISH_ERRORS.GIF_TOO_LONG
  );

  const manyFramesGif = makeSyntheticGif({ frames: 301, delayCs: 2 });
  assert.throws(
    () => transcodeImage(Magick, manyFramesGif, 'gif'),
    (e) => e.code === PUBLISH_ERRORS.GIF_TOO_LONG
  );
});

test('33.9 + 36.V: validateFile routes disguised video bytes to the video path, refuses >8MB / >10s GIFs', async () => {
  // Node has no <video> element, so a video can never be probed here: it is refused as
  // unreadable and, importantly, is never treated as a GIF.
  const disguisedVideo = new File(
    [new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0, 0, 0, 0])],
    'fake.gif',
    { type: 'image/gif' }
  );
  const disguisedRes = await validateFile(disguisedVideo);
  assert.equal(disguisedRes.ok, false);
  assert.equal(disguisedRes.kind, 'video');

  const bigGif = new File([new Uint8Array(8 * 1024 * 1024 + 512)], 'huge.gif', { type: 'image/gif' });
  const bigRes = await validateFile(bigGif);
  assert.equal(bigRes.ok, false);
  assert.match(bigRes.error, /8MB/i);

  const longGif = new File([makeSyntheticGif({ frames: 12, delayCs: 100 })], 'long.gif', { type: 'image/gif' });
  const longRes = await validateFile(longGif);
  assert.equal(longRes.ok, false);
  assert.match(longRes.error, /10 seconds/i);
});
