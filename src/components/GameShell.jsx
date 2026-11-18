import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Share2, Check, Volume2, VolumeX, HelpCircle, X } from 'lucide-react';
import { sfx } from '../utils/soundEngine';
import { getSettings, subscribeSettings, updateSettings } from '../utils/settingsStore';
import { pulse } from '../utils/analytics';
import { RadioToggleButton } from './MemesRadio';
import { Wallet } from './ui/Money';
import './GameShell.css';

export default function GameShell({
  title,
  eyebrow = '',
  titleBadge = null,
  ariaLabel,
  className = '',
  embedded = false,
  onBack,
  tokens = null,
  centz = 0,
  showWallet = true,
  hasPractice = false,
  practiceMode = false,
  onTogglePractice,
  practiceDisabled = false,
  extraBadges = null,
  soundOn: soundOnProp,
  onToggleSound: onToggleSoundProp,
  sharePath = '',
  howToPlay = [],
  statusBanner = null,
  children
}) {
  const [howToOpen, setHowToOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localSoundOn, setLocalSoundOn] = useState(() => getSettings().sfxOn);
  const [deltaInfo, setDeltaInfo] = useState(null);
  const prevTokensRef = useRef(tokens);
  const bodyRef = useRef(null);
  const fitRef = useRef(null);

  // Owner brief 18 Nov 2026 (item 6): in full-screen mode on a phone the whole game must fit
  // with no scrolling. Measure the game's natural height and zoom it down to fit (CSS zoom keeps
  // touch / click coordinates right, unlike transform). Never below 55%; off outside full screen.
  useEffect(() => {
    const body = bodyRef.current;
    const fit = fitRef.current;
    if (!body || !fit || typeof window === 'undefined') return undefined;
    let raf = 0;
    let last = 1;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const fs = document.documentElement.classList.contains('tm-game-fs');
        if (!fs || window.innerWidth > 1024) {
          if (last !== 1) {
            fit.style.zoom = '';
            last = 1;
          }
          return;
        }
        // Read the unzoomed height in the same frame (no paint in between, so no flicker).
        const prevZoom = fit.style.zoom;
        fit.style.zoom = '';
        const natural = fit.getBoundingClientRect().height;
        fit.style.zoom = prevZoom;
        const avail = body.clientHeight - 2;
        const next = Math.max(0.55, Math.min(1, avail / Math.max(1, natural)));
        if (Math.abs(next - last) > 0.01) {
          fit.style.zoom = next === 1 ? '' : String(next);
          last = next;
        }
      });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(body);
    ro?.observe(fit);
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', measure);
      fit.style.zoom = '';
    };
  }, []);
  const deltaSeqRef = useRef(0);

  const effectiveSoundOn = soundOnProp !== undefined ? soundOnProp : localSoundOn;

  useEffect(() => {
    return subscribeSettings((next) => setLocalSoundOn(Boolean(next.sfxOn)));
  }, []);

  useEffect(() => {
    if (typeof tokens !== 'number' || !Number.isFinite(tokens)) return undefined;
    const prev = prevTokensRef.current;
    prevTokensRef.current = tokens;
    if (typeof prev !== 'number' || prev === tokens) return undefined;

    const diff = tokens - prev;
    deltaSeqRef.current += 1;
    const seq = deltaSeqRef.current;

    const rafId = requestAnimationFrame(() => {
      setDeltaInfo({ id: seq, diff });
    });
    const clearTimer = setTimeout(() => {
      setDeltaInfo((curr) => (curr && curr.id === seq ? null : curr));
    }, 1350);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(clearTimer);
    };
  }, [tokens]);

  const handleToggleSound = () => {
    if (onToggleSoundProp) {
      onToggleSoundProp();
      return;
    }
    const nextOn = !effectiveSoundOn;
    updateSettings({ sfxOn: nextOn });
    if (nextOn) sfx.playToggle();
  };

  const handleShareGame = () => {
    if (typeof window === 'undefined') return;
    const baseUrl = sharePath
      ? `${window.location.origin}${sharePath.startsWith('/') ? sharePath : `/${sharePath}`}`
      : window.location.href;
    const sep = baseUrl.includes('?') ? '&' : '?';
    const targetUrl = baseUrl.includes('ref=') ? baseUrl : `${baseUrl}${sep}ref=game`;
    navigator.clipboard?.writeText(targetUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      pulse('share', { surface: 'game_shell', method: 'native' });
      navigator
        .share({
          title: `${title} — Free Game on THE MEMES.net`,
          text: `Play ${title} free online! 🎮`,
          url: targetUrl
        })
        .catch(() => {});
    } else {
      pulse('share', { surface: 'game_shell', method: 'copy' });
    }
    sfx.playPop?.(2);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <section
      className={`tm-gs-shell ${embedded ? 'is-embedded' : ''} ${className}`.trim()}
      aria-label={ariaLabel || title}
    >
      <header className="tm-gs-header">
        <div className="tm-gs-left">
          {onBack && (
            <button
              type="button"
              className="tm-gs-btn"
              onClick={() => {
                sfx.playToggle();
                onBack();
              }}
              aria-label="Back"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back</span>
            </button>
          )}
          <div className="tm-gs-title-group">
            {eyebrow && <div className="tm-gs-eyebrow">{eyebrow}</div>}
            <div className="tm-gs-title-row">
              <h1 className="tm-gs-title">{title}</h1>
              {titleBadge}
            </div>
          </div>
        </div>

        <div className="tm-gs-right">
          {showWallet && typeof tokens === 'number' && (
            <Wallet tokens={tokens} centz={centz} size="sm" delta={deltaInfo} />
          )}

          {extraBadges}

          {hasPractice && onTogglePractice && (
            <button
              type="button"
              className={`tm-gs-btn ${practiceMode ? 'is-active' : ''}`}
              disabled={practiceDisabled}
              onClick={() => {
                sfx.playToggle();
                onTogglePractice();
              }}
              aria-pressed={practiceMode}
            >
              {practiceMode ? '🆓 Practice ON' : '💵 MemeDollarz Mode'}
            </button>
          )}

          <RadioToggleButton className="tm-gs-btn" />

          <button
            type="button"
            className={`tm-gs-btn ${copiedLink ? 'is-active' : ''}`}
            onClick={handleShareGame}
            aria-label={`Share link to ${title}`}
            title={`Copy or share direct link to ${title}`}
          >
            {copiedLink ? (
              <>
                <Check size={14} aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Share2 size={14} aria-hidden="true" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="tm-gs-btn"
            onClick={handleToggleSound}
            aria-label={effectiveSoundOn ? 'Mute SFX' : 'Unmute SFX'}
            aria-pressed={!effectiveSoundOn}
          >
            {effectiveSoundOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          </button>

          {howToPlay.length > 0 && (
            <button
              type="button"
              className={`tm-gs-btn ${howToOpen ? 'is-active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setHowToOpen((v) => !v);
              }}
              aria-label={`How to play ${title}`}
              aria-expanded={howToOpen}
            >
              <HelpCircle size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {howToOpen && howToPlay.length > 0 && (
        <div className="tm-gs-howto" role="dialog" aria-label={`How to play ${title}`}>
          <div className="tm-gs-howto-head">
            <span>How to play</span>
            <button
              type="button"
              className="tm-gs-btn"
              style={{
                borderColor: 'rgba(255, 77, 166, 0.9)',
                background: 'rgba(255, 42, 133, 0.28)',
                color: '#fff',
                minHeight: '38px',
                padding: '6px 12px',
                fontWeight: 900
              }}
              onClick={() => setHowToOpen(false)}
              aria-label="Close instructions"
            >
              <X size={14} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
          <ul>
            {howToPlay.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {statusBanner && (
        <div className="tm-gs-live" role="status" aria-live="polite">
          {statusBanner}
        </div>
      )}

      <div className="tm-gs-body" ref={bodyRef}>
        <div className="tm-gs-fit" ref={fitRef}>
          {children}
        </div>
      </div>

      <p className="tm-gs-compliance">
        Tokens are free, just for fun, can&apos;t be bought or cashed out.
      </p>
    </section>
  );
}
