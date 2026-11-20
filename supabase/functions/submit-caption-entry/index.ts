// ==========================================
// Supabase Edge Function: submit-caption-entry (Phase 33 task 33.15)
//
// Submits a caption entry for Today's Daily Caption Battle:
//   - Requires real authenticated / anonymous Supabase session (`auth.uid()`).
//   - Blocks suspended accounts, verifies Turnstile & 'upload' rate limits (33.7).
//   - Checks both top & bottom captions through `moderateText` (33.4, fail closed).
//   - Inserts into `public.caption_battle_entries` with server-derived `author_name`.
//   - Plan 2.1 (v2, when the body has `battleId`): enters the battle that is LIVE right now
//     (public.battles), one entry per user per battle, editable until the battle closes
//     (an edit is re-moderated and resets that entry's votes), total caption length capped
//     by battle_settings.caption_max.
//
// Deploy: supabase functions deploy submit-caption-entry --no-verify-jwt
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { authorNameFor, isProfileSuspended } from '../_shared/identity.js';
import { moderateText } from '../_shared/moderation.js';
import { BOT_ERROR_MESSAGES, extractClientIp, ipHashFor, verifyTurnstile } from '../_shared/rateLimitAndBot.js';
import {
  decideCaptionEntryStatus,
  decideEntryWrite,
  validateBattleEntryRequest,
  validateCaptionEntryRequest
} from '../_shared/captionBattleCore.js';

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

  // v2 (plan 2.1): the battle comes from the server, never from the client's clock.
  const isV2 = typeof body?.battleId === 'string';
  let live: { id: string; battle_day: string; template_id: string | null } | null = null;
  // deno-lint-ignore no-explicit-any
  let parsed: any;
  if (isV2) {
    const [{ data: liveRow }, { data: settings }] = await Promise.all([
      admin
        .from('battles')
        .select('id, battle_day, template_id')
        .eq('status', 'live')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from('battle_settings').select('caption_max').eq('id', true).maybeSingle()
    ]);
    live = liveRow ?? null;
    const v2 = validateBattleEntryRequest(body, live?.id, settings?.caption_max);
    if (!v2.ok) return json(req, 400, { ok: false, error: v2.error, max: v2.max });
    parsed = {
      ok: true,
      value: {
        battleDate: String(live!.battle_day),
        templateId: live!.template_id || 'custom',
        topText: v2.value.topText,
        bottomText: v2.value.bottomText,
        texts: v2.value.texts
      }
    };
  } else {
    parsed = validateCaptionEntryRequest(body);
    if (!parsed.ok) {
      return json(req, 400, { ok: false, error: parsed.error });
    }
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

  const { data: modCfg } = await admin
    .from('moderation_settings')
    .select('extra_blocked_terms')
    .eq('id', 1)
    .maybeSingle();
  const extraTerms = Array.isArray(modCfg?.extra_blocked_terms) ? modCfg.extra_blocked_terms : [];
  const verdict = await moderateText({ texts: parsed.value.texts, env: Deno.env, extraTerms });
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

  if (isV2 && live) {
    const { data: existing } = await admin
      .from('caption_battle_entries')
      .select('id, status')
      .eq('battle_id', live.id)
      .eq('user_id', user.id)
      .maybeSingle();
    const action = decideEntryWrite(existing);
    if (action === 'refuse') return json(req, 403, { ok: false, error: 'entry_removed' });
    const select = 'id, battle_id, battle_date, template_id, user_id, author_name, top_text, bottom_text, score, status, created_at, updated_at';
    if (action === 'update') {
      // Edits are allowed until close, but votes cast on the old caption no longer count.
      await admin.from('caption_battle_votes').delete().eq('entry_id', existing!.id);
      const { data: updated, error: upErr } = await admin
        .from('caption_battle_entries')
        .update({
          top_text: row.top_text,
          bottom_text: row.bottom_text,
          author_name: row.author_name,
          status,
          score: 0,
          moderation: row.moderation,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing!.id)
        .select(select)
        .single();
      if (upErr || !updated) return json(req, 500, { ok: false, error: 'server_error' });
      return json(req, 200, { ok: true, status, entry: updated, edited: true });
    }
    const { data: created, error: insErr } = await admin
      .from('caption_battle_entries')
      .insert({ ...row, battle_id: live.id })
      .select(select)
      .single();
    if (insErr || !created) return json(req, 500, { ok: false, error: 'server_error' });
    return json(req, 200, { ok: true, status, entry: created, edited: false });
  }

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
