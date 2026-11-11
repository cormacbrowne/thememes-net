import { FONT_PACK, LAYOUTS, ASPECTS, makeTextLayer, makeSticker } from './forgeEngine';
import { STUDIO_FILTERS } from '../../utils/canvasMutator';
import { STUDIO_TEMPLATES } from '../../data/starterMemes';

const COLOR_SWATCHES = ['#ffffff', '#facc15', '#00f3ff', '#ff0055', '#22c55e', '#000000'];
const EMOJI_PALETTE = ['🔥', '💀', '😂', '🗿', '🚀', '⚡', '👑', '🦆', '💎', '🤡', '🍕', '🐸', '💯', '🕶️', '🍿', '⚠️'];

export default function ForgeToolPanel({
  editor,
  tab,
  setTab,
  selected,
  activePanel = 0,
  setActivePanel,
  tools
}) {
  const { doc, set, updateLayer, setSelectedId } = editor;

  const handleAddText = () => {
    const l = makeTextLayer({ y: 0.3 + (doc.layers.length % 5) * 0.1 });
    set((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelectedId(l.id);
    setTab('text');
  };

  const handleAddEmoji = (emoji) => {
    const s = makeSticker({ emoji });
    set((d) => ({ ...d, layers: [...d.layers, s] }));
    setSelectedId(s.id);
  };

  const handleApplyLayout = (lay) => {
    set((d) => ({
      ...d,
      layoutId: lay.id,
      layers: lay.layers ? lay.layers() : d.layers,
      panels: lay.panels.map((_, i) => d.panels[i] || { src: '', zoom: 1, panX: 0, panY: 0, rot: 0, flipX: false })
    }));
  };

  const activeP = doc.panels[activePanel] || null;

  const updateActivePanel = (patch) => {
    set((d) => ({
      ...d,
      panels: d.panels.map((p, i) => (i === activePanel ? { ...p, ...patch } : p))
    }));
  };

  return (
    <div className="tm-forge-tools">
      {/* Tab Navigation */}
      <div className="tm-forge-tabs">
        {[
          ['templates', '🎨 Templates'],
          ['text', '🔤 Text'],
          ['layout', '📐 Layout'],
          ['image', '🖼️ Image'],
          ['stickers', '✨ Stickers'],
          ['fx', '🌪️ Filters']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tm-forge-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tm-forge-tool-body">
        {/* TAB 0: STUDIO BLANK TEMPLATES */}
        {tab === 'templates' && (
          <div className="tm-forge-pane">
            <div className="tm-tool-row" style={{ justifyContent: 'space-between' }}>
              <span className="tm-label">20 Classic Formats (Tap to Caption):</span>
              <button type="button" className="tm-btn" onClick={tools.openFile}>
                📸 Upload Own
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
        )}

        {/* TAB 1: TEXT */}
        {tab === 'text' && (
          <div className="tm-forge-pane">
            <div className="tm-grid-2col">
              <button type="button" className="tm-btn tm-btn-primary" onClick={handleAddText}>
                + Add Text Box
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={() => tools.handleRandomizeCaption?.()}
                title="Fill with a random funny viral caption"
              >
                🎲 Random Caption
              </button>
            </div>

            {selected && selected.type === 'text' ? (
              <div className="tm-tool-section">
                <textarea
                  className="tm-input tm-w-full"
                  rows={2}
                  value={selected.text || ''}
                  onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                  placeholder="Enter text..."
                />

                <div className="tm-tool-row">
                  <select
                    className="tm-input"
                    value={selected.font || 'Anton'}
                    onChange={(e) => updateLayer(selected.id, { font: e.target.value })}
                  >
                    {FONT_PACK.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={`tm-btn ${selected.caps ? 'active' : ''}`}
                    onClick={() => updateLayer(selected.id, { caps: !selected.caps })}
                    title="Toggle ALL CAPS"
                  >
                    AA
                  </button>
                </div>

                <div className="tm-tool-row">
                  <span className="tm-label">Color:</span>
                  <div className="tm-swatch-row">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`tm-swatch ${selected.fill === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => updateLayer(selected.id, { fill: c })}
                      />
                    ))}
                  </div>
                </div>

                <div className="tm-tool-row">
                  <span className="tm-label">Outline:</span>
                  <input
                    type="range"
                    min="0"
                    max="0.25"
                    step="0.01"
                    value={selected.stroke || 0}
                    onChange={(e) => updateLayer(selected.id, { stroke: parseFloat(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="tm-swatch"
                    style={{ background: selected.strokeColor || '#000000' }}
                    onClick={() =>
                      updateLayer(selected.id, {
                        strokeColor: selected.strokeColor === '#000000' ? '#ffffff' : '#000000'
                      })
                    }
                  />
                </div>

                <div className="tm-tool-row">
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      const clone = { ...selected, id: `txt-${Date.now()}`, y: selected.y + 0.08 };
                      set((d) => ({ ...d, layers: [...d.layers, clone] }));
                      setSelectedId(clone.id);
                    }}
                  >
                    📋 Duplicate
                  </button>
                  <button type="button" className="tm-btn tm-btn-danger" onClick={tools.removeSelected}>
                    🗑️ Delete Layer
                  </button>
                </div>
              </div>
            ) : (
              <div className="tm-empty-hint">Tap any text box on the canvas or press "+ Add Text Box"</div>
            )}
          </div>
        )}

        {/* TAB 2: LAYOUT */}
        {tab === 'layout' && (
          <div className="tm-forge-pane">
            <span className="tm-label">Templates:</span>
            <div className="tm-grid-2col">
              {LAYOUTS.map((lay) => (
                <button
                  key={lay.id}
                  type="button"
                  className={`tm-btn ${doc.layoutId === lay.id ? 'active' : ''}`}
                  onClick={() => handleApplyLayout(lay)}
                >
                  {lay.label}
                </button>
              ))}
            </div>

            <span className="tm-label" style={{ marginTop: '12px' }}>
              Aspect Ratio:
            </span>
            <div className="tm-aspect-row">
              {ASPECTS.map((asp) => (
                <button
                  key={asp.id}
                  type="button"
                  className={`tm-btn ${doc.aspect === asp.id ? 'active' : ''}`}
                  onClick={() => set((d) => ({ ...d, aspect: asp.id }))}
                >
                  {asp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: IMAGE */}
        {tab === 'image' && (
          <div className="tm-forge-pane">
            <div className="tm-tool-row">
              <button type="button" className="tm-btn tm-btn-primary tm-w-full" onClick={tools.openFile}>
                📸 Change Image / Video
              </button>
            </div>

            {doc.panels.length > 1 && (
              <div className="tm-tool-row">
                <span className="tm-label">Select Panel:</span>
                {doc.panels.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`tm-btn ${activePanel === i ? 'active' : ''}`}
                    onClick={() => setActivePanel(i)}
                  >
                    Panel {i + 1}
                  </button>
                ))}
              </div>
            )}

            {activeP && activeP.src && (
              <>
                <div className="tm-tool-row">
                  <span className="tm-label">Zoom:</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={activeP.zoom || 1}
                    onChange={(e) => updateActivePanel({ zoom: parseFloat(e.target.value) })}
                  />
                  <span>{(activeP.zoom || 1).toFixed(1)}x</span>
                </div>

                <div className="tm-tool-row">
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => updateActivePanel({ rot: ((activeP.rot || 0) + 90) % 360 })}
                  >
                    🔄 Rotate 90°
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => updateActivePanel({ flipX: !activeP.flipX })}
                  >
                    ↔ Flip
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => updateActivePanel({ zoom: 1, panX: 0, panY: 0, rot: 0, flipX: false })}
                  >
                    Reset
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: STICKERS */}
        {tab === 'stickers' && (
          <div className="tm-forge-pane">
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

            <div style={{ marginTop: '12px' }}>
              <button type="button" className="tm-btn tm-w-full" onClick={tools.openSticker}>
                🖼️ Upload Custom PNG Sticker
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: FILTERS */}
        {tab === 'fx' && (
          <div className="tm-forge-pane">
            <div className="tm-grid-2col">
              {STUDIO_FILTERS.map((fx) => (
                <button
                  key={fx.id}
                  type="button"
                  className={`tm-btn ${doc.filter === fx.id ? 'active' : ''}`}
                  onClick={() => set((d) => ({ ...d, filter: fx.id }))}
                >
                  {fx.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
