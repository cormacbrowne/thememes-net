import process from 'node:process';
import { SEO_ROUTES, SITE_ORIGIN } from '../src/data/seoRoutes.js';
import { STARTER_MEMES } from '../src/data/starterMemes.js';

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
    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/memes?select=id,created_at,score&order=score.desc&limit=${limit}`;
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const liveRows = await fetchLiveMemeEntries(500);

  const staticRouteXml = SEO_ROUTES.map((route) => {
    const loc = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>${escapeXml(route.changefreq || 'daily')}</changefreq>
    <priority>${escapeXml(route.priority || '0.8')}</priority>
  </url>`;
  });

  const seenIds = new Set();
  const memeUrlXml = [];

  for (const row of liveRows) {
    const idStr = String(row?.id || '').trim();
    if (!idStr || seenIds.has(idStr)) continue;
    seenIds.add(idStr);
    const mod = row.created_at ? String(row.created_at).slice(0, 10) : todayIso;
    memeUrlXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/m/${encodeURIComponent(idStr)}`)}</loc>
    <lastmod>${escapeXml(mod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`);
  }

  for (const seed of STARTER_MEMES) {
    const idStr = String(seed.id);
    if (seenIds.has(idStr)) continue;
    seenIds.add(idStr);
    memeUrlXml.push(`  <url>
    <loc>${escapeXml(`${SITE_ORIGIN}/m/${encodeURIComponent(idStr)}`)}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticRouteXml, ...memeUrlXml].join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
