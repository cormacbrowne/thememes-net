import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMemeEditor from '../../hooks/useMemeEditor';
import ForgeStage from './ForgeStage';
import ForgeToolPanel from './ForgeToolPanel';
import { loadDraft, clearDraft, hydrate } from './draftStore';
import {
  makeDoc,
  makeTextLayer,
  makeSticker,
  layoutById,
  renderDocToCanvas,
  ensureFontsLoaded,
  loadImg,
  docRatio,
  burnInVideo
} from './forgeEngine';
import {
  ACCEPT_MEDIA,
  validateFile,
  canvasToCompressedBlob,
  extFor,
  guessContentType
} from '../../utils/mediaPipeline';
import { sfx } from '../../utils/soundEngine';

const CATEGORIES = [
  ['dank', '#DANK / FUNNY'],
  ['relatable', '#RELATABLE / LIFE'],
  ['gaming', '#GAMING'],
  ['tech', '#TECH / CODING']
];

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
    url: m.image_url,
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
      out.doc = makeDoc({ panels: [{ src: URL.createObjectURL(intent.file), blob: intent.file }] });
    } else {
      out.doc = makeDoc({
        base: {
          kind: v.kind,
          file: intent.file,
          url: URL.createObjectURL(intent.file),
          width: v.probe.width,
          height: v.probe.height,
          duration: v.probe.duration
        }
      });
    }
    return out;
  }
  if ((intent.mode === 'remix' || intent.mode === 'caption') && parent) {
    const fresh =
      intent.mode === 'remix'
        ? [makeTextLayer({ text: 'WAIT A SECOND...', y: 0.1, h: 0.18 }), makeTextLayer({ text: 'PLOT TWIST UNLOCKED 💀', y: 0.9, h: 0.18 })]
        : layoutById('classic').layers();
    out.title = intent.mode === 'remix' ? `REMIX: ${parent.title || 'Untitled'}` : `Caption This: ${parent.title || ''}`.trim();
    if (isMotionParent) {
      out.doc = makeDoc({ base: await motionFromMeme(parent), layers: fresh });
    } else {
      const src = intent.mode === 'caption' ? parent.base_image_url || parent.image_url : parent.image_url;
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
      makeTextLayer({ text: b.defaultTop || 'WHEN THE BOUNTY DROPS', y: 0.1, h: 0.18 }),
      makeTextLayer({ text: b.defaultBottom || '+200 XP INCOMING', y: 0.9, h: 0.18 })
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
    out.title = `REMIX: ${c.top}`;
    const layers = [
      makeTextLayer({ text: c.top, y: 0.1, h: 0.18 }),
      makeTextLayer({ text: c.bottom, y: 0.9, h: 0.18, fill: '#facc15' }),
      ...(c.stickers || []).map((emoji, i) => makeSticker({ emoji, x: i ? 0.78 : 0.22, y: 0.45, rot: i ? 14 : -12 }))
    ];
    if (isMotionParent) {
      out.doc = makeDoc({ base: await motionFromMeme(parent), layers });
    } else {
      out.doc = makeDoc({ panels: parent ? [{ src: parent.image_url }] : [], layers });
      out.doc.filter = c.filter || 'none';
    }
    return out;
  }
  out.doc = makeDoc();
  return out;
}

/**
 * PHASE 26: MEME FORGE 3.0 — unlimited layers, font pack, layouts, image tools, stickers,
 * undo/redo, IndexedDB drafts, mobile bottom sheet, video/GIF captions (non-destructive).
 */
export default function MemeForge({ intent, user, onClose, onPublish }) {
  const editor = useMemeEditor(makeDoc());
  const { doc, set, live, undo, redo, reset, selectedId, setSelectedId } = editor;
  const [tab, setTab] = useState('text');
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
      const saved = await loadDraft();
      if (!cancelled && saved?.doc) setDraft(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, reset]);

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

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    set((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, set, setSelectedId]);

  // Keyboard: undo/redo, delete, arrow nudge
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedId, removeSelected, set, onClose]);

  const handleMediaFile = async (file, panelIdx = activePanel) => {
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
          i === panelIdx ? { ...p, src, blob: file, zoom: 1, panX: 0, panY: 0, rot: 0, flipX: false, natW: 0, natH: 0 } : p
        )
      }));
    } else {
      const base = { kind: v.kind, file, url: URL.createObjectURL(file), width: v.probe.width, height: v.probe.height, duration: v.probe.duration };
      set((d) => ({ ...makeDoc({ base, layers: d.layers }), filter: 'none' }));
    }
  };

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

  const exportStill = async (withWatermark = true) => {
    await ensureFontsLoaded(doc.layers);
    return renderDocToCanvas(doc, images, { width: 1080, watermark: withWatermark ? { generation, author } : null });
  };

  const downloadBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const handleDownload = async () => {
    if (!hasMedia) return;
    if (doc.base) {
      if (doc.base.file) {
        const ct = guessContentType(doc.base.file, doc.base.kind);
        downloadBlob(doc.base.file, `thememes-net-${Date.now()}.${extFor(ct)}`);
      } else {
        window.open(doc.base.url, '_blank', 'noopener');
      }
      return;
    }
    const c = await exportStill(true);
    c.toBlob((b) => b && downloadBlob(b, `thememes-net-${Date.now()}.png`), 'image/png');
    sfx.playPop(2);
  };

  const handleBurnIn = async () => {
    if (doc.base?.kind !== 'video') return;
    setBusy(true);
    setStatus('🔥 Burning captions into video… keep this tab open.');
    try {
      const blob = await burnInVideo(doc.base.url, doc.layers, images, (p) =>
        setStatus(`🔥 Burning in… ${Math.round(p * 100)}%`)
      );
      if (!blob) setStatus('⚠️ Burn-in not supported in this browser. Captions stay as an overlay.');
      else {
        downloadBlob(blob, `thememes-net-${Date.now()}.webm`);
        setStatus('✅ Burned-in WebM downloaded!');
      }
    } catch {
      setStatus('⚠️ Burn-in failed (video may block cross-origin capture).');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (e) => {
    e?.preventDefault?.();
    if (!hasMedia) {
      setError('📸 Upload, paste (Ctrl+V), or snap your own photo, GIF or video first — all memes are 100% user-made!');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const cleanLayers = doc.layers.map((l) => {
        const rest = { ...l };
        delete rest.blob;
        return rest;
      });
      let media;
      let overlay;
      if (doc.base) {
        media = {
          kind: doc.base.kind,
          file: doc.base.file || null,
          url: doc.base.file ? null : doc.base.url,
          posterUrl: doc.base.file ? null : doc.base.posterUrl,
          width: doc.base.width,
          height: doc.base.height,
          duration: doc.base.duration
        };
        overlay = { v: 1, layers: cleanLayers };
      } else {
        const full = await exportStill(true);
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
        err?.message === 'OFFLINE_VIDEO'
          ? '📡 Connect to publish video — video & GIF memes need the live server. Try again when online.'
          : err?.message === 'COOLDOWN'
            ? '⏳ Arcade Cooldown: wait a few seconds between publishes.'
            : `⚠️ Publish failed: ${err?.message || 'unknown error'}`
      );
    } finally {
      setBusy(false);
    }
  };

  const tools = useMemo(
    () => ({ handleMediaFile, removeSelected, openFile: () => fileRef.current?.click(), openSticker: () => stickerRef.current?.click() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePanel, removeSelected]
  );

  return (
    <div className="tm-modal-backdrop tm-forge-backdrop" onClick={onClose}>
      <div className="tm-forge" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Meme Forge 3.0">
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
            ⚒️ MEME FORGE 3.0
            {intent?.mode === 'remix' && <span className="tm-forge-chip">🧬 GEN-{generation} REMIX</span>}
            {intent?.mode === 'caption' && <span className="tm-forge-chip">✏️ CAPTION THIS</span>}
            {intent?.mode === 'bounty' && <span className="tm-forge-chip">🎯 CAPTION BATTLE</span>}
          </strong>
          <div className="tm-forge-head-actions">
            <button type="button" className="tm-btn" onClick={undo} disabled={!editor.canUndo} title="Undo (Ctrl+Z)">
              ↶
            </button>
            <button type="button" className="tm-btn" onClick={redo} disabled={!editor.canRedo} title="Redo (Ctrl+Shift+Z)">
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

        <div className="tm-forge-body">
          <div className="tm-forge-main">
            {!hasMedia && (
              <button type="button" className="tm-forge-empty" onClick={() => fileRef.current?.click()}>
                📸 Upload photo, GIF or video (MP4 ≤60s) — or paste with Ctrl+V
              </button>
            )}
            <ForgeStage
              editor={editor}
              images={images}
              imageVersion={imageVersion}
              tab={tab}
              onPanelTap={(idx) => {
                setActivePanel(idx);
                fileRef.current?.click();
              }}
            />
            {(error || status) && <div className={`tm-forge-msg ${error ? 'err' : ''}`}>{error || status}</div>}
          </div>

          <ForgeToolPanel
            editor={editor}
            tab={tab}
            setTab={setTab}
            selected={selected}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            tools={tools}
          />
        </div>

        <form className="tm-forge-publish" onSubmit={handlePublish}>
          <input className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title (optional)" />
          <select className="tm-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="tm-forge-check">
            <input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} /> 🌶️ Spoiler
          </label>
          <button type="button" className="tm-btn" onClick={handleDownload} disabled={!hasMedia}>
            ⬇ Download
          </button>
          {doc.base?.kind === 'video' && (
            <button type="button" className="tm-btn" onClick={handleBurnIn} disabled={busy}>
              🔥 Burn-in &amp; Download
            </button>
          )}
          <button type="submit" className="tm-btn tm-btn-primary" disabled={busy}>
            {busy ? '⏳ Publishing…' : '🚀 Publish'}
          </button>
        </form>
      </div>
    </div>
  );
}
