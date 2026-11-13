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

function toAbsoluteUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_OG_IMAGE;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/')) return `${SITE_ORIGIN}${trimmed}`;
  if (trimmed.startsWith('https://')) return trimmed;
  return DEFAULT_OG_IMAGE;
}

function replaceMeta(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

async function fetchLiveMeme(memeId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || !memeId) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1600);
  try {
    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/memes?id=eq.${encodeURIComponent(
      String(memeId)
    )}&select=id,title,image_url,poster_url,media_type,category,author_name,score&limit=1`;
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

export default async function handler(req, res) {
  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const memeId = String(rawId || '').trim().slice(0, 128);

  let html;
  try {
    html = await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  } catch {
    res.statusCode = 302;
    res.setHeader('Location', memeId ? `/?m=${encodeURIComponent(memeId)}` : '/');
    res.end();
    return;
  }

  let meme = STARTER_MEMES.find((m) => String(m.id) === memeId) || null;
  if (!meme && memeId) {
    meme = await fetchLiveMeme(memeId);
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
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.end(html);
}
