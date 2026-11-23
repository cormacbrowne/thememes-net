// Single source for a meme page's search description and Schema.org JSON-LD.
// Used by api/meme-og.js (live /m/<id>), scripts/prerender-seo.mjs (starter memes)
// and src/utils/seoEngine.js (after the app loads), so all three always agree.
// Pure JS: no browser or Node APIs.

const ORIGIN = 'https://www.thememes.net';

function categoryLabel(meme) {
  return String(meme?.category || '').replace(/[-_]+/g, ' ').trim();
}

export function memeSeoDescription(meme = {}) {
  const cat = categoryLabel(meme);
  const author = meme.author_name || 'Anon';
  return `"${meme.title || 'Funny meme'}" — a${cat ? ` ${cat}` : ''} meme by @${author} with ${Number(
    meme.score || 1
  )} upvotes. Laugh, vote, share it, or make your own free with the THE MEMES.net meme generator.`;
}

/** imageUrl: absolute URL of the image (or the video poster). */
export function buildMemeJsonLd(meme = {}, canonicalUrl, imageUrl) {
  const author = meme.author_name || 'Anon';
  const title = String(meme.title || 'Meme');
  const cat = categoryLabel(meme);
  const isVideo = meme.media_type === 'video';
  const description = memeSeoDescription(meme);
  const media = isVideo
    ? {
        '@type': 'VideoObject',
        name: title,
        description,
        thumbnailUrl: imageUrl,
        ...(meme.created_at ? { uploadDate: meme.created_at } : {})
      }
    : {
        '@type': 'ImageObject',
        contentUrl: imageUrl,
        url: imageUrl,
        caption: title,
        creditText: `@${author} on THE MEMES.net`,
        creator: meme.is_seed
          ? { '@type': 'Organization', name: 'THE MEMES.net' }
          : { '@type': 'Person', name: author },
        copyrightNotice: meme.is_seed
          ? 'AI-generated image published by THE MEMES.net'
          : `@${author} on THE MEMES.net`,
        acquireLicensePage: `${ORIGIN}/terms`
      };
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    '@id': `${canonicalUrl}#post`,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    headline: title.slice(0, 110),
    description,
    ...(meme.created_at ? { datePublished: meme.created_at } : {}),
    author: { '@type': 'Person', name: author, url: `${ORIGIN}/u/${encodeURIComponent(author)}` },
    ...(cat ? { keywords: `${cat} meme, funny meme` } : {}),
    image: imageUrl,
    ...(isVideo ? { video: media } : { sharedContent: media }),
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: Number(meme.score || 0)
    },
    publisher: { '@id': `${ORIGIN}/#organization` }
  };
}

/** Supabase project that serves the `share-card` Edge Function. */
const SHARE_CARD_ENDPOINT = 'https://otvvphmjojqyjaznjzyo.supabase.co/functions/v1/share-card';

/** Memes that have a share card: uploaded memes (UUID) and the built-in starter memes. */
export function hasShareCard(id) {
  const s = String(id || '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || /^seed-[a-z]+-\d{1,3}$/.test(s);
}

/**
 * 1200×630 JPEG link-preview picture for a meme (the meme + a THE MEMES.net "make your own" bar).
 * WhatsApp, iMessage, Discord, X and Facebook all show it when someone pastes /m/<id>.
 */
export function shareCardUrl(id) {
  return hasShareCard(id) ? `${SHARE_CARD_ENDPOINT}?id=${encodeURIComponent(String(id).toLowerCase())}` : null;
}

/** Alt text for the preview picture. */
export function shareCardAlt(meme = {}) {
  const title = String(meme.title || 'Funny meme').slice(0, 120);
  return `${title} (meme on THE MEMES.net)`;
}

/**
 * Plan 2.2: readable meme URLs, /m/<id>/<slug>. The id alone still works (old links, shares);
 * the slug is only decoration for people and search engines, so a changed title never breaks a link.
 * Built-in sample memes keep /m/<id> (their pages are static files).
 */
export function memeSlug(title = '') {
  return String(title || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export function memePath(meme = {}) {
  const id = encodeURIComponent(String(meme?.id || ''));
  if (!id) return '/';
  if (/^(?:seed|tpl)-/i.test(String(meme.id))) return `/m/${id}`;
  const slug = memeSlug(meme.title);
  return slug ? `/m/${id}/${slug}` : `/m/${id}`;
}

export function memeUrl(meme = {}, origin = ORIGIN) {
  return `${origin}${memePath(meme)}`;
}

/** Extracts template slug if a meme's base_image_url points to `/meme-templates/<slug>.webp`. */
export function extractTemplateSlug(url = '') {
  const m = String(url || '').match(/\/meme-templates\/([a-z0-9-]+)\.webp(?:\?|$)/i);
  return m ? m[1].toLowerCase() : null;
}
