import { useState, useEffect, useRef } from 'react';
import { sfx } from '../utils/soundEngine';
import { getSettings, subscribeSettings, updateSettings } from '../utils/settingsStore';
import { RadioToggleButton } from './MemesRadio';
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
  showWallet = true,
  hasPractice = false,
  practiceMode = false,
  onTogglePractice,
  practiceDisabled = false,
  extraBadges = null,
  soundOn: soundOnProp,
  onToggleSound: onToggleSoundProp,
  howToPlay = [],
  statusBanner = null,
  children
}) {
  const [howToOpen, setHowToOpen] = useState(false);
  const [localSoundOn, setLocalSoundOn] = useState(() => getSettings().sfxOn);
  const [deltaInfo, setDeltaInfo] = useState(null);
  const prevTokensRef = useRef(tokens);
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
              ← Back
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
            <span className="tm-gs-wallet" aria-label={`Wallet ${tokens} tokens`}>
              🪙 <strong>{tokens}</strong>
              {deltaInfo && (
                <span
                  key={deltaInfo.id}
                  className={`tm-gs-delta ${deltaInfo.diff >= 0 ? 'is-up' : 'is-down'}`}
                >
                  {deltaInfo.diff > 0 ? `+${deltaInfo.diff}` : deltaInfo.diff}
                </span>
              )}
            </span>
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
              {practiceMode ? '🆓 Practice ON' : '🪙 Token Mode'}
            </button>
          )}

          <RadioToggleButton className="tm-gs-btn" />

          <button
            type="button"
            className="tm-gs-btn"
            onClick={handleToggleSound}
            aria-label={effectiveSoundOn ? 'Mute SFX' : 'Unmute SFX'}
            aria-pressed={!effectiveSoundOn}
          >
            {effectiveSoundOn ? '🔊' : '🔇'}
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
              ?
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
              onClick={() => setHowToOpen(false)}
              aria-label="Close instructions"
            >
              ✕
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

      <div className="tm-gs-body">{children}</div>

      <p className="tm-gs-compliance">
        Tokens are free, just for fun, can&apos;t be bought or cashed out.
      </p>
    </section>
  );
}
