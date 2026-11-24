import { useEffect, useRef, useState } from 'react';
import { track, memeShareUrl } from '../utils/analytics';
import { Share2, Download, Link2, X, Check } from 'lucide-react';
import { exportMemeWithWatermark, triggerBlobDownload } from './forge/forgeEngine';
import Sheet from './ui/Sheet';
import './ShareMemeSheet.css';
import { ensureShareUrlInText, linkSafeShareText } from '../utils/shareText.js';

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

// eslint-disable-next-line react-refresh/only-export-components
export async function executeMemeNativeShare({
  meme,
  result,
  filename,
  shareUrl,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  onDownload,
  onTrack = track,
  onShared
}) {
  if (!result) return { status: 'not_ready' };
  const canShareFiles =
    typeof nav !== 'undefined' &&
    typeof nav?.share === 'function' &&
    typeof nav?.canShare === 'function';
  const file = new File([result.blob], filename, { type: result.blob.type || result.mime });
  try {
    const shareTitle = linkSafeShareText(meme.title || 'Meme from THE MEMES.net');
    if (canShareFiles && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: shareTitle, text: ensureShareUrlInText(meme.title || '', shareUrl) });
      onTrack('meme_shared', { channel: 'native_file', meme_id: String(meme.id) });
      onShared?.('native_file');
      return { status: 'shared', channel: 'native_file' };
    }
    if (typeof nav?.share === 'function') {
      await nav.share({ title: shareTitle, text: ensureShareUrlInText(meme.title || '', shareUrl), url: shareUrl });
      onTrack('meme_shared', { channel: 'native_link', meme_id: String(meme.id) });
      onShared?.('native_link');
      return { status: 'shared', channel: 'native_link' };
    }
  } catch (err) {
    if (err?.name === 'AbortError') return { status: 'cancelled' };
  }
  onDownload?.();
  return { status: 'fallback_download' };
}

// eslint-disable-next-line react-refresh/only-export-components
export async function executeMemeCopy({
  meme,
  shareUrl,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  onTrack = track,
  onShared
}) {
  try {
    if (typeof nav?.clipboard?.writeText !== 'function') return false;
    await nav.clipboard.writeText(shareUrl);
    onTrack('meme_shared', { channel: 'copy', meme_id: String(meme.id) });
    onShared?.('copy');
    return true;
  } catch {
    return false;
  }
}

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

  useEffect(() => {
    let alive = true;
    let url = '';
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

  const safeName = (meme.title || 'meme').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 32).replace(/^-|-$/g, '') || 'meme';
  const filename = result ? `${safeName}-thememes-net.${result.filename.split('.').pop()}` : '';

  const doShare = async () => {
    const outcome = await executeMemeNativeShare({
      meme,
      result,
      filename,
      shareUrl,
      onDownload: doDownload,
      onShared
    });
    if (outcome.status === 'shared' && outcome.channel === 'native_file') {
      setNote('Shared!');
    }
  };

  const doDownload = () => {
    if (!result) return;
    triggerBlobDownload(result.blob, filename);
    track('meme_downloaded', { meme_id: String(meme.id), type: isVideo ? 'video' : 'image' });
    onShared?.('download');
    setNote(isVideo ? 'Saved. On iPhone: open Downloads (Files) and tap Share → Save Video.' : 'Saved to your downloads.');
  };

  const doCopy = async () => {
    const ok = await executeMemeCopy({ meme, shareUrl, onShared });
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      setNote(shareUrl);
    }
  };

  const primaryIsShare = initialAction !== 'download' && typeof navigator.share === 'function';

  return (
    <Sheet
      onClose={onClose}
      labelledBy="tm-share-title"
      initialFocusRef={closeRef}
      backdropClassName="tm-share-backdrop"
      panelClassName="tm-share-sheet"
    >
      <header className="tm-share-head">
        <h2 id="tm-share-title">{initialAction === 'download' ? 'Save meme' : 'Share meme'}</h2>
        <button
          ref={closeRef}
          type="button"
          className="tm-share-x min-w-[44px] min-h-[44px]"
          onClick={onClose}
          aria-label="Close"
        >
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
        {QUICK_SHARES.map((q) =>
          q.url ? (
            <a
              key={q.id}
              className={`tm-share-quick-btn is-${q.id}`}
              href={q.url(shareUrl, linkSafeShareText(meme.title || 'Meme from THE MEMES.net'))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track('meme_shared', { channel: q.id, meme_id: String(meme.id) });
                onShared?.(q.id);
              }}
            >
              {q.label}
            </a>
          ) : (
            <button
              key={q.id}
              type="button"
              className={`tm-share-quick-btn is-${q.id}`}
              onClick={async () => {
                try {
                  if (typeof navigator?.clipboard?.writeText !== 'function') {
                    throw new Error('clipboard_unavailable');
                  }
                  await navigator.clipboard.writeText(shareUrl);
                  setNote('Link copied. Paste it into Discord.');
                } catch {
                  setNote(shareUrl);
                  return;
                }
                track('meme_shared', { channel: q.id, meme_id: String(meme.id) });
                onShared?.(q.id);
              }}
            >
              {q.label}
            </button>
          )
        )}
      </div>
      {note && (
        <p className="tm-share-msg" role="status">
          {note}
        </p>
      )}
    </Sheet>
  );
}
