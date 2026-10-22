// ==========================================
// CRAZY FUNNY WEB AUDIO SYNTHESIZER & iOS SAFARI UNLOCK ENGINE
// ==========================================

export const SOUND_PACKS = [
  { id: 'goofy', label: '🤡 Goofy Cartoon', short: '🤡 Goofy' },
  { id: 'brainrot', label: '💀 Vine & Brainrot', short: '💀 Brainrot' },
  { id: 'mlg', label: '📯 MLG Airhorn', short: '📯 MLG' },
  { id: 'arcade', label: '🕹️ Cyber-Arcade', short: '🕹️ Arcade' }
];

export const SOUNDBOARD_PADS = [
  { id: 'vineboom', emoji: '💀', label: 'Vine Boom', color: '#ef4444' },
  { id: 'airhorn', emoji: '📯', label: 'MLG Horn', color: '#f97316' },
  { id: 'clown', emoji: '🤡', label: 'Clown Honk', color: '#ec4899' },
  { id: 'boing', emoji: '🌀', label: 'Cartoon Boing', color: '#00f3ff' },
  { id: 'whoopee', emoji: '💨', label: 'Reverb Fart', color: '#a3e635' },
  { id: 'trombone', emoji: '🎺', label: 'Sad Trombone', color: '#facc15' },
  { id: 'anime', emoji: '⚡', label: 'NANI?! Impact', color: '#a855f7' },
  { id: 'jackpot', emoji: '🪙', label: 'Coin Jackpot', color: '#22c55e' },
  { id: 'siren', emoji: '🚔', label: 'Dank Police', color: '#3b82f6' },
  { id: 'duck', emoji: '🦆', label: 'Duck Army', color: '#eab308' },
  { id: 'violin', emoji: '🎻', label: 'Tiny Violin', color: '#f43f5e' },
  { id: 'gong', emoji: '💥', label: 'Damage Gong', color: '#d946ef' },
  { id: 'metalpipe', emoji: '🔔', label: 'Metal Pipe', color: '#38bdf8' },
  { id: 'cartoonrun', emoji: '🏃', label: 'Scooby Run', color: '#fb923c' },
  { id: 'alienbeam', emoji: '👽', label: 'UFO Brainray', color: '#4ade80' },
  { id: 'xpcrash', emoji: '💻', label: 'Brain Crash', color: '#60a5fa' }
];

// Tiny 44.1kHz silent WAV data URI used to switch iOS Safari from 'ambient' (muted by silent switch)
// into 'playback' media channel on the very first touch/click gesture.
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.unlocked = false;
    this.iosAudioEl = null;
    this.pack =
      (typeof window !== 'undefined' && localStorage.getItem('tm_sound_pack')) || 'goofy';
    this.noiseBuffer = null;

    if (typeof window !== 'undefined') {
      this._bindGlobalUnlockListeners();
    }
  }

  setPack(packId) {
    this.pack = packId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tm_sound_pack', packId);
    }
  }

  _configureIosAudioSession() {
    try {
      // iOS 16.4+ / 17+ WebKit AudioSession API: forces media playback even when iPhone physical mute switch is ON
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch {
      // Ignore if unsupported
    }
  }

  _bindGlobalUnlockListeners() {
    const unlockHandler = () => {
      this.unlockIosAudio();
    };

    const events = ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { passive: true, capture: true });
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.ctx) {
          this._configureIosAudioSession();
          if (this.ctx.state !== 'running') {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  unlockIosAudio() {
    try {
      this._configureIosAudioSession();

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      }

      if (this.ctx) {
        if (this.ctx.state !== 'running') {
          this.ctx.resume().catch(() => {});
        }

        // Play a 1-sample silent buffer to unlock iOS WebKit AudioContext inside the user gesture
        if (!this.unlocked) {
          const buffer = this.ctx.createBuffer(1, 1, 22050);
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx.destination);
          if (source.start) {
            source.start(0);
          } else if (source.noteOn) {
            source.noteOn(0);
          }
          if (this.ctx.state === 'running') {
            this.unlocked = true;
          }
        }
      }

      // Play tiny HTML5 <audio> WAV carrier once to force iOS out of ringer-switch mute mode
      if (!this.iosAudioEl && typeof Audio !== 'undefined') {
        this.iosAudioEl = new Audio(SILENT_WAV_DATA_URI);
        this.iosAudioEl.setAttribute('playsinline', 'true');
        this.iosAudioEl.volume = 0.01;
        const playPromise = this.iosAudioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      }
    } catch {
      // Ignore unlock errors before interaction
    }
  }

  init() {
    if (typeof window === 'undefined') return;
    this.unlockIosAudio();
  }

  _getNoiseBuffer() {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // ==========================================
  // CRAZY FUNNY PROCEDURAL MEME SOUND EFFECTS
  // ==========================================

  /**
   * 💀 VINE BOOM / 808 BASS DROP
   */
  playVineBoom() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Sub-bass 808 drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.65);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);

      // Gritty harmonic punch transient
      const crunch = this.ctx.createOscillator();
      const crunchGain = this.ctx.createGain();
      crunch.type = 'triangle';
      crunch.frequency.setValueAtTime(220, now);
      crunch.frequency.exponentialRampToValueAtTime(55, now + 0.12);
      crunchGain.gain.setValueAtTime(0.24, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      crunch.connect(crunchGain);
      crunchGain.connect(this.ctx.destination);
      crunch.start(now);
      crunch.stop(now + 0.24);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 📯 MLG TRIPLE AIRHORN ("BWAH-BWAH-BWAAAAAH!")
   */
  playAirhorn() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const hits = [
        { start: 0, dur: 0.11 },
        { start: 0.13, dur: 0.11 },
        { start: 0.26, dur: 0.42 }
      ];
      const hornFreqs = [440, 446.5, 659.25, 880];

      hits.forEach((hit) => {
        const start = this.ctx.currentTime + hit.start;
        hornFreqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f * 0.92, start);
          osc.frequency.exponentialRampToValueAtTime(f, start + 0.03);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1150, start);
          filter.Q.setValueAtTime(1.6, start);

          const peak = idx < 2 ? 0.11 : 0.06;
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(peak, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, start + hit.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + hit.dur + 0.01);
        });
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🤡 GOOFY CLOWN HORN ("HONK-HOOONK!")
   */
  playClownHonk() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [
        { f1: 370, f2: 466.16, offset: 0, dur: 0.14 },
        { f1: 311.13, f2: 392.0, offset: 0.15, dur: 0.24 }
      ];

      notes.forEach((n) => {
        const start = this.ctx.currentTime + n.offset;
        [n.f1, n.f2].forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq * 0.88, start);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.05, start + n.dur * 0.5);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.95, start + n.dur);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(920, start);
          filter.Q.setValueAtTime(3.2, start);

          gain.gain.setValueAtTime(0.16, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + n.dur + 0.02);
        });
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🌀 CARTOON SPRING BOING ("BOIOIOING!")
   */
  playBoing(combo = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const base = 180 + Math.min(combo * 35, 220);

      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 2.8, now + 0.34);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(22, now);
      lfoGain.gain.setValueAtTime(95, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.36);
      osc.stop(now + 0.36);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 💨 WHOOPEE CUSHION / REVERB FART ("PRRRRRBTTT!")
   */
  playWhoopee() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const dur = 0.48;

      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.linearRampToValueAtTime(62, now + dur * 0.65);
      osc.frequency.linearRampToValueAtTime(46, now + dur);

      // Sputter flutter LFO
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(28, now);
      lfo.frequency.linearRampToValueAtTime(14, now + dur);
      lfoGain.gain.setValueAtTime(32, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(4.5, now);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur);
      osc.stop(now + dur);

      // Burst of filtered noise for air cushion realism
      const noiseBuf = this._getNoiseBuffer();
      if (noiseBuf) {
        const noise = this.ctx.createBufferSource();
        const nFilter = this.ctx.createBiquadFilter();
        const nGain = this.ctx.createGain();
        noise.buffer = noiseBuf;
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(300, now);
        nGain.gain.setValueAtTime(0.08, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + dur);
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎺 SAD TROMBONE ("WAH-WAH-WAH-WAAAAAH")
   */
  playSadTrombone() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const steps = [
        { freq: 293.66, start: 0, dur: 0.16 },
        { freq: 277.18, start: 0.17, dur: 0.16 },
        { freq: 261.63, start: 0.34, dur: 0.16 },
        { freq: 246.94, start: 0.51, dur: 0.44, vibrato: true }
      ];

      steps.forEach((s) => {
        const t = this.ctx.currentTime + s.start;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(s.freq, t);
        if (s.vibrato) {
          osc.frequency.linearRampToValueAtTime(s.freq * 0.91, t + s.dur);
          const vib = this.ctx.createOscillator();
          const vibGain = this.ctx.createGain();
          vib.frequency.setValueAtTime(7.5, t);
          vibGain.gain.setValueAtTime(8, t);
          vib.connect(vibGain);
          vibGain.connect(osc.frequency);
          vib.start(t);
          vib.stop(t + s.dur);
        }

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(850, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + s.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + s.dur + 0.02);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * ⚡ ANIME "NANI?!" DRAMATIC SHOCK IMPACT
   */
  playAnimeShock() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [220, 311.13, 440, 622.25, 880, 1244.5];

      freqs.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * 1.15, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, now + 0.35);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🪙 COIN JACKPOT SHOWER
   */
  playJackpot() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [987.77, 1318.51, 1174.66, 1567.98, 1318.51, 1975.53];
      notes.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎢 CARTOON SLIDE WHISTLE
   */
  playSlideWhistle(up = true) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(up ? 380 : 1280, now);
      osc.frequency.exponentialRampToValueAtTime(up ? 1420 : 320, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🚔 DANK POLICE SIREN ("WEE-WOO-WEE-WOO!")
   */
  playPoliceSiren() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.linearRampToValueAtTime(980, now + 0.16);
      osc.frequency.linearRampToValueAtTime(580, now + 0.32);
      osc.frequency.linearRampToValueAtTime(980, now + 0.48);
      osc.frequency.linearRampToValueAtTime(560, now + 0.62);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.64);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.66);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🦆 RUBBER DUCK ARMY ("QUACK-QUACK-QUAAAACK!")
   */
  playRubberDuck() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const quacks = [
        { offset: 0, pitch: 440, dur: 0.11 },
        { offset: 0.12, pitch: 520, dur: 0.11 },
        { offset: 0.24, pitch: 390, dur: 0.22 }
      ];
      quacks.forEach((q) => {
        const start = this.ctx.currentTime + q.offset;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(q.pitch * 1.15, start);
        osc.frequency.exponentialRampToValueAtTime(q.pitch * 0.78, start + q.dur);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1350, start);
        filter.frequency.exponentialRampToValueAtTime(750, start + q.dur);
        filter.Q.setValueAtTime(4.2, start);

        gain.gain.setValueAtTime(0.24, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + q.dur);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + q.dur + 0.02);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎻 WORLD'S SMALLEST VIOLIN ("SAD SQUEAKY TREMOLO")
   */
  playTinyViolin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [
        { f: 1174.66, start: 0, dur: 0.2 },
        { f: 1108.73, start: 0.2, dur: 0.2 },
        { f: 1046.5, start: 0.4, dur: 0.35 }
      ];
      notes.forEach((n) => {
        const t = this.ctx.currentTime + n.start;
        const osc = this.ctx.createOscillator();
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, t);

        vib.frequency.setValueAtTime(9.5, t);
        vibGain.gain.setValueAtTime(18, t);
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        vib.start(t);
        osc.start(t);
        vib.stop(t + n.dur);
        osc.stop(t + n.dur + 0.01);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 💥 EMOTIONAL DAMAGE DRAMATIC GONG
   */
  playDamageGong() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const partials = [110, 168.5, 241.2, 319.8, 452.1, 618.4];
      partials.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.96, now + 0.85);
        gain.gain.setValueAtTime(0.16 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🔔 FALLING METAL PIPE / TACO BELL CLANG ("KLANGGG-ringgg!")
   */
  playMetalPipe() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Inharmonic metallic pipe frequencies with secondary bounce clatter
      const bounces = [0, 0.14, 0.25];
      const pipeFreqs = [528, 796, 1188, 1642, 2380, 3120];
      bounces.forEach((offset, bIdx) => {
        const start = now + offset;
        const scale = bIdx === 0 ? 1 : bIdx === 1 ? 0.55 : 0.35;
        pipeFreqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = idx % 2 === 0 ? 'sine' : 'square';
          osc.frequency.setValueAtTime(f * (1 + bIdx * 0.015), start);
          const dur = (0.75 - idx * 0.08) * scale + 0.18;
          gain.gain.setValueAtTime((0.15 * scale) / (idx * 0.7 + 1), start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(start);
          osc.stop(start + dur + 0.02);
        });
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🏃 CARTOON SCOOBY SLIP-AND-RUN BONGOS + ZOOM WHISTLE
   */
  playCartoonRun() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const bongoHits = [240, 320, 240, 360, 260, 340, 240, 380, 280, 420];
      bongoHits.forEach((freq, idx) => {
        const start = this.ctx.currentTime + idx * 0.042;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.65, start + 0.038);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.042);
      });
      // Supersonic zip whistle at the end
      const zipStart = this.ctx.currentTime + 0.42;
      const zOsc = this.ctx.createOscillator();
      const zGain = this.ctx.createGain();
      zOsc.type = 'sine';
      zOsc.frequency.setValueAtTime(340, zipStart);
      zOsc.frequency.exponentialRampToValueAtTime(1950, zipStart + 0.18);
      zGain.gain.setValueAtTime(0.2, zipStart);
      zGain.gain.exponentialRampToValueAtTime(0.001, zipStart + 0.2);
      zOsc.connect(zGain);
      zGain.connect(this.ctx.destination);
      zOsc.start(zipStart);
      zOsc.stop(zipStart + 0.21);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 👽 GOOFY ALIEN UFO THEREMIN BRAIN-RAY ("WOO-EEE-OOO-EEE!")
   */
  playAlienBeam() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const dur = 0.62;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(520, now + dur);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(140, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + dur);
      osc.stop(now + dur + 0.01);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 💻 RETRO OS ERROR / BRAIN CRASH CHORD ("DUNNNN!")
   */
  playXpCrash() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [196.0, 293.66, 392.0, 466.16, 587.33];
      chord.forEach((f) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.47);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🫧 GRATIFYING BUBBLE WRAP POP (pitch climbs with consecutive pops!)
   */
  playBubblePop(step = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(10);
      const now = this.ctx.currentTime;
      const base = 360 + Math.min(step * 45, 720);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 2.1, now + 0.075);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🌈 8-BIT NYAN DISCO CHIPTUNE RIFF
   */
  playNyanRiff() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [659.25, 783.99, 1046.5, 987.77, 1046.5, 1174.66, 1318.51, 1567.98];
      notes.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.11, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.062);
      });
    } catch {
      // Ignore audio errors
    }
  }

  triggerHaptic(ms = 14) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }

  /**
   * Trigger a specific pad on the Crazy Meme Soundboard
   */
  playSoundboardPad(padId) {
    this.triggerHaptic(18);
    switch (padId) {
      case 'vineboom':
        this.playVineBoom();
        break;
      case 'airhorn':
        this.playAirhorn();
        break;
      case 'clown':
        this.playClownHonk();
        break;
      case 'boing':
        this.playBoing(3);
        break;
      case 'whoopee':
        this.playWhoopee();
        break;
      case 'trombone':
        this.playSadTrombone();
        break;
      case 'anime':
        this.playAnimeShock();
        break;
      case 'jackpot':
        this.playJackpot();
        break;
      case 'siren':
        this.playPoliceSiren();
        break;
      case 'duck':
        this.playRubberDuck();
        break;
      case 'violin':
        this.playTinyViolin();
        break;
      case 'gong':
        this.playDamageGong();
        break;
      case 'metalpipe':
        this.playMetalPipe();
        break;
      case 'cartoonrun':
        this.playCartoonRun();
        break;
      case 'alienbeam':
        this.playAlienBeam();
        break;
      case 'xpcrash':
        this.playXpCrash();
        break;
      default:
        this.playBoing(2);
    }
  }

  // ==========================================
  // CONTEXT-AWARE GAMEPLAY TRIGGERS (PACK-DRIVEN)
  // ==========================================

  playVote(isUp = true, combo = 1) {
    if (!this.enabled) return;
    if (isUp && combo >= 4) {
      this.playAirhorn();
      return;
    }

    if (this.pack === 'goofy') {
      if (isUp) {
        if (combo >= 2) this.playBoing(combo);
        else this.playSlideWhistle(true);
      } else {
        if (Math.random() > 0.45) this.playWhoopee();
        else this.playSadTrombone();
      }
      return;
    }

    if (this.pack === 'brainrot') {
      if (isUp) {
        this.playVineBoom();
      } else {
        this.playWhoopee();
      }
      return;
    }

    if (this.pack === 'mlg') {
      if (isUp) {
        this.playAirhorn();
      } else {
        this.playSadTrombone();
      }
      return;
    }

    // Classic Cyber-Arcade Pack
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (isUp) {
        const baseFreq = 320 + Math.min(combo * 65, 650);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = combo >= 3 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else {
        this.playSlideWhistle(false);
      }
    } catch {
      // Ignore audio errors
    }
  }

  playReaction(emoji = '🔥', combo = 1) {
    if (!this.enabled) return;
    if (emoji === '💀') {
      this.playVineBoom();
    } else if (emoji === '😂') {
      this.playClownHonk();
    } else if (emoji === '🗿') {
      this.playAnimeShock();
    } else if (emoji === '🔥') {
      if (combo >= 3) this.playAirhorn();
      else this.playBoing(combo);
    } else {
      this.playPop(combo);
    }
  }

  playPop(combo = 1) {
    if (!this.enabled) return;
    if (this.pack === 'goofy') {
      this.playBoing(combo);
      return;
    }
    if (this.pack === 'brainrot') {
      this.playVineBoom();
      return;
    }
    if (this.pack === 'mlg') {
      this.playClownHonk();
      return;
    }

    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      const freq = 480 + Math.min(combo * 45, 420);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + 0.09);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  playMutate() {
    if (!this.enabled) return;
    if (this.pack === 'goofy') {
      this.playClownHonk();
      setTimeout(() => this.playBoing(3), 140);
      return;
    }
    if (this.pack === 'brainrot') {
      this.playAnimeShock();
      return;
    }
    if (this.pack === 'mlg') {
      this.playAirhorn();
      return;
    }

    try {
      this.init();
      if (!this.ctx) return;
      const freqs = [330, 493.88, 659.25, 987.77, 1318.51];
      freqs.forEach((f, idx) => {
        const now = this.ctx.currentTime + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      });
    } catch {
      // Ignore audio errors
    }
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.playJackpot();
  }

  playToggle() {
    if (!this.enabled) return;
    if (this.pack === 'goofy') {
      this.playSlideWhistle(true);
      return;
    }
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore audio errors
    }
  }
}

export const sfx = new SoundEngine();
