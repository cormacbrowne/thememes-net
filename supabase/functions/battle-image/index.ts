// ==========================================
// Supabase Edge Function: battle-image (plan 2.1)
// Moderators upload a Daily Caption Battle image. The admin page converts it to WebP
// (max 1080 px) in the browser first; this function only accepts a real WebP under 1.5 MB
// from a signed-in moderator/admin, stores it at memes/battles/<uuid>.webp and returns its URL.
// The URL is then passed to the admin_schedule_battle() RPC (which checks the role again).
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false }
});
const MAX_BYTES = 1.5 * 1024 * 1024;
const ORIGINS = ['https://thememes.net', 'https://www.thememes.net', 'http://localhost:5173', 'http://localhost:4173'];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[1],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { ok: false, error: 'bad_request' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json(req, 401, { ok: false, error: 'sign_in_required' });
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['moderator', 'admin'].includes(profile.role)) return json(req, 403, { ok: false, error: 'forbidden' });

  const bytes = new Uint8Array(await req.arrayBuffer());
  const ascii = (a: number, b: number) => String.fromCharCode(...bytes.subarray(a, b));
  if (bytes.length < 32 || bytes.length > MAX_BYTES || ascii(0, 4) !== 'RIFF' || ascii(8, 12) !== 'WEBP') {
    return json(req, 400, { ok: false, error: 'not_webp_or_too_big' });
  }
  const path = `battles/${crypto.randomUUID()}.webp`;
  const up = await admin.storage.from('memes').upload(path, bytes, { contentType: 'image/webp', cacheControl: '31536000' });
  if (up.error) return json(req, 500, { ok: false, error: 'upload_failed' });
  return json(req, 200, { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/memes/${path}` });
});
