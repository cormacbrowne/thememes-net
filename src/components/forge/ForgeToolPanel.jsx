import { useState } from 'react';
import { FONT_PACK, makeTextLayer, makeSticker } from './forgeEngine';
import { STUDIO_FILTERS } from '../../utils/canvasMutator';

const COLOR_SWATCHES = ['#ffffff', '#facc15', '#00f3ff', '#ff0055', '#22c55e', '#000000'];
const EMOJI_PALETTE = ['🔥', '💀', '😂', '🗿', '🚀', '⚡', '👑', '🦆', '💎', '🤡', '💯', '🍿'];

/**
 * Simple Upload -> Top & Bottom Text Editor Panel.
 * Stickers/Filters stay tucked inside a collapsed Optional accordion.
 */
export default function ForgeToolPanel({
  editor,
  hasMedia,
  selected,
  tools
}) {
  const { doc, set, updateLayer, setSelectedId } = editor;
  const [showExtras, setShowExtras] = useState(false);

  const textLayers = doc.layers.filter((l) => l.type === 'text');
  const sortedByY = [...textLayers].sort((a, b) => (a.y ?? 0.5) - (b.y ?? 0.5));
  const topLayer = textLayers.find((l) => l.slot === 'top') || sortedByY[0] || null;
  const bottomLayer =
    textLayers.find((l) => l.slot === 'bottom') ||
    (sortedByY.length > 1 ? sortedByY[sortedByY.length - 1] : null);

  const upsertMemeSlot = (slot, value) => {
    const target = slot === 'top' ? topLayer : bottomLayer;
    if (target) {
      updateLayer(target.id, { text: value });
      setSelectedId(target.id);
      return;
    }
    const y = slot === 'top' ? 0.1 : 0.89;
    const layer = makeTextLayer({
      slot,
      text: value,
      y,
      h: 0.18,
      font: 'Anton',
      size: 0.09,
      fill: '#ffffff',
      stroke: 0.09,
      strokeColor: '#000000',
      caps: true
    });
    set((d) => ({ ...d, layers: [...d.layers, layer] }));
    setSelectedId(layer.id);
  };

  const applyClassicStyleToAll = (patch) => {
    if (textLayers.length === 0) return;
    set((d) => ({
      ...d,
      layers: d.layers.map((l) => (l.type === 'text' ? { ...l, ...patch } : l))
    }));
  };

  const primaryText = selected?.type === 'text' ? selected : topLayer || bottomLayer;
  const sizePct = Math.round(((primaryText?.size ?? 0.09) / 0.09) * 100);

  const handleAddEmoji = (emoji) => {
    const s = makeSticker({ emoji });
    set((d) => ({ ...d, layers: [...d.layers, s] }));
    setSelectedId(s.id);
  };

  return (
    <div className="tm-forge-tools">
      <div className="tm-forge-tool-body">
        <div className="tm-forge-pane">
          {/* Step 1: Upload or Replace Image / GIF */}
          <div className="tm-grid-2col">
            <button type="button" className="tm-btn tm-btn-primary" onClick={tools.openFile}>
              {hasMedia ? '📸 Swap Image / GIF' : '📸 Upload Image / GIF'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={() => tools.handleRandomizeCaption?.()}
              title="Fill Top & Bottom text with a random caption"
            >
              🎲 Random Text
            </button>
          </div>

          {/* Step 2: Direct Top & Bottom Meme Inputs */}
          <div className="tm-tool-section">
            <label className="tm-label" htmlFor="tm-forge-top-text">
              TOP TEXT
            </label>
            <input
              id="tm-forge-top-text"
              type="text"
              className="tm-input tm-w-full"
              value={topLayer?.text || ''}
              onChange={(e) => upsertMemeSlot('top', e.target.value)}
              onFocus={() => topLayer && setSelectedId(topLayer.id)}
              placeholder="TOP MEME TEXT..."
            />

            <label className="tm-label" htmlFor="tm-forge-bottom-text" style={{ marginTop: 4 }}>
              BOTTOM TEXT
            </label>
            <input
              id="tm-forge-bottom-text"
              type="text"
              className="tm-input tm-w-full"
              value={bottomLayer?.text || ''}
              onChange={(e) => upsertMemeSlot('bottom', e.target.value)}
              onFocus={() => bottomLayer && setSelectedId(bottomLayer.id)}
              placeholder="BOTTOM MEME TEXT..."
            />
          </div>

          {/* Classic Meme Styling Row */}
          <div className="tm-tool-section">
            <div className="tm-tool-row">
              <span className="tm-label">Style:</span>
              <button
                type="button"
                className={`tm-btn ${primaryText?.font !== 'Inter' ? 'active' : ''}`}
                onClick={() =>
                  applyClassicStyleToAll({
                    font: 'Anton',
                    stroke: 0.09,
                    strokeColor: primaryText?.fill === '#000000' ? '#ffffff' : '#000000',
                    caps: true
                  })
                }
              >
                Impact
              </button>
              <button
                type="button"
                className={`tm-btn ${primaryText?.font === 'Inter' ? 'active' : ''}`}
                onClick={() =>
                  applyClassicStyleToAll({
                    font: 'Inter',
                    stroke: 0.06,
                    strokeColor: primaryText?.fill === '#000000' ? '#ffffff' : '#000000',
                    caps: false
                  })
                }
              >
                Clean
              </button>
              <button
                type="button"
                className={`tm-btn ${primaryText?.caps !== false ? 'active' : ''}`}
                onClick={() => applyClassicStyleToAll({ caps: !(primaryText?.caps !== false) })}
                title="Toggle ALL CAPS"
              >
                CAPS
              </button>
            </div>

            <div className="tm-tool-row">
              <span className="tm-label">Color:</span>
              <div className="tm-swatch-row">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tm-swatch ${primaryText?.fill === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() =>
                      applyClassicStyleToAll({
                        fill: c,
                        strokeColor: c === '#000000' ? '#ffffff' : '#000000'
                      })
                    }
                    aria-label={`Text color ${c}`}
                  />
                ))}
              </div>
            </div>

            <label className="tm-slider">
              <span>Size ({sizePct}%)</span>
              <input
                type="range"
                min="0.05"
                max="0.16"
                step="0.005"
                value={primaryText?.size ?? 0.09}
                onChange={(e) => applyClassicStyleToAll({ size: Number(e.target.value) })}
              />
            </label>
          </div>

          {/* Optional Collapsed Extra Tools (Stickers & Filters — out of the way by default!) */}
          <div className="tm-tool-section">
            <button
              type="button"
              className="tm-btn tm-w-full"
              onClick={() => setShowExtras((prev) => !prev)}
              aria-expanded={showExtras}
            >
              {showExtras ? '▴ Hide Stickers & Filters' : '⚙️ Optional: Stickers, Font & Filters'}
            </button>

            {showExtras && (
              <div className="tm-forge-pane" style={{ marginTop: 8 }}>
                <div className="tm-tool-row">
                  <span className="tm-label">Font:</span>
                  <select
                    className="tm-input"
                    value={primaryText?.font || 'Anton'}
                    onChange={(e) => applyClassicStyleToAll({ font: e.target.value })}
                  >
                    {FONT_PACK.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tm-emoji-grid">
                  {EMOJI_PALETTE.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className="tm-emoji-tile"
                      onClick={() => handleAddEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <div className="tm-grid-2col">
                  {STUDIO_FILTERS.map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      className={`tm-btn ${doc.filter === fx.id ? 'tm-btn-primary' : ''}`}
                      onClick={() => set((d) => ({ ...d, filter: fx.id }))}
                    >
                      {fx.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
