// ==========================================
// Supabase Edge Function: ai-caption  (AI Caption Writer)
//
// POST { idea, picture?, template?, slots?: string[] (caption box labels), turnstileToken? }
//   → 200 { ok: true, options: [{ lines, top, bottom }], quota: { tier, limit, used, remaining, resets_at } }
// POST { action: 'quota' }  → 200 { ok: true, quota }   (no use taken; for the "N left" badge)
//
// Order of checks (cheapest first, nothing is charged until the AI actually answers):
//   1. session (anonymous sessions allowed) + suspension check
//   2. Turnstile bot check (only when TURNSTILE_SECRET_KEY is set)
//   3. the IDEA goes through the same text moderation as comments (local blocklist + OpenAI
//      omni-moderation, free). Rejected → 422; checker down → 503 (fail closed).
//   4. quota claim (public.ai_caption_quota: 25/month accounts, 3/month + 3/day/IP anonymous,
//      2000/day site-wide)
//   5. OpenAI chat completion writes 3 captions (text only, no images)
//   6. every CAPTION goes through text moderation again; anything not 'approve' is dropped
//   7. no usable captions / AI error → the use is refunded
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic), OPENAI_API_KEY (secret, already used
// for moderation), optional AI_CAPTION_MODEL (default gpt-5-nano), AI_CAPTION_REASONING_EFFORT
// (default 'minimal'; set to 'none' to omit), TURNSTILE_SECRET_KEY, PUBLISH_ALLOWED_ORIGINS.
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { moderateText } from '../_shared/moderation.js';
import { isProfileSuspended } from '../_shared/identity.js';
import { verifyTurnstile, extractClientIp, ipHashFor, BOT_ERROR_MESSAGES } from '../_shared/rateLimitAndBot.js';
import { AI_CAPTION, parseCaptionRequest, buildCompletionRequest, parseCompletion } from '../_shared/aiCaptionCore.js';

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
    Vary: 'Origin'
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });
}

function quotaView(q: Record<string, unknown>) {
  return { tier: q.tier, limit: q.limit, used: q.used, remaining: q.remaining, resets_at: q.resets_at };
}

async function callOpenAi(parsed: { idea: string; picture: string; template: string; slots: string[] }) {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return { error: 'missing_api_key' };
  const model = Deno.env.get('AI_CAPTION_MODEL') || AI_CAPTION.defaultModel;
  const effortEnv = Deno.env.get('AI_CAPTION_REASONING_EFFORT');
  const reasoningEffort = effortEnv === 'none' ? '' : effortEnv || 'minimal';

  const send = async (effort: string) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AI_CAPTION.timeoutMs);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildCompletionRequest(parsed, { model, reasoningEffort: effort })),
        signal: ctrl.signal
      });
      const body = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, body };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let r = await send(reasoningEffort);
    // A model that does not take reasoning_effort answers 400: try once more without it.
    if (r.status === 400 && reasoningEffort) r = await send('');
    if (!r.ok) {
      console.error('ai-caption openai error', r.status, r.body?.error?.code ?? r.body?.error?.type ?? '');
      return { error: `http_${r.status}` };
    }
    return { options: parseCompletion(r.body, parsed.slots.length), usage: r.body?.usage ?? null, model };
  } catch (err) {
    return { error: (err as Error)?.name === 'AbortError' ? 'timeout' : 'network' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'bad_request' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json(req, 401, { ok: false, error: 'sign_in_required' });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'bad_request' });
  }

  const ipHash = await ipHashFor(req.headers);

  // Read-only quota lookup for the badge.
  if (payload?.action === 'quota') {
    const { data: q, error } = await admin.rpc('ai_caption_quota', { p_user_id: user.id, p_ip_hash: ipHash, p_claim: false });
    if (error || !q?.ok) return json(req, 500, { ok: false, error: 'server_error' });
    return json(req, 200, { ok: true, quota: quotaView(q) });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, suspended_until')
    .eq('id', user.id)
    .maybeSingle();
  if (isProfileSuspended(profile)) return json(req, 403, { ok: false, error: 'suspended' });

  const parsed = parseCaptionRequest(payload);
  if (!parsed.ok) return json(req, 400, { ok: false, error: parsed.error });

  const bot = await verifyTurnstile({
    token: typeof payload?.turnstileToken === 'string' ? payload.turnstileToken : '',
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

  // 1. Moderate what the user typed, before spending anything.
  const ideaVerdict = await moderateText({ texts: [parsed.idea, parsed.picture, parsed.template, ...parsed.slots], env: Deno.env });
  if (ideaVerdict.decision === 'reject') {
    return json(req, 422, { ok: false, error: 'rejected', detail: ideaVerdict.category ?? 'rules' });
  }
  if (ideaVerdict.decision !== 'approve') {
    const down = String(ideaVerdict.reason ?? '').startsWith('provider_unavailable') || ideaVerdict.provider === 'none';
    return down
      ? json(req, 503, { ok: false, error: 'ai_unavailable' })
      : json(req, 422, { ok: false, error: 'rejected', detail: 'rules' });
  }

  // 2. Take one free use (atomic).
  const { data: claim, error: claimErr } = await admin.rpc('ai_caption_quota', {
    p_user_id: user.id,
    p_ip_hash: ipHash,
    p_claim: true
  });
  if (claimErr || !claim) return json(req, 500, { ok: false, error: 'server_error' });
  if (!claim.ok) {
    if (claim.error === 'ai_quota_used') return json(req, 429, { ok: false, error: 'ai_quota_used', quota: quotaView(claim) });
    if (claim.error === 'ai_busy') return json(req, 429, { ok: false, error: 'ai_busy' });
    return json(req, 400, { ok: false, error: claim.error ?? 'bad_request' });
  }
  const refund = () => admin.rpc('ai_caption_refund', { p_usage_id: claim.usage_id, p_user_id: user.id });
  const refundedQuota = () => quotaView({ ...claim, used: claim.used - 1, remaining: claim.remaining + 1 });

  // 3. Ask the AI for captions.
  const ai = await callOpenAi(parsed);
  if ('error' in ai || !ai.options?.length) {
    await refund();
    return json(req, 503, { ok: false, error: 'ai_unavailable', quota: refundedQuota() });
  }

  // 4. Moderate every caption the AI wrote; keep only clean ones.
  const checks = await Promise.all(
    ai.options.map((o) => moderateText({ texts: o.lines, env: Deno.env }))
  );
  const options = ai.options.filter((_, i) => checks[i].decision === 'approve');
  if (!options.length) {
    await refund();
    const down = checks.every((c) => String(c.reason ?? '').startsWith('provider_unavailable'));
    return json(req, down ? 503 : 422, {
      ok: false,
      error: down ? 'ai_unavailable' : 'no_safe_captions',
      quota: refundedQuota()
    });
  }

  return json(req, 200, { ok: true, options, quota: quotaView(claim) });
});
