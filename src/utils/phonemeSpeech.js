// Web Audio English Grapheme-to-Phoneme Multi-Formant Speech Synthesizer
// Provides clear, intelligible synthesized speech when iOS/browser Web Speech TTS is blocked or muted.

const FORMANT_TABLE = {
  // Vowels (f1, f2, f3, durMs, voiced, noiseHz, noiseGain)
  IY: { f1: 280, f2: 2250, f3: 2900, dur: 92, voiced: 1.0 }, // ee, ea, y
  IH: { f1: 400, f2: 1920, f3: 2560, dur: 74, voiced: 0.95 }, // i
  EY: { f1: 440, f2: 2050, f3: 2650, dur: 112, voiced: 1.0, glideTo: [330, 2240, 2850] }, // ai, ay, a_e
  EH: { f1: 550, f2: 1770, f3: 2490, dur: 78, voiced: 0.95 }, // e
  AE: { f1: 680, f2: 1660, f3: 2430, dur: 90, voiced: 1.0 }, // a
  AA: { f1: 730, f2: 1100, f3: 2440, dur: 98, voiced: 1.0 }, // o, ah, ar
  AO: { f1: 570, f2: 860, f3: 2410, dur: 98, voiced: 1.0 }, // aw, au, or
  OW: { f1: 490, f2: 910, f3: 2380, dur: 112, voiced: 1.0, glideTo: [340, 740, 2320] }, // o_e, oa, ow
  UH: { f1: 440, f2: 1020, f3: 2240, dur: 76, voiced: 0.9 }, // short oo
  UW: { f1: 310, f2: 870, f3: 2240, dur: 98, voiced: 1.0 }, // oo, u
  AH: { f1: 620, f2: 1220, f3: 2390, dur: 76, voiced: 0.92 }, // u, uh
  ER: { f1: 490, f2: 1350, f3: 1690, dur: 96, voiced: 0.95 }, // er, ir, ur
  AY: { f1: 710, f2: 1240, f3: 2460, dur: 126, voiced: 1.0, glideTo: [350, 2120, 2750] }, // igh, i_e
  AW: { f1: 700, f2: 1180, f3: 2400, dur: 122, voiced: 1.0, glideTo: [360, 860, 2280] }, // ou, ow
  OY: { f1: 540, f2: 890, f3: 2420, dur: 122, voiced: 1.0, glideTo: [350, 2080, 2740] }, // oi, oy

  // Nasals & Liquids (voiced formants, gentle amplitude)
  M:  { f1: 280, f2: 920, f3: 2200, dur: 66, voiced: 0.58 },
  N:  { f1: 290, f2: 1450, f3: 2450, dur: 62, voiced: 0.58 },
  NG: { f1: 290, f2: 1850, f3: 2650, dur: 70, voiced: 0.54 },
  L:  { f1: 350, f2: 1050, f3: 2680, dur: 66, voiced: 0.72 },
  R:  { f1: 430, f2: 1280, f3: 1650, dur: 66, voiced: 0.78 },
  W:  { f1: 310, f2: 720, f3: 2220, dur: 64, voiced: 0.78 },
  Y:  { f1: 290, f2: 2150, f3: 2850, dur: 62, voiced: 0.78 },

  // Fricatives (bandpass-filtered aspiration/frication)
  S:  { f1: 380, f2: 1700, f3: 2600, dur: 74, voiced: 0.0, noiseHz: 5400, noiseQ: 2.2, noiseGain: 0.28 },
  Z:  { f1: 340, f2: 1650, f3: 2580, dur: 68, voiced: 0.45, noiseHz: 4600, noiseQ: 2.2, noiseGain: 0.18 },
  SH: { f1: 380, f2: 1850, f3: 2650, dur: 80, voiced: 0.0, noiseHz: 3100, noiseQ: 1.7, noiseGain: 0.28 },
  TH: { f1: 420, f2: 1450, f3: 2450, dur: 64, voiced: 0.15, noiseHz: 3900, noiseQ: 1.4, noiseGain: 0.15 },
  F:  { f1: 420, f2: 1320, f3: 2350, dur: 68, voiced: 0.0, noiseHz: 3600, noiseQ: 1.1, noiseGain: 0.18 },
  V:  { f1: 360, f2: 1260, f3: 2320, dur: 62, voiced: 0.48, noiseHz: 2800, noiseQ: 1.2, noiseGain: 0.13 },
  H:  { f1: 520, f2: 1480, f3: 2420, dur: 54, voiced: 0.0, noiseHz: 1850, noiseQ: 0.9, noiseGain: 0.16 },

  // Plosives & Affricates (short release burst + formant transition)
  P:  { f1: 320, f2: 1020, f3: 2220, dur: 54, voiced: 0.0, noiseHz: 1400, noiseQ: 1.0, noiseGain: 0.24, plosive: true },
  B:  { f1: 300, f2: 1020, f3: 2220, dur: 52, voiced: 0.42, noiseHz: 900, noiseQ: 1.0, noiseGain: 0.14, plosive: true },
  T:  { f1: 340, f2: 1620, f3: 2560, dur: 54, voiced: 0.0, noiseHz: 4200, noiseQ: 1.6, noiseGain: 0.26, plosive: true },
  D:  { f1: 320, f2: 1580, f3: 2540, dur: 52, voiced: 0.45, noiseHz: 2600, noiseQ: 1.4, noiseGain: 0.15, plosive: true },
  K:  { f1: 340, f2: 1850, f3: 2520, dur: 56, voiced: 0.0, noiseHz: 2250, noiseQ: 1.5, noiseGain: 0.26, plosive: true },
  G:  { f1: 310, f2: 1780, f3: 2480, dur: 54, voiced: 0.46, noiseHz: 1750, noiseQ: 1.3, noiseGain: 0.15, plosive: true },
  CH: { f1: 360, f2: 1920, f3: 2680, dur: 76, voiced: 0.0, noiseHz: 3300, noiseQ: 1.8, noiseGain: 0.28, plosive: true },
  JH: { f1: 340, f2: 1880, f3: 2640, dur: 72, voiced: 0.44, noiseHz: 2900, noiseQ: 1.7, noiseGain: 0.20, plosive: true },

  // Pauses
  PAU:   { f1: 450, f2: 1350, f3: 2400, dur: 58, voiced: 0.0 },
  BREAK: { f1: 450, f2: 1350, f3: 2400, dur: 170, voiced: 0.0 },
};

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(num) {
  const n = Math.floor(Math.abs(Number(num)));
  if (!Number.isFinite(n) || n > 999999) return String(num);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r ? `${TENS[t]} ${ONES[r]}` : TENS[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r ? `${ONES[h]} hundred ${numberToWords(r)}` : `${ONES[h]} hundred`;
  }
  const k = Math.floor(n / 1000);
  const r = n % 1000;
  return r ? `${numberToWords(k)} thousand ${numberToWords(r)}` : `${numberToWords(k)} thousand`;
}

function normalizeTextForPhonemes(rawText) {
  return String(rawText || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/K\.I\.T\.T\.?/gi, 'kit')
    .replace(/\bHAL\b/g, 'hal')
    .replace(/\bMEMEDAQ\b/gi, 'meem dak')
    .replace(/\bFM\b/g, 'ef em')
    .replace(/\bRTP\b/g, 'ar tee pee')
    .replace(/\bXP\b/g, 'ex pee')
    .replace(/\b(\d+)\b/g, (_, d) => numberToWords(d))
    .replace(/([.!?;:]+)/g, ' , ')
    .replace(/[^a-zA-Z,\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function wordToPhonemes(word) {
  const w = word.replace(/[^a-z]/g, '');
  if (!w) return [];

  // High-frequency short words for crisp clarity
  const common = {
    the: ['TH', 'AH'],
    and: ['AE', 'N', 'D'],
    you: ['Y', 'UW'],
    your: ['Y', 'AO', 'R'],
    are: ['AA', 'R'],
    for: ['F', 'AO', 'R'],
    to: ['T', 'UW'],
    of: ['AH', 'V'],
    is: ['IH', 'Z'],
    in: ['IH', 'N'],
    it: ['IH', 'T'],
    on: ['AA', 'N'],
    all: ['AO', 'L'],
    one: ['W', 'AH', 'N'],
    two: ['T', 'UW'],
    four: ['F', 'AO', 'R'],
    five: ['F', 'AY', 'V'],
    eight: ['EY', 'T'],
    ok: ['OW', 'K', 'EY'],
    hi: ['H', 'AY'],
    no: ['N', 'OW'],
    go: ['G', 'OW'],
    hello: ['H', 'EH', 'L', 'OW'],
    welcome: ['W', 'EH', 'L', 'K', 'AH', 'M'],
    michael: ['M', 'AY', 'K', 'AH', 'L'],
    dave: ['D', 'EY', 'V'],
    tokens: ['T', 'OW', 'K', 'AH', 'N', 'Z'],
    token: ['T', 'OW', 'K', 'AH', 'N'],
    crash: ['K', 'R', 'AE', 'SH'],
    win: ['W', 'IH', 'N'],
    jackpot: ['JH', 'AE', 'K', 'P', 'AA', 'T'],
    ready: ['R', 'EH', 'D', 'IY'],
    voice: ['V', 'OY', 'S'],
    clear: ['K', 'L', 'IY', 'R'],
    online: ['AA', 'N', 'L', 'AY', 'N'],
  };
  if (common[w]) return common[w];

  const out = [];
  let i = 0;
  const len = w.length;
  const isVowel = (ch) => 'aeiouy'.includes(ch);

  while (i < len) {
    const rem = w.slice(i);

    if (rem.startsWith('tion')) { out.push('SH', 'AH', 'N'); i += 4; continue; }
    if (rem.startsWith('ight')) { out.push('AY', 'T'); i += 4; continue; }
    if (rem.startsWith('qu'))   { out.push('K', 'W'); i += 2; continue; }
    if (rem.startsWith('ch'))   { out.push('CH'); i += 2; continue; }
    if (rem.startsWith('sh'))   { out.push('SH'); i += 2; continue; }
    if (rem.startsWith('th'))   { out.push('TH'); i += 2; continue; }
    if (rem.startsWith('ph'))   { out.push('F'); i += 2; continue; }
    if (rem.startsWith('ng'))   { out.push('NG'); i += 2; continue; }
    if (rem.startsWith('ck'))   { out.push('K'); i += 2; continue; }
    if (rem.startsWith('ee') || rem.startsWith('ea')) { out.push('IY'); i += 2; continue; }
    if (rem.startsWith('oo'))   { out.push('UW'); i += 2; continue; }
    if (rem.startsWith('ai') || rem.startsWith('ay')) { out.push('EY'); i += 2; continue; }
    if (rem.startsWith('oi') || rem.startsWith('oy')) { out.push('OY'); i += 2; continue; }
    if (rem.startsWith('ou') || rem.startsWith('ow')) { out.push('AW'); i += 2; continue; }
    if (rem.startsWith('au') || rem.startsWith('aw')) { out.push('AO'); i += 2; continue; }
    if (rem.startsWith('oa'))   { out.push('OW'); i += 2; continue; }
    if (rem.startsWith('er') || rem.startsWith('ir') || rem.startsWith('ur')) { out.push('ER'); i += 2; continue; }
    if (rem.startsWith('ar'))   { out.push('AA', 'R'); i += 2; continue; }
    if (rem.startsWith('or'))   { out.push('AO', 'R'); i += 2; continue; }

    const c = w[i];
    const next = w[i + 1] || '';
    const next2 = w[i + 2] || '';

    // Skip duplicate double consonants
    if (c === next && !isVowel(c)) {
      i += 1;
      continue;
    }

    // Silent trailing 'e' on multi-syllable/CVC words
    if (c === 'e' && i === len - 1 && len > 3 && !isVowel(w[i - 1])) {
      i += 1;
      continue;
    }

    if (c === 'a') {
      out.push(next && !isVowel(next) && next2 === 'e' ? 'EY' : 'AE');
    } else if (c === 'e') {
      out.push(i === len - 1 ? 'IY' : 'EH');
    } else if (c === 'i') {
      out.push(next && !isVowel(next) && next2 === 'e' ? 'AY' : 'IH');
    } else if (c === 'o') {
      out.push(next && !isVowel(next) && next2 === 'e' ? 'OW' : 'AA');
    } else if (c === 'u') {
      out.push(next && !isVowel(next) && next2 === 'e' ? 'UW' : 'AH');
    } else if (c === 'y') {
      out.push(i === 0 ? 'Y' : 'IY');
    } else if (c === 'c') {
      out.push('eiy'.includes(next) ? 'S' : 'K');
    } else if (c === 'g') {
      out.push('eiy'.includes(next) ? 'JH' : 'G');
    } else if (c === 'j') {
      out.push('JH');
    } else if (c === 'x') {
      out.push('K', 'S');
    } else if (c === 'q') {
      out.push('K');
    } else {
      const map = {
        b: 'B', d: 'D', f: 'F', h: 'H', k: 'K', l: 'L', m: 'M',
        n: 'N', p: 'P', r: 'R', s: 'S', t: 'T', v: 'V', w: 'W', z: 'Z',
      };
      if (map[c]) out.push(map[c]);
    }
    i += 1;
  }

  return out;
}

function textToPhonemes(text) {
  const norm = normalizeTextForPhonemes(text);
  if (!norm) return ['AA', 'K', 'EY'];
  const tokens = norm.split(' ');
  const seq = [];
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok === ',') {
      seq.push('BREAK');
      continue;
    }
    const ph = wordToPhonemes(tok);
    if (ph.length > 0) {
      seq.push(...ph, 'PAU');
    }
    if (seq.length >= 165) break;
  }
  return seq;
}

let sharedNoiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return sharedNoiseBuffer;
  }
  const len = Math.floor(ctx.sampleRate * 1.0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    ch[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuffer = buf;
  return buf;
}

/**
 * Speak English text using a multi-formant Web Audio synthesizer.
 * Works reliably on iOS Safari even when Web Speech TTS fails or voices are missing.
 */
export function speakWithWebAudioFormants(ctx, destination, text, mode = 'kitt') {
  if (!ctx || !destination) {
    return { stop: () => {}, durationMs: 0 };
  }

  const phonemes = textToPhonemes(text);
  const isHal = mode === 'hal';
  const basePitch = isHal ? 98 : 128;
  const speedScale = isHal ? 1.14 : 0.94;
  const now = ctx.currentTime + 0.02;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.connect(destination);

  // Glottal pulse oscillator (rich harmonics for clear formants)
  const voiceOsc = ctx.createOscillator();
  voiceOsc.type = 'sawtooth';
  voiceOsc.frequency.setValueAtTime(basePitch, now);

  // Subtle vibrato / prosody
  const vibOsc = ctx.createOscillator();
  const vibGain = ctx.createGain();
  vibOsc.frequency.setValueAtTime(isHal ? 3.2 : 4.8, now);
  vibGain.gain.setValueAtTime(isHal ? 0.8 : 1.6, now);
  vibOsc.connect(vibGain);
  vibGain.connect(voiceOsc.frequency);

  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceOsc.connect(voiceGain);

  // 3 parallel vocal tract formant bandpass filters
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  const f3 = ctx.createBiquadFilter();
  const f1Gain = ctx.createGain();
  const f2Gain = ctx.createGain();
  const f3Gain = ctx.createGain();

  f1.type = 'bandpass';
  f2.type = 'bandpass';
  f3.type = 'bandpass';
  f1.Q.setValueAtTime(7.5, now);
  f2.Q.setValueAtTime(10.5, now);
  f3.Q.setValueAtTime(13.0, now);

  f1Gain.gain.setValueAtTime(0.95, now);
  f2Gain.gain.setValueAtTime(0.62, now);
  f3Gain.gain.setValueAtTime(0.28, now);

  voiceGain.connect(f1);
  voiceGain.connect(f2);
  voiceGain.connect(f3);
  f1.connect(f1Gain);
  f2.connect(f2Gain);
  f3.connect(f3Gain);
  f1Gain.connect(master);
  f2Gain.connect(master);
  f3Gain.connect(master);

  // Unvoiced consonant frication & plosive bursts
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBuffer(ctx);
  noiseSrc.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(3200, now);
  noiseFilter.Q.setValueAtTime(1.5, now);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  // Schedule phoneme trajectory
  let t = now;
  const totalCount = Math.max(1, phonemes.length);
  master.gain.linearRampToValueAtTime(0.42, now + 0.025);

  phonemes.forEach((sym, idx) => {
    const spec = FORMANT_TABLE[sym] || FORMANT_TABLE.PAU;
    const dur = (spec.dur / 1000) * speedScale;
    const progress = idx / totalCount;
    const declPitch = basePitch * (1.06 - progress * 0.14);

    if (sym === 'PAU' || sym === 'BREAK') {
      voiceGain.gain.setTargetAtTime(0.0001, t, 0.012);
      noiseGain.gain.setTargetAtTime(0.0001, t, 0.01);
      t += dur;
      return;
    }

    // Coarticulated formant transition
    const glide = Math.min(0.022, dur * 0.35);
    f1.frequency.linearRampToValueAtTime(spec.f1, t + glide);
    f2.frequency.linearRampToValueAtTime(spec.f2, t + glide);
    f3.frequency.linearRampToValueAtTime(spec.f3, t + glide);

    if (spec.glideTo) {
      f1.frequency.linearRampToValueAtTime(spec.glideTo[0], t + dur * 0.85);
      f2.frequency.linearRampToValueAtTime(spec.glideTo[1], t + dur * 0.85);
      f3.frequency.linearRampToValueAtTime(spec.glideTo[2], t + dur * 0.85);
    }

    voiceOsc.frequency.linearRampToValueAtTime(declPitch, t + glide);

    if (spec.voiced > 0) {
      voiceGain.gain.linearRampToValueAtTime(0.32 * spec.voiced, t + 0.014);
    } else {
      voiceGain.gain.setTargetAtTime(0.0001, t, 0.008);
    }

    if (spec.noiseHz && spec.noiseGain) {
      noiseFilter.frequency.setValueAtTime(spec.noiseHz, t);
      noiseFilter.Q.setValueAtTime(spec.noiseQ || 1.4, t);
      if (spec.plosive) {
        const burstAt = t + dur * 0.36;
        noiseGain.gain.setValueAtTime(0.0001, t);
        noiseGain.gain.setValueAtTime(spec.noiseGain, burstAt);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, burstAt + 0.028);
      } else {
        noiseGain.gain.linearRampToValueAtTime(spec.noiseGain, t + 0.012);
        noiseGain.gain.setTargetAtTime(0.0001, t + dur * 0.78, 0.014);
      }
    } else {
      noiseGain.gain.setTargetAtTime(0.0001, t, 0.01);
    }

    t += dur;
  });

  const end = t + 0.06;
  master.gain.setTargetAtTime(0.0001, t, 0.02);

  voiceOsc.start(now);
  vibOsc.start(now);
  noiseSrc.start(now);
  voiceOsc.stop(end + 0.05);
  vibOsc.stop(end + 0.05);
  noiseSrc.stop(end + 0.05);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      const cut = ctx.currentTime;
      master.gain.cancelScheduledValues(cut);
      master.gain.setTargetAtTime(0.0001, cut, 0.015);
      voiceOsc.stop(cut + 0.05);
      vibOsc.stop(cut + 0.05);
      noiseSrc.stop(cut + 0.05);
    } catch {
      // already stopped
    }
  };

  return {
    stop,
    durationMs: Math.round((end - now) * 1000),
  };
}
