// ==========================================
// FEATURE FLAGS — the one place to switch site features on/off.
// Change a value, then commit and deploy.
// ==========================================

/**
 * Public meme uploads (Quick Upload "Post to Feed" and Meme Forge "Publish").
 *
 * true  = uploads ON (switched on by the owner on 16 Nov 2026, after Phase 33 P0 went live:
 *         server-side publish pipeline, image + text moderation, reports and a moderator account).
 * false = PAUSED. Nothing is uploaded to Supabase Storage or inserted into the `memes` table.
 *         People can still make, download and share memes from their own device; voting,
 *         comments, games and the feed keep working. This is the emergency off-switch:
 *         set it to false, commit and deploy.
 */
export const PUBLIC_UPLOADS_ENABLED = true;

/** Friendly message shown when someone tries to post while uploads are paused. */
export const UPLOADS_PAUSED_MESSAGE =
  '⏸️ Uploads are paused for now — you can still make and download memes.';

/** Error code thrown by the publish pipeline when uploads are paused. */
export const UPLOADS_PAUSED_ERROR = 'UPLOADS_PAUSED';
