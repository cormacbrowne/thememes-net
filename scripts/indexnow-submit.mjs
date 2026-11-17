// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, Seznam, Naver...).
// Usage:  npm run indexnow            (reads https://www.thememes.net/sitemap.xml)
//         npm run indexnow -- <url> <url>   (submit specific URLs only)
// Run after a deploy that adds or changes pages. New/approved/removed memes are pinged
// automatically by the publish-meme and moderate Edge Functions.
import process from 'node:process';
import { INDEXNOW_ORIGIN, submitIndexNow } from '../supabase/functions/_shared/indexNow.js';

async function sitemapUrls() {
  const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"')
  );
}

const keyCheck = await fetch(`${INDEXNOW_ORIGIN}/5eed15f774c2bb475174d8b3153e9496.txt`).catch(() => null);
if (!keyCheck?.ok) {
  console.error('Key file is not live yet (deploy first): /5eed15f774c2bb475174d8b3153e9496.txt');
  process.exit(1);
}

const urls = process.argv.slice(2).length ? process.argv.slice(2) : await sitemapUrls();
console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);
const result = await submitIndexNow(urls);
console.log(result.ok ? `Accepted (HTTP ${result.status}).` : `Not accepted (HTTP ${result.status}).`);
process.exit(result.ok ? 0 : 1);
