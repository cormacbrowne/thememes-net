import { useEffect, useRef, useState } from 'react';
import {
  EQ_BANDS,
  EQ_PRESETS,
  RADIO_STATIONS,
  applyRadioEqPreset,
  closeFullscreenEq,
  getRadioAnalyserData,
  getRadioState,
  getUnlockedStations,
  isTrackFavorited,
  openFullscreenEq,
  prevRadioTrack,
  setRadioEqBand,
  setRadioOn,
  setRadioStation,
  setRadioVolume,
  skipRadioTrack,
  subscribeRadio,
  toggleFavoriteCurrentTrack,
  toggleShuffleAll
} from '../utils/radioBus';
import { sfx } from '../utils/soundEngine';
import './MusicEqualizer.css';

const EQ_VISUAL_MODES = [
  { id: 'bars', label: '📊 Spectrum' },
  { id: 'mirror', label: '🌆 Mirror' },
  { id: 'ring', label: '🌀 Cyber Ring' },
  { id: 'scope', label: '〰️ CRT Scope' }
];

const STATION_ACCENTS = {
  synthwave: '#00f3ff',
  lofi: '#38bdf8',
  chiptune: '#39ff14',
  vaporwave: '#f472b6',
  phonk: '#ef4444',
  jungle: '#f59e0b',
  casinojazz: '#facc15',
  western: '#fb923c',
  retrowave: '#ff00e6',
  cyberpunk: '#a855f7',
  yachtrock: '#2dd4bf',
  italodisco: '#e879f9',
  mixtape: '#fb7185',
  spookysynth: '#f97316',
  jinglesynth: '#22c55e'
};

function useRadioSnapshot() {
  const [snap, setSnap] = useState(getRadioState);
  useEffect(() => subscribeRadio(() => setSnap(getRadioState())), []);
  return snap;
}

export function EqSpectrumCanvas({
  mode = 'bars',
  playing = false,
  accent = '#00f3ff',
  compact = false,
  eqGains = [0, 0, 0, 0, 0],
  className = ''
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const freqData = new Uint8Array(64);
    const timeData = new Uint8Array(128);
    const numBars = compact ? 18 : 28;
    const smoothBars = new Float32Array(numBars);
    const peakCaps = new Float32Array(numBars);
    let rafId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(120, Math.round(rect.width * dpr));
      const h = Math.max(44, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    const drawFrame = (now) => {
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const hasAnalyser = playing && getRadioAnalyserData(freqData, timeData);
      const t = now * 0.0022;

      // Read per-bar levels from real AnalyserNode (or smooth idle synth ambient pulse)
      let bassEnergy = 0;
      for (let i = 0; i < numBars; i += 1) {
        let target;
        if (hasAnalyser) {
          // Logarithmic bin grouping so bass/mid/treble each occupy clear bars
          const binStart = Math.floor(Math.pow(i / numBars, 1.35) * 44);
          const binEnd = Math.max(binStart + 1, Math.floor(Math.pow((i + 1) / numBars, 1.35) * 44));
          let sum = 0;
          for (let b = binStart; b < binEnd && b < freqData.length; b += 1) {
            sum += freqData[b];
          }
          const avg = sum / Math.max(1, binEnd - binStart);
          // Incorporate subtle visual EQ tilt feedback on top of real DSP response
          const eqIdx = Math.min(4, Math.floor((i / numBars) * 5));
          const eqTilt = 1 + ((eqGains[eqIdx] || 0) / 12) * 0.12;
          target = Math.min(1, Math.max(0.03, (avg / 255) * eqTilt * 1.18));
        } else if (playing) {
          target = 0.2 + 0.28 * Math.abs(Math.sin(t * 2.4 + i * 0.48));
        } else {
          target = 0.06 + 0.06 * Math.sin(t + i * 0.42);
        }

        smoothBars[i] = smoothBars[i] * 0.62 + target * 0.38;
        if (smoothBars[i] > peakCaps[i]) {
          peakCaps[i] = smoothBars[i];
        } else {
          peakCaps[i] = Math.max(smoothBars[i], peakCaps[i] - (compact ? 0.012 : 0.008));
        }
        if (i < 5) bassEnergy += smoothBars[i];
      }
      bassEnergy /= 5;

      // Background subtle perspective synth grid in non-compact mode
      if (!compact) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.09)';
        ctx.lineWidth = 1;
        for (let gy = 0.25; gy < 1; gy += 0.25) {
          ctx.beginPath();
          ctx.moveTo(0, h * gy);
          ctx.lineTo(w, h * gy);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (mode === 'scope') {
        ctx.save();
        ctx.lineWidth = compact ? 2 : 3;
        ctx.shadowColor = accent;
        ctx.shadowBlur = compact ? 8 : 16;
        ctx.strokeStyle = accent;
        ctx.beginPath();
        const midY = h / 2;
        const len = hasAnalyser ? timeData.length : 96;
        for (let i = 0; i < len; i += 1) {
          const x = (i / (len - 1)) * w;
          const v = hasAnalyser
            ? (timeData[i] - 128) / 128
            : playing
            ? Math.sin(t * 4 + i * 0.25) * 0.35 * Math.sin(i * 0.08 + t)
            : Math.sin(t + i * 0.14) * 0.08;
          const y = midY + v * (h * 0.42);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Secondary ghost trace
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < len; i += 1) {
          const x = (i / (len - 1)) * w;
          const v = hasAnalyser
            ? (timeData[(i + 6) % len] - 128) / 128
            : playing
            ? Math.cos(t * 3.1 + i * 0.22) * 0.24
            : 0;
          const y = midY + v * (h * 0.34);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (mode === 'ring' && !compact) {
        const cx = w / 2;
        const cy = h / 2;
        const baseR = Math.min(w, h) * (0.24 + bassEnergy * 0.05);
        const maxBarLen = Math.min(w, h) * 0.21;

        ctx.save();
        // Outer glow halo
        const glow = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, baseR + maxBarLen);
        glow.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
        glow.addColorStop(0.6, 'rgba(0, 243, 255, 0.09)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + maxBarLen, 0, Math.PI * 2);
        ctx.fill();

        const spokeCount = numBars * 2;
        for (let s = 0; s < spokeCount; s += 1) {
          const barIdx = s % numBars;
          const val = smoothBars[barIdx];
          const angle = (s / spokeCount) * Math.PI * 2 - Math.PI / 2 + t * 0.14;
          const r1 = baseR;
          const r2 = baseR + val * maxBarLen;
          const hue = (185 + (barIdx / numBars) * 145) % 360;
          ctx.strokeStyle = `hsl(${hue}, 95%, 62%)`;
          ctx.lineWidth = Math.max(3, Math.round(w / 140));
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }

        // Inner neon core ring
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 0.92, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (mode === 'mirror') {
        const slotW = w / numBars;
        const barW = Math.max(3, slotW * 0.68);
        const midY = h / 2;
        for (let i = 0; i < numBars; i += 1) {
          const val = smoothBars[i];
          const x = i * slotW + (slotW - barW) / 2;
          const halfH = Math.max(2, val * (midY - 6));
          const hue = (190 + (i / numBars) * 140) % 360;
          const grad = ctx.createLinearGradient(0, midY - halfH, 0, midY + halfH);
          grad.addColorStop(0, `hsla(${hue}, 96%, 64%, 0.95)`);
          grad.addColorStop(0.5, accent);
          grad.addColorStop(1, `hsla(${hue}, 96%, 54%, 0.85)`);
          ctx.fillStyle = grad;
          ctx.fillRect(x, midY - halfH, barW, halfH);
          ctx.fillRect(x, midY + 1, barW, halfH * 0.85);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(0, midY - 0.5, w, 1);
      } else {
        // Default: Crisp Multi-Band Spectrum Bars + Segmented LED Peak Hold Caps
        const slotW = w / numBars;
        const barW = Math.max(3, slotW * 0.7);
        const usableH = h - 6;
        for (let i = 0; i < numBars; i += 1) {
          const val = smoothBars[i];
          const cap = peakCaps[i];
          const x = i * slotW + (slotW - barW) / 2;
          const barH = Math.max(2, val * usableH);
          const y = h - barH;

          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, '#f472b6');
          grad.addColorStop(0.35, accent);
          grad.addColorStop(1, '#2563eb');
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barW, barH);

          // Glowing Peak-Hold Cap
          const capY = Math.max(2, h - cap * usableH - 3);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(x, capY, barW, compact ? 2 : 3);
        }
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [accent, compact, eqGains, mode, playing]);

  return <canvas ref={canvasRef} className={`tm-eq-canvas ${className}`} aria-hidden="true" />;
}

export function GraphicEqPanel({ compact = false, showLaunchButton = true }) {
  const radio = useRadioSnapshot();
  const stationColor = STATION_ACCENTS[radio.activeStation || radio.station] || '#00f3ff';

  return (
    <div className={`tm-eq-panel ${compact ? 'is-compact' : ''}`}>
      <div className="tm-eq-panel-top">
        <span className="tm-eq-panel-title">🎛️ 5-BAND GRAPHIC EQ</span>
        <div className="tm-eq-presets" role="group" aria-label="Equalizer presets">
          {EQ_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`tm-eq-preset-btn ${radio.eqPreset === preset.id ? 'is-active' : ''}`}
              onClick={() => {
                sfx.playClick();
                applyRadioEqPreset(preset.id);
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {showLaunchButton && (
          <button
            type="button"
            className="tm-eq-fullscreen-launch"
            onClick={() => {
              sfx.playToggle();
              openFullscreenEq({ autoStart: true });
            }}
            title="Open Full-Screen Music Equalizer Mode"
          >
            📺 Fullscreen EQ
          </button>
        )}
      </div>

      <div className="tm-eq-mini-viz">
        <EqSpectrumCanvas
          mode="bars"
          playing={radio.on}
          accent={stationColor}
          eqGains={radio.eqGains}
          compact
        />
      </div>

      <div className="tm-eq-sliders-grid" role="group" aria-label="5-band frequency faders">
        {EQ_BANDS.map((band, idx) => {
          const val = radio.eqGains?.[idx] ?? 0;
          return (
            <label key={band.id} className="tm-eq-fader-col">
              <span className="tm-eq-db-readout">
                {val > 0 ? `+${val}` : val}dB
              </span>
              <div className="tm-eq-range-wrap">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={val}
                  aria-label={`${band.name} (${band.label}) equalizer gain`}
                  onChange={(e) => setRadioEqBand(idx, Number(e.target.value))}
                  className="tm-eq-vertical-range"
                />
              </div>
              <span className="tm-eq-freq-label">{band.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function FullscreenMusicEqualizer() {
  const radio = useRadioSnapshot();
  const [visualMode, setVisualMode] = useState('bars');
  const [nativeFs, setNativeFs] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!radio.fullscreenEqOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeFullscreenEq();
    };
    const onFsChange = () => {
      setNativeFs(Boolean(document.fullscreenElement));
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [radio.fullscreenEqOpen]);

  if (!radio.fullscreenEqOpen) return null;

  const activeId = radio.activeStation || radio.station || 'synthwave';
  const station =
    RADIO_STATIONS.find((s) => s.id === activeId) ||
    RADIO_STATIONS[0] || { id: 'synthwave', icon: '📼', name: 'Synthwave Drive' };
  const stationColor = STATION_ACCENTS[station.id] || '#00f3ff';
  const stations = getUnlockedStations({ includeMixtape: radio.favorites.length > 0 });
  const favorited = isTrackFavorited(radio.currentTrack, radio.favorites);
  const canFullscreenApi =
    typeof document !== 'undefined' &&
    Boolean(document.fullscreenEnabled) &&
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype?.requestFullscreen === 'function';

  const handleNativeFullscreen = () => {
    sfx.playClick();
    if (!document.fullscreenElement && rootRef.current?.requestFullscreen) {
      rootRef.current.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={rootRef}
      className="tm-eq-fs-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Full-Screen Music Equalizer Mode"
    >
      <div className="tm-eq-fs-backdrop" />

      {/* Top Transport & Mode Bar */}
      <header className="tm-eq-fs-header">
        <div className="tm-eq-fs-brand">
          <span className="tm-eq-fs-badge" style={{ borderColor: stationColor, color: stationColor }}>
            {station.icon} {station.name}
          </span>
          <div className="tm-eq-fs-track" title={radio.track || 'Ready to broadcast'}>
            {radio.on ? `♪ ${radio.track || station.name}` : '📻 Tap Play to start THE MEMES FM'}
          </div>
        </div>

        <div className="tm-eq-fs-header-actions">
          <div className="tm-eq-fs-modes" role="group" aria-label="Visualizer mode">
            {EQ_VISUAL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`tm-eq-fs-mode-btn ${visualMode === m.id ? 'is-active' : ''}`}
                onClick={() => {
                  sfx.playClick();
                  setVisualMode(m.id);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {canFullscreenApi && (
            <button
              type="button"
              className="tm-eq-fs-icon-btn"
              onClick={handleNativeFullscreen}
              title={nativeFs ? 'Exit browser fullscreen' : 'Enter true browser fullscreen'}
            >
              {nativeFs ? '🗗 Window' : '⛶ True FS'}
            </button>
          )}

          <button
            type="button"
            className="tm-eq-fs-close-btn"
            onClick={() => {
              if (typeof document !== 'undefined' && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              closeFullscreenEq();
            }}
            aria-label="Exit Full-Screen Music Equalizer"
          >
            ✕ Exit EQ
          </button>
        </div>
      </header>

      {/* Main 60FPS Live Visualizer Stage */}
      <main className="tm-eq-fs-stage">
        <EqSpectrumCanvas
          mode={visualMode}
          playing={radio.on}
          accent={stationColor}
          eqGains={radio.eqGains}
          className="tm-eq-fs-canvas"
        />
      </main>

      {/* Bottom Studio Console: 5-Band EQ + Station Selector + Transport */}
      <footer className="tm-eq-fs-footer">
        <div className="tm-eq-fs-eq-col">
          <GraphicEqPanel compact showLaunchButton={false} />
        </div>

        <div className="tm-eq-fs-deck-col">
          <div className="tm-eq-fs-stations" role="group" aria-label="Radio stations">
            {stations.map((s) => {
              const active = activeId === s.id;
              const stColor = STATION_ACCENTS[s.id] || '#00f3ff';
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`tm-eq-fs-st-btn ${active ? 'is-active' : ''}`}
                  style={{ '--st-color': stColor }}
                  onClick={() => {
                    sfx.playClick();
                    setRadioStation(s.id, { overrideContext: true, startIfOff: true });
                  }}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>

          <div className="tm-eq-fs-controls">
            <button
              type="button"
              className="tm-eq-fs-ctrl-btn"
              onClick={() => {
                sfx.playClick();
                prevRadioTrack();
              }}
              aria-label="Previous track"
            >
              ⏮
            </button>
            <button
              type="button"
              className={`tm-eq-fs-play-btn ${radio.on ? 'is-playing' : ''}`}
              onClick={() => {
                sfx.playClick();
                setRadioOn(!radio.on);
              }}
              aria-label={radio.on ? 'Pause radio' : 'Play radio'}
            >
              {radio.on ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button
              type="button"
              className="tm-eq-fs-ctrl-btn"
              onClick={() => {
                sfx.playClick();
                skipRadioTrack();
              }}
              aria-label="Next track"
            >
              ⏭
            </button>
            <button
              type="button"
              className={`tm-eq-fs-ctrl-btn ${favorited ? 'is-fav' : ''}`}
              disabled={!radio.currentTrack || radio.activeStation === 'mixtape'}
              onClick={() => {
                sfx.playClick();
                toggleFavoriteCurrentTrack();
              }}
              title="Save track to Mixtape"
            >
              {favorited ? '♥' : '♡'}
            </button>
            <button
              type="button"
              className={`tm-eq-fs-ctrl-btn ${radio.shuffleAll ? 'is-fav' : ''}`}
              onClick={() => {
                sfx.playClick();
                toggleShuffleAll();
              }}
              title="Shuffle station tracks"
            >
              🔀
            </button>

            <label className="tm-eq-fs-vol">
              <span>🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={radio.volume}
                aria-label="Music Equalizer volume"
                onChange={(e) => setRadioVolume(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </footer>
    </div>
  );
}
