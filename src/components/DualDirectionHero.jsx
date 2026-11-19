import { startTransition, useEffect, useRef, useState } from 'react';
import { ChevronDown, Crown, Gamepad2, Laugh, PenLine, Skull } from 'lucide-react';
import { sfx } from '../utils/soundEngine';
import NeonSign from './NeonSign';
import ArcadeLobby from './arcadeLobbyLazy';
import './DualDirectionHero.css';

/**
 * Owner brief 18 Nov 2026 (item 2): the home page is a portal. One huge lit sign, then two
 * neon doors: a cyan MEMES door and a pink PLAY door, each with electricity running round it.
 * MEMES warps down into the feed (which sits right under the portal); PLAY warps into the arcade.
 * While the portal is on screen the small sign in the top bar is hidden, so the big one owns
 * the first screen; scroll past it and the small sign fades back in top left.
 */
const WARP_MS = 380;
// PLAY leaves the page, so it gets a longer dive (see .is-warping-play in the CSS) and the
// lobby fades in on arrival, instead of a hard cut (owner brief 19 Nov 2026).
const PLAY_WARP_MS = 600;
const ARRIVE_MS = 900;

let lobbyPrefetched = false;
function prefetchLobby() {
  if (lobbyPrefetched) return;
  lobbyPrefetched = true;
  Promise.all([import('./GameRouter'), ArcadeLobby.preload()])
    .catch(() => {
      lobbyPrefetched = false;
    });
}

export default function DualDirectionHero({
  onSelectViewMode,
  onOpenBlankStudio,
  onOpenCaptionBattle,
  onScrollToMemes
}) {
  const rootRef = useRef(null);
  const [warping, setWarping] = useState(null); // 'memes' | 'play' | null
  const [isFirstVisit] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !localStorage.getItem('tm_intro_seen');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isFirstVisit || typeof window === 'undefined') return undefined;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem('tm_intro_seen', '1');
      } catch {
        // ignore storage errors
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [isFirstVisit]);

  // Fetch the arcade lobby code while the visitor looks at the portal, so PLAY never waits on it.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(prefetchLobby, { timeout: 2500 })
      : window.setTimeout(prefetchLobby, 1500);
    return () => {
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  // Hide the top-bar sign while the giant one is in view.
  useEffect(() => {
    const el = rootRef.current;
    const docEl = typeof document !== 'undefined' ? document.documentElement : null;
    if (!el || !docEl) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      docEl.classList.add('tm-portal-visible');
      return () => docEl.classList.remove('tm-portal-visible');
    }
    const obs = new IntersectionObserver(
      ([entry]) => docEl.classList.toggle('tm-portal-visible', entry.intersectionRatio > 0.35),
      { threshold: [0, 0.35, 0.6, 1] }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      docEl.classList.remove('tm-portal-visible');
    };
  }, []);

  const go = (which) => {
    if (warping) return;
    setWarping(which);
    if (which === 'memes') sfx.playToggle?.();
    else sfx.playJackpot?.();
    const reduced =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.getAttribute('data-reduced-motion') === 'on');
    if (which === 'play') prefetchLobby();
    window.setTimeout(
      () => {
        if (which === 'memes') {
          setWarping(null);
          onScrollToMemes?.();
          return;
        }
        if (!reduced) {
          const docEl = document.documentElement;
          docEl.classList.add('tm-arrive-play');
          window.setTimeout(() => docEl.classList.remove('tm-arrive-play'), ARRIVE_MS);
        }
        // Keep the pink-washed portal on screen (no reset, no Suspense blank) until the lobby is
        // ready, then swap in one go; the lobby fades in via .tm-arrive-play.
        startTransition(() => onSelectViewMode?.('lobby'));
      },
      reduced ? 0 : which === 'play' ? PLAY_WARP_MS : WARP_MS
    );
  };

  return (
    <section
      ref={rootRef}
      className={`tm-dual-hero tm-portal ${isFirstVisit ? 'is-first-visit' : ''} ${
        warping ? `is-warping is-warping-${warping}` : ''
      }`}
      aria-label="Choose your world: Memes or Play"
    >
      <div className="tm-portal-sky" aria-hidden="true">
        <div className="tm-portal-sun" />
        <div className="tm-portal-floor" />
      </div>

      <div className="tm-portal-body">
        <div className="tm-portal-sign">
          <NeonSign size="hero" flow powerOn={isFirstVisit} />
        </div>
        <h1 className="tm-dual-hero-heading tm-dual-hero-heading--sr">
          THE MEMES.net: two 80s worlds in one site, memes and a free neon arcade
        </h1>

        <div className="tm-portal-doors">
          <button
            type="button"
            className="tm-portal-door is-memes"
            data-testid="portal-memes-btn"
            onClick={() => go('memes')}
          >
            <span className="tm-portal-door-arc" aria-hidden="true" />
            <span className="tm-portal-door-inner">
              <Laugh className="tm-portal-door-icon" size={26} strokeWidth={2.2} aria-hidden="true" />
              <span className="tm-portal-door-word">MEMES</span>
              <span className="tm-portal-door-sub">Laugh · Make · Battle</span>
            </span>
          </button>

          <button
            type="button"
            className="tm-portal-door is-play"
            data-testid="portal-play-btn"
            onPointerDown={prefetchLobby}
            onClick={() => go('play')}
          >
            <span className="tm-portal-door-arc" aria-hidden="true" />
            <span className="tm-portal-door-inner">
              <Gamepad2 className="tm-portal-door-icon" size={26} strokeWidth={2.2} aria-hidden="true" />
              <span className="tm-portal-door-word">PLAY</span>
              <span className="tm-portal-door-sub">Arcade · Vegas · Pranks</span>
            </span>
          </button>
        </div>

        <div className="tm-portal-chips">
          <button
            type="button"
            className="tm-portal-chip"
            onClick={() => {
              sfx.playToggle?.();
              onOpenBlankStudio?.();
            }}
          >
            <PenLine size={13} aria-hidden="true" /> Make a meme
          </button>
          <button
            type="button"
            className="tm-portal-chip"
            data-testid="hero-caption-battle-btn"
            onClick={() => {
              sfx.playToggle?.();
              onOpenCaptionBattle?.();
            }}
          >
            <Crown size={13} aria-hidden="true" /> Caption battle
          </button>
          <button
            type="button"
            className="tm-portal-chip"
            onClick={() => {
              sfx.playToggle?.();
              try {
                sessionStorage.setItem('tm_lobby_realm', 'pranks');
              } catch {
                // ignore
              }
              onSelectViewMode?.('lobby');
            }}
          >
            <Skull size={13} aria-hidden="true" /> Prank screens
          </button>
        </div>

        <button
          type="button"
          className="tm-portal-scroll"
          onClick={() => onScrollToMemes?.()}
          aria-label="Scroll down to the memes"
        >
          <ChevronDown size={22} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
