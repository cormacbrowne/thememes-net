import { sfx } from './soundEngine';

// Exclude novelty/robotic macOS/iOS voices that ruin intelligibility
const NOVELTY_VOICE_RE =
  /Fred|Albert|Ralph|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Zarvox|Junior|Kathy/i;

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent || '') ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// Clean markdown and symbols so Web Speech API sounds like a real movie computer
export function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/🪙/g, ' tokens ')
    .replace(/×/g, ' times ')
    .replace(/21's/gi, 'twenty-ones')
    .replace(/21’s/gi, 'twenty-ones')
    .replace(/K\.I\.T\.T\./g, 'KITT')
    .replace(/K\.A\.R\.R\./g, 'KARR')
    .replace(/MEMEDAQ/gi, 'Meme-Daq')
    .replace(/Lv\./gi, 'Level ')
    .replace(/#[a-z0-9_-]+/gi, '')
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function getEnglishVoices(voicesInput) {
  let raw = voicesInput;
  if ((!raw || raw.length === 0) && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      raw = window.speechSynthesis.getVoices();
    } catch {
      raw = [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  const cleanEn = list.filter(
    (v) => /^en(-|_|$)/i.test(v.lang || '') && !NOVELTY_VOICE_RE.test(v.name || '')
  );
  if (cleanEn.length > 0) return cleanEn;
  return list.filter((v) => /^en(-|_|$)/i.test(v.lang || ''));
}

export function pickPreferredVoice(voicesInput, mode = 'kitt', savedVoiceUri = '') {
  const enVoices = getEnglishVoices(voicesInput);
  if (savedVoiceUri && savedVoiceUri !== 'auto') {
    const manual = enVoices.find(
      (v) => v.voiceURI === savedVoiceUri || v.name === savedVoiceUri
    );
    if (manual) return manual;
  }

  const isIOS = isIOSDevice();
  const localEnVoices = enVoices.filter((v) => v.localService !== false);
  const pool = isIOS && localEnVoices.length > 0 ? localEnVoices : enVoices;

  if (mode === 'hal') {
    return (
      pool.find((v) => /(Daniel|Arthur|Oliver).*(Enhanced|Premium|Natural)/i.test(v.name)) ||
      pool.find((v) =>
        /Google UK English Male|Microsoft Ryan|Microsoft George|Daniel|Arthur|Oliver/i.test(v.name)
      ) ||
      pool.find((v) => /Aaron|Alex|David|Guy|Christopher/i.test(v.name)) ||
      pool[0] ||
      null
    );
  }

  return (
    pool.find((v) => /(Aaron|Alex|Daniel|Samantha).*(Enhanced|Premium|Natural)/i.test(v.name)) ||
    pool.find((v) =>
      /Microsoft Guy|Microsoft Christopher|Google US English|Aaron|Alex|Daniel|Arthur|Samantha/i.test(
        v.name
      )
    ) ||
    pool[0] ||
    null
  );
}

/**
 * Synchronous iOS-safe Web Speech synthesis helper.
 * Must be invoked directly inside a user gesture handler (`click` / `touchend` / form `submit`)
 * so iOS WebKit preserves user activation for `speechSynthesis.speak()`.
 */
export function speakUtteranceChain({
  text,
  mode = 'kitt',
  voiceUri = '',
  voicesCache = [],
  fromGesture = true,
  onIntroPing,
  onStart,
  onEnd,
  onWatchdogTimeout
}) {
  const spoken = cleanTextForSpeech(text);
  if (!spoken) return null;

  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof window.SpeechSynthesisUtterance !== 'function'
  ) {
    sfx.playAiVocalFormants?.(spoken, mode);
    return null;
  }

  const synth = window.speechSynthesis;
  const isIOS = isIOSDevice();

  // Ensure Web Audio session is active without queuing a silent speech utterance ahead of real text
  sfx.unlockIosAudio?.({ primeSpeech: false });

  // Only cancel() if currently speaking; never call speak() right after cancel() outside a gesture
  if (synth.speaking) {
    synth.cancel();
    if (!fromGesture) {
      return null;
    }
  }

  const loadedVoices = synth.getVoices();
  const voices = loadedVoices && loadedVoices.length > 0 ? loadedVoices : voicesCache || [];
  const chosenVoice = pickPreferredVoice(voices, mode, voiceUri);

  const sentences = spoken
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = sentences.length > 0 ? sentences : [spoken];

  let cancelled = false;
  let started = false;
  let watchdogTimer = null;
  let maxEndTimer = null;
  const activeUtterances = [];

  const clearTimers = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    if (maxEndTimer) {
      clearTimeout(maxEndTimer);
      maxEndTimer = null;
    }
  };

  const speakChunk = (idx) => {
    if (cancelled || idx >= chunks.length) {
      clearTimers();
      onEnd?.();
      return;
    }

    const utter = new window.SpeechSynthesisUtterance(chunks[idx]);
    activeUtterances[idx] = utter;

    if (chosenVoice) {
      utter.voice = chosenVoice;
      utter.lang = chosenVoice.lang || (mode === 'hal' ? 'en-GB' : 'en-US');
    } else {
      utter.lang = mode === 'hal' ? 'en-GB' : 'en-US';
    }

    if (mode === 'hal') {
      utter.rate = isIOS ? 0.94 : 0.92;
      utter.pitch = 0.94;
      utter.volume = 1.0;
    } else {
      utter.rate = isIOS ? 1.0 : 1.02;
      utter.pitch = 1.0;
      utter.volume = 1.0;
    }

    utter.onstart = () => {
      if (cancelled) return;
      if (!started) {
        started = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        if (isIOS) {
          onIntroPing?.(mode);
        }
        onStart?.();
      }
    };

    utter.onend = () => {
      if (cancelled) return;
      if (idx + 1 < chunks.length) {
        speakChunk(idx + 1);
      } else {
        clearTimers();
        onEnd?.();
      }
    };

    utter.onerror = () => {
      if (cancelled) return;
      clearTimers();
      onEnd?.();
    };

    synth.speak(utter);
  };

  if (!isIOS) {
    onIntroPing?.(mode);
  }

  // Watchdog: if iOS blocks TTS (onstart never fires within 1500ms), trigger formant fallback + hint
  watchdogTimer = setTimeout(() => {
    if (!started && !cancelled) {
      cancelled = true;
      sfx.playAiVocalFormants?.(spoken, mode);
      onWatchdogTimeout?.();
      onEnd?.();
    }
  }, 1500);

  const estMs = Math.min(24000, Math.max(3000, spoken.length * 80));
  maxEndTimer = setTimeout(() => {
    if (!cancelled) {
      clearTimers();
      onEnd?.();
    }
  }, estMs);

  // Synchronously speak first sentence inside the user gesture handler
  speakChunk(0);

  return {
    utterances: activeUtterances,
    stop: () => {
      cancelled = true;
      clearTimers();
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      onEnd?.();
    }
  };
}
