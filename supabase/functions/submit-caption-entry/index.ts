// ==========================================
// Supabase Edge Function: submit-caption-entry (Phase 33 task 33.15)
//
// Submits a caption entry for Today's Daily Caption Battle:
//   - Requires real authenticated / anonymous Supabase session (`auth.uid()`).
//   - Blocks suspended accounts, verifies Turnstile & 'upload' rate limits (33.7).
//   - Checks both top & bottom captions through `moderateText` (33.4, fail closed).
//   - Inserts into `public.caption_battle_entries` with server-derived `author_name`.
//
// Deploy: supabase functions deploy submit-caption-entry --no-verify-jwt
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { authorNameFor, isProfileSuspended } from '../_shared/identity.js';
import { moderateText } from '../_shared/moderation.js';
import { BOT_ERROR_MESSAGES, extractClientIp, ipHashFor, verifyTurnstile } from '../_shared/rateLimitAndBot.js';
import { decideCaptionEntryStatus, validateCaptionEntryRequest } from '../_shared/captionBattleCore.js';

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
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
const ENV_ORIGINS = (Deno.env.get('PUBLISH_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ORIGINS = ENV_ORIGINS.length ? ENV_ORIGINS : DEFAULT_ORIGINS;

function cors(req: Request): Record<string, string> {
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
    headers: { ...cors(req), 'Content-Type': 'application/json', ...extraHeaders }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'bad_request' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json(req, 401, { ok: false, error: 'sign_in_required' });

  await admin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, role, strikes, suspended_until')
    .eq('id', user.id)
    .maybeSingle();

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
    return json(req, 400, { ok: false, error: 'bad_request' });
  }

  const parsed = validateCaptionEntryRequest(body);
  if (!parsed.ok) {
    return json(req, 400, { ok: false, error: parsed.error });
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
  const { data: rl, error: rlErr } = await admin.rpc('check_and_record_rate_limit', {
    p_user_id: user.id,
    p_action: 'upload',
    p_ip_hash: ipHash,
    p_record: true
  });
  if (rlErr) return json(req, 500, { ok: false, error: 'server_error' });
  if (!rl?.ok) {
    return json(req, 429, rl, {
      'Retry-After': String(rl?.retry_after_seconds || 15)
    });
  }

  const verdict = await moderateText({ texts: parsed.value.texts, env: Deno.env });
  const status = decideCaptionEntryStatus(verdict);
  if (status === 'rejected') {
    await admin.from('upload_rejections').insert({
      user_id: user.id,
      kind: 'text',
      detail: verdict.category ?? 'rules'
    });
    return json(req, 422, {
      ok: false,
      error: 'rejected',
      status: 'rejected',
      detail: verdict.category ?? 'rules'
    });
  }

  const row = {
    battle_date: parsed.value.battleDate,
    template_id: parsed.value.templateId,
    user_id: user.id,
    author_name: authorNameFor(user, profile),
    top_text: parsed.value.topText,
    bottom_text: parsed.value.bottomText,
    score: 0,
    status,
    moderation: { text: verdict, checked_at: new Date().toISOString() }
  };

  const { data: entry, error } = await admin
    .from('caption_battle_entries')
    .insert(row)
    .select('id, battle_date, template_id, user_id, author_name, top_text, bottom_text, score, status, created_at')
    .single();

  if (error || !entry) {
    return json(req, 500, { ok: false, error: 'server_error' });
  }

  return json(req, 200, { ok: true, status, entry });
});
