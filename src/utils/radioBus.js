/**
 * THE MEMES FM — tiny always-loaded radio state bus (Phase 28.11).
 *
 * This module is intentionally small: it holds the persisted radio preferences
 * (`tm_radio`), notifies React subscribers, and lazy-loads the heavy procedural
 * synth (`musicEngine.js`) ONLY after the user taps play. While the radio is OFF
 * no AudioContext is touched, no timers run and no listeners are attached.
 */

import { loadUnlockedCosmetics } from '../data/cosmetics';

const STORAGE_KEY = 'tm_radio';

const BASE_RADIO_STATIONS = [
  { id: 'synthwave', icon: '📼', name: 'Synthwave Drive' },
  { id: 'lofi', icon: '☕', name: 'Lo-fi Meme Beats' },
  { id: 'chiptune', icon: '👾', name: '8-Bit Chiptune' },
  { id: 'vaporwave', icon: '🛗', name: 'Vaporwave Elevator' },
  { id: 'phonk', icon: '🐸', name: 'Meme Phonk' },
  { id: 'jungle', icon: '🥁', name: 'Jungle / Drum & Bass' },
  { id: 'casinojazz', icon: '🎷', name: 'Casino Lounge Jazz' },
  { id: 'western', icon: '🤠', name: 'Spaghetti Western' },
  { id: 'retrowave', icon: '🌅', name: 'Sunset Outrun FM', cosmeticId: 'station-retrowave' },
  { id: 'cyberpunk', icon: '⚡', name: 'Dark Cyberbass FM', cosmeticId: 'station-cyberpunk' },
  { id: 'yachtrock', icon: '🏝️', name: 'Yacht Rock Sunset', cosmeticId: 'station-yachtrock' },
  { id: 'italodisco', icon: '🪩', name: "Italo Disco '84", cosmeticId: 'station-italodisco' },
  { id: 'mixtape', icon: '♥', name: 'My Mixtape' }
];

export function getSeasonalRadioStations(now = new Date()) {
  const month = now.getMonth();
  const list = [];
  if (month === 9) {
    list.push({ id: 'spookysynth', icon: '🎃', name: 'Spooky Synth', seasonal: true });
  } else if (month === 11) {
    list.push({ id: 'jinglesynth', icon: '🎄', name: 'Jingle Synth', seasonal: true });
  }
  return list;
}

export const RADIO_STATIONS = [
  ...BASE_RADIO_STATIONS,
  ...getSeasonalRadioStations()
];

const STATION_IDS = [
  ...BASE_RADIO_STATIONS.map((s) => s.id),
  'spookysynth',
  'jinglesynth'
];

function sanitizeFavorites(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const stationId = typeof item.stationId === 'string' && STATION_IDS.includes(item.stationId) && item.stationId !== 'mixtape'
      ? item.stationId
      : '';
    const trackIndex = Number(item.trackIndex);
    if (!stationId || !Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex > 15) continue;
    const key = `${stationId}:${trackIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      stationId,
      trackIndex,
      name: typeof item.name === 'string' ? item.name.slice(0, 60) : `Track ${trackIndex + 1}`
    });
    if (out.length >= 64) break;
  }
  return out;
}

function loadPrefs() {
  const fallback = {
    on: false,
    station: 'synthwave',
    volume: 0.6,
    shuffleAll: false,
    allowContextOverride: true,
    favorites: []
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      on: raw.on === true,
      station: STATION_IDS.includes(raw.station) ? raw.station : 'synthwave',
      volume: Math.min(1, Math.max(0, Number(raw.volume ?? 0.6) || 0)),
      shuffleAll: raw.shuffleAll === true,
      allowContextOverride: raw.allowContextOverride !== false,
      favorites: sanitizeFavorites(raw.favorites)
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
  currentTrack: null,
  shuffleAll: prefs.shuffleAll,
  allowContextOverride: prefs.allowContextOverride,
  favorites: prefs.favorites,
  sleepMinutes: 0,
  sleepEndsAt: null,
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
let sleepTimeoutId = null;

function clearSleepTimer() {
  if (sleepTimeoutId) {
    clearTimeout(sleepTimeoutId);
    sleepTimeoutId = null;
  }
}

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        on: state.wantsOn,
        station: state.station,
        volume: state.volume,
        shuffleAll: state.shuffleAll,
        allowContextOverride: state.allowContextOverride,
        favorites: state.favorites
      })
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
  return (state.allowContextOverride && contextStation) ? contextStation : state.station;
}

function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('./musicEngine').then((mod) => {
      engine = mod.createMusicEngine({
        onTrack: (track, meta) => setState({ track, currentTrack: meta || null })
      });
      engine.setMixtapeTracks?.(state.favorites);
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

function getUnlockedStations({ includeMixtape = false } = {}) {
  const unlocked = loadUnlockedCosmetics();
  return RADIO_STATIONS.filter(
    (st) => (includeMixtape || st.id !== 'mixtape') && (!st.cosmeticId || unlocked.includes(st.cosmeticId))
  );
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
        const target = effectiveStation();
        setState({ loading: false, activeStation: target });
        eng.setVolume(state.volume);
        eng.setMuted(muted);
        eng.setDucked(ducks.size > 0);
        eng.play(target, fadeInSec);
        recomputeVideoDuck();
      })
      .catch(() => setState({ on: false, loading: false }));
  } else {
    clearSleepTimer();
    setState({ on: false, wantsOn: false, loading: false, sleepMinutes: 0, sleepEndsAt: null });
    persist();
    unbindMediaListeners();
    if (engine) engine.stop();
  }
}

export function toggleRadio() {
  setRadioOn(!state.on);
}

export function setRadioStation(id, { overrideContext = true, startIfOff = false } = {}) {
  if (!STATION_IDS.includes(id)) return;
  if (overrideContext) {
    contextStation = null;
  }
  setState({ station: id });
  persist();
  if (startIfOff && !state.on) {
    setRadioOn(true);
    return;
  }
  if (engine && state.on && (!(contextStation && state.allowContextOverride) || overrideContext)) {
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
  if (!engine || !state.on) return;
  if (state.shuffleAll && state.activeStation !== 'mixtape') {
    const pool = getUnlockedStations({ includeMixtape: false });
    if (pool.length > 0) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const randTrack = Math.floor(Math.random() * 6);
      setState({ activeStation: picked.id });
      engine.setStation(picked.id, randTrack);
      return;
    }
  }
  engine.nextTrack();
}

export function prevRadioTrack() {
  if (engine && state.on) engine.prevTrack?.();
}

export function cycleRadioStation() {
  const pool = getUnlockedStations({ includeMixtape: state.favorites.length > 0 });
  if (pool.length === 0) return;
  const currentId = state.on ? state.activeStation : state.station;
  const idx = pool.findIndex((s) => s.id === currentId);
  const next = pool[(idx + 1) % pool.length];
  setRadioStation(next.id, { overrideContext: true, startIfOff: false });
}

export function toggleShuffleAll() {
  const next = !state.shuffleAll;
  setState({ shuffleAll: next });
  persist();
}

export function setRadioAllowContextOverride(allow) {
  const next = !!allow;
  setState({ allowContextOverride: next });
  persist();
  if (engine && state.on) {
    const target = effectiveStation();
    if (target !== state.activeStation) {
      setState({ activeStation: target });
      engine.setStation(target);
    }
  }
}

export function isTrackFavorited(meta = state.currentTrack, favs = state.favorites) {
  if (!meta) return false;
  return favs.some((f) => f.stationId === meta.stationId && f.trackIndex === meta.trackIndex);
}

export function toggleFavoriteCurrentTrack() {
  const ct = state.currentTrack;
  if (!ct || !ct.stationId || ct.stationId === 'mixtape') return;
  const exists = state.favorites.some(
    (f) => f.stationId === ct.stationId && f.trackIndex === ct.trackIndex
  );
  const nextFavs = exists
    ? state.favorites.filter((f) => !(f.stationId === ct.stationId && f.trackIndex === ct.trackIndex))
    : sanitizeFavorites([...state.favorites, ct]);
  setState({ favorites: nextFavs });
  persist();
  if (engine?.setMixtapeTracks) engine.setMixtapeTracks(nextFavs);
}

export function setRadioSleepTimer(minutes) {
  const mins = [0, 15, 30, 60].includes(Number(minutes)) ? Number(minutes) : 0;
  clearSleepTimer();
  if (mins <= 0) {
    setState({ sleepMinutes: 0, sleepEndsAt: null });
    return;
  }
  const endsAt = Date.now() + mins * 60000;
  setState({ sleepMinutes: mins, sleepEndsAt: endsAt });
  sleepTimeoutId = setTimeout(() => {
    sleepTimeoutId = null;
    setRadioOn(false);
  }, mins * 60000);
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
