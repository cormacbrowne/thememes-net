// ==========================================
// Phase 36.V Stage 1 — server-side checks for video memes (pure JS, no decoding).
// Edge Functions have 2 s CPU / 256 MB, so we never decode or transcode video here. Instead:
//   • accept only MP4 (ISO BMFF) and WebM, by magic bytes;
//   • MP4: walk the box tree, require exactly ≤1 video + ≤1 audio track (no timed-metadata
//     tracks, which is where phones keep location), read the duration, and NEUTRALISE every
//     metadata box (udta / meta / uuid / XMP) by renaming it to `free` and zeroing its payload.
//     Same-size rewrite, so sample offsets (stco/co64) stay valid and the file still plays;
//   • WebM: refuse files carrying a Tags element before the first Cluster or near the end.
// The browser already re-records every clip (forgeEngine.prepareVideoForUpload), so honest
// uploads have no metadata at all; this is the server-side guarantee for dishonest ones.
// Frames for moderation come from the browser and are NOT trusted, so every video is held
// `pending` for a moderator in Stage 1 (see publish-meme).
// ==========================================

export const VIDEO_LIMITS = {
  MAX_BYTES: 25 * 1024 * 1024,
  MAX_SEC: 30,
  /** Moderation frames sent by the browser (first frame doubles as the poster). */
  MAX_FRAMES: 16,
  MAX_DIM: 4096
};

export const VIDEO_ERRORS = {
  UNSUPPORTED: 'unsupported_type',
  TOO_LARGE: 'video_too_large',
  TOO_LONG: 'video_too_long',
  BAD_TRACKS: 'video_tracks',
  METADATA: 'video_metadata',
  UNDECODABLE: 'undecodable'
};

const FOURCC = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
const u32 = (b, o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u64 = (b, o) => u32(b, o) * 4294967296 + u32(b, o + 4);

/** 'mp4' | 'webm' | null */
export function sniffVideoType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (FOURCC(bytes, 4) === 'ftyp') return 'mp4';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    const head = String.fromCharCode(...bytes.subarray(0, Math.min(64, bytes.length)));
    return head.includes('webm') ? 'webm' : null;
  }
  return null;
}

// Boxes we descend into, and boxes we blank out wherever they appear.
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'edts', 'mvex', 'moof', 'traf', 'dinf']);
const STRIP = new Set(['udta', 'meta', 'uuid', 'XMP_', 'ilst', 'keys']);

function readBoxes(b, start, end, visit, depth = 0, parent = '') {
  let p = start;
  while (p + 8 <= end) {
    let size = u32(b, p);
    const type = FOURCC(b, p + 4);
    let header = 8;
    if (size === 1) {
      if (p + 16 > end) throw new Error('trunc');
      size = u64(b, p + 8);
      header = 16;
    } else if (size === 0) {
      size = end - p;
    }
    if (size < header || p + size > end) throw new Error('trunc');
    visit({ type, start: p, header, end: p + size, depth, parent });
    if (CONTAINERS.has(type) && depth < 8) readBoxes(b, p + header, p + size, visit, depth + 1, type);
    p += size;
  }
}

function inspectMp4(input) {
  const b = new Uint8Array(input); // copy: we rewrite in place
  const tracks = { video: 0, audio: 0, other: [] };
  let hasMoov = false;
  let hasMedia = false;
  let timescale = 0;
  let duration = 0;
  let fragDuration = 0;
  let stripped = 0;
  const toStrip = [];
  try {
    readBoxes(b, 0, b.length, (box) => {
      const { type, start, header, end, parent } = box;
      const payload = start + header;
      if (type === 'moov') hasMoov = true;
      if (type === 'mdat' || type === 'moof') hasMedia = true;
      if (STRIP.has(type)) toStrip.push(box);
      if (type === 'mvhd') {
        const v = b[payload];
        if (v === 1) {
          timescale = u32(b, payload + 20);
          duration = u64(b, payload + 24);
          b.fill(0, payload + 4, payload + 20); // creation + modification time
        } else {
          timescale = u32(b, payload + 12);
          duration = u32(b, payload + 16);
          b.fill(0, payload + 4, payload + 12);
        }
      }
      if (type === 'mehd') {
        fragDuration = b[payload] === 1 ? u64(b, payload + 4) : u32(b, payload + 4);
      }
      if (type === 'hdlr' && parent === 'mdia' && end - payload >= 12) {
        // A track's media handler. `meta` boxes (and their own hdlr) are blanked anyway.
        const handler = FOURCC(b, payload + 8);
        if (handler === 'vide') tracks.video += 1;
        else if (handler === 'soun') tracks.audio += 1;
        else tracks.other.push(handler);
      }
    });
  } catch {
    return { ok: false, error: VIDEO_ERRORS.UNDECODABLE };
  }
  if (!hasMoov || !hasMedia || tracks.video < 1) return { ok: false, error: VIDEO_ERRORS.UNDECODABLE };
  if (tracks.video > 1 || tracks.audio > 1 || tracks.other.length) {
    return { ok: false, error: VIDEO_ERRORS.BAD_TRACKS, tracks };
  }
  for (const box of toStrip) {
    // Rename to `free` and zero the payload: same size, so every offset in the file stays valid.
    b[box.start + 4] = 0x66; // f
    b[box.start + 5] = 0x72; // r
    b[box.start + 6] = 0x65; // e
    b[box.start + 7] = 0x65; // e
    b.fill(0, box.start + box.header, box.end);
    stripped += 1;
  }
  const units = duration || fragDuration;
  const durationSec = timescale > 0 && units > 0 ? units / timescale : null;
  return { ok: true, container: 'mp4', durationSec, tracks, stripped, cleaned: b };
}

const EBML_TAGS = [0x12, 0x54, 0xc3, 0x67];
const EBML_CLUSTER = [0x1f, 0x43, 0xb6, 0x75];

function indexOfSeq(b, seq, from = 0, to = b.length) {
  outer: for (let i = from; i <= to - seq.length; i += 1) {
    for (let j = 0; j < seq.length; j += 1) if (b[i + j] !== seq[j]) continue outer;
    return i;
  }
  return -1;
}

function inspectWebm(input) {
  const b = new Uint8Array(input);
  const firstCluster = indexOfSeq(b, EBML_CLUSTER);
  if (firstCluster < 0) return { ok: false, error: VIDEO_ERRORS.UNDECODABLE };
  const tailStart = Math.max(firstCluster, b.length - 65536);
  if (indexOfSeq(b, EBML_TAGS, 0, firstCluster) >= 0 || indexOfSeq(b, EBML_TAGS, tailStart) >= 0) {
    return { ok: false, error: VIDEO_ERRORS.METADATA };
  }
  return { ok: true, container: 'webm', durationSec: null, tracks: null, stripped: 0, cleaned: b };
}

/**
 * inspectAndCleanVideo(bytes) → { ok:true, container, durationSec|null, cleaned, stripped }
 *                             | { ok:false, error }
 */
export function inspectAndCleanVideo(bytes) {
  if (!bytes || !bytes.length) return { ok: false, error: VIDEO_ERRORS.UNDECODABLE };
  if (bytes.length > VIDEO_LIMITS.MAX_BYTES) return { ok: false, error: VIDEO_ERRORS.TOO_LARGE };
  const type = sniffVideoType(bytes);
  if (!type) return { ok: false, error: VIDEO_ERRORS.UNSUPPORTED };
  const res = type === 'mp4' ? inspectMp4(bytes) : inspectWebm(bytes);
  if (res.ok && res.durationSec != null && res.durationSec > VIDEO_LIMITS.MAX_SEC + 0.75) {
    return { ok: false, error: VIDEO_ERRORS.TOO_LONG, durationSec: res.durationSec };
  }
  return res;
}
