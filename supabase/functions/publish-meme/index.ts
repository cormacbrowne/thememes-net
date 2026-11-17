// ==========================================
// Supabase Edge Function: publish-meme  (Phase 33 task 33.2)
//
// The ONLY way a meme reaches the public feed. The browser can no longer insert into
// `memes` or write to any storage bucket (see migration 20261115000002).
//
//   1. POST { action: 'sign-upload', count: 1|2 }
//        → { uploads: [{ path, token }] }  signed upload URLs into the PRIVATE `quarantine`
//          bucket, at server-chosen paths `<auth uid>/<uuid>`.
//   2. Browser uploads the file(s) with storage.from('quarantine').uploadToSignedUrl(...)
//   3. POST { action: 'publish', path, basePath?, title, category, overlay, parentId?, rootId? }
//        → downloads from quarantine, checks size + magic bytes (PNG/JPEG/WebP/GIF only),
//          decodes and RE-ENCODES (strips EXIF/GPS, kills polyglots, caps at 1600 px),
//          SHA-256 + perceptual hash, image + text moderation (fail closed), then copies the
//          clean file to the public `memes` bucket under a server-chosen name and inserts the
//          row with user_id, status, hashes and moderation JSON. Quarantine files are always
//          deleted afterwards.
//
// Env (set automatically by Supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: PUBLISH_ALLOWED_ORIGINS (comma-separated) to override the CORS allow-list.
// Moderation (33.3 images, 33.4 text; see _shared/moderation.js): OPENAI_API_KEY secret.
//   Optional overrides: IMAGE_MODERATION_PROVIDER, TEXT_MODERATION_PROVIDER, SIGHTENGINE_*.
//   No key = everything pending (fail closed).
// Deploy: supabase functions deploy publish-meme
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import * as Magick from 'npm:@imagemagick/magick-wasm@0.0.44';
import {
  PUBLISH_LIMITS,
  PUBLISH_ERRORS,
  QUARANTINE_BUCKET,
  PUBLIC_BUCKET,
  buildQuarantinePath,
  cleanText,
  parsePublishRequest,
  sniffImageType,
  isVideoBytes,
  inspectGif,
  sha256Hex,
  decideStatus
} from '../_shared/publishCore.js';
import { transcodeImage } from '../_shared/imageCodec.js';
import { moderateImage, moderateText } from '../_shared/moderation.js';
import { IMAGE_MODERATION } from '../_shared/moderationConfig.js';
import { authorNameFor, isProfileSuspended } from '../_shared/identity.js';
import { verifyTurnstile, extractClientIp, ipHashFor, BOT_ERROR_MESSAGES } from '../_shared/rateLimitAndBot.js';

// The package's main entry is dist/index.js; the 32-bit WASM build sits at dist/x86/magick.wasm.
const wasmBytes = await Deno.readFile(
  new URL('x86/magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44'))
);
await Magick.initializeImageMagick(wasmBytes);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_ORIGINS = [
  'https://thememes.net',
  'https://www.thememes.net',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];
const ALLOWED_ORIGINS = (Deno.env.get('PUBLISH_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ORIGINS = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'Retry-After',
    Vary: 'Origin'
  };
}

function json(req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', ...extraHeaders }
  });
}

function fail(req: Request, status: number, error: string): Response {
  return json(req, status, { ok: false, error });
}

function publicUrl(path: string): string {
  return admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function readQuarantine(path: string) {
  const { data, error } = await admin.storage.from(QUARANTINE_BUCKET).download(path);
  if (error || !data) return { error: PUBLISH_ERRORS.NOT_FOUND };
  if (data.size > PUBLISH_LIMITS.MAX_UPLOAD_BYTES) return { error: PUBLISH_ERRORS.TOO_LARGE };
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (isVideoBytes(bytes)) return { error: PUBLISH_ERRORS.VIDEO_PAUSED };
  const type = sniffImageType(bytes);
  if (!type) return { error: PUBLISH_ERRORS.UNSUPPORTED };
  if (type === 'gif') {
    if (bytes.length > PUBLISH_LIMITS.MAX_GIF_BYTES) return { error: PUBLISH_ERRORS.GIF_TOO_LARGE };
    const gifInfo = inspectGif(bytes);
    if (!gifInfo.valid) return { error: PUBLISH_ERRORS.UNDECODABLE };
    if (gifInfo.frames > PUBLISH_LIMITS.MAX_GIF_FRAMES || gifInfo.durationSec > PUBLISH_LIMITS.MAX_GIF_SEC) {
      return { error: PUBLISH_ERRORS.GIF_TOO_LONG };
    }
  }
  return { bytes, type };
}

async function putPublic(path: string, data: Uint8Array, contentType: string) {
  const { error } = await admin.storage
    .from(PUBLIC_BUCKET)
    .upload(path, data, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(PUBLISH_ERRORS.SERVER);
  return publicUrl(path);
}

// 33.5: count refused uploads for the moderators' daily digest (never blocks the reply).
async function logRejection(userId: string, kind: string, detail: string | null) {
  try {
    await admin.from('upload_rejections').insert({ user_id: userId, kind, detail });
  } catch {
    // logging only
  }
}

async function ensureCallerProfile(userId: string) {
  await admin.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  const { data } = await admin
    .from('profiles')
    .select('id, username, role, strikes, suspended_until')
    .eq('id', userId)
    .maybeSingle();
  return data ?? null;
}

async function handleSignUpload(req: Request, userId: string, body: Record<string, unknown>) {
  if (typeof body?.mimeType === 'string' && body.mimeType.toLowerCase().startsWith('video/')) {
    return fail(req, 415, PUBLISH_ERRORS.VIDEO_PAUSED);
  }
  const bot = await verifyTurnstile({
    token: typeof body?.turnstileToken === 'string' ? body.turnstileToken : '',
    remoteIp: extractClientIp(req.headers),
    env: Deno.env
  });
  if (!bot.ok) {
    return json(req, bot.error === 'bot_check_unavailable' ? 503 : 403, {
      ok: false,
      error: bot.error,
      message: BOT_ERROR_MESSAGES[bot.error] || BOT_ERROR_MESSAGES.bot_check_failed
    });
  }

  const ipHash = await ipHashFor(req.headers);
  const { data: uploadQuota, error: uqErr } = await admin.rpc('check_and_record_rate_limit', {
    p_user_id: userId,
    p_action: 'upload',
    p_ip_hash: ipHash,
    p_record: false
  });
  if (uqErr) return fail(req, 500, PUBLISH_ERRORS.SERVER);
  if (!uploadQuota?.ok) {
    return json(req, 429, uploadQuota, {
      'Retry-After': String(uploadQuota?.retry_after_seconds || 60)
    });
  }

  const { data: signRl, error: signRlErr } = await admin.rpc('check_and_record_rate_limit', {
    p_user_id: userId,
    p_action: 'upload_sign',
    p_ip_hash: ipHash,
    p_record: true
  });
  if (signRlErr) return fail(req, 500, PUBLISH_ERRORS.SERVER);
  if (!signRl?.ok) {
    return json(req, 429, signRl, {
      'Retry-After': String(signRl?.retry_after_seconds || 60)
    });
  }

  const count = body.count === 2 ? 2 : 1;
  const uploads = [];
  for (let i = 0; i < count; i += 1) {
    const path = buildQuarantinePath(userId, crypto.randomUUID());
    const { data, error } = await admin.storage.from(QUARANTINE_BUCKET).createSignedUploadUrl(path);
    if (error || !data) return fail(req, 500, PUBLISH_ERRORS.SERVER);
    uploads.push({ path, token: data.token });
  }
  return json(req, 200, { ok: true, uploads, maxBytes: PUBLISH_LIMITS.MAX_UPLOAD_BYTES });
}

async function handlePublish(
  req: Request,
  user: { id: string; is_anonymous?: boolean; email?: string; user_metadata?: Record<string, unknown> },
  body: Record<string, unknown>,
  profile: { id?: string; username?: string | null; role?: string; suspended_until?: string | null } | null
) {
  const parsed = parsePublishRequest(body, user.id);
  if (!parsed.ok) return fail(req, 400, parsed.error);
  const input = parsed.value;
  const toDelete = [input.path, input.basePath].filter(Boolean) as string[];

  try {
    const ipHash = await ipHashFor(req.headers);
    const { data: pubRl, error: pubRlErr } = await admin.rpc('check_and_record_rate_limit', {
      p_user_id: user.id,
      p_action: 'upload',
      p_ip_hash: ipHash,
      p_record: true
    });
    if (pubRlErr) return fail(req, 500, PUBLISH_ERRORS.SERVER);
    if (!pubRl?.ok) {
      return json(req, 429, pubRl, {
        'Retry-After': String(pubRl?.retry_after_seconds || 60)
      });
    }

    const main = await readQuarantine(input.path);
    if (main.error) {
      const tooLarge = main.error === PUBLISH_ERRORS.TOO_LARGE || main.error === PUBLISH_ERRORS.GIF_TOO_LARGE;
      return fail(req, tooLarge ? 413 : 415, main.error);
    }

    let clean;
    try {
      clean = transcodeImage(Magick, main.bytes, main.type);
    } catch (err) {
      const code = (err as { code?: string }).code ?? PUBLISH_ERRORS.UNDECODABLE;
      return fail(req, code === PUBLISH_ERRORS.GIF_TOO_LARGE ? 413 : 415, code);
    }
    const sha256 = await sha256Hex(main.bytes);

    // Optional clean "base" (image without captions) used by Remix. Never fatal.
    let base = null;
    if (input.basePath) {
      const b = await readQuarantine(input.basePath);
      if (!b.error && b.type !== 'gif') {
        try {
          base = transcodeImage(Magick, b.bytes, b.type);
        } catch {
          base = null;
        }
      }
    }

    // 33.3: known-bad images (exact SHA-256 or near-identical dHash) are refused instantly,
    // without calling the moderation API. A failed lookup can never lead to approval.
    const banCheck = await admin.rpc('is_banned_image', {
      p_sha256: sha256,
      p_phash: clean.phash,
      p_max_distance: IMAGE_MODERATION.bannedPhashMaxDistance
    });
    if (banCheck.data === true) {
      await logRejection(user.id, 'banned_hash', null);
      return json(req, 422, { ok: false, error: PUBLISH_ERRORS.REJECTED, status: 'rejected' });
    }

    // The published file AND the optional Remix base are both public, so both are moderated.
    const samples = [...(clean.samples ?? []), ...(base?.samples ?? [])];
    const [rawImageVerdict, textVerdict] = await Promise.all([
      moderateImage({ samples, env: Deno.env }),
      moderateText({ texts: input.texts, env: Deno.env })
    ]);
    const imageVerdict =
      banCheck.error && rawImageVerdict.decision === 'approve'
        ? { ...rawImageVerdict, decision: 'review', reason: 'ban_check_failed' }
        : rawImageVerdict;
    const status = decideStatus(imageVerdict, textVerdict);
    const moderation = { image: imageVerdict, text: textVerdict, checked_at: new Date().toISOString() };

    if (status === 'rejected') {
      if (imageVerdict.decision === 'reject') {
        // Remember the image so re-uploads are refused instantly. No image bytes are kept.
        await admin
          .from('banned_hashes')
          .upsert(
            { sha256, phash: clean.phash, reason: `auto_reject:${(imageVerdict.flagged ?? []).join(',')}`, source: 'publish-meme' },
            { onConflict: 'sha256', ignoreDuplicates: true }
          );
        if (imageVerdict.zeroTolerance) {
          // Suspected sexual content involving a minor: never published, never copied out of
          // quarantine (deleted in `finally`), logged for the owner's legal reporting procedure.
          await admin.from('moderation_incidents').insert({
            kind: 'suspected_csam',
            user_id: user.id,
            sha256,
            phash: clean.phash,
            provider: imageVerdict.provider,
            categories: imageVerdict.categories ?? null
          });
        }
      }
      // detail tells the uploader what to fix: links | personal_info | impersonation | hate |
      // threat | sexual | spam | rules (OpenAI) | image
      const detail = textVerdict.decision === 'reject' ? textVerdict.category ?? 'rules' : 'image';
      await logRejection(user.id, detail === 'image' ? 'image' : 'text', detail);
      return json(req, 422, { ok: false, error: PUBLISH_ERRORS.REJECTED, status, detail });
    }

    // Lineage: generation and root come from the (approved) parent row, not the request.
    let parentId = null;
    let rootId = null;
    let generation = 0;
    if (input.parentId) {
      const { data: parent } = await admin
        .from('memes')
        .select('id, generation, root_meme_id, status')
        .eq('id', input.parentId)
        .maybeSingle();
      if (parent && parent.status === 'approved') {
        parentId = parent.id;
        rootId = parent.root_meme_id || parent.id;
        generation = (parent.generation || 0) + 1;
      }
    }

    // Owner-added categories live in public.meme_categories (managed from /admin).
    let category = input.category;
    if (input.requestedCategory && input.requestedCategory !== category) {
      const { data: cat } = await admin
        .from('meme_categories')
        .select('id')
        .eq('id', input.requestedCategory)
        .eq('active', true)
        .maybeSingle();
      if (cat?.id) category = cat.id;
    }

    const id = crypto.randomUUID();
    const imageUrl = await putPublic(`u/${id}.${clean.ext}`, clean.data, clean.contentType);
    const posterUrl = clean.poster
      ? await putPublic(`posters/${id}.${clean.poster.ext}`, clean.poster.data, clean.poster.contentType)
      : null;
    const baseImageUrl = base ? await putPublic(`bases/${id}.${base.ext}`, base.data, base.contentType) : null;

    const row = {
      id,
      title: input.title,
      category,
      image_url: imageUrl,
      author_name: authorNameFor(user, profile),
      user_id: user.id,
      score: 1,
      parent_meme_id: parentId,
      root_meme_id: rootId,
      generation,
      media_type: clean.kind,
      poster_url: posterUrl,
      width: clean.width,
      height: clean.height,
      overlay: input.overlay,
      base_image_url: baseImageUrl ?? (clean.kind === 'gif' ? imageUrl : null),
      is_bounty: Boolean(input.isBounty),
      bounty_id: input.bountyId,
      status,
      sha256,
      phash: clean.phash,
      moderation
    };
    const { data: inserted, error } = await admin.from('memes').insert(row).select().single();
    if (error || !inserted) {
      await admin.storage
        .from(PUBLIC_BUCKET)
        .remove([`u/${id}.${clean.ext}`, `posters/${id}.webp`, `bases/${id}.webp`]);
      return fail(req, 500, PUBLISH_ERRORS.SERVER);
    }

    if (input.isBounty && input.bountyId && input.bountyId.startsWith('battle-')) {
      const battleDate = input.bountyId.slice('battle-'.length);
      const layerTexts = (input.overlay?.layers || [])
        .map((l: Record<string, unknown>) => String(l?.text || '').trim())
        .filter(Boolean);
      const topText = layerTexts[0] || input.title;
      const bottomText = layerTexts.length > 1 ? layerTexts.slice(1).join(' / ') : '';
      await admin.from('caption_battle_entries').insert({
        battle_date: battleDate,
        template_id: cleanText(body.templateId || 'tpl-drake-compare', 64) || 'tpl-drake-compare',
        user_id: user.id,
        author_name: inserted.author_name,
        top_text: topText.slice(0, 140),
        bottom_text: bottomText.slice(0, 140),
        meme_id: inserted.id,
        status: inserted.status,
        moderation
      });
    }
    return json(req, 200, { ok: true, status, meme: inserted });
  } catch {
    return fail(req, 500, PUBLISH_ERRORS.SERVER);
  } finally {
    await admin.storage.from(QUARANTINE_BUCKET).remove(toDelete).catch(() => {});
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, PUBLISH_ERRORS.BAD_REQUEST);

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return fail(req, 401, PUBLISH_ERRORS.SIGN_IN_REQUIRED);

  const profile = await ensureCallerProfile(user.id);
  if (isProfileSuspended(profile)) {
    return json(req, 403, {
      ok: false,
      error: 'suspended',
      suspended_until: profile?.suspended_until ?? null
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(req, 400, PUBLISH_ERRORS.BAD_REQUEST);
  }

  if (body?.action === 'sign-upload') return handleSignUpload(req, user.id, body);
  if (body?.action === 'publish') return handlePublish(req, user, body, profile);
  return fail(req, 400, PUBLISH_ERRORS.BAD_REQUEST);
});
