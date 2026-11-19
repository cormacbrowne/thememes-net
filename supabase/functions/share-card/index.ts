// ==========================================
// Supabase Edge Function: share-card  (link-preview image for every meme)
//
// GET /functions/v1/share-card?id=<meme uuid | seed-…>
//   → 200 image/jpeg, 1200×630: the meme over a blurred copy of itself + a THE MEMES.net bar
//     ("Make your own meme free"). Used as og:image / twitter:image by /m/<id> pages so every
//     shared link shows the meme AND advertises the site.
//
// Rules:
//   • Only approved memes. The status is checked on EVERY request, so a meme removed by a
//     moderator stops previewing straight away (cards live in a PRIVATE bucket and are only
//     ever served through this function).
//   • Sources are only fetched from this project's public storage or www.thememes.net/seed/
//     (no user-supplied URLs → no SSRF).
//   • First request renders with ImageMagick (~1–2 s) and caches the JPEG in `share-cards`;
//     later requests stream the cached file.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatic).
// ==========================================
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import * as Magick from 'npm:@imagemagick/magick-wasm@0.0.44';
import { renderShareCard } from '../_shared/shareCard.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SITE = 'https://www.thememes.net';
const BAR_URL = `${SITE}/og/share-bar.png`;
const CARD_BUCKET = 'share-cards';
const CARD_VERSION = 'v1';
const PUBLIC_PREFIX = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/memes/`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEED_RE = /^seed-[a-z]+-\d{1,3}$/;

const wasmBytes = await Deno.readFile(
  new URL('x86/magick.wasm', import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.44'))
);
await Magick.initializeImageMagick(wasmBytes);

let barBytes: Uint8Array | null = null;
async function getBar(): Promise<Uint8Array | null> {
  if (barBytes) return barBytes;
  try {
    const res = await fetch(BAR_URL);
    if (!res.ok) return null;
    const b = new Uint8Array(await res.arrayBuffer());
    if (b[0] !== 0x89 || b.length > 1_000_000) return null;
    barBytes = b;
    return b;
  } catch {
    return null;
  }
}

function notFound() {
  return new Response('not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
}

function jpeg(bytes: Uint8Array, maxAge: number) {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/** Where the picture for this meme comes from, or null if it must not be shown. */
async function sourceFor(id: string): Promise<{ url: string; maxAge: number } | null> {
  if (SEED_RE.test(id)) return { url: `${SITE}/seed/${id}.webp`, maxAge: 604800 };
  if (!UUID_RE.test(id)) return null;
  const { data: meme } = await admin
    .from('memes')
    .select('id, status, media_type, image_url, poster_url')
    .eq('id', id.toLowerCase())
    .maybeSingle();
  if (!meme || meme.status !== 'approved') return null;
  const raw = meme.media_type === 'image' ? meme.image_url : meme.poster_url || (meme.media_type === 'gif' ? meme.image_url : null);
  if (typeof raw !== 'string' || !raw.startsWith(PUBLIC_PREFIX) || raw.includes('..')) return null;
  return { url: raw, maxAge: 3600 };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method', { status: 405 });
  const id = (new URL(req.url).searchParams.get('id') || '').trim().replace(/\.jpe?g$/i, '').slice(0, 64);
  const src = await sourceFor(id);
  if (!src) return notFound();

  const key = `${CARD_VERSION}/${id.toLowerCase()}.jpg`;
  const cached = await admin.storage.from(CARD_BUCKET).download(key);
  if (cached.data) return jpeg(new Uint8Array(await cached.data.arrayBuffer()), src.maxAge);

  const bar = await getBar();
  if (!bar) return new Response('busy', { status: 503, headers: { 'Retry-After': '30' } });

  let memeBytes: Uint8Array;
  try {
    const res = await fetch(src.url);
    if (!res.ok) return notFound();
    memeBytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return new Response('busy', { status: 503, headers: { 'Retry-After': '30' } });
  }

  let card: Uint8Array;
  try {
    card = renderShareCard(Magick, memeBytes, bar);
  } catch (err) {
    console.error('share-card render failed', id, (err as Error)?.message);
    return notFound();
  }

  await admin.storage
    .from(CARD_BUCKET)
    .upload(key, card, { contentType: 'image/jpeg', cacheControl: '604800', upsert: true })
    .catch(() => {});
  return jpeg(card, src.maxAge);
});
