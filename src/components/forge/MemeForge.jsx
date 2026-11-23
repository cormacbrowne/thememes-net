import CategorySelect from '../CategorySelect';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMemeEditor from '../../hooks/useMemeEditor';
import ForgeStage from './ForgeStage';
import ForgeToolPanel from './ForgeToolPanel';
import { loadDraft, clearDraft, hydrate } from './draftStore';
import './MemeForge.css';
import {
  makeDoc,
  makeTextLayer,
  makeSticker,
  buildFallbackCaptionLayers,
  hasVisibleOverlayContent,
  renderDocToCanvas,
  renderStillImageBlob,
  burnInAnimatedGif,
  ensureFontsLoaded,
  loadImg,
  docRatio,
  burnInVideo,
  exportMemeWithWatermark,
  triggerBlobDownload,
  shareExportedMeme
} from './forgeEngine';
import {
  ACCEPT_MEDIA,
  validateFile,
  canvasToCompressedBlob,
  makePoster
} from '../../utils/mediaPipeline';
import { VIRAL_CAPTIONS } from '../../data/starterMemes';
import { getTemplateById, getTemplateBySlug, templateTextLayers } from '../../data/memeTemplates';
import { publishErrorMessage, CHECKING_MESSAGE, RULES_PATH } from '../../utils/publishMeme';
import { sfx } from '../../utils/soundEngine';
import { AI_BATTLE_IMAGE_LABEL, isAiTemplateImage } from '../../utils/battleImages';
import {
  PUBLIC_UPLOADS_ENABLED,
  UPLOADS_PAUSED_MESSAGE,
  UPLOADS_PAUSED_ERROR
} from '../../config/featureFlags';


function probeRemote(url, kind) {
  return new Promise((resolve) => {
    if (kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight, duration: v.duration });
      v.onerror = () => resolve({});
      v.src = url;
    } else {
      const i = new Image();
      i.onload = () => resolve({ width: i.naturalWidth, height: i.naturalHeight });
      i.onerror = () => resolve({});
      i.src = url;
    }
  });
}

const motionFromMeme = async (m) => {
  const base = {
    kind: m.media_type,
    url: m.base_image_url || m.image_url,
    posterUrl: m.poster_url || null,
    width: m.width || 0,
    height: m.height || 0,
    duration: Number(m.duration_sec) || 0
  };
  if (!base.width) Object.assign(base, await probeRemote(base.url, base.kind));
  return base;
};

async function buildFromIntent(intent = {}) {
  const parent = intent.parent || null;
  const isMotionParent = parent && (parent.media_type === 'video' || parent.media_type === 'gif');
  const out = { title: intent.title || '', category: intent.category || parent?.category || 'dank', tip: '', error: '' };

  if (intent.mode === 'file' && intent.file) {
    const v = await validateFile(intent.file);
    if (!v.ok) return { ...out, error: v.error, doc: makeDoc() };
    out.tip = v.tip;
    if (v.kind === 'image') {
      out.doc = makeDoc({
        panels: [{ src: URL.createObjectURL(intent.file), blob: intent.file }],
        layers: [
          makeTextLayer({ slot: 'top', text: '', y: 0.1, h: 0.18 }),
          makeTextLayer({ slot: 'bottom', text: '', y: 0.89, h: 0.18 })
        ]
      });
    } else {
      out.doc = makeDoc({
        base: {
          kind: v.kind,
          file: intent.file,
          url: URL.createObjectURL(intent.file),
          width: v.probe.width,
          height: v.probe.height,
          duration: v.probe.duration
        },
        layers: [
          makeTextLayer({ slot: 'top', text: '', y: 0.1, h: 0.18 }),
          makeTextLayer({ slot: 'bottom', text: '', y: 0.89, h: 0.18 })
        ]
      });
    }
    return out;
  }
  if ((intent.mode === 'remix' || intent.mode === 'caption') && parent) {
    const src = parent.base_image_url || parent.image_url;
    const randPair = VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)] || [
      'WAIT A SECOND...',
      'PLOT TWIST UNLOCKED 💀'
    ];
    const fresh =
      intent.mode === 'remix'
        ? [
            makeTextLayer({ slot: 'top', text: 'WAIT A SECOND...', y: 0.1, h: 0.18 }),
            makeTextLayer({ slot: 'bottom', text: 'PLOT TWIST UNLOCKED 💀', y: 0.89, h: 0.18, fill: '#facc15' })
          ]
        : [
            makeTextLayer({ slot: 'top', text: randPair[0], y: 0.1, h: 0.18 }),
            makeTextLayer({ slot: 'bottom', text: randPair[1], y: 0.89, h: 0.18, fill: '#facc15' })
          ];
    // Plan 1.2: never prefix titles (prefixes stacked into "REMIX: REMIX: …"). The link to the
    // original is parent_meme_id; the title is the remixer's own caption (publish falls back to it).
    out.title = '';
    if (isMotionParent) {
      out.doc = makeDoc({ base: await motionFromMeme(parent), layers: fresh });
    } else {
      out.doc = makeDoc({ panels: [{ src }], layers: fresh });
    }
    return out;
  }
  if (intent.mode === 'bounty' && intent.bounty) {
    const b = intent.bounty;
    out.title = `BOUNTY: ${b.prompt}`;
    out.category = b.category || 'dank';
    const baseMeme = b.baseMeme;
    const layers = [
      makeTextLayer({ slot: 'top', text: b.defaultTop || 'WHEN THE BOUNTY DROPS', y: 0.1, h: 0.18 }),
      makeTextLayer({ slot: 'bottom', text: b.defaultBottom || '+200 XP INCOMING', y: 0.89, h: 0.18, fill: '#facc15' })
    ];
    if (baseMeme && (baseMeme.media_type === 'video' || baseMeme.media_type === 'gif')) {
      out.doc = makeDoc({ base: await motionFromMeme(baseMeme), layers });
    } else {
      out.doc = makeDoc({ panels: baseMeme ? [{ src: baseMeme.base_image_url || baseMeme.image_url }] : [], layers });
    }
    return out;
  }
  if (intent.mode === 'chaos' && intent.chaos) {
    const c = intent.chaos;
    out.title = c.top || '';
    const layers = [
      makeTextLayer({ slot: 'top', text: c.top, y: 0.1, h: 0.18 }),
      makeTextLayer({ slot: 'bottom', text: c.bottom, y: 0.89, h: 0.18, fill: '#facc15' }),
      ...(c.stickers || []).map((st, i) =>
        makeSticker({
          emoji: typeof st === 'string' ? st : st?.emoji || '🔥',
          x: i ? 0.78 : 0.22,
          y: 0.45,
          rot: i ? 14 : -12
        })
      )
    ];
    if (isMotionParent) {
      out.doc = makeDoc({ base: await motionFromMeme(parent), layers });
    } else {
      const chaosSrc = intent.imageUrl || parent?.base_image_url || parent?.image_url || '';
      out.doc = makeDoc({ panels: chaosSrc ? [{ src: chaosSrc }] : [], layers });
      out.doc.filter = typeof c.filter === 'string' ? c.filter : 'none';
    }
    return out;
  }
  if (intent.mode === 'template') {
    const tpl = getTemplateById(intent.templateId) || getTemplateBySlug(intent.templateSlug);
    if (tpl) {
      out.title = intent.title || '';
      out.category = tpl.category || 'dank';
      out.template = tpl;
      out.tip = `🖼️ ${tpl.name}: type in the boxes, or let the AI Caption Writer fill them in!`;
      out.doc = makeDoc({
        panels: [{ src: tpl.image }],
        layers: templateTextLayers(tpl, makeTextLayer, intent.texts || [])
      });
      return out;
    }
  }
  if (intent.mode === 'gif') {
    out.tip = '🎞️ Upload or drop any GIF to add Top & Bottom meme text!';
    out.doc = makeDoc();
    return out;
  }
  out.tip = '📸 Upload or paste (Ctrl+V) any image, GIF or short video, then type Top & Bottom text!';
  out.doc = makeDoc();
  return out;
}

/**
 * Simplified Classic Meme & GIF Maker:
 * Upload or drop an image/GIF, add Top & Bottom text, download or share with www.thememes.net watermark.
 */
export default function MemeForge({ intent, user, onClose, onPublish, onRequireAuth, onBrowseTemplates }) {
  const editor = useMemeEditor(makeDoc());
  const { doc, set, live, undo, redo, reset, selectedId, setSelectedId } = editor;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('dank');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [activePanel, setActivePanel] = useState(0);
  const [imageVersion, setImageVersion] = useState(0);
  const [images, setImages] = useState(() => new Map());
  const [template, setTemplate] = useState(null);
  const inFlightRef = useRef(new Set());
  const fileRef = useRef(null);
  const stickerRef = useRef(null);
  const parent = intent?.parent || null;
  const generation = parent && intent.mode !== 'bounty' ? (parent.generation || 0) + 1 : 0;
  const author = user?.username || 'AnonMemer';

  // Init from intent + offer draft restore
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await buildFromIntent(intent);
      if (cancelled) return;
      reset(res.doc);
      setTitle(res.title);
      setCategory(res.category);
      setError(res.error);
      setStatus(res.tip);
      setTemplate(res.template || null);
      const firstText = res.doc?.layers?.find((l) => l.type === 'text');
      if (firstText) setSelectedId(firstText.id);
      const saved = await loadDraft();
      if (!cancelled && saved?.doc) setDraft(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, reset, setSelectedId]);

  // Load images referenced by panels + PNG stickers
  useEffect(() => {
    const srcs = [...doc.panels.map((p) => p.src), ...doc.layers.map((l) => l.src)].filter(Boolean);
    srcs.forEach((src) => {
      if (inFlightRef.current.has(src)) return;
      inFlightRef.current.add(src);
      loadImg(src)
        .then((img) => {
          setImages((prev) => {
            const next = new Map(prev);
            next.set(src, img);
            return next;
          });
          setImageVersion((v) => v + 1);
          live((d) => ({
            ...d,
            panels: d.panels.map((p) =>
              p.src === src && !p.natW ? { ...p, natW: img.naturalWidth, natH: img.naturalHeight } : p
            )
          }));
        })
        .catch(() => {
          inFlightRef.current.delete(src);
          setError('⚠️ Could not load that image (CORS or deleted).');
        });
    });
  }, [doc.panels, doc.layers, live]);

  const selected = doc.layers.find((l) => l.id === selectedId) || null;
  const hasMedia = Boolean(doc.base) || doc.panels.some((p) => p.src);
  // D-003 C5: label the canvas when a house AI picture is the background.
  const usesAiPicture = doc.panels.some((p) => isAiTemplateImage(p.src));

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    set((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, set, setSelectedId]);

  const handleMediaFile = useCallback(
    async (file, panelIdx = activePanel) => {
      if (!file) return;
      const v = await validateFile(file);
      if (!v.ok) {
        setError(v.error);
        return;
      }
      setError('');
      setStatus(v.tip || '');
      sfx.playMutate();
      if (v.kind === 'image') {
        const src = URL.createObjectURL(file);
        set((d) => ({
          ...d,
          base: null,
          panels: d.panels.map((p, i) =>
            i === panelIdx
              ? { ...p, src, blob: file, zoom: 1, panX: 0, panY: 0, rot: 0, flipX: false, natW: 0, natH: 0 }
              : p
          ),
          layers:
            d.layers.length > 0
              ? d.layers
              : [
                  makeTextLayer({ slot: 'top', text: '', y: 0.1, h: 0.18 }),
                  makeTextLayer({ slot: 'bottom', text: '', y: 0.89, h: 0.18 })
                ]
        }));
      } else {
        const base = {
          kind: v.kind,
          file,
          url: URL.createObjectURL(file),
          width: v.probe.width,
          height: v.probe.height,
          duration: v.probe.duration
        };
        set((d) => ({
          ...makeDoc({
            base,
            layers:
              d.layers.length > 0
                ? d.layers
                : [
                    makeTextLayer({ slot: 'top', text: '', y: 0.1, h: 0.18 }),
                    makeTextLayer({ slot: 'bottom', text: '', y: 0.89, h: 0.18 })
                  ]
          }),
          filter: 'none'
        }));
      }
    },
    [activePanel, set]
  );

  // Keyboard: undo/redo, delete, arrow nudge, paste
  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(e.target?.tagName || '');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        redo();
      } else if (!typing && (e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeSelected();
      } else if (!typing && selectedId && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 0.02 : 0.005;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        set((d) => ({
          ...d,
          layers: d.layers.map((l) => (l.id === selectedId ? { ...l, x: l.x + dx, y: l.y + dy } : l))
        }));
      } else if (e.key === 'Escape' && !typing) {
        onClose();
      }
    };
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type?.startsWith('image/') || item.type?.startsWith('video/')) {
          const f = item.getAsFile?.();
          if (f) {
            e.preventDefault();
            handleMediaFile(f);
            break;
          }
        }
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [undo, redo, selectedId, removeSelected, set, onClose, handleMediaFile]);

  const handleStickerFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      const s = Math.min(1, 384 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * s);
      c.height = Math.round(img.naturalHeight * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const src = c.toDataURL('image/png');
      const aspect = c.width / c.height;
      const layer = makeSticker({ emoji: '', src, w: 0.3, h: (0.3 * aspect > 0 ? 0.3 / aspect : 0.3) * docRatio(doc) });
      set((d) => ({ ...d, layers: [...d.layers, layer] }));
      setSelectedId(layer.id);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const exportStill = async (withWatermark = true, exportDoc = doc) => {
    await ensureFontsLoaded(exportDoc.layers);
    return renderDocToCanvas(exportDoc, images, { width: 1080, watermark: withWatermark });
  };

  const getEffectiveLayers = (layersList = doc.layers) => {
    if (hasVisibleOverlayContent(layersList)) return layersList;
    if (title.trim()) return buildFallbackCaptionLayers(title.trim());
    return [];
  };

  const buildWatermarkedExport = async (progressLabel) => {
    const isGif = doc.base?.kind === 'gif';
    if (isGif) {
      setStatus(`🎞️ ${progressLabel} GIF with www.thememes.net watermark… 0%`);
    }
    const effectiveLayers = getEffectiveLayers(doc.layers);
    const exportDoc = effectiveLayers === doc.layers ? doc : { ...doc, layers: effectiveLayers };
    return exportMemeWithWatermark(
      doc.base
        ? {
            kind: doc.base.kind,
            file: doc.base.file || null,
            url: doc.base.url,
            doc: exportDoc,
            images,
            layers: effectiveLayers,
            filter: doc.filter,
            title: title.trim()
          }
        : { kind: 'image', doc: exportDoc, images, title: title.trim() },
      {
        watermark: true,
        captionText: title.trim(),
        onProgress: (p) => {
          if (isGif) setStatus(`🎞️ ${progressLabel} GIF… ${Math.round(p * 100)}%`);
        }
      }
    );
  };

  const handleDownload = async () => {
    if (!hasMedia) return;
    setBusy(true);
    setError('');
    try {
      const res = await buildWatermarkedExport('Encoding');
      if (res?.blob) {
        triggerBlobDownload(res.blob, res.filename);
        setStatus(
          doc.base?.kind === 'gif'
            ? '✅ Animated GIF downloaded with captions & www.thememes.net watermark!'
            : '✅ Meme downloaded with www.thememes.net watermark!'
        );
        sfx.playPop(2);
      } else if (doc.base?.url) {
        window.open(doc.base.url, '_blank', 'noopener');
      }
    } catch {
      if (doc.base?.file) {
        triggerBlobDownload(doc.base.file, `thememes-net-${Date.now()}.${doc.base.kind === 'gif' ? 'gif' : 'mp4'}`);
        setStatus('⚠️ Saved original file (browser could not re-encode remote media).');
      } else {
        setError('⚠️ Could not export that media right now.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!hasMedia) return;
    setBusy(true);
    setError('');
    try {
      const res = await buildWatermarkedExport('Preparing');
      const fallbackText = (doc.layers || [])
        .filter((l) => l.type === 'text' && l.text?.trim())
        .map((l) => l.text.trim())
        .join(' — ');
      const outcome = await shareExportedMeme({
        blob: res?.blob || null,
        filename: res?.filename || `thememes-net-${Date.now()}.png`,
        title: title.trim() || fallbackText || 'Fresh Meme',
        text: `${title.trim() || fallbackText || 'Fresh Meme'} ⚡`,
        url: typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net'
      });
      if (outcome.method === 'files' || outcome.method === 'url') {
        setStatus('✅ Shared with www.thememes.net watermark!');
        sfx.playPop(2);
      } else if (outcome.method === 'download') {
        setStatus('💾 Downloaded watermarked file & copied www.thememes.net link to share anywhere!');
        sfx.playPop(2);
      }
    } catch {
      setError('⚠️ Share failed — try Download instead.');
    } finally {
      setBusy(false);
    }
  };

  const handleBurnIn = async () => {
    if (doc.base?.kind !== 'video') return;
    setBusy(true);
    setStatus('🔥 Burning captions into video… keep this tab open.');
    try {
      const res = await burnInVideo(doc.base.url, doc.layers, images, (p) =>
        setStatus(`🔥 Burning in… ${Math.round(p * 100)}%`)
      );
      if (!res?.blob) setStatus('⚠️ Burn-in not supported in this browser. Captions stay as an overlay.');
      else {
        triggerBlobDownload(res.blob, `thememes-net-${Date.now()}.${res.ext}`);
        setStatus(`✅ Video saved (${res.ext.toUpperCase()}) with the thememes.net logo burned in!`);
      }
    } catch {
      setStatus('⚠️ Burn-in failed (video may block cross-origin capture).');
    } finally {
      setBusy(false);
    }
  };

  const handleRandomizeCaption = useCallback(() => {
    sfx.playBoing(2);
    if (template?.examples?.length) {
      const ex = template.examples[Math.floor(Math.random() * template.examples.length)];
      set((d) => {
        let i = 0;
        return { ...d, layers: d.layers.map((l) => (l.type === 'text' && l.label ? { ...l, text: ex[i++] ?? '' } : l)) };
      });
      setStatus('🎲 Loaded an example caption. Make it your own!');
      return;
    }
    const pair = VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)] || [
      'WHEN THE CODE COMPILES',
      'ZERO ERRORS ON FIRST TRY'
    ];
    const topLayer = makeTextLayer({ slot: 'top', text: pair[0], y: 0.1, h: 0.18, fill: '#ffffff' });
    const botLayer = makeTextLayer({ slot: 'bottom', text: pair[1], y: 0.89, h: 0.18, fill: '#ffffff' });
    set((d) => {
      const nonText = d.layers.filter((l) => l.type !== 'text');
      return {
        ...d,
        layers: [topLayer, botLayer, ...nonText]
      };
    });
    setSelectedId(topLayer.id);
    setTitle(`${pair[0]} — ${pair[1]}`);
    setStatus('🎲 Loaded a random meme caption!');
  }, [set, setSelectedId, template]);

  // AI Caption Writer: put one top/bottom option onto the meme, keeping the current text style.
  const applyCaption = useCallback(
    (option) => {
      sfx.playPop?.(2);
      const lines = Array.isArray(option?.lines) && option.lines.length ? option.lines : [option?.top || '', option?.bottom || ''];
      const top = lines[0] || '';
      const bottom = lines.length > 1 ? lines[lines.length - 1] : '';
      let firstId = null;
      // Template with labelled caption boxes: fill them in order.
      if (template) {
        set((d) => {
          let i = 0;
          const layers = d.layers.map((l) => (l.type === 'text' && l.label ? { ...l, text: lines[i++] ?? '' } : l));
          firstId = layers.find((l) => l.type === 'text')?.id || null;
          return { ...d, layers };
        });
        if (firstId) setSelectedId(firstId);
        setTitle((t) => t || lines.filter(Boolean).join(' — ').slice(0, 100));
        setStatus('🤖 AI caption added! Tap another option or edit the text.');
        return;
      }
      set((d) => {
        const texts = d.layers.filter((l) => l.type === 'text');
        const byY = [...texts].sort((a, b) => (a.y ?? 0.5) - (b.y ?? 0.5));
        const topL = texts.find((l) => l.slot === 'top') || byY[0] || null;
        const botL =
          texts.find((l) => l.slot === 'bottom') || (byY.length > 1 ? byY[byY.length - 1] : null);
        let layers = d.layers.map((l) => {
          if (topL && l.id === topL.id) return { ...l, text: top };
          if (botL && l.id === botL.id) return { ...l, text: bottom };
          return l;
        });
        if (!topL) layers = [makeTextLayer({ slot: 'top', text: top, y: 0.1, h: 0.18, fill: '#ffffff' }), ...layers];
        if (!botL) layers = [...layers, makeTextLayer({ slot: 'bottom', text: bottom, y: 0.89, h: 0.18, fill: '#ffffff' })];
        firstId = (topL || layers.find((l) => l.type === 'text'))?.id || null;
        return { ...d, layers };
      });
      if (firstId) setSelectedId(firstId);
      setTitle((t) => t || [top, bottom].filter(Boolean).join(' — ').slice(0, 100));
      setStatus('🤖 AI caption added! Tap another option or edit the text.');
    },
    [set, setSelectedId, template]
  );

  const handlePublish = async (e) => {
    e?.preventDefault?.();
    if (!hasMedia) {
      setError('📸 Upload, drop, or paste (Ctrl+V) an image, GIF or video first!');
      return;
    }
    if (!PUBLIC_UPLOADS_ENABLED) {
      setError('');
      setStatus(UPLOADS_PAUSED_MESSAGE);
      return;
    }
    setBusy(true);
    setError('');
    setStatus(CHECKING_MESSAGE);
    try {
      const rawCleanLayers = doc.layers.map((l) => {
        const rest = { ...l };
        delete rest.blob;
        return rest;
      });
      const cleanLayers = getEffectiveLayers(rawCleanLayers);
      const exportDoc =
        cleanLayers.length && !hasVisibleOverlayContent(doc.layers)
          ? { ...doc, layers: cleanLayers }
          : doc;
      let media;
      let overlay;
      if (doc.base) {
        let uploadFile = doc.base.file || null;
        let posterBlob = null;
        let burnedMotion = false;

        if (doc.base.kind === 'gif' && cleanLayers.length && (uploadFile || doc.base.url)) {
          try {
            const burnedGif = await burnInAnimatedGif(
              uploadFile || doc.base.url,
              exportDoc,
              images,
              { watermark: true }
            );
            if (burnedGif) {
              uploadFile = new File([burnedGif], `meme-${Date.now()}.gif`, { type: 'image/gif' });
              burnedMotion = true;
            }
          } catch {
            // Fall back to raw GIF + non-destructive overlay if remote CORS blocks fetch
          }
        }

        if (doc.base.kind === 'gif' && cleanLayers.length) {
          try {
            const posterSource =
              doc.base.posterUrl || (uploadFile ? await makePoster(uploadFile, doc.base.kind) : null);
            if (posterSource) {
              posterBlob = await renderStillImageBlob(posterSource, cleanLayers, { watermark: true });
            }
          } catch {
            posterBlob = null;
          }
        }

        media = {
          kind: doc.base.kind,
          file: uploadFile,
          url: uploadFile ? null : doc.base.url,
          posterUrl: doc.base.file ? null : doc.base.posterUrl,
          posterBlob,
          width: doc.base.width,
          height: doc.base.height,
          duration: doc.base.duration,
          // 36.V: videos are re-recorded in the browser before upload; show progress.
          onProgress:
            doc.base.kind === 'video'
              ? (p, stage) =>
                  setStatus(
                    stage === 'preparing'
                      ? `🎬 Getting your video ready… ${Math.round(p * 100)}% (keep this open)`
                      : stage === 'uploading'
                        ? '📤 Uploading your video…'
                        : CHECKING_MESSAGE
                  )
              : undefined
        };
        overlay = burnedMotion
          ? { v: 1, burned: true, layers: cleanLayers }
          : { v: 1, layers: cleanLayers };
      } else {
        const full = await exportStill(false, exportDoc);
        const blob = await canvasToCompressedBlob(full);
        const clean = renderDocToCanvas({ ...doc, layers: [] }, images, { width: 1080, withLayers: false });
        const baseBlob = await canvasToCompressedBlob(clean);
        media = { kind: 'image', blob, baseBlob, width: full.width, height: full.height };
        overlay = { v: 1, burned: true, layers: cleanLayers };
      }
      const fallbackCaption = cleanLayers
        .filter((l) => l.type === 'text')
        .map((l) => l.text)
        .join(' — ')
        .slice(0, 120);
      await onPublish({
        media,
        overlay,
        meta: { title: title.trim() || fallbackCaption || `Community Upload by @${author}`, category, isSpoiler },
        intent
      });
      clearDraft();
      onClose();
    } catch (err) {
      setError(
        err?.message === UPLOADS_PAUSED_ERROR
          ? UPLOADS_PAUSED_MESSAGE
          : publishErrorMessage(err)
          ? publishErrorMessage(err)
          : err?.message === 'OFFLINE_VIDEO'
          ? '📡 Connect to publish video — video & GIF memes need the live server. Try again when online.'
          : err?.message === 'COOLDOWN'
            ? '⏳ Cool your jets, speed racer. Try again in a few sec.'
            : `⚠️ Publish failed: ${err?.message || 'unknown error'}`
      );
    } finally {
      setBusy(false);
    }
  };

  const tools = useMemo(
    () => ({
      handleMediaFile,
      handleRandomizeCaption,
      applyCaption,
      templateHint: template?.aiHint || parent?.title || intent?.title || '',
      templateSlots: template ? template.slots.map((s) => s.label) : null,
      requireAuth: onRequireAuth,
      browseTemplates: onBrowseTemplates,
      removeSelected,
      openFile: () => fileRef.current?.click(),
      openSticker: () => stickerRef.current?.click()
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePanel, removeSelected, handleRandomizeCaption, applyCaption, onRequireAuth, onBrowseTemplates, template]
  );

  const handleDropFile = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) handleMediaFile(f);
  };

  return (
    <div className="tm-modal-backdrop tm-forge-backdrop" onClick={onClose}>
      <div
        className="tm-forge"
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropFile}
        role="dialog"
        aria-label="Meme & GIF Maker"
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_MEDIA}
          style={{ display: 'none' }}
          onChange={(e) => {
            handleMediaFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={stickerRef}
          type="file"
          accept="image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleStickerFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <header className="tm-forge-head">
          <strong>
            🎨 MEME &amp; GIF MAKER
            {intent?.mode === 'remix' && <span className="tm-forge-chip">🧬 GEN-{generation} REMIX</span>}
            {intent?.mode === 'caption' && <span className="tm-forge-chip">✏️ CAPTION THIS</span>}
            {intent?.mode === 'bounty' && <span className="tm-forge-chip">🎯 CAPTION BATTLE</span>}
          </strong>
          <div className="tm-forge-head-actions">
            <button type="button" className="tm-btn" onClick={undo} disabled={!editor.canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
              ↶
            </button>
            <button type="button" className="tm-btn" onClick={redo} disabled={!editor.canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
              ↷
            </button>
            <button type="button" className="tm-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>

        {draft && (
          <div className="tm-forge-draft">
            💾 Restore draft from {new Date(draft.savedAt).toLocaleString()}?
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={() => {
                reset(hydrate(draft.doc));
                setDraft(null);
              }}
            >
              Restore
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={() => {
                clearDraft();
                setDraft(null);
              }}
            >
              Discard
            </button>
          </div>
        )}

        {/* Phones: this column scrolls as one, with the preview (.tm-forge-main) pinned on top,
            so tools, House Rules and the publish row never squeeze or cover the meme. */}
        <div className="tm-forge-scroll">
        <div className="tm-forge-body">
          <div className="tm-forge-main">
            {!hasMedia ? (
              <div
                className="tm-forge-upload-hub"
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
              >
                <span style={{ fontSize: 34 }}>📸</span>
                <strong className="tm-forge-upload-title">Upload, Drop, or Paste an Image or GIF</strong>
                <span className="tm-forge-upload-sub">
                  Add classic Top &amp; Bottom meme text in seconds — shares &amp; downloads stamp a clean{' '}
                  <code>www.thememes.net</code> watermark.
                </span>
                <button type="button" className="tm-btn tm-btn-primary">
                  Choose Image / GIF
                </button>
              </div>
            ) : (
              <ForgeStage
                editor={editor}
                images={images}
                imageVersion={imageVersion}
                onPanelTap={(idx) => {
                  setActivePanel(idx);
                  fileRef.current?.click();
                }}
              />
            )}
            {hasMedia && usesAiPicture && <p className="tm-forge-ai-note">{AI_BATTLE_IMAGE_LABEL}</p>}
            {(error || status) && (
              <div className={`tm-forge-msg ${error ? 'err' : ''}`} role="status" aria-live="polite">
                {error || status}
                {error && error === publishErrorMessage({ message: 'rejected' }) && (
                  <>
                    {' '}
                    <a href={RULES_PATH}>Read the House Rules</a>
                  </>
                )}
              </div>
            )}
          </div>

          <ForgeToolPanel
            editor={editor}
            hasMedia={hasMedia}
            selected={selected}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            tools={tools}
          />
        </div>

        <p className="tm-house-rules-line" style={{ padding: '6px 14px 0' }}>
          By posting you agree to the <a href={RULES_PATH}>House Rules</a> and <a href="/terms">Terms</a>, including that your meme can be shared on other sites with the thememes.net logo. No nudity, no hate, no
          personal info, nothing you don&apos;t have the right to share.
        </p>

        <form className="tm-forge-publish" onSubmit={handlePublish}>
          <input className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
          <CategorySelect value={category} onChange={setCategory} />
          <label className="tm-forge-check">
            <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} /> 🌶️ Spoiler
          </label>
          <button type="button" className="tm-btn" onClick={handleDownload} disabled={!hasMedia || busy}>
            {doc.base?.kind === 'gif' ? '🎞️ Download GIF' : '⬇ Download'}
          </button>
          <button type="button" className="tm-btn" onClick={handleShare} disabled={!hasMedia || busy}>
            📤 Share
          </button>
          {doc.base?.kind === 'video' && (
            <button type="button" className="tm-btn" onClick={handleBurnIn} disabled={busy}>
              🔥 Burn-in
            </button>
          )}
          <button type="submit" className="tm-btn tm-btn-primary" disabled={!hasMedia || busy}>
            {busy ? '⏳ Publishing…' : '🚀 Publish'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
