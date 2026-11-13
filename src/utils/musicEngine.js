/**
 * THE MEMES FM — Procedural Synthwave Radio Engine (Phase 28.11)
 *
 * Fully generated in real time with the Web Audio API (drum machine + bassline +
 * arpeggio + pad), sharing the existing `sfx` AudioContext. No audio files, no
 * licensing, no CSP changes. Lazy-loaded by `radioBus.js` only after the user
 * taps play, so it costs nothing while the radio is OFF.
 */
import { sfx } from './soundEngine';

/* ---------- Music theory helpers ---------- */
const CHORD_TONES = {
  min: [0, 3, 7],
  maj: [0, 4, 7],
  min7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10]
};

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Stations & tracks ---------- */
const STATIONS = {
  synthwave: {
    bpm: 100,
    swing: 0,
    filterBase: 4200,
    tracks: [
      { name: "Doge Highway '86", root: 33, prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [10, 'maj']], seed: 11 },
      { name: 'Neon Stonks Boulevard', root: 38, prog: [[0, 'min'], [5, 'min'], [8, 'maj'], [7, 'maj']], seed: 23 },
      { name: 'Midnight Rickroll Run', root: 36, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [10, 'maj']], seed: 37 },
      { name: 'Chad Turbo Sunset', root: 40, prog: [[0, 'min'], [3, 'maj'], [10, 'maj'], [5, 'min']], seed: 41 },
      { name: 'Delorean Meme Warp', root: 35, prog: [[0, 'min'], [7, 'maj'], [8, 'maj'], [10, 'maj']], seed: 43 },
      { name: 'Cyber Skyline Overpass', root: 37, prog: [[0, 'min'], [5, 'min'], [10, 'maj'], [7, 'maj']], seed: 47 }
    ]
  },
  lofi: {
    bpm: 78,
    swing: 0.2,
    filterBase: 2300,
    tracks: [
      { name: 'Rainy Day Doomscroll', root: 38, prog: [[0, 'min7'], [5, 'min7'], [10, 'maj7'], [3, 'maj7']], seed: 53 },
      { name: 'Study Pepe', root: 41, prog: [[0, 'maj7'], [9, 'min7'], [2, 'min7'], [7, 'dom7']], seed: 67 },
      { name: '3AM Caption Café', root: 36, prog: [[0, 'min7'], [8, 'maj7'], [5, 'min7'], [7, 'dom7']], seed: 71 },
      { name: 'Cozy Cat Vibes', root: 39, prog: [[0, 'maj7'], [5, 'maj7'], [4, 'min7'], [9, 'min7']], seed: 83 },
      { name: 'Late Night Wojak Tea', root: 40, prog: [[0, 'min7'], [7, 'dom7'], [5, 'maj7'], [3, 'maj7']], seed: 89 },
      { name: 'Tape Hiss Nostalgia', root: 35, prog: [[0, 'maj7'], [4, 'min7'], [9, 'min7'], [7, 'dom7']], seed: 91 }
    ]
  },
  chiptune: {
    bpm: 140,
    swing: 0,
    filterBase: 9000,
    tracks: [
      { name: 'Level 1-1: Meme Kingdom', root: 36, prog: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [5, 'maj']], seed: 97 },
      { name: 'Boss Fight: Giga-Moai', root: 33, prog: [[0, 'min'], [1, 'maj'], [0, 'min'], [7, 'maj']], seed: 101 },
      { name: 'Coin Dozer Overdrive', root: 38, prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], seed: 113 },
      { name: 'Pixel Frog Quest', root: 35, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj']], seed: 127 },
      { name: 'Bonus Stage Warp Pipe', root: 41, prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], seed: 129 },
      { name: 'Final Cartridge Castle', root: 34, prog: [[0, 'min'], [3, 'maj'], [8, 'maj'], [7, 'maj']], seed: 130 }
    ]
  },
  vaporwave: {
    bpm: 70,
    swing: 0.08,
    filterBase: 1700,
    tracks: [
      { name: 'Ｍｅｍｅ Ｍａｌｌ ８４', root: 37, prog: [[0, 'maj7'], [5, 'maj7'], [2, 'min7'], [7, 'dom7']], seed: 131 },
      { name: "Elevator to the Boss's Office", root: 40, prog: [[0, 'maj7'], [9, 'min7'], [5, 'maj7'], [7, 'dom7']], seed: 149 },
      { name: 'Hold Music Forever', root: 36, prog: [[0, 'maj7'], [4, 'min7'], [5, 'maj7'], [7, 'dom7']], seed: 157 },
      { name: 'Floral Shoppe Doge', root: 38, prog: [[0, 'min7'], [5, 'min7'], [10, 'maj7'], [8, 'maj7']], seed: 163 },
      { name: 'Marble Bust Atrium', root: 39, prog: [[0, 'maj7'], [2, 'min7'], [5, 'maj7'], [4, 'min7']], seed: 167 },
      { name: 'Fiji Water Fountain', root: 35, prog: [[0, 'min7'], [8, 'maj7'], [3, 'maj7'], [7, 'dom7']], seed: 171 }
    ]
  },
  retrowave: {
    bpm: 108,
    swing: 0,
    filterBase: 5200,
    tracks: [
      { name: 'Miami Palms 1986', root: 35, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], seed: 173 },
      { name: 'Turbo Testarossa', root: 40, prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], seed: 181 },
      { name: 'Neon Coastline FM', root: 37, prog: [[0, 'maj7'], [7, 'maj'], [5, 'maj7'], [9, 'min7']], seed: 193 },
      { name: 'Laser Horizon ' + '88', root: 38, prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], seed: 197 },
      { name: 'VHS Cassette Boulevard', root: 36, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [3, 'maj']], seed: 199 },
      { name: 'Pink Flamingo Highway', root: 39, prog: [[0, 'maj7'], [5, 'maj7'], [9, 'min7'], [7, 'dom7']], seed: 205 }
    ]
  },
  cyberpunk: {
    bpm: 118,
    swing: 0,
    filterBase: 3600,
    tracks: [
      { name: 'Night City Overdrive', root: 31, prog: [[0, 'min'], [1, 'maj'], [3, 'maj'], [0, 'min']], seed: 211 },
      { name: 'Subgrid Bass Protocol', root: 34, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [7, 'maj']], seed: 223 },
      { name: 'Chrome Runner 2099', root: 33, prog: [[0, 'min'], [5, 'min'], [1, 'maj'], [7, 'maj']], seed: 239 },
      { name: 'ICE Breaker Daemon', root: 32, prog: [[0, 'min'], [3, 'maj'], [1, 'maj'], [7, 'maj']], seed: 241 },
      { name: 'Kiroshi Neon Alley', root: 35, prog: [[0, 'min'], [7, 'maj'], [8, 'maj'], [1, 'maj']], seed: 251 },
      { name: 'Neural Link Overload', root: 30, prog: [[0, 'min'], [5, 'min'], [8, 'maj'], [1, 'maj']], seed: 257 }
    ]
  },
  phonk: {
    bpm: 132,
    swing: 0.05,
    filterBase: 4600,
    tracks: [
      { name: 'Pepe Cowbell Drift', root: 33, prog: [[0, 'min'], [1, 'maj'], [0, 'min'], [5, 'min']], seed: 307 },
      { name: '808 GigaChad Walk', root: 31, prog: [[0, 'min'], [8, 'maj'], [1, 'maj'], [7, 'maj']], seed: 311 },
      { name: 'Memphis Doge Tape', root: 34, prog: [[0, 'min'], [5, 'min'], [1, 'maj'], [0, 'min']], seed: 313 },
      { name: 'Midnight Slammed Civic', root: 32, prog: [[0, 'min'], [3, 'maj'], [1, 'maj'], [7, 'maj']], seed: 317 },
      { name: 'Cowbell Frenzy 1995', root: 35, prog: [[0, 'min'], [1, 'maj'], [8, 'maj'], [7, 'maj']], seed: 331 },
      { name: 'Drift King Cheems', root: 36, prog: [[0, 'min'], [10, 'maj'], [1, 'maj'], [0, 'min']], seed: 337 }
    ]
  },
  jungle: {
    bpm: 168,
    swing: 0.04,
    filterBase: 6400,
    tracks: [
      { name: 'Amen Doge Break', root: 33, prog: [[0, 'min7'], [5, 'min7'], [8, 'maj7'], [7, 'min7']], seed: 401 },
      { name: '90s Pirate Meme Radio', root: 35, prog: [[0, 'min7'], [3, 'maj7'], [10, 'maj7'], [5, 'min7']], seed: 409 },
      { name: 'Reese Sub Rollers', root: 31, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj']], seed: 419 },
      { name: 'Liquid Jungle Nyan', root: 36, prog: [[0, 'min7'], [8, 'maj7'], [5, 'min7'], [10, 'maj7']], seed: 421 },
      { name: 'Hyper Chopped Amen', root: 34, prog: [[0, 'min7'], [7, 'min7'], [8, 'maj7'], [5, 'min7']], seed: 431 },
      { name: 'Ragga Pepe VIP', root: 32, prog: [[0, 'min'], [1, 'maj'], [5, 'min'], [7, 'maj']], seed: 433 }
    ]
  },
  casinojazz: {
    bpm: 96,
    swing: 0.3,
    filterBase: 3200,
    tracks: [
      { name: 'Velvet Felt Nocturne', root: 38, prog: [[0, 'min7'], [5, 'dom7'], [10, 'maj7'], [7, 'dom7']], seed: 503 },
      { name: 'Penthouse High Roller', root: 41, prog: [[0, 'maj7'], [9, 'min7'], [2, 'min7'], [7, 'dom7']], seed: 509 },
      { name: 'Champagne Roulette', root: 36, prog: [[0, 'min7'], [5, 'min7'], [10, 'maj7'], [3, 'dom7']], seed: 521 },
      { name: 'Midnight Blackjack Trio', root: 39, prog: [[0, 'maj7'], [4, 'min7'], [9, 'min7'], [2, 'dom7']], seed: 523 },
      { name: 'Bellagio Stonks Lounge', root: 37, prog: [[0, 'min7'], [7, 'dom7'], [5, 'maj7'], [2, 'min7']], seed: 541 },
      { name: 'Neon Martini Shuffle', root: 40, prog: [[0, 'maj7'], [2, 'min7'], [7, 'dom7'], [0, 'maj7']], seed: 547 }
    ]
  },
  western: {
    bpm: 104,
    swing: 0.16,
    filterBase: 4100,
    tracks: [
      { name: 'High Noon Doge Duel', root: 33, prog: [[0, 'min'], [5, 'min'], [8, 'maj'], [7, 'maj']], seed: 601 },
      { name: 'Fistful of Stonks', root: 38, prog: [[0, 'min'], [3, 'maj'], [10, 'maj'], [7, 'maj']], seed: 607 },
      { name: 'Tumbleweed Saloon', root: 35, prog: [[0, 'min'], [8, 'maj'], [7, 'maj'], [0, 'min']], seed: 613 },
      { name: 'Good, Bad & Meme', root: 36, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [7, 'maj']], seed: 617 },
      { name: 'Sunset Canyon Gallop', root: 40, prog: [[0, 'min'], [5, 'min'], [1, 'maj'], [7, 'maj']], seed: 619 },
      { name: 'Gold Rush Outlaw', root: 34, prog: [[0, 'min'], [3, 'maj'], [7, 'maj'], [0, 'min']], seed: 631 }
    ]
  },
  yachtrock: {
    bpm: 102,
    swing: 0.12,
    filterBase: 3600,
    tracks: [
      { name: 'Marina Breeze 1979', root: 40, prog: [[0, 'maj7'], [5, 'maj7'], [4, 'min7'], [7, 'dom7']], seed: 701 },
      { name: 'Piña Colada Portfolio', root: 38, prog: [[0, 'maj7'], [9, 'min7'], [2, 'min7'], [7, 'dom7']], seed: 709 },
      { name: 'Catalina Neon Deck', root: 41, prog: [[0, 'maj7'], [7, 'dom7'], [5, 'maj7'], [2, 'min7']], seed: 719 },
      { name: 'Smooth Sailing Wojak', root: 36, prog: [[0, 'maj7'], [4, 'min7'], [9, 'min7'], [5, 'maj7']], seed: 727 },
      { name: 'Captain Hat Groove', root: 39, prog: [[0, 'maj7'], [5, 'maj7'], [2, 'min7'], [7, 'dom7']], seed: 733 },
      { name: 'Twilight Harbormaster', root: 37, prog: [[0, 'min7'], [5, 'maj7'], [10, 'maj7'], [7, 'dom7']], seed: 739 }
    ]
  },
  italodisco: {
    bpm: 122,
    swing: 0,
    filterBase: 6200,
    tracks: [
      { name: 'Milanese Laser Club', root: 36, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj']], seed: 809 },
      { name: 'Rimini Arcade Night', root: 38, prog: [[0, 'min'], [5, 'min'], [10, 'maj'], [3, 'maj']], seed: 811 },
      { name: 'Ciao Bella Synth', root: 33, prog: [[0, 'min'], [8, 'maj'], [3, 'maj'], [7, 'maj']], seed: 821 },
      { name: 'Disco Ball Telemetry', root: 40, prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], seed: 823 },
      { name: 'Eurobeat Doge Express', root: 35, prog: [[0, 'min'], [10, 'maj'], [8, 'maj'], [7, 'maj']], seed: 827 },
      { name: 'Turin Midnight Vocoder', root: 37, prog: [[0, 'min'], [3, 'maj'], [8, 'maj'], [10, 'maj']], seed: 829 }
    ]
  },
  spookysynth: {
    bpm: 112,
    swing: 0,
    filterBase: 3400,
    tracks: [
      { name: 'Haunted Arcade Cabinet', root: 33, prog: [[0, 'min'], [1, 'maj'], [7, 'maj'], [0, 'min']], seed: 907 },
      { name: 'Skeleton Dance ' + '86', root: 36, prog: [[0, 'min'], [6, 'min'], [8, 'maj'], [7, 'maj']], seed: 911 },
      { name: 'Pumpkin Patch Poltergeist', root: 38, prog: [[0, 'min'], [5, 'min'], [1, 'maj'], [7, 'maj']], seed: 919 },
      { name: 'Midnight Cryptorgan', root: 31, prog: [[0, 'min'], [8, 'maj'], [1, 'maj'], [7, 'maj']], seed: 929 },
      { name: 'Witching Hour VHS', root: 34, prog: [[0, 'min'], [3, 'maj'], [6, 'min'], [7, 'maj']], seed: 937 },
      { name: 'Doot Doot Finale', root: 35, prog: [[0, 'min'], [7, 'maj'], [8, 'maj'], [1, 'maj']], seed: 941 }
    ]
  },
  jinglesynth: {
    bpm: 124,
    swing: 0.08,
    filterBase: 6800,
    tracks: [
      { name: 'Sleigh Bells Overclock', root: 36, prog: [[0, 'maj'], [5, 'maj'], [7, 'maj'], [0, 'maj']], seed: 953 },
      { name: '8-Bit North Pole', root: 38, prog: [[0, 'maj'], [9, 'min'], [5, 'maj'], [7, 'maj']], seed: 967 },
      { name: 'Snowy Mall Atrium', root: 41, prog: [[0, 'maj7'], [5, 'maj7'], [2, 'min7'], [7, 'dom7']], seed: 971 },
      { name: 'Winter Doge Wonderland', root: 35, prog: [[0, 'maj'], [4, 'min'], [5, 'maj'], [7, 'maj']], seed: 977 },
      { name: 'Tinsel Synthwave Run', root: 40, prog: [[0, 'maj'], [7, 'maj'], [9, 'min'], [5, 'maj']], seed: 983 },
      { name: 'Arcade New Year Drop', root: 37, prog: [[0, 'maj'], [5, 'maj'], [9, 'min'], [7, 'maj']], seed: 991 }
    ]
  }
};

const LOOKAHEAD_SEC = 0.45;
const TICK_MS = 35;

export function createMusicEngine({ onTrack, onPlay, onPause, onNext, onPrev } = {}) {
  let ctx = null;
  let nodes = null;
  let noiseBuffer = null;
  let streamDest = null;
  let mediaAudioEl = null;
  let usingMediaStreamOut = false;
  let mediaSessionBound = false;
  let ctxStateBound = false;
  let intentionalMediaPause = false;
  let lastResumeTryTs = 0;
  let isCrossfading = false;

  let stationId = 'synthwave';
  let trackIdx = 0;
  let pattern = null;
  let step = 0;
  let nextStepTime = 0;
  let timer = null;
  let playing = false;
  let paused = false;

  let volume = 0.6;
  let muted = false;
  let ducked = false;
  let keyShift = 0;
  let lastCombo = 1;
  let fillBar = -1;
  let riserQueued = false;
  let dropQueued = false;
  let stingerQueued = false;
  let mixtapeItems = [];
  const pendingTimeouts = new Set();

  const DEFAULT_MIXTAPE = [
    { stationId: 'synthwave', trackIndex: 0 },
    { stationId: 'lofi', trackIndex: 0 },
    { stationId: 'phonk', trackIndex: 0 },
    { stationId: 'casinojazz', trackIndex: 0 },
    { stationId: 'western', trackIndex: 0 },
    { stationId: 'chiptune', trackIndex: 0 }
  ];

  const getActiveSpec = () => {
    if (stationId === 'mixtape') {
      const list = mixtapeItems.length > 0 ? mixtapeItems : DEFAULT_MIXTAPE;
      const entry = list[trackIdx % list.length];
      const srcStation = STATIONS[entry.stationId] || STATIONS.synthwave;
      const tIdx = Math.max(0, Number(entry.trackIndex) || 0) % srcStation.tracks.length;
      return {
        synthStationId: entry.stationId in STATIONS ? entry.stationId : 'synthwave',
        station: srcStation,
        track: srcStation.tracks[tIdx],
        trackCount: list.length,
        sourceStationId: entry.stationId,
        sourceTrackIndex: tIdx
      };
    }
    const st = STATIONS[stationId] || STATIONS.synthwave;
    const tIdx = trackIdx % st.tracks.length;
    return {
      synthStationId: stationId,
      station: st,
      track: st.tracks[tIdx],
      trackCount: st.tracks.length,
      sourceStationId: stationId,
      sourceTrackIndex: tIdx
    };
  };

  const station = () => getActiveSpec().station;
  const track = () => getActiveSpec().track;
  const synthId = () => getActiveSpec().synthStationId;

  function later(fn, ms) {
    const id = setTimeout(() => {
      pendingTimeouts.delete(id);
      fn();
    }, Math.max(0, ms));
    pendingTimeouts.add(id);
  }

  function clearLater() {
    pendingTimeouts.forEach((id) => clearTimeout(id));
    pendingTimeouts.clear();
  }

  function fallbackToDirectDestination() {
    if (!nodes || !ctx) return;
    if (usingMediaStreamOut && streamDest) {
      try {
        nodes.master.disconnect(streamDest);
      } catch {
        // ignore if already disconnected
      }
      try {
        nodes.master.connect(ctx.destination);
      } catch {
        // ignore
      }
      usingMediaStreamOut = false;
    }
    if (mediaAudioEl) {
      intentionalMediaPause = true;
      try {
        mediaAudioEl.pause();
      } catch {
        // ignore
      }
    }
  }

  function startMediaStreamElement() {
    if (!usingMediaStreamOut || !mediaAudioEl) return;
    intentionalMediaPause = false;
    try {
      const playPromise = mediaAudioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => fallbackToDirectDestination());
      }
    } catch {
      fallbackToDirectDestination();
    }
  }

  function pauseMediaStreamElement() {
    if (!mediaAudioEl) return;
    intentionalMediaPause = true;
    try {
      mediaAudioEl.pause();
    } catch {
      // ignore
    }
  }

  function updateMediaSessionMetadata(trackTitle) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: trackTitle || 'Synthwave Stream',
          artist: 'THE MEMES FM',
          album: stationId === 'mixtape' ? '♥ My Mixtape' : stationId.toUpperCase(),
          artwork: [{ src: '/logo-512.png', sizes: '512x512', type: 'image/png' }]
        });
      }
    } catch {
      // ignore unsupported MediaMetadata
    }
  }

  function setMediaSessionPlaybackState(nextState) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = nextState;
    } catch {
      // ignore
    }
  }

  function bindMediaSessionHandlers(apiRef) {
    if (mediaSessionBound || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    mediaSessionBound = true;
    const ms = navigator.mediaSession;
    const safeBind = (action, fn) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        // unsupported action on this platform
      }
    };
    safeBind('play', () => (onPlay ? onPlay() : apiRef.resume()));
    safeBind('pause', () => (onPause ? onPause() : apiRef.pause()));
    safeBind('nexttrack', () => (onNext ? onNext() : apiRef.nextTrack()));
    safeBind('previoustrack', () => (onPrev ? onPrev() : apiRef.prevTrack()));
  }

  function bindCtxRecovery() {
    if (!ctx || ctxStateBound) return;
    ctxStateBound = true;
    try {
      ctx.addEventListener('statechange', () => {
        if (!ctx || !playing) return;
        if (ctx.state === 'running' && !paused) {
          nextStepTime = ctx.currentTime + 0.05;
          if (!isCrossfading && nodes) fadeMaster(1, 0.25);
          if (usingMediaStreamOut && mediaAudioEl && mediaAudioEl.paused) {
            startMediaStreamElement();
          }
          if (!timer) startScheduler();
          else tick();
        } else if (
          (ctx.state === 'interrupted' || ctx.state === 'suspended') &&
          !paused &&
          (typeof document === 'undefined' || !document.hidden)
        ) {
          ctx.resume().catch(() => {});
        }
      });
    } catch {
      // Ignore if statechange listener is unsupported
    }
  }

  /* ---------- Audio graph ---------- */
  function ensureGraph() {
    if (!ctx) {
      sfx.unlockIosAudio();
      ctx = sfx.ctx;
    }
    if (!ctx) return false;
    bindCtxRecovery();
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (nodes) return true;

    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = station().filterBase;
    filter.Q.value = 0.7;
    const vol = ctx.createGain();
    const duck = ctx.createGain();
    const mute = ctx.createGain();
    const master = ctx.createGain();
    master.gain.value = 0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;

    bus.connect(filter);
    filter.connect(comp);
    comp.connect(vol);
    vol.connect(duck);
    duck.connect(mute);
    mute.connect(master);

    // 29.7: Route master output through MediaStreamDestination -> hidden <audio playsinline>
    // behind a feature check so iOS treats playback as lock-screen media; fall back to ctx.destination on failure.
    usingMediaStreamOut = false;
    if (
      typeof ctx.createMediaStreamDestination === 'function' &&
      typeof Audio !== 'undefined' &&
      typeof MediaStream !== 'undefined'
    ) {
      try {
        const dest = ctx.createMediaStreamDestination();
        const el = new Audio();
        el.setAttribute('playsinline', '');
        el.playsInline = true;
        if ('srcObject' in el && dest?.stream) {
          el.srcObject = dest.stream;
          const recoverMediaEl = () => {
            if (!usingMediaStreamOut || !playing || paused || intentionalMediaPause) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            // If iOS/Android paused or stalled the MediaStream <audio> carrier, try resuming or fall back to direct ctx.destination
            try {
              const p = el.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => fallbackToDirectDestination());
              }
            } catch {
              fallbackToDirectDestination();
            }
          };
          el.addEventListener('pause', recoverMediaEl);
          el.addEventListener('stalled', recoverMediaEl);
          el.addEventListener('ended', recoverMediaEl);
          el.addEventListener('error', () => fallbackToDirectDestination());
          master.connect(dest);
          streamDest = dest;
          mediaAudioEl = el;
          usingMediaStreamOut = true;
        }
      } catch {
        usingMediaStreamOut = false;
      }
    }
    if (!usingMediaStreamOut) {
      master.connect(ctx.destination);
    }

    // Dotted-8th "80s echo" send for arps & stingers
    const echoIn = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    const feedback = ctx.createGain();
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 3200;
    feedback.gain.value = 0.32;
    echoIn.connect(delay);
    delay.connect(echoTone);
    echoTone.connect(feedback);
    feedback.connect(delay);
    echoTone.connect(bus);

    nodes = { bus, filter, vol, duck, mute, master, echoIn, delay };

    const len = ctx.sampleRate;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;

    applyLevels(0.01);
    return true;
  }

  function applyLevels(ramp = 0.25) {
    if (!nodes) return;
    const t = ctx.currentTime;
    nodes.vol.gain.setTargetAtTime(volume * 0.55, t, ramp);
    nodes.duck.gain.setTargetAtTime(ducked ? 0.2 : 1, t, ramp);
    nodes.mute.gain.setTargetAtTime(muted ? 0 : 1, t, ramp * 0.5);
  }

  function fadeMaster(target, sec) {
    if (!nodes) return;
    const g = nodes.master.gain;
    const t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(target, t + Math.max(0.02, sec));
  }

  function setFilter(freq, sec) {
    if (!nodes) return;
    const f = nodes.filter.frequency;
    const t = ctx.currentTime;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(Math.max(200, freq), t + Math.max(0.05, sec));
  }

  /* ---------- Voices ---------- */
  function tone({ time, freq, dur, type = 'square', gain = 0.1, attack = 0.005, release = 0.08, dest, detune = 0, slideTo }) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, time + dur);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + attack);
    g.gain.setValueAtTime(gain, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    osc.connect(g);
    g.connect(dest || nodes.bus);
    osc.start(time);
    osc.stop(time + dur + release + 0.05);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
    return g;
  }

  function noise({ time, dur, gain = 0.1, type = 'highpass', freq = 7000, q = 0.8, sweepTo }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, time);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, time + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f);
    f.connect(g);
    g.connect(nodes.bus);
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.05);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }

  function kick(time, strength = 1) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.14);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.9 * strength, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    osc.connect(g);
    g.connect(nodes.bus);
    osc.start(time);
    osc.stop(time + 0.42);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
    pulseAt(time);
  }

  function snare(time, gain = 0.32, tail = 0.18) {
    noise({ time, dur: tail, gain, type: 'bandpass', freq: 1800, q: 0.6 });
    tone({ time, freq: 190, dur: 0.05, type: 'triangle', gain: gain * 0.6, release: 0.06 });
  }

  function hat(time, gain = 0.07, dur = 0.04) {
    noise({ time, dur, gain, type: 'highpass', freq: 7500 });
  }

  function crash(time, gain = 0.22) {
    noise({ time, dur: 1.6, gain, type: 'highpass', freq: 4500, q: 0.4 });
  }

  /* ---------- Beat-synced visuals (CSS var, zero React renders) ---------- */
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pulseAt(time) {
    if (reducedMotion || typeof document === 'undefined') return;
    const delayMs = (time - ctx.currentTime) * 1000;
    later(() => {
      if (!playing || paused || document.querySelector('.tm-lite-perf')) return;
      const root = document.documentElement;
      root.style.setProperty('--beat', '1');
      later(() => root.style.setProperty('--beat', '0'), 110);
    }, delayMs);
  }

  /* ---------- Pattern generation (seeded per track) ---------- */
  function buildPattern() {
    const tr = track();
    const rnd = mulberry32(tr.seed * 7919 + keyShift);
    const arpOrder = Array.from({ length: 16 }, (_, i) =>
      rnd() < 0.7 ? i % 4 : Math.floor(rnd() * 4)
    );
    const ghostHats = Array.from({ length: 16 }, () => rnd() < 0.35);
    const bassOct = Array.from({ length: 16 }, () => rnd() < 0.25);
    const keysHits = Array.from({ length: 16 }, (_, i) => i === 0 || (i % 2 === 0 && rnd() < 0.22));
    const melody = Array.from({ length: 16 }, () => (rnd() < 0.3 ? Math.floor(rnd() * 4) : -1));
    pattern = { arpOrder, ghostHats, bassOct, keysHits, melody };
  }

  function chordFor(bar) {
    const tr = track();
    const [offset, quality] = tr.prog[bar % tr.prog.length];
    const root = tr.root + offset + keyShift;
    return { root, tones: CHORD_TONES[quality] || CHORD_TONES.min };
  }

  /* ---------- Step sequencer ---------- */
  function scheduleStep(stepIdx, time) {
    const st = station();
    const s = stepIdx % 16;
    const bar = Math.floor(stepIdx / 16);
    const sixteenth = 60 / st.bpm / 4;
    const t = s % 2 === 1 ? time + sixteenth * st.swing : time;
    const { root, tones } = chordFor(bar);
    const isFill = bar === fillBar && s >= 12;

    // One-shot reactive events land on musical boundaries
    if (s === 0 && dropQueued) {
      dropQueued = false;
      crash(t, 0.3);
      tone({ time: t, freq: midiToHz(root - 12), dur: 0.6, type: 'sine', gain: 0.5, slideTo: midiToHz(root - 24) });
      setFilter(18000, 0.05);
      later(() => setFilter(lastCombo >= 3 ? 12000 : station().filterBase, 3), (t - ctx.currentTime) * 1000 + 60000 / st.bpm * 8);
    }
    if (s % 4 === 0 && riserQueued) {
      riserQueued = false;
      noise({ time: t, dur: sixteenth * 16, gain: 0.12, type: 'bandpass', freq: 400, q: 2, sweepTo: 7000 });
      setFilter(12000, sixteenth * 16);
    }
    if (stingerQueued) {
      stingerQueued = false;
      [0, 4, 7, 12, 16, 19, 24].forEach((iv, i) => {
        const g = tone({ time: t + i * 0.055, freq: midiToHz(root + 24 + iv), dur: 0.1, type: 'square', gain: 0.07 });
        g.connect(nodes.echoIn);
      });
      crash(t + 0.38, 0.18);
    }

    const currentSynthId = synthId();
    if (currentSynthId === 'synthwave' || currentSynthId === 'retrowave' || currentSynthId === 'cyberpunk') {
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) snare(t, 0.3, 0.22);
      if (isFill) snare(t, 0.18 + (s - 12) * 0.04, 0.1);
      if (s % 4 === 2) hat(t, 0.08);
      else if (pattern.ghostHats[s]) hat(t, 0.03);
      if (s % 2 === 0) {
        const oct = pattern.bassOct[s] ? 12 : 0;
        tone({ time: t, freq: midiToHz(root + oct), dur: sixteenth * 1.6, type: 'sawtooth', gain: 0.11, release: 0.04 });
      }
      const note = root + 24 + tones[pattern.arpOrder[s] % tones.length] + (pattern.arpOrder[s] >= tones.length ? 12 : 0);
      const arp = tone({ time: t, freq: midiToHz(note), dur: sixteenth * 0.8, type: 'square', gain: 0.035, release: 0.05 });
      arp.connect(nodes.echoIn);
      if (s === 0) {
        tones.forEach((iv, i) => {
          tone({ time: t, freq: midiToHz(root + 12 + iv), dur: sixteenth * 15, type: 'sawtooth', gain: 0.022, attack: 0.4, release: 0.6, detune: i % 2 ? 9 : -9 });
        });
      }
    } else if (currentSynthId === 'lofi') {
      if (s === 0 || s === 7 || s === 10) kick(t, 0.65);
      if (s === 4 || s === 12) snare(t, 0.16, 0.14);
      if (isFill) snare(t, 0.08, 0.06);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.04 : 0.025, 0.03);
      if (s === 0 || s === 10) {
        tone({ time: t, freq: midiToHz(root), dur: sixteenth * 5, type: 'triangle', gain: 0.22, attack: 0.01, release: 0.12 });
      }
      if (pattern.keysHits[s]) {
        tones.forEach((iv, i) => {
          tone({ time: t + i * 0.012, freq: midiToHz(root + 24 + iv), dur: sixteenth * 6, type: 'sine', gain: 0.045, attack: 0.008, release: 0.5 });
          tone({ time: t + i * 0.012, freq: midiToHz(root + 36 + iv), dur: sixteenth * 2, type: 'triangle', gain: 0.008, release: 0.3 });
        });
      }
      if (Math.random() < 0.18) noise({ time: t, dur: 0.012, gain: 0.025, type: 'highpass', freq: 3000 }); // vinyl crackle
    } else if (currentSynthId === 'chiptune') {
      if (s === 0 || s === 8 || s === 10) kick(t, 0.75);
      if (s === 4 || s === 12) noise({ time: t, dur: 0.09, gain: 0.22, type: 'highpass', freq: 2500 });
      if (isFill) noise({ time: t, dur: 0.05, gain: 0.16, type: 'highpass', freq: 2500 });
      if (s % 2 === 1) hat(t, 0.04, 0.02);
      if (s % 2 === 0) {
        const oct = s % 4 === 2 ? 12 : 0;
        tone({ time: t, freq: midiToHz(root + oct), dur: sixteenth * 1.4, type: 'triangle', gain: 0.24, release: 0.02 });
      }
      const note = root + 24 + tones[s % tones.length] + (Math.floor(s / 4) % 2 ? 12 : 0);
      tone({ time: t, freq: midiToHz(note), dur: sixteenth * 0.7, type: 'square', gain: 0.04, release: 0.02 });
      if (pattern.melody[s] >= 0) {
        tone({ time: t, freq: midiToHz(root + 36 + tones[pattern.melody[s] % tones.length]), dur: sixteenth * 1.8, type: 'square', gain: 0.03, release: 0.03 });
      }
    } else if (currentSynthId === 'phonk') {
      // Meme Phonk: 808 slides + metallic 808 cowbell riff
      if (s === 0 || s === 6 || s === 10) kick(t, 1.0);
      if (s === 4 || s === 12) snare(t, 0.34, 0.14);
      if (s % 2 === 1 || (isFill && s >= 12)) hat(t, 0.06, 0.03);
      if (s === 0 || s === 6 || s === 10 || s === 14) {
        tone({
          time: t,
          freq: midiToHz(root + (s === 14 ? 12 : 0)),
          dur: sixteenth * 3,
          type: 'sine',
          gain: 0.34,
          slideTo: midiToHz(root - 5),
          release: 0.08
        });
      }
      if (s === 0 || s === 3 || s === 6 || s === 8 || s === 10 || s === 14) {
        const cowTone = midiToHz(root + 36 + tones[pattern.arpOrder[s] % tones.length]);
        tone({ time: t, freq: cowTone, dur: sixteenth * 0.9, type: 'square', gain: 0.055, release: 0.04 });
        tone({ time: t, freq: cowTone * 1.48, dur: sixteenth * 0.7, type: 'square', gain: 0.035, release: 0.03 });
      }
    } else if (currentSynthId === 'jungle') {
      // Fast 168 BPM Breakbeat Jungle / Drum & Bass
      if (s === 0 || s === 10) kick(t, 0.85);
      if (s === 4 || s === 12) snare(t, 0.3, 0.12);
      if (s === 7 || s === 9 || (isFill && s >= 12)) snare(t, 0.16, 0.07);
      hat(t, s % 2 === 0 ? 0.07 : 0.035, 0.025);
      if (s % 4 === 0) {
        tone({
          time: t,
          freq: midiToHz(root),
          dur: sixteenth * 3.5,
          type: 'sawtooth',
          gain: 0.13,
          detune: 11,
          release: 0.06
        });
      }
      if (s === 0) {
        tones.forEach((iv, i) => {
          tone({
            time: t,
            freq: midiToHz(root + 24 + iv),
            dur: sixteenth * 14,
            type: 'triangle',
            gain: 0.024,
            attack: 0.25,
            release: 0.5,
            detune: i % 2 ? 8 : -8
          });
        });
      }
    } else if (currentSynthId === 'casinojazz') {
      // Velvet Casino Lounge Jazz (swing brush hats, walking bass, Rhodes chords)
      if (s === 0 || s === 8) kick(t, 0.52);
      if (s === 4 || s === 12) noise({ time: t, dur: 0.11, gain: 0.09, type: 'bandpass', freq: 2600, q: 1.2 });
      if (s % 2 === 0 || s % 4 === 3) hat(t, 0.045, 0.05);
      if (s % 4 === 0) {
        const walk = tones[Math.floor(s / 4) % tones.length];
        tone({ time: t, freq: midiToHz(root + walk), dur: sixteenth * 3.4, type: 'triangle', gain: 0.23, attack: 0.01, release: 0.1 });
      }
      if (s === 0 || s === 6 || isFill) {
        tones.forEach((iv, i) => {
          tone({ time: t + i * 0.014, freq: midiToHz(root + 24 + iv), dur: sixteenth * 5, type: 'sine', gain: 0.042, attack: 0.012, release: 0.35 });
        });
      }
      if (pattern.melody[s] >= 0) {
        const m = tone({ time: t, freq: midiToHz(root + 36 + tones[pattern.melody[s] % tones.length]), dur: sixteenth * 2.5, type: 'triangle', gain: 0.036, attack: 0.02, release: 0.25 });
        m.connect(nodes.echoIn);
      }
    } else if (currentSynthId === 'western') {
      // Spaghetti Western (gallop snare/rim, twang guitar, outlaw whistle)
      if (s === 0 || s === 6 || s === 8 || s === 14) kick(t, 0.68);
      if (s === 2 || s === 4 || s === 10 || s === 12) snare(t, 0.18, 0.08);
      if (s % 2 === 0) {
        tone({ time: t, freq: midiToHz(root + (s % 4 === 2 ? 7 : 0)), dur: sixteenth * 1.4, type: 'triangle', gain: 0.2, release: 0.05 });
      }
      if (s === 0 || s === 8) {
        tones.forEach((iv, i) => {
          const strum = tone({ time: t + i * 0.025, freq: midiToHz(root + 24 + iv), dur: sixteenth * 3.5, type: 'sawtooth', gain: 0.024, attack: 0.005, release: 0.18 });
          strum.connect(nodes.echoIn);
        });
      }
      if (s % 4 === 0 && pattern.melody[s] >= 0) {
        const wh = tone({ time: t, freq: midiToHz(root + 36 + tones[pattern.melody[s] % tones.length]), dur: sixteenth * 3.2, type: 'sine', gain: 0.05, attack: 0.06, release: 0.22 });
        wh.connect(nodes.echoIn);
      }
    } else if (currentSynthId === 'yachtrock') {
      // Yacht Rock Sunset (smooth electric piano + marina bassline)
      if (s === 0 || s === 8) kick(t, 0.72);
      if (s === 4 || s === 12) snare(t, 0.22, 0.14);
      if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.06 : 0.03, 0.035);
      if (s === 0 || s === 6 || s === 8 || s === 14) {
        tone({ time: t, freq: midiToHz(root + (s === 14 ? 7 : 0)), dur: sixteenth * 2.2, type: 'triangle', gain: 0.22, release: 0.08 });
      }
      if (pattern.keysHits[s] || s === 0) {
        tones.forEach((iv, i) => {
          const ep = tone({ time: t + i * 0.01, freq: midiToHz(root + 24 + iv), dur: sixteenth * 5, type: 'sine', gain: 0.04, attack: 0.01, release: 0.32 });
          ep.connect(nodes.echoIn);
        });
      }
    } else if (currentSynthId === 'italodisco') {
      // Italo Disco '84 (driving octave bass, sparkly arps, laser Simmons fills)
      if (s % 4 === 0) kick(t, 0.92);
      if (s === 4 || s === 12) snare(t, 0.28, 0.2);
      if (s % 4 === 2) hat(t, 0.085, 0.05);
      const oct = s % 2 === 1 ? 12 : 0;
      tone({ time: t, freq: midiToHz(root + oct), dur: sixteenth * 0.85, type: 'sawtooth', gain: 0.12, release: 0.03 });
      const arpNote = root + 24 + tones[(s + pattern.arpOrder[s]) % tones.length];
      const arp = tone({ time: t, freq: midiToHz(arpNote), dur: sixteenth * 0.75, type: 'square', gain: 0.035, release: 0.04 });
      arp.connect(nodes.echoIn);
      if (isFill && s >= 12) {
        tone({ time: t, freq: 520 - (s - 12) * 85, slideTo: 120, dur: sixteenth * 0.9, type: 'sine', gain: 0.14 });
      }
    } else if (currentSynthId === 'spookysynth') {
      // Seasonal Oct: Spooky organ arps & eerie theremin shimmer
      if (s % 4 === 0) kick(t, 0.8);
      if (s === 4 || s === 12) snare(t, 0.24, 0.25);
      if (s % 2 === 0) hat(t, 0.04, 0.03);
      if (s % 2 === 0) {
        tone({ time: t, freq: midiToHz(root), dur: sixteenth * 1.6, type: 'sawtooth', gain: 0.11, release: 0.04 });
      }
      const org = tone({ time: t, freq: midiToHz(root + 24 + tones[s % tones.length]), dur: sixteenth * 0.9, type: 'square', gain: 0.038, detune: s % 2 ? 12 : -12, release: 0.06 });
      org.connect(nodes.echoIn);
    } else if (currentSynthId === 'jinglesynth') {
      // Seasonal Dec: Crisp sleigh-bell shaker + bright holiday chimes
      if (s % 4 === 0) kick(t, 0.82);
      if (s === 4 || s === 12) snare(t, 0.22, 0.16);
      if (s % 2 === 1) hat(t, 0.075, 0.06);
      if (s % 2 === 0) {
        tone({ time: t, freq: midiToHz(root + (s % 4 === 2 ? 12 : 0)), dur: sixteenth * 1.4, type: 'triangle', gain: 0.2, release: 0.04 });
      }
      const bell = tone({ time: t, freq: midiToHz(root + 36 + tones[s % tones.length]), dur: sixteenth * 1.1, type: 'sine', gain: 0.055, release: 0.16 });
      bell.connect(nodes.echoIn);
    } else {
      // vaporwave elevator / retrowave / cyberpunk ambient pad fallback
      if (s === 0 || s === 8) kick(t, 0.55);
      if (s === 4 || s === 12) snare(t, 0.14, 0.45);
      if (isFill) snare(t, 0.06, 0.2);
      if (s % 4 === 2) hat(t, 0.02, 0.05);
      if (s === 0) {
        tone({ time: t, freq: midiToHz(root), dur: sixteenth * 14, type: 'sine', gain: 0.26, attack: 0.03, release: 0.4 });
        tones.forEach((iv, i) => {
          tone({ time: t, freq: midiToHz(root + 12 + iv), dur: sixteenth * 15, type: 'sawtooth', gain: 0.018, attack: 0.6, release: 0.9, detune: i % 2 ? 14 : -14 });
        });
      }
      if (s % 4 === 0 && pattern.melody[s] >= 0) {
        const m = tone({ time: t, freq: midiToHz(root + 24 + tones[pattern.melody[s] % tones.length]), dur: sixteenth * 3, type: 'sine', gain: 0.07, attack: 0.01, release: 0.6 });
        m.connect(nodes.echoIn);
      }
    }
  }

  function tick() {
    if (!ctx || !playing || paused) return;
    if (ctx.state !== 'running') {
      const nowMs = Date.now();
      if (nowMs - lastResumeTryTs > 600) {
        lastResumeTryTs = nowMs;
        ctx.resume().catch(() => {});
      }
      return;
    }
    const sixteenth = 60 / station().bpm / 4;
    // If the tab stalled, jump forward instead of bursting a backlog of notes
    if (nextStepTime < ctx.currentTime - 0.5) nextStepTime = ctx.currentTime + 0.05;
    while (nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
      scheduleStep(step, nextStepTime);
      nextStepTime += sixteenth;
      step += 1;
    }
  }

  function startScheduler() {
    stopScheduler();
    nextStepTime = ctx.currentTime + 0.06;
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  function stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function announceTrack() {
    const spec = getActiveSpec();
    const num = String((trackIdx % spec.trackCount) + 1).padStart(2, '0');
    const label = `Track ${num}: ${spec.track.name}`;
    updateMediaSessionMetadata(spec.track.name);
    if (onTrack) {
      onTrack(label, {
        stationId: spec.sourceStationId,
        trackIndex: spec.sourceTrackIndex,
        name: spec.track.name
      });
    }
  }

  function loadTrack() {
    step = 0;
    fillBar = -1;
    buildPattern();
    if (nodes) setFilter(lastCombo >= 3 ? 12000 : station().filterBase, 0.3);
    announceTrack();
  }

  function crossfadeTo(applyChange) {
    if (!playing || !nodes) {
      applyChange();
      loadTrack();
      return;
    }
    clearLater();
    isCrossfading = true;
    fadeMaster(0, 0.3);
    later(() => {
      isCrossfading = false;
      applyChange();
      loadTrack();
      if (!paused) {
        startScheduler();
        fadeMaster(1, 0.6);
      }
    }, 330);
  }

  function setHtmlPlaying(on) {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('tm-radio-on', on);
    if (!on) document.documentElement.style.setProperty('--beat', '0');
  }

  /* ---------- Public engine API ---------- */
  const api = {
    play(id, fadeInSec = 1.2, startTrackIdx) {
      if (STATIONS[id] || id === 'mixtape') stationId = id;
      if (typeof startTrackIdx === 'number' && Number.isFinite(startTrackIdx)) {
        trackIdx = Math.max(0, Math.floor(startTrackIdx));
      }
      if (!ensureGraph()) return;
      clearLater();
      isCrossfading = false;
      playing = true;
      paused = false;
      keyShift = 0;
      loadTrack();
      startScheduler();
      startMediaStreamElement();
      bindMediaSessionHandlers(api);
      setMediaSessionPlaybackState('playing');
      fadeMaster(1, fadeInSec);
      setHtmlPlaying(true);
    },
    stop() {
      playing = false;
      paused = false;
      isCrossfading = false;
      fadeMaster(0, 0.4);
      stopScheduler();
      clearLater();
      pauseMediaStreamElement();
      setMediaSessionPlaybackState('none');
      setHtmlPlaying(false);
    },
    pause() {
      if (!playing || paused) return;
      paused = true;
      isCrossfading = false;
      fadeMaster(0, 0.15);
      stopScheduler();
      pauseMediaStreamElement();
      setMediaSessionPlaybackState('paused');
      setHtmlPlaying(false);
    },
    resume() {
      if (!playing || !paused) return;
      paused = false;
      isCrossfading = false;
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      startScheduler();
      startMediaStreamElement();
      setMediaSessionPlaybackState('playing');
      fadeMaster(1, 0.8);
      setHtmlPlaying(true);
    },
    ensureRunning() {
      if (!playing) return;
      if (paused) {
        api.resume();
        return;
      }
      if (!ensureGraph()) return;
      if (ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
      }
      if (usingMediaStreamOut && mediaAudioEl && mediaAudioEl.paused) {
        startMediaStreamElement();
      }
      if (!timer) {
        startScheduler();
      }
      if (!isCrossfading && nodes) {
        fadeMaster(1, 0.25);
      }
      setMediaSessionPlaybackState('playing');
      setHtmlPlaying(true);
    },
    setStation(id, nextIdx) {
      if (!(STATIONS[id] || id === 'mixtape') || (id === stationId && nextIdx === undefined)) return;
      crossfadeTo(() => {
        stationId = id;
        trackIdx = typeof nextIdx === 'number' ? Math.max(0, Math.floor(nextIdx) || 0) : 0;
        keyShift = 0;
      });
    },
    nextTrack() {
      crossfadeTo(() => {
        const count = Math.max(1, getActiveSpec().trackCount);
        trackIdx = (trackIdx + 1) % count;
        keyShift = 0;
      });
    },
    prevTrack() {
      crossfadeTo(() => {
        const count = Math.max(1, getActiveSpec().trackCount);
        trackIdx = (trackIdx - 1 + count) % count;
        keyShift = 0;
      });
    },
    setMixtapeTracks(list) {
      mixtapeItems = Array.isArray(list)
        ? list.filter((it) => it && STATIONS[it.stationId] && Number.isFinite(Number(it.trackIndex)))
        : [];
      if (playing && stationId === 'mixtape') {
        trackIdx = 0;
        loadTrack();
      }
    },
    setVolume(v) {
      volume = v;
      applyLevels();
    },
    setMuted(m) {
      muted = m;
      applyLevels(0.1);
    },
    setDucked(d) {
      ducked = d;
      applyLevels(0.3);
    },
    event(type, payload) {
      if (!playing || !nodes) return;
      if (type === 'combo') {
        const c = Math.max(1, Number(payload) || 1);
        const bar = Math.floor(step / 16);
        if (c > lastCombo) {
          if (c >= 5) dropQueued = true;
          else if (c >= 3) riserQueued = true;
          else fillBar = bar;
        } else if (c < lastCombo && c < 3) {
          setFilter(station().filterBase, 2);
        }
        lastCombo = c;
      } else if (type === 'publish') {
        keyShift = (keyShift + 2) % 8;
        stingerQueued = true;
        buildPattern();
      }
    },
    isMediaStreamActive() {
      return usingMediaStreamOut;
    }
  };
  return api;
}
