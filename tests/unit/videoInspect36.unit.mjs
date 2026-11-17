// Unit tests for Phase 36.V Stage 1 — server-side video checks (supabase/functions/_shared/videoInspect.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectAndCleanVideo,
  sniffVideoType,
  VIDEO_ERRORS,
  VIDEO_LIMITS
} from '../../supabase/functions/_shared/videoInspect.js';
import { parsePublishRequest } from '../../supabase/functions/_shared/publishCore.js';

const enc = (s) => Buffer.from(s, 'latin1');
function box(type, ...children) {
  const body = Buffer.concat(children.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))));
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + body.length, 0);
  enc(type).copy(head, 4);
  return Buffer.concat([head, body]);
}
function mvhd({ timescale = 1000, duration = 5000 } = {}) {
  const p = Buffer.alloc(100);
  p.writeUInt32BE(0x5f5e1000, 4); // creation time (should be zeroed)
  p.writeUInt32BE(timescale, 12);
  p.writeUInt32BE(duration, 16);
  return box('mvhd', p);
}
function hdlr(handler) {
  const p = Buffer.alloc(24);
  enc(handler).copy(p, 8);
  return box('hdlr', p);
}
const trak = (handler) => box('trak', box('mdia', hdlr(handler), box('minf', hdlr('alis'))));
const GPS = '+51.5072-000.1276/';
function mp4({ tracks = ['vide', 'soun'], duration = 5000, withGps = false } = {}) {
  const ftyp = box('ftyp', enc('isom'), Buffer.alloc(4), enc('isomiso2mp41'));
  const kids = [mvhd({ duration }), ...tracks.map(trak)];
  if (withGps) kids.push(box('udta', box('©xyz', enc(GPS))));
  const moov = box('moov', ...kids);
  const mdat = box('mdat', Buffer.alloc(64, 7));
  return new Uint8Array(Buffer.concat([ftyp, moov, mdat]));
}

test('36.V: sniffVideoType accepts MP4 and WebM only', () => {
  assert.equal(sniffVideoType(mp4()), 'mp4');
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, ...enc('B\u0082\u0084webm'), 0, 0]);
  assert.equal(sniffVideoType(webm), 'webm');
  const avi = new Uint8Array([...enc('RIFF'), 0, 0, 0, 0, ...enc('AVI ')]);
  assert.equal(sniffVideoType(avi), null);
});

test('36.V: a clean MP4 passes with its duration and creation time wiped', () => {
  const src = mp4();
  const res = inspectAndCleanVideo(src);
  assert.equal(res.ok, true);
  assert.equal(res.container, 'mp4');
  assert.equal(res.durationSec, 5);
  assert.equal(res.cleaned.length, src.length);
  assert.equal(Buffer.from(res.cleaned).includes(Buffer.from([0x5f, 0x5e, 0x10, 0x00])), false);
});

test('36.V: GPS / udta metadata is neutralised in place (same size, offsets intact)', () => {
  const src = mp4({ withGps: true });
  assert.equal(Buffer.from(src).includes(enc(GPS)), true);
  const res = inspectAndCleanVideo(src);
  assert.equal(res.ok, true);
  assert.equal(res.stripped, 1);
  assert.equal(res.cleaned.length, src.length);
  assert.equal(Buffer.from(res.cleaned).includes(enc(GPS)), false);
  assert.equal(Buffer.from(res.cleaned).includes(enc('udta')), false);
  // mdat still where it was
  assert.equal(Buffer.from(res.cleaned).indexOf(enc('mdat')), Buffer.from(src).indexOf(enc('mdat')));
});

test('36.V: timed-metadata tracks, two video tracks, or no video track are refused', () => {
  assert.equal(inspectAndCleanVideo(mp4({ tracks: ['vide', 'soun', 'meta'] })).error, VIDEO_ERRORS.BAD_TRACKS);
  assert.equal(inspectAndCleanVideo(mp4({ tracks: ['vide', 'vide'] })).error, VIDEO_ERRORS.BAD_TRACKS);
  assert.equal(inspectAndCleanVideo(mp4({ tracks: ['soun'] })).error, VIDEO_ERRORS.UNDECODABLE);
});

test('36.V: over 30 s, over 25 MB and truncated files are refused', () => {
  assert.equal(inspectAndCleanVideo(mp4({ duration: 45000 })).error, VIDEO_ERRORS.TOO_LONG);
  const big = new Uint8Array(VIDEO_LIMITS.MAX_BYTES + 1);
  big.set(mp4(), 0);
  assert.equal(inspectAndCleanVideo(big).error, VIDEO_ERRORS.TOO_LARGE);
  const full = mp4();
  assert.equal(inspectAndCleanVideo(full.subarray(0, full.length - 20)).error, VIDEO_ERRORS.UNDECODABLE);
});

test('36.V: WebM with a Tags element is refused, without one passes', () => {
  const head = [0x1a, 0x45, 0xdf, 0xa3, 0x9f, ...enc('B\u0082\u0084webm')];
  const cluster = [0x1f, 0x43, 0xb6, 0x75, 0x80, 1, 2, 3];
  assert.equal(inspectAndCleanVideo(new Uint8Array([...head, ...cluster])).ok, true);
  const tagged = new Uint8Array([...head, 0x12, 0x54, 0xc3, 0x67, 0x81, 0x00, ...cluster]);
  assert.equal(inspectAndCleanVideo(tagged).error, VIDEO_ERRORS.METADATA);
});

test('36.V: parsePublishRequest accepts video publish bodies with own frame paths only', () => {
  const uid = '11111111-2222-3333-4444-555555555555';
  const p = (n) => `${uid}/0000000${n}-0000-4000-8000-000000000000`;
  const ok = parsePublishRequest(
    { kind: 'video', path: p(1), framePaths: [p(2), p(3)], durationSec: 12.4, width: 720, height: 1280 },
    uid
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.value.kind, 'video');
  assert.deepEqual(ok.value.framePaths, [p(2), p(3)]);
  assert.equal(ok.value.durationSec, 12.4);
  const foreign = parsePublishRequest(
    { kind: 'video', path: p(1), framePaths: ['99999999-2222-3333-4444-555555555555/a'] },
    uid
  );
  assert.equal(foreign.ok, false);
  const none = parsePublishRequest({ kind: 'video', path: p(1), framePaths: [] }, uid);
  assert.equal(none.ok, false);
});
