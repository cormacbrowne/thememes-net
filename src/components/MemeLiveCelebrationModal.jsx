import { useEffect, useState } from 'react';
import MemeMedia from './MemeMedia';
import './MemeLiveCelebrationModal.css';

const CONFETTI_PIECES = [
  { left: '8%', delay: '0s', color: '#00f3ff' },
  { left: '16%', delay: '0.18s', color: '#ec4899' },
  { left: '25%', delay: '0.07s', color: '#facc15' },
  { left: '34%', delay: '0.25s', color: '#4ade80' },
  { left: '44%', delay: '0.1s', color: '#a855f7' },
  { left: '55%', delay: '0.22s', color: '#00f3ff' },
  { left: '64%', delay: '0.05s', color: '#ec4899' },
  { left: '73%', delay: '0.28s', color: '#facc15' },
  { left: '82%', delay: '0.12s', color: '#4ade80' },
  { left: '91%', delay: '0.2s', color: '#f97316' }
];

export default function MemeLiveCelebrationModal({
  meme,
  rewardSummary = '+45 🪙 & +120 XP',
  litePerfMode = false,
  onShareMeme,
  onOpenTheater,
  onClose
}) {
  const [copied, setCopied] = useState(false);
  const [nativeShared, setNativeShared] = useState(false);

  useEffect(() => {
    if (!meme) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [meme, onClose]);

  if (!meme) return null;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/m/${encodeURIComponent(String(meme.id))}?ref=share`
      : `https://thememes.net/m/${encodeURIComponent(String(meme.id))}?ref=share`;

  const handleCopy = (e) => {
    if (onShareMeme) {
      onShareMeme(meme, e);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async (e) => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: meme.title || 'Check out my meme on THE MEMES.net!',
          text: `🚀 I just dropped a meme on THE MEMES.net: "${meme.title || 'Fresh Meme'}"`,
          url: shareUrl
        });
        setNativeShared(true);
        setTimeout(() => setNativeShared(false), 2200);
        return;
      } catch {
        // user cancelled or unsupported; fallback to copy
      }
    }
    handleCopy(e);
  };

  return (
    <div
      className="tm-modal-backdrop tm-live-celebration-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your meme is live"
    >
      {!litePerfMode && (
        <div className="tm-live-confetti-layer" aria-hidden="true">
          {CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              className="tm-live-confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color
              }}
            />
          ))}
        </div>
      )}

      <div
        className="tm-modal tm-live-celebration-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-live-celebration-kicker">BROADCASTING LIVE TO COMMUNITY FEED</div>
        <h2 className="tm-live-celebration-title">🚀 YOUR MEME IS LIVE!</h2>
        <p className="tm-live-celebration-sub">
          You earned <strong style={{ color: '#facc15' }}>{rewardSummary}</strong> — share your link to rack up upvotes &amp; remixes!
        </p>

        <div className="tm-live-celebration-preview">
          <MemeMedia meme={meme} mode="theater" />
        </div>

        <div className="tm-live-celebration-meta">
          <span className="tm-tag">#{meme.category || 'dank'}</span>
          <strong className="tm-live-celebration-meme-title">{meme.title}</strong>
        </div>

        <div className="tm-live-celebration-actions">
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={handleNativeShare}
          >
            {nativeShared ? '✅ Shared!' : '📲 Share Meme'}
          </button>
          <button
            type="button"
            className="tm-btn"
            onClick={handleCopy}
          >
            {copied ? '✅ Link Copied!' : '🔗 Copy Direct Link'}
          </button>
          {onOpenTheater && (
            <button
              type="button"
              className="tm-btn"
              onClick={() => {
                onClose();
                onOpenTheater(meme);
              }}
            >
              👀 View in Theater
            </button>
          )}
          <button type="button" className="tm-btn" onClick={onClose}>
            ✨ Back to Feed
          </button>
        </div>
      </div>
    </div>
  );
}
