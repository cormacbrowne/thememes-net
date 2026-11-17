// ==========================================
// Supabase Edge Function: moderate  (Phase 33 task 33.5)
//
// Moderator decisions from /admin/moderation. The caller must be signed in and have
// profiles.role = 'moderator' | 'admin' (checked here AND again inside the
// service-role-only SQL function public.mod_apply_decision, which also writes the
// moderation_actions log, resolves the reports, bans hashes and suspends accounts).
//
// POST { memeId | commentId, decision: approve | remove | remove_ban_hash | remove_suspend, note? }
//   → { ok: true, decision, files: { moved, deleted } }
//
// For a removed meme the public files leave the public bucket:
//   * normal removals: moved to the PRIVATE quarantine bucket under removed/<memeId>/ (appeals)
//   * reports for "Involves a child": deleted, never copied (owner's legal procedure applies;
//     the hashes stay in banned_hashes / moderation_incidents).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic).
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { memeUrl, submitIndexNow } from '../_shared/indexNow.js';
import { parseDecisionRequest, publicObjectFromUrl, removedArchivePath } from '../_shared/moderationQueue.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false }
});
const QUARANTINE_BUCKET = 'quarantine';

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

async function takeDownFile(url: string | null, memeId: string, keepCopy: boolean, others: string[]) {
  const obj = publicObjectFromUrl(url ?? '', SUPABASE_URL);
  if (!obj) return null;
  // Never touch a file another live meme still points at (e.g. a shared base image).
  if (others.includes(url ?? '')) return null;
  if (keepCopy) {
    const { data } = await admin.storage.from(obj.bucket).download(obj.path);
    if (data) {
      await admin.storage
        .from(QUARANTINE_BUCKET)
        .upload(removedArchivePath(memeId, obj.path), data, {
          contentType: data.type || 'application/octet-stream',
          upsert: true
        })
        .catch(() => {});
    }
  }
  const { error } = await admin.storage.from(obj.bucket).remove([obj.path]);
  return error ? null : obj.path;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'bad_request' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json(req, 401, { ok: false, error: 'sign_in_required' });

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['moderator', 'admin'].includes(profile.role)) {
    return json(req, 403, { ok: false, error: 'not_moderator' });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { ok: false, error: 'bad_request' });
  }
  const parsed = parseDecisionRequest(body);
  if (!parsed.ok) return json(req, 400, { ok: false, error: parsed.error });

  const { data: result, error } = await admin.rpc('mod_apply_decision', {
    p_moderator: user.id,
    p_meme_id: parsed.memeId,
    p_comment_id: parsed.commentId,
    p_decision: parsed.decision,
    p_note: parsed.note
  });
  if (error || !result) return json(req, 500, { ok: false, error: 'server_error' });
  if (!result.ok) return json(req, result.error === 'not_found' ? 404 : 400, result);

  const files = { moved: [] as string[], deleted: [] as string[] };
  // IndexNow: an approved meme page is now public; a removed one now returns 410. Both need a recrawl.
  if (parsed.memeId) {
    const task = submitIndexNow([memeUrl(parsed.memeId)]);
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(task);
  }
  if (parsed.memeId && parsed.decision !== 'approve') {
    const urls = [result.image_url, result.poster_url, result.base_image_url].filter(Boolean) as string[];
    const others: string[] = [];
    for (const col of ['image_url', 'base_image_url', 'poster_url']) {
      const { data: sharing } = await admin
        .from('memes')
        .select(col)
        .neq('id', parsed.memeId)
        .neq('status', 'removed')
        .in(col, urls);
      for (const r of (sharing ?? []) as Record<string, string>[]) others.push(r[col]);
    }
    const keepCopy = !result.child;
    for (const url of new Set(urls)) {
      const done = await takeDownFile(url, parsed.memeId, keepCopy, others);
      if (done) (keepCopy ? files.moved : files.deleted).push(done);
    }
  }

  return json(req, 200, { ok: true, decision: parsed.decision, suspended_until: result.suspended_until, files });
});
