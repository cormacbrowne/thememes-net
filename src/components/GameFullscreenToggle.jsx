import { useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import './GameFullscreenToggle.css';

const FS_CLASS = 'tm-game-fs';

function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function requestNativeFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return Promise.resolve(false);
  try {
    const out = req.call(el, { navigationUI: 'hide' });
    return Promise.resolve(out).then(
      () => true,
      () => false
    );
  } catch {
    return Promise.resolve(false);
  }
}

function exitNativeFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (fsElement() && exit) {
    try {
      Promise.resolve(exit.call(document)).catch(() => {});
    } catch {
      // ignore
    }
  }
}

const isIPhone = () =>
  typeof navigator !== 'undefined' && /iPhone|iPod/i.test(navigator.userAgent || '');
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

/**
 * Owner brief 17 Nov 2026 (item 5): one button that makes any game fill the phone screen.
 * Uses the real Fullscreen API where the browser has it (Android, iPad, desktop). iPhone Safari
 * has no Fullscreen API for pages, so there it switches to an immersive mode that hides every bar
 * and gives the whole screen to the game; a one-time tip explains "Add to Home Screen" for the
 * last few pixels (Safari's own address bar).
 */
export default function GameFullscreenToggle({ active, floatEnter = true }) {
  const [on, setOn] = useState(false);
  const [tip, setTip] = useState(false);

  const apply = useCallback((next) => {
    document.documentElement.classList.toggle(FS_CLASS, next);
    setOn(next);
    window.dispatchEvent(new Event('resize'));
  }, []);

  const enter = useCallback(async () => {
    apply(true);
    window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    const native = await requestNativeFullscreen();
    if (!native && isIPhone() && !isStandalone()) {
      try {
        if (!localStorage.getItem('tm_fs_tip_seen')) {
          localStorage.setItem('tm_fs_tip_seen', '1');
          setTip(true);
        }
      } catch {
        setTip(true);
      }
    }
  }, [apply]);

  const exit = useCallback(() => {
    exitNativeFullscreen();
    apply(false);
    setTip(false);
  }, [apply]);

  // The game top bar has its own "full screen" button; it asks us through a window event.
  useEffect(() => {
    if (!active) return undefined;
    const onAsk = () => enter();
    window.addEventListener('tm-game-fs-enter', onAsk);
    return () => window.removeEventListener('tm-game-fs-enter', onAsk);
  }, [active, enter]);

  // Leaving the game, or the browser leaving native fullscreen (Esc / swipe), ends the mode.
  useEffect(() => {
    if (!active && on) Promise.resolve().then(exit);
  }, [active, on, exit]);

  useEffect(() => {
    const onFsChange = () => {
      if (!fsElement() && document.documentElement.classList.contains(FS_CLASS) && !isIPhone()) {
        apply(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.documentElement.classList.remove(FS_CLASS);
    };
  }, [apply]);

  if (!active) return null;

  return (
    <>
      {(on || floatEnter) && (
      <button
        type="button"
        className={`tm-game-fs-btn ${on ? 'is-on' : ''}`}
        onClick={on ? exit : enter}
        aria-pressed={on}
        aria-label={on ? 'Exit full screen' : 'Play full screen'}
        title={on ? 'Exit full screen' : 'Play full screen'}
      >
        {on ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
        {!on && <span>Full screen</span>}
      </button>
      )}
      {tip && on && (
        <div className="tm-game-fs-tip" role="status">
          <span>
            For true edge-to-edge play on iPhone: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>,
            and open THE MEMES from your home screen.
          </span>
          <button type="button" onClick={() => setTip(false)} aria-label="Dismiss tip">
            OK
          </button>
        </div>
      )}
    </>
  );
}
