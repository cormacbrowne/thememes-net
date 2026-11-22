// ==========================================
// PHASE 28.15 + PHASE 33.15: REAL DAILY CAPTION BATTLE
//   - Deterministic template per UTC calendar day from STUDIO_TEMPLATES
//   - Entries, votes, and yesterday's winner stored in Supabase (through 33.2–33.4)
//   - Winner earns the 👑 Caption King frame for 24 h + permanent entry on /hall-of-fame
// ==========================================
import { STUDIO_TEMPLATES, isSeedMeme } from '../data/starterMemes';
import { supabase } from '../supabaseClient';
import { ensureWriteSession, precheckTexts, textRejectionMessage } from './serverWrites';
import { track } from './analytics';
import { ensureActionBotCheck, getTurnstileToken } from './turnstile';
import { formatRateLimitMessage } from '../../supabase/functions/_shared/rateLimitAndBot.js';

export const CAPTION_BATTLE_FUNCTION = 'submit-caption-entry';

export function getUtcDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function getYesterdayUtcDateString(now = new Date()) {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function hashDateToIndex(dateStr, length) {
  if (!length) return 0;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getTemplateById(templateId) {
  return STUDIO_TEMPLATES.find((t) => t.id === templateId) || STUDIO_TEMPLATES[0];
}

export function getDailyCaptionBattle(dateStr = getUtcDateString()) {
  const idx = hashDateToIndex(dateStr, STUDIO_TEMPLATES.length);
  const template = STUDIO_TEMPLATES[idx] || STUDIO_TEMPLATES[0];
  return {
    id: `battle-${dateStr}`,
    battleId: `battle-${dateStr}`,
    dateStr,
    tag: (template?.category || 'dank').toUpperCase(),
    prompt: `Caption today's template (${template?.name || 'Daily Format'}) — top score wins tomorrow's 👑 Caption King 24h frame & permanent /hall-of-fame crown!`,
    template,
    category: template?.category || 'dank',
    defaultTop: template?.defaultTop || 'WHEN THE DAILY BATTLE DROPS',
    defaultBottom: template?.defaultBottom || 'TOP CAPTION TAKES THE CROWN',
    rewardXp: 200,
    baseMeme: {
      id: template?.id || 'tpl-drake-compare',
      image_url: template?.src || '/seed/tpl-drake-compare.webp',
      base_image_url: template?.src || '/seed/tpl-drake-compare.webp',
      media_type: 'image',
      category: template?.category || 'dank'
    }
  };
}

export function getYesterdayCaptionBattle() {
  return getDailyCaptionBattle(getYesterdayUtcDateString());
}

/**
 * Day-one visual inspiration samples by @TheMemesHQ (strictly preview-only; never counted as entries or winners).
 */
export function getDayOneSampleCaptions(battle) {
  if (!battle?.template) return [];
  const tpl = battle.template;
  return [
    {
      id: `seed-battle-${battle.dateStr}-1`,
      author_name: 'TheMemesHQ',
      is_seed: true,
      is_sample_caption: true,
      template_id: tpl.id,
      top_text: tpl.defaultTop,
      bottom_text: tpl.defaultBottom
    },
    {
      id: `seed-battle-${battle.dateStr}-2`,
      author_name: 'TheMemesHQ',
      is_seed: true,
      is_sample_caption: true,
      template_id: tpl.id,
      top_text: 'JUST CHECKING ONE MEME',
      bottom_text: 'IT IS NOW 3:14 AM'
    }
  ];
}

export function getBattleEntriesForBattle(memes = [], battle) {
  if (!battle) return [];
  return memes
    .filter((m) => {
      if (!m || isSeedMeme(m)) return false;
      if (m.bounty_id === battle.battleId) return true;
      return Boolean(m.is_bounty) && String(m.created_at || '').slice(0, 10) === battle.dateStr;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function buildCaptionOverlay(topText = '', bottomText = '') {
  const layers = [];
  if (topText) {
    layers.push({
      id: 'cap-top',
      type: 'text',
      text: topText,
      font: 'Anton',
      align: 'center',
      fill: '#ffffff',
      stroke: 0.08,
      strokeColor: '#000000',
      x: 0.5,
      y: 0.12,
      w: 0.9,
      h: 0.2
    });
  }
  if (bottomText) {
    layers.push({
      id: 'cap-bottom',
      type: 'text',
      text: bottomText,
      font: 'Anton',
      align: 'center',
      fill: '#facc15',
      stroke: 0.08,
      strokeColor: '#000000',
      x: 0.5,
      y: 0.88,
      w: 0.9,
      h: 0.2
    });
  }
  return { v: 1, layers };
}

export function isActiveCaptionKing(username = '', activeKings = [], fallbackDateMs = Date.now()) {
  if (!username || !Array.isArray(activeKings)) return false;
  const target = String(username).trim().toLowerCase();
  return activeKings.some((k) => {
    if (!k?.author_name) return false;
    if (String(k.author_name).trim().toLowerCase() !== target) return false;
    if (!k.crowned_until) return true;
    const until = Date.parse(k.crowned_until);
    return Number.isFinite(until) ? until > fallbackDateMs : true;
  });
}

export function isUsernameCaptionKing(memes = [], username = '', activeKings = []) {
  if (isActiveCaptionKing(username, activeKings)) return true;
  if (!username) return false;
  const target = String(username).toLowerCase();
  const todayStr = getUtcDateString();
  const byDay = new Map();
  memes.forEach((m) => {
    if (!m || isSeedMeme(m) || !m.is_bounty) return;
    const day = String(m.bounty_id || '').startsWith('battle-')
      ? String(m.bounty_id).slice(7)
      : String(m.created_at || '').slice(0, 10);
    if (!day || day >= todayStr) return;
    const cur = byDay.get(day);
    if (!cur || (m.score || 0) > (cur.score || 0)) {
      byDay.set(day, m);
    }
  });
  for (const winMeme of byDay.values()) {
    if (String(winMeme.author_name || '').toLowerCase() === target) {
      return true;
    }
  }
  return false;
}

export function getTimeUntilEndOfDay(now = new Date()) {
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, nextUtcMidnight - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export async function fetchDailyCaptionBattle(client = supabase) {
  if (!client?.rpc) {
    return {
      ok: false,
      dateStr: getUtcDateString(),
      entries: [],
      yesterdayWinner: null,
      myVotedEntryIds: [],
      activeKings: []
    };
  }
  try {
    const { data, error } = await client.rpc('get_daily_caption_battle');
    if (error || !data?.ok) {
      return {
        ok: false,
        dateStr: getUtcDateString(),
        entries: [],
        yesterdayWinner: null,
        myVotedEntryIds: [],
        activeKings: [],
        error: error?.message || data?.error || 'fetch_failed'
      };
    }
    return {
      ok: true,
      dateStr: data.date_str || getUtcDateString(),
      yesterdayDateStr: data.yesterday_date_str || getYesterdayUtcDateString(),
      entries: Array.isArray(data.entries) ? data.entries : [],
      yesterdayWinner: data.yesterday_winner || null,
      myVotedEntryIds: Array.isArray(data.my_voted_entry_ids) ? data.my_voted_entry_ids : [],
      activeKings: Array.isArray(data.active_kings) ? data.active_kings : []
    };
  } catch (err) {
    return {
      ok: false,
      dateStr: getUtcDateString(),
      entries: [],
      yesterdayWinner: null,
      myVotedEntryIds: [],
      activeKings: [],
      error: err?.message || 'network'
    };
  }
}

export async function submitCaptionBattleEntry(
  { battleDate, templateId, topText, bottomText },
  client = supabase
) {
  const cleanTop = String(topText || '').trim();
  const cleanBottom = String(bottomText || '').trim();
  if (!cleanTop && !cleanBottom) {
    return { ok: false, error: 'empty_caption', message: '✏️ Enter a Top or Bottom caption first!' };
  }

  const problem = precheckTexts([cleanTop, cleanBottom]);
  if (problem) {
    return { ok: false, error: 'rejected', detail: problem, message: textRejectionMessage(problem) };
  }

  if (!client?.functions?.invoke) {
    return { ok: false, error: 'network', message: '📡 Server unavailable right now.' };
  }

  const sess = await ensureWriteSession(client);
  if (!sess) {
    return { ok: false, error: 'sign_in_required', message: '🔑 Could not start player session.' };
  }

  const turnstileToken = await getTurnstileToken('upload');
  const { data, error } = await client.functions.invoke(CAPTION_BATTLE_FUNCTION, {
    body: {
      battleDate: battleDate || getUtcDateString(),
      templateId,
      topText: cleanTop,
      bottomText: cleanBottom,
      ...(turnstileToken ? { turnstileToken } : {})
    }
  });

  if (error) {
    let payload;
    try {
      payload = (await error.context?.json?.()) || {};
    } catch {
      payload = {};
    }
    const errCode = payload.error || 'network';
    if (errCode === 'rejected') {
      return {
        ok: false,
        error: 'rejected',
        detail: payload.detail || 'rules',
        message: textRejectionMessage(payload.detail)
      };
    }
    if (errCode === 'rate_limited') {
      return {
        ok: false,
        error: 'rate_limited',
        message: payload.message || formatRateLimitMessage(payload.retry_after_seconds)
      };
    }
    return {
      ok: false,
      error: errCode,
      message: payload.message || '📡 Could not submit caption right now.'
    };
  }

  if (!data?.ok) {
    return {
      ok: false,
      error: data?.error || 'submit_failed',
      message: data?.detail ? textRejectionMessage(data.detail) : '📡 Could not submit caption.'
    };
  }

  track('battle_entry', { template: String(templateId || '') });
  return data;
}

export async function voteCaptionBattleEntry(entryId, active = true, client = supabase) {
  if (!entryId || !client?.rpc) return { ok: false, error: 'bad_request' };
  const sess = await ensureWriteSession(client);
  if (!sess) {
    return { ok: false, error: 'sign_in_required', message: '🔑 Could not start player session.' };
  }
  await ensureActionBotCheck('vote');
  const { data, error } = await client.rpc('vote_caption_battle_entry', {
    p_entry_id: entryId,
    p_active: Boolean(active)
  });
  if (error) {
    return { ok: false, error: error.message || 'vote_failed', message: '📡 Vote failed right now.' };
  }
  if (!data?.ok) {
    return {
      ok: false,
      error: data?.error || 'vote_rejected',
      message:
        data?.error === 'rate_limited'
          ? data.message || formatRateLimitMessage(data.retry_after_seconds)
          : '⚠️ Could not record vote.'
    };
  }
  return data;
}

export async function fetchCaptionHallOfFame(limit = 50, client = supabase) {
  if (!client?.rpc) return { ok: false, winners: [], activeKings: [] };
  try {
    const { data, error } = await client.rpc('get_caption_hall_of_fame', { p_limit: limit });
    if (error || !data?.ok) {
      return { ok: false, winners: [], activeKings: [], error: error?.message || data?.error };
    }
    return {
      ok: true,
      winners: Array.isArray(data.winners) ? data.winners : [],
      activeKings: Array.isArray(data.active_kings) ? data.active_kings : []
    };
  } catch (err) {
    return { ok: false, winners: [], activeKings: [], error: err?.message || 'network' };
  }
}

export async function fetchActiveCaptionKings(client = supabase) {
  if (!client?.rpc) return [];
  try {
    const { data, error } = await client.rpc('get_active_caption_kings');
    if (error || !data?.ok) return [];
    return Array.isArray(data.active_kings) ? data.active_kings : [];
  } catch {
    return [];
  }
}

// ==========================================
// PLAN 2.1 — DAILY CAPTION BATTLE v2 (server-scheduled battles)
//   One battle a day (09:00 Europe/London → 24 h), opened/closed by pg_cron.
//   One entry per player, editable until close. Live totals stay hidden until the
//   voter has voted on a few entries. Top 3 get a badge + play-money M$ to claim.
// ==========================================
export const BATTLE_CAPTION_MAX_DEFAULT = 120;

const EMPTY_STATE = Object.freeze({
  ok: false,
  battle: null,
  entries: [],
  entryCount: 0,
  humanEntryCount: 0,
  showTotals: false,
  votesNeeded: 0,
  myVotes: [],
  mySkips: [],
  myEntry: null,
  previous: null,
  captionMax: BATTLE_CAPTION_MAX_DEFAULT
});

export function normalizeBattleState(data) {
  if (!data?.ok) return { ...EMPTY_STATE, error: data?.error || 'fetch_failed' };
  return {
    ok: true,
    battle: data.battle || null,
    entries: Array.isArray(data.entries) ? data.entries : [],
    entryCount: Number(data.entry_count) || 0,
    // House (MemeBot) seed entries are not counted here: "0 entries" becomes "Be the first to enter".
    humanEntryCount: Number(data.human_entry_count ?? data.entry_count) || 0,
    showTotals: Boolean(data.show_totals),
    votesNeeded: Math.max(0, Number(data.votes_needed) || 0),
    myVotes: (data.my_votes || []).map(String),
    mySkips: (data.my_skips || []).map(String),
    myEntry: data.my_entry || null,
    previous: data.previous || null,
    captionMax: Number(data.settings?.caption_max) || BATTLE_CAPTION_MAX_DEFAULT
  };
}

export async function fetchBattleState(battleId = null, client = supabase) {
  if (!client?.rpc) return { ...EMPTY_STATE, error: 'offline' };
  try {
    const { data, error } = await client.rpc('get_battle_state', battleId ? { p_battle_id: battleId } : {});
    if (error) return { ...EMPTY_STATE, error: error.message || 'fetch_failed' };
    return normalizeBattleState(data);
  } catch (err) {
    return { ...EMPTY_STATE, error: err?.message || 'network' };
  }
}

const ENTRY_ERROR_MESSAGES = {
  battle_closed: '⏰ That battle has closed. Refresh for today’s battle!',
  caption_too_long: '✂️ Too long: keep your caption under the character limit.',
  entry_removed: '🚫 Your entry for this battle was removed by a moderator.',
  empty_caption: '✏️ Write a caption first!',
  sign_in_required: '🔑 Could not start your player session. Try again.',
  suspended: '⛔ Your account is suspended, so you can’t enter right now.'
};

/** Enter (or edit) today's battle. Same moderation and limits as the server. */
export async function submitBattleEntry({ battleId, topText, bottomText, captionMax }, client = supabase) {
  const cleanTop = String(topText || '').trim();
  const cleanBottom = String(bottomText || '').trim();
  if (!cleanTop && !cleanBottom) return { ok: false, error: 'empty_caption', message: ENTRY_ERROR_MESSAGES.empty_caption };
  const max = Number(captionMax) || BATTLE_CAPTION_MAX_DEFAULT;
  if (cleanTop.length + cleanBottom.length > max) {
    return { ok: false, error: 'caption_too_long', message: ENTRY_ERROR_MESSAGES.caption_too_long };
  }
  const problem = precheckTexts([cleanTop, cleanBottom]);
  if (problem) return { ok: false, error: 'rejected', detail: problem, message: textRejectionMessage(problem) };
  if (!client?.functions?.invoke) return { ok: false, error: 'network', message: '📡 Server unavailable right now.' };

  const sess = await ensureWriteSession(client);
  if (!sess) return { ok: false, error: 'sign_in_required', message: ENTRY_ERROR_MESSAGES.sign_in_required };

  const turnstileToken = await getTurnstileToken('upload');
  const { data, error } = await client.functions.invoke(CAPTION_BATTLE_FUNCTION, {
    body: { battleId, topText: cleanTop, bottomText: cleanBottom, ...(turnstileToken ? { turnstileToken } : {}) }
  });
  if (error) {
    let payload;
    try {
      payload = (await error.context?.json?.()) || {};
    } catch {
      payload = {};
    }
    const code = payload.error || 'network';
    if (code === 'rejected') {
      return { ok: false, error: 'rejected', detail: payload.detail || 'rules', message: textRejectionMessage(payload.detail) };
    }
    if (code === 'rate_limited') {
      return { ok: false, error: code, message: payload.message || formatRateLimitMessage(payload.retry_after_seconds) };
    }
    return { ok: false, error: code, message: ENTRY_ERROR_MESSAGES[code] || '📡 Could not submit your caption right now.' };
  }
  if (!data?.ok) return { ok: false, error: data?.error || 'submit_failed', message: '📡 Could not submit your caption.' };
  track('battle_entry', { edited: Boolean(data.edited), status: data.status || 'unknown' });
  return data;
}

/** "Funny" (true) scores a point; "Skip" (false) is recorded as seen, no point. */
export async function castBattleVote(entryId, funny = true, client = supabase) {
  const res = await voteCaptionBattleEntry(entryId, funny, client);
  if (!res.ok && res.error === 'own_entry') return { ...res, message: '🙈 You can’t vote on your own caption.' };
  if (!res.ok && res.error === 'battle_closed') return { ...res, message: '⏰ Voting has closed for this battle.' };
  return res;
}

export async function claimBattlePrize(battleId, client = supabase) {
  if (!client?.rpc || !battleId) return { ok: false, error: 'offline' };
  const { data, error } = await client.rpc('claim_battle_award', { p_battle_id: battleId });
  if (error) return { ok: false, error: error.message || 'claim_failed' };
  return data || { ok: false, error: 'claim_failed' };
}

function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Per-voter shuffle (stable for the same voter + battle) so early entries get no head start.
 */
export function shuffleForVoter(entries = [], seed = 'anon') {
  const rand = seededRandom(String(seed));
  const out = [...entries];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Entries still waiting for this voter's Funny/Skip (never their own). */
export function entriesToVoteOn(state, seed) {
  if (!state?.entries) return [];
  const seen = new Set([...(state.myVotes || []), ...(state.mySkips || [])]);
  const pool = state.entries.filter((e) => e.status === 'approved' && !e.is_mine && !seen.has(String(e.id)));
  return shuffleForVoter(pool, `${seed}:${state.battle?.id || ''}`);
}

export function formatCountdown(endsAt, now = Date.now()) {
  const end = Date.parse(endsAt || '');
  if (!Number.isFinite(end)) return '--:--:--';
  const total = Math.max(0, Math.floor((end - now) / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function entryCaption(entry) {
  return [entry?.top_text, entry?.bottom_text].filter(Boolean).join(' / ');
}
