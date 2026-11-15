// ==========================================
// Supabase Edge Function: profile (Phase 33 task 33.6)
//
// Lets non-anonymous, non-suspended accounts claim or change their unique username.
// Enforces 3-20 char format, reserved list, generated-anon-handle guard, and 33.4 text moderation
// (local blocklist + OpenAI omni-moderation, fail closed). Updates public.profiles.username and
// syncs existing public.memes / public.comments author_name rows owned by the caller.
//
// POST { username } -> { ok: true, username }
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { validateUsername, isProfileSuspended } from '../_shared/identity.js';
import { moderateText } from '../_shared/moderation.js';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'bad_request' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json(req, 401, { ok: false, error: 'sign_in_required' });
  if (user.is_anonymous) return json(req, 403, { ok: false, error: 'upgrade_required' });

  await admin.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, username, role, strikes, suspended_until')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr) return json(req, 500, { ok: false, error: 'server_error' });
  if (isProfileSuspended(profile)) {
    return json(req, 403, {
      ok: false,
      error: 'suspended',
      suspended_until: profile?.suspended_until ?? null
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'bad_request' });
  }

  const v = validateUsername(payload?.username);
  if (!v.ok) {
    return json(req, 422, { ok: false, error: v.error, detail: v.detail ?? null });
  }

  const verdict = await moderateText({ texts: [v.username], env: Deno.env });
  if (verdict.decision === 'reject') {
    return json(req, 422, { ok: false, error: 'rejected', detail: verdict.category ?? 'rules' });
  }
  if (verdict.decision !== 'approve') {
    return json(req, 503, { ok: false, error: 'moderation_unavailable' });
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ username: v.username, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateErr) {
    if (updateErr.code === '23505') {
      return json(req, 409, { ok: false, error: 'username_taken' });
    }
    if (updateErr.code === '23514') {
      return json(req, 422, { ok: false, error: 'reserved_name' });
    }
    return json(req, 500, { ok: false, error: 'server_error' });
  }

  // Keep existing authored rows in sync with the claimed handle.
  await admin.from('memes').update({ author_name: v.username }).eq('user_id', user.id);
  await admin.from('comments').update({ author_name: v.username }).eq('user_id', user.id);

  return json(req, 200, { ok: true, username: v.username });
});
