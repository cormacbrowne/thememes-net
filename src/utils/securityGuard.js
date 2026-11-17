// ==========================================
// PHASE 27: CYBER-SECURITY & THREAT HARDENING GUARD
// Protects against XSS, SVG/Script polyglot uploads, Prototype Pollution,
// Open Redirects, Bidi-spoofing, and unsafe URI schemes (javascript:/data:text/html).
// ==========================================

const SAFE_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const BIDI_SPOOF_RE = /[\u202A-\u202E\u2066-\u2069]/g;
const DANGEROUS_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DEFAULT_SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const SITE_ORIGINS = new Set(['https://www.thememes.net', 'https://thememes.net']);

function resolveStoragePrefix() {
  const configured =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    globalThis?.process?.env?.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const origin = String(configured || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  return `${origin}/storage/v1/object/public/memes/`;
}

export const OWN_MEDIA_STORAGE_PREFIX = resolveStoragePrefix();

/**
 * Returns true if rawUrl points strictly to our own Supabase public `memes` bucket,
 * our bundled `/seed/` assets (relative or same-origin), a local `blob:`, or safe raster `data:image/`.
 */
export function isAllowedMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('..') || /\s/.test(trimmed)) return false;

  if (trimmed.startsWith('/seed/') && trimmed.length > '/seed/'.length) {
    return true;
  }
  if (trimmed.startsWith('blob:')) {
    return true;
  }
  if (trimmed.slice(0, 5).toLowerCase() === 'data:') {
    return SAFE_DATA_IMAGE_RE.test(trimmed);
  }
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net';
    const parsed = new URL(trimmed, base);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.href.startsWith(OWN_MEDIA_STORAGE_PREFIX)) {
      return parsed.href.length > OWN_MEDIA_STORAGE_PREFIX.length;
    }
    const isSameHost =
      SITE_ORIGINS.has(parsed.origin) ||
      (typeof window !== 'undefined' && parsed.origin === window.location.origin);
    return isSameHost && parsed.pathname.startsWith('/seed/') && parsed.pathname.length > '/seed/'.length;
  } catch {
    return false;
  }
}

function stripControlChars(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Keep standard printable chars, tabs (9), newlines (10, 13), and valid Unicode
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      out += str[i];
    }
  }
  return out;
}

/**
 * Sanitizes any user-supplied or database-sourced media URL.
 * Only permits `/seed/` assets, our own Supabase public `memes` bucket, local `blob:` URLs,
 * and safe raster `data:image/` URLs. Blocks external origins and `javascript:`/`data:image/svg+xml`.
 */
export function sanitizeMediaUrl(rawUrl, fallback = '') {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;
  if (!isAllowedMediaUrl(trimmed)) return fallback;

  if (trimmed.startsWith('/seed/')) return trimmed;
  if (trimmed.startsWith('blob:') || trimmed.slice(0, 5).toLowerCase() === 'data:') return trimmed;

  try {
    const parsed = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net');
    return parsed.href;
  } catch {
    return fallback;
  }
}

/**
 * Sanitizes user text inputs (titles, usernames, comments, overlay captions, chat prompts)
 * by stripping null bytes, invisible Bidi-spoofing characters, and HTML script tags.
 */
export function sanitizeUserText(input, maxLen = 280) {
  if (input == null) return '';
  const cleaned = stripControlChars(String(input))
    .replace(BIDI_SPOOF_RE, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|svg|math|style|link|meta)\b[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
  return cleaned.slice(0, maxLen);
}

/**
 * Sanitizes overlay JSON structures before persisting or rendering to prevent
 * prototype pollution or oversized/malicious text layer injection.
 */
export function sanitizeOverlayPayload(overlay) {
  if (!overlay || typeof overlay !== 'object') return null;
  const rawLayers = Array.isArray(overlay.layers) ? overlay.layers.slice(0, 24) : [];
  // Keeps the Forge layer schema (type/w/h/fill/stroke ratio/strokeColor) and the `burned` flag,
  // so the feed never draws text a second time over an image that already has it baked in.
  const num = (v, lo, hi, dflt) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : dflt);
  const hex = (v, dflt) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v || '')) ? v : dflt);
  const safeLayers = rawLayers
    .filter((l) => l && typeof l === 'object')
    .map((l, idx) => {
      const isSticker = l.type === 'sticker' || l.kind === 'sticker';
      const legacyStrokeColor = typeof l.stroke === 'string' ? l.stroke : null;
      const out = {
        id: sanitizeUserText(l.id || `layer-${idx}`, 48),
        type: isSticker ? 'sticker' : 'text',
        x: num(l.x, 0, 1, 0.5),
        y: num(l.y, 0, 1, 0.5),
        w: num(l.w, 0.02, 1, isSticker ? 0.2 : 0.9),
        h: num(l.h, 0.02, 1, isSticker ? 0.2 : 0.16),
        rot: num(l.rot, -360, 360, 0)
      };
      if (isSticker) {
        out.emoji = sanitizeUserText(l.emoji || '', 16);
        return out;
      }
      out.text = sanitizeUserText(l.text || '', 160);
      out.font = sanitizeUserText(l.font || 'Anton', 40);
      out.size = num(l.size, 0.02, 0.35, 0.09);
      out.fill = hex(l.fill || l.color, '#ffffff');
      out.stroke = legacyStrokeColor ? 0.09 : num(l.stroke, 0, 0.4, 0.09);
      out.strokeColor = hex(l.strokeColor || legacyStrokeColor, '#000000');
      out.align = ['left', 'center', 'right'].includes(l.align) ? l.align : 'center';
      out.caps = l.caps !== false;
      if (l.startSec != null && Number.isFinite(Number(l.startSec))) out.startSec = Math.max(0, Number(l.startSec));
      if (l.endSec != null && Number.isFinite(Number(l.endSec))) out.endSec = Math.max(0, Number(l.endSec));
      return out;
    });
  return { v: 1, burned: Boolean(overlay.burned), layers: safeLayers };
}

/**
 * Prototype-pollution-safe JSON parser for localStorage / external payloads.
 */
export function safeJsonParse(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw, (key, value) => {
      if (DANGEROUS_PROTO_KEYS.has(key)) return undefined;
      return value;
    });
  } catch {
    return fallback;
  }
}

/**
 * Inspects the first 256 bytes of an uploaded file to ensure it isn't a disguised
 * HTML/SVG/Script polyglot file claiming to be an image or video.
 */
export async function verifySafeMediaFile(file) {
  if (!file || typeof file !== 'object') {
    return { safe: false, reason: 'No file provided.' };
  }
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();

  // Explicitly block SVG uploads (SVGs can execute embedded JavaScript)
  if (type.includes('svg') || name.endsWith('.svg') || name.endsWith('.svgz') || name.endsWith('.html') || name.endsWith('.htm')) {
    return {
      safe: false,
      reason: '🛡️ Security Firewall: SVG and HTML files are blocked to prevent embedded script execution. Please use PNG, JPG, WebP, or GIF.'
    };
  }

  try {
    const headerSlice = file.slice(0, 256);
    const buf = await headerSlice.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const asciiPreview = new TextDecoder('utf-8', { fatal: false }).decode(bytes).toLowerCase();

    if (
      asciiPreview.includes('<script') ||
      asciiPreview.includes('<!doctype html') ||
      asciiPreview.includes('<html') ||
      asciiPreview.includes('<svg') ||
      asciiPreview.includes('javascript:') ||
      asciiPreview.includes('onload=') ||
      asciiPreview.includes('onerror=')
    ) {
      return {
        safe: false,
        reason: '🛡️ Security Firewall: Blocked disguised script/HTML payload inside media file.'
      };
    }
  } catch {
    // If ArrayBuffer slice isn't supported in legacy env, fall through to image/video decoder probe
  }

  return { safe: true };
}

/**
 * Inspects real runtime browser protections observable on the current document.
 * Does NOT fabricate a numeric score; server-side RLS & moderation live in Supabase.
 */
export function getSecurityAuditReport() {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const isSecureContext = Boolean(isBrowser && (window.isSecureContext || window.location.hostname === 'localhost'));
  const cspMeta = isBrowser
    ? document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || ''
    : '';
  const hasCsp = Boolean(cspMeta);
  const scriptSrcMatch = cspMeta.match(/script-src\s+([^;]+)/i);
  const noUnsafeInlineScript = Boolean(scriptSrcMatch && !/unsafe-inline/i.test(scriptSrcMatch[1]));
  const imgSrcMatch = cspMeta.match(/img-src\s+([^;]+)/i);
  const lockedMediaSrc = Boolean(
    imgSrcMatch && !/(^|\s)https:(\s|$)/i.test(imgSrcMatch[1]) && imgSrcMatch[1].includes('supabase.co')
  );

  const checks = [
    { id: 'tls', label: 'Secure context (HTTPS or localhost)', ok: isSecureContext },
    { id: 'csp', label: 'Document Content-Security-Policy present', ok: hasCsp },
    { id: 'script', label: "Strict script-src (no 'unsafe-inline')", ok: noUnsafeInlineScript },
    { id: 'img', label: 'img-src locked to self + own storage bucket', ok: lockedMediaSrc }
  ];
  const passedCount = checks.filter((c) => c.ok).length;

  return {
    status: `${passedCount}/${checks.length} Browser Checks Active`,
    score: null,
    passedCount,
    totalChecks: checks.length,
    checks
  };
}
