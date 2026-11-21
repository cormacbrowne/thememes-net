import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { SITE_ORIGIN, DEFAULT_OG_IMAGE } from '../src/data/seoRoutes.js';
import { replaceRootContent, replaceRouteJsonLd, sendNotFound, sendTryLater } from './_seoShell.js';

const DEFAULT_SUPABASE_URL = 'https://otvvphmjojqyjaznjzyo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FETCH_FAILED = Symbol('fetch_failed');

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

export function toBattleImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_OG_IMAGE;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('..') || /\s/.test(trimmed)) return DEFAULT_OG_IMAGE;
  if (trimmed.startsWith('/seed/') && trimmed.length > '/seed/'.length) {
    return `${SITE_ORIGIN}${trimmed}`;
  }
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const battlePrefix = `${base}/storage/v1/object/public/memes/battles/`;
  if (trimmed.startsWith(battlePrefix) && trimmed.length > battlePrefix.length) {
    return trimmed;
  }
  return DEFAULT_OG_IMAGE;
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
      // try next source
    }
  }
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Daily Caption Battle | THE MEMES.net</title>
    <meta name="description" content="Write the funniest caption for today's Daily Caption Battle on THE MEMES.net." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${SITE_ORIGIN}/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Daily Caption Battle | THE MEMES.net" />
    <meta property="og:description" content="Compete in today's Daily Caption Battle on THE MEMES.net." />
    <meta property="og:url" content="${SITE_ORIGIN}/" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Daily Caption Battle | THE MEMES.net" />
    <meta name="twitter:description" content="Compete in today's Daily Caption Battle on THE MEMES.net." />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
  </head>
  <body style="background:#07060f;color:#f8fafc;font-family:system-ui,sans-serif;">
    <div id="root"></div>
  </body>
</html>`;
}

async function fetchSupabaseRow(pathname) {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, '');
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1600);
  try {
    const res = await fetch(`${supabaseUrl}${pathname}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    if (!res.ok) return FETCH_FAILED;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return FETCH_FAILED;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const rawBattleId = Array.isArray(req.query?.battleId) ? req.query.battleId[0] : req.query?.battleId;
  const rawEntryId = Array.isArray(req.query?.entryId) ? req.query.entryId[0] : req.query?.entryId;
  const battleId = String(rawBattleId || '').trim();
  const entryId = rawEntryId ? String(rawEntryId).trim() : '';

  const htmlBase = await loadBaseIndexHtml();

  if (!UUID_RE.test(battleId) || (entryId && !UUID_RE.test(entryId))) {
    return sendNotFound(res, htmlBase);
  }

  const battle = await fetchSupabaseRow(
    `/rest/v1/battles?id=eq.${encodeURIComponent(battleId)}&status=in.(live,judging,complete)&select=id,battle_day,title,prompt,theme,image_url,status,starts_at,ends_at&limit=1`
  );
  if (battle === FETCH_FAILED) return sendTryLater(res, htmlBase);
  if (!battle) return sendNotFound(res, htmlBase);

  let entry = null;
  if (entryId) {
    entry = await fetchSupabaseRow(
      `/rest/v1/caption_battle_entries?id=eq.${encodeURIComponent(entryId)}&battle_id=eq.${encodeURIComponent(battleId)}&status=eq.approved&select=id,author_name,top_text,bottom_text,score,rank&limit=1`
    );
    if (entry === FETCH_FAILED) return sendTryLater(res, htmlBase);
    if (!entry) return sendNotFound(res, htmlBase);
  }

  const captionText = entry ? [entry.top_text, entry.bottom_text].filter(Boolean).join(' / ') : '';
  const battleTitle = battle.title || 'Daily Caption Battle';
  const titleText = entry
    ? `"${captionText.slice(0, 64)}" by @${entry.author_name || 'Anon'} — ${battleTitle} | THE MEMES.net`
    : `${battleTitle} (${battle.battle_day || 'Daily'}) — Caption Battle | THE MEMES.net`;
  const descText = entry
    ? `@${entry.author_name || 'Anon'} entered "${captionText}" in ${battleTitle} on THE MEMES.net${
        entry.rank ? ` (placed #${entry.rank})` : ''
      }. Vote, enter today's caption battle, or make your own meme.`
    : `${battle.prompt || `Write the funniest caption for "${battleTitle}"`} — ${
        battle.theme ? `Theme: ${battle.theme}. ` : ''
      }Compete in the Daily Caption Battle on THE MEMES.net.`;

  const canonicalPath = entry
    ? `/battle/${encodeURIComponent(battle.id)}/e/${encodeURIComponent(entry.id)}`
    : `/battle/${encodeURIComponent(battle.id)}`;
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  const ogImg = toBattleImageUrl(battle.image_url);
  const usingDefaultBanner = ogImg === DEFAULT_OG_IMAGE;

  let html = htmlBase;
  const safeTitle = escapeHtml(titleText);
  const safeDesc = escapeHtml(descText);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeImg = escapeHtml(ogImg);
  const safeAlt = escapeHtml(entry ? `${captionText} — ${battleTitle}` : `${battleTitle} — Daily Caption Battle`);

  html = replaceMeta(html, /<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = replaceMeta(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);
  html = replaceMeta(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = replaceMeta(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
  html = replaceMeta(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImg}" />`);
  if (!usingDefaultBanner) {
    html = html.replace(/\s*<meta\s+property="og:image:(?:width|height)"\s+content="[^"]*"\s*\/?>/gi, '');
  }
  html = replaceMeta(html, /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeAlt}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image" />');
  html = replaceMeta(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImg}" />`);
  html = replaceMeta(html, /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${safeAlt}" />`);

  const articleMarkup = `<main class="tm-seo-prerender" data-battle-id="${escapeHtml(battle.id)}" style="min-height:100vh;background:#07060f;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;"><article style="max-width:720px;margin:0 auto;"><h1 style="margin:0 0 10px;font-size:28px;">⚔️ ${escapeHtml(battleTitle)}</h1>${
    entry
      ? `<p style="font-size:18px;font-weight:800;color:#ffb800;margin:0 0 10px;">“${escapeHtml(captionText)}” — <a href="/u/${escapeHtml(encodeURIComponent(entry.author_name || 'Anon'))}" style="color:#00f5ff;">@${escapeHtml(entry.author_name || 'Anon')}</a></p>`
      : ''
  }<p style="color:#94a3b8;margin:0 0 16px;">${battle.battle_day ? `${escapeHtml(battle.battle_day)} · ` : ''}${
    battle.theme ? `Theme: ${escapeHtml(battle.theme)} · ` : ''
  }Status: ${escapeHtml(battle.status || 'live')}</p><img src="${safeImg}" alt="${safeAlt}" style="max-width:100%;height:auto;border-radius:12px;display:block;margin-bottom:16px;" />${
    /^\/seed\/battle-[a-z0-9-]+\.webp$/.test(String(battle.image_url || ''))
      ? '<p style="margin:-10px 0 16px;color:#94a3b8;font-size:12px;">AI-generated image</p>'
      : ''
  }<p style="line-height:1.6;color:#cbd5e1;">${safeDesc}</p><nav style="display:flex;gap:16px;flex-wrap:wrap;"><a href="/" style="color:#00f5ff;">⚔️ Enter or Vote on THE MEMES.net</a><a href="/hall-of-fame" style="color:#ffb800;">👑 Caption King Hall of Fame</a></nav></article></main>`;
  html = replaceRootContent(html, articleMarkup);

  html = replaceRouteJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': entry ? 'SocialMediaPosting' : 'WebPage',
    name: titleText,
    description: descText,
    url: canonicalUrl,
    image: ogImg,
    ...(battle.starts_at ? { datePublished: battle.starts_at } : {}),
    ...(entry
      ? {
          author: {
            '@type': 'Person',
            name: entry.author_name || 'Anon',
            url: `${SITE_ORIGIN}/u/${encodeURIComponent(entry.author_name || 'Anon')}`
          }
        }
      : {})
  });

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=3600');
  return res.end(html);
}
