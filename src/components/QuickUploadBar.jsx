import { useState, useRef } from 'react';
import { sfx } from '../utils/soundEngine';
import { VIRAL_CAPTIONS } from '../data/starterMemes';
import { ACCEPT_MEDIA, validateFile } from '../utils/mediaPipeline';
import {
  makeTextLayer,
  exportMemeWithWatermark,
  triggerBlobDownload,
  shareExportedMeme
} from './forge/forgeEngine';

export default function QuickUploadBar({
  onQuickPublishFile,
  onOpenStudioWithFile
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedKind, setSelectedKind] = useState('image');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTopCaption, setQuickTopCaption] = useState('');
  const [quickBottomCaption, setQuickBottomCaption] = useState('');
  const [quickCategory, setQuickCategory] = useState('dank');
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const buildQuickLayers = () => {
    const layers = [];
    if (quickTopCaption.trim()) {
      layers.push(makeTextLayer({ slot: 'top', text: quickTopCaption.trim(), y: 0.1, h: 0.18, fill: '#ffffff' }));
    }
    if (quickBottomCaption.trim()) {
      layers.push(makeTextLayer({ slot: 'bottom', text: quickBottomCaption.trim(), y: 0.89, h: 0.18, fill: '#ffffff' }));
    }
    return layers;
  };

  const handleSelectBlob = async (fileOrBlob) => {
    if (!fileOrBlob) return;
    setStatusMsg('Checking media...');
    const res = await validateFile(fileOrBlob);
    if (!res.ok) {
      setStatusMsg(res.error || '⚠️ Invalid file');
      return;
    }
    setStatusMsg(res.tip || '');
    setSelectedFile(fileOrBlob);
    setSelectedKind(res.kind || 'image');
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
    setShowPostOptions(false);
    setStatusMsg('');
  };

  const handleQuickDownload = async () => {
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg(
      selectedKind === 'gif'
        ? '🎞️ Encoding GIF with captions & www.thememes.net watermark… 0%'
        : '🖼️ Rendering meme with www.thememes.net watermark…'
    );
    try {
      const res = await exportMemeWithWatermark(
        {
          kind: selectedKind,
          file: selectedFile,
          url: previewUrl,
          layers: buildQuickLayers()
        },
        {
          watermark: true,
          onProgress: (p) => {
            if (selectedKind === 'gif') {
              setStatusMsg(`🎞️ Encoding GIF… ${Math.round(p * 100)}%`);
            }
          }
        }
      );
      if (res?.blob) {
        triggerBlobDownload(res.blob, res.filename);
        setStatusMsg('✅ Downloaded with www.thememes.net watermark!');
        sfx.playPop(2);
      }
    } catch {
      setStatusMsg('⚠️ Could not export right now — try opening Full Editor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickShare = async () => {
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMsg('📤 Preparing meme with www.thememes.net watermark…');
    try {
      const res = await exportMemeWithWatermark(
        {
          kind: selectedKind,
          file: selectedFile,
          url: previewUrl,
          layers: buildQuickLayers()
        },
        {
          watermark: true,
          onProgress: (p) => {
            if (selectedKind === 'gif') {
              setStatusMsg(`🎞️ Preparing GIF… ${Math.round(p * 100)}%`);
            }
          }
        }
      );
      const caption = [quickTopCaption.trim(), quickBottomCaption.trim()].filter(Boolean).join(' — ');
      const outcome = await shareExportedMeme({
        blob: res?.blob || null,
        filename: res?.filename || `thememes-net-${Date.now()}.png`,
        title: quickTitle.trim() || caption || 'Meme made on www.thememes.net',
        text: 'Made on www.thememes.net',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://www.thememes.net'
      });
      if (outcome.method === 'files' || outcome.method === 'url') {
        setStatusMsg('✅ Shared with www.thememes.net watermark!');
        sfx.playPop(2);
      } else if (outcome.method === 'download') {
        setStatusMsg('💾 Saved watermarked file & copied www.thememes.net link to share anywhere!');
        sfx.playPop(2);
      }
    } catch {
      setStatusMsg('⚠️ Share failed — try Download instead.');
    } finally {
      setIsSubmitting(false);
    }
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
      setStatusMsg('✅ Meme posted to the live feed!');
      setTimeout(() => setStatusMsg(''), 3500);
    } catch {
      setStatusMsg('⚠️ Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="tm-quick-upload-shell"
      aria-label="Simple Image & GIF Meme Maker"
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
        if (file) {
          handleSelectBlob(file);
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MEDIA}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT_MEDIA}
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <div className={`tm-quick-upload-bar ${isDragOver ? 'dragging' : ''}`}>
          <div
            className="tm-quick-upload-prompt"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
          >
            <span className="tm-quick-upload-icon">🖼️</span>
            <div>
              <div className="tm-quick-upload-title">
                Upload an Image or GIF → Add Top &amp; Bottom Meme Text
              </div>
              <div className="tm-quick-upload-sub">
                Drop, pick, or paste (Ctrl+V) any photo or GIF — instant download &amp; share with{' '}
                <code>www.thememes.net</code> watermark.
              </div>
            </div>
          </div>

          <div className="tm-quick-upload-actions">
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              📸 Upload Image / GIF
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
              className="tm-btn tm-hide-mobile"
              onClick={() => cameraInputRef.current?.click()}
              title="Take a photo with your camera"
            >
              📷 Camera
            </button>
          </div>
        </div>
      ) : (
        <form className="tm-quick-upload-bar tm-quick-upload-composer" onSubmit={handleQuickSubmit}>
          <div className="tm-quick-preview-box">
            {selectedKind === 'video' ? (
              <video
                src={previewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="tm-quick-preview-img"
              />
            ) : (
              <img src={previewUrl} alt="Upload preview" className="tm-quick-preview-img" />
            )}
            {quickTopCaption.trim() && (
              <div className="tm-quick-live-meme-text is-top">{quickTopCaption}</div>
            )}
            {quickBottomCaption.trim() && (
              <div className="tm-quick-live-meme-text is-bottom">{quickBottomCaption}</div>
            )}
            <button
              type="button"
              className="tm-quick-preview-clear"
              onClick={handleClearPreview}
              aria-label="Remove media"
              title="Remove media"
            >
              ✕
            </button>
          </div>

          <div className="tm-quick-composer-fields">
            <div className="tm-quick-fields-row">
              <input
                type="text"
                className="tm-input"
                aria-label="Top meme text"
                placeholder="TOP TEXT (classic meme style)..."
                value={quickTopCaption}
                onChange={(e) => setQuickTopCaption(e.target.value)}
                style={{ flex: 1, minWidth: '180px' }}
              />
              <input
                type="text"
                className="tm-input"
                aria-label="Bottom meme text"
                placeholder="BOTTOM TEXT (punchline)..."
                value={quickBottomCaption}
                onChange={(e) => setQuickBottomCaption(e.target.value)}
                style={{ flex: 1, minWidth: '180px' }}
              />
            </div>

            {showPostOptions && (
              <div className="tm-quick-fields-row">
                <input
                  type="text"
                  className="tm-input"
                  placeholder="Optional title (auto-filled from captions if blank)..."
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
            )}

            <div className="tm-quick-composer-btns">
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                disabled={isSubmitting}
                onClick={handleQuickDownload}
                title="Download with www.thememes.net watermark"
              >
                {selectedKind === 'gif' ? '🎞️ Download GIF' : '⬇ Download'}
              </button>

              <button
                type="button"
                className="tm-btn"
                disabled={isSubmitting}
                onClick={handleQuickShare}
                title="Share watermarked meme"
              >
                📤 Share
              </button>

              <button
                type="submit"
                className="tm-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? '🚀 Posting...' : '🚀 Post to Feed'}
              </button>

              <button
                type="button"
                className="tm-btn"
                onClick={() => {
                  sfx.playToggle();
                  const pair =
                    VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)];
                  setQuickTopCaption(pair[0]);
                  setQuickBottomCaption(pair[1]);
                }}
                title="Fill with random meme text"
              >
                🎲 Random Text
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
                🎨 More Options
              </button>

              <button
                type="button"
                className="tm-btn"
                onClick={() => setShowPostOptions((prev) => !prev)}
                aria-expanded={showPostOptions}
              >
                {showPostOptions ? '▴ Less' : '⚙️ Title/Tag'}
              </button>

              <button type="button" className="tm-btn" onClick={handleClearPreview}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {statusMsg && <div className="tm-quick-status-msg">{statusMsg}</div>}
    </section>
  );
}
