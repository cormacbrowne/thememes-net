import { useState, useEffect } from 'react';
import { SOUND_PACKS, sfx } from '../utils/soundEngine';
import {
  RADIO_STATIONS,
  getRadioState,
  subscribeRadio,
  toggleRadio,
  setRadioStation,
  setRadioVolume
} from '../utils/radioBus';
import { loadUnlockedCosmetics } from '../data/cosmetics';
import { getEnglishVoices } from '../utils/aiSpeech';
import {
  getSettings,
  updateSettings,
  subscribeSettings,
  resetFirstVisitHints
} from '../utils/settingsStore';
import './SettingsSheet.css';

export default function SettingsSheet({ compact = false, onResetHints }) {
  const [settings, setSettings] = useState(() => getSettings());
  const [radio, setRadio] = useState(() => getRadioState());
  const [voices, setVoices] = useState(() => getEnglishVoices());
  const [hintsResetDone, setHintsResetDone] = useState(false);

  useEffect(() => {
    const unsubSettings = subscribeSettings((next) => setSettings({ ...next }));
    const unsubRadio = subscribeRadio((nextRadio) => setRadio({ ...nextRadio }));

    let cleanupVoices = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const refresh = () => setVoices(getEnglishVoices());
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
      cleanupVoices = () => window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
    }

    return () => {
      unsubSettings();
      unsubRadio();
      if (cleanupVoices) cleanupVoices();
    };
  }, []);

  const unlockedCosmetics = loadUnlockedCosmetics();
  const availableStations = RADIO_STATIONS.filter(
    (st) => !st.cosmeticId || unlockedCosmetics.has(st.cosmeticId)
  );

  const handleToggleSfx = () => {
    const nextOn = !settings.sfxOn;
    updateSettings({ sfxOn: nextOn });
    if (nextOn) sfx.playToggle();
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticsOn;
    updateSettings({ hapticsOn: next });
    sfx.playToggle();
    if (next) sfx.triggerHaptic(18);
  };

  const handleResetHints = () => {
    resetFirstVisitHints();
    sfx.playToggle();
    setHintsResetDone(true);
    if (onResetHints) onResetHints();
    setTimeout(() => setHintsResetDone(false), 3200);
  };

  return (
    <section className={`tm-settings-sheet ${compact ? 'is-compact' : ''}`} aria-label="Arcade Settings">
      <div className="tm-settings-head">
        <div>
          <h3 className="tm-settings-title">⚙️ Arcade Settings</h3>
          <span className="tm-settings-subtitle">Saved automatically to this device</span>
        </div>
      </div>

      <div className="tm-settings-grid">
        {/* 1. SFX Volume & Sound Pack */}
        <div className="tm-settings-card">
          <div className="tm-settings-row">
            <span className="tm-settings-lbl">🔊 Sound Effects</span>
            <button
              type="button"
              className={`tm-settings-pill ${settings.sfxOn ? 'active' : ''}`}
              onClick={handleToggleSfx}
              aria-pressed={settings.sfxOn}
            >
              {settings.sfxOn ? '🔊 SFX ON' : '🔇 SFX OFF'}
            </button>
          </div>
          <div className="tm-settings-slider-row">
            <label htmlFor="tm-set-sfx-vol" className="tm-settings-sub">
              Vol
            </label>
            <input
              id="tm-set-sfx-vol"
              type="range"
              min="0"
              max="100"
              value={Math.round((settings.sfxVolume ?? 0.85) * 100)}
              className="tm-settings-range"
              aria-label="SFX Volume"
              onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) / 100 })}
            />
            <span className="tm-settings-val">{Math.round((settings.sfxVolume ?? 0.85) * 100)}%</span>
          </div>
          <select
            aria-label="Sound Pack"
            className="tm-settings-select"
            value={settings.soundPack || 'goofy'}
            onChange={(e) => {
              updateSettings({ soundPack: e.target.value });
              sfx.playPop(2);
            }}
          >
            {SOUND_PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                Pack: {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Music (Station & Volume) */}
        <div className="tm-settings-card">
          <div className="tm-settings-row">
            <span className="tm-settings-lbl">📼 Music Radio</span>
            <button
              type="button"
              className={`tm-settings-pill ${radio.on ? 'active' : ''}`}
              onClick={() => toggleRadio()}
              aria-pressed={radio.on}
            >
              {radio.on ? '⏸ Pause FM' : '▶ Play FM'}
            </button>
          </div>
          <div className="tm-settings-slider-row">
            <label htmlFor="tm-set-music-vol" className="tm-settings-sub">
              Vol
            </label>
            <input
              id="tm-set-music-vol"
              type="range"
              min="0"
              max="100"
              value={Math.round((radio.volume ?? settings.musicVolume ?? 0.6) * 100)}
              className="tm-settings-range"
              aria-label="Music Volume"
              onChange={(e) => {
                const v = Number(e.target.value) / 100;
                setRadioVolume(v);
                updateSettings({ musicVolume: v });
              }}
            />
            <span className="tm-settings-val">
              {Math.round((radio.volume ?? settings.musicVolume ?? 0.6) * 100)}%
            </span>
          </div>
          <select
            aria-label="Music Station"
            className="tm-settings-select"
            value={radio.station || settings.musicStation || 'synthwave'}
            onChange={(e) => {
              const id = e.target.value;
              setRadioStation(id, { overrideContext: true });
              updateSettings({ musicStation: id });
            }}
          >
            {availableStations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.icon} {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. AI Voice (on/off + KITT & HAL picker) */}
        <div className="tm-settings-card">
          <div className="tm-settings-row">
            <span className="tm-settings-lbl">🗣️ AI Copilot Voice</span>
            <button
              type="button"
              className={`tm-settings-pill ${settings.aiVoiceOn ? 'active' : ''}`}
              onClick={() => updateSettings({ aiVoiceOn: !settings.aiVoiceOn })}
              aria-pressed={settings.aiVoiceOn}
            >
              {settings.aiVoiceOn ? '🔊 Voice ON' : '🔇 Voice OFF'}
            </button>
          </div>
          <select
            aria-label="K.I.T.T. Voice"
            className="tm-settings-select"
            value={settings.aiVoiceKitt || 'auto'}
            onChange={(e) => updateSettings({ aiVoiceKitt: e.target.value })}
          >
            <option value="auto">🚗 K.I.T.T. Voice: Auto Best</option>
            {voices.map((v) => (
              <option key={`k-${v.voiceURI}`} value={v.voiceURI}>
                🚗 {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <select
            aria-label="HAL 9000 Voice"
            className="tm-settings-select"
            value={settings.aiVoiceHal || 'auto'}
            onChange={(e) => updateSettings({ aiVoiceHal: e.target.value })}
          >
            <option value="auto">🔴 HAL Voice: Auto Best</option>
            {voices.map((v) => (
              <option key={`h-${v.voiceURI}`} value={v.voiceURI}>
                🔴 {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Motion, Display & Haptics */}
        <div className="tm-settings-card">
          <div className="tm-settings-row">
            <span className="tm-settings-lbl">🎛️ Display &amp; Feel</span>
          </div>
          <div className="tm-settings-toggles">
            <button
              type="button"
              className={`tm-settings-pill ${settings.hapticsOn ? 'active' : ''}`}
              onClick={handleToggleHaptics}
              aria-pressed={settings.hapticsOn}
            >
              📳 Haptics: {settings.hapticsOn ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`tm-settings-pill ${settings.crtOn ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                updateSettings({ crtOn: !settings.crtOn });
              }}
              aria-pressed={settings.crtOn}
            >
              📺 CRT: {settings.crtOn ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`tm-settings-pill ${settings.turboFps ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                updateSettings({ turboFps: !settings.turboFps });
              }}
              aria-pressed={settings.turboFps}
            >
              ⚡ Turbo FPS: {settings.turboFps ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              className={`tm-settings-pill ${settings.litePerfMode ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                updateSettings({ litePerfMode: !settings.litePerfMode });
              }}
              aria-pressed={settings.litePerfMode}
            >
              💨 Lite Mode: {settings.litePerfMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="tm-settings-sub" style={{ marginTop: '2px' }}>
            Reduced Motion (overrides OS)
          </div>
          <div className="tm-settings-segmented" role="group" aria-label="Reduced motion override">
            {[
              { id: 'auto', label: 'OS Auto' },
              { id: 'on', label: 'Reduce' },
              { id: 'off', label: 'Full Motion' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`tm-settings-seg-btn ${settings.reducedMotion === opt.id ? 'active' : ''}`}
                aria-pressed={settings.reducedMotion === opt.id}
                onClick={() => {
                  sfx.playToggle();
                  updateSettings({ reducedMotion: opt.id });
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tm-settings-footer">
        <button
          type="button"
          className="tm-settings-reset-btn"
          onClick={handleResetHints}
        >
          🔄 Reset first-visit hints
        </button>
        {hintsResetDone && (
          <span className="tm-settings-reset-note" role="status">
            ✓ First-visit hints cleared for your next visit.
          </span>
        )}
      </div>
    </section>
  );
}
