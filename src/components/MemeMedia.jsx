import { memo, useEffect, useRef, useState } from 'react';
import MemeOverlay from './MemeOverlay';
import { registerAutoplay, hasUserGestured } from '../utils/videoAutoplay';
import { formatDuration } from '../utils/mediaPipeline';

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
  imgLoading = 'lazy'
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
  const boxStyle = meme.width && meme.height ? { aspectRatio: `${meme.width} / ${meme.height}` } : undefined;

  if (!isVideo) {
    return (
      <div className={`tm-media-box ${className}`} style={boxStyle}>
        <img src={meme.image_url} alt={meme.title} loading={imgLoading} decoding="async" draggable={false} />
        <MemeOverlay overlay={meme.overlay} />
        {meme.media_type === 'gif' && <span className="tm-media-badge">GIF</span>}
      </div>
    );
  }

  if (showPosterOnly) {
    return (
      <div className={`tm-media-box ${className}`} style={boxStyle}>
        <img src={meme.poster_url || ''} alt={meme.title} loading="lazy" decoding="async" />
        <MemeOverlay overlay={meme.overlay} />
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
        src={meme.image_url}
        poster={meme.poster_url || undefined}
        muted={mode === 'theater' ? false : muted}
        loop={mode !== 'theater'}
        playsInline
        controls={mode === 'theater'}
        autoPlay={mode === 'swipe' || (mode === 'feed' && litePerfMode && liteTapped)}
        preload={mode === 'reel' ? preload : 'metadata'}
      />
      <MemeOverlay overlay={meme.overlay} />
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
