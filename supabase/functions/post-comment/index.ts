// ==========================================
// Supabase Edge Function: post-comment  (Phase 33 task 33.4)
//
// The only way to add a comment (migration 20261115000004 removes the public INSERT policy on
// `comments`). Every comment passes text moderation first:
//   local blocklist / links / personal info / impersonation → instant 422 with `detail`
//   OpenAI omni-moderation → reject 422, or "couldn't check" 503 (fail closed: never posted
//   unchecked).
// The author name comes from the signed-in account (anonymous users = "AnonMemer"), never
// from the request. Comments are only allowed on approved memes. Max 280 characters.
//
// POST { memeId, body }  →  { ok: true, comment }
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic), OPENAI_API_KEY (secret).
// Rate limits and bot checks arrive in task 33.7.
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { cleanText, isUuid } from '../_shared/publishCore.js';
import { moderateText } from '../_shared/moderation.js';
import { authorNameFor, isProfileSuspended } from '../_shared/identity.js';

const COMMENT_MAX = 280;

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

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'bad_request' });
  }
  const memeId = typeof payload?.memeId === 'string' ? payload.memeId.toLowerCase() : '';
  const rawBody = String(payload?.body ?? '');
  if (!isUuid(memeId)) return json(req, 400, { ok: false, error: 'bad_request' });
  if (rawBody.trim().length > COMMENT_MAX) return json(req, 400, { ok: false, error: 'too_long' });
  const body = cleanText(rawBody, COMMENT_MAX);
  if (!body) return json(req, 400, { ok: false, error: 'bad_request' });

  const { data: meme } = await admin.from('memes').select('id, status').eq('id', memeId).maybeSingle();
  if (!meme || meme.status !== 'approved') return json(req, 404, { ok: false, error: 'meme_not_found' });

  const verdict = await moderateText({ texts: [body], env: Deno.env });
  if (verdict.decision === 'reject') {
    return json(req, 422, { ok: false, error: 'rejected', detail: verdict.category ?? 'rules' });
  }
  if (verdict.decision !== 'approve') {
    return json(req, 503, { ok: false, error: 'comment_check_unavailable' });
  }

  const { data: comment, error } = await admin
    .from('comments')
    .insert({ meme_id: memeId, author_name: authorNameFor(user, profile), body, user_id: user.id })
    .select('id, meme_id, author_name, body, created_at')
    .single();
  if (error || !comment) return json(req, 500, { ok: false, error: 'server_error' });
  return json(req, 200, { ok: true, comment });
});
