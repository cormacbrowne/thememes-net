import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN, DEFAULT_OG_IMAGE } from '../src/data/seoRoutes.js';
// Routes with their long intro copy (kept out of the app bundle, plan 1.3).
import { SEO_ROUTES_WITH_COPY as SEO_ROUTES } from '../src/data/seoRouteCopy.js';
import { STARTER_MEMES } from '../src/data/starterMemes.js';
import { MEME_TEMPLATES, TEMPLATES_INDEX_PATH, relatedTemplates } from '../src/data/memeTemplates.js';
import { TEMPLATES_INDEX_META, buildTemplateJsonLd, buildTemplatesIndexJsonLd } from '../src/utils/templateSeo.js';
import { BOSS_SCREENS_CATALOG } from '../src/data/arcadeGamesCatalog.js';
import { buildRouteJsonLd } from '../src/utils/seoEngine.js';
import { buildMemeJsonLd, memeSeoDescription, shareCardUrl, shareCardAlt } from '../src/utils/memeSeo.js';
import { extractUniqueCreatorHandles } from '../src/utils/creatorProfiles.js';
import { buildChromeSignSvg } from '../src/components/chromeBrandSvg.js';

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
        <h2 style="font-size:20px;margin:0 0 14px;color:#ffb800;">Top ${escapeHtml(route.category.charAt(0).toUpperCase() + route.category.slice(1))} Memes</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;">
          ${itemsHtml}
        </div>
      </section>`;
  } else if (route.prerenderPranks) {
    const cards = BOSS_SCREENS_CATALOG.map(
      (p) => `
          <a href="${escapeHtml(p.path)}" style="display:block;background:#110d22;border:1px solid #2c2452;border-radius:12px;padding:14px;color:inherit;text-decoration:none;">
            <strong style="display:block;color:#fff;font-size:16px;margin-bottom:6px;">${escapeHtml(p.icon)} ${escapeHtml(p.label)}</strong>
            <span style="display:block;color:#94a3b8;font-size:14px;line-height:1.5;">${escapeHtml(p.pitch)}</span>
          </a>`
    ).join('');
    showcaseHtml = `
      <section aria-label="All prank screens" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#ff2e88;">All ${BOSS_SCREENS_CATALOG.length} Prank Screens</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">${cards}</div>
      </section>`;
  } else if (route.path === '/') {
    const topPreviewMemes = STARTER_MEMES.slice(0, 4);
    const previewHtml = topPreviewMemes
      .map(
        (meme) => `
          <figure style="margin:0;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(meme.image_url)}" alt="${escapeHtml(meme.title)}" width="${meme.width || 540}" height="${meme.height || 480}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;" />
            <figcaption style="padding:10px 12px;font-size:14px;color:#e2e8f0;">${escapeHtml(meme.title)}</figcaption>
          </figure>`
      )
      .join('');
    showcaseHtml = `
      <section aria-label="Sample memes from @TheMemesHQ" style="margin-top:24px;">
        <h2 style="font-size:20px;margin:0 0 14px;color:#ffb800;">Sample memes from @TheMemesHQ</h2>
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
      ${route.path === '/' ? homePortalHtml() : bootSplashHtml()}
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

/**
 * Plan 1.3: the home page's first paint is the real portal (sign + MEMES / PLAY doors + quick
 * links) as plain HTML and CSS, usable before any JavaScript runs. The links are real <a href>s.
 * The sun and grid fade in BEHIND the content afterwards (CSS only, reduced-motion respected).
 * React replaces this with <DualDirectionHero> when it boots; main.jsx flags that the static
 * portal was shown so the sign doesn't replay its power-on flicker.
 */
function homePortalHtml() {
  const signSvg = buildChromeSignSvg({ uid: 'tmboot', showFlow: true });
  return `<style>
@font-face{font-family:'TM Logo';font-style:normal;font-weight:400 900;font-display:swap;src:url('/fonts/orbitron-latin-wght.woff2') format('woff2')}
.tm-boot-home{position:relative;isolation:isolate;overflow:hidden;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(16px,3vh,26px);padding:max(24px,env(safe-area-inset-top)) 18px max(96px,calc(env(safe-area-inset-bottom) + 80px));background:radial-gradient(70% 50% at 50% 40%,rgba(155,92,255,.16),transparent 72%),#07060f}
.tm-boot-home .tm-boot-sky{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;animation:tmBootSkyIn 1.2s ease-out .35s forwards}
.tm-boot-home .tm-boot-sun{position:absolute;left:50%;top:12%;width:min(420px,78vw);aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:linear-gradient(180deg,#ffb800 0%,#ff2e88 55%,#9b5cff 100%);opacity:.2;-webkit-mask:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 20px);mask:repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 20px)}
.tm-boot-home .tm-boot-floor{position:absolute;left:-40%;right:-40%;bottom:0;height:34%;background-image:linear-gradient(rgba(255,46,136,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,46,136,.35) 1px,transparent 1px);background-size:44px 44px;transform:perspective(320px) rotateX(62deg);transform-origin:50% 100%;-webkit-mask:linear-gradient(transparent,#000 60%);mask:linear-gradient(transparent,#000 60%)}
.tm-boot-home svg{width:min(620px,92vw);height:auto;overflow:visible}
.tm-boot-home .tm-chrome-sheen{animation:tmBootSheen 4.8s ease-in-out infinite}
.tm-boot-doors{display:grid;gap:clamp(14px,2.4vh,22px);width:min(560px,100%)}
.tm-boot-door{display:flex;align-items:center;justify-content:center;gap:14px;min-height:clamp(88px,13vh,112px);padding:10px 18px;border-radius:999px;border:3px solid #19f0ff;background:rgba(25,240,255,.06);box-shadow:0 0 18px rgba(25,240,255,.55),inset 0 0 18px rgba(25,240,255,.25);color:#c9fdff;text-decoration:none;-webkit-tap-highlight-color:transparent}
.tm-boot-door.is-play{border-color:#ff2e88;background:rgba(255,46,136,.06);box-shadow:0 0 18px rgba(255,46,136,.55),inset 0 0 18px rgba(255,46,136,.25);color:#ffd1e6}
.tm-boot-door-word{display:block;font-family:'TM Logo',Orbitron,system-ui,sans-serif;font-weight:900;font-size:clamp(34px,10vw,52px);letter-spacing:.08em;line-height:1;text-shadow:0 0 12px currentColor}
.tm-boot-door-sub{display:block;margin-top:6px;font:600 clamp(11px,3vw,13px)/1.2 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#b9b3d9}
.tm-boot-door:focus-visible,.tm-boot-chip:focus-visible{outline:2px solid #fff;outline-offset:4px}
.tm-boot-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.tm-boot-chip{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #2c2452;background:rgba(17,13,34,.7);color:#e9e6ff;font:600 15px/1 system-ui,sans-serif;text-decoration:none}
@keyframes tmBootSkyIn{to{opacity:1}}
@keyframes tmBootSheen{0%{transform:translateX(-120px) skewX(-24deg);opacity:0}18%{opacity:.9}42%{transform:translateX(660px) skewX(-24deg);opacity:0}100%{transform:translateX(660px) skewX(-24deg);opacity:0}}
@media (prefers-reduced-motion:reduce){.tm-boot-home .tm-boot-sky{animation:none;opacity:1}.tm-boot-home .tm-chrome-sheen{display:none}}
</style>
      <div class="tm-boot tm-boot-home" data-tm-static-portal="1">
        <div class="tm-boot-sky" aria-hidden="true"><div class="tm-boot-sun"></div><div class="tm-boot-floor"></div></div>
        ${signSvg}
        <nav class="tm-boot-doors" aria-label="Choose your world: Memes or Play">
          <a class="tm-boot-door is-memes" href="/memes/dank"><span><span class="tm-boot-door-word">MEMES</span><span class="tm-boot-door-sub">Laugh · Make · Battle</span></span></a>
          <a class="tm-boot-door is-play" href="/games"><span><span class="tm-boot-door-word">PLAY</span><span class="tm-boot-door-sub">Arcade · Retro · Pranks</span></span></a>
        </nav>
        <nav class="tm-boot-chips" aria-label="Quick links">
          <a class="tm-boot-chip" href="/meme-generator">✏️ Make a meme</a>
          <a class="tm-boot-chip" href="/hall-of-fame">👑 Caption battle</a>
          <a class="tm-boot-chip" href="/prank-screens">💀 Prank screens</a>
        </nav>
      </div>`;
}

/** Static copy of the Chrome Outrun <NeonSign size="hero" flow /> plus its CSS, for the pre-app boot screen. */
function bootSplashHtml() {
  const signSvg = buildChromeSignSvg({ uid: 'tmboot', showFlow: true });
  return `<style>
@font-face{font-family:'TM Logo';font-style:normal;font-weight:400 900;font-display:block;src:url('/fonts/orbitron-latin-wght.woff2') format('woff2')}
.tm-boot{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px;background:radial-gradient(70% 50% at 50% 42%,rgba(255,46,136,.12),transparent 70%),#07060f}
.tm-boot svg{width:min(480px,88vw);height:auto;overflow:visible}
.tm-boot .tm-chrome-sheen{animation:tmBootSheen 4.8s ease-in-out infinite}
.tm-boot .tm-chrome-star-1{transform-origin:122px 76px;animation:tmBootTwinkle 2.8s ease-in-out infinite}
.tm-boot .tm-chrome-star-2{transform-origin:558px 80px;animation:tmBootTwinkle 3.4s ease-in-out 1.1s infinite}
.tm-boot .tm-boot-dots{display:flex;gap:8px}
.tm-boot .tm-boot-dots span{display:block;width:7px;height:7px;border-radius:50%;background:#19f0ff;box-shadow:0 0 10px #19f0ff;animation:tmBootDot 1.2s ease-in-out infinite}
.tm-boot .tm-boot-dots span:nth-child(2){animation-delay:.2s}
.tm-boot .tm-boot-dots span:nth-child(3){animation-delay:.4s}
@keyframes tmBootSheen{0%{transform:translateX(-120px) skewX(-24deg);opacity:0}18%{opacity:.9}42%{transform:translateX(660px) skewX(-24deg);opacity:0}100%{transform:translateX(660px) skewX(-24deg);opacity:0}}
@keyframes tmBootTwinkle{0%,100%{transform:scale(.75) rotate(0deg);opacity:.65}50%{transform:scale(1.18) rotate(18deg);opacity:1}}
@keyframes tmBootDot{0%,100%{opacity:.25}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.tm-boot .tm-chrome-sheen{display:none}.tm-boot .tm-chrome-star-1,.tm-boot .tm-chrome-star-2,.tm-boot .tm-boot-dots span{animation:none}}
</style>
      <div class="tm-boot" aria-hidden="true">
        ${signSvg}
        <div class="tm-boot-dots"><span></span><span></span><span></span></div>
      </div>`;
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
  // Link previews use the 1200×630 JPEG share card; the page and JSON-LD keep the meme itself.
  const cardUrl = shareCardUrl(meme.id);
  const safePreview = escapeHtml(cardUrl || ogImg);
  const safeAlt = escapeHtml(shareCardAlt(meme));

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${safeUrl}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${safeUrl}" />`);
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${safePreview}" />${cardUrl ? '\n    <meta property="og:image:type" content="image/jpeg" />' : ''}`
  );
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${safePreview}" />`);

  if (!cardUrl) html = html.replace(/\s*<meta\s+property="og:image:(?:width|height)"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:alt" content="${safeAlt}" />`);
  html = html.replace(/<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image:alt" content="${safeAlt}" />`);

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

/** Shared <head> rewrite for pages that are not in SEO_ROUTES. */
function applyHeadMeta(baseHtml, { title, description, canonicalUrl, ogImage, ogW, ogH, jsonLd, preload }) {
  let html = baseHtml;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(canonicalUrl);
  const img = escapeHtml(ogImage);
  const preloadPattern = /\s*<link\s+rel="preload"\s+as="image"[^>]*>/i;
  html = preload
    ? html.replace(preloadPattern, `\n    <link rel="preload" as="image" href="${escapeHtml(preload)}" type="image/webp" fetchpriority="high" />`)
    : html.replace(preloadPattern, '');
  html = replaceOrThrow(html, /<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`, `title on ${canonicalUrl}`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${d}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${u}" />`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${t}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${d}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${u}" />`);
  html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${img}" />`);
  if (ogW && ogH) {
    html = html.replace(/<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:width" content="${ogW}" />`);
    html = html.replace(/<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image:height" content="${ogH}" />`);
  }
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${t}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${d}" />`);
  html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${img}" />`);
  const ld = JSON.stringify(jsonLd).replaceAll('<', '\\u003c');
  html = html.replace(/\s*<script[^>]*id="tm-dynamic-jsonld"[^>]*>[\s\S]*?<\/script>/i, '');
  html = replaceOrThrow(html, /<\/head>/i, `  <script id="tm-dynamic-jsonld" type="application/ld+json">${ld}</script>\n  </head>`, `json-ld on ${canonicalUrl}`);
  return html;
}

const TPL_STYLE = `<style>
.tm-pre-tpl{min-height:100vh;background:#07060f;color:#e9e6ff;font-family:system-ui,-apple-system,sans-serif}
.tm-pre-tpl .w{max-width:1040px;margin:0 auto;padding:20px 16px 64px}
.tm-pre-tpl header.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #2c2452}
.tm-pre-tpl header.bar a{color:#19f0ff;text-decoration:none;font-weight:800}
.tm-pre-tpl .brand{font-size:18px;letter-spacing:.06em}
.tm-pre-tpl h1{margin:0 0 12px;font-size:32px;line-height:1.2;color:#fff}
.tm-pre-tpl h2{margin:28px 0 10px;font-size:21px;color:#ffb800}
.tm-pre-tpl p,.tm-pre-tpl li{color:#cbd5e1;line-height:1.65;font-size:16px}
.tm-pre-tpl .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.tm-pre-tpl .card{display:block;background:#110d22;border:1px solid #2c2452;border-radius:12px;overflow:hidden;color:inherit;text-decoration:none}
.tm-pre-tpl .card img{display:block;width:100%;height:auto;aspect-ratio:1/1}
.tm-pre-tpl .card span{display:block;padding:8px 10px;font-size:14px;color:#fff;font-weight:700}
.tm-pre-tpl .hero{display:grid;grid-template-columns:1.1fr 1fr;gap:22px;align-items:start}
.tm-pre-tpl .hero img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid #2c2452}
.tm-pre-tpl .cta{display:inline-block;margin:10px 0;padding:14px 20px;border-radius:12px;background:#19f0ff;color:#07060f;font-weight:900;text-decoration:none}
.tm-pre-tpl nav.crumbs{font-size:13px;margin-bottom:12px}
.tm-pre-tpl nav.crumbs a{color:#19f0ff;text-decoration:none}
@media (max-width:760px){.tm-pre-tpl .hero{grid-template-columns:1fr}.tm-pre-tpl .grid{grid-template-columns:repeat(2,1fr)}}
</style>`;

function preTplShell(inner, route) {
  return `<main class="tm-seo-prerender tm-pre-tpl" data-seo-route="${escapeHtml(route)}">${TPL_STYLE}
      <header class="bar"><a class="brand" href="/">THE MEMES.net</a><a href="/meme-generator">Meme Generator</a></header>
      <div class="w">${inner}</div>
    </main>`;
}

function templateCardHtml(t, eager) {
  return `<a class="card" href="${escapeHtml(t.path)}"><img src="${escapeHtml(t.thumb)}" alt="${escapeHtml(t.name)} meme template" width="360" height="360" loading="${eager ? 'eager' : 'lazy'}" /><span>${escapeHtml(t.name)}</span></a>`;
}

function renderTemplatesIndexHtml(baseHtml) {
  const canonicalUrl = `${SITE_ORIGIN}${TEMPLATES_INDEX_PATH}`;
  let html = applyHeadMeta(baseHtml, {
    title: TEMPLATES_INDEX_META.title,
    description: TEMPLATES_INDEX_META.description,
    canonicalUrl,
    ogImage: `${SITE_ORIGIN}${MEME_TEMPLATES[0].image}`,
    ogW: String(MEME_TEMPLATES[0].width),
    ogH: String(MEME_TEMPLATES[0].height),
    jsonLd: buildTemplatesIndexJsonLd(SITE_ORIGIN),
    preload: MEME_TEMPLATES[0].thumb
  });
  const inner = `<h1>${escapeHtml(TEMPLATES_INDEX_META.h1)}</h1>
        <p>${escapeHtml(TEMPLATES_INDEX_META.intro)}</p>
        <div class="grid">${MEME_TEMPLATES.map((t, i) => templateCardHtml(t, i < 6)).join('')}</div>`;
  return replaceOrThrow(html, /<div\s+id="root"><\/div>/i, `<div id="root">${preTplShell(inner, TEMPLATES_INDEX_PATH)}</div>`, 'root on /templates');
}

function renderTemplateHtml(baseHtml, t) {
  const canonicalUrl = `${SITE_ORIGIN}${t.path}`;
  let html = applyHeadMeta(baseHtml, {
    title: t.title,
    description: t.description,
    canonicalUrl,
    ogImage: `${SITE_ORIGIN}${t.image}`,
    ogW: String(t.width),
    ogH: String(t.height),
    jsonLd: buildTemplateJsonLd(t, SITE_ORIGIN),
    preload: t.image
  });
  const examples = t.examples
    .map((ex) => `<li>${ex.map((line, j) => (line ? `<strong>${escapeHtml(t.slots[j]?.label || 'Text')}:</strong> ${escapeHtml(line)}` : '')).filter(Boolean).join(' · ')}</li>`)
    .join('');
  const faq = t.faq.map((f) => `<h3 style="font-size:17px;color:#fff;margin:16px 0 6px">${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p>`).join('');
  const inner = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${TEMPLATES_INDEX_PATH}">Meme Templates</a> › ${escapeHtml(t.name)}</nav>
        <div class="hero">
          <img src="${escapeHtml(t.image)}" alt="${escapeHtml(t.name)} meme template, blank" width="${t.width}" height="${t.height}" fetchpriority="high" />
          <div>
            <h1>${escapeHtml(t.name)} Meme Template</h1>
            <p>${escapeHtml(t.summary)}</p>
            ${t.aka?.length ? `<p style="font-size:13px;color:#94a3b8">Also known as: ${escapeHtml(t.aka.join(', '))}</p>` : ''}
            <a class="cta" href="${escapeHtml(t.path)}">✏️ Use this template</a>
            <p style="font-size:13px;color:#94a3b8">Free, no sign-up. Type your own text or let AI write the joke.</p>
          </div>
        </div>
        <h2>What the ${escapeHtml(t.name)} meme means</h2>
        <p>${escapeHtml(t.meaning)}</p>
        <h2>How to make a ${escapeHtml(t.name)} meme</h2>
        <p>${escapeHtml(t.howTo)}</p>
        <h2>${escapeHtml(t.name)} meme examples</h2>
        <ul>${examples}</ul>
        <h2>${escapeHtml(t.name)} meme FAQ</h2>
        ${faq}
        <h2>More meme templates</h2>
        <div class="grid">${relatedTemplates(t, 6).map((r) => templateCardHtml(r, false)).join('')}</div>
        <p><a href="${TEMPLATES_INDEX_PATH}" style="color:#19f0ff;font-weight:700">See all ${MEME_TEMPLATES.length} meme templates →</a></p>`;
  return replaceOrThrow(html, /<div\s+id="root"><\/div>/i, `<div id="root">${preTplShell(inner, t.path)}</div>`, `root on ${t.path}`);
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

  writeDualCleanUrlFiles(TEMPLATES_INDEX_PATH, renderTemplatesIndexHtml(baseHtml));
  for (const t of MEME_TEMPLATES) {
    writeDualCleanUrlFiles(t.path, renderTemplateHtml(baseHtml, t));
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
    `[prerender-seo] Generated ${SEO_ROUTES.length} static SEO routes + ${MEME_TEMPLATES.length + 1} template pages + ${creators.length} creator profiles + ${STARTER_MEMES.length} static meme pages in dist/ (${todayIso}).`
  );
}

main();
