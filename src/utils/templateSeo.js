// ==========================================
// SEO for the Meme Template Library: page meta + Schema.org JSON-LD.
// Shared by the live app (seoEngine.js) and the static prerenderer (scripts/prerender-seo.mjs)
// so search engines see exactly the same data either way.
// ==========================================
import { MEME_TEMPLATES, TEMPLATES_INDEX_PATH } from '../data/memeTemplates.js';

export const TEMPLATES_INDEX_META = {
  path: TEMPLATES_INDEX_PATH,
  title: `Meme Templates — ${MEME_TEMPLATES.length} Free Original Meme Templates & Generator | THE MEMES.net`,
  description:
    `Browse ${MEME_TEMPLATES.length} free, high-quality meme templates: Two Buttons, Distracted Boyfriend, Drake-style, Expanding Brain, Change My Mind and more. Caption them online, let AI write the joke, and share.`,
  h1: 'Free Meme Templates',
  intro:
    'Pick a meme template, type your text (or let the AI Caption Writer suggest a joke), then download or share it in seconds. Every template here is our own original, high-quality artwork of a classic meme format, so you get crisp pictures that are free to use and share. No sign-up needed.'
};

const abs = (origin, p) => `${origin}${p}`;

export function templatePageMeta(t) {
  return { title: t.title, description: t.description, path: t.path, image: t.image };
}

export function buildTemplateJsonLd(t, origin) {
  const url = abs(origin, t.path);
  const img = abs(origin, t.image);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: `${t.name} Meme Template`,
        description: t.description,
        primaryImageOfPage: { '@id': `${url}#image` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        isPartOf: { '@type': 'WebSite', name: 'THE MEMES.net', url: origin }
      },
      {
        '@type': 'ImageObject',
        '@id': `${url}#image`,
        contentUrl: img,
        url: img,
        width: t.width,
        height: t.height,
        name: `${t.name} meme template (blank)`,
        caption: t.summary,
        creditText: 'THE MEMES.net',
        creator: { '@type': 'Organization', name: 'THE MEMES.net' },
        copyrightNotice: 'Original artwork by THE MEMES.net. Free to use for making memes.',
        acquireLicensePage: url
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: abs(origin, '/') },
          { '@type': 'ListItem', position: 2, name: 'Meme Templates', item: abs(origin, TEMPLATES_INDEX_PATH) },
          { '@type': 'ListItem', position: 3, name: t.name, item: url }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: t.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      }
    ]
  };
}

export function buildTemplatesIndexJsonLd(origin) {
  const url = abs(origin, TEMPLATES_INDEX_PATH);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url,
    name: TEMPLATES_INDEX_META.h1,
    description: TEMPLATES_INDEX_META.description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: MEME_TEMPLATES.length,
      itemListElement: MEME_TEMPLATES.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(origin, t.path),
        name: `${t.name} Meme Template`,
        image: abs(origin, t.thumb)
      }))
    }
  };
}
