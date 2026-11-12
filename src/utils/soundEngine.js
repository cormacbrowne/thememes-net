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
    this.volume = 0.85;
    this.hapticsEnabled = true;
    this.sfxGain = null;
    this.hasUserGesture = false;
    this.unlocked = false;
    this.speechUnlocked = false;
    this._speechPriming = false;
    this.iosAudioEl = null;
    this.speechTimer = null;
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

  setVolume(nextVol) {
    const clamped = Math.min(1, Math.max(0, Number(nextVol)));
    this.volume = Number.isFinite(clamped) ? clamped : 0.85;
    if (this.sfxGain && this.ctx) {
      try {
        this.sfxGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {
        this.sfxGain.gain.value = this.volume;
      }
    }
  }

  setHapticsEnabled(flag) {
    this.hapticsEnabled = Boolean(flag);
  }

  _getOutputNode() {
    if (!this.ctx) return null;
    if (!this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.volume;
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.sfxGain;
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
      this.hasUserGesture = true;
      this.unlockIosAudio();
    };

    const events = ['touchend', 'pointerup', 'click', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { passive: true, capture: true });
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.hasUserGesture && this.ctx) {
          this._configureIosAudioSession();
          if (this.ctx.state !== 'running') {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  unlockIosAudio(options = {}) {
    if (!this.hasUserGesture) return;
    const { primeSpeech = true } = options;
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

      // Prime iOS Safari Web Speech API on the first real tap so subsequent K.I.T.T. & HAL 9000
      // speechSynthesis calls have an active audio/speech session. Only mark speechUnlocked from
      // onstart/onend so failed primes automatically retry on the next gesture.
      if (
        primeSpeech &&
        !this.speechUnlocked &&
        !this._speechPriming &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance === 'function'
      ) {
        try {
          const synth = window.speechSynthesis;
          synth.getVoices();
          if (!synth.speaking && !synth.pending) {
            this._speechPriming = true;
            const silentUtter = new window.SpeechSynthesisUtterance(' ');
            silentUtter.volume = 0.01;
            silentUtter.rate = 2.0;
            silentUtter.onstart = () => {
              this.speechUnlocked = true;
              this._speechPriming = false;
            };
            silentUtter.onend = () => {
              this.speechUnlocked = true;
              this._speechPriming = false;
            };
            silentUtter.onerror = () => {
              this._speechPriming = false;
            };
            synth.speak(silentUtter);
          }
        } catch {
          this._speechPriming = false;
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
      gain.connect(this._getOutputNode());
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
      crunchGain.connect(this._getOutputNode());
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
          gain.connect(this._getOutputNode());
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
          gain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());

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
      gain.connect(this._getOutputNode());

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
        nGain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
          gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
      zGain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.062);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎱 LAS VEGAS RETRO PINBALL BUMPER BELL & SOLENOID THUMP
   */
  playPinballBumper(variant = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(16);
      const now = this.ctx.currentTime;
      const bellFreqs = [
        [1046.5, 1567.98],
        [1174.66, 1760.0],
        [1318.51, 1975.53],
        [1567.98, 2349.32]
      ];
      const pair = bellFreqs[variant % bellFreqs.length];

      // Mechanical solenoid thump
      const thump = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thump.type = 'triangle';
      thump.frequency.setValueAtTime(160, now);
      thump.frequency.exponentialRampToValueAtTime(48, now + 0.07);
      thumpGain.gain.setValueAtTime(0.28, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      thump.connect(thumpGain);
      thumpGain.connect(this._getOutputNode());
      thump.start(now);
      thump.stop(now + 0.08);

      // Retro Vegas EM bell chime
      pair.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.02);
        gain.gain.setValueAtTime(0.18, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22 + idx * 0.03);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(now + idx * 0.02);
        osc.stop(now + 0.26);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🕹️ PINBALL FLIPPER SOLENOID CLICK
   */
  playFlipperClick(isUp = true) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(8);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(isUp ? 220 : 140, now);
      osc.frequency.exponentialRampToValueAtTime(isUp ? 540 : 90, now + 0.035);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🚀 PINBALL PLUNGER SPRING LAUNCH
   */
  playPlungerLaunch() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(22);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🍬 CANDY CRUSH ESCALATING MATCH CHIME
   */
  playCandyMatch(cascade = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(12);
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      const baseIdx = Math.min(scale.length - 3, Math.max(0, cascade - 1));
      const notes = [scale[baseIdx], scale[baseIdx + 1], scale[baseIdx + 2]];

      notes.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 1.06, start + 0.14);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 💥 SPECIAL CANDY COLOR BOMB / ROW LASER BLAST
   */
  playSpecialBomb() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(30);
      this.playJackpot();
      setTimeout(() => this.playBoing(4), 90);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * ⚡ PINBALL & CRUSH POWER-UP COLLECT FANFARE
   */
  playPowerUpCollect() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(24);
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      notes.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 1.08, start + 0.14);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🚨 MULTIBALL MADNESS SIREN & FANFARE
   */
  playMultiballSiren() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(35);
      this.playPoliceSiren();
      setTimeout(() => this.playJackpot(), 180);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🌀 PINBALL HIGH-SPEED SPINNER TICK
   */
  playSpinnerTick(step = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const f = 880 + (step % 8) * 110;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.25, now + 0.025);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * ⚡ NEON LASER BEAM ZAP (Striped Candy & Plasma Ball Saver)
   */
  playLaserZap() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(20);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1680, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.22);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🍬 CANDY CRUSH MEME EDITION ESCALATING COMBO FANFARE
   */
  playCrushComboFanfare(tier = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (tier >= 5) {
        this.playAirhorn();
        setTimeout(() => this.playDamageGong(), 160);
      } else if (tier === 4) {
        this.playJackpot();
        setTimeout(() => this.playAnimeShock(), 140);
      } else if (tier === 3) {
        this.playPowerUpCollect();
        setTimeout(() => this.playVineBoom(), 110);
      } else if (tier === 2) {
        this.playCandyMatch(4);
        setTimeout(() => this.playBoing(3), 90);
      } else {
        this.playCandyMatch(2);
      }
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🕹️ LAS VEGAS SLOT MACHINE MECHANICAL LEVER PULL (RATCHET + SPRING)
   */
  playSlotLeverPull() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(25);
      const clicks = [260, 310, 370, 440, 520, 640];
      clicks.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.032;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 0.65, start + 0.025);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.028);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.03);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎰 LAS VEGAS SLOT DRUM MECHANICAL STOP THUD + CASINO CHIME
   */
  playSlotReelStop(reelIdx = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(18);
      const now = this.ctx.currentTime;

      // Low mechanical drum brake thud
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(150, now);
      thud.frequency.exponentialRampToValueAtTime(46, now + 0.08);
      thudGain.gain.setValueAtTime(0.32, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      thud.connect(thudGain);
      thudGain.connect(this._getOutputNode());
      thud.start(now);
      thud.stop(now + 0.095);

      // Rising casino bell ping per reel (1 -> 2 -> 3)
      const bellNotes = [659.25, 783.99, 1046.5];
      const f = bellNotes[reelIdx % bellNotes.length];
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(f, now + 0.015);
      bellGain.gain.setValueAtTime(0.2, now + 0.015);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      bell.connect(bellGain);
      bellGain.connect(this._getOutputNode());
      bell.start(now + 0.015);
      bell.stop(now + 0.2);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🧊 CANDY CRUSH FROSTED JELLY CRYSTAL SHATTER CHIME
   */
  playJellyShatter() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(15);
      const sparkles = [1318.51, 1567.98, 2093.0, 2637.02];
      sparkles.forEach((f, idx) => {
        const start = this.ctx.currentTime + idx * 0.028;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch {
      // Ignore audio errors
    }
  }

  triggerHaptic(ms = 14) {
    if (!this.hasUserGesture || !this.hapticsEnabled) return;
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

  _playComboRisingPop(combo = 1) {
    if (!this.enabled || !this.hasUserGesture) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const clamped = Math.max(1, Math.min(8, Number(combo) || 1));
      // Musical pentatonic/major pitch climb with combo multiplier
      const baseFreq = 380 * Math.pow(2, ((clamped - 1) * 2) / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.55, now + 0.085);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  playPublishStinger() {
    if (!this.enabled || !this.hasUserGesture) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic([14, 24, 20]);
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((f, idx) => {
        const start = now + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + (idx === notes.length - 1 ? 0.34 : 0.16));
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch {
      // Ignore audio errors
    }
  }

  playVote(isUp = true, combo = 1) {
    if (!this.enabled || !this.hasUserGesture) return;
    if (isUp) {
      this.triggerHaptic(10);
      // Always layer the pitch-rising combo pop so every upvote climbs cleanly
      this._playComboRisingPop(combo);
    }
    if (isUp && combo >= 4) {
      this.playAirhorn();
      return;
    }

    if (this.pack === 'goofy') {
      if (isUp) {
        if (combo >= 2) this.playBoing(combo);
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
        gain.connect(this._getOutputNode());

        osc.type = combo >= 3 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.15);
        gain.gain.setValueAtTime(0.14, now);
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
      gain.connect(this._getOutputNode());
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
        gain.connect(this._getOutputNode());
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
      gain.connect(this._getOutputNode());
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

  /**
   * 🪙 COIN-OP METALLIC CHINK (Inserting arcade token / placing slot bet)
   */
  playCoinInsert() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);
        gain.gain.setValueAtTime(0.16, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.14);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.15);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🔔 WALL STREET 80s STOCK EXCHANGE BELL (Trade executed / Bull Surge)
   */
  playStockBell(isBull = true) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = isBull ? [880, 1174.66, 1760] : [523.25, 392, 311.13];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isBull ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(f, now + idx * 0.045);
        gain.gain.setValueAtTime(0.13, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.22);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.24);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🃏 CASINO CARD DEAL / SLIDE SNAP (Neon 21's Blackjack)
   */
  playCardDeal() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(10);
      const now = this.ctx.currentTime;
      const noise = this._getNoiseBuffer();
      if (noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.055);
        filter.Q.setValueAtTime(2.2, now);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this._getOutputNode());
        src.start(now);
        src.stop(now + 0.07);
      }
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.045);
      oscGain.gain.setValueAtTime(0.11, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(oscGain);
      oscGain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🃏 HOLOGRAPHIC CARD FLIP REVEAL
   */
  playCardFlip() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(14);
      const now = this.ctx.currentTime;
      [660, 990, 1320].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.028);
        gain.gain.setValueAtTime(0.12, now + idx * 0.028);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.028 + 0.09);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(now + idx * 0.028);
        osc.stop(now + idx * 0.028 + 0.1);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🪙 CERAMIC CASINO CHIP STACK CLINK (Roulette & 21's)
   */
  playChipStack() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(12);
      const now = this.ctx.currentTime;
      [1480, 2240].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.025);
        gain.gain.setValueAtTime(0.15, now + idx * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.075);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(now + idx * 0.025);
        osc.stop(now + idx * 0.025 + 0.08);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎡 ROULETTE WHEEL LAUNCH TURBINE WHOOSH
   */
  playRouletteSpin() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(22);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.28);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.45);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * ⚪ ROULETTE POCKET FRET / DEFLECTOR BALL TICK
   */
  playRouletteBallTick(speedRatio = 0.5) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 680 + Math.min(1, Math.max(0, speedRatio)) * 520;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.028);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * ⚡ NEON LIGHTNING MULTIPLIER STRIKE (Lightning Roulette & Pinball Fever)
   */
  playLightningStrike() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(28);
      const now = this.ctx.currentTime;
      const notes = [1567.98, 1174.66, 2093.0, 880, 2637.02];
      notes.forEach((f, idx) => {
        const start = now + idx * 0.032;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 0.55, start + 0.045);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.055);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎱 PINBALL CABINET NUDGE THUMP
   */
  playPinballNudge() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(24);
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.11);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🤖 80s CYBER-ORACLE AI ASSISTANT SYNTH CHIME
   */
  playAiAssistantChime() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66, 1760].forEach((f, idx) => {
        const start = now + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.11, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🚗 K.I.T.T. KNIGHT RIDER SUBTLE MICRO-SCANNER PRE-SPEECH CUE (90ms)
   */
  playKittScanner() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(12);
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this._getOutputNode());

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🔴 HAL 9000 DISCOVERY ONE SUBTLE CONSOLE PRE-SPEECH PING (85ms)
   */
  playHalBeep() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(10);
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🪿 ROGUE CYBER-GOOSE HONK ("HONK.EXE")
   */
  playGooseHonk() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic([25, 30, 35]);
      const now = this.ctx.currentTime;

      [0, 0.14].forEach((offset, idx) => {
        const start = now + offset;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        const base = idx === 0 ? 430 : 495;
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(base, start);
        osc1.frequency.exponentialRampToValueAtTime(base * 1.24, start + 0.045);
        osc1.frequency.exponentialRampToValueAtTime(base * 0.88, start + 0.11);

        osc2.frequency.setValueAtTime(base * 1.5, start);
        osc2.frequency.exponentialRampToValueAtTime(base * 1.32, start + 0.11);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1150, start);
        filter.Q.setValueAtTime(4.2, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.115);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this._getOutputNode());

        osc1.start(start);
        osc2.start(start);
        osc1.stop(start + 0.12);
        osc2.stop(start + 0.12);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🗣️ K.I.T.T. & HAL 9000 PROCEDURAL WEB-AUDIO FORMANT VOICE MODULATOR
   * Guarantees audible sci-fi vocal formant synthesis on iPhone/iPad even when
   * the iOS physical mute switch is ON or iOS Safari SpeechSynthesis is throttled.
   */
  playAiVocalFormants(text = '', personaId = 'kitt') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const clean = String(text || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
      const words = clean ? clean.split(/\s+/).slice(0, 26) : ['affirmative'];
      const isKitt = personaId === 'kitt';
      const now = this.ctx.currentTime + 0.04;

      // Vowel formant frequency pairs [F1, F2]
      const formants = [
        [720, 1150], // 'ah'
        [520, 1850], // 'eh'
        [310, 2200], // 'ee'
        [460, 920],  // 'oh'
        [340, 880]   // 'oo'
      ];

      let cursor = now;
      words.forEach((word, wIdx) => {
        const syllables = Math.max(1, Math.min(3, Math.ceil(word.length / 3)));
        for (let s = 0; s < syllables; s++) {
          const sylDur = isKitt ? 0.068 : 0.088;
          const gap = isKitt ? 0.018 : 0.028;
          const charCode = word.charCodeAt(Math.min(word.length - 1, s * 2)) || 65;
          const [f1, f2] = formants[(charCode + wIdx + s) % formants.length];

          // Fundamental vocal cord pitch: K.I.T.T. is crisp transatlantic baritone (~132Hz with inflection),
          // HAL 9000 is calm, low, flat discovery computer (~104Hz with subtle downward drift)
          const basePitch = isKitt
            ? 128 + ((charCode % 7) - 3) * 6 + (s === syllables - 1 ? 8 : 0)
            : 102 + ((charCode % 5) - 2) * 2.5 - (wIdx % 3) * 1.5;

          const carrier = this.ctx.createOscillator();
          const sub = this.ctx.createOscillator();
          const filter1 = this.ctx.createBiquadFilter();
          const filter2 = this.ctx.createBiquadFilter();
          const env = this.ctx.createGain();

          carrier.type = isKitt ? 'sawtooth' : 'triangle';
          sub.type = 'sine';
          carrier.frequency.setValueAtTime(basePitch, cursor);
          carrier.frequency.linearRampToValueAtTime(
            isKitt ? basePitch * 1.04 : basePitch * 0.98,
            cursor + sylDur
          );
          sub.frequency.setValueAtTime(basePitch * 0.5, cursor);

          filter1.type = 'bandpass';
          filter1.frequency.setValueAtTime(f1, cursor);
          filter1.Q.setValueAtTime(isKitt ? 5.5 : 4.2, cursor);

          filter2.type = 'bandpass';
          filter2.frequency.setValueAtTime(f2, cursor);
          filter2.Q.setValueAtTime(isKitt ? 6.5 : 4.8, cursor);

          env.gain.setValueAtTime(0.001, cursor);
          env.gain.linearRampToValueAtTime(isKitt ? 0.075 : 0.065, cursor + 0.014);
          env.gain.exponentialRampToValueAtTime(0.001, cursor + sylDur);

          carrier.connect(filter1);
          carrier.connect(filter2);
          sub.connect(filter1);
          filter1.connect(env);
          filter2.connect(env);
          env.connect(this._getOutputNode());

          carrier.start(cursor);
          sub.start(cursor);
          carrier.stop(cursor + sylDur + 0.01);
          sub.stop(cursor + sylDur + 0.01);

          cursor += sylDur + gap;
        }
        cursor += isKitt ? 0.025 : 0.042;
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🪙 NEON COIN DOZER '86: COIN INSERT & CHUTE DROP CLINK
   */
  playCoinDrop() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(12);
      const now = this.ctx.currentTime;
      // Metallic dual-ring arcade token clink
      [1820, 2740, 3640].forEach((freq, idx) => {
        const start = now + idx * 0.028;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.07);
        gain.gain.setValueAtTime(0.11 / (idx + 1), start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🪙 NEON COIN DOZER '86: COIN-ON-COIN COLLISION CLATTER
   */
  playCoinClink(intensity = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const base = 2100 + Math.random() * 650;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.18, now + 0.045);
      const vol = Math.min(0.12, 0.045 * intensity);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(this._getOutputNode());
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore audio errors
    }
  }

  /**
   * 🎁 NEON COIN DOZER '86: PRIZE / CASCADE TRAY DROP FANFARE
   */
  playPrizeDrop(isRare = false) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.triggerHaptic(isRare ? [30, 40, 60] : 24);
      const now = this.ctx.currentTime;
      const notes = isRare
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
        : [587.33, 880, 1174.66, 1760];
      notes.forEach((f, idx) => {
        const start = now + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isRare ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(this._getOutputNode());
        osc.start(start);
        osc.stop(start + 0.19);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

export const sfx = new SoundEngine();
