import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { STARTER_MEMES } from '../src/data/starterMemes.js';
import { SITE_ORIGIN, DEFAULT_OG_IMAGE } from '../src/data/seoRoutes.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const DEFAULT_SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

function getStoragePublicPrefix() {
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/memes/`;
}

export function toAbsoluteUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_OG_IMAGE;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('..') || /\s/.test(trimmed)) return DEFAULT_OG_IMAGE;
  const storagePrefix = getStoragePublicPrefix();
  if (trimmed.startsWith('/seed/') && trimmed.length > '/seed/'.length) {
    return `${SITE_ORIGIN}${trimmed}`;
  }
  if (trimmed.startsWith(storagePrefix) && trimmed.length > storagePrefix.length) {
    return trimmed;
  }
  if (trimmed.startsWith(`${SITE_ORIGIN}/seed/`) && trimmed.length > `${SITE_ORIGIN}/seed/`.length) {
    return trimmed;
  }
  return DEFAULT_OG_IMAGE;
}

function replaceMeta(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

async function loadBaseIndexHtml() {
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html')
  ];
  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      if (content && content.includes('id="root"')) {
        return content;
      }
    } catch {
      // try next source
    }
  }

  // Never 302 redirect Googlebot when dist/index.html isn't mounted in Lambda:
  // fetch the static /index.html shell directly.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(`${SITE_ORIGIN}/index.html`, {
      headers: { Accept: 'text/html' },
      signal: controller.signal
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.includes('id="root"')) {
        return text;
      }
    }
  } catch {
    // fall back to standalone semantic 200 OK HTML document below
  } finally {
    clearTimeout(timer);
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>THE MEMES.net — Community Meme &amp; 80s Cyber-Arcade</title>
    <meta name="description" content="Explore funny community memes, remix templates, and play 80s Cyber-Arcade games on THE MEMES.net." />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${SITE_ORIGIN}/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="THE MEMES.net" />
    <meta property="og:description" content="Community Memes &amp; 80s Cyber-Arcade" />
    <meta property="og:url" content="${SITE_ORIGIN}/" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="THE MEMES.net" />
    <meta name="twitter:description" content="Community Memes &amp; 80s Cyber-Arcade" />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
  </head>
  <body style="background:#070810;color:#f8fafc;font-family:system-ui,sans-serif;">
    <div id="root"></div>
  </body>
</html>`;
}

async function fetchLiveMeme(memeId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || !memeId) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1600);
  try {
    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/memes?id=eq.${encodeURIComponent(
      String(memeId)
    )}&status=eq.approved&select=id,title,image_url,poster_url,media_type,category,author_name,score,created_at&limit=1`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Task 33.5: 'approved' | 'gone' (removed or rejected) | 'missing' (unknown or still pending).
async function fetchMemePublicState(memeId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memeId)) return 'missing';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1600);
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/meme_public_state`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ p_id: memeId }),
      signal: controller.signal
    });
    if (!res.ok) return 'missing';
    const state = await res.json();
    return typeof state === 'string' ? state : 'missing';
  } catch {
    return 'missing';
  } finally {
    clearTimeout(timer);
  }
}

function goneHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>This meme has been removed | THE MEMES.net</title>
    <meta name="robots" content="noindex" />
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#070810;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px;box-sizing:border-box;">
    <main style="max-width:420px;">
      <div style="font-size:56px;">🧹</div>
      <h1 style="font-size:24px;margin:8px 0;">This meme has left the building</h1>
      <p style="color:#94a3b8;line-height:1.5;">It was removed because it broke the House Rules. Plenty more where that came from.</p>
      <a href="/" style="display:inline-block;margin-top:12px;padding:12px 20px;border-radius:12px;background:#ff2d78;color:#fff;text-decoration:none;font-weight:700;">Back to the feed</a>
    </main>
  </body>
</html>`;
}

export default async function handler(req, res) {
  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const memeId = String(rawId || '').trim().slice(0, 128);

  let html = await loadBaseIndexHtml();

  let meme = STARTER_MEMES.find((m) => String(m.id) === memeId) || null;
  if (!meme && memeId) {
    meme = await fetchLiveMeme(memeId);
    if (!meme && (await fetchMemePublicState(memeId)) === 'gone') {
      res.statusCode = 410;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
      res.setHeader('X-Robots-Tag', 'noindex');
      res.end(goneHtml());
      return;
    }
  }
  if (!meme && /^(?:seed|tpl)-[a-z0-9-]+$/i.test(memeId)) {
    meme = {
      id: memeId,
      title: memeId.replace(/^(?:seed|tpl)-/i, '').replaceAll('-', ' '),
      author_name: 'TheMemesHQ',
      score: 1,
      media_type: 'image',
      image_url: `/seed/${memeId}.webp`
    };
  }

  if (meme) {
    const titleText = `${meme.title || 'Funny Meme'} — @${meme.author_name || 'Anon'} | THE MEMES.net`;
    const descText = `Laugh, upvote (${Number(meme.score || 1)} pts), or remix "${
      meme.title || 'this meme'
    }" by adding your own top & bottom text free on THE MEMES.net.`;
    const canonicalUrl = `${SITE_ORIGIN}/m/${encodeURIComponent(String(meme.id))}`;
    const rawImg = meme.media_type === 'video' ? meme.poster_url || DEFAULT_OG_IMAGE : meme.image_url;
    const ogImg = toAbsoluteUrl(rawImg);

    const safeTitle = escapeHtml(titleText);
    const safeDesc = escapeHtml(descText);
    const safeUrl = escapeHtml(canonicalUrl);
    const safeImg = escapeHtml(ogImg);

    html = replaceMeta(html, /<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
    html = replaceMeta(
      html,
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    );
    html = replaceMeta(
      html,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${safeUrl}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${safeUrl}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${safeImg}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${safeTitle}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    );
    html = replaceMeta(
      html,
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${safeImg}" />`
    );

    const articleMarkup = `<main class="tm-seo-prerender" data-meme-id="${escapeHtml(String(meme.id))}" style="min-height:100vh;background:#070810;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;"><article style="max-width:720px;margin:0 auto;"><h1 style="margin:0 0 12px;font-size:28px;">${escapeHtml(meme.title || 'Meme')}</h1><p style="color:#94a3b8;margin:0 0 16px;">By @${escapeHtml(meme.author_name || 'Anon')} · Category #${escapeHtml(meme.category || 'dank')} · Score ${Number(meme.score || 1)}</p><img src="${safeImg}" alt="${escapeHtml(meme.title || 'Meme')}" style="max-width:100%;height:auto;border-radius:12px;display:block;margin-bottom:16px;" /><p style="line-height:1.6;color:#cbd5e1;">${safeDesc}</p><a href="/" style="color:#00f5ff;">← Back to THE MEMES.net Feed &amp; 80s Cyber-Arcade</a></article></main>`;
    html = replaceMeta(html, /<div\s+id="root">[\s\S]*?<\/div>/i, `<div id="root">${articleMarkup}</div>`);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.end(html);
}
