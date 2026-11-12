import { useState, useEffect, useRef } from 'react';
import { sfx } from '../utils/soundEngine';
import { setRadioOn } from '../utils/radioBus';
import { RadioStationStrip } from './MemesRadio';
import './InsertCoinIntro.css';

export const INTRO_SEEN_KEY = 'tm_intro_seen';

/**
 * One-time 2-second skippable arcade boot moment (Phase 28.12).
 * CRT power-on flicker -> INSERT COIN -> tap anywhere -> coin-drop sound +
 * optional THE MEMES FM fade-in -> straight into the first meme.
 * The tap doubles as the iOS WebKit / Android Chrome user-gesture audio unlock.
 */
export default function InsertCoinIntro({ onComplete }) {
  const [optInRadio, setOptInRadio] = useState(true);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const finish = ({ playSound = true, startRadio = false } = {}) => {
    if (doneRef.current) return;
    doneRef.current = true;
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // ignore storage errors
    }

    if (playSound) {
      sfx.hasUserGesture = true;
      sfx.unlockIosAudio();
      sfx.playCoinInsert?.();
    }
    if (startRadio) {
      setRadioOn(true, { fadeInSec: 1.6 });
    }

    setExiting(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 240);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        finish({ playSound: false, startRadio: false });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish({ playSound: true, startRadio: optInRadio });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className={`tm-intro-backdrop ${exiting ? 'is-exiting' : ''}`}
      onClick={() => finish({ playSound: true, startRadio: optInRadio })}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to THE MEMES.net — Insert Coin to Start"
    >
      <div className="tm-intro-crt-flash" aria-hidden="true" />
      <div className="tm-intro-scanlines" aria-hidden="true" />

      <div className="tm-intro-cabinet">
        <div className="tm-intro-boot-line">ROM OK • VIDEO OK • SYNTH 86 READY</div>
        <div className="tm-intro-logo">THE MEMES.net</div>
        <div className="tm-intro-sub">CYBER-ARCADE MEME MACHINE</div>

        <button
          type="button"
          className="tm-intro-coin-slot"
          onClick={(e) => {
            e.stopPropagation();
            finish({ playSound: true, startRadio: optInRadio });
          }}
        >
          <span className="tm-intro-coin" aria-hidden="true">🪙</span>
          <span className="tm-intro-blink">INSERT COIN</span>
          <span className="tm-intro-hint">TAP ANYWHERE TO START</span>
        </button>

        <label
          className="tm-intro-radio-opt"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={optInRadio}
            onChange={(e) => setOptInRadio(e.target.checked)}
          />
          <span>📼 Fade in THE MEMES FM synthwave radio</span>
        </label>

        {optInRadio && <RadioStationStrip autoStart={false} compact />}

        <button
          type="button"
          className="tm-intro-skip"
          onClick={(e) => {
            e.stopPropagation();
            finish({ playSound: false, startRadio: false });
          }}
        >
          Skip (silent) →
        </button>
      </div>
    </div>
  );
}
