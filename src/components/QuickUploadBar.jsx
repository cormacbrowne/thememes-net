import { useState, useRef } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';

export default function QuickUploadBar({
  onQuickPublishFile,
  onOpenStudioWithFile,
  onOpenBlankStudio,
  activeBounty,
  onCycleBounty,
  onAcceptBounty,
  uploadTokensRemainingToday = ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTopCaption, setQuickTopCaption] = useState('');
  const [quickBottomCaption, setQuickBottomCaption] = useState('');
  const [quickCategory, setQuickCategory] = useState('dank');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleSelectBlob = (fileOrBlob) => {
    if (!fileOrBlob) return;
    if (fileOrBlob.size > 15 * 1024 * 1024) {
      setStatusMsg('⚠️ Image is over 15MB. Please pick a smaller image.');
      return;
    }
    setStatusMsg('');
    setSelectedFile(fileOrBlob);
    const objectUrl = URL.createObjectURL(fileOrBlob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
    sfx.playPop(2);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectBlob(file);
    }
    e.target.value = '';
  };

  const handlePasteClipboardClick = async () => {
    setStatusMsg('');
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            handleSelectBlob(blob);
            return;
          }
        }
      }
      setStatusMsg('💡 Tip: Press Ctrl+V (or Cmd+V) anywhere on the page to paste a copied image!');
    } catch {
      setStatusMsg('💡 Press Ctrl+V anywhere on the page to paste an image from your clipboard!');
    }
  };

  const handleClearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setSelectedFile(null);
    setQuickTitle('');
    setQuickTopCaption('');
    setQuickBottomCaption('');
    setStatusMsg('');
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg('');
    try {
      await onQuickPublishFile({
        file: selectedFile,
        title: quickTitle.trim(),
        topText: quickTopCaption.trim(),
        bottomText: quickBottomCaption.trim(),
        category: quickCategory,
        event: e
      });
      handleClearPreview();
      setStatusMsg('✅ Meme uploaded to the live feed!');
      setTimeout(() => setStatusMsg(''), 3500);
    } catch {
      setStatusMsg('⚠️ Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={`tm-quick-upload-shell ${isDragOver ? 'drag-over' : ''}`}
      aria-label="1-Click Instant Meme Upload"
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          handleSelectBlob(file);
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <div className="tm-quick-upload-bar">
          <div
            className="tm-quick-upload-drop-trigger"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
          >
            <span className="tm-quick-upload-icon">📸</span>
            <div className="tm-quick-upload-copy">
              <div className="tm-quick-upload-headline">
                Got a funny meme or photo? <span>Drop, Paste, or Tap to Upload in 1 Click!</span>
              </div>
              <div className="tm-quick-upload-sub">
                Earn <strong>+40 🪙 Tokens &amp; +100 XP</strong> per upload ({uploadTokensRemainingToday} upload tokens left today)
              </div>
            </div>
          </div>

          <div className="tm-quick-upload-actions">
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              📥 Pick Photo / Meme
            </button>

            <button
              type="button"
              className="tm-btn"
              onClick={handlePasteClipboardClick}
              title="Paste image from clipboard (or press Ctrl+V)"
            >
              📋 Paste
            </button>

            <button
              type="button"
              className="tm-btn"
              onClick={() => cameraInputRef.current?.click()}
              title="Take a photo with your camera"
            >
              📷 Camera
            </button>

            <button
              type="button"
              className="tm-btn"
              style={{ borderColor: 'rgba(0, 243, 255, 0.4)', color: '#00f3ff' }}
              onClick={onOpenBlankStudio}
              title="Open the full Meme Forge Studio with filters, text layouts & stickers"
            >
              🎨 Full Studio
            </button>
          </div>
        </div>
      ) : (
        <form className="tm-quick-upload-composer" onSubmit={handleQuickSubmit}>
          <div className="tm-quick-preview-box">
            <img src={previewUrl} alt="Upload preview" className="tm-quick-preview-img" />
            <button
              type="button"
              className="tm-quick-remove-btn"
              onClick={handleClearPreview}
              title="Remove image"
            >
              ✕
            </button>
          </div>

          <div className="tm-quick-fields">
            <div className="tm-quick-fields-row">
              <input
                type="text"
                className="tm-input"
                placeholder="Give your meme a title (or leave blank for instant post)..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                style={{ flex: 2, minWidth: '180px' }}
              />
              <select
                className="tm-input"
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                style={{ flex: 1, minWidth: '130px', background: '#1e293b' }}
              >
                <option value="dank">#DANK / FUNNY</option>
                <option value="relatable">#RELATABLE</option>
                <option value="gaming">#GAMING</option>
                <option value="tech">#TECH</option>
              </select>
            </div>

            <div className="tm-quick-fields-row">
              <input
                type="text"
                className="tm-input"
                placeholder="Optional TOP TEXT overlay..."
                value={quickTopCaption}
                onChange={(e) => setQuickTopCaption(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="text"
                className="tm-input"
                placeholder="Optional BOTTOM TEXT overlay..."
                value={quickBottomCaption}
                onChange={(e) => setQuickBottomCaption(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <div className="tm-quick-submit-row">
              <button
                type="submit"
                className="tm-btn tm-btn-primary"
                disabled={isSubmitting}
                style={{ padding: '10px 18px', fontSize: '14px' }}
              >
                {isSubmitting ? '🚀 Uploading...' : '🚀 Post Meme Now (+40 🪙 & +100 XP)'}
              </button>

              <button
                type="button"
                className="tm-btn"
                onClick={() => {
                  const f = selectedFile;
                  handleClearPreview();
                  if (onOpenStudioWithFile && f) {
                    onOpenStudioWithFile(f);
                  }
                }}
              >
                🎨 Add Filters &amp; Stickers in Studio
              </button>

              <button type="button" className="tm-btn" onClick={handleClearPreview}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Compact Inline Daily Bounty Strip (replaces bulky separate banner) */}
      {activeBounty && !selectedFile && (
        <div className="tm-compact-bounty-strip">
          <div className="tm-compact-bounty-text">
            <span className="tm-bounty-chip">🎯 DAILY BOUNTY (+50 🪙)</span>
            <span>“{activeBounty.prompt}”</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              className="tm-link-btn"
              onClick={onCycleBounty}
              title="Next Bounty Prompt"
            >
              🔄 Next
            </button>
            <button
              type="button"
              className="tm-link-btn"
              style={{ color: '#facc15' }}
              onClick={() => onAcceptBounty && onAcceptBounty(activeBounty)}
            >
              🎯 Accept Challenge →
            </button>
          </div>
        </div>
      )}

      {statusMsg && <div className="tm-quick-status-msg">{statusMsg}</div>}
    </section>
  );
}
