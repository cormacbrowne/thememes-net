// ==========================================
// FEATURE FLAGS — the one place to switch site features on/off.
// Change a value, then commit and deploy.
// ==========================================

/**
 * Public meme uploads (Quick Upload "Post to Feed" and Meme Forge "Publish").
 *
 * false = PAUSED (current default). Nothing is uploaded to Supabase Storage or inserted
 *         into the `memes` table. People can still make, download and share memes
 *         from their own device; voting, comments, games and the feed keep working.
 * true  = uploads ON. Only turn this back on once Phase 33 tasks 33.1–33.3
 *         (lock-down, server-side publish pipeline, image moderation) are live.
 */
export const PUBLIC_UPLOADS_ENABLED = false;

/** Friendly message shown when someone tries to post while uploads are paused. */
export const UPLOADS_PAUSED_MESSAGE =
  '⏸️ Uploads are paused while we add safety checks — you can still make and download memes.';

/** Error code thrown by the publish pipeline when uploads are paused. */
export const UPLOADS_PAUSED_ERROR = 'UPLOADS_PAUSED';
