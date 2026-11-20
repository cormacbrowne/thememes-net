import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { STARTER_MEMES } from '../src/data/starterMemes.js';
import { SITE_ORIGIN, DEFAULT_OG_IMAGE } from '../src/data/seoRoutes.js';
import { replaceRootContent, replaceRouteJsonLd, sendNotFound, sendTryLater } from './_seoShell.js';
import { memePath } from '../src/utils/memeSeo.js';

// Returned when the database could not answer (timeout / error), as opposed to "no such creator".
const FETCH_FAILED = Symbol('fetch_failed');

const DEFAULT_SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
      if (content && content.includes('id="root"')) return content;
    } catch {
      // try next candidate
    }
  }
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>THE MEMES.net Creator Profile</title>
    <meta name="description" content="Creator profile, memes, badges & high scores on THE MEMES.net." />
    <link rel="canonical" href="${SITE_ORIGIN}/" />
    <meta property="og:title" content="THE MEMES.net Creator Profile" />
    <meta property="og:description" content="Creator profile on THE MEMES.net." />
    <meta property="og:url" content="${SITE_ORIGIN}/" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:title" content="THE MEMES.net Creator Profile" />
    <meta name="twitter:description" content="Creator profile on THE MEMES.net." />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
  </head>
  <body><div id="root"></div></body>
</html>`;
}

async function fetchCreatorFromSupabase(handle) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_creator_profile`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ p_handle: handle.toLowerCase() }),
      signal: controller.signal
    });
    if (!res.ok) return FETCH_FAILED;
    const data = await res.json();
    return data?.ok ? data : FETCH_FAILED;
  } catch {
    return FETCH_FAILED;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const rawHandle = String(req.query?.handle || '').trim().replace(/^@+/, '');
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(rawHandle)) {
    return sendNotFound(res, await loadBaseIndexHtml());
  }

  const lower = rawHandle.toLowerCase();
  const fetched = await fetchCreatorFromSupabase(rawHandle);
  const seedMemes = STARTER_MEMES.filter(
    (m) => String(m.author_name || '').toLowerCase() === lower
  );
  if (!seedMemes.length) {
    if (fetched === FETCH_FAILED) return sendTryLater(res, await loadBaseIndexHtml());
    if (!fetched?.found) return sendNotFound(res, await loadBaseIndexHtml());
  }
  const live = fetched === FETCH_FAILED ? null : fetched;
  const liveMemes = Array.isArray(live?.memes) ? live.memes : [];
  const listedMemes = (liveMemes.length ? liveMemes : seedMemes).slice(0, 60);

  const displayHandle = live?.handle || seedMemes[0]?.author_name || rawHandle;
  const memesCount = Number(live?.stats?.memes_count ?? seedMemes.length);
  const totalScore = Number(
    live?.stats?.total_score ?? seedMemes.reduce((acc, m) => acc + Number(m.score || 0), 0)
  );
  const followers = Number(live?.follower_count || 0);
  const canonicalUrl = `${SITE_ORIGIN}/u/${encodeURIComponent(displayHandle)}`;
  const titleText = `@${displayHandle} — Creator Profile, Memes & High Scores | THE MEMES.net`;
  const descText = `View @${displayHandle}'s profile on THE MEMES.net: ${memesCount} memes, ${totalScore} total score, ${followers} followers, built-in 8-bit pixel avatar, badges & arcade high scores.`;

  const baseHtml = await loadBaseIndexHtml();
  let html = baseHtml;
  const safeTitle = escapeHtml(titleText);
  const safeDesc = escapeHtml(descText);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeImg = escapeHtml(DEFAULT_OG_IMAGE);

  html = replaceMeta(html, /<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = replaceMeta(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);
  html = replaceMeta(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = replaceMeta(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
  html = replaceMeta(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImg}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImg}" />`);

  html = replaceRouteJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `@${displayHandle} Creator Profile`,
    description: descText,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'Person',
      name: displayHandle,
      alternateName: `@${displayHandle}`,
      url: canonicalUrl,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WriteAction',
        userInteractionCount: memesCount
      }
    }
  });

  // Own page body (the shell's body is the home page's text, which would be duplicate content).
  const memeItems = listedMemes
    .map((m) => {
      const href = memePath(m);
      const cat = m.category ? ` · #${escapeHtml(m.category)}` : '';
      return `<li style="margin:0 0 8px;"><a href="${escapeHtml(href)}" style="color:#00f5ff;">${escapeHtml(
        m.title || 'Meme'
      )}</a><span style="color:#94a3b8;"> · ${Number(m.score || 0)} pts${cat}</span></li>`;
    })
    .join('');
  const profileMain = `<main class="tm-seo-prerender" data-seo-route="/u/${escapeHtml(encodeURIComponent(displayHandle))}" style="min-height:100vh;background:#070810;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;"><article style="max-width:720px;margin:0 auto;"><h1 style="margin:0 0 8px;font-size:28px;">@${escapeHtml(displayHandle)}</h1><p style="color:#94a3b8;margin:0 0 20px;">${escapeHtml(descText)}</p>${
    memeItems
      ? `<h2 style="font-size:18px;margin:0 0 12px;">Memes by @${escapeHtml(displayHandle)}</h2><ul style="list-style:none;padding:0;margin:0 0 24px;">${memeItems}</ul>`
      : ''
  }<a href="/" style="color:#00f5ff;">← Back to the THE MEMES.net feed</a></article></main>`;
  html = replaceRootContent(html, profileMain);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
