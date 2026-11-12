// ==========================================
// PHASE 28.15: DAILY CAPTION BATTLE
// Repurposes Daily Bounty into a daily 1-template caption contest:
//   - Deterministic template per calendar day from STUDIO_TEMPLATES
//   - End-of-day countdown until local midnight
//   - Day-one clearly-labelled @TheMemesHQ sample captions
//   - Yesterday's top community caption earns tomorrow's "👑 Caption King" banner & badge
// ==========================================
import { STUDIO_TEMPLATES, isSeedMeme } from '../data/starterMemes';
import { getTodayDateString } from './tokenEconomy';

export function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashDateToIndex(dateStr, length) {
  if (!length) return 0;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

export function getDailyCaptionBattle(dateStr = getTodayDateString()) {
  const idx = hashDateToIndex(dateStr, STUDIO_TEMPLATES.length);
  const template = STUDIO_TEMPLATES[idx] || STUDIO_TEMPLATES[0];
  return {
    id: `battle-${dateStr}`,
    battleId: `battle-${dateStr}`,
    dateStr,
    tag: (template?.category || 'dank').toUpperCase(),
    prompt: `Caption today's template (${template?.name || 'Daily Format'}) — top score wins tomorrow's 👑 Caption King crown!`,
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
  return getDailyCaptionBattle(getYesterdayDateString());
}

/**
 * Day-one sample captions by @TheMemesHQ (clearly labelled as sample seed captions).
 */
export function getDayOneSampleCaptions(battle) {
  if (!battle?.template) return [];
  const tpl = battle.template;
  const baseTime = new Date(`${battle.dateStr}T08:00:00`).getTime() || Date.now() - 3600000;
  return [
    {
      id: `seed-battle-${battle.dateStr}-1`,
      title: `${tpl.defaultTop} / ${tpl.defaultBottom}`,
      category: battle.category,
      author_name: 'TheMemesHQ',
      is_seed: true,
      is_sample_caption: true,
      is_bounty: true,
      bounty_id: battle.battleId,
      score: 42,
      media_type: 'image',
      image_url: tpl.src,
      base_image_url: tpl.src,
      overlay: {
        v: 1,
        layers: [
          { id: 't1', type: 'text', text: tpl.defaultTop, font: 'Anton', align: 'center', fill: '#ffffff', stroke: 0.08, strokeColor: '#000000', x: 0.5, y: 0.12, w: 0.9, h: 0.18 },
          { id: 'b1', type: 'text', text: tpl.defaultBottom, font: 'Anton', align: 'center', fill: '#facc15', stroke: 0.08, strokeColor: '#000000', x: 0.5, y: 0.88, w: 0.9, h: 0.18 }
        ]
      },
      created_at: new Date(baseTime).toISOString(),
      reactions: { '🔥': 4, '💀': 2, '😂': 5, '🗿': 1 },
      comments: []
    },
    {
      id: `seed-battle-${battle.dateStr}-2`,
      title: 'OPENING THE APP FOR 1 MINUTE / STILL HERE 2 HOURS LATER',
      category: battle.category,
      author_name: 'TheMemesHQ',
      is_seed: true,
      is_sample_caption: true,
      is_bounty: true,
      bounty_id: battle.battleId,
      score: 28,
      media_type: 'image',
      image_url: tpl.src,
      base_image_url: tpl.src,
      overlay: {
        v: 1,
        layers: [
          { id: 't2', type: 'text', text: 'JUST CHECKING ONE MEME', font: 'Anton', align: 'center', fill: '#ffffff', stroke: 0.08, strokeColor: '#000000', x: 0.5, y: 0.12, w: 0.9, h: 0.18 },
          { id: 'b2', type: 'text', text: 'IT IS NOW 3:14 AM', font: 'Anton', align: 'center', fill: '#00f3ff', stroke: 0.08, strokeColor: '#000000', x: 0.5, y: 0.88, w: 0.9, h: 0.18 }
        ]
      },
      created_at: new Date(baseTime + 600000).toISOString(),
      reactions: { '🔥': 3, '💀': 1, '😂': 3, '🗿': 0 },
      comments: []
    }
  ];
}

export function getBattleEntriesForBattle(memes = [], battle) {
  if (!battle) return [];
  const realEntries = memes.filter((m) => {
    if (!m || isSeedMeme(m)) return false;
    if (m.bounty_id === battle.battleId) return true;
    if (m.is_bounty && String(m.created_at || '').slice(0, 10) === battle.dateStr) return true;
    return false;
  });
  const samples = getDayOneSampleCaptions(battle).map((sample) => {
    const liveMatch = memes.find((m) => String(m.id) === String(sample.id));
    return liveMatch || sample;
  });
  const combined = [...realEntries, ...samples];
  return combined.sort((a, b) => {
    const aSeed = isSeedMeme(a);
    const bSeed = isSeedMeme(b);
    if (aSeed !== bSeed) return aSeed ? 1 : -1;
    return (b.score || 0) - (a.score || 0);
  });
}

/**
 * Computes yesterday's real Caption King winner (never faked — only real user/community entries win).
 */
export function getYesterdayCaptionKing(memes = []) {
  const yesterday = getYesterdayCaptionBattle();
  const candidates = memes
    .filter((m) => {
      if (!m || isSeedMeme(m)) return false;
      if (m.bounty_id === yesterday.battleId) return true;
      return Boolean(m.is_bounty) && String(m.created_at || '').slice(0, 10) === yesterday.dateStr;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (candidates.length === 0) return null;
  const winner = candidates[0];
  return {
    author_name: winner.author_name || 'AnonMemer',
    meme: winner,
    battleId: yesterday.battleId,
    dateStr: yesterday.dateStr,
    score: winner.score || 0
  };
}

/**
 * Checks if a given username has ever won a Daily Caption Battle (from yesterday or prior days in feed).
 */
export function isUsernameCaptionKing(memes = [], username = '') {
  if (!username) return false;
  const target = String(username).toLowerCase();
  const yesterdayKing = getYesterdayCaptionKing(memes);
  if (yesterdayKing && String(yesterdayKing.author_name || '').toLowerCase() === target) {
    return true;
  }
  const todayStr = getTodayDateString();
  // Group past bounty entries by date and see if this user topped any closed day
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

export function getTimeUntilEndOfDay() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
