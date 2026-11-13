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

const NON_PATH_VIEW_MODES = {
  reels: {
    title: 'Vertical Meme Reels — Fullscreen Community Memes | THE MEMES.net',
    description:
      'Swipe through fullscreen vertical meme reels, double-tap to upvote, remix templates in one tap, and share direct links.'
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
  category = 'all',
  viewMode = 'feed',
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
    showStudio,
    forgeIntent,
    extrasDrawerOpen,
    extrasFocus,
    bossKeyActive,
    prankDisguise
  });

  let pageTitle = routeMeta.title;
  let pageDesc = routeMeta.description;
  let canonicalUrl = `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;
  let ogImageUrl = routeMeta.ogImage || DEFAULT_OG_IMAGE;

  if (!showStudio && !extrasDrawerOpen && !(bossKeyActive && prankDisguise) && NON_PATH_VIEW_MODES[viewMode]) {
    pageTitle = NON_PATH_VIEW_MODES[viewMode].title;
    pageDesc = NON_PATH_VIEW_MODES[viewMode].description;
  }

  if (activeMeme) {
    const author = activeMeme.author_name || 'Anon';
    pageTitle = `${activeMeme.title} — Meme by @${author} | THE MEMES.net`;
    pageDesc = `View, upvote (${activeMeme.score || 1} pts), roast with AI, or remix "${activeMeme.title}" by @${author} on THE MEMES.net.`;
    canonicalUrl = `${SITE_ORIGIN}/m/${encodeURIComponent(String(activeMeme.id))}`;
    if (
      activeMeme.media_type !== 'video' &&
      typeof activeMeme.image_url === 'string' &&
      (activeMeme.image_url.startsWith('https://') || activeMeme.image_url.startsWith('/'))
    ) {
      ogImageUrl = activeMeme.image_url.startsWith('/')
        ? `${SITE_ORIGIN}${activeMeme.image_url}`
        : activeMeme.image_url;
    }
  }

  document.title = pageTitle;
  upsertCanonical(canonicalUrl);

  upsertMeta('meta[name="description"]', 'name', 'description', pageDesc);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDesc);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', ogImageUrl);
  upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', ogImageUrl === DEFAULT_OG_IMAGE ? '1200' : '540');
  upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', ogImageUrl === DEFAULT_OG_IMAGE ? '630' : '480');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDesc);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImageUrl);

  if (activeMeme?.media_type === 'video') {
    upsertMeta('meta[property="og:video"]', 'property', 'og:video', activeMeme.image_url);
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
    const isVid = activeMeme.media_type === 'video';
    const schema = {
      '@context': 'https://schema.org',
      '@type': isVid ? 'VideoObject' : 'SocialMediaPosting',
      headline: activeMeme.title,
      name: activeMeme.title,
      description: pageDesc,
      url: canonicalUrl,
      datePublished: activeMeme.created_at || new Date().toISOString(),
      ...(isVid
        ? {
            thumbnailUrl: [activeMeme.poster_url || activeMeme.image_url],
            uploadDate: activeMeme.created_at || new Date().toISOString(),
            contentUrl: activeMeme.image_url
          }
        : {}),
      author: {
        '@type': 'Person',
        name: activeMeme.author_name || 'AnonMemer'
      },
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: Number(activeMeme.score || 1)
      },
      ...(!isVid
        ? {
            sharedContent: {
              '@type': 'ImageObject',
              name: activeMeme.title,
              caption: `${activeMeme.title} (${activeMeme.category || 'meme'})`
            }
          }
        : {})
    };
    ldScript.textContent = JSON.stringify(schema);
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
