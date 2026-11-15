// ==========================================
// Phase 33 task 33.4 — ONE place to tune text moderation (titles, captions, comments, and
// later usernames / initials / party captions). Memes are allowed to be rude and silly:
// the filter targets slurs, threats, sexual content, doxxing and spam, NOT ordinary swearing.
//
// Two layers:
//   1. Local blocklist + pattern checks (textFilter.js) — instant, free, always on.
//   2. OpenAI omni-moderation (free) — uses the same OPENAI_API_KEY secret as images.
//      Scores 0–1: >= reject → refused; >= review → held (memes `pending`, comments refused
//      with "try again"); below → fine. No key / timeout / error → review (fail closed).
// ==========================================

export const TEXT_MODERATION = {
  /** 'openai' | 'none'. Overridden by the TEXT_MODERATION_PROVIDER env var. */
  defaultProvider: 'openai',
  timeoutMs: 6000,

  /** Local layer switches. */
  blockLinks: true,
  blockPersonalInfo: true,
  blockImpersonation: true,
  /** Our own domain may appear in captions (e.g. a watermark line). */
  allowedDomains: ['thememes.net'],

  /** Names nobody may use as a handle or @-mention as if it were them. */
  reservedNames: ['thememeshq', 'thememes', 'thememesnet', 'admin', 'administrator', 'moderator', 'mod', 'mods', 'support', 'staff', 'official', 'system'],

  /**
   * OpenAI category thresholds. Harassment and violence are deliberately lenient so roasts and
   * phrases like "kill it with fire" or "I'm dead 💀" pass; threats and hate are strict.
   */
  thresholds: {
    hate: { review: 0.5, reject: 0.85 },
    'hate/threatening': { review: 0.2, reject: 0.6 },
    harassment: { review: 0.85, reject: 0.98 },
    'harassment/threatening': { review: 0.4, reject: 0.8 },
    sexual: { review: 0.5, reject: 0.85 },
    'sexual/minors': { review: 0.05, reject: 0.3 },
    violence: { review: 0.9, reject: 0.99 },
    'violence/graphic': { review: 0.6, reject: 0.9 },
    'self-harm': { review: 0.6, reject: 0.9 },
    'self-harm/intent': { review: 0.4, reject: 0.8 },
    'self-harm/instructions': { review: 0.3, reject: 0.7 },
    'illicit/violent': { review: 0.5, reject: 0.85 }
  },

  /** Any score at review level or above in these categories is an outright reject. */
  zeroToleranceCategories: ['sexual/minors']
};
