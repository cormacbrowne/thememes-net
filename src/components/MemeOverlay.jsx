import { memo, useRef } from 'react';
import { fitText, fontCss, LINE_HEIGHT } from './forge/forgeEngine';
import useBoxSize from '../hooks/useBoxSize';

/** Renders one overlay layer as absolutely positioned HTML (same math as the canvas export). */
export function LayerView({ layer, W, H, children, className = '', style, ...rest }) {
  const bw = layer.w * W;
  const bh = layer.h * H;
  let content = null;
  if (layer.type === 'sticker') {
    content = layer.src ? (
      <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    ) : (
      <span style={{ fontSize: Math.min(bw, bh) * 0.9, lineHeight: 1 }}>{layer.emoji}</span>
    );
  } else if (W > 0) {
    const { size, lines } = fitText(layer, bw, bh, H);
    const sw = (layer.stroke || 0) * size;
    content = (
      <div
        style={{
          font: fontCss(layer, size),
          lineHeight: LINE_HEIGHT,
          color: layer.fill,
          textAlign: layer.align || 'center',
          width: '100%',
          whiteSpace: 'pre',
          WebkitTextStroke: sw > 0 ? `${sw * 2}px ${layer.strokeColor}` : undefined,
          paintOrder: 'stroke fill'
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l || '\u00a0'}</div>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`tm-ov-layer ${className}`}
      style={{
        left: layer.x * W - bw / 2,
        top: layer.y * H - bh / 2,
        width: bw,
        height: bh,
        transform: `rotate(${layer.rot || 0}deg)`,
        ...style
      }}
      {...rest}
    >
      {content}
      {children}
    </div>
  );
}



/**
 * Shared non-destructive caption layer, placed over <video>/<img>.
 * The parent must be position:relative and sized to the media box.
 */
const MemeOverlay = memo(function MemeOverlay({ overlay }) {
  const ref = useRef(null);
  const { W, H } = useBoxSize(ref);
  const layers = overlay?.layers || [];
  if (!layers.length || overlay?.burned) return null;
  return (
    <div ref={ref} className="tm-ov-root" aria-hidden="true">
      {W > 0 && layers.map((l) => <LayerView key={l.id} layer={l} W={W} H={H} />)}
    </div>
  );
});

export default MemeOverlay;
