import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ROUTES, SITE_ORIGIN, DEFAULT_OG_IMAGE, getTemplateRoutePath } from '../src/data/seoRoutes.js';
import { STARTER_MEMES, STUDIO_TEMPLATES } from '../src/data/starterMemes.js';
import { buildRouteJsonLd } from '../src/utils/seoEngine.js';
import { buildMemeJsonLd, memeSeoDescription } from '../src/utils/memeSeo.js';
import { extractUniqueCreatorHandles } from '../src/utils/creatorProfiles.js';
import { SIGN_TUBES, SIGN_VIEWBOX } from '../src/components/neonSignPaths.js';

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
          <figure style="margin:0;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(meme.image_url)}" alt="${escapeHtml(meme.title)}" width="${meme.width || 540}" height="${meme.height || 480}" loading="${idx < 4 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;background:#07060f;" />
            <figcaption style="padding:10px 12px;font-size:14px;line-height:1.4;color:#e2e8f0;">
              <strong>${escapeHtml(meme.title)}</strong>
              <span style="display:block;font-size:12px;color:#94a3b8;margin-top:4px;">@${escapeHtml(meme.author_name || 'TheMemesHQ')} · #${escapeHtml(route.category)}</span>
            </figcaption>
          </figure>`
      )
      .join('');

    showcaseHtml = `
      <section aria-label="${escapeHtml(route.h1)} Gallery" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#ffb800;">Featured ${escapeHtml(route.category.toUpperCase())} Seed Memes (${categoryMemes.length})</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${itemsHtml}
        </div>
      </section>`;
  } else if (route.prerenderTemplates) {
    const templatesHtml = STUDIO_TEMPLATES.map(
      (tpl, idx) => `
        <figure style="margin:0;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;">
          <a href="${escapeHtml(getTemplateRoutePath(tpl))}" style="text-decoration:none;color:inherit;display:block;">
            <img src="${escapeHtml(tpl.src)}" alt="${escapeHtml(tpl.name)} blank meme template" width="540" height="480" loading="${idx < 4 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;background:#07060f;" />
            <figcaption style="padding:10px 12px;font-size:13px;line-height:1.4;color:#e2e8f0;">
              <strong>${escapeHtml(tpl.name)}</strong>
              <span style="display:block;font-size:12px;color:#94a3b8;margin-top:4px;">${escapeHtml(tpl.defaultTop || '')} / ${escapeHtml(tpl.defaultBottom || '')}</span>
            </figcaption>
          </a>
        </figure>`
    ).join('');

    showcaseHtml = `
      <section aria-label="20 Blank Meme Templates" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#19f0ff;">20 Ready-to-Caption Blank Meme Templates</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
          ${templatesHtml}
        </div>
      </section>`;
  } else if (route.studioTemplateId) {
    const tpl = STUDIO_TEMPLATES.find((t) => t.id === route.studioTemplateId);
    if (tpl) {
      showcaseHtml = `
        <section aria-label="${escapeHtml(tpl.name)} Preview" style="margin-top:24px;max-width:520px;">
          <figure style="margin:0;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(tpl.src)}" alt="${escapeHtml(tpl.name)} blank meme template" width="540" height="480" loading="eager" style="display:block;width:100%;height:auto;background:#07060f;" />
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
          <figure style="margin:0;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(meme.image_url)}" alt="${escapeHtml(meme.title)}" width="${meme.width || 540}" height="${meme.height || 480}" loading="${idx === 0 ? 'eager' : 'lazy'}" style="display:block;width:100%;height:auto;" />
            <figcaption style="padding:10px 12px;font-size:14px;color:#e2e8f0;">${escapeHtml(meme.title)}</figcaption>
          </figure>`
      )
      .join('');
    showcaseHtml = `
      <section aria-label="Featured Community Memes" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#ffb800;">Featured Community Memes</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${previewHtml}
        </div>
      </section>`;
  }

  const navLinksHtml = SEO_ROUTES.map(
    (r) =>
      `<a href="${escapeHtml(r.path)}" style="color:#19f0ff;text-decoration:none;padding:6px 10px;border:1px solid #2c2452;border-radius:8px;font-size:13px;background:#110d22;">${escapeHtml(r.h1)}</a>`
  ).join('\n          ');

  const paragraphsHtml = route.introParagraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.65;color:#cbd5e1;font-size:16px;">${escapeHtml(p)}</p>`)
    .join('\n      ');

  // Owner brief 17 Nov 2026 (items 1 + 12): what a visitor sees before the app starts is the lit neon
  // sign on the night background, never an old-style list of memes. The SEO copy sits below the fold.
  return `<main class="tm-seo-prerender" data-seo-route="${escapeHtml(route.path)}" style="min-height:100vh;background:#07060f;color:#e9e6ff;font-family:system-ui,-apple-system,sans-serif;">
      ${bootSplashHtml()}
      <div style="max-width:980px;margin:0 auto;padding:32px 18px 64px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#19f0ff;margin-bottom:8px;font-weight:700;">${escapeHtml(route.kicker)}</div>
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.2;color:#ffffff;">${escapeHtml(route.h1)}</h1>
        ${paragraphsHtml}
        ${showcaseHtml}
        <nav aria-label="Explore THE MEMES.net Routes" style="margin-top:28px;display:flex;flex-wrap:wrap;gap:8px;">
          ${navLinksHtml}
        </nav>
      </div>
    </main>`;
}

const TUBE_COLOURS = {
  pink: ['#ff2e88', '#ffd9ea', '#3d1028'],
  cyan: ['#19f0ff', '#e2fdff', '#0b3440'],
  amber: ['#ffb800', '#fff1c9', '#3d2c05']
};

/** Static copy of <NeonSign size="hero" flow /> plus its CSS, for the pre-app boot screen. */
function bootSplashHtml() {
  const flows = [2.4, 2.7, 3.0, 3.3, 3.6, 3.9];
  const tubes = SIGN_TUBES.map(([colour, x, y, w, d, extra], idx) => {
    const [c, hot, off] = TUBE_COLOURS[colour] || TUBE_COLOURS.cyan;
    return `<g transform="translate(${x} ${y})"${extra ? ` class="${extra}"` : ''}><path pathLength="100" stroke="${off}" stroke-width="${w + 1.5}" d="${d}"/><g class="lit" style="animation-delay:${idx * 70}ms"><path class="gl" pathLength="100" stroke="${c}" stroke-width="${w + 2}" d="${d}"/><path pathLength="100" stroke="${c}" stroke-width="${w}" d="${d}"/><path pathLength="100" stroke="${hot}" stroke-width="${(w * 0.34).toFixed(2)}" d="${d}"/><path class="fl" pathLength="100" stroke="#fff" stroke-width="${(w * 0.5).toFixed(2)}" style="animation-duration:${flows[idx % flows.length]}s" d="${d}"/></g></g>`;
  }).join('');
  return `<style>
.tm-boot{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px;background:radial-gradient(70% 50% at 50% 42%,rgba(255,46,136,.10),transparent 70%),#07060f}
.tm-boot svg{width:min(420px,82vw);height:auto;overflow:visible}
.tm-boot path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.tm-boot .gl{filter:blur(5px);opacity:.85}
.tm-boot .fl{stroke-dasharray:5 95;opacity:.92;animation:tmBootFlow 3s linear infinite}
.tm-boot .lit{animation:tmBootOn 900ms steps(1,end) both}
.tm-boot .is-buzz .lit{animation:tmBootOn 900ms steps(1,end) both,tmBootBuzz 9s steps(1,end) 3s infinite}
.tm-boot p{margin:0;color:#9d98c2;font-size:14px;letter-spacing:.14em;text-transform:uppercase}
.tm-boot p span{display:inline-block;width:6px;height:6px;margin-left:8px;border-radius:50%;background:#19f0ff;box-shadow:0 0 10px #19f0ff;animation:tmBootDot 1.2s ease-in-out infinite}
@keyframes tmBootFlow{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes tmBootOn{0%{opacity:0}12%{opacity:1}18%{opacity:0}30%{opacity:1}36%{opacity:.2}48%,100%{opacity:1}}
@keyframes tmBootBuzz{0%,91%,93%,95.5%,100%{opacity:1}92%,94%,95%{opacity:.16}}
@keyframes tmBootDot{0%,100%{opacity:.25}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.tm-boot .fl{display:none}.tm-boot .lit,.tm-boot p span{animation:none}}
</style>
      <section class="tm-boot" aria-label="THE MEMES.net is loading">
        <svg viewBox="${SIGN_VIEWBOX}" role="img" aria-label="THE MEMES.net">${tubes}</svg>
        <p>Loading fresh memes<span></span></p>
      </section>`;
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
  }
  // '/' no longer paints a starter meme first (owner brief 17 Nov 2026), so nothing to preload there.

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

function renderMemeHtml(baseHtml, meme) {
  const safeId = encodeURIComponent(String(meme.id));
  const canonicalUrl = `${SITE_ORIGIN}/m/${safeId}`;
  const author = meme.author_name || 'TheMemesHQ';
  const titleText = `${meme.title || 'Funny Meme'} — @${author} | THE MEMES.net`;
  const descText = memeSeoDescription(meme);
  const rawImg = meme.media_type === 'video' ? meme.poster_url || DEFAULT_OG_IMAGE : meme.image_url;
  const ogImg =
    rawImg && rawImg.startsWith('/')
      ? `${SITE_ORIGIN}${rawImg}`
      : rawImg && rawImg.startsWith('https://')
      ? rawImg
      : DEFAULT_OG_IMAGE;

  let html = baseHtml;
  const preloadPattern = /\s*<link\s+rel="preload"\s+as="image"[^>]*>/i;
  if (rawImg && rawImg.endsWith('.webp')) {
    html = html.replace(
      preloadPattern,
      `\n    <link rel="preload" as="image" href="${escapeHtml(rawImg)}" type="image/webp" fetchpriority="high" />`
    );
  } else {
    html = html.replace(preloadPattern, '');
  }

  const safeTitle = escapeHtml(titleText);
  const safeDesc = escapeHtml(descText);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeImg = escapeHtml(ogImg);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
  html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImg}" />`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImg}" />`);

  const memeJsonLd = JSON.stringify(buildMemeJsonLd(meme, canonicalUrl, ogImg)).replaceAll('<', '\\u003c');
  html = html.replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
  html = html.replace(
    /<\/head>/i,
    `  <script id="tm-dynamic-jsonld" type="application/ld+json">${memeJsonLd}</script>\n  </head>`
  );

  const prerenderMain = `<main class="tm-seo-prerender" data-seo-route="/m/${escapeHtml(safeId)}" style="min-height:100vh;background:#070810;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;">
      <article style="max-width:740px;margin:0 auto;background:#110d22;border:1px solid #2c2452;border-radius:16px;padding:24px;">
        <div style="font-size:12px;color:#19f0ff;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">THE MEMES.net // #${escapeHtml(meme.category || 'dank')}</div>
        <h1 style="margin:8px 0 10px;font-size:28px;color:#ffffff;">${escapeHtml(meme.title || 'Meme')}</h1>
        <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Posted by @${escapeHtml(author)} · Score: ${Number(meme.score || 1)}</p>
        <img src="${escapeHtml(rawImg || safeImg)}" alt="${escapeHtml(meme.title || 'Meme')}" width="${meme.width || 540}" height="${meme.height || 480}" loading="eager" style="display:block;max-width:100%;height:auto;border-radius:12px;margin:0 auto 16px;" />
        <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.6;">${safeDesc}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="/" style="color:#00f5ff;text-decoration:none;font-weight:700;">🔥 Explore More Memes</a>
          <a href="/games" style="color:#ffb800;text-decoration:none;font-weight:700;">🕹️ Enter 80s Cyber-Arcade</a>
        </div>
      </article>
    </main>`;

  return html.replace(/<div\s+id="root"><\/div>/i, `<div id="root">${prerenderMain}</div>`);
}

function renderCreatorHtml(baseHtml, creator) {
  const safeHandle = encodeURIComponent(creator.handle);
  const canonicalUrl = `${SITE_ORIGIN}/u/${safeHandle}`;
  const titleText = `@${creator.handle} — Creator Profile, Memes & High Scores | THE MEMES.net`;
  const descText = `Browse @${creator.handle}'s creator profile on THE MEMES.net: ${creator.memesCount} memes posted (${creator.totalScore} score), built-in pixel avatar, badges, and arcade high scores.`;

  let html = baseHtml;
  const safeTitle = escapeHtml(titleText);
  const safeDesc = escapeHtml(descText);
  const safeUrl = escapeHtml(canonicalUrl);
  const safeImg = escapeHtml(DEFAULT_OG_IMAGE);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
  html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${safeImg}" />`);
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safeImg}" />`);

  const profileJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `@${creator.handle} Creator Profile`,
    description: descText,
    url: canonicalUrl,
    mainEntity: {
      '@type': 'Person',
      name: creator.handle,
      alternateName: `@${creator.handle}`,
      url: canonicalUrl
    }
  }).replaceAll('<', '\\u003c');
  html = html.replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
  html = html.replace(
    /<\/head>/i,
    `  <script id="tm-dynamic-jsonld" type="application/ld+json">${profileJsonLd}</script>\n  </head>`
  );

  const prerenderMain = `<main class="tm-seo-prerender" data-seo-route="/u/${escapeHtml(creator.handle)}" style="min-height:100vh;background:#070810;color:#f8fafc;padding:32px 18px 64px;font-family:system-ui,-apple-system,sans-serif;">
      <article style="max-width:740px;margin:0 auto;background:#110d22;border:1px solid #2c2452;border-radius:16px;padding:24px;">
        <div style="font-size:12px;color:#19f0ff;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">THE MEMES.net // CREATOR PROFILE</div>
        <h1 style="margin:8px 0 10px;font-size:28px;color:#00f3ff;">@${escapeHtml(creator.handle)}</h1>
        <p style="margin:0 0 16px;color:#cbd5e1;line-height:1.6;">${safeDesc}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="/" style="color:#00f5ff;text-decoration:none;font-weight:700;">🔥 Browse Meme Feed</a>
          <a href="/games" style="color:#ffb800;text-decoration:none;font-weight:700;">🕹️ 80s Cyber-Arcade</a>
        </div>
      </article>
    </main>`;

  return html.replace(/<div\s+id="root"><\/div>/i, `<div id="root">${prerenderMain}</div>`);
}

function writeDualCleanUrlFiles(relativeRoutePath, renderedHtml) {
  const cleanRel = relativeRoutePath.replace(/^\/+/, '');
  if (!cleanRel) return;
  const dirIndex = path.join(DIST_DIR, cleanRel, 'index.html');
  const flatHtml = path.join(DIST_DIR, `${cleanRel}.html`);
  fs.mkdirSync(path.dirname(dirIndex), { recursive: true });
  fs.writeFileSync(dirIndex, renderedHtml, 'utf8');
  fs.mkdirSync(path.dirname(flatHtml), { recursive: true });
  fs.writeFileSync(flatHtml, renderedHtml, 'utf8');
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
    if (route.path === '/') {
      fs.writeFileSync(distIndexPath, renderedHtml, 'utf8');
    } else {
      writeDualCleanUrlFiles(route.path, renderedHtml);
    }
  }

  for (const meme of STARTER_MEMES) {
    const renderedMeme = renderMemeHtml(baseHtml, meme);
    writeDualCleanUrlFiles(`/m/${encodeURIComponent(String(meme.id))}`, renderedMeme);
  }

  const creators = extractUniqueCreatorHandles(STARTER_MEMES);
  for (const creator of creators) {
    const renderedCreator = renderCreatorHtml(baseHtml, creator);
    writeDualCleanUrlFiles(`/u/${encodeURIComponent(creator.handle)}`, renderedCreator);
  }

  // /sitemap.xml is served live by api/sitemap.js (vercel.json rewrite). A static file here would
  // win over the rewrite on Vercel and hide every user meme from search engines, so never write one.
  fs.rmSync(path.join(DIST_DIR, 'sitemap.xml'), { force: true });

  console.log(
    `[prerender-seo] Generated ${SEO_ROUTES.length} static SEO routes + ${creators.length} creator profiles + ${STARTER_MEMES.length} static meme pages in dist/ (${todayIso}).`
  );
}

main();
