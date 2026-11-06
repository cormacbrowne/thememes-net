// ==========================================
// PHASE 26 & 27: MEDIA PIPELINE (validate / security-firewall / probe / poster / compress / upload)
// Videos + GIFs are NEVER re-encoded through canvas. Stills become WebP/JPEG.
// ==========================================
import { verifySafeMediaFile, sanitizeMediaUrl } from './securityGuard';

export const MEDIA_LIMITS = {
  IMAGE_MAX_BYTES: 15 * 1024 * 1024,
  VIDEO_MAX_BYTES: 50 * 1024 * 1024,
  VIDEO_MAX_SEC: 60,
  STILL_MAX_DIM: 1600
};

export const ACCEPT_MEDIA =
  'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.png,.jpg,.jpeg,.webp,.gif,.mov,.mp4,.webm';

export const VIDEO_TIP = '💡 For best results, upload MP4 — iPhone .mov (HEVC) may not play on Chrome/Android.';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/** 'image' | 'gif' | 'video' | null */
export function getMediaKind(file) {
  if (!file) return null;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  // Security hardening: never accept SVG or HTML files as media
  if (type.includes('svg') || type.includes('html') || /\.(svg|svgz|html|htm|xhtml|xml)$/i.test(name)) {
    return null;
  }
  if (type === 'image/gif' || name.endsWith('.gif')) return 'gif';
  if (type.startsWith('image/')) return 'image';
  if (VIDEO_TYPES.includes(type) || /\.(mp4|webm|mov)$/.test(name)) return 'video';
  if (type.startsWith('video/')) return 'video';
  return null;
}

export function guessContentType(file, kind) {
  if (file?.type) return file.type;
  const name = (file?.name || '').toLowerCase();
  if (kind === 'gif') return 'image/gif';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  if (kind === 'video') return 'video/mp4';
  return 'image/jpeg';
}

function loadVideoMeta(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    const done = (fn, arg) => {
      fn(arg);
    };
    v.onloadedmetadata = () =>
      done(resolve, { video: v, url, width: v.videoWidth, height: v.videoHeight, duration: v.duration });
    v.onerror = () => {
      URL.revokeObjectURL(url);
      done(reject, new Error('decode'));
    };
    v.src = url;
  });
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });
}

/** Probe type/width/height/duration. */
export async function probeMedia(file) {
  const kind = getMediaKind(file);
  if (kind === 'video') {
    try {
      const meta = await loadVideoMeta(file);
      URL.revokeObjectURL(meta.url);
      return { kind, width: meta.width || 0, height: meta.height || 0, duration: meta.duration || 0, playable: true };
    } catch {
      // HEVC .mov on Chrome: metadata may fail; still allow upload with unknown dims
      return { kind, width: 0, height: 0, duration: 0, playable: false };
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    return { kind, width: img.naturalWidth, height: img.naturalHeight, duration: 0, playable: true };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Returns { ok, kind, error, tip, probe } with friendly errors. */
export async function validateFile(file) {
  const securityCheck = await verifySafeMediaFile(file);
  if (!securityCheck.safe) {
    return { ok: false, error: securityCheck.reason };
  }
  const kind = getMediaKind(file);
  if (!kind) {
    return { ok: false, error: '⚠️ Unsupported file. Use PNG, JPG, WebP, GIF, MP4, WebM or MOV.' };
  }
  if (kind !== 'video' && file.size > MEDIA_LIMITS.IMAGE_MAX_BYTES) {
    return { ok: false, kind, error: '⚠️ Images & GIFs must be under 15MB.' };
  }
  if (kind === 'video' && file.size > MEDIA_LIMITS.VIDEO_MAX_BYTES) {
    return { ok: false, kind, error: '⚠️ Videos must be under 50MB.' };
  }
  let probe;
  try {
    probe = await probeMedia(file);
  } catch {
    return { ok: false, kind, error: '⚠️ Could not read that file. Try PNG, JPG, GIF, or MP4.' };
  }
  if (kind === 'video' && probe.duration > MEDIA_LIMITS.VIDEO_MAX_SEC + 0.5) {
    return { ok: false, kind, error: `⚠️ Videos must be 60 seconds or less (yours is ${Math.round(probe.duration)}s).` };
  }
  const isMov = /quicktime/.test(file.type) || /\.mov$/i.test(file.name || '');
  return { ok: true, kind, probe, tip: kind === 'video' && (isMov || !probe.playable) ? VIDEO_TIP : '' };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/** WebP 0.85 with JPEG fallback. */
export async function canvasToCompressedBlob(canvas, quality = 0.85) {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  return canvasToBlob(canvas, 'image/jpeg', 0.88);
}

/** Compress any still image (File/Blob/HTMLImageElement/canvas) to WebP/JPEG, max 1600px. */
export async function compressImage(source, maxDim = MEDIA_LIMITS.STILL_MAX_DIM) {
  let el = source;
  let tmpUrl = null;
  if (source instanceof Blob) {
    tmpUrl = URL.createObjectURL(source);
    el = await loadImageEl(tmpUrl);
  }
  const w = el.naturalWidth || el.videoWidth || el.width;
  const h = el.naturalHeight || el.videoHeight || el.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
  if (tmpUrl) URL.revokeObjectURL(tmpUrl);
  return canvasToCompressedBlob(c);
}

/** Poster JPEG: video frame at ~0.5s, or the first GIF frame. */
export async function makePoster(file, kind = getMediaKind(file)) {
  const draw = async (el, w, h) => {
    const scale = Math.min(1, 960 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    c.getContext('2d').drawImage(el, 0, 0, c.width, c.height);
    return canvasToBlob(c, 'image/jpeg', 0.82);
  };
  if (kind === 'video') {
    try {
      const meta = await loadVideoMeta(file);
      const v = meta.video;
      await new Promise((resolve) => {
        const t = Math.min(0.5, (meta.duration || 1) / 2);
        const timer = setTimeout(resolve, 2500);
        v.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        v.currentTime = t;
      });
      const blob = await draw(v, meta.width || 640, meta.height || 360);
      URL.revokeObjectURL(meta.url);
      return blob;
    } catch {
      return null;
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    return await draw(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload to the public 'memes' bucket. Returns public URL or throws. */
export async function uploadToStorage(client, blob, path, contentType) {
  const { error } = await client.storage
    .from('memes')
    .upload(path, blob, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  const { data } = client.storage.from('memes').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('No public URL');
  return data.publicUrl;
}

export function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extFor(contentType) {
  const map = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  };
  return map[contentType] || 'bin';
}

/** Thumbnail-safe still URL for legacy <img> spots. */
export function getMemeThumb(meme) {
  if (!meme) return '';
  if (meme.media_type === 'video') return sanitizeMediaUrl(meme.poster_url || '');
  return sanitizeMediaUrl(meme.image_url || meme.poster_url || '');
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
