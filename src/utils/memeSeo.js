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
        creator: { '@type': 'Person', name: author },
        copyrightNotice: `@${author} on THE MEMES.net`,
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
