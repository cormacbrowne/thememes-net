import { memo, useEffect, useRef, useState } from 'react';
import MemeOverlay from './MemeOverlay';
import { isOverlayBurnedIn } from './forge/forgeEngine';
import { registerAutoplay, hasUserGestured } from '../utils/videoAutoplay';
import { formatDuration } from '../utils/mediaPipeline';
import { sanitizeMediaUrl } from '../utils/securityGuard';
import { AI_BATTLE_IMAGE_LABEL, memeUsesAiPicture } from '../utils/battleImages';

/**
 * PHASE 26: unified meme media renderer (image | gif | video) + non-destructive overlay.
 * mode: 'feed' (shared IO autoplay) | 'reel' (active slide only, sound after gesture)
 *     | 'theater' (native controls) | 'swipe' (muted autoplay)
 */
const MemeMedia = memo(function MemeMedia({
  meme,
  mode = 'feed',
  active = false,
  preload = 'metadata',
  litePerfMode = false,
  className = '',
  imgLoading = 'lazy',
  priority = false
}) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [liteTapped, setLiteTapped] = useState(false);
  const isVideo = meme?.media_type === 'video';
  const showPosterOnly = isVideo && mode === 'feed' && litePerfMode && !liteTapped;

  useEffect(() => {
    const v = videoRef.current;
    if (!isVideo || !v || mode !== 'feed' || showPosterOnly) return undefined;
    return registerAutoplay(v);
  }, [isVideo, mode, showPosterOnly]);

  useEffect(() => {
    const v = videoRef.current;
    if (!isVideo || !v || mode !== 'reel') return;
    if (active) {
      v.muted = !hasUserGestured();
      setMuted(v.muted);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, [active, isVideo, mode]);

  if (!meme) return null;
  // Captions already baked into the file are never drawn a second time (owner brief item 3).
  const liveOverlay = isOverlayBurnedIn(meme) ? null : meme.overlay;
  const safeImageUrl = sanitizeMediaUrl(meme.image_url, '');
  const safePosterUrl = sanitizeMediaUrl(meme.poster_url, '');
  const boxStyle = meme.width && meme.height ? { aspectRatio: `${meme.width} / ${meme.height}` } : undefined;
  const effectiveLoading = priority ? 'eager' : imgLoading;

  // D-003 C5: house memes and template memes sit on AI pictures. The note goes under the
  // picture (never on it), so it can't cover a caption.
  const aiNote = memeUsesAiPicture(meme) ? <p className="tm-media-ai-note">{AI_BATTLE_IMAGE_LABEL}</p> : null;

  if (!isVideo) {
    return (
      <>
      <div className={`tm-media-box ${className}`} style={boxStyle}>
        {safeImageUrl && (
          <img
            src={safeImageUrl}
            alt={memeUsesAiPicture(meme) ? `${meme.title} (${AI_BATTLE_IMAGE_LABEL})` : meme.title}
            width={meme.width || 540}
            height={meme.height || 480}
            loading={effectiveLoading}
            fetchPriority={priority ? 'high' : undefined}
            decoding={priority ? 'sync' : 'async'}
            draggable={false}
          />
        )}
        <MemeOverlay overlay={liveOverlay} />
        {meme.media_type === 'gif' && <span className="tm-media-badge">GIF</span>}
      </div>
      {aiNote}
      </>
    );
  }

  if (showPosterOnly) {
    return (
      <div className={`tm-media-box ${className}`} style={boxStyle}>
        {safePosterUrl && (
          <img
            src={safePosterUrl}
            alt={meme.title}
            width={meme.width || 540}
            height={meme.height || 480}
            loading={effectiveLoading}
            fetchPriority={priority ? 'high' : undefined}
            decoding={priority ? 'sync' : 'async'}
          />
        )}
        {!safePosterUrl && <MemeOverlay overlay={liveOverlay} />}
        <button
          type="button"
          className="tm-media-play"
          onClick={(e) => {
            e.stopPropagation();
            setLiteTapped(true);
          }}
          aria-label="Play video"
        >
          ▶
        </button>
        <span className="tm-media-badge">🎬 {formatDuration(meme.duration_sec)}</span>
      </div>
    );
  }

  return (
    <div className={`tm-media-box ${className}`} style={boxStyle}>
      <video
        ref={videoRef}
        src={safeImageUrl}
        poster={safePosterUrl || undefined}
        muted={mode === 'theater' ? false : muted}
        loop={mode !== 'theater'}
        playsInline
        controls={mode === 'theater'}
        autoPlay={mode === 'swipe' || (mode === 'feed' && litePerfMode && liteTapped)}
        // Egress guard (T-013): with a poster to show, fetch nothing until the clip plays
        // (feed autoplay on scroll-in, or a tap). 'metadata' made Chrome download short clips in full.
        preload={mode === 'reel' ? preload : safePosterUrl ? 'none' : 'metadata'}
      />
      <MemeOverlay overlay={liveOverlay} />
      <span className="tm-media-badge">🎬 {formatDuration(meme.duration_sec)}</span>
      {mode !== 'theater' && (
        <button
          type="button"
          className="tm-media-unmute"
          onClick={(e) => {
            e.stopPropagation();
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
            if (v.paused) v.play().catch(() => {});
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}
    </div>
  );
});

export default MemeMedia;
