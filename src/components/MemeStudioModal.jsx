import { useState, useRef } from 'react';
import { STUDIO_TEMPLATES, VIRAL_CAPTIONS } from '../data/starterMemes';
import { STUDIO_FILTERS, CAPTION_LAYOUTS } from '../utils/canvasMutator';

export default function MemeStudioModal({
  mutatingParentMeme,
  studioCanvasRef,
  studioTemplateIdx,
  setStudioTemplateIdx,
  studioTopText,
  setStudioTopText,
  studioBottomText,
  setStudioBottomText,
  topTextPos,
  setTopTextPos,
  bottomTextPos,
  setBottomTextPos,
  captionFontSize,
  setCaptionFontSize,
  captionLayout,
  setCaptionLayout,
  studioFilter,
  setStudioFilter,
  studioTitle,
  setStudioTitle,
  studioCategory,
  setStudioCategory,
  studioStickers,
  setStudioStickers,
  selectedStickerId,
  setSelectedStickerId,
  customUploadImg,
  setCustomUploadImg,
  setMutatingParentMeme,
  onCustomImageUpload,
  onLoadUrlIntoStudio,
  onOpenBlankStudio,
  onDownloadPng,
  onCopyClipboardPng,
  clipboardStatus,
  activeBounty,
  studioIsSpoiler,
  setStudioIsSpoiler,
  uploadError,
  onClose,
  onPublishMeme,
  isPublishing
}) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const dragTargetRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedSticker = studioStickers.find((s) => s.id === selectedStickerId) || null;

  // Convert client mouse/touch coordinates to 600x552 canvas space
  const getCanvasCoords = (e) => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return { x: 300, y: 260 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(20, Math.min(580, (e.clientX - rect.left) * scaleX)),
      y: Math.max(20, Math.min(505, (e.clientY - rect.top) * scaleY))
    };
  };

  const handleCanvasPointerDown = (e) => {
    const pt = getCanvasCoords(e);

    // 1. Check stickers from top-most to bottom-most
    for (let i = studioStickers.length - 1; i >= 0; i--) {
      const st = studioStickers[i];
      const radius = (st.size || 58) * 0.6;
      if (Math.hypot(pt.x - st.x, pt.y - st.y) <= radius) {
        setSelectedStickerId(st.id);
        dragTargetRef.current = {
          type: 'sticker',
          id: st.id,
          offsetX: pt.x - st.x,
          offsetY: pt.y - st.y
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        return;
      }
    }

    setSelectedStickerId(null);

    // 2. Check Top Text hit region (when in classic or cyberbar mode)
    if (
      studioTopText &&
      captionLayout !== 'topbar' &&
      Math.abs(pt.y - topTextPos.y) <= 34 &&
      Math.abs(pt.x - topTextPos.x) <= 240
    ) {
      dragTargetRef.current = {
        type: 'topText',
        offsetX: pt.x - topTextPos.x,
        offsetY: pt.y - topTextPos.y
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }

    // 3. Check Bottom Text hit region
    if (
      studioBottomText &&
      Math.abs(pt.y - bottomTextPos.y) <= 34 &&
      Math.abs(pt.x - bottomTextPos.x) <= 240
    ) {
      dragTargetRef.current = {
        type: 'bottomText',
        offsetX: pt.x - bottomTextPos.x,
        offsetY: pt.y - bottomTextPos.y
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };

  const handleCanvasPointerMove = (e) => {
    const target = dragTargetRef.current;
    if (!target) return;
    const pt = getCanvasCoords(e);

    if (target.type === 'sticker') {
      const nx = Math.max(24, Math.min(576, pt.x - target.offsetX));
      const ny = Math.max(24, Math.min(500, pt.y - target.offsetY));
      setStudioStickers((prev) =>
        prev.map((s) => (s.id === target.id ? { ...s, x: nx, y: ny } : s))
      );
    } else if (target.type === 'topText') {
      setTopTextPos({
        x: Math.max(80, Math.min(520, pt.x - target.offsetX)),
        y: Math.max(36, Math.min(490, pt.y - target.offsetY))
      });
    } else if (target.type === 'bottomText') {
      setBottomTextPos({
        x: Math.max(80, Math.min(520, pt.x - target.offsetX)),
        y: Math.max(36, Math.min(502, pt.y - target.offsetY))
      });
    }
  };

  const handleCanvasPointerUp = () => {
    dragTargetRef.current = null;
  };

  const stickerCounterRef = useRef(1);

  const handleAddSticker = (emoji) => {
    const seq = stickerCounterRef.current++;
    const id = `st-${seq}`;
    const newSticker = {
      id,
      emoji,
      x: 180 + ((seq * 53) % 240),
      y: 170 + ((seq * 37) % 180),
      size: 60
    };
    setStudioStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(id);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setLoadingUrl(true);
    setUrlError('');
    try {
      await onLoadUrlIntoStudio(urlInput.trim());
      setUrlInput('');
    } catch (err) {
      setUrlError(err.message || 'Could not load image URL');
    } finally {
      setLoadingUrl(false);
    }
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div className="tm-modal tm-studio-modal-v2" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeBounty
                ? `🎯 Daily Bounty Challenge (+${activeBounty.rewardXp} XP)`
                : mutatingParentMeme
                ? `🧬 Mutating Gen-${(mutatingParentMeme.generation || 0) + 1} Remix (+150 XP)`
                : '🎨 Meme Forge Studio 2.0 (+100 XP)'}
            </h2>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '3px', fontWeight: 700 }}>
              ⚡ Tip: Drag text or stickers directly on the canvas • Press Ctrl+V anywhere to paste an image!
            </div>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Active Daily Bounty Banner */}
        {activeBounty && (
          <div className="tm-studio-lineage-banner" style={{ borderColor: '#facc15', background: 'rgba(250, 204, 21, 0.12)' }}>
            <span>
              🎯 <strong>BOUNTY PROMPT:</strong> “{activeBounty.prompt}” — Earn{' '}
              <strong style={{ color: '#facc15' }}>+{activeBounty.rewardXp} XP + Bounty Hunter Badge!</strong>
            </span>
          </div>
        )}

        {/* Active Mutation Lineage Banner */}
        {mutatingParentMeme && (
          <div className="tm-studio-lineage-banner">
            <span>
              🧬 Forking <strong>{mutatingParentMeme.title}</strong> by{' '}
              <strong style={{ color: '#00f3ff' }}>@{mutatingParentMeme.author_name}</strong> —
              Origin creator earns <strong>+50 XP Royalty!</strong>
            </span>
            <button
              type="button"
              className="tm-btn"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={onOpenBlankStudio}
            >
              Reset to Blank Gen-0
            </button>
          </div>
        )}

        <div className="tm-studio-layout">
          {/* LEFT COLUMN: Interactive HTML5 Canvas + FX & Stickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="tm-studio-canvas-wrap">
              <canvas
                ref={studioCanvasRef}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: '14px',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  cursor: 'grab',
                  touchAction: 'none'
                }}
              />
            </div>

            {/* Viral Glitch & Filter FX Suite */}
            <div>
              <div className="tm-studio-label">⚡ Viral Glitch & Filter FX</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {STUDIO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`tm-fx-pill ${studioFilter === f.id ? 'active' : ''}`}
                    onClick={() => setStudioFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Sticker Bar & Selected Sticker Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="tm-studio-label">🕹️ Drop Draggable Stickers</span>
                {studioStickers.length > 0 && (
                  <button
                    type="button"
                    className="tm-link-btn"
                    style={{ color: '#f87171' }}
                    onClick={() => {
                      setStudioStickers([]);
                      setSelectedStickerId(null);
                    }}
                  >
                    🗑️ Clear All ({studioStickers.length})
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {['🔥', '💀', '😂', '🕶️', '🧢', '🤡', '👑', '🗿', '⚡', '💯'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="tm-react-btn"
                    onClick={() => handleAddSticker(emoji)}
                  >
                    + {emoji}
                  </button>
                ))}
              </div>

              {selectedSticker && (
                <div className="tm-sticker-inspector">
                  <span>Selected: {selectedSticker.emoji}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    Size:
                    <input
                      type="range"
                      min="32"
                      max="120"
                      value={selectedSticker.size || 60}
                      onChange={(e) => {
                        const sz = Number(e.target.value);
                        setStudioStickers((prev) =>
                          prev.map((s) => (s.id === selectedSticker.id ? { ...s, size: sz } : s))
                        );
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="tm-link-btn"
                    style={{ color: '#f87171' }}
                    onClick={() => {
                      setStudioStickers((prev) => prev.filter((s) => s.id !== selectedSticker.id));
                      setSelectedStickerId(null);
                    }}
                  >
                    ✕ Delete
                  </button>
                </div>
              )}
            </div>

            {/* 1-Click Export Bar (Download PNG & Copy to Clipboard) */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tm-btn"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={onDownloadPng}
              >
                💾 Download PNG (+25 XP)
              </button>
              <button
                type="button"
                className="tm-btn"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: clipboardStatus ? '#22c55e' : undefined,
                  color: clipboardStatus ? '#22c55e' : undefined
                }}
                onClick={onCopyClipboardPng}
              >
                {clipboardStatus || '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Upload Dropzone, Templates, Layout & Captions Form */}
          <form
            onSubmit={onPublishMeme}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* 1. Zero-Friction Image Upload / URL / Template Picker */}
            <div>
              <label className="tm-studio-label">
                1. Image Source (Upload, Paste Ctrl+V, URL, or Template)
              </label>

              {/* Click / Drop Upload Zone */}
              <div
                className="tm-studio-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onCustomImageUpload}
                  style={{ display: 'none' }}
                />
                <span>📥 Click to Upload Photo/GIF, Drop File anywhere, or press <strong>Ctrl+V</strong></span>
              </div>

              {/* Direct Image URL Loader */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input
                  type="url"
                  className="tm-input"
                  placeholder="Or paste direct image URL (https://...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button
                  type="button"
                  className="tm-btn"
                  disabled={loadingUrl}
                  onClick={handleUrlSubmit}
                >
                  {loadingUrl ? '...' : 'Load URL'}
                </button>
              </div>
              {urlError && (
                <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>{urlError}</div>
              )}

              {/* Built-in Cyber Templates */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {STUDIO_TEMPLATES.map((t, i) => (
                  <button
                    key={t.name}
                    type="button"
                    className={`tm-tab ${
                      studioTemplateIdx === i && !customUploadImg ? 'active' : ''
                    }`}
                    style={{ padding: '6px 11px', fontSize: '12px' }}
                    onClick={() => {
                      setMutatingParentMeme(null);
                      setCustomUploadImg(null);
                      setStudioTemplateIdx(i);
                      setStudioTopText(t.defaultTop);
                      setStudioBottomText(t.defaultBottom);
                    }}
                  >
                    {t.emoji} {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Caption Layout & Draggable Text Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="tm-studio-label">2. Caption Style & Text</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="tm-link-btn"
                    onClick={() => {
                      setTopTextPos({ x: 300, y: 64 });
                      setBottomTextPos({ x: 300, y: 490 });
                    }}
                  >
                    ↺ Center Text
                  </button>
                  <button
                    type="button"
                    className="tm-link-btn"
                    style={{ color: '#facc15' }}
                    onClick={() => {
                      const pick =
                        VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)];
                      setStudioTopText(pick[0]);
                      setStudioBottomText(pick[1]);
                    }}
                  >
                    🎲 Random Caption
                  </button>
                </div>
              </div>

              {/* Layout Switcher Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {CAPTION_LAYOUTS.map((lay) => (
                  <button
                    key={lay.id}
                    type="button"
                    className={`tm-fx-pill ${captionLayout === lay.id ? 'active' : ''}`}
                    onClick={() => setCaptionLayout(lay.id)}
                  >
                    {lay.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                className="tm-input"
                placeholder="TOP TEXT (drag on canvas to reposition)"
                value={studioTopText}
                onChange={(e) => setStudioTopText(e.target.value)}
                style={{ width: '100%', marginTop: '8px' }}
              />
              <input
                type="text"
                className="tm-input"
                placeholder="BOTTOM TEXT (drag on canvas to reposition)"
                value={studioBottomText}
                onChange={(e) => setStudioBottomText(e.target.value)}
                style={{ width: '100%', marginTop: '8px' }}
              />

              {/* Font Size Slider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#94a3b8'
                }}
              >
                <span>Text Size: {captionFontSize}px</span>
                <input
                  type="range"
                  min="22"
                  max="50"
                  value={captionFontSize}
                  onChange={(e) => setCaptionFontSize(Number(e.target.value))}
                  style={{ width: '65%' }}
                />
              </div>
            </div>

            {/* 3. Post Title, Category & Safety Blur Toggle */}
            <div>
              <label className="tm-studio-label">3. Post Title, Category & Safety</label>
              <input
                type="text"
                className="tm-input"
                placeholder="Give your meme a spicy title..."
                value={studioTitle}
                onChange={(e) => setStudioTitle(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <select
                  className="tm-input"
                  value={studioCategory}
                  onChange={(e) => setStudioCategory(e.target.value)}
                  style={{ flex: 1, background: '#1e293b' }}
                >
                  <option value="dank">#DANK</option>
                  <option value="tech">#TECH</option>
                  <option value="gaming">#GAMING</option>
                  <option value="relatable">#RELATABLE</option>
                </select>

                <button
                  type="button"
                  className={`tm-fx-pill ${studioIsSpoiler ? 'active' : ''}`}
                  style={{ padding: '10px 12px', fontSize: '12px' }}
                  onClick={() => setStudioIsSpoiler && setStudioIsSpoiler((prev) => !prev)}
                  title="Blur meme in feed until a player clicks to reveal it"
                >
                  🌶️ {studioIsSpoiler ? 'Spoiler Blur: ON' : 'Spoiler Blur: OFF'}
                </button>
              </div>
              {uploadError && (
                <div style={{ fontSize: '12px', color: '#f87171', marginTop: '6px', fontWeight: 700 }}>
                  ⚠️ {uploadError}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="tm-btn tm-btn-primary"
              disabled={isPublishing}
              style={{
                justifyContent: 'center',
                padding: '13px',
                fontSize: '15px',
                marginTop: '4px'
              }}
            >
              {isPublishing
                ? 'Uploading to Supabase...'
                : activeBounty
                ? `🎯 Submit Bounty Entry (+${activeBounty.rewardXp || 200} XP)`
                : mutatingParentMeme
                ? '🧬 Publish Mutation (+150 XP)'
                : '🚀 Publish to Feed (+100 XP)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
