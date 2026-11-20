// ==========================================
// Phase 33 task 33.4 — local text filter (layer 1 of text moderation).
// Pure JS, no runtime APIs: runs in the Edge Functions, in the browser (instant feedback) and
// in `npm run test:unit`. The browser copy is only a friendly first pass; the server decides.
//
// Normalisation defeats the usual evasions before matching the blocklist:
//   look-alike Unicode (NFKC, accents stripped, Cyrillic/Greek homoglyphs), leet-speak
//   (n1gg@ → nigga), separators and spacing (n.i.g.g.a, n i g g a), repeated letters
//   (niiiigggga), zero-width characters. Matching is whole-word by default so innocent words
//   ("Scunthorpe", "grape", "therapist", "Pakistan", "raccoon") are not hit.
// ==========================================
import { ENCODED_BLOCKLIST, rot13 } from './textBlocklist.js';
import { TEXT_MODERATION } from './textModerationConfig.js';

const CONFUSABLES = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ԁ: 'd', ѕ: 's',
  к: 'k', м: 'm', н: 'h', т: 't', в: 'b', г: 'r', ɡ: 'g', ı: 'i', ł: 'l', ø: 'o', ß: 'ss', æ: 'ae',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ω: 'w'
};
const LEET = {
  0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g',
  '!': 'i', '|': 'i', '@': 'a', $: 's', '+': 't', '€': 'e', '£': 'l', '¡': 'i', '(': 'c', '<': 'c'
};
/** Real words that contain an 'inside' term. They are ignored for inside-word matching. */
const INNOCENT_WORDS = new Set(['snigger', 'sniggers', 'sniggered', 'sniggering', 'niggard', 'niggardly']);

/** Lower-case + NFKC: what the raw (link / personal-info) checks look at. */
export function rawForm(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase();
}

/**
 * Words form: only a–z and single spaces. 'l' is folded into 'i' (1/l/i/| are interchangeable
 * in leet), runs of 3+ identical letters are cut to 2, and runs of single letters are joined
 * ("n i g g a" → "nigga").
 */
export function wordsForm(text) {
  let s = rawForm(text).normalize('NFKD').replace(/\p{M}/gu, '');
  s = Array.from(s, (ch) => CONFUSABLES[ch] ?? LEET[ch] ?? ch).join('');
  s = s.replace(/l/g, 'i').replace(/[^a-z]+/g, ' ').replace(/([a-z])\1{2,}/g, '$1$1').trim();
  const tokens = s ? s.split(' ') : [];
  const joined = [];
  let run = '';
  for (const t of tokens) {
    if (t.length === 1) {
      run += t;
    } else {
      if (run) joined.push(run);
      run = '';
      joined.push(t);
    }
  }
  if (run) joined.push(run);
  return joined.join(' ');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Each letter may repeat and may be followed by a space ("k i l l", "kiiill", "kill your self"). */
function termPattern(term) {
  const letters = wordsForm(term).replace(/ /g, '');
  return Array.from(letters, (c) => `${escapeRe(c)}+`).join(' ?');
}

const SUFFIX = '(?:s|z|es|ed|d|er|ers|ing|y)?';

const COMPILED = ENCODED_BLOCKLIST.map(([enc, category, mode]) => {
  const p = termPattern(rot13(enc));
  return {
    category,
    mode,
    re: mode === 'inside' ? new RegExp(p) : new RegExp(`(?<![a-z])${p}${SUFFIX}(?![a-z])`)
  };
});

const DOMAIN_TLDS =
  'com|net|org|io|gg|co|uk|ru|xyz|ly|me|tv|app|link|site|shop|info|biz|online|club|live|store|cc|to|ai|dev|fun|top|click';
const LINK_RES = [
  /\bhttps?:\/\//,
  /\bwww\s*\./,
  new RegExp(`\\b[a-z0-9][a-z0-9-]*\\s*(?:\\.|\\(dot\\)|\\[dot\\]|\\sdot\\s)\\s*(?:${DOMAIN_TLDS})\\b(?!\\.?[a-z])`),
  /\b(?:discord\.gg|t\.me|bit\.ly)\b/
];
const PERSONAL_RES = [
  /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[a-z0-9-]+\s*(?:\.|\(dot\)|\sdot\s)\s*[a-z]{2,}/, // email
  /(?:\+|\b00)\d{1,3}[\s.-]?\d(?:[\s.-]?\d){8,}/, // international phone
  /\b07\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/, // UK mobile
  /\b0[12]\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}\b/, // UK landline
  /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/, // US-style phone
  // Street address. Postcodes alone are NOT matched: all-caps captions like "PS5 2ND HAND"
  // look like postcodes, and a postcode alone rarely identifies a person.
  /\b\d{1,4}\s+[a-z]+(?:\s+[a-z]+)?\s+(?:street|road|rd|avenue|ave|lane|crescent|grove|terrace)\b/
];

function stripAllowedDomains(raw, config) {
  let s = raw;
  for (const d of config.allowedDomains || []) {
    s = s.replace(new RegExp(`(?:https?://)?(?:www\\.)?${escapeRe(d)}`, 'g'), ' ');
  }
  return s;
}

/** True if a handle is reserved (exactly, or contains our brand name). */
export function isReservedName(name, config = TEXT_MODERATION) {
  const squashed = wordsForm(name).replace(/ /g, '');
  if (!squashed) return false;
  const reserved = config.reservedNames.map((n) => wordsForm(n).replace(/ /g, ''));
  return reserved.includes(squashed) || squashed.includes(wordsForm('thememes').replace(/ /g, ''));
}

function impersonates(raw, config) {
  for (const m of raw.matchAll(/@\s*([a-z0-9._-]+)/g)) {
    const handle = m[1].replace(/[._-]/g, '');
    if (config.reservedNames.includes(handle) || handle.includes('thememes')) return true;
  }
  return raw.replace(/[\s._-]+/g, '').includes('thememeshq');
}

/**
 * checkText(text) → { decision: 'approve' | 'reject', category?, rule? }
 * category: hate | threat | sexual | spam | links | personal_info | impersonation
 */
export function checkText(text, config = TEXT_MODERATION) {
  const raw = rawForm(text);
  if (!raw.trim()) return { decision: 'approve' };

  // Personal info first: an email address also looks like a link.
  if (config.blockPersonalInfo && PERSONAL_RES.some((re) => re.test(raw))) {
    return { decision: 'reject', category: 'personal_info', rule: 'personal_info' };
  }
  if (config.blockLinks) {
    const s = stripAllowedDomains(raw, config);
    if (LINK_RES.some((re) => re.test(s))) return { decision: 'reject', category: 'links', rule: 'link' };
  }
  if (config.blockImpersonation && impersonates(raw, config)) {
    return { decision: 'reject', category: 'impersonation', rule: 'reserved_name' };
  }

  const words = wordsForm(text);
  const insideWords = words
    .split(' ')
    .filter((w) => !INNOCENT_WORDS.has(w))
    .join(' ');
  for (const t of COMPILED) {
    if (t.re.test(t.mode === 'inside' ? insideWords : words)) {
      return { decision: 'reject', category: t.category, rule: 'blocklist' };
    }
  }
  const extraTerms = Array.isArray(config?.extraTerms) ? config.extraTerms : [];
  for (const term of extraTerms) {
    const cleanTerm = String(term ?? '').trim();
    if (!cleanTerm) continue;
    const p = termPattern(cleanTerm);
    if (!p) continue;
    const re = new RegExp(`(?<![a-z])${p}${SUFFIX}(?![a-z])`);
    if (re.test(words)) {
      return { decision: 'reject', category: 'custom_blocklist', rule: 'blocklist' };
    }
  }
  return { decision: 'approve' };
}

/** Check several strings; the first rejection wins. */
export function checkTexts(texts, config = TEXT_MODERATION) {
  for (const t of texts || []) {
    const r = checkText(t, config);
    if (r.decision === 'reject') return r;
  }
  return { decision: 'approve' };
}
