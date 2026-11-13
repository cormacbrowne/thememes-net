import { sfx } from './soundEngine';

// Exclude novelty, robotic, and Apple Eloquence voices that destroy clarity on macOS/iOS
const NOVELTY_VOICE_RE =
  /Fred|Albert|Ralph|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Zarvox|Junior|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Superstar|Organ|Bells/i;

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
        const aLocal = a.localService !== false ? 0 : 1;
        const bLocal = b.localService !== false ? 0 : 1;
        if (aLocal !== bLocal) return aLocal - bLocal;
        return (a.name || '').localeCompare(b.name || '');
      });
  } catch {
    return [];
  }
}

export function pickPreferredVoice(mode = 'kitt', preferredUri = 'auto', voicesCache = null) {
  const enVoices = getEnglishVoices(voicesCache);
  if (enVoices.length === 0) return null;

  if (preferredUri && preferredUri !== 'auto') {
    const exact = enVoices.find((v) => v.voiceURI === preferredUri || v.name === preferredUri);
    if (exact) return exact;
  }

  const isIOS = isIOSDevice();
  const localEnVoices = enVoices.filter((v) => v.localService !== false);
  const pool = isIOS ? localEnVoices : enVoices;

  // On iPhone, if no verified local clear voice is loaded, returning null lets iOS use its crisp default Siri/System voice
  if (pool.length === 0) return null;

  // Prefer natural neural/system voices first (including clear iPhone local Apple voices)
  const wantedPatterns =
    mode === 'hal'
      ? isIOS
        ? [/Arthur/i, /Daniel/i, /Gordon/i, /Aaron/i, /Samantha/i, /Karen/i, /en[-_]GB/i]
        : [/Natural/i, /Online/i, /Daniel/i, /Arthur/i, /Ryan/i, /George/i, /Google UK English Male/i, /Guy/i, /en[-_]GB/i]
      : isIOS
        ? [/Aaron/i, /Samantha/i, /Nicky/i, /Daniel/i, /Moira/i, /Tessa/i, /Karen/i, /en[-_]US/i]
        : [/Natural/i, /Online/i, /Aaron/i, /Samantha/i, /Arthur/i, /Guy/i, /Google US English/i, /Microsoft David/i, /Alex/i, /en[-_]US/i];

  for (const pat of wantedPatterns) {
    const match = pool.find((v) => pat.test(`${v.name} ${v.voiceURI} ${v.lang}`));
    if (match) return match;
  }

  if (isIOS) {
    return pool.find((v) => (v.lang || '').toLowerCase().startsWith(mode === 'hal' ? 'en-gb' : 'en-us')) || pool[0] || null;
  }

  return pool[0] || enVoices[0] || null;
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
      utter.rate = isIOS ? 0.93 : 0.88;
      utter.pitch = isIOS ? 0.92 : 0.84;
    } else {
      utter.rate = isIOS ? 1.02 : 1.04;
      utter.pitch = isIOS ? 1.0 : 0.96;
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
