// ==========================================
// WEB AUDIO SYNTH SOUND ENGINE (CYBER-ARCADE)
// ==========================================
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playVote(isUp = true, combo = 1) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      if (isUp) {
        const baseFreq = 320 + Math.min(combo * 65, 650);
        // Primary synth tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = combo >= 3 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.15);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);

        // Harmonic fifth overtone on 3x+ Overdrive combo
        if (combo >= 3) {
          const subOsc = this.ctx.createOscillator();
          const subGain = this.ctx.createGain();
          subOsc.connect(subGain);
          subGain.connect(this.ctx.destination);
          subOsc.type = 'square';
          subOsc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.03);
          subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.18);
          subGain.gain.setValueAtTime(0.09, now + 0.03);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
          subOsc.start(now + 0.03);
          subOsc.stop(now + 0.19);
        }
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(92, now + 0.19);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Ignore audio block errors before user interaction
    }
  }

  playPop(combo = 1) {
    if (!this.enabled) return;
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
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  playMutate() {
    if (!this.enabled) return;
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
        gain.gain.setValueAtTime(0.1, now);
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
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.075;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      });
    } catch {
      // Ignore audio errors
    }
  }

  playToggle() {
    if (!this.enabled) return;
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
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore audio errors
    }
  }
}

export const sfx = new SoundEngine();
