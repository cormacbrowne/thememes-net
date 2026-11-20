// ==========================================
// DYNAMIC SEO & GOOGLE STRUCTURED DATA (JSON-LD) ENGINE
// Updates <title>, <meta description>, <link rel="canonical">, og:url,
// og:image (1200x630 social card), Twitter tags & JSON-LD on navigation.
// ==========================================

import {
  SITE_ORIGIN,
  DEFAULT_OG_IMAGE,
  getSeoRouteForState,
  getCanonicalPathForState
} from '../data/seoRoutes.js';
import { buildMemeJsonLd, memeSeoDescription, shareCardUrl, shareCardAlt, memePath } from './memeSeo.js';
import { sanitizeMediaUrl } from './securityGuard.js';
import { getTemplateBySlug } from '../data/memeTemplates.js';
import { TEMPLATES_INDEX_META, buildTemplateJsonLd, buildTemplatesIndexJsonLd } from './templateSeo.js';

const NON_PATH_VIEW_MODES = {
  reels: {
    title: 'Vertical Meme Reels — Fullscreen Community Memes | THE MEMES.net',
    description:
      'Swipe through fullscreen vertical meme reels, double-tap to upvote, react, and share direct links.'
  },
  swipe: {
    title: 'Hyper-Swipe Meme Triage Deck | THE MEMES.net',
    description:
      'Swipe rapidly through fresh dank, programming, gaming, and relatable memes with instant upvote and super-vote combos.'
  },
  battle: {
    title: '1v1 Sudden-Death Meme Battle Arena | THE MEMES.net',
    description:
      'Vote head-to-head in the King of the Hill 1v1 Meme Battle Arena and see how your picks compare with the crowd.'
  }
};

function upsertMeta(selector, attrName, attrVal, contentVal) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', contentVal);
}

function upsertCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function updateDynamicSeo({
  activeMeme = null,
  theaterMemeId = null,
  category = 'all',
  viewMode = 'feed',
  creatorHandle = null,
  templateSlug = null,
  showStudio = false,
  forgeIntent = null,
  extrasDrawerOpen = false,
  extrasFocus = null,
  bossKeyActive = false,
  prankDisguise = null
} = {}) {
  if (typeof document === 'undefined') return;

  const routeMeta = getSeoRouteForState({
    category,
    viewMode,
    creatorHandle,
    showStudio,
    forgeIntent,
    extrasDrawerOpen,
    extrasFocus,
    bossKeyActive,
    prankDisguise
  });

  const canonicalPath = getCanonicalPathForState({
    viewMode,
    category,
    creatorHandle,
    templateSlug,
    showStudio,
    forgeIntent,
    extrasDrawerOpen,
    extrasFocus,
    bossKeyActive,
    prankDisguise,
    theaterMemeId
  });

  let pageTitle = routeMeta.title;
  let pageDesc = routeMeta.description;
  let canonicalUrl = `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;
  let ogImageUrl = routeMeta.ogImage || DEFAULT_OG_IMAGE;

  const template = viewMode === 'templates' && templateSlug ? getTemplateBySlug(templateSlug) : null;
  if (!activeMeme && viewMode === 'templates') {
    pageTitle = template ? template.title : TEMPLATES_INDEX_META.title;
    pageDesc = template ? template.description : TEMPLATES_INDEX_META.description;
    if (template) ogImageUrl = `${SITE_ORIGIN}${template.image}`;
  } else if (!activeMeme && viewMode === 'creator' && creatorHandle) {
    const clean = String(creatorHandle).trim().replace(/^@+/, '');
    pageTitle = `@${clean} — Creator Profile, Memes & High Scores | THE MEMES.net`;
    pageDesc = `Browse @${clean}'s memes, 8-bit pixel avatar, earned badges, followers, and 80s Cyber-Arcade high scores on THE MEMES.net.`;
    canonicalUrl = `${SITE_ORIGIN}/u/${encodeURIComponent(clean)}`;
  } else if (!showStudio && !extrasDrawerOpen && !(bossKeyActive && prankDisguise) && NON_PATH_VIEW_MODES[viewMode]) {
    pageTitle = NON_PATH_VIEW_MODES[viewMode].title;
    pageDesc = NON_PATH_VIEW_MODES[viewMode].description;
  }

  if (activeMeme) {
    const author = activeMeme.author_name || 'Anon';
    pageTitle = `${activeMeme.title} — Meme by @${author} | THE MEMES.net`;
    pageDesc = memeSeoDescription(activeMeme);
    canonicalUrl = `${SITE_ORIGIN}${memePath(activeMeme)}`;
    const isVid = activeMeme.media_type === 'video';
    const safeOg = sanitizeMediaUrl(isVid ? activeMeme.poster_url : activeMeme.image_url, '');
    if (safeOg && !safeOg.startsWith('data:') && !safeOg.startsWith('blob:')) {
      ogImageUrl = safeOg.startsWith('/') ? `${SITE_ORIGIN}${safeOg}` : safeOg;
    }
  }
  // Link previews: the 1200×630 share card (meme + "make your own" bar) when the meme has one.
  const memeCard = activeMeme ? shareCardUrl(activeMeme.id) : null;
  const previewImageUrl = memeCard || ogImageUrl;

  document.title = pageTitle;
  upsertCanonical(canonicalUrl);

  upsertMeta('meta[name="description"]', 'name', 'description', pageDesc);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDesc);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  const isBannerOg = Boolean(memeCard) || ogImageUrl === DEFAULT_OG_IMAGE || ogImageUrl.startsWith(`${SITE_ORIGIN}/og/`);
  const ogW = template && !activeMeme ? String(template.width) : isBannerOg ? '1200' : '540';
  const ogH = template && !activeMeme ? String(template.height) : isBannerOg ? '630' : '480';
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', previewImageUrl);
  upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', ogW);
  upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', ogH);
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDesc);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', previewImageUrl);
  upsertMeta(
    'meta[property="og:image:alt"]',
    'property',
    'og:image:alt',
    activeMeme ? shareCardAlt(activeMeme) : 'THE MEMES.net — Free Meme Generator, Soundboard & Retro Arcade Games'
  );
  upsertMeta(
    'meta[name="twitter:image:alt"]',
    'name',
    'twitter:image:alt',
    activeMeme ? shareCardAlt(activeMeme) : 'THE MEMES.net — Free Meme & GIF Maker & Funny Memes'
  );

  if (activeMeme?.media_type === 'video') {
    const safeVid = sanitizeMediaUrl(activeMeme.image_url, '');
    if (safeVid) {
      upsertMeta('meta[property="og:video"]', 'property', 'og:video', safeVid);
    } else {
      document.querySelector('meta[property="og:video"]')?.remove();
    }
  } else {
    document.querySelector('meta[property="og:video"]')?.remove();
  }

  // Inject dynamic Schema.org JSON-LD (meme-level or route-level SoftwareApplication / ImageGallery)
  let ldScript = document.getElementById('tm-dynamic-jsonld');
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'tm-dynamic-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  if (activeMeme) {
    ldScript.textContent = JSON.stringify(buildMemeJsonLd(activeMeme, canonicalUrl, ogImageUrl));
  } else if (viewMode === 'templates') {
    ldScript.textContent = JSON.stringify(
      template ? buildTemplateJsonLd(template, SITE_ORIGIN) : buildTemplatesIndexJsonLd(SITE_ORIGIN)
    );
  } else if (viewMode === 'creator' && creatorHandle) {
    const clean = String(creatorHandle).trim().replace(/^@+/, '');
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `@${clean} Creator Profile`,
      description: pageDesc,
      url: canonicalUrl,
      mainEntity: {
        '@type': 'Person',
        name: clean,
        alternateName: `@${clean}`,
        url: canonicalUrl
      }
    });
  } else {
    ldScript.textContent = JSON.stringify(buildRouteJsonLd(routeMeta, canonicalUrl, ogImageUrl));
  }
}

export function buildRouteJsonLd(routeMeta = {}, canonicalUrl = SITE_ORIGIN, ogImageUrl = DEFAULT_OG_IMAGE) {
  const schemaType = routeMeta.schemaType || (routeMeta.openStudio ? 'SoftwareApplication' : routeMeta.prerenderCategory ? 'ImageGallery' : 'WebApplication');
  if (schemaType === 'SoftwareApplication' || schemaType === 'WebApplication') {
    return {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: routeMeta.h1 || routeMeta.title || 'THE MEMES.net Meme & GIF Maker',
      description: routeMeta.description || '',
      url: canonicalUrl,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any (Web, iOS Safari, Android Chrome, Desktop)',
      image: ogImageUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      }
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: routeMeta.h1 || routeMeta.title || 'THE MEMES.net',
    description: routeMeta.description || '',
    url: canonicalUrl,
    image: ogImageUrl
  };
}
