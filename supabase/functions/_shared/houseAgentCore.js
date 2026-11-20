// ==========================================
// Workstream 1 — pure helpers for the `house-agent` Edge Function (no Deno / network APIs).
// Unit-tested in tests/unit/houseAgent.unit.mjs.
// ==========================================
import { cleanText } from './publishCore.js';

export const HOUSE_LIMITS = {
  lineMax: 60, // aiCaptionCore style: at most 60 characters a line
  battleCaptionMax: 140, // caption_battle_entries.top_text / bottom_text check
  duplicateDays: 30,
  duplicateThreshold: 0.8,
  seedMinMinutesLeft: 60,
  topicsPerRun: 8
};

export const TASKS = ['daily_memes', 'seed_battle', 'weekly_bounty'];
export const SEED_STYLES = ['deadpan', 'absurd', 'relatable'];

// ---------------------------------------------------------------- time / run keys
/** Wall-clock parts in a time zone (default Europe/London, same as battle_settings.timezone). */
export function localParts(date = new Date(), timeZone = 'Europe/London') {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
    hourCycle: 'h23'
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: p.weekday };
}

/**
 * Daily-memes slot from the LOCAL hour, so the UTC cron (08:15/13:15/18:15) maps to the same
 * three slots in GMT and BST: morning < 11:00 ≤ midday < 16:00 ≤ evening.
 */
export function memeSlotForHour(hour) {
  if (hour < 11) return { slot: 'morning', index: 0 };
  if (hour < 16) return { slot: 'midday', index: 1 };
  return { slot: 'evening', index: 2 };
}

/** memes_per_day spread over 3 runs (6 → 2/2/2, 7 → 3/2/2, 1 → 1/0/0). */
export function memesForSlot(perDay, index) {
  const n = Math.max(0, Math.floor(Number(perDay) || 0));
  return Math.floor(n / 3) + (index < n % 3 ? 1 : 0);
}

/** Idempotency key: one run per (task, local date, slot). */
export function runKey(task, localDate, slot) {
  if (!TASKS.includes(task)) throw new Error('bad_task');
  return `${task}:${localDate}:${slot}`;
}

/**
 * Run `fn` at most once per key. `store.claim(key)` must atomically return true for the first
 * caller only (the Edge Function inserts agent_runs with ON CONFLICT DO NOTHING).
 */
export async function runOnce(store, key, fn) {
  const claimed = await store.claim(key);
  if (!claimed) return { status: 'skipped', reason: 'already_ran', run_key: key };
  return fn();
}

// ---------------------------------------------------------------- topic safety
/** Rule layer. Anything that matches is dropped before (and regardless of) the LLM check. */
export const BLOCKED_TOPIC_RULES = [
  ['death', /\b(dies|died|dead|death|deaths|killed|kills|killing|funeral|obituary|passed away|rip|tribute|mourn\w*|suicide|murder\w*|homicide)\b/i],
  ['disaster', /\b(earthquake|flood\w*|hurricane|tornado|wildfire|tsunami|disaster|crash(?:es|ed)?|derail\w*|explosion|collapse\w*|evacuat\w*|casualt\w*)\b/i],
  ['crime', /\b(arrest\w*|charged|court|trial|sentenc\w*|jail\w*|prison|police|stabb\w*|shoot\w*|shot|gunman|assault\w*|robbery|fraud|scam|abuse\w*|missing|kidnap\w*|terror\w*|attack\w*)\b/i],
  ['war', /\b(war|wars|invasion|missile\w*|airstrike\w*|military|troops|army|bomb\w*|hostage\w*|ceasefire|gaza|israel|ukraine|russia|hamas|nato)\b/i],
  ['politics', /\b(election\w*|vote|voting|ballot|poll|polls|parliament|congress|senate|president|prime minister|pm|mp|minister|government|labour|tory|tories|conservative\w*|democrat\w*|republican\w*|trump|biden|harris|starmer|farage|reform uk|policy|budget|tax|immigration|protest\w*|referendum)\b/i],
  ['religion', /\b(church|mosque|synagogue|temple|pope|religio\w*|islam\w*|muslim\w*|christian\w*|jewish|hindu\w*|sikh\w*|bible|quran|god|allah|jesus)\b/i],
  ['health', /\b(cancer|covid|virus|outbreak|pandemic|disease|illness|diagnos\w*|hospital\w*|surgery|stroke|overdose|vaccin\w*|measles|bird flu|mpox|recall)\b/i],
  ['minors', /\b(child|children|kid|kids|baby|babies|toddler|teen|teenager|schoolgirl|schoolboy|pupil|minor|minors|boy|girl)\b/i],
  ['sexual', /\b(sex\w*|nude\w*|naked|porn\w*|onlyfans|affair|cheating)\b/i]
];

function normTopic(t) {
  return String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** → { reason } when a topic is blocked by the rules or the owner's blocked_topics list, else null. */
export function topicRuleBlock(topic, blockedTopics = []) {
  const t = normTopic(topic);
  if (!t || t.length < 2) return { reason: 'empty' };
  for (const b of blockedTopics || []) {
    const bt = normTopic(b);
    if (bt && t.includes(bt)) return { reason: 'blocked_topics' };
  }
  for (const [reason, re] of BLOCKED_TOPIC_RULES) if (re.test(t)) return { reason };
  return null;
}

/**
 * Combine the rule layer with the LLM's verdicts. Fail closed: a topic is kept only if the rules
 * pass AND the model returned an explicit safe=true AND known=true (it can say what the topic is;
 * opaque trending names make nonsense memes). → { kept, dropped: [{topic, reason}], gists }
 */
export function filterTopics(topics = [], verdicts = [], blockedTopics = []) {
  const byTopic = new Map((verdicts || []).map((v) => [normTopic(v?.topic), v]));
  const kept = [];
  const dropped = [];
  const gists = {};
  const seen = new Set();
  for (const topic of topics) {
    const key = normTopic(topic);
    if (seen.has(key)) continue;
    seen.add(key);
    const rule = topicRuleBlock(topic, blockedTopics);
    if (rule) {
      dropped.push({ topic, reason: rule.reason });
      continue;
    }
    const v = byTopic.get(key);
    if (!v) dropped.push({ topic, reason: 'no_verdict' });
    else if (v.safe !== true) dropped.push({ topic, reason: `llm:${String(v.reason || 'unsafe').slice(0, 40)}` });
    else if (v.known === false) dropped.push({ topic, reason: 'llm:unknown_topic' });
    else {
      kept.push(topic);
      if (v.gist) gists[topic] = String(v.gist).slice(0, 120);
    }
  }
  return { kept, dropped, gists };
}

// ---------------------------------------------------------------- captions & duplicates
export function tidyLine(s, max = HOUSE_LIMITS.lineMax) {
  return cleanText(String(s ?? '').replace(/^["'“”]+|["'“”]+$/g, ''), max);
}

export function normalizeCaption(lines = []) {
  return (Array.isArray(lines) ? lines : [lines])
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token-set Jaccard similarity of two captions (0..1). */
export function captionSimilarity(a, b) {
  const A = new Set(normalizeCaption(a).split(' ').filter(Boolean));
  const B = new Set(normalizeCaption(b).split(' ').filter(Boolean));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * True when the same template was already used with a near-identical caption.
 * `recent`: [{ template_id, lines }] from the last 30 days (callers filter by date).
 */
export function isNearDuplicate(candidate, recent = [], threshold = HOUSE_LIMITS.duplicateThreshold) {
  return (recent || []).some(
    (r) => r?.template_id === candidate?.template_id && captionSimilarity(r.lines, candidate.lines) >= threshold
  );
}

/** Caption lines out of a stored overlay (house memes) — for the duplicate check. */
export function linesFromOverlay(overlay) {
  return (overlay?.layers || []).filter((l) => l?.type === 'text').map((l) => String(l.text || ''));
}

/**
 * Is a 2-line caption good enough to post? Needs a real punchline (bottom line), no duplicated
 * lines, and enough words to be a joke rather than a fragment.
 */
export function isUsableCaption(lines = []) {
  const [top = '', bottom = ''] = lines.map((l) => String(l ?? '').trim());
  if (!bottom) return false;
  if (top && top.toLowerCase() === bottom.toLowerCase()) return false;
  const words = `${top} ${bottom}`.split(/\s+/).filter(Boolean).length;
  return words >= 4;
}

// ---------------------------------------------------------------- feed ranking (mirror of SQL)
/** (reactions + 2×comments + 1) / (hours_since_post + 2)^1.5 — same as memes_feed_view.hot_score. */
export function hotScore({ reactions = 0, comments = 0, hoursSincePost = 0 } = {}) {
  const r = Math.max(0, Number(reactions) || 0);
  const c = Math.max(0, Number(comments) || 0);
  const h = Math.max(0, Number(hoursSincePost) || 0);
  return (r + 2 * c + 1) / Math.pow(h + 2, 1.5);
}

/**
 * Re-slot house items in an already hot-sorted list so any 4 consecutive cards hold at most
 * 1 house item (same algorithm as public.get_hot_feed). House items that would need more
 * human cards than exist are dropped.
 */
export function capHouseShare(sorted = [], isHouse = (x) => x?.is_house, gap = 3) {
  const humans = [];
  const houses = [];
  sorted.forEach((item) => {
    if (isHouse(item)) houses.push({ item, naturalBefore: humans.length });
    else humans.push(item);
  });
  let prev = -Infinity;
  const slots = houses.map((h) => {
    const at = Math.max(h.naturalBefore, prev + gap);
    prev = at;
    return { ...h, at };
  });
  const out = [];
  let hi = 0;
  for (let i = 0; i <= humans.length; i += 1) {
    while (hi < slots.length && slots[hi].at === i) out.push(slots[hi++].item);
    if (i < humans.length) out.push(humans[i]);
  }
  return out;
}

// ---------------------------------------------------------------- misc
export function slugify(s, max = 40) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

/** Constant-time string compare for the shared secret. */
export function safeEqual(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0 && x.length > 0;
}
