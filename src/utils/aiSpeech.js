import { sfx } from './soundEngine';

// Exclude novelty, robotic, and Apple Eloquence voices that destroy clarity on macOS/iOS
const NOVELTY_VOICE_RE =
  /Fred|Albert|Ralph|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Zarvox|Junior|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Superstar|Organ|Bells/i;

// Exclude regional accents (e.g. Jamaican en-JM, Nigerian en-NG, etc.) from auto 1980s US/UK voice selection
const EXCLUDED_AUTO_LOCALE_RE = /^en[-_](jm|ng|ke|tz|za|in|ph|sg|hk|cb|tt|bz|bb|bs|gy|ie)\b/i;
const PREFERRED_80S_LOCALE_RE = /^en[-_](us|gb|uk|ca|au)\b/i;
const MALE_VOICE_NAME_RE = /\b(David|Mark|Guy|Christopher|Eric|Roger|Steffan|Ryan|George|Arthur|Daniel|Oliver|Alex|Aaron|Fred|Tom|Brian|Andrew|Gordon|Male)\b/i;
const FEMALE_VOICE_NAME_RE = /\b(Samantha|Zira|Jenny|Aria|Sonia|Libby|Michelle|Ana|Victoria|Karen|Moira|Tessa|Serena|Allison|Ava|Susan|Nicky|Kate|Hazel|Female)\b/i;

export function isValkyrieMode(mode) {
  return mode === 'valkyrie' || mode === 'female80s' || mode === 'female';
}

export function isPreferredRetroEnglishLocale(lang) {
  const norm = String(lang || '').trim();
  if (!norm) return false;
  if (EXCLUDED_AUTO_LOCALE_RE.test(norm)) return false;
  return PREFERRED_80S_LOCALE_RE.test(norm);
}

const SPEECH_ENGINE_KEY = 'tm_ai_speech_engine'; // 'auto' | 'system' | 'synth'

// Safari WebKit garbage-collects SpeechSynthesisUtterance objects mid-speech unless retained at module scope
const RETAINED_UTTERANCES = new Set();

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function getSpeechEngineMode() {
  try {
    const v = localStorage.getItem(SPEECH_ENGINE_KEY);
    if (v === 'system' || v === 'synth' || v === 'auto') return v;
  } catch {
    // ignore
  }
  return 'auto';
}

export function setSpeechEngineMode(mode) {
  const safe = mode === 'system' || mode === 'synth' ? mode : 'auto';
  try {
    localStorage.setItem(SPEECH_ENGINE_KEY, safe);
  } catch {
    // ignore
  }
  return safe;
}

export function cleanTextForSpeech(text) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/K\.I\.T\.T\.?/gi, 'Kitt')
    .replace(/\bHAL\b/g, 'Hal')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*#_~>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getEnglishVoices(voicesCache = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    const raw =
      Array.isArray(voicesCache) && voicesCache.length > 0
        ? voicesCache
        : window.speechSynthesis.getVoices() || [];
    const seen = new Set();
    return raw
      .filter(
        (v) =>
          v &&
          v.lang &&
          v.lang.toLowerCase().startsWith('en') &&
          !NOVELTY_VOICE_RE.test(v.name || '')
      )
      .filter((v) => {
        const key = v.voiceURI || v.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const aPref = isPreferredRetroEnglishLocale(a.lang) ? 0 : 1;
        const bPref = isPreferredRetroEnglishLocale(b.lang) ? 0 : 1;
        if (aPref !== bPref) return aPref - bPref;
        const aLocal = a.localService !== false ? 0 : 1;
        const bLocal = b.localService !== false ? 0 : 1;
        if (aLocal !== bLocal) return aLocal - bLocal;
        return (a.name || '').localeCompare(b.name || '');
      });
  } catch {
    return [];
  }
}

export function pickPreferredVoice(mode = 'valkyrie', preferredUri = 'auto', voicesCache = null) {
  const enVoices = getEnglishVoices(voicesCache);
  if (enVoices.length === 0) return null;

  if (preferredUri && preferredUri !== 'auto') {
    const exact = enVoices.find((v) => v.voiceURI === preferredUri || v.name === preferredUri);
    if (exact) return exact;
  }

  const isIOS = isIOSDevice();
  // Filter to authentic 80s US/UK/CA/AU voices first (never en-JM / Jamaican)
  const retroLocales = enVoices.filter((v) => isPreferredRetroEnglishLocale(v.lang));
  const candidatePool = retroLocales.length > 0 ? retroLocales : enVoices;
  const localPool = candidatePool.filter((v) => v.localService !== false);
  const pool = isIOS ? localPool : candidatePool;

  // On iPhone, if no verified local clear voice is loaded, returning null lets iOS use its crisp default Siri/System voice
  if (pool.length === 0) return null;

  if (isValkyrieMode(mode)) {
    const femalePool = pool.filter((v) => !MALE_VOICE_NAME_RE.test(v.name || ''));
    const searchPool = femalePool.length > 0 ? femalePool : pool;
    const femalePatterns = isIOS
      ? [/Samantha/i, /Allison/i, /Ava/i, /Victoria/i, /Serena/i, /Karen/i, /Nicky/i, /Kate/i, /en[-_]US/i, /en[-_]GB/i]
      : [
          /Microsoft (Aria|Jenny|Zira|Sonia|Libby|Michelle|Ana).*Online/i,
          /Microsoft (Aria|Jenny|Zira|Sonia|Libby|Michelle|Ana)/i,
          /Google UK English Female/i,
          /Samantha/i,
          /Google US English/i,
          FEMALE_VOICE_NAME_RE,
          /en[-_]US/i,
          /en[-_]GB/i
        ];
    for (const pat of femalePatterns) {
      const match = searchPool.find((v) => pat.test(`${v.name} ${v.voiceURI} ${v.lang}`));
      if (match) return match;
    }
    return searchPool[0] || pool[0] || null;
  }

  const wantedPatterns =
    mode === 'hal'
      ? isIOS
        ? [/Arthur/i, /Daniel/i, /Gordon/i, /Oliver/i, /Aaron/i, /en[-_]GB/i]
        : [
            /Microsoft (Ryan|George|Christopher|Mark|David|Guy).*Online/i,
            /Microsoft (Ryan|George|Christopher|Mark|David)/i,
            /Google UK English Male/i,
            /\b(Arthur|Daniel|Oliver|Ryan|George|Alex)\b/i,
            /en[-_]GB/i
          ]
      : isIOS
        ? [/Aaron/i, /Arthur/i, /Daniel/i, /Alex/i, /Nicky/i, /en[-_]US/i]
        : [
            /Microsoft (Guy|Christopher|Eric|Roger|Steffan|Andrew|Brian|David).*Online/i,
            /Microsoft (Guy|Christopher|Eric|Roger|Steffan|Andrew|Brian|David)/i,
            /Google UK English Male/i,
            /\b(Aaron|Alex|Daniel|Guy|David|Christopher)\b/i,
            /Google US English/i,
            /en[-_]US/i
          ];

  for (const pat of wantedPatterns) {
    const match = pool.find((v) => pat.test(`${v.name} ${v.voiceURI} ${v.lang}`));
    if (match) return match;
  }

  if (isIOS) {
    return pool.find((v) => (v.lang || '').toLowerCase().startsWith(mode === 'hal' ? 'en-gb' : 'en-us')) || pool[0] || null;
  }

  return pool.find((v) => /^en[-_]US/i.test(v.lang || '')) || pool[0] || enVoices[0] || null;
}

function splitSpeechChunks(text, isIOS = false) {
  // On iPhone Safari, chaining multiple small utterances often stalls after chunk 1
  // because subsequent speak() calls fall outside the original tap gesture.
  // Keep text inside 1 cohesive utterance up to ~280 chars on iOS!
  if (isIOS || text.length <= 240) {
    return [text.slice(0, isIOS ? 280 : 240)];
  }
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((buf + ' ' + trimmed).trim().length <= 220) {
      buf = (buf + ' ' + trimmed).trim();
    } else {
      if (buf) chunks.push(buf);
      buf = trimmed.slice(0, 220);
    }
  }
  if (buf) chunks.push(buf);
  return chunks.length > 0 ? chunks.slice(0, 3) : [text.slice(0, 220)];
}

/**
 * Speak text reliably across desktop browsers AND iPhone/iOS Safari.
 * Combines gesture-safe Web Speech invocation, WebKit GC retention, speaking-state polling,
 * and automatic crisp Web Audio Formant Speech synthesis fallback.
 */
export function speakUtteranceChain({
  text,
  mode = 'kitt',
  voiceUri = 'auto',
  voicesCache = null,
  fromGesture = false,
  engineMode = null,
  onIntroPing = null,
  onStart = null,
  onEnd = null,
  onWatchdogTimeout = null,
  onFallbackSynth = null,
}) {
  const spoken = cleanTextForSpeech(text);
  if (!spoken) return null;

  const activeEngine = engineMode || getSpeechEngineMode();
  const isIOS = isIOSDevice();
  const hasWebSpeech =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function';

  // Ensure Web Audio + iOS AudioSession ('playback') are active
  sfx.unlockIosAudio?.({ primeSpeech: false });

  let cancelled = false;
  let started = false;
  let finished = false;
  let watchdogTimer = null;
  let speakingPollTimer = null;
  let speakDelayTimer = null;
  let synthEndTimer = null;
  let synthHandle = null;
  const activeUtterances = [];

  const cleanupTimers = () => {
    if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null; }
    if (speakingPollTimer) { clearInterval(speakingPollTimer); speakingPollTimer = null; }
    if (speakDelayTimer) { clearTimeout(speakDelayTimer); speakDelayTimer = null; }
    if (synthEndTimer) { clearTimeout(synthEndTimer); synthEndTimer = null; }
    activeUtterances.forEach((u) => RETAINED_UTTERANCES.delete(u));
  };

  const stop = () => {
    cancelled = true;
    cleanupTimers();
    try {
      synthHandle?.stop?.();
      sfx.stopAiVocalFormants?.();
    } catch {
      // ignore
    }
    if (hasWebSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  };

  const runPhonemeFallback = (wasWatchdog = false) => {
    if (cancelled || finished) return;
    cleanupTimers();
    if (hasWebSpeech) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    started = true;
    onStart?.();
    if (wasWatchdog) {
      onWatchdogTimeout?.();
    } else {
      onFallbackSynth?.();
    }
    synthHandle = sfx.playAiVocalFormants?.(spoken, mode);
    const dur = Math.max(450, Math.min(8500, synthHandle?.durationMs || 1400));
    synthEndTimer = setTimeout(() => {
      if (!cancelled) {
        finished = true;
        onEnd?.();
      }
    }, dur);
  };

  // Direct WebAudio Formant Synthesizer path if requested or Web Speech unsupported
  if (activeEngine === 'synth' || !hasWebSpeech) {
    if (!isIOS) {
      onIntroPing?.(mode);
    }
    runPhonemeFallback(false);
    return { stop };
  }

  const synth = window.speechSynthesis;
  const liveVoices =
    Array.isArray(voicesCache) && voicesCache.length > 0
      ? voicesCache
      : (() => {
          try {
            return synth.getVoices() || [];
          } catch {
            return [];
          }
        })();

  const voice = pickPreferredVoice(mode, voiceUri, liveVoices);
  const chunks = splitSpeechChunks(spoken, isIOS);

  // On iOS outside a direct user gesture, WebKit rejects synth.speak(); fall back to crisp WebAudio synth
  if (isIOS && !fromGesture && !sfx.hasUserGesture) {
    runPhonemeFallback(false);
    return { stop };
  }

  const speakChunk = (idx) => {
    if (cancelled || finished) return;
    if (idx >= chunks.length) {
      cleanupTimers();
      finished = true;
      onEnd?.();
      return;
    }

    const utter = new window.SpeechSynthesisUtterance(chunks[idx]);
    activeUtterances[idx] = utter;
    RETAINED_UTTERANCES.add(utter);

    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || (mode === 'hal' ? 'en-GB' : 'en-US');
    } else {
      utter.lang = mode === 'hal' ? 'en-GB' : 'en-US';
    }

    // Keep iPhone rate/pitch near 1.0 to avoid Apple TTS pitch/timbre artifacts
    if (mode === 'hal') {
      utter.rate = isIOS ? 0.92 : 0.88;
      utter.pitch = isIOS ? 0.9 : 0.82;
    } else if (isValkyrieMode(mode)) {
      utter.rate = isIOS ? 1.02 : 1.05;
      utter.pitch = isIOS ? 1.06 : 1.14;
    } else {
      utter.rate = isIOS ? 1.02 : 1.04;
      utter.pitch = isIOS ? 0.98 : 0.94;
    }
    utter.volume = 1.0;

    utter.onstart = () => {
      started = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      if (speakingPollTimer) {
        clearInterval(speakingPollTimer);
        speakingPollTimer = null;
      }
      if (idx === 0) onStart?.();
    };

    utter.onend = () => {
      RETAINED_UTTERANCES.delete(utter);
      if (!cancelled && !finished) {
        speakChunk(idx + 1);
      }
    };

    utter.onerror = (ev) => {
      RETAINED_UTTERANCES.delete(utter);
      if (cancelled || finished) return;
      const errCode = ev?.error || '';
      if (errCode === 'interrupted' || errCode === 'canceled') return;
      if (!started && idx === 0) {
        runPhonemeFallback(true);
      } else {
        cleanupTimers();
        finished = true;
        onEnd?.();
      }
    };

    try {
      if (typeof synth.resume === 'function') {
        synth.resume();
      }
    } catch {
      // ignore
    }
    synth.speak(utter);
  };

  if (!isIOS) {
    onIntroPing?.(mode);
  }

  const wasBusy = Boolean(synth.speaking || synth.pending);
  if (wasBusy) {
    try {
      synth.cancel();
    } catch {
      // ignore
    }
    if (!fromGesture && activeEngine !== 'system') {
      runPhonemeFallback(false);
      return { stop };
    }
    // iOS WebKit silently drops a speak() invoked synchronously right after cancel()
    speakDelayTimer = setTimeout(() => {
      if (!cancelled) speakChunk(0);
    }, isIOS ? 80 : 35);
  } else {
    speakChunk(0);
  }

  // Poll synth.speaking because iOS Safari frequently starts audio without firing onstart promptly
  speakingPollTimer = setInterval(() => {
    if (cancelled || finished) return;
    try {
      if (synth.speaking) {
        started = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        clearInterval(speakingPollTimer);
        speakingPollTimer = null;
        onStart?.();
      }
    } catch {
      // ignore
    }
  }, 150);

  // Watchdog: if TTS genuinely fails to start (within 2500ms on iOS, 1600ms desktop),
  // switch seamlessly to the clear Web Audio Phoneme Speech Synthesizer
  watchdogTimer = setTimeout(() => {
    if (!started && !cancelled && !finished) {
      if (activeEngine === 'system') {
        // User forced OS System voice — notify timeout and play gentle fallback
        runPhonemeFallback(true);
      } else {
        // 'auto' mode: seamlessly use Web Audio Formant voice and notify gently
        runPhonemeFallback(true);
      }
    }
  }, isIOS ? 2500 : 1600);

  return { stop };
}

/**
 * Convenience helper for one-shot 80s spoken announcements (Bingo, TV Newsflash, 80s Icons).
 */
export function speakWithPersona(text, options = {}) {
  const {
    mode = 'valkyrie',
    voiceUri = 'auto',
    fromGesture = true,
    onStart = null,
    onEnd = null
  } = options || {};
  return speakUtteranceChain({
    text,
    mode,
    voiceUri,
    fromGesture,
    onStart,
    onEnd
  });
}
