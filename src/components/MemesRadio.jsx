import useRadio from '../hooks/useRadio';
import {
  RADIO_STATIONS,
  toggleRadio,
  setRadioStation,
  setRadioVolume,
  skipRadioTrack
} from '../utils/radioBus';
import './MemesRadio.css';

/** Compact 📼 top-bar toggle for THE MEMES FM (Phase 28.11). */
export function RadioToggleButton({ className = 'tm-btn' }) {
  const radio = useRadio();
  const station = RADIO_STATIONS.find((s) => s.id === radio.activeStation) || RADIO_STATIONS[0];
  return (
    <button
      type="button"
      className={`${className} tm-radio-toggle ${radio.on ? 'is-on' : ''}`}
      onClick={toggleRadio}
      aria-pressed={radio.on}
      aria-label={radio.on ? 'Turn THE MEMES FM radio off' : 'Turn THE MEMES FM radio on'}
      title={
        radio.on
          ? `THE MEMES FM: ${station.name}${radio.track ? ` • ${radio.track}` : ''} (tap to stop • full deck in 🕹️ Extras)`
          : 'Play THE MEMES FM synthwave radio (full deck in 🕹️ Extras)'
      }
    >
      <span className="tm-radio-toggle-icon" aria-hidden="true">📼</span>
      {radio.on && <span className="tm-radio-eq" aria-hidden="true"><i /><i /><i /></span>}
    </button>
  );
}

/** Full cassette deck, shown inside the 🕹️ Extras drawer. */
export default function MemesRadio() {
  const radio = useRadio();
  const playing = radio.on;
  const station = RADIO_STATIONS.find((s) => s.id === radio.activeStation) || RADIO_STATIONS[0];
  const overridden = playing && radio.activeStation !== radio.station;

  return (
    <section className={`tm-radio-deck ${playing ? 'is-playing' : ''}`} aria-label="THE MEMES FM Radio">
      <div className="tm-radio-head">
        <span className="tm-radio-brand">📻 THE MEMES FM</span>
        <span className="tm-radio-sub">100% procedural • no ads • no files</span>
      </div>

      <div className="tm-radio-cassette" aria-hidden="true">
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
        {RADIO_STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={radio.station === s.id}
            className={`tm-radio-station ${radio.station === s.id ? 'active' : ''}`}
            onClick={() => setRadioStation(s.id)}
          >
            <span aria-hidden="true">{s.icon}</span> {s.name}
          </button>
        ))}
      </div>
    </section>
  );
}
