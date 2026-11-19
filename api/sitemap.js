import process from 'node:process';
import { SEO_ROUTES, SITE_ORIGIN } from '../src/data/seoRoutes.js';
import { STARTER_MEMES } from '../src/data/starterMemes.js';
import { MEME_TEMPLATES, TEMPLATES_INDEX_PATH } from '../src/data/memeTemplates.js';
import { extractUniqueCreatorHandles } from '../src/utils/creatorProfiles.js';

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchLiveMemeEntries(limit = 500) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/memes?status=eq.approved&select=id,created_at,score,title,author_name,image_url,poster_url,media_type&order=score.desc&limit=${limit}`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json'
      }
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  const liveRows = await fetchLiveMemeEntries(500);
  // Google only trusts <lastmod> when it is accurate, so never stamp "today" on everything:
  // memes use their own date, the home feed uses the newest meme's date, other pages omit it.
  const newestMemeIso = liveRows
    .map((r) => String(r?.created_at || '').slice(0, 10))
    .filter(Boolean)
    .sort()
    .pop();
  const lastmodTag = (iso) => (iso ? `\n    <lastmod>${escapeXml(iso)}</lastmod>` : '');
  // Google Images: list each meme's picture (or video poster) with its page.
  const imageTag = (meme) => {
    const raw = String((meme?.media_type === 'video' ? meme.poster_url : meme?.image_url) || '').trim();
    let abs = '';
    if (raw.startsWith('/seed/')) abs = `${SITE_ORIGIN}${raw}`;
    else if (/^https:\/\/[^\s"<>]+$/.test(raw) && !raw.includes('..')) abs = raw;
    if (!abs) return '';
    return `\n    <image:image>\n      <image:loc>${escapeXml(abs)}</image:loc>\n    </image:image>`;
  };

  const staticRouteXml = SEO_ROUTES.map((route) => {
    const loc = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
    return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag(route.path === '/' ? newestMemeIso : '')}
    <changefreq>${escapeXml(route.changefreq || 'daily')}</changefreq>
    <priority>${escapeXml(route.priority || '0.8')}</priority>
  </url>`;
  });

  // Meme template library: high-intent search pages, each with its template picture for Google Images.
  const templateUrlXml = [
    `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}${TEMPLATES_INDEX_PATH}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>`,
    ...MEME_TEMPLATES.map(
      (t) => `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}${t.path}`)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <image:image>
      <image:loc>${escapeXml(`${SITE_ORIGIN}${t.image}`)}</image:loc>
    </image:image>
  </url>`
    )
  ];

  const seenIds = new Set();
  const memeUrlXml = [];

  for (const row of liveRows) {
    const idStr = String(row?.id || '').trim();
    if (!idStr || seenIds.has(idStr)) continue;
    seenIds.add(idStr);
    const mod = row.created_at ? String(row.created_at).slice(0, 10) : '';
    memeUrlXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/m/${encodeURIComponent(idStr)}`)}</loc>${lastmodTag(mod)}
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>${imageTag(row)}
  </url>`);
  }

  for (const seed of STARTER_MEMES) {
    const idStr = String(seed.id);
    if (seenIds.has(idStr)) continue;
    seenIds.add(idStr);
    memeUrlXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/m/${encodeURIComponent(idStr)}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>${imageTag(seed)}
  </url>`);
  }

  // Creator pages: the starter account plus everyone with an approved meme.
  const handles = new Map();
  for (const c of extractUniqueCreatorHandles(STARTER_MEMES)) handles.set(c.handle.toLowerCase(), c.handle);
  for (const row of liveRows) {
    const h = String(row?.author_name || '').trim();
    if (/^[a-zA-Z0-9_-]{2,32}$/.test(h) && !handles.has(h.toLowerCase())) handles.set(h.toLowerCase(), h);
  }
  const creatorUrlsXml = [...handles.values()].map(
    (handle) => `  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/u/${encodeURIComponent(handle)}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...staticRouteXml, ...templateUrlXml, ...creatorUrlsXml, ...memeUrlXml].join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
