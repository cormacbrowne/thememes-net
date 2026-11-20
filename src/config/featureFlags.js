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

/**
 * Remixing other people's memes (Remix / Caption this / Mutate / Fork buttons, remix trees).
 * false = OFF (owner decision 17 Nov 2026: "once someone has posted a meme that's it, no more
 *         edits"). Making a brand-new meme in the editor is unaffected.
 */
export const REMIX_ENABLED = false;

/**
 * The 60 built-in @TheMemesHQ sample memes in the community feed.
 * false = OFF (owner decision 20 Nov 2026: real memes only in the feed). Sample memes still
 *         have their own static /m/seed-… pages and are used as game art, with zero counts.
 */
export const SAMPLE_MEMES_IN_FEED = false;

/**
 * Retro Casino games (slots, roulette, blackjack, poker, horse racing, coin dozer, bingo,
 * magic 8-ball) — plan 1.6. One switch retires the whole section.
 * true  = ON (default for now): shown LAST in the arcade, in their own "Retro Casino
 *         (just for fun, no real money)" section with an always-visible disclaimer.
 *         Never on the homepage or in the main promotional copy.
 * false = OFF: hidden from the lobby, search, sitemap and prerendered pages; their URLs
 *         open the arcade lobby instead.
 */
export const FEATURE_CASINO_GAMES = true;

/** Shown wherever casino games appear. */
export const CASINO_DISCLAIMER =
  'Just for fun. No real money: MemeDollarz (M$) are free play-money that can never be bought, transferred or cashed out.';

/**
 * Optional external image moderation webhook / service hook (Phase 2.6).
 * false = OFF in client config (service provider options documented in docs/OWNER_TODO.md);
 *         server-side image checks & moderation_settings.image_moderation_enabled control live publishing.
 */
export const FEATURE_IMAGE_MODERATION = false;

/**
 * Plan 2.9 — Site-wide seasonal skin mode:
 * - 'off': standard cyber-arcade theme (default)
 * - 'christmas': snow overlay + festive red/emerald/ice glow accents
 * - 'newyear': subtle champagne/cyan sparkles + gold glow accents
 * - 'auto': automatically 'christmas' (1–26 Dec UTC) and 'newyear' (27 Dec–5 Jan UTC)
 * Can also be previewed in browser via ?season=christmas|newyear|off.
 */
export const SEASONAL_SKIN = 'off';
