// ==========================================
// Supabase Edge Function: delete-account (Phase 33 task 33.11)
//
// Permanently deletes the signed-in caller's account, authored memes, comments,
// votes, reactions, notifications, profile, and uploaded storage objects.
// Deploy: supabase functions deploy delete-account
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { collectUserStoragePaths } from '../_shared/accountCleanup.js';

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

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'bad_request' });
  }
  if (payload?.confirm !== true) {
    return json(req, 400, { ok: false, error: 'confirmation_required' });
  }

  try {
    const { data: userMemes } = await admin
      .from('memes')
      .select('id, image_url, poster_url, base_image_url')
      .eq('user_id', user.id);

    const fileKeys = collectUserStoragePaths(Array.isArray(userMemes) ? userMemes : []);
    if (fileKeys.length > 0) {
      await admin.storage.from('memes').remove(fileKeys);
    }

    // Best-effort cleanup of any quarantine files staged by this user
    const { data: qList } = await admin.storage.from('quarantine').list(user.id, { limit: 100 });
    if (Array.isArray(qList) && qList.length > 0) {
      await admin.storage
        .from('quarantine')
        .remove(qList.map((entry) => `${user.id}/${entry.name}`));
    }

    // Delete dependent records owned by caller cleanly
    await admin.from('notifications').delete().eq('recipient_id', user.id);
    await admin.from('notifications').delete().eq('actor_id', user.id);
    await admin.from('votes').delete().eq('user_id', user.id);
    await admin.from('reactions').delete().eq('user_id', user.id);
    await admin.from('comments').delete().eq('user_id', user.id);
    await admin.from('memes').delete().eq('user_id', user.id);
    await admin.from('profiles').delete().eq('id', user.id);

    const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteAuthErr) {
      return json(req, 500, { ok: false, error: 'server_error' });
    }

    return json(req, 200, {
      ok: true,
      deletedMemes: Array.isArray(userMemes) ? userMemes.length : 0,
      removedFiles: fileKeys.length
    });
  } catch {
    return json(req, 500, { ok: false, error: 'server_error' });
  }
});
