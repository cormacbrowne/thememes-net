// ==========================================
// Phase 33 task 33.3 — ONE place to tune image moderation.
// Scores are 0–1 probabilities from the provider. For each category:
//   score >= reject  → 'reject'  (meme refused, image hash banned)
//   score >= review  → 'review'  (meme saved as `pending`, goes to the moderator queue in 33.5)
//   otherwise        → 'approve'
// Anything missing, unknown or erroring is 'review' (fail closed), never 'approve'.
//
// The site is planned as 13+ with "teen-safe" content (owner to confirm, P0 owner action 4),
// so sexual content is strict while ordinary meme violence/cartoon gore gets some leeway.
// ==========================================

export const IMAGE_MODERATION = {
  /** 'sightengine' | 'openai' | 'none'. Overridden by the IMAGE_MODERATION_PROVIDER env var. */
  defaultProvider: 'none',
  /** Give up on the provider after this long and fail closed (pending). */
  timeoutMs: 8000,
  /** GIFs: how many frames are sent (first, middle, last). */
  gifSampleFrames: 3,
  /** Perceptual-hash distance (out of 64 bits) at which an upload counts as a banned re-upload. */
  bannedPhashMaxDistance: 6,

  thresholds: {
    sexual: { review: 0.3, reject: 0.7 },
    sexual_minors: { review: 0.01, reject: 0.2 },
    gore: { review: 0.4, reject: 0.8 },
    hate_symbols: { review: 0.4, reject: 0.8 },
    self_harm: { review: 0.3, reject: 0.7 },
    drugs: { review: 0.5, reject: 0.9 },
    weapon_threat: { review: 0.4, reject: 0.85 }
  },

  /**
   * Categories that must never be shown or stored publicly, even at 'review' level.
   * A hit here is always rejected and logged as an incident for the owner's legal
   * reporting procedure (see instructions.md, P0 owner actions).
   */
  zeroToleranceCategories: ['sexual_minors']
};
