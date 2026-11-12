import { useState, useEffect, useRef } from 'react';
import useRadio from '../hooks/useRadio';
import {
  RADIO_STATIONS,
  toggleRadio,
  setRadioStation,
  setRadioVolume,
  skipRadioTrack
} from '../utils/radioBus';
import {
  loadUnlockedCosmetics,
  loadEquippedCassetteSkin,
  isCosmeticUnlocked
} from '../data/cosmetics';
import './MemesRadio.css';

/**
 * Compact 📼 top-bar toggle + ▾ station popover for THE MEMES FM (Phase 28.11 & 29.4).
 * Short tap toggles play; chevron ▾ or long-press opens station picker, skip, volume & track name.
 */
export function RadioToggleButton({ className = 'tm-btn', onOpenShop }) {
  const radio = useRadio();
  const [open, setOpen] = useState(false);
  const [unlockedIds] = useState(() => loadUnlockedCosmetics());
  const wrapRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const station = RADIO_STATIONS.find((s) => s.id === radio.activeStation) || RADIO_STATIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMainPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    longPressFiredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setOpen((prev) => !prev);
    }, 440);
  };

  const handleMainClick = () => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    toggleRadio();
  };

  return (
    <div ref={wrapRef} className="tm-radio-picker-wrap">
      <div className="tm-radio-split-group">
        <button
          type="button"
          className={`${className} tm-radio-toggle ${radio.on ? 'is-on' : ''}`}
          onPointerDown={handleMainPointerDown}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          onClick={handleMainClick}
          aria-pressed={radio.on}
          aria-label={radio.on ? 'Turn THE MEMES FM radio off' : 'Turn THE MEMES FM radio on'}
          title={
            radio.on
              ? `THE MEMES FM: ${station.name}${radio.track ? ` • ${radio.track}` : ''} (tap to stop)`
              : 'Play THE MEMES FM synthwave radio (tap ▾ to pick station)'
          }
        >
          <span className="tm-radio-toggle-icon" aria-hidden="true">📼</span>
          {radio.on && <span className="tm-radio-eq" aria-hidden="true"><i /><i /><i /></span>}
        </button>

        <button
          type="button"
          className={`${className} tm-radio-chevron-btn ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Open radio station picker"
          title="Pick THE MEMES FM station"
        >
          ▾
        </button>
      </div>

      {open && (
        <div className="tm-radio-popover" role="dialog" aria-label="THE MEMES FM Station Picker">
          <div className="tm-radio-pop-head">
            <div className="tm-radio-pop-now">
              <span className="tm-radio-pop-kicker">
                {station.icon} {station.name}
              </span>
              <strong className="tm-radio-pop-track">
                {radio.on ? radio.track || 'Tuning synthwave tape…' : 'Paused — pick a station to play'}
              </strong>
            </div>
            <div className="tm-radio-pop-transport">
              <button
                type="button"
                className="tm-radio-pop-icon-btn"
                onClick={toggleRadio}
                aria-label={radio.on ? 'Pause radio' : 'Play radio'}
                title={radio.on ? 'Pause' : 'Play'}
              >
                {radio.on ? '⏸' : '▶'}
              </button>
              <button
                type="button"
                className="tm-radio-pop-icon-btn"
                onClick={skipRadioTrack}
                disabled={!radio.on}
                aria-label="Skip track"
                title="Next track"
              >
                ⏭
              </button>
            </div>
          </div>

          <label className="tm-radio-pop-volume">
            <span aria-hidden="true">🔉</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={radio.volume}
              onChange={(e) => setRadioVolume(e.target.value)}
              aria-label="Radio volume"
            />
          </label>

          <div className="tm-radio-pop-list" role="radiogroup" aria-label="Stations">
            {RADIO_STATIONS.map((s) => {
              const isLocked = Boolean(s.cosmeticId) && !isCosmeticUnlocked(s.cosmeticId, unlockedIds);
              const isActive = radio.activeStation === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`tm-radio-pop-station ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => {
                    if (isLocked) {
                      setOpen(false);
                      onOpenShop?.();
                      return;
                    }
                    setRadioStation(s.id, { overrideContext: true, startIfOff: true });
                  }}
                >
                  <span>
                    <span aria-hidden="true">{isLocked ? '🔒' : s.icon}</span> {s.name}
                  </span>
                  {isLocked ? (
                    <span className="tm-radio-lock-tag">Shop</span>
                  ) : (
                    isActive && <span className="tm-radio-pop-live">{radio.on ? 'ON' : '✓'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact inline station selector used in InsertCoinIntro and MobileArcadeDock drawer (29.4). */
export function RadioStationStrip({ autoStart = false, compact = false }) {
  const radio = useRadio();
  const [unlockedIds] = useState(() => loadUnlockedCosmetics());
  const available = RADIO_STATIONS.filter(
    (s) => !s.cosmeticId || isCosmeticUnlocked(s.cosmeticId, unlockedIds)
  );
  const selectedStation =
    RADIO_STATIONS.find((s) => s.id === (radio.on ? radio.activeStation : radio.station)) ||
    RADIO_STATIONS[0];

  return (
    <div
      className={`tm-radio-strip ${compact ? 'is-compact' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tm-radio-strip-head">
        <span>
          {selectedStation.icon}{' '}
          {radio.on ? radio.track || selectedStation.name : `Station: ${selectedStation.name}`}
        </span>
        {autoStart && (
          <div className="tm-radio-strip-actions">
            <button
              type="button"
              className="tm-radio-pop-icon-btn"
              onClick={toggleRadio}
              aria-label={radio.on ? 'Pause radio' : 'Play radio'}
            >
              {radio.on ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              className="tm-radio-pop-icon-btn"
              onClick={skipRadioTrack}
              disabled={!radio.on}
              aria-label="Skip track"
            >
              ⏭
            </button>
          </div>
        )}
      </div>
      <div className="tm-radio-strip-pills" role="radiogroup" aria-label="Choose radio station">
        {available.map((s) => {
          const active = (radio.on ? radio.activeStation : radio.station) === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`tm-radio-strip-pill ${active ? 'active' : ''}`}
              onClick={() =>
                setRadioStation(s.id, { overrideContext: true, startIfOff: autoStart })
              }
            >
              <span aria-hidden="true">{s.icon}</span> {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileNowPlayingInner({ radio, isGameLayout }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const station = RADIO_STATIONS.find((s) => s.id === radio.activeStation) || RADIO_STATIONS[0];
  const label = radio.track || station.name;

  return (
    <div
      className={`tm-mobile-now-playing ${isGameLayout ? 'in-game' : ''}`}
      role="region"
      aria-label="Now playing on THE MEMES FM"
    >
      <button
        type="button"
        className="tm-now-playing-label"
        onClick={toggleRadio}
        title="Tap to pause THE MEMES FM"
      >
        <span aria-hidden="true">📼</span>
        <span>{label}</span>
      </button>
      <button
        type="button"
        className="tm-now-playing-btn"
        onClick={skipRadioTrack}
        aria-label="Next track"
        title="Skip track"
      >
        ⏭
      </button>
      <button
        type="button"
        className="tm-now-playing-btn"
        onClick={() => setDismissed(true)}
        aria-label="Hide now playing pill"
        title="Hide"
      >
        ✕
      </button>
    </div>
  );
}

/** Tiny dismissible mobile "now playing" pill while music plays (Phase 29.4). */
export function MobileNowPlayingPill({ isGameLayout = false }) {
  const radio = useRadio();
  if (!radio.on) return null;
  return <MobileNowPlayingInner radio={radio} isGameLayout={isGameLayout} />;
}

/** Full cassette deck, shown inside the 🕹️ Extras drawer. */
export default function MemesRadio({ onOpenShop }) {
  const radio = useRadio();
  const playing = radio.on;
  const station = RADIO_STATIONS.find((s) => s.id === radio.activeStation) || RADIO_STATIONS[0];
  const overridden = playing && radio.activeStation !== radio.station;
  const [unlockedIds] = useState(() => loadUnlockedCosmetics());
  const [cassetteSkin] = useState(() => loadEquippedCassetteSkin());

  return (
    <section className={`tm-radio-deck ${playing ? 'is-playing' : ''}`} aria-label="THE MEMES FM Radio">
      <div className="tm-radio-head">
        <span className="tm-radio-brand">📻 THE MEMES FM</span>
        <span className="tm-radio-sub">100% procedural • no ads • no files</span>
      </div>

      <div className={`tm-radio-cassette tm-cassette-skin-${cassetteSkin}`} aria-hidden="true">
        <div className="tm-radio-label">
          <span className="tm-radio-label-station">
            {station.icon} {station.name}
          </span>
          <span className="tm-radio-label-track">
            {playing ? radio.track || 'Loading tape…' : 'Insert tape — press ▶'}
          </span>
        </div>
        <div className="tm-radio-reels">
          <span className="tm-radio-reel" />
          <span className="tm-radio-tape-window" />
          <span className="tm-radio-reel" />
        </div>
      </div>

      {overridden && (
        <p className="tm-radio-note">🎮 This screen picked its own station. Your pick returns when you leave.</p>
      )}

      <div className="tm-radio-controls">
        <button
          type="button"
          className="tm-radio-btn tm-radio-play"
          onClick={toggleRadio}
          aria-pressed={playing}
        >
          {playing ? '⏸ Stop' : '▶ Play'}
        </button>
        <button
          type="button"
          className="tm-radio-btn"
          onClick={skipRadioTrack}
          disabled={!playing}
          aria-label="Next track"
        >
          ⏭ Skip
        </button>
        <label className="tm-radio-volume">
          <span aria-hidden="true">🔉</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={radio.volume}
            onChange={(e) => setRadioVolume(e.target.value)}
            aria-label="Radio volume"
          />
        </label>
      </div>

      <div className="tm-radio-stations" role="radiogroup" aria-label="Radio station">
        {RADIO_STATIONS.map((s) => {
          const isLocked = Boolean(s.cosmeticId) && !isCosmeticUnlocked(s.cosmeticId, unlockedIds);
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={radio.station === s.id}
              className={`tm-radio-station ${radio.station === s.id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => {
                if (isLocked) {
                  if (onOpenShop) onOpenShop();
                  return;
                }
                setRadioStation(s.id, { overrideContext: true });
              }}
              title={isLocked ? 'Unlock in 🛍️ Arcade Shop!' : s.name}
            >
              <span aria-hidden="true">{isLocked ? '🔒' : s.icon}</span> {s.name}
              {isLocked && <span className="tm-radio-lock-tag">Shop</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
