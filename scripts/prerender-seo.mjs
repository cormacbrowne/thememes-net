import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ROUTES, SITE_ORIGIN, DEFAULT_OG_IMAGE, getTemplateRoutePath } from '../src/data/seoRoutes.js';
import { STARTER_MEMES, STUDIO_TEMPLATES } from '../src/data/starterMemes.js';
import { buildRouteJsonLd } from '../src/utils/seoEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function countWords(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function replaceOrThrow(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`[prerender-seo] Expected pattern not found for ${label}`);
  }
  return html.replace(pattern, replacement);
}

function buildPrerenderMainHtml(route) {
  const introText = route.introParagraphs.join(' ');
  const introWords = countWords(introText);
  if (introWords < 150 || introWords > 300) {
    throw new Error(
      `[prerender-seo] Intro word count for "${route.path}" is ${introWords}; expected 150–300 words.`
    );
  }

  let showcaseHtml = '';

  if (route.prerenderCategory) {
    const categoryMemes = STARTER_MEMES.filter((m) => m.category === route.prerenderCategory);
    if (categoryMemes.length !== 16) {
      throw new Error(
        `[prerender-seo] Expected 16 seed memes for category "${route.prerenderCategory}", found ${categoryMemes.length}.`
      );
    }
    const itemsHtml = categoryMemes
      .map(
        (meme, idx) => `
          <figure style="margin:0;background:#11131c;border:1px solid #26293d;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(meme.image_url)}" alt="${escapeHtml(meme.title)}" width="${meme.width || 540}" height="${meme.height || 480}" loading="${idx < 4 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;background:#0b0c14;" />
            <figcaption style="padding:10px 12px;font-size:14px;line-height:1.4;color:#e2e8f0;">
              <strong>${escapeHtml(meme.title)}</strong>
              <span style="display:block;font-size:12px;color:#94a3b8;margin-top:4px;">@${escapeHtml(meme.author_name || 'TheMemesHQ')} · #${escapeHtml(route.category)}</span>
            </figcaption>
          </figure>`
      )
      .join('');

    showcaseHtml = `
      <section aria-label="${escapeHtml(route.h1)} Gallery" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#facc15;">Featured ${escapeHtml(route.category.toUpperCase())} Seed Memes (${categoryMemes.length})</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${itemsHtml}
        </div>
      </section>`;
  } else if (route.prerenderTemplates) {
    const templatesHtml = STUDIO_TEMPLATES.map(
      (tpl, idx) => `
        <figure style="margin:0;background:#11131c;border:1px solid #26293d;border-radius:12px;overflow:hidden;">
          <a href="${escapeHtml(getTemplateRoutePath(tpl))}" style="text-decoration:none;color:inherit;display:block;">
            <img src="${escapeHtml(tpl.src)}" alt="${escapeHtml(tpl.name)} blank meme template" width="540" height="480" loading="${idx < 4 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;background:#0b0c14;" />
            <figcaption style="padding:10px 12px;font-size:13px;line-height:1.4;color:#e2e8f0;">
              <strong>${escapeHtml(tpl.name)}</strong>
              <span style="display:block;font-size:12px;color:#94a3b8;margin-top:4px;">${escapeHtml(tpl.defaultTop || '')} / ${escapeHtml(tpl.defaultBottom || '')}</span>
            </figcaption>
          </a>
        </figure>`
    ).join('');

    showcaseHtml = `
      <section aria-label="20 Blank Meme Templates" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#38bdf8;">20 Ready-to-Caption Blank Meme Templates</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
          ${templatesHtml}
        </div>
      </section>`;
  } else if (route.studioTemplateId) {
    const tpl = STUDIO_TEMPLATES.find((t) => t.id === route.studioTemplateId);
    if (tpl) {
      showcaseHtml = `
        <section aria-label="${escapeHtml(tpl.name)} Preview" style="margin-top:24px;max-width:520px;">
          <figure style="margin:0;background:#11131c;border:1px solid #26293d;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(tpl.src)}" alt="${escapeHtml(tpl.name)} blank meme template" width="540" height="480" loading="eager" style="display:block;width:100%;height:auto;background:#0b0c14;" />
            <figcaption style="padding:12px;font-size:14px;color:#e2e8f0;">
              <strong>Example Top Text:</strong> ${escapeHtml(tpl.defaultTop || '')}<br />
              <strong>Example Bottom Text:</strong> ${escapeHtml(tpl.defaultBottom || '')}
            </figcaption>
          </figure>
        </section>`;
    }
  } else if (route.path === '/') {
    const topPreviewMemes = STARTER_MEMES.slice(0, 4);
    const previewHtml = topPreviewMemes
      .map(
        (meme, idx) => `
          <figure style="margin:0;background:#11131c;border:1px solid #26293d;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(meme.image_url)}" alt="${escapeHtml(meme.title)}" width="${meme.width || 540}" height="${meme.height || 480}" loading="${idx === 0 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;" />
            <figcaption style="padding:10px 12px;font-size:14px;color:#e2e8f0;">${escapeHtml(meme.title)}</figcaption>
          </figure>`
      )
      .join('');
    showcaseHtml = `
      <section aria-label="Featured Community Memes" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#facc15;">Featured Community Memes</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${previewHtml}
        </div>
      </section>`;
  }

  const navLinksHtml = SEO_ROUTES.map(
    (r) =>
      `<a href="${escapeHtml(r.path)}" style="color:#38bdf8;text-decoration:none;padding:6px 10px;border:1px solid #26293d;border-radius:8px;font-size:13px;background:#11131c;">${escapeHtml(r.h1)}</a>`
  ).join('\n          ');

  const paragraphsHtml = route.introParagraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.65;color:#cbd5e1;font-size:16px;">${escapeHtml(p)}</p>`)
    .join('\n      ');

  return `<main class="tm-seo-prerender" data-seo-route="${escapeHtml(route.path)}" style="min-height:100vh;background:#070810;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="max-width:980px;margin:0 auto;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#38bdf8;margin-bottom:8px;font-weight:700;">${escapeHtml(route.kicker)}</div>
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;color:#ffffff;">${escapeHtml(route.h1)}</h1>
        ${paragraphsHtml}
        ${showcaseHtml}
        <nav aria-label="Explore THE MEMES.net Routes" style="margin-top:28px;display:flex;flex-wrap:wrap;gap:8px;">
          ${navLinksHtml}
        </nav>
      </div>
    </main>`;
}

function renderRouteHtml(baseHtml, route) {
  const canonicalUrl = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
  const safeTitle = escapeHtml(route.title);
  const safeDesc = escapeHtml(route.description);
  const ogImageUrl = route.ogImage || DEFAULT_OG_IMAGE;

  let html = baseHtml;

  // Adjust preload hint so only pages that actually display that seed WebP preload it
  let preloadHref = null;
  if (route.prerenderCategory) {
    const firstCatMeme = STARTER_MEMES.find((m) => m.category === route.prerenderCategory);
    preloadHref = firstCatMeme?.image_url || null;
  } else if (route.studioTemplateId) {
    const tpl = STUDIO_TEMPLATES.find((t) => t.id === route.studioTemplateId);
    preloadHref = tpl?.src || null;
  } else if (route.path === '/') {
    preloadHref = STARTER_MEMES[0]?.image_url || '/seed/seed-tech-01.webp';
  }

  const preloadPattern = /\s*<link\s+rel="preload"\s+as="image"[^>]*>/i;
  if (preloadHref) {
    html = replaceOrThrow(
      html,
      preloadPattern,
      `\n    <link rel="preload" as="image" href="${escapeHtml(preloadHref)}" type="image/webp" fetchpriority="high" />`,
      `preload on ${route.path}`
    );
  } else {
    html = html.replace(preloadPattern, '');
  }

  html = replaceOrThrow(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${safeTitle}</title>`,
    `title on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`,
    `description on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `canonical on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`,
    `og:title on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`,
    `og:description on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `og:url on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`,
    `og:image on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `twitter:title on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `twitter:description on ${route.path}`
  );

  html = replaceOrThrow(
    html,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`,
    `twitter:image on ${route.path}`
  );

  const routeJsonLd = JSON.stringify(buildRouteJsonLd(route, canonicalUrl, ogImageUrl)).replaceAll('<', '\\u003c');
  html = html.replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
  html = replaceOrThrow(
    html,
    /<\/head>/i,
    `  <script id="tm-dynamic-jsonld" type="application/ld+json">${routeJsonLd}</script>\n  </head>`,
    `json-ld on ${route.path}`
  );

  const prerenderMain = buildPrerenderMainHtml(route);
  html = replaceOrThrow(
    html,
    /<div\s+id="root"><\/div>/i,
    `<div id="root">${prerenderMain}</div>`,
    `root shell on ${route.path}`
  );

  return html;
}

function generateSitemapXml(lastmod) {
  const routeUrlsXml = SEO_ROUTES.map((route) => {
    const loc = `${SITE_ORIGIN}${route.path === '/' ? '/' : route.path}`;
    return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${escapeHtml(route.changefreq || 'daily')}</changefreq>
    <priority>${escapeHtml(route.priority || '0.8')}</priority>
  </url>`;
  });

  const seedMemeUrlsXml = STARTER_MEMES.map((meme) => {
    const loc = `${SITE_ORIGIN}/m/${encodeURIComponent(String(meme.id))}`;
    return `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
  });

  const urlsXml = [...routeUrlsXml, ...seedMemeUrlsXml].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
}

function main() {
  const distIndexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(distIndexPath)) {
    throw new Error(`[prerender-seo] Missing ${distIndexPath}; run "vite build" first.`);
  }

  const baseHtml = fs.readFileSync(distIndexPath, 'utf8');
  const todayIso = new Date().toISOString().slice(0, 10);

  for (const route of SEO_ROUTES) {
    const renderedHtml = renderRouteHtml(baseHtml, route);
    const outPath =
      route.path === '/'
        ? distIndexPath
        : path.join(DIST_DIR, route.path.replace(/^\/+/, ''), 'index.html');

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, renderedHtml, 'utf8');
  }

  const sitemapXml = generateSitemapXml(todayIso);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');

  console.log(
    `[prerender-seo] Generated ${SEO_ROUTES.length} static SEO routes in dist/ + updated public/sitemap.xml and dist/sitemap.xml (${todayIso}).`
  );
}

main();
