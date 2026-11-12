/**
 * THE MEMES FM — tiny always-loaded radio state bus (Phase 28.11).
 *
 * This module is intentionally small: it holds the persisted radio preferences
 * (`tm_radio`), notifies React subscribers, and lazy-loads the heavy procedural
 * synth (`musicEngine.js`) ONLY after the user taps play. While the radio is OFF
 * no AudioContext is touched, no timers run and no listeners are attached.
 */

const STORAGE_KEY = 'tm_radio';

export const RADIO_STATIONS = [
  { id: 'synthwave', icon: '📼', name: 'Synthwave Drive' },
  { id: 'lofi', icon: '☕', name: 'Lo-fi Meme Beats' },
  { id: 'chiptune', icon: '👾', name: '8-Bit Chiptune' },
  { id: 'vaporwave', icon: '🛗', name: 'Vaporwave Elevator' },
  { id: 'retrowave', icon: '🌅', name: 'Sunset Outrun FM', cosmeticId: 'station-retrowave' },
  { id: 'cyberpunk', icon: '⚡', name: 'Dark Cyberbass FM', cosmeticId: 'station-cyberpunk' }
];

const STATION_IDS = RADIO_STATIONS.map((s) => s.id);

function loadPrefs() {
  const fallback = { on: false, station: 'synthwave', volume: 0.6 };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      on: raw.on === true,
      station: STATION_IDS.includes(raw.station) ? raw.station : 'synthwave',
      volume: Math.min(1, Math.max(0, Number(raw.volume ?? 0.6) || 0))
    };
  } catch {
    return fallback;
  }
}

const prefs = loadPrefs();

let state = {
  on: false, // actually playing this session (always starts false until a user gesture)
  wantsOn: prefs.on, // remembered preference
  station: prefs.station, // user-selected station
  activeStation: prefs.station, // station actually playing (may be a context override)
  volume: prefs.volume,
  track: '',
  loading: false
};

const listeners = new Set();
let engine = null;
let enginePromise = null;
let contextStation = null;
let muted = false;
const ducks = new Set();
let mediaListenersBound = false;
let resumeListenerBound = false;

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ on: state.wantsOn, station: state.station, volume: state.volume })
    );
  } catch {
    // ignore storage errors (private mode / quota)
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

function effectiveStation() {
  return contextStation || state.station;
}

function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('./musicEngine').then((mod) => {
      engine = mod.createMusicEngine({
        onTrack: (track) => setState({ track })
      });
      return engine;
    });
  }
  return enginePromise;
}

/* ---------- Ducking: video memes with sound ---------- */
function recomputeVideoDuck() {
  if (typeof document === 'undefined') return;
  const playingWithSound = Array.from(document.querySelectorAll('video')).some(
    (v) => !v.paused && !v.ended && !v.muted && v.volume > 0.02
  );
  setRadioDuck('video', playingWithSound);
}

function bindMediaListeners() {
  if (mediaListenersBound || typeof document === 'undefined') return;
  mediaListenersBound = true;
  ['play', 'pause', 'ended', 'volumechange', 'emptied'].forEach((evt) =>
    document.addEventListener(evt, recomputeVideoDuck, true)
  );
  document.addEventListener('visibilitychange', handleVisibility);
}

function unbindMediaListeners() {
  if (!mediaListenersBound || typeof document === 'undefined') return;
  mediaListenersBound = false;
  ['play', 'pause', 'ended', 'volumechange', 'emptied'].forEach((evt) =>
    document.removeEventListener(evt, recomputeVideoDuck, true)
  );
  document.removeEventListener('visibilitychange', handleVisibility);
}

function handleVisibility() {
  if (!engine || !state.on) return;
  if (document.hidden) engine.pause();
  else engine.resume();
}

/* ---------- Public API ---------- */
export function getRadioState() {
  return state;
}

export function subscribeRadio(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Must be called from a user gesture (tap/click/key) the first time. */
export function setRadioOn(on, { fadeInSec = 1.2 } = {}) {
  if (on) {
    setState({ on: true, wantsOn: true, loading: !engine });
    persist();
    bindMediaListeners();
    loadEngine()
      .then((eng) => {
        if (!state.on) return;
        setState({ loading: false, activeStation: effectiveStation() });
        eng.setVolume(state.volume);
        eng.setMuted(muted);
        eng.setDucked(ducks.size > 0);
        eng.play(effectiveStation(), fadeInSec);
        recomputeVideoDuck();
      })
      .catch(() => setState({ on: false, loading: false }));
  } else {
    setState({ on: false, wantsOn: false, loading: false });
    persist();
    unbindMediaListeners();
    if (engine) engine.stop();
  }
}

export function toggleRadio() {
  setRadioOn(!state.on);
}

export function setRadioStation(id) {
  if (!STATION_IDS.includes(id)) return;
  setState({ station: id });
  persist();
  if (engine && state.on && !contextStation) {
    setState({ activeStation: id });
    engine.setStation(id);
  }
}

export function setRadioVolume(v) {
  const volume = Math.min(1, Math.max(0, Number(v) || 0));
  setState({ volume });
  persist();
  if (engine) engine.setVolume(volume);
}

export function skipRadioTrack() {
  if (engine && state.on) engine.nextTrack();
}

/** Game / Boss Key contexts may request a station (null = back to the user's pick). */
export function setRadioContextStation(id) {
  const next = STATION_IDS.includes(id) ? id : null;
  if (next === contextStation) return;
  contextStation = next;
  if (engine && state.on) {
    const target = effectiveStation();
    if (target !== state.activeStation) {
      setState({ activeStation: target });
      engine.setStation(target);
    }
  }
}

export function setRadioDuck(reason, active) {
  const had = ducks.size > 0;
  if (active) ducks.add(reason);
  else ducks.delete(reason);
  const has = ducks.size > 0;
  if (engine && had !== has) engine.setDucked(has);
}

/** Mirrors the global 🔊/🔇 sound toggle. */
export function setRadioMuted(nextMuted) {
  muted = !!nextMuted;
  if (engine) engine.setMuted(muted);
}

/** Reactive music hooks: 'combo' (payload = multiplier) and 'publish'. No-ops while OFF. */
export function radioEvent(type, payload) {
  if (!engine || !state.on) return;
  engine.event(type, payload);
}

/**
 * If the user previously left the radio ON, resume it on their first gesture of
 * this session (never before a gesture). Installs a single one-shot listener.
 */
export function armRadioResumeOnGesture() {
  if (resumeListenerBound || typeof window === 'undefined' || !state.wantsOn) return;
  resumeListenerBound = true;
  const events = ['pointerup', 'keydown', 'touchend'];
  const handler = () => {
    events.forEach((evt) => window.removeEventListener(evt, handler, true));
    if (state.wantsOn && !state.on) setRadioOn(true, { fadeInSec: 2.5 });
  };
  events.forEach((evt) => window.addEventListener(evt, handler, true));
}
