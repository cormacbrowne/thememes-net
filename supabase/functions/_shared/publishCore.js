// ==========================================
// Phase 33 task 33.2 — pure helpers for the `publish-meme` Edge Function.
// No Deno / Node / browser APIs here (only Web-standard ones), so the same file runs in the
// Supabase Edge runtime and in `npm run test:unit` (node --test).
// ==========================================

export const PUBLISH_LIMITS = {
  /** Largest file accepted into the quarantine bucket (matches the bucket's file_size_limit). */
  MAX_UPLOAD_BYTES: 15 * 1024 * 1024,
  /** Stills (and GIF frames) are scaled down so the longest side is at most this. */
  MAX_DIM: 1600,
  /** Refuse to even decode absurd canvases (decompression bombs). */
  MAX_SOURCE_PIXELS: 40_000_000,
  TITLE_MAX: 140,
  CATEGORY_MAX: 32,
  OVERLAY_MAX_BYTES: 32 * 1024,
  OVERLAY_MAX_LAYERS: 24,
  LAYER_TEXT_MAX: 280
};

export const QUARANTINE_BUCKET = 'quarantine';
export const PUBLIC_BUCKET = 'memes';
export const ALLOWED_CATEGORIES = new Set(['dank', 'relatable', 'gaming', 'tech', 'shitpost', 'wholesome', 'retro', 'animals', 'sports', 'random']);

/**
 * Identify a file by its first bytes (never trust the name or the browser's MIME type).
 * Returns 'png' | 'jpeg' | 'webp' | 'gif' | null.
 */
export function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return 'png';
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  // "RIFF" .... "WEBP"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'webp';
  }
  // "GIF87a" / "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) {
    return 'gif';
  }
  return null;
}

/**
 * Quarantine object paths are always `<auth uid>/<uuid>`; the server chooses them in
 * `sign-upload`, and `publish` only accepts a path inside the caller's own folder.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function buildQuarantinePath(userId, objectId) {
  if (!isUuid(userId) || !isUuid(objectId)) throw new Error('bad_ids');
  return `${userId.toLowerCase()}/${objectId.toLowerCase()}`;
}

export function isOwnQuarantinePath(path, userId) {
  if (typeof path !== 'string' || !isUuid(userId)) return false;
  const parts = path.split('/');
  return parts.length === 2 && parts[0] === userId.toLowerCase() && isUuid(parts[1]);
}

// Control characters, zero-width and bidi-override characters (built from code points so the
// source file contains no invisible characters).
const INVISIBLE_CHARS_RE = new RegExp(
  `[${[[0x00, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069]]
    .map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
    .join('')}]`,
  'g'
);

/** Strip control characters / angle brackets and clamp length (server copy of sanitizeUserText). */
export function cleanText(value, maxLen) {
  return String(value ?? '')
    .replace(INVISIBLE_CHARS_RE, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

const SAFE_LAYER_KEYS = new Set([
  'id', 'type', 'text', 'x', 'y', 'w', 'h', 'width', 'height', 'rotation', 'scale', 'size', 'fontSize',
  'font', 'fontFamily', 'color', 'fill', 'stroke', 'strokeColor', 'strokeWidth', 'align', 'bold', 'italic',
  'uppercase', 'opacity', 'emoji', 'sticker', 'shadow', 'bg', 'background', 'lineHeight', 'letterSpacing',
  'start', 'end', 'anim', 'animation', 'z'
]);

/**
 * Overlay JSON from the request body. Only primitive values on known keys survive; every text
 * value is cleaned. Returns { overlay, texts } — `texts` (title is added by the caller) is what
 * text moderation (task 33.4) checks.
 */
export function sanitizeOverlay(raw) {
  if (raw == null) return { overlay: null, texts: [] };
  let json;
  try {
    json = typeof raw === 'string' ? raw : JSON.stringify(raw);
  } catch {
    return { overlay: null, texts: [] };
  }
  if (!json || json.length > PUBLISH_LIMITS.OVERLAY_MAX_BYTES) return { overlay: null, texts: [] };
  let obj;
  try {
    obj = JSON.parse(json);
  } catch {
    return { overlay: null, texts: [] };
  }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.layers)) return { overlay: null, texts: [] };
  const texts = [];
  const layers = obj.layers.slice(0, PUBLISH_LIMITS.OVERLAY_MAX_LAYERS).map((layer) => {
    const out = {};
    if (!layer || typeof layer !== 'object') return out;
    for (const [k, v] of Object.entries(layer)) {
      if (!SAFE_LAYER_KEYS.has(k)) continue;
      if (typeof v === 'string') {
        const clean = cleanText(v, PUBLISH_LIMITS.LAYER_TEXT_MAX);
        out[k] = clean;
        if ((k === 'text' || k === 'emoji') && clean) texts.push(clean);
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        out[k] = v;
      } else if (typeof v === 'boolean') {
        out[k] = v;
      }
    }
    return out;
  });
  return { overlay: { v: 1, burned: Boolean(obj.burned), layers }, texts };
}

/** Validate the JSON body of a `publish` call. Returns { ok, error?, value? }. */
export function parsePublishRequest(body, userId) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'bad_request' };
  if (!isOwnQuarantinePath(body.path, userId)) return { ok: false, error: 'bad_path' };
  if (body.basePath != null && !isOwnQuarantinePath(body.basePath, userId)) return { ok: false, error: 'bad_path' };
  if (body.basePath && body.basePath === body.path) return { ok: false, error: 'bad_path' };
  const title = cleanText(body.title, PUBLISH_LIMITS.TITLE_MAX) || 'Untitled Meme';
  const rawCategory = cleanText(body.category, PUBLISH_LIMITS.CATEGORY_MAX).toLowerCase();
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'dank';
  const { overlay, texts } = sanitizeOverlay(body.overlay);
  const parentId = isUuid(body.parentId) ? body.parentId.toLowerCase() : null;
  const rootId = isUuid(body.rootId) ? body.rootId.toLowerCase() : parentId;
  return {
    ok: true,
    value: {
      path: body.path,
      basePath: body.basePath || null,
      title,
      category,
      overlay,
      texts: [title, ...texts],
      parentId,
      rootId
    }
  };
}

/** Longest side capped at maxDim, aspect ratio kept, never upscaled. */
export function fitWithin(width, height, maxDim = PUBLISH_LIMITS.MAX_DIM) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scaled: scale < 1 };
}

/**
 * 64-bit difference hash (dHash) from a 9×8 RGB byte array (row-major, 3 bytes/pixel).
 * Returns 16 hex chars. Near-identical images give hashes with a small Hamming distance.
 */
export function dHashFromRgb(rgb, width = 9, height = 8) {
  if (!rgb || rgb.length < width * height * 3) throw new Error('bad_pixels');
  const gray = new Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    gray[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  }
  let bits = '';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      bits += gray[y * width + x] > gray[y * width + x + 1] ? '1' : '0';
    }
  }
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hammingDistanceHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Combine the image (33.3) and text (33.4) verdicts into a meme status.
 * Fail closed: anything other than two clear passes is never 'approved'.
 */
export function decideStatus(imageVerdict, textVerdict) {
  const verdicts = [imageVerdict, textVerdict];
  if (verdicts.some((v) => v?.decision === 'reject')) return 'rejected';
  if (verdicts.every((v) => v?.decision === 'approve')) return 'approved';
  return 'pending';
}

/** Error codes the function returns (and the browser maps to friendly copy). */
export const PUBLISH_ERRORS = {
  SIGN_IN_REQUIRED: 'sign_in_required',
  BAD_REQUEST: 'bad_request',
  BAD_PATH: 'bad_path',
  NOT_FOUND: 'upload_not_found',
  TOO_LARGE: 'too_large',
  UNSUPPORTED: 'unsupported_type',
  UNDECODABLE: 'undecodable',
  TOO_MANY_PIXELS: 'too_many_pixels',
  REJECTED: 'rejected',
  SERVER: 'server_error'
};
