// Submits URLs from the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver...).
// Usage:  npm run indexnow                  every URL in https://www.thememes.net/sitemap.xml
//         npm run indexnow -- --pages       site pages only (skips /m/<id> meme pages)
//         npm run indexnow -- <url> <url>   specific URLs only
// Runs automatically after every production deploy that changes site pages
// (.github/workflows/indexnow.yml, with --pages). New/approved/removed memes are pinged
// one by one by the publish-meme and moderate Edge Functions.
import process from 'node:process';
import { INDEXNOW_KEY, INDEXNOW_ORIGIN, submitIndexNow } from '../supabase/functions/_shared/indexNow.js';

async function sitemapUrls() {
  const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"')
  );
}

const args = process.argv.slice(2);
const pagesOnly = args.includes('--pages');
const explicit = args.filter((a) => !a.startsWith('--'));

const keyCheck = await fetch(`${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`).catch(() => null);
if (!keyCheck?.ok) {
  console.error(`Key file is not live yet (deploy first): /${INDEXNOW_KEY}.txt`);
  process.exit(1);
}

let urls = explicit.length ? explicit : await sitemapUrls();
if (pagesOnly) urls = urls.filter((u) => !new URL(u).pathname.startsWith('/m/'));
console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);
const result = await submitIndexNow(urls);
console.log(result.ok ? `Accepted (HTTP ${result.status}).` : `Not accepted (HTTP ${result.status}).`);
process.exit(result.ok ? 0 : 1);
