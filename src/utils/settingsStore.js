// ==========================================
// UNIFIED SETTINGS STORE (Phase 29.13)
// Stores all Arcade preferences under one `tm_settings` JSON key
// and mirrors live changes to sfx, radioBus, DOM reduced-motion & AI voice.
// ==========================================

import { sfx } from './soundEngine';
import { getRadioState, setRadioStation, setRadioVolume } from './radioBus';

export const SETTINGS_STORAGE_KEY = 'tm_settings';

const HINT_STORAGE_KEYS = [
  'tm_intro_seen',
  'tm_onboarding_dismissed',
  'tm_roulette_hint_seen',
  'tm_derby_hint_seen',
  'tm_plinko_hint_seen',
  'tm_guess_hint_seen',
  'tm_hilow_hint_seen',
  'tm_lobby_hint_seen'
];

export const DEFAULT_SETTINGS = {
  sfxOn: true,
  sfxVolume: 0.85,
  soundPack: 'goofy',
  musicStation: 'synthwave',
  musicVolume: 0.6,
  aiVoiceOn: true,
  aiVoiceKitt: 'auto',
  aiVoiceHal: 'auto',
  hapticsOn: true,
  reducedMotion: 'auto', // 'auto' | 'on' | 'off'
  crtOn: false,
  turboFps: true,
  litePerfMode: false
};

let cachedSettings = null;
const listeners = new Set();

function readInitialSettings() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        sfxVolume: clampUnit(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
        musicVolume: clampUnit(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
        reducedMotion: ['auto', 'on', 'off'].includes(parsed.reducedMotion)
          ? parsed.reducedMotion
          : 'auto'
      };
    }

    // Seed once from legacy scattered localStorage keys so existing preferences migrate cleanly
    const radio = getRadioState();
    const migrated = {
      ...DEFAULT_SETTINGS,
      sfxOn: localStorage.getItem('tm_sound_on') !== 'false',
      soundPack: localStorage.getItem('tm_sound_pack') || DEFAULT_SETTINGS.soundPack,
      musicStation: radio.station || DEFAULT_SETTINGS.musicStation,
      musicVolume: clampUnit(radio.volume, DEFAULT_SETTINGS.musicVolume),
      aiVoiceOn: localStorage.getItem('tm_ai_voice_muted') !== '1',
      aiVoiceKitt: localStorage.getItem('tm_ai_voice_kitt') || 'auto',
      aiVoiceHal: localStorage.getItem('tm_ai_voice_hal') || 'auto',
      crtOn: localStorage.getItem('tm_crt') === 'true',
      litePerfMode: localStorage.getItem('tm_lite_perf_v1') === 'true'
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function clampUnit(val, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

export function getSettings() {
  if (!cachedSettings) {
    cachedSettings = readInitialSettings();
  }
  return cachedSettings;
}

export function applySettingsToRuntime(settings) {
  if (typeof window === 'undefined' || !settings) return;

  sfx.enabled = Boolean(settings.sfxOn);
  sfx.setVolume(settings.sfxVolume);
  sfx.setPack(settings.soundPack || 'goofy');
  sfx.setHapticsEnabled(Boolean(settings.hapticsOn));

  try {
    localStorage.setItem('tm_sound_on', settings.sfxOn ? 'true' : 'false');
    localStorage.setItem('tm_ai_voice_muted', settings.aiVoiceOn ? '0' : '1');
    localStorage.setItem('tm_ai_voice_kitt', settings.aiVoiceKitt || 'auto');
    localStorage.setItem('tm_ai_voice_hal', settings.aiVoiceHal || 'auto');
    localStorage.setItem('tm_crt', String(Boolean(settings.crtOn)));
    localStorage.setItem('tm_lite_perf_v1', String(Boolean(settings.litePerfMode)));
  } catch {
    // ignore storage errors
  }

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.dataset.reducedMotion = settings.reducedMotion || 'auto';
    root.classList.toggle('tm-reduced-motion-force', settings.reducedMotion === 'on');
    root.classList.toggle('tm-reduced-motion-allow', settings.reducedMotion === 'off');
    root.dataset.turboFps = settings.turboFps ? '1' : '0';
  }

  try {
    window.dispatchEvent(new CustomEvent('tm-settings-changed', { detail: settings }));
  } catch {
    // ignore
  }
}

export function updateSettings(patchOrUpdater) {
  const prev = getSettings();
  const patch =
    typeof patchOrUpdater === 'function' ? patchOrUpdater(prev) : patchOrUpdater || {};
  const next = {
    ...prev,
    ...patch,
    sfxVolume: clampUnit(patch.sfxVolume ?? prev.sfxVolume, prev.sfxVolume),
    musicVolume: clampUnit(patch.musicVolume ?? prev.musicVolume, prev.musicVolume)
  };
  cachedSettings = next;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }

  if (patch.musicStation !== undefined && patch.musicStation !== prev.musicStation) {
    setRadioStation(next.musicStation, { overrideContext: true });
  }
  if (patch.musicVolume !== undefined && patch.musicVolume !== prev.musicVolume) {
    setRadioVolume(next.musicVolume);
  }

  applySettingsToRuntime(next);
  listeners.forEach((fn) => fn(next));
  return next;
}

export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetFirstVisitHints() {
  if (typeof window === 'undefined') return;
  try {
    HINT_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent('tm-hints-reset'));
  } catch {
    // ignore
  }
}
