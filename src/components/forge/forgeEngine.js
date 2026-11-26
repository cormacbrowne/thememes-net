// ==========================================
// PHASE 26: MEME FORGE 3.0 ENGINE
// Shared text-fit, layouts, fonts, and canvas renderer (preview + export use the same math).
// ==========================================
import { renderArtworkWithFilter, stampArcadeCartridgeFooter } from '../../utils/canvasMutator';
import { SITE_URL, canonicalShareUrl, ensureShareUrlInText, linkSafeShareText } from '../../utils/shareText.js';

export const FONT_PACK = [
  { id: 'Anton', label: 'Impact / Anton', css: "'Anton', Impact, 'Arial Black', sans-serif" },
  { id: 'Bebas Neue', label: 'Bebas Neue', css: "'Bebas Neue', Impact, sans-serif" },
  { id: 'Comic Neue', label: 'Comic Neue', css: "'Comic Neue', 'Comic Sans MS', cursive", weight: 700 },
  { id: 'Permanent Marker', label: 'Permanent Marker', css: "'Permanent Marker', cursive" },
  { id: 'Press Start 2P', label: 'Press Start 2P', css: "'Press Start 2P', monospace" },
  { id: 'Inter', label: 'Inter', css: "'Inter', system-ui, sans-serif", weight: 800 }
];

export const fontById = (id) => FONT_PACK.find((f) => f.id === id) || FONT_PACK[0];

export const fontCss = (layer, px) => {
  const f = fontById(layer.font);
  return `${f.weight || 400} ${Math.max(1, px).toFixed(1)}px ${f.css}`;
};

/** Waits for every font used by the layers (self-hosted / Google Fonts CSS) before drawing. */
export async function ensureFontsLoaded(layers = []) {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const ids = [...new Set(layers.filter((l) => l.type === 'text').map((l) => l.font))];
  await Promise.all(
    ids.map((id) => {
      const f = fontById(id);
      return document.fonts.load(`${f.weight || 400} 48px '${f.id}'`).catch(() => null);
    })
  );
}

let measureCtx = null;
const getMeasureCtx = () => {
  if (!measureCtx && typeof document !== 'undefined') {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  return measureCtx;
};

export const LINE_HEIGHT = 1.12;

/** Word-wrap + shrink-to-fit. Returns { size, lines }. */
export function fitText(layer, boxW, boxH, stageH) {
  const ctx = getMeasureCtx();
  const raw = layer.caps ? String(layer.text || '').toUpperCase() : String(layer.text || '');
  const paragraphs = raw.split('\n');
  let size = Math.max(8, (layer.size || 0.08) * stageH);
  const minSize = 8;
  if (!ctx) return { size, lines: paragraphs };
  for (let guard = 0; guard < 60; guard++) {
    ctx.font = fontCss(layer, size);
    const lines = [];
    let tooWide = false;
    paragraphs.forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push('');
        return;
      }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = `${line} ${words[i]}`;
        if (ctx.measureText(test).width <= boxW) line = test;
        else {
          lines.push(line);
          line = words[i];
        }
      }
      lines.push(line);
    });
    lines.forEach((l) => {
      if (ctx.measureText(l).width > boxW) tooWide = true;
    });
    const totalH = lines.length * size * LINE_HEIGHT;
    if ((!tooWide && totalH <= boxH) || size <= minSize) return { size, lines };
    size = Math.max(minSize, size * 0.92);
  }
  return { size: minSize, lines: paragraphs };
}

// ---------- Layers ----------
let layerSeq = 0;
export const newId = (p = 'L') => `${p}-${Date.now().toString(36)}-${(layerSeq++).toString(36)}`;

export function makeTextLayer(overrides = {}) {
  return {
    id: newId('txt'),
    type: 'text',
    text: 'YOUR TEXT',
    x: 0.5,
    y: 0.5,
    w: 0.9,
    h: 0.16,
    rot: 0,
    font: 'Anton',
    size: 0.09,
    fill: '#ffffff',
    stroke: 0.09,
    strokeColor: '#000000',
    align: 'center',
    caps: true,
    ...overrides
  };
}

/**
 * Normalises stored overlay layers. Rows published before 17 Nov 2026 went through an old
 * sanitizer that renamed fill→color, turned stroke into a colour string and dropped w/h/type.
 */
export function normalizeOverlayLayers(layers = []) {
  if (!Array.isArray(layers)) return [];
  return layers
    .filter((l) => l && typeof l === 'object')
    .map((l) => {
      const isSticker = l.type === 'sticker' || l.kind === 'sticker';
      const legacyStroke = typeof l.stroke === 'string' ? l.stroke : null;
      return {
        ...l,
        type: isSticker ? 'sticker' : 'text',
        w: Number.isFinite(l.w) ? l.w : isSticker ? 0.2 : 0.92,
        h: Number.isFinite(l.h) ? l.h : isSticker ? 0.2 : 0.18,
        rot: Number.isFinite(l.rot) ? l.rot : 0,
        font: l.font || 'Anton',
        size: Number.isFinite(l.size) ? l.size : 0.09,
        fill: l.fill || l.color || '#ffffff',
        stroke: legacyStroke ? 0.09 : Number.isFinite(l.stroke) ? l.stroke : 0.09,
        strokeColor: l.strokeColor || legacyStroke || '#000000',
        align: l.align || 'center',
        caps: l.caps !== false
      };
    });
}

/**
 * True when the meme's media file already has its captions baked in, so the overlay must not be
 * drawn again (on screen or on export). Every image publish path burns text into the file.
 */
export function isOverlayBurnedIn(meme) {
  if (!meme?.overlay) return true;
  if (meme.overlay.burned) return true;
  // House memes (Workstream 1) are the bare /seed/ template + a live caption overlay. Only the
  // server sets `live` (publish-meme's sanitizeOverlay drops unknown top-level keys).
  if (meme.overlay.live === true) return false;
  return meme.media_type !== 'video' && meme.media_type !== 'gif';
}

export function makeSticker(overrides = {}) {
  return { id: newId('stk'), type: 'sticker', emoji: '🔥', src: '', x: 0.5, y: 0.5, w: 0.2, h: 0.2, rot: 0, ...overrides };
}

const AUTO_TITLE_RE = /^(untitled meme|(?:fresh|community) upload by @\S+|caption:\s*)$/i;

export function hasVisibleOverlayContent(layers = []) {
  return Array.isArray(layers)
    ? layers.some((l) => (l?.type === 'text' ? Boolean(String(l.text || '').trim()) : l?.type === 'sticker' ? Boolean(l.emoji || l.src) : false))
    : false;
}

/**
 * Builds classic Impact Top/Bottom meme text layers from a caption or title string
 * so images without explicit overlay layers still get legible meme text burned in.
 */
export function buildFallbackCaptionLayers(captionText = '', topText = '', bottomText = '') {
  const top = String(topText || '').trim();
  const bottom = String(bottomText || '').trim();
  if (top || bottom) {
    const out = [];
    if (top) out.push(makeTextLayer({ slot: 'top', text: top, y: 0.11, h: 0.2, stroke: 0.14, fill: '#ffffff' }));
    if (bottom) out.push(makeTextLayer({ slot: 'bottom', text: bottom, y: 0.88, h: 0.2, stroke: 0.14, fill: '#ffffff' }));
    return out;
  }
  const raw = String(captionText || '').trim();
  if (!raw || AUTO_TITLE_RE.test(raw)) return [];

  for (const sep of ['\n', ' — ', ' | ', ' - ']) {
    const idx = raw.indexOf(sep);
    if (idx > 0 && idx < raw.length - sep.length) {
      const a = raw.slice(0, idx).trim();
      const b = raw.slice(idx + sep.length).trim();
      if (a && b) {
        return [
          makeTextLayer({ slot: 'top', text: a, y: 0.11, h: 0.2, stroke: 0.14, fill: '#ffffff' }),
          makeTextLayer({ slot: 'bottom', text: b, y: 0.88, h: 0.2, stroke: 0.14, fill: '#ffffff' })
        ];
      }
    }
  }

  if (raw.length > 36) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      const half = Math.ceil(words.length / 2);
      return [
        makeTextLayer({ slot: 'top', text: words.slice(0, half).join(' '), y: 0.11, h: 0.2, stroke: 0.14, fill: '#ffffff' }),
        makeTextLayer({ slot: 'bottom', text: words.slice(half).join(' '), y: 0.88, h: 0.2, stroke: 0.14, fill: '#ffffff' })
      ];
    }
  }

  return [makeTextLayer({ slot: 'top', text: raw, y: 0.12, h: 0.22, stroke: 0.14, fill: '#ffffff' })];
}

const blackCaption = { fill: '#000000', stroke: 0, caps: false, font: 'Inter', size: 0.06 };

// ---------- Layout presets ----------
export const LAYOUTS = [
  {
    id: 'classic',
    label: '🕹️ Classic',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
    bars: [],
    layers: () => [
      makeTextLayer({ text: 'TOP TEXT', y: 0.1, h: 0.18 }),
      makeTextLayer({ text: 'BOTTOM TEXT', y: 0.9, h: 0.18 })
    ]
  },
  {
    id: 'captionbar',
    label: '📱 Caption Bar',
    panels: [{ x: 0, y: 0.22, w: 1, h: 0.78 }],
    bars: [{ x: 0, y: 0, w: 1, h: 0.22, color: '#ffffff' }],
    layers: () => [makeTextLayer({ ...blackCaption, text: 'when the code works on the first try', y: 0.11, h: 0.18, w: 0.92, align: 'left' })]
  },
  {
    id: 'drake',
    label: '🙅 2-Panel Compare',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 }
    ],
    bars: [{ x: 0.5, y: 0, w: 0.5, h: 1, color: '#ffffff' }],
    layers: () => [
      makeTextLayer({ ...blackCaption, text: 'the old way', x: 0.75, y: 0.25, w: 0.44, h: 0.4, size: 0.07 }),
      makeTextLayer({ ...blackCaption, text: 'the new way', x: 0.75, y: 0.75, w: 0.44, h: 0.4, size: 0.07 })
    ]
  },
  {
    id: 'grid',
    label: '🗯️ 2×2 Comic',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
    ],
    bars: [],
    gutter: 0.008,
    layers: () =>
      [0.25, 0.75].flatMap((y) =>
        [0.25, 0.75].map((x) => makeTextLayer({ text: '...', x, y: y + 0.18, w: 0.44, h: 0.1, size: 0.05 }))
      )
  },
  {
    id: 'vs',
    label: '⚔️ VS',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 }
    ],
    bars: [],
    gutter: 0.006,
    layers: () => [
      makeTextLayer({ text: 'ME', x: 0.25, y: 0.1, w: 0.44, h: 0.14 }),
      makeTextLayer({ text: 'THEM', x: 0.75, y: 0.1, w: 0.44, h: 0.14 }),
      makeTextLayer({ text: 'VS', x: 0.5, y: 0.5, w: 0.24, h: 0.16, fill: '#facc15', size: 0.12 })
    ]
  },
  {
    id: 'pov',
    label: '👀 POV:',
    panels: [{ x: 0, y: 0.16, w: 1, h: 0.84 }],
    bars: [{ x: 0, y: 0, w: 1, h: 0.16, color: '#ffffff' }],
    layers: () => [makeTextLayer({ ...blackCaption, text: 'POV: you opened the meme forge', y: 0.08, h: 0.13, w: 0.92, align: 'left' })]
  }
];

export const layoutById = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];

export const ASPECTS = [
  { id: 'auto', label: 'Auto', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 }
];

export const emptyPanel = () => ({ src: '', blob: null, zoom: 1, panX: 0, panY: 0, rot: 0, flipX: false, natW: 0, natH: 0 });

export function makeDoc({ layoutId = 'classic', panels = [], layers, base = null, aspect = 'auto' } = {}) {
  const lay = layoutById(layoutId);
  return {
    v: 1,
    layoutId: lay.id,
    aspect,
    pad: 0,
    filter: 'none',
    base, // { kind:'video'|'gif', file?, url, posterUrl?, width, height, duration } for motion memes
    panels: lay.panels.map((_, i) => ({ ...emptyPanel(), ...(panels[i] || {}) })),
    layers: layers || lay.layers()
  };
}

/** Stage aspect ratio (w/h). */
export function docRatio(doc) {
  if (doc.base?.width && doc.base?.height) return doc.base.width / doc.base.height;
  const a = ASPECTS.find((x) => x.id === doc.aspect);
  if (a?.ratio) return a.ratio;
  const p = doc.panels[0];
  if (doc.layoutId === 'classic' && p?.natW && p?.natH) {
    const rotated = p.rot % 180 !== 0;
    const r = rotated ? p.natH / p.natW : p.natW / p.natH;
    return Math.min(16 / 9, Math.max(9 / 16, r));
  }
  return 1;
}

/** Panel rects in px, honoring padding + gutters. */
export function panelRects(doc, W, H) {
  const lay = layoutById(doc.layoutId);
  const pad = (doc.pad || 0) * Math.min(W, H);
  const g = (lay.gutter || 0) * Math.min(W, H);
  const iw = W - pad * 2;
  const ih = H - pad * 2;
  const map = (r) => ({
    x: pad + r.x * iw + (r.x > 0 ? g / 2 : 0),
    y: pad + r.y * ih + (r.y > 0 ? g / 2 : 0),
    w: r.w * iw - (r.x > 0 ? g / 2 : 0) - (r.x + r.w < 1 ? g / 2 : 0),
    h: r.h * ih - (r.y > 0 ? g / 2 : 0) - (r.y + r.h < 1 ? g / 2 : 0)
  });
  return { panels: lay.panels.map(map), bars: lay.bars.map((b) => ({ ...map(b), color: b.color })) };
}

function drawPanelImage(ctx, img, p, r) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const rotated = (p.rot || 0) % 180 !== 0;
  const ew = rotated ? ih : iw;
  const eh = rotated ? iw : ih;
  const s = Math.max(r.w / ew, r.h / eh) * (p.zoom || 1);
  const overX = Math.max(0, ew * s - r.w) / 2;
  const overY = Math.max(0, eh * s - r.h) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.translate(r.x + r.w / 2 + (p.panX || 0) * overX, r.y + r.h / 2 + (p.panY || 0) * overY);
  ctx.rotate(((p.rot || 0) * Math.PI) / 180);
  if (p.flipX) ctx.scale(-1, 1);
  ctx.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
  ctx.restore();
}

/** Draws background, panels, bars (with FX). images: Map(src → HTMLImageElement). */
export function drawBase(ctx, W, H, doc, images, { emptyHint = false } = {}) {
  const { panels, bars } = panelRects(doc, W, H);
  ctx.fillStyle = doc.pad ? '#ffffff' : '#090a0f';
  ctx.fillRect(0, 0, W, H);
  renderArtworkWithFilter(ctx, W, 0, H, doc.filter || 'none', (bctx) => {
    bctx.fillStyle = doc.pad ? '#ffffff' : '#090a0f';
    bctx.fillRect(0, 0, W, H);
    panels.forEach((r, i) => {
      const p = doc.panels[i] || emptyPanel();
      const img = p.src ? images.get(p.src) : null;
      if (img) drawPanelImage(bctx, img, p, r);
      else {
        bctx.fillStyle = '#111527';
        bctx.fillRect(r.x, r.y, r.w, r.h);
        if (emptyHint) {
          bctx.strokeStyle = 'rgba(0,243,255,0.45)';
          bctx.setLineDash([8, 6]);
          bctx.lineWidth = 2;
          bctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
          bctx.setLineDash([]);
          bctx.fillStyle = 'rgba(0,243,255,0.8)';
          bctx.font = `700 ${Math.round(Math.min(r.w, r.h) * 0.08)}px system-ui, sans-serif`;
          bctx.textAlign = 'center';
          bctx.textBaseline = 'middle';
          bctx.fillText('📸 Tap to add photo', r.x + r.w / 2, r.y + r.h / 2);
        }
      }
    });
  });
  bars.forEach((b) => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });
}

/** Draws text + sticker layers. */
export function drawLayers(ctx, W, H, layers, images) {
  layers.forEach((l) => {
    const bw = l.w * W;
    const bh = l.h * H;
    ctx.save();
    ctx.translate(l.x * W, l.y * H);
    ctx.rotate(((l.rot || 0) * Math.PI) / 180);
    if (l.type === 'sticker') {
      if (l.src && images.get(l.src)) {
        ctx.drawImage(images.get(l.src), -bw / 2, -bh / 2, bw, bh);
      } else {
        ctx.font = `${Math.min(bw, bh) * 0.9}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(l.emoji || '🔥', 0, 0);
      }
    } else {
      const { size, lines } = fitText(l, bw, bh, H);
      ctx.font = fontCss(l, size);
      ctx.textBaseline = 'middle';
      ctx.textAlign = l.align || 'center';
      const ax = l.align === 'left' ? -bw / 2 : l.align === 'right' ? bw / 2 : 0;
      const lh = size * LINE_HEIGHT;
      const startY = -((lines.length - 1) * lh) / 2;
      const sw = (l.stroke || 0) * size;
      lines.forEach((line, i) => {
        const y = startY + i * lh;
        if (sw > 0) {
          ctx.lineJoin = 'round';
          ctx.lineWidth = sw * 2;
          ctx.strokeStyle = l.strokeColor || '#000';
          ctx.strokeText(line, ax, y);
        }
        ctx.fillStyle = l.fill || '#fff';
        ctx.fillText(line, ax, y);
      });
    }
    ctx.restore();
  });
}

/** Full export render → canvas. */
export function renderDocToCanvas(doc, images, { width = 1080, withLayers = true, watermark = null } = {}) {
  const ratio = docRatio(doc);
  const W = width;
  const H = Math.round(width / ratio);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  drawBase(ctx, W, H, doc, images);
  if (withLayers) drawLayers(ctx, W, H, doc.layers, images);
  if (watermark) stampArcadeCartridgeFooter(ctx, W, H, watermark);
  return c;
}

export function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img'));
    img.src = src;
  });
}

/** Best recorder format: MP4 first (iPhone, Instagram, X, WhatsApp all take it), then WebM. */
export function pickVideoRecorderMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

/**
 * Burns captions (if any) plus the thememes.net logo watermark into a video, keeping its sound.
 * Plays the clip once off-screen through canvas.captureStream + MediaRecorder.
 * Returns { blob, mime, ext } or null when the browser cannot record.
 */
export async function burnInVideo(
  videoUrl,
  layers,
  images,
  onProgress,
  {
    maxSeconds = 90,
    maxDim = 1080,
    watermark = true,
    frameCount = 0,
    frameMaxDim = 480,
    videoBitsPerSecond = 4_000_000,
    audioBitsPerSecond = 128_000
  } = {}
) {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  const mime = pickVideoRecorderMime();
  if (!mime) return null;
  const cleanLayers = normalizeOverlayLayers(layers || []);
  await ensureFontsLoaded(cleanLayers);
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.preload = 'auto';
  v.muted = false;
  v.volume = 1;
  v.src = videoUrl;
  await new Promise((res, rej) => {
    v.onloadeddata = res;
    v.onerror = () => rej(new Error('video-load'));
  });
  const scale = Math.min(1, maxDim / Math.max(v.videoWidth || 720, v.videoHeight || 720));
  const W = Math.max(2, Math.round((v.videoWidth || 720) * scale) & ~1);
  const H = Math.max(2, Math.round((v.videoHeight || 720) * scale) & ~1);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const draw = () => {
    ctx.drawImage(v, 0, 0, W, H);
    if (cleanLayers.length) drawLayers(ctx, W, H, cleanLayers, images || new Map());
    if (watermark) stampArcadeCartridgeFooter(ctx, W, H, { fast: true });
  };

  // 36.V: small stills of what is being recorded, spread over the clip, for moderation.
  const frameJobs = [];
  const playLen = Math.min(maxSeconds, Number.isFinite(v.duration) && v.duration > 0 ? v.duration : maxSeconds);
  const nFrames = frameCount === 'auto' ? Math.min(16, Math.max(4, Math.ceil(playLen / 2))) : frameCount;
  const frameTimes = nFrames > 0
    ? Array.from({ length: nFrames }, (_, i) => (i === 0 ? 0 : (playLen * i) / nFrames))
    : [];
  let nextFrame = 0;
  const grabFrames = () => {
    while (nextFrame < frameTimes.length && v.currentTime + 0.001 >= frameTimes[nextFrame]) {
      const fs = Math.min(1, frameMaxDim / Math.max(W, H));
      const fc = document.createElement('canvas');
      fc.width = Math.max(2, Math.round(W * fs));
      fc.height = Math.max(2, Math.round(H * fs));
      fc.getContext('2d').drawImage(c, 0, 0, fc.width, fc.height);
      frameJobs.push(
        new Promise((res) =>
          fc.toBlob((b) => (b && b.type === 'image/webp' ? res(b) : fc.toBlob((j) => res(j), 'image/jpeg', 0.85)), 'image/webp', 0.82)
        )
      );
      nextFrame += 1;
    }
  };
  draw();
  const stream = c.captureStream(30);

  // Keep the original sound: route the element through Web Audio into the recording only
  // (not to the speakers, so exporting is silent for the person).
  let audioCtx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      audioCtx = new AC();
      const src = audioCtx.createMediaElementSource(v);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
    }
  } catch {
    audioCtx = null;
  }

  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond, audioBitsPerSecond });
  const chunks = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const stopped = new Promise((res) => (rec.onstop = res));
  let raf = 0;
  let vfc = 0;
  const useVfc = typeof v.requestVideoFrameCallback === 'function';
  const tick = () => {
    draw();
    if (frameTimes.length) grabFrames();
    if (onProgress && v.duration) onProgress(Math.min(1, v.currentTime / v.duration));
    if (v.currentTime >= maxSeconds) v.pause();
    if (useVfc) vfc = v.requestVideoFrameCallback(tick);
    else raf = requestAnimationFrame(tick);
  };
  rec.start(250);
  try {
    await v.play();
  } catch {
    // Autoplay with sound refused (no recent tap): record silently instead.
    v.muted = true;
    await v.play();
  }
  tick();
  await new Promise((res) => {
    v.onended = res;
    v.onpause = () => v.currentTime >= maxSeconds && res();
  });
  if (useVfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(vfc);
  cancelAnimationFrame(raf);
  draw();
  rec.stop();
  await stopped;
  const frames = (await Promise.all(frameJobs)).filter(Boolean);
  try {
    audioCtx?.close();
  } catch {
    // ignore
  }
  const baseMime = mime.split(';')[0];
  return {
    blob: new Blob(chunks, { type: baseMime }),
    mime: baseMime,
    ext: baseMime === 'video/mp4' ? 'mp4' : 'webm',
    frames,
    width: W,
    height: H,
    duration: Math.min(playLen, v.currentTime || playLen)
  };
}

/**
 * 36.V: get a picked video ready to post. Re-records it (max 30 s, 720p, captions burned in,
 * no logo: the logo is added when it is shared), which also drops every bit of phone metadata
 * (location, device), and grabs 4–16 small stills for moderation (the first is the poster).
 * Returns { blob, mime, ext, frames, width, height, duration } or null if the browser cannot record.
 */
export async function prepareVideoForUpload(source, layers = [], { onProgress } = {}) {
  const url = source instanceof Blob ? URL.createObjectURL(source) : source;
  try {
    return await burnInVideo(url, layers, new Map(), onProgress, {
      maxSeconds: 30,
      maxDim: 720,
      watermark: false,
      frameCount: 'auto',
      frameMaxDim: 480,
      // T-014: posted clips are streamed to every viewer from Supabase (5 GB/month free egress).
      // 720p looks the same at ~1.8 Mbps; 30 s ≈ 7 MB instead of ~15 MB. Downloads keep 4 Mbps.
      videoBitsPerSecond: 1_800_000,
      audioBitsPerSecond: 96_000
    });
  } finally {
    if (source instanceof Blob) URL.revokeObjectURL(url);
  }
}

/**
 * Phase 30.6: Client-side animated GIF text/sticker burn-in using gifuct-js + gifenc.
 * Preserves multi-frame timing and frame disposal so Top/Bottom Impact text is embedded
 * into the downloaded GIF for instant WhatsApp, iMessage, Discord & Reddit sharing.
 */
export async function burnInAnimatedGif(source, doc, images, { maxWidth = 520, watermark = null, onProgress } = {}) {
  const [gifuctMod, gifencMod] = await Promise.all([import('gifuct-js'), import('gifenc')]);
  const { parseGIF, decompressFrames } = gifuctMod.parseGIF ? gifuctMod : gifuctMod.default || gifuctMod;
  const { GIFEncoder, quantize, applyPalette } = gifencMod.GIFEncoder
    ? gifencMod
    : gifencMod.default || gifencMod;

  let buffer;
  if (source instanceof Blob) {
    buffer = await source.arrayBuffer();
  } else if (typeof source === 'string' && source) {
    const res = await fetch(source, { mode: 'cors' });
    if (!res.ok) throw new Error('gif-fetch-failed');
    buffer = await res.arrayBuffer();
  } else {
    return null;
  }

  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);
  if (!frames || !frames.length) return null;

  await ensureFontsLoaded(doc?.layers || []);

  const srcW = Math.max(1, gif.lsd?.width || frames[0].dims.width);
  const srcH = Math.max(1, gif.lsd?.height || frames[0].dims.height);
  const scale = Math.min(1, maxWidth / srcW);
  const outW = Math.max(2, Math.round(srcW * scale));
  const outH = Math.max(2, Math.round(srcH * scale));

  const compCanvas = document.createElement('canvas');
  compCanvas.width = srcW;
  compCanvas.height = srcH;
  const compCtx = compCanvas.getContext('2d', { willReadFrequently: true });

  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

  const encoder = GIFEncoder();
  let prevDisposal = 0;
  let prevDims = null;
  let prevRestoreData = null;

  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const dims = frame.dims;

    if (prevDisposal === 2 && prevDims) {
      compCtx.clearRect(prevDims.left, prevDims.top, prevDims.width, prevDims.height);
    } else if (prevDisposal === 3 && prevRestoreData) {
      compCtx.putImageData(prevRestoreData, 0, 0);
    }

    if (frame.disposalType === 3) {
      prevRestoreData = compCtx.getImageData(0, 0, srcW, srcH);
    } else {
      prevRestoreData = null;
    }

    if (frame.patch && dims.width > 0 && dims.height > 0) {
      patchCanvas.width = dims.width;
      patchCanvas.height = dims.height;
      const imgData = new ImageData(new Uint8ClampedArray(frame.patch), dims.width, dims.height);
      patchCtx.putImageData(imgData, 0, 0);
      compCtx.drawImage(patchCanvas, dims.left, dims.top);
    }

    outCtx.clearRect(0, 0, outW, outH);
    outCtx.fillStyle = '#090a0f';
    outCtx.fillRect(0, 0, outW, outH);
    renderArtworkWithFilter(outCtx, outW, 0, outH, doc?.filter || 'none', (bctx) => {
      bctx.drawImage(compCanvas, 0, 0, outW, outH);
    });
    if (doc?.layers?.length) {
      drawLayers(outCtx, outW, outH, doc.layers, images);
    }
    if (watermark) {
      stampArcadeCartridgeFooter(outCtx, outW, outH, watermark);
    }

    const rgba = outCtx.getImageData(0, 0, outW, outH).data;
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    const delayMs = Math.max(20, Number(frame.delay) || 100);
    encoder.writeFrame(index, outW, outH, { palette, delay: delayMs });

    prevDisposal = frame.disposalType || 0;
    prevDims = dims;

    if (onProgress) onProgress((i + 1) / frames.length);
    if (i % 4 === 3) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  encoder.finish();
  return new Blob([encoder.bytesView()], { type: 'image/gif' });
}

export function triggerBlobDownload(blob, filename) {
  if (!blob) return;
  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/**
 * Renders a still image (File/Blob/URL) + optional text/sticker layers + www.thememes.net
 * watermark onto a natural-aspect canvas and returns a PNG Blob.
 */
export async function renderStillImageBlob(source, layers = [], { maxWidth = 1200, filter = 'none', watermark = true } = {}) {
  const isBlob = source instanceof Blob;
  const srcUrl = isBlob ? URL.createObjectURL(source) : source;
  try {
    const img = await loadImg(srcUrl);
    const natW = img.naturalWidth || img.width || 800;
    const natH = img.naturalHeight || img.height || 600;
    const W = Math.min(maxWidth, Math.max(480, natW));
    const H = Math.max(2, Math.round((W * natH) / natW));
    const cleanLayers = (layers || []).filter((l) => (l.type === 'text' ? String(l.text || '').trim() : true));
    await ensureFontsLoaded(cleanLayers);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    renderArtworkWithFilter(ctx, W, 0, H, filter, (bctx) => {
      bctx.drawImage(img, 0, 0, W, H);
    });
    if (cleanLayers.length) {
      drawLayers(ctx, W, H, cleanLayers, new Map());
    }
    if (watermark) {
      stampArcadeCartridgeFooter(ctx, W, H);
    }
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  } finally {
    if (isBlob) URL.revokeObjectURL(srcUrl);
  }
}

/**
 * Shared export helper for QuickUpload, MemeForge, and Feed/Theater cards.
 * Always embeds top/bottom captions (including fallback title text when no overlay
 * was pre-burned) and the subtle `www.thememes.net` watermark on images and GIFs.
 */
export async function exportMemeWithWatermark(
  input,
  { onProgress, watermark = true, captionText = '', topText = '', bottomText = '' } = {}
) {
  if (!input) return null;
  const isFeedMeme = typeof input.image_url === 'string' || typeof input.media_type === 'string';
  const rawLayers = isFeedMeme ? input.overlay?.layers || [] : input.layers || [];
  const hasVisibleOverlay = hasVisibleOverlayContent(rawLayers);
  const rawUrl = isFeedMeme
    ? (hasVisibleOverlay ? input.base_image_url : null) || input.image_url || input.base_image_url
    : input.url || '';
  const sourceFile = isFeedMeme ? null : input.file || null;
  let source = sourceFile || rawUrl;
  const kind = isFeedMeme
    ? input.media_type === 'gif' || /\.gif(?:$|\?)/i.test(String(input.image_url || rawUrl))
      ? 'gif'
      : input.media_type === 'video' || /\.(?:mp4|webm|mov)(?:$|\?)/i.test(String(input.image_url || rawUrl))
        ? 'video'
        : 'image'
    : input.kind || 'image';

  const isPreBurnedSeed =
    Boolean(input.is_seed) ||
    String(input.id || '').startsWith('seed-') ||
    /\/seed\/seed-/i.test(String(rawUrl || ''));
  const explicitFallback = buildFallbackCaptionLayers(captionText, topText, bottomText);

  let overlayLayers = [];
  let feedSource = null;
  if (isFeedMeme) {
    // Owner brief 17 Nov 2026 (item 3): exporting a posted meme used to redraw its captions over
    // an image that already had them (and invent captions from the title). Now: if the file already
    // carries its text, export that file as-is + logo; only live overlays (video / unburned GIF) are drawn.
    const burned = isPreBurnedSeed || isOverlayBurnedIn(input);
    feedSource = input.image_url || input.base_image_url || '';
    if (!burned && hasVisibleOverlay) {
      overlayLayers = normalizeOverlayLayers(rawLayers);
      if (kind === 'gif' && input.base_image_url) feedSource = input.base_image_url;
    }
  } else if (hasVisibleOverlay) {
    overlayLayers = rawLayers;
  } else if (explicitFallback.length) {
    overlayLayers = explicitFallback;
  } else if (input.title) {
    overlayLayers = buildFallbackCaptionLayers(input.title);
  }

  if (feedSource) source = feedSource;
  const stamp = Date.now();
  if (kind === 'gif') {
    const gifDoc = input.doc || {
      id: 'gif-export',
      aspect: '1:1',
      filter: input.filter || 'none',
      layers: overlayLayers
    };
    const gifBlob = await burnInAnimatedGif(source, gifDoc, input.images || new Map(), {
      watermark,
      onProgress
    });
    if (gifBlob) {
      return { blob: gifBlob, mime: 'image/gif', filename: `thememes-net-${stamp}.gif` };
    }
    if (sourceFile) {
      return { blob: sourceFile, mime: sourceFile.type || 'image/gif', filename: `thememes-net-${stamp}.gif` };
    }
    return null;
  }

  if (kind === 'video') {
    if (sourceFile && !overlayLayers.length) {
      const ext = sourceFile.type?.includes('webm') ? 'webm' : 'mp4';
      return { blob: sourceFile, mime: sourceFile.type || 'video/mp4', filename: `thememes-net-${stamp}.${ext}` };
    }
    const videoUrl = sourceFile ? URL.createObjectURL(sourceFile) : source;
    try {
      const res = await burnInVideo(videoUrl, overlayLayers, input.images || new Map(), onProgress);
      if (res?.blob) return { blob: res.blob, mime: res.mime, filename: `thememes-net-${stamp}.${res.ext}` };
    } finally {
      if (sourceFile) URL.revokeObjectURL(videoUrl);
    }
    return sourceFile ? { blob: sourceFile, mime: sourceFile.type || 'video/mp4', filename: `thememes-net-${stamp}.mp4` } : null;
  }

  if (input.doc && input.images) {
    const exportDoc = hasVisibleOverlayContent(input.doc.layers) || !overlayLayers.length
      ? input.doc
      : { ...input.doc, layers: overlayLayers };
    await ensureFontsLoaded(exportDoc.layers || []);
    const canvas = renderDocToCanvas(exportDoc, input.images, { width: 1080, watermark });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return blob ? { blob, mime: 'image/png', filename: `thememes-net-${stamp}.png` } : null;
  }

  const blob = await renderStillImageBlob(source, overlayLayers, {
    filter: input.filter || 'none',
    watermark
  });
  return blob ? { blob, mime: 'image/png', filename: `thememes-net-${stamp}.png` } : null;
}

/**
 * Shares an exported watermarked File via Web Share API Level 2 when supported,
 * or falls back cleanly to URL share / clipboard copy + download.
 */
export async function shareExportedMeme({ blob, filename, title, text, url = SITE_URL }) {
  const shareUrl = canonicalShareUrl(url || SITE_URL);
  const safeTitle = linkSafeShareText(title);
  const safeText = ensureShareUrlInText(text, shareUrl);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    if (blob && typeof File !== 'undefined') {
      const file = new File([blob], filename || 'meme-thememes-net.png', { type: blob.type || 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: safeTitle, text: safeText, url: shareUrl });
          return { method: 'files' };
        }
      } catch (err) {
        if (err?.name === 'AbortError') return { method: 'cancelled' };
      }
    }
    try {
      await navigator.share({ title: safeTitle, text: safeText, url: shareUrl });
      return { method: 'url' };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'cancelled' };
    }
  }
  if (shareUrl && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
  }
  if (blob) {
    triggerBlobDownload(blob, filename || 'meme-thememes-net.png');
    return { method: 'download' };
  }
  return { method: 'clipboard' };
}
