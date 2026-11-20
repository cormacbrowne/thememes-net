// ==========================================
// Workstream 1 — topic sources for the house agent.
// Live: Google Trends daily RSS (GB + US). Fallback: this evergreen list.
// ==========================================

export const TRENDS_FEEDS = ['https://trends.google.com/trending/rss?geo=GB', 'https://trends.google.com/trending/rss?geo=US'];

/** Safe, always-relatable topics used when Trends is down or every trend is filtered out. */
export const EVERGREEN_TOPICS = [
  'Mondays',
  'Wi-Fi dropping at the worst moment',
  'group chats',
  'the group chat that never stops',
  'gaming at 3 AM',
  'one more game',
  'coding bugs that fix themselves',
  'works on my machine',
  'school homework deadlines',
  'meetings that could have been an email',
  'working from home',
  'pets who think they run the house',
  'cats knocking things off tables',
  'dogs vs the postman',
  'food delivery taking forever',
  'the last slice of pizza',
  'British weather',
  'forgetting your umbrella',
  'new phone launches',
  'software updates at the worst time',
  'charging cables that never reach',
  'alarm clocks and snoozing',
  'online shopping carts',
  'spoilers'
];

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Titles of <item>s in a Trends RSS feed (the channel title is skipped). */
export function parseTrendsRss(xml) {
  const out = [];
  for (const item of String(xml || '').matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const m = item[0].match(/<title>([\s\S]*?)<\/title>/i);
    if (!m) continue;
    const t = decodeEntities(m[1]).replace(/\s+/g, ' ').slice(0, 80);
    if (t.length >= 2) out.push(t);
  }
  return out;
}

/** Fetch both feeds (8 s each). Returns { topics, source } and never throws. */
export async function fetchTrendTopics({ fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const topics = [];
  for (const url of TRENDS_FEEDS) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: ac.signal, headers: { Accept: 'application/rss+xml, text/xml' } });
      if (res.ok) topics.push(...parseTrendsRss(await res.text()).slice(0, 20));
    } catch {
      // fall through to the evergreen list
    } finally {
      clearTimeout(timer);
    }
  }
  const unique = [...new Map(topics.map((t) => [t.toLowerCase(), t])).values()];
  return unique.length ? { topics: unique, source: 'google_trends' } : { topics: [], source: 'evergreen' };
}
