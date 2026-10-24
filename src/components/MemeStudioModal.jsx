import { useState, useRef, useEffect } from 'react';
import { VIRAL_CAPTIONS } from '../data/starterMemes';
import { STUDIO_FILTERS, CAPTION_LAYOUTS } from '../utils/canvasMutator';

const TEXT_COLOR_SWATCHES = [
  { id: '#facc15', label: 'Cyber Gold' },
  { id: '#ffffff', label: 'Pure White' },
  { id: '#00f3ff', label: 'Neon Cyan' },
  { id: '#f472b6', label: 'Hot Pink' },
  { id: '#4ade80', label: 'Electric Lime' }
];

export default function MemeStudioModal({
  mutatingParentMeme,
  studioCanvasRef,
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
  studioTextColor = '#facc15',
  setStudioTextColor,
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const dragTargetRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captionsFormRef = useRef(null);

  const selectedSticker = studioStickers.find((s) => s.id === selectedStickerId) || null;

  // Clean up webcam stream on unmount or close
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Prevent page/modal scroll ONLY when actively dragging a sticker or caption on touch devices
  useEffect(() => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const onTouchMove = (ev) => {
      if (dragTargetRef.current) {
        ev.preventDefault();
      }
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => canvas.removeEventListener('touchmove', onTouchMove);
  }, [studioCanvasRef]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleStartCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1200 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      // Fallback to native mobile camera file input
      cameraInputRef.current?.click();
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setCameraError('Camera stream not ready yet.');
      return;
    }
    const off = document.createElement('canvas');
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const octx = off.getContext('2d');
    octx.drawImage(video, 0, 0, off.width, off.height);
    off.toBlob((blob) => {
      if (blob && onCustomImageUpload) {
        onCustomImageUpload({ target: { files: [blob] } });
      }
      stopCamera();
    }, 'image/png');
  };

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
      const radius = (st.size || 58) * 0.65;
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

    // 2. Check Top Text hit region
    if (
      studioTopText &&
      captionLayout !== 'topbar' &&
      Math.abs(pt.y - topTextPos.y) <= 40 &&
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
      Math.abs(pt.y - bottomTextPos.y) <= 40 &&
      Math.abs(pt.x - bottomTextPos.x) <= 240
    ) {
      dragTargetRef.current = {
        type: 'bottomText',
        offsetX: pt.x - bottomTextPos.x,
        offsetY: pt.y - bottomTextPos.y
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }

    // If no image is uploaded yet and user clicks the empty canvas center, open file picker!
    if (!customUploadImg && pt.y > 120 && pt.y < 420) {
      fileInputRef.current?.click();
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
        {/* Sticky Header */}
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tm-btn tm-back-pill"
              onClick={onClose}
              title="Back to Feed"
            >
              ← Back
            </button>
            <div>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                {activeBounty
                  ? `🎯 Daily Bounty (+${activeBounty.rewardXp} XP)`
                  : mutatingParentMeme
                  ? `🧬 Gen-${(mutatingParentMeme.generation || 0) + 1} Remix (+150 XP)`
                  : '🎨 Meme Forge Studio — Upload & Create (+100 XP)'}
              </h2>
              <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px', fontWeight: 700 }}>
                ⚡ 100% User-Uploaded Memes • Drag captions &amp; stickers directly on canvas!
              </div>
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
              🎯 <strong>BOUNTY PROMPT:</strong> “{activeBounty.prompt}” — Upload your photo &amp; earn{' '}
              <strong style={{ color: '#facc15' }}>+{activeBounty.rewardXp} XP + Bounty Badge!</strong>
            </span>
          </div>
        )}

        {/* Active Mutation Lineage Banner */}
        {mutatingParentMeme && (
          <div className="tm-studio-lineage-banner">
            <span>
              🧬 Remixing <strong>{mutatingParentMeme.title}</strong> by{' '}
              <strong style={{ color: '#00f3ff' }}>@{mutatingParentMeme.author_name}</strong> —
              Origin creator earns <strong>+50 XP Royalty!</strong>
            </span>
            <button
              type="button"
              className="tm-btn"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={onOpenBlankStudio}
            >
              Start Fresh Upload
            </button>
          </div>
        )}

        <div className="tm-studio-layout">
          {/* LEFT COLUMN: Interactive HTML5 Canvas + FX & Stickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="tm-studio-canvas-wrap" style={{ position: 'relative' }}>
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
                  border: customUploadImg
                    ? '1.5px solid rgba(34, 197, 94, 0.65)'
                    : '1.5px dashed rgba(0, 243, 255, 0.5)',
                  cursor: customUploadImg ? 'grab' : 'pointer',
                  touchAction: 'manipulation'
                }}
              />
            </div>

            <button
              type="button"
              className="tm-btn tm-show-mobile-only"
              onClick={() => captionsFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ justifyContent: 'center', borderColor: 'rgba(0, 243, 255, 0.4)', color: '#00f3ff' }}
            >
              ✏️ Jump to Upload, Captions &amp; Publish ↓
            </button>

            {/* Viral Glitch & Filter FX Suite */}
            <div>
              <div className="tm-studio-label">⚡ Photo Glitch &amp; Filter FX</div>
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
                {['🔥', '😂', '🌟', '🕶️', '🧢', '👑', '🗿', '⚡', '💯', '❤️', '🎉', '🦆'].map((emoji) => (
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
                disabled={!customUploadImg}
                onClick={onDownloadPng}
                title={customUploadImg ? 'Download your meme as PNG' : 'Upload an image first'}
              >
                💾 Download PNG (+25 XP)
              </button>
              <button
                type="button"
                className="tm-btn"
                disabled={!customUploadImg}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  borderColor: clipboardStatus ? '#22c55e' : undefined,
                  color: clipboardStatus ? '#22c55e' : undefined
                }}
                onClick={onCopyClipboardPng}
                title={customUploadImg ? 'Copy meme image to clipboard' : 'Upload an image first'}
              >
                {clipboardStatus || '📋 Copy to Clipboard'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: User Image Upload, Camera, Layout & Captions Form */}
          <form
            ref={captionsFormRef}
            onSubmit={onPublishMeme}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {/* 1. User Image Upload / Paste / Camera / URL */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="tm-studio-label">
                  1. Upload Your Meme Image (Required — No Default Templates!)
                </label>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: customUploadImg ? 'rgba(34, 197, 94, 0.2)' : 'rgba(250, 204, 21, 0.18)',
                    color: customUploadImg ? '#4ade80' : '#facc15'
                  }}
                >
                  {customUploadImg ? '✅ Image Loaded!' : '📸 Waiting for Photo'}
                </span>
              </div>

              {/* Click / Drop Upload Zone */}
              <div
                className="tm-studio-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderColor: customUploadImg ? 'rgba(34, 197, 94, 0.55)' : undefined,
                  background: customUploadImg ? 'rgba(34, 197, 94, 0.08)' : undefined
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onCustomImageUpload}
                  style={{ display: 'none' }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onCustomImageUpload}
                  style={{ display: 'none' }}
                />
                <span>
                  {customUploadImg
                    ? '✅ Photo Ready! Click here to swap image, drop a new file, or press Ctrl+V'
                    : '📥 Click to Upload Photo/Screenshot, Drop File anywhere, or press Ctrl+V'}
                </span>
              </div>

              {/* Camera Capture & Direct URL Row */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="tm-btn"
                  onClick={cameraActive ? stopCamera : handleStartCamera}
                  style={{ borderColor: 'rgba(0, 243, 255, 0.4)', color: '#00f3ff' }}
                >
                  {cameraActive ? '✕ Close Camera' : '📸 Snap Camera Photo'}
                </button>
                <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '200px' }}>
                  <input
                    type="url"
                    className="tm-input"
                    placeholder="Or paste image URL (https://...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    style={{ flex: 1 }}
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
              </div>

              {cameraActive && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(9, 10, 18, 0.9)',
                    border: '1px solid #00f3ff',
                    textAlign: 'center'
                  }}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="tm-btn tm-btn-primary"
                      onClick={handleCaptureCameraFrame}
                    >
                      📸 Capture Frame to Canvas
                    </button>
                    <button type="button" className="tm-btn" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {cameraError && (
                <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>{cameraError}</div>
              )}
              {urlError && (
                <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>{urlError}</div>
              )}
            </div>

            {/* 2. Caption Layout, Random Meme Text & Draggable Text Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <label className="tm-studio-label">2. Add Meme Text &amp; Random Captions (Optional)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="tm-link-btn"
                    onClick={() => {
                      setStudioTopText('');
                      setStudioBottomText('');
                    }}
                  >
                    🧹 Clear Text
                  </button>
                  <button
                    type="button"
                    className="tm-link-btn"
                    onClick={() => {
                      setTopTextPos({ x: 300, y: 64 });
                      setBottomTextPos({ x: 300, y: 490 });
                    }}
                  >
                    ↺ Center
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
                    🎲 Random Meme Text
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
                placeholder="TOP TEXT (optional — drag on canvas to reposition)"
                value={studioTopText}
                onChange={(e) => setStudioTopText(e.target.value)}
                style={{ width: '100%', marginTop: '8px' }}
              />
              <input
                type="text"
                className="tm-input"
                placeholder="BOTTOM TEXT (optional — drag on canvas to reposition)"
                value={studioBottomText}
                onChange={(e) => setStudioBottomText(e.target.value)}
                style={{ width: '100%', marginTop: '8px' }}
              />

              {/* Font Size Slider & Text Color Swatches */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#94a3b8'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '170px' }}>
                  <span>Size: {captionFontSize}px</span>
                  <input
                    type="range"
                    min="22"
                    max="50"
                    value={captionFontSize}
                    onChange={(e) => setCaptionFontSize(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
                {setStudioTextColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11px' }}>Color:</span>
                    {TEXT_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => setStudioTextColor(sw.id)}
                        title={sw.label}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: sw.id,
                          border:
                            studioTextColor === sw.id
                              ? '2.5px solid #00f3ff'
                              : '1px solid rgba(255,255,255,0.35)',
                          cursor: 'pointer',
                          transform: studioTextColor === sw.id ? 'scale(1.15)' : 'scale(1)'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Post Title, Category & Safety Blur Toggle */}
            <div>
              <label className="tm-studio-label">3. Post Title, Category &amp; Safety</label>
              <input
                type="text"
                className="tm-input"
                placeholder="Give your uploaded meme a title..."
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
                  <option value="dank">#DANK / FUNNY</option>
                  <option value="relatable">#RELATABLE / LIFE</option>
                  <option value="gaming">#GAMING</option>
                  <option value="tech">#TECH / CODING</option>
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

            {!customUploadImg ? (
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  justifyContent: 'center',
                  padding: '13px',
                  fontSize: '15px',
                  marginTop: '4px'
                }}
              >
                📸 Step 1: Select Photo to Upload (+100 XP)
              </button>
            ) : (
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
                  ? 'Uploading to Community Feed...'
                  : activeBounty
                  ? `🎯 Submit Bounty Upload (+${activeBounty.rewardXp || 200} XP)`
                  : mutatingParentMeme
                  ? '🧬 Publish Remix (+150 XP)'
                  : '🚀 Publish Uploaded Meme (+100 XP)'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
