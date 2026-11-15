// ==========================================
// SINGLE PUBLISH PATH — Phase 33 task 33.2: thin client for the `publish-meme` Edge Function.
// The browser can no longer write to Storage or insert into `memes`. It asks the function for
// signed upload URLs into the PRIVATE `quarantine` bucket, uploads there, then asks the
// function to check, re-encode, moderate and publish. See supabase/functions/publish-meme.
// ==========================================
import { guessContentType } from './mediaPipeline.js';
import { sanitizeUserText, sanitizeOverlayPayload } from './securityGuard.js';
import { PUBLIC_UPLOADS_ENABLED, UPLOADS_PAUSED_ERROR } from '../config/featureFlags.js';
import { ensureWriteSession, precheckTexts, TEXT_REJECTION_MESSAGES } from './serverWrites.js';
import { getTurnstileToken } from './turnstile.js';
import { BOT_ERROR_MESSAGES, formatRateLimitMessage } from '../../supabase/functions/_shared/rateLimitAndBot.js';

export const PUBLISH_FUNCTION = 'publish-meme';

/** Where "House Rules" links point (page arrives in task 33.11). */
export const RULES_PATH = '/rules';

/** Uploader-facing states while and after the server checks a meme (task 33.3). */
export const CHECKING_MESSAGE = '🕵️ Checking your meme… usually a few seconds';
export const LIVE_MESSAGE = '✅ Live! Your meme is on the feed.';
export const PENDING_REVIEW_MESSAGE =
  '⏳ Our robots want a second look. Only you can see it until a moderator approves it.';

/** Friendly copy for every error code publishMeme can throw (err.message is the code). */
export const PUBLISH_ERROR_MESSAGES = {
  sign_in_required: '🔑 Sign in to post memes to the live feed (you can still download yours).',
  suspended: '🚫 Your account is currently suspended from posting memes.',
  rate_limited: '⏳ Cool your jets, speed racer. Try again in a moment.',
  ...BOT_ERROR_MESSAGES,
  video_paused: '🎬 Video memes are coming back soon — post a still or a GIF for now.',
  too_large: '⚠️ That file is too big — keep it under 15MB.',
  gif_too_large: '⚠️ GIFs must be 8MB or smaller.',
  gif_too_long: '⚠️ GIFs must be 10 seconds or shorter (max 300 frames).',
  unsupported_type: '⚠️ Only PNG, JPG, WebP or GIF files can be posted.',
  undecodable: '⚠️ We could not read that image. Try saving it as PNG or JPG.',
  too_many_pixels: '⚠️ That image is enormous — try a smaller one.',
  rejected: '🚫 That one breaks the House Rules, so it was not posted.',
  rejected_links: TEXT_REJECTION_MESSAGES.links,
  rejected_personal_info: TEXT_REJECTION_MESSAGES.personal_info,
  rejected_impersonation: TEXT_REJECTION_MESSAGES.impersonation,
  rejected_text: TEXT_REJECTION_MESSAGES.default,
  upload_not_found: '⚠️ Upload went missing on the way. Please try again.',
  bad_request: '⚠️ Upload failed. Please try again.',
  bad_path: '⚠️ Upload failed. Please try again.',
  server_error: '⚠️ The meme server hiccuped. Please try again in a moment.',
  network: '📡 Could not reach the meme server. Check your connection and try again.'
};

export function publishErrorMessage(err) {
  return err?.friendlyMessage || PUBLISH_ERROR_MESSAGES[err?.message] || null;
}

function publishError(code, friendlyMessage = null) {
  const err = new Error(code);
  err.code = code;
  if (friendlyMessage) err.friendlyMessage = friendlyMessage;
  return err;
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}

async function invokePublishFunction(client, body) {
  const { data, error } = await client.functions.invoke(PUBLISH_FUNCTION, { body });
  if (!error) return data;
  let code = 'network';
  let friendlyMessage = null;
  try {
    const payload = await error.context?.json?.();
    if (payload?.error) code = payload.error;
    if (payload?.error === 'rate_limited') {
      friendlyMessage = payload.message || formatRateLimitMessage(payload.retry_after_seconds);
    } else if (payload?.error?.startsWith?.('bot_check_') && payload?.message) {
      friendlyMessage = payload.message;
    }
    if (payload?.error === 'rejected' && payload.detail && payload.detail !== 'image') {
      code = rejectionCode(payload.detail);
    }
  } catch {
    // keep 'network'
  }
  throw publishError(code, friendlyMessage);
}

/** Map a text-moderation `detail` (33.4) to a publish error code. */
function rejectionCode(detail) {
  return ['links', 'personal_info', 'impersonation'].includes(detail) ? `rejected_${detail}` : 'rejected_text';
}

async function fetchAsBlob(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw publishError('upload_not_found');
  return res.blob();
}

/**
 * publishMeme({ media, overlay, meta, client })
 *  media: { kind:'image', blob, baseBlob?, width, height }
 *       | { kind:'gif', file?, url?, width, height }
 *  meta:  { title, category, parentId, rootId, generation, isSpoiler }
 *         (author is ignored by the server — it uses the signed-in account)
 * Returns { meme, savedToDb, status }. Throws Error(code) — see PUBLISH_ERROR_MESSAGES.
 *
 * Without a Supabase client (offline) a still image becomes a local draft that only exists in
 * this browser tab; it is never sent anywhere and never appears in anyone else's feed.
 */
export async function publishMeme({ media, overlay = null, meta = {}, client = null }) {
  // Kill switch (src/config/featureFlags.js).
  if (!PUBLIC_UPLOADS_ENABLED) {
    throw new Error(UPLOADS_PAUSED_ERROR);
  }
  const kind = media?.kind || 'image';
  if (kind === 'video') throw publishError('video_paused');
  const isGif = kind === 'gif';
  const safeOverlay = sanitizeOverlayPayload(overlay);
  const title = sanitizeUserText(meta.title || 'Untitled Meme', 140);
  const category = sanitizeUserText(meta.category || 'dank', 32);

  if (!client) {
    if (isGif || !media?.blob) throw new Error('OFFLINE_VIDEO');
    return {
      savedToDb: false,
      status: 'local',
      meme: {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        category,
        image_url: await blobToDataUrl(media.blob),
        author_name: sanitizeUserText(meta.author || 'AnonMemer', 48),
        score: 1,
        reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
        media_type: 'image',
        overlay: safeOverlay,
        width: media.width || null,
        height: media.height || null,
        generation: meta.generation || 0,
        is_spoiler: Boolean(meta.isSpoiler),
        status: 'local',
        comments: [],
        created_at: new Date().toISOString()
      }
    };
  }

  // 33.4: instant feedback on the title and caption text (the server checks again).
  const textProblem = precheckTexts([title, ...(safeOverlay?.layers || []).map((l) => l?.text || '')]);
  if (textProblem) throw publishError(rejectionCode(textProblem));

  // Visitors who have not signed in get an anonymous session for their first write.
  if (!(await ensureWriteSession(client))) throw publishError('sign_in_required');

  // Main file: the composed still, or the GIF (fetched from its URL when remixing).
  let mainBlob = isGif ? media.file || null : media.blob || null;
  if (!mainBlob && isGif && media.url) mainBlob = await fetchAsBlob(media.url);
  if (!mainBlob) throw publishError('bad_request');
  if (isGif && mainBlob.size > 8 * 1024 * 1024) throw publishError('gif_too_large');
  const baseBlob = !isGif && media.baseBlob ? media.baseBlob : null;

  const turnstileToken = await getTurnstileToken('upload');
  const signed = await invokePublishFunction(client, {
    action: 'sign-upload',
    count: baseBlob ? 2 : 1,
    mimeType: mainBlob.type || (isGif ? 'image/gif' : 'image/webp'),
    ...(turnstileToken ? { turnstileToken } : {})
  });
  const uploads = signed?.uploads || [];
  if (!uploads[0]) throw publishError('server_error');

  const put = async (slot, blob, contentType) => {
    const { error } = await client.storage
      .from('quarantine')
      .uploadToSignedUrl(slot.path, slot.token, blob, { contentType });
    if (error) throw publishError(/size|large/i.test(error.message || '') ? 'too_large' : 'network');
  };
  await put(uploads[0], mainBlob, isGif ? 'image/gif' : guessContentType(mainBlob, kind));
  let basePath = null;
  if (baseBlob && uploads[1]) {
    try {
      await put(uploads[1], baseBlob, baseBlob.type || 'image/webp');
      basePath = uploads[1].path;
    } catch {
      basePath = null; // the base image is optional (used by Remix)
    }
  }

  const result = await invokePublishFunction(client, {
    action: 'publish',
    path: uploads[0].path,
    basePath,
    title,
    category,
    overlay: safeOverlay,
    parentId: meta.parentId || null,
    rootId: meta.rootId || null,
    isBounty: Boolean(meta.isBounty),
    bountyId: meta.bountyId || null,
    templateId: meta.templateId || null
  });
  if (!result?.meme) throw publishError(result?.error || 'server_error');

  return {
    savedToDb: true,
    status: result.status,
    meme: {
      ...result.meme,
      is_spoiler: Boolean(meta.isSpoiler),
      root_meme_id: result.meme.root_meme_id || result.meme.id,
      comments: []
    }
  };
}
