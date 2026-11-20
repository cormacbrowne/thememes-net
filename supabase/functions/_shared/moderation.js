// ==========================================
// Phase 33 — moderation used by `publish-meme`.
//   33.3 images: provider adapters (Sightengine, OpenAI omni-moderation) chosen by env vars,
//                thresholds in moderationConfig.js. FAIL CLOSED: no provider, no key, timeout,
//                HTTP error, quota or an unreadable reply → 'review' (meme stays `pending`).
//   33.4 text:   local blocklist (textFilter.js) + OpenAI omni-moderation, thresholds in
//                textModerationConfig.js; same fail-closed rules.
//
// Verdict shape:
//   { decision: 'approve' | 'review' | 'reject', provider, reason,
//     categories: { [category]: score }, flagged: [category…], zeroTolerance: boolean }
//
// Env vars (Supabase → Edge Functions → Secrets; NEVER VITE_ / never committed):
//   IMAGE_MODERATION_PROVIDER = sightengine | openai | none
//   SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET     (for sightengine)
//   OPENAI_API_KEY                                    (for openai)
// ==========================================
import { IMAGE_MODERATION } from './moderationConfig.js';
import { TEXT_MODERATION } from './textModerationConfig.js';
import { checkTexts } from './textFilter.js';

const ORDER = { approve: 0, review: 1, reject: 2 };
const worst = (a, b) => (ORDER[b] > ORDER[a] ? b : a);

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const maxOf = (...vals) => {
  const ok = vals.map(num).filter((v) => v !== null);
  return ok.length ? Math.max(...ok) : null;
};

/**
 * Provider adapters: turn a provider reply into our category scores.
 * `supports` lists the categories the provider can actually judge; categories it cannot
 * judge are reported in `unsupported` (so the gap is visible) but do not block approval.
 * A supported category with no score in the reply is treated as 'review' (fail closed).
 */
export const ADAPTERS = {
  sightengine: {
    supports: ['sexual', 'gore', 'hate_symbols', 'self_harm', 'drugs', 'weapon_threat'],
    models: 'nudity-2.1,gore-2.0,offensive-2.0,self-harm,recreational_drug,weapon',
    toScores(json) {
      const n = json?.nudity || {};
      const o = json?.offensive || {};
      return {
        sexual: maxOf(n.sexual_activity, n.sexual_display, n.erotica, num(n.very_suggestive) !== null ? n.very_suggestive * 0.5 : null),
        gore: num(json?.gore?.prob),
        // middle_finger is ordinary meme rudeness and asian_swastika is a religious symbol: not counted.
        hate_symbols: maxOf(o.nazi, o.confederate, o.supremacist, o.terrorist),
        self_harm: num(json?.['self-harm']?.prob),
        drugs: num(json?.recreational_drug?.prob),
        weapon_threat: num(json?.weapon?.firearm_action?.aiming_threat)
      };
    }
  },
  openai: {
    // omni-moderation scores images for sexual, violence and self-harm only.
    supports: ['sexual', 'gore', 'self_harm', 'weapon_threat'],
    toScores(json) {
      const s = json?.results?.[0]?.category_scores || {};
      return {
        sexual: num(s.sexual),
        gore: num(s['violence/graphic']),
        self_harm: maxOf(s['self-harm'], s['self-harm/intent'], s['self-harm/instructions']),
        weapon_threat: num(s.violence)
      };
    }
  }
};

/** Apply the thresholds from moderationConfig.js to one set of scores. */
export function scoresToVerdict(provider, scores, config = IMAGE_MODERATION) {
  const adapter = ADAPTERS[provider];
  const categories = {};
  const flagged = [];
  let decision = 'approve';
  let zeroTolerance = false;
  for (const [cat, t] of Object.entries(config.thresholds)) {
    if (!adapter?.supports.includes(cat)) continue;
    const score = num(scores?.[cat]);
    categories[cat] = score;
    let d;
    if (score === null) d = 'review';
    else if (score >= t.reject) d = 'reject';
    else if (score >= t.review) d = 'review';
    else d = 'approve';
    // Missing data stays 'review'; only a real score is escalated to reject.
    if (config.zeroToleranceCategories.includes(cat) && score !== null && d !== 'approve') {
      d = 'reject';
      zeroTolerance = true;
    }
    if (d !== 'approve') flagged.push(cat);
    decision = worst(decision, d);
  }
  const unsupported = Object.keys(config.thresholds).filter((c) => !adapter?.supports.includes(c));
  return { decision, provider, categories, flagged, unsupported, zeroTolerance };
}

function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function withTimeout(fetchImpl, url, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callProvider(provider, sample, env, fetchImpl, config) {
  if (provider === 'sightengine') {
    const user = env.get('SIGHTENGINE_API_USER');
    const secret = env.get('SIGHTENGINE_API_SECRET');
    if (!user || !secret) return { error: 'missing_api_key' };
    const form = new FormData();
    form.append('media', new Blob([sample.data], { type: sample.contentType }), 'meme.webp');
    form.append('models', ADAPTERS.sightengine.models);
    form.append('api_user', user);
    form.append('api_secret', secret);
    const res = await withTimeout(fetchImpl, 'https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form }, config.timeoutMs);
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.status !== 'success') return { error: `http_${res.status}` };
    return { scores: ADAPTERS.sightengine.toScores(json) };
  }
  if (provider === 'openai') {
    const key = env.get('OPENAI_API_KEY');
    if (!key) return { error: 'missing_api_key' };
    const res = await withTimeout(
      fetchImpl,
      'https://api.openai.com/v1/moderations',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: [{ type: 'image_url', image_url: { url: `data:${sample.contentType};base64,${base64(sample.data)}` } }]
        })
      },
      config.timeoutMs
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.results?.[0]) return { error: `http_${res.status}` };
    return { scores: ADAPTERS.openai.toScores(json) };
  }
  return { error: 'no_provider' };
}

export const DEFAULT_IMAGE_MODERATION_ENABLED = false;

/**
 * moderateImage({ samples: [{ data: Uint8Array, contentType }], env, fetchImpl? })
 * Every sample (a still, or GIF first/middle/last frames) is checked; the worst verdict wins.
 */
export async function moderateImage({ samples = [], env, fetchImpl = globalThis.fetch, config = IMAGE_MODERATION, enabled } = {}) {
  if (enabled === false) {
    return { decision: 'review', provider: 'none', reason: 'image_moderation_flag_disabled' };
  }
  const provider = (env?.get?.('IMAGE_MODERATION_PROVIDER') || config.defaultProvider || 'none').toLowerCase();
  if (!ADAPTERS[provider]) {
    return { decision: 'review', provider: 'none', reason: 'image_moderation_not_configured' };
  }
  if (!samples.length) return { decision: 'review', provider, reason: 'no_samples' };
  let result = null;
  for (const sample of samples) {
    let reply;
    try {
      reply = await callProvider(provider, sample, env, fetchImpl, config);
    } catch (err) {
      reply = { error: err?.name === 'AbortError' ? 'timeout' : 'network' };
    }
    if (reply.error) return { decision: 'review', provider, reason: `provider_unavailable:${reply.error}` };
    const v = scoresToVerdict(provider, reply.scores, config);
    if (!result) {
      result = v;
    } else {
      result.decision = worst(result.decision, v.decision);
      result.zeroTolerance = result.zeroTolerance || v.zeroTolerance;
      result.flagged = [...new Set([...result.flagged, ...v.flagged])];
      for (const [k, s] of Object.entries(v.categories)) result.categories[k] = maxOf(result.categories[k], s);
    }
    if (result.decision === 'reject') break;
  }
  return { ...result, reason: result.decision === 'approve' ? 'clear' : `flagged:${result.flagged.join(',')}`, samples: samples.length };
}

/** Apply TEXT_MODERATION thresholds to one OpenAI result's category_scores. */
export function textScoresToVerdict(scores, config = TEXT_MODERATION) {
  const categories = {};
  const flagged = [];
  let decision = 'approve';
  let zeroTolerance = false;
  for (const [cat, t] of Object.entries(config.thresholds)) {
    const score = num(scores?.[cat]);
    categories[cat] = score;
    let d;
    if (score === null) d = 'review';
    else if (score >= t.reject) d = 'reject';
    else if (score >= t.review) d = 'review';
    else d = 'approve';
    // Missing data stays 'review'; only a real score is escalated to reject.
    if (config.zeroToleranceCategories.includes(cat) && score !== null && d !== 'approve') {
      d = 'reject';
      zeroTolerance = true;
    }
    if (d !== 'approve') flagged.push(cat);
    decision = worst(decision, d);
  }
  return { decision, categories, flagged, zeroTolerance };
}

/**
 * moderateText({ texts, env, fetchImpl? })  — task 33.4
 * Layer 1: local blocklist / links / personal info / impersonation (textFilter.js): a hit is
 *          an instant 'reject' with a `category` the UI can explain.
 * Layer 2: OpenAI omni-moderation on all texts in one request; worst result wins.
 * Fail closed: no provider / key, timeout, HTTP error or odd reply → 'review'.
 */
export async function moderateText({ texts = [], env, fetchImpl = globalThis.fetch, config = TEXT_MODERATION, extraTerms = [] } = {}) {
  const list = (texts || []).map((t) => String(t ?? '').trim()).filter(Boolean);
  if (!list.length) return { decision: 'approve', provider: 'none', reason: 'no_text' };

  const effectiveConfig = Array.isArray(extraTerms) && extraTerms.length ? { ...config, extraTerms } : config;
  const local = checkTexts(list, effectiveConfig);
  if (local.decision === 'reject') {
    return { decision: 'reject', provider: 'blocklist', reason: `local:${local.category}`, category: local.category };
  }

  const provider = (env?.get?.('TEXT_MODERATION_PROVIDER') || config.defaultProvider || 'none').toLowerCase();
  if (provider !== 'openai') return { decision: 'review', provider: 'none', reason: 'text_moderation_not_configured' };
  const key = env?.get?.('OPENAI_API_KEY');
  if (!key) return { decision: 'review', provider, reason: 'provider_unavailable:missing_api_key' };

  let json;
  try {
    const res = await withTimeout(
      fetchImpl,
      'https://api.openai.com/v1/moderations',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'omni-moderation-latest', input: list })
      },
      config.timeoutMs
    );
    json = await res.json().catch(() => null);
    if (!res.ok) return { decision: 'review', provider, reason: `provider_unavailable:http_${res.status}` };
  } catch (err) {
    return { decision: 'review', provider, reason: `provider_unavailable:${err?.name === 'AbortError' ? 'timeout' : 'network'}` };
  }
  const results = json?.results;
  if (!Array.isArray(results) || results.length !== list.length) {
    return { decision: 'review', provider, reason: 'provider_unavailable:bad_reply' };
  }
  let out = { decision: 'approve', categories: {}, flagged: [], zeroTolerance: false };
  for (const r of results) {
    const v = textScoresToVerdict(r?.category_scores, config);
    out = {
      decision: worst(out.decision, v.decision),
      flagged: [...new Set([...out.flagged, ...v.flagged])],
      zeroTolerance: out.zeroTolerance || v.zeroTolerance,
      categories: Object.fromEntries(
        Object.keys(v.categories).map((k) => [k, maxOf(out.categories[k], v.categories[k])])
      )
    };
  }
  return {
    ...out,
    provider,
    category: out.decision === 'reject' ? 'rules' : undefined,
    reason: out.decision === 'approve' ? 'clear' : `flagged:${out.flagged.join(',')}`
  };
}
