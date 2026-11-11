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
      { name: 'Chad Turbo Sunset', root: 40, prog: [[0, 'min'], [3, 'maj'], [10, 'maj'], [5, 'min']], seed: 41 }
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
      { name: 'Cozy Cat Vibes', root: 39, prog: [[0, 'maj7'], [5, 'maj7'], [4, 'min7'], [9, 'min7']], seed: 83 }
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
      { name: 'Pixel Frog Quest', root: 35, prog: [[0, 'min'], [8, 'maj'], [10, 'maj'], [7, 'maj']], seed: 127 }
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
      { name: 'Floral Shoppe Doge', root: 38, prog: [[0, 'min7'], [5, 'min7'], [10, 'maj7'], [8, 'maj7']], seed: 163 }
    ]
  }
};

const LOOKAHEAD_SEC = 0.14;
const TICK_MS = 30;

export function createMusicEngine({ onTrack } = {}) {
  let ctx = null;
  let nodes = null;
  let noiseBuffer = null;

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
  const pendingTimeouts = new Set();

  const station = () => STATIONS[stationId] || STATIONS.synthwave;
  const track = () => station().tracks[trackIdx % station().tracks.length];

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

  /* ---------- Audio graph ---------- */
  function ensureGraph() {
    if (!ctx) {
      sfx.unlockIosAudio();
      ctx = sfx.ctx;
    }
    if (!ctx) return false;
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
    master.connect(ctx.destination);

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

    if (stationId === 'synthwave') {
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
    } else if (stationId === 'lofi') {
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
    } else if (stationId === 'chiptune') {
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
    } else {
      // vaporwave elevator
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
    const sixteenth = 60 / station().bpm / 4;
    // If the tab stalled, jump forward instead of bursting a backlog of notes
    if (nextStepTime < ctx.currentTime - 0.25) nextStepTime = ctx.currentTime + 0.05;
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
    const num = String((trackIdx % station().tracks.length) + 1).padStart(2, '0');
    if (onTrack) onTrack(`Track ${num}: ${track().name}`);
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
    fadeMaster(0, 0.3);
    later(() => {
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
  return {
    play(id, fadeInSec = 1.2) {
      if (STATIONS[id]) stationId = id;
      if (!ensureGraph()) return;
      clearLater();
      playing = true;
      paused = false;
      keyShift = 0;
      loadTrack();
      startScheduler();
      fadeMaster(1, fadeInSec);
      setHtmlPlaying(true);
    },
    stop() {
      playing = false;
      paused = false;
      fadeMaster(0, 0.4);
      stopScheduler();
      clearLater();
      setHtmlPlaying(false);
    },
    pause() {
      if (!playing || paused) return;
      paused = true;
      fadeMaster(0, 0.15);
      stopScheduler();
      setHtmlPlaying(false);
    },
    resume() {
      if (!playing || !paused) return;
      paused = false;
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      startScheduler();
      fadeMaster(1, 0.8);
      setHtmlPlaying(true);
    },
    setStation(id) {
      if (!STATIONS[id] || id === stationId) return;
      crossfadeTo(() => {
        stationId = id;
        trackIdx = 0;
        keyShift = 0;
      });
    },
    nextTrack() {
      crossfadeTo(() => {
        trackIdx = (trackIdx + 1) % station().tracks.length;
        keyShift = 0;
      });
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
    }
  };
}
