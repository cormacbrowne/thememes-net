import { useEffect, useRef } from 'react';
import { LayerView } from '../MemeOverlay';
import useBoxSize from '../../hooks/useBoxSize';
import { docRatio, drawBase, panelRects } from './forgeEngine';

/**
 * Interactive Forge stage: base canvas (or motion media) + draggable/resizable/rotatable layers.
 * Supports pinch-to-scale and two-finger rotate on touch.
 */
export default function ForgeStage({ editor, images, tab, onPanelTap, imageVersion }) {
  const { doc, live, beginGesture, endGesture, selectedId, setSelectedId } = editor;
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const { W, H } = useBoxSize(boxRef);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const ratio = docRatio(doc);
  const motion = doc.base;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || motion || !W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const safeW = Math.min(1200, Math.max(1, W));
    const safeH = Math.min(1200, Math.max(1, H));
    c.width = Math.round(safeW * dpr);
    c.height = Math.round(safeH * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBase(ctx, safeW, safeH, doc, images, { emptyHint: true });
  }, [doc, images, imageVersion, W, H, motion]);

  const toLocal = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const panelAt = (pt) => {
    const { panels } = panelRects(doc, 1, 1);
    return panels.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
  };

  const startLayerGesture = (e, layer, kind) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSelectedId(layer.id);
    pointers.current.set(e.pointerId, toLocal(e));
    if (!gesture.current) beginGesture();
    const pts = [...pointers.current.values()];
    gesture.current = {
      kind: pts.length >= 2 ? 'pinch' : kind,
      id: layer.id,
      start: layer,
      p0: pts[0],
      dist0: pts.length >= 2 ? Math.hypot(pts[1].x * W - pts[0].x * W, pts[1].y * H - pts[0].y * H) : 0,
      ang0: pts.length >= 2 ? Math.atan2((pts[1].y - pts[0].y) * H, (pts[1].x - pts[0].x) * W) : 0
    };
  };

  const startStageGesture = (e) => {
    if (e.target.closest('.tm-ov-layer')) return;
    setSelectedId(null);
    if (motion) return;
    const pt = toLocal(e);
    const idx = panelAt(pt);
    if (idx < 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, pt);
    beginGesture();
    gesture.current = { kind: 'pan', idx, p0: pt, start: doc.panels[idx], moved: false };
  };

  const onMove = (e) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toLocal(e));
    const pts = [...pointers.current.values()];
    const p = pts[0];
    const dx = p.x - g.p0.x;
    const dy = p.y - g.p0.y;
    const patchLayer = (patch) =>
      live((d) => ({ ...d, layers: d.layers.map((l) => (l.id === g.id ? { ...l, ...patch } : l)) }));
    if (g.kind === 'move') {
      patchLayer({ x: g.start.x + dx, y: g.start.y + dy });
    } else if (g.kind === 'resize') {
      patchLayer({ w: Math.max(0.05, g.start.w + dx * 2), h: Math.max(0.04, g.start.h + dy * 2) });
    } else if (g.kind === 'rotate') {
      const ang = Math.atan2((p.y - g.start.y) * H, (p.x - g.start.x) * W);
      let deg = (ang * 180) / Math.PI + 90;
      if (Math.abs(deg % 90) < 4) deg = Math.round(deg / 90) * 90;
      patchLayer({ rot: Math.round(deg) });
    } else if (g.kind === 'pinch' && pts.length >= 2) {
      const dist = Math.hypot((pts[1].x - pts[0].x) * W, (pts[1].y - pts[0].y) * H);
      const ang = Math.atan2((pts[1].y - pts[0].y) * H, (pts[1].x - pts[0].x) * W);
      const s = g.dist0 ? dist / g.dist0 : 1;
      patchLayer({
        w: Math.max(0.05, g.start.w * s),
        h: Math.max(0.04, g.start.h * s),
        rot: Math.round((g.start.rot || 0) + ((ang - g.ang0) * 180) / Math.PI)
      });
    } else if (g.kind === 'pan') {
      if (Math.abs(dx) + Math.abs(dy) > 0.01) g.moved = true;
      if (!g.start.src) return;
      const { panels } = panelRects(doc, 1, 1);
      const r = panels[g.idx];
      live((d) => ({
        ...d,
        panels: d.panels.map((pp, i) =>
          i === g.idx
            ? {
                ...pp,
                panX: Math.max(-1, Math.min(1, g.start.panX + (dx / r.w) * 2)),
                panY: Math.max(-1, Math.min(1, g.start.panY + (dy / r.h) * 2))
              }
            : pp
        )
      }));
    }
  };

  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size === 0) {
      if (g.kind === 'pan' && !g.moved && (tab === 'layout' || tab === 'image' || !g.start.src)) {
        onPanelTap(g.idx);
      }
      gesture.current = null;
      endGesture();
    } else if (g.kind === 'pinch') {
      gesture.current = { ...g, kind: 'move', p0: [...pointers.current.values()][0] };
    }
  };

  const onWheel = (e) => {
    if (motion) return;
    const idx = panelAt(toLocal(e));
    if (idx < 0 || !doc.panels[idx]?.src) return;
    live((d) => ({
      ...d,
      panels: d.panels.map((pp, i) =>
        i === idx ? { ...pp, zoom: Math.max(1, Math.min(5, (pp.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92))) } : pp
      )
    }));
  };

  return (
    <div className="tm-forge-stage-wrap">
      <div
        ref={boxRef}
        className="tm-forge-stage"
        style={{ aspectRatio: `${ratio}` }}
        onPointerDown={startStageGesture}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
      >
        {motion ? (
          motion.kind === 'video' ? (
            <video
              src={motion.url}
              poster={motion.posterUrl || undefined}
              muted
              loop
              autoPlay
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <img
              src={motion.url}
              alt="GIF base"
              draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )
        ) : (
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          />
        )}
        {W > 0 &&
          doc.layers.map((l) => (
            <LayerView
              key={l.id}
              layer={l}
              W={W}
              H={H}
              className={`tm-forge-layer ${selectedId === l.id ? 'selected' : ''}`}
              onPointerDown={(e) => startLayerGesture(e, l, 'move')}
            >
              {selectedId === l.id && (
                <>
                  <span className="tm-forge-handle rotate" onPointerDown={(e) => startLayerGesture(e, l, 'rotate')} />
                  <span className="tm-forge-handle resize" onPointerDown={(e) => startLayerGesture(e, l, 'resize')} />
                </>
              )}
            </LayerView>
          ))}
        <span className="tm-forge-watermark">⚡ THEMEMES.NET</span>
      </div>
    </div>
  );
}
