import { useState } from 'react';
import { FONT_PACK, makeTextLayer, makeSticker } from './forgeEngine';
import { STUDIO_FILTERS } from '../../utils/canvasMutator';
import { STUDIO_TEMPLATES } from '../../data/starterMemes';

const COLOR_SWATCHES = ['#ffffff', '#facc15', '#00f3ff', '#ff0055', '#22c55e'];
const EMOJI_PALETTE = ['🔥', '💀', '😂', '🗿', '🚀', '⚡', '👑', '🦆', '💎', '🤡', '💯', '🍿'];

/**
 * Simplified Classic Meme & GIF Editor Panel (Phase 30):
 * Focused around what 99% of meme makers need:
 * 1) Pick an Image, GIF, or Classic Template
 * 2) Type Top Text & Bottom Text in classic Impact meme style
 * Optional Stickers/Filters stay tucked inside a collapsed More accordion.
 */
export default function ForgeToolPanel({
  editor,
  tab,
  setTab,
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
      fill: '#ffffff',
      stroke: '#000000',
      strokeW: 6,
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

  const handleAddEmoji = (emoji) => {
    const s = makeSticker({ emoji });
    set((d) => ({ ...d, layers: [...d.layers, s] }));
    setSelectedId(s.id);
  };

  return (
    <div className="tm-forge-tools">
      {/* Simple 2-Mode Switcher: Top & Bottom Text vs Blank Templates */}
      <div className="tm-forge-tabs">
        <button
          type="button"
          className={`tm-forge-tab ${tab !== 'templates' ? 'active' : ''}`}
          onClick={() => setTab('text')}
        >
          ✍️ Top &amp; Bottom Text
        </button>
        <button
          type="button"
          className={`tm-forge-tab ${tab === 'templates' ? 'active' : ''}`}
          onClick={() => setTab('templates')}
        >
          🖼️ Blank Templates ({STUDIO_TEMPLATES.length})
        </button>
      </div>

      <div className="tm-forge-tool-body">
        {tab === 'templates' ? (
          <div className="tm-forge-pane">
            <div className="tm-tool-row" style={{ justifyContent: 'space-between' }}>
              <span className="tm-label">Tap a Template or Upload Own:</span>
              <button type="button" className="tm-btn tm-btn-primary" onClick={tools.openFile}>
                📸 Upload Image / GIF
              </button>
            </div>
            <div className="tm-forge-panel-template-grid">
              {STUDIO_TEMPLATES.map((tpl) => {
                const isCurrent = doc.panels.some((p) => p.src === tpl.src);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    className={`tm-forge-template-card compact ${isCurrent ? 'active' : ''}`}
                    onClick={() => tools.handleSelectTemplate?.(tpl)}
                    title={tpl.name}
                  >
                    <img src={tpl.src} alt={tpl.name} loading="lazy" />
                    <span className="tm-forge-template-name">{tpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="tm-forge-pane">
            {/* Step 1 Quick Swap Media */}
            <div className="tm-grid-2col">
              <button type="button" className="tm-btn" onClick={tools.openFile}>
                📸 Swap Image / GIF
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={() => tools.handleRandomizeCaption?.()}
                title="Fill Top & Bottom text with a random joke"
              >
                🎲 Random Meme Text
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
                placeholder="WHEN YOU PUSH TO PROD..."
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
                placeholder="ON FRIDAY AT 4:59 PM"
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
                    applyClassicStyleToAll({ font: 'Anton', stroke: '#000000', strokeW: 6, caps: true })
                  }
                >
                  Impact
                </button>
                <button
                  type="button"
                  className={`tm-btn ${primaryText?.font === 'Inter' ? 'active' : ''}`}
                  onClick={() =>
                    applyClassicStyleToAll({ font: 'Inter', stroke: '#000000', strokeW: 4, caps: false })
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
                          stroke: c === '#000000' ? '#ffffff' : '#000000'
                        })
                      }
                      aria-label={`Text color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <label className="tm-slider">
                <span>Size ({primaryText?.fontSize || 52})</span>
                <input
                  type="range"
                  min="28"
                  max="92"
                  value={primaryText?.fontSize || 52}
                  onChange={(e) => applyClassicStyleToAll({ fontSize: Number(e.target.value) })}
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
                {showExtras ? '▴ Hide Extra Stickers & Filters' : '⚙️ Optional: Stickers, Font & Filters'}
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
                        className="tm-emoji-btn"
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
        )}
      </div>
    </div>
  );
}
