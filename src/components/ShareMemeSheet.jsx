import { useEffect, useRef, useState } from 'react';
import { track, memeShareUrl } from '../utils/analytics';
import { Share2, Download, Link2, X, Check } from 'lucide-react';
import { exportMemeWithWatermark, triggerBlobDownload } from './forge/forgeEngine';
import './ShareMemeSheet.css';

/**
 * Share / save a posted meme with the thememes.net logo burned in (owner brief 17 Nov 2026).
 * The file is prepared first (videos play through once), then Share opens the phone's share
 * sheet from a fresh tap, which iPhone Safari requires.
 */
// Plan 2.2: quick-share targets. Discord has no share URL, so it copies the link.
const QUICK_SHARES = [
  { id: 'whatsapp', label: 'WhatsApp', url: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { id: 'x', label: 'X', url: (u, t) => `https://x.com/intent/post?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: 'reddit', label: 'Reddit', url: (u, t) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}` },
  { id: 'discord', label: 'Discord (copy)', url: null }
];

export default function ShareMemeSheet({ meme, initialAction = 'share', onClose, onShared }) {
  const [state, setState] = useState('preparing'); // preparing | ready | failed
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const closeRef = useRef(null);

  const shareUrl = memeShareUrl(meme);
  const isVideo = meme.media_type === 'video';
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  useEffect(() => {
    let alive = true;
    let url = '';
    closeRef.current?.focus();
    exportMemeWithWatermark(meme, { watermark: true, onProgress: (p) => alive && setProgress(p) })
      .then((res) => {
        if (!alive) return;
        if (!res?.blob) {
          setState('failed');
          return;
        }
        url = URL.createObjectURL(res.blob);
        setPreviewUrl(url);
        setResult(res);
        setState('ready');
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meme]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const safeName = (meme.title || 'meme').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 32).replace(/^-|-$/g, '') || 'meme';
  const filename = result ? `${safeName}-thememes-net.${result.filename.split('.').pop()}` : '';

  const doShare = async () => {
    if (!result) return;
    const file = new File([result.blob], filename, { type: result.blob.type || result.mime });
    try {
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: meme.title || 'Meme from thememes.net', text: shareUrl });
        onShared?.('native_file');
        setNote('Shared!');
        return;
      }
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: meme.title || 'Meme from thememes.net', url: shareUrl });
        onShared?.('native_link');
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    doDownload();
  };

  const doDownload = () => {
    if (!result) return;
    triggerBlobDownload(result.blob, filename);
    track('meme_downloaded', { meme_id: String(meme.id), type: isVideo ? 'video' : 'image' });
    onShared?.('download');
    setNote(isVideo ? 'Saved. On iPhone: open Downloads (Files) and tap Share → Save Video.' : 'Saved to your downloads.');
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onShared?.('copy');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNote(shareUrl);
    }
  };

  const primaryIsShare = initialAction !== 'download' && typeof navigator.share === 'function';

  return (
    <div className="tm-share-backdrop" onClick={onClose} role="presentation">
      <div
        className="tm-share-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tm-share-head">
          <h2 id="tm-share-title">{initialAction === 'download' ? 'Save meme' : 'Share meme'}</h2>
          <button ref={closeRef} type="button" className="tm-share-x" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="tm-share-preview">
          {state === 'ready' && previewUrl ? (
            isVideo && result?.mime?.startsWith('video') ? (
              <video src={previewUrl} controls playsInline muted loop autoPlay />
            ) : (
              <img src={previewUrl} alt={`${meme.title || 'Meme'} with thememes.net logo`} />
            )
          ) : state === 'failed' ? (
            <p className="tm-share-msg">
              This browser could not add the logo to this file. You can still copy the link below.
            </p>
          ) : (
            <div className="tm-share-progress" role="status" aria-live="polite">
              <span>
                {isVideo ? 'Adding the thememes.net logo to your video…' : 'Adding the thememes.net logo…'}
              </span>
              <div className="tm-share-bar">
                <div style={{ width: `${Math.round(Math.max(0.06, progress) * 100)}%` }} />
              </div>
              {isVideo && <small>The video plays through once while it records. Keep this open.</small>}
            </div>
          )}
        </div>

        <div className="tm-share-actions">
          {primaryIsShare ? (
            <>
              <button type="button" className="tm-share-btn is-primary" disabled={state !== 'ready'} onClick={doShare}>
                <Share2 size={18} aria-hidden="true" /> Share
              </button>
              <button type="button" className="tm-share-btn" disabled={state !== 'ready'} onClick={doDownload}>
                <Download size={18} aria-hidden="true" /> Save
              </button>
            </>
          ) : (
            <button type="button" className="tm-share-btn is-primary" disabled={state !== 'ready'} onClick={doDownload}>
              <Download size={18} aria-hidden="true" /> Download {isVideo ? 'video' : 'image'}
            </button>
          )}
          <button type="button" className="tm-share-btn" onClick={doCopy}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {/* Plan 2.2: one-tap shares. Every link carries ?ref=share&m=<id>. */}
        <div className="tm-share-quick" aria-label="Share to an app">
          {QUICK_SHARES.map((q) => (
            <a
              key={q.id}
              className={`tm-share-quick-btn is-${q.id}`}
              href={q.url ? q.url(shareUrl, meme.title || 'Meme from thememes.net') : undefined}
              target={q.url ? '_blank' : undefined}
              rel={q.url ? 'noopener noreferrer' : undefined}
              role={q.url ? undefined : 'button'}
              tabIndex={0}
              onClick={async (e) => {
                if (!q.url) {
                  e.preventDefault();
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setNote('Link copied. Paste it into Discord.');
                  } catch {
                    setNote(shareUrl);
                  }
                }
                track('meme_shared', { channel: q.id, meme_id: String(meme.id) });
                onShared?.(q.id);
              }}
            >
              {q.label}
            </a>
          ))}
        </div>
        {note && (
          <p className="tm-share-msg" role="status">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
