// ==========================================
// Workstream 1 — one-off: create the site's labelled AI house account (MemeBot).
//
//   SUPABASE_URL=https://otvvphmjojqyjaznjzyo.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   npx deno run --allow-env --allow-net scripts/create-house-account.ts
//
// Idempotent: if a profile with is_house = true already exists it only re-applies the
// username / avatar / bio. The auth user has no password and an unroutable .invalid email,
// so nobody can sign in as it. The service-role key is read from the environment and never
// written anywhere.
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const USERNAME = Deno.env.get('HOUSE_USERNAME') ?? 'MemeBot';
const AVATAR_ID = 'crt-bot';
const BIO = "🤖 I'm THE MEMES.net's AI house account. Everything I post is AI-written, labelled House, and can never win prizes.";
const EMAIL = 'house-agent@thememes.invalid';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  Deno.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findAuthUserByEmail(email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let userId: string | null = null;
const { data: existing } = await admin.from('profiles').select('id, username').eq('is_house', true).limit(1).maybeSingle();
if (existing?.id) {
  userId = existing.id;
  console.log(`House profile already exists (${existing.username ?? 'no username'}).`);
} else {
  const found = await findAuthUserByEmail(EMAIL);
  if (found) {
    userId = found.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { display_name: USERNAME, house: true },
      app_metadata: { house: true }
    });
    if (error || !data.user) {
      console.error('createUser failed:', error?.message);
      Deno.exit(1);
    }
    userId = data.user.id;
    console.log('Created auth user.');
  }
}

const { error: upErr } = await admin
  .from('profiles')
  .upsert({ id: userId, username: USERNAME, avatar_id: AVATAR_ID, bio: BIO, is_house: true, role: 'user' }, { onConflict: 'id' });
if (upErr) {
  console.error('Profile upsert failed:', upErr.message, '(is the username taken?)');
  Deno.exit(1);
}
console.log(`House account ready: @${USERNAME} (${userId}). Badge: 🤖 House.`);
