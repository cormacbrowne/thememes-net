import { supabase } from '../supabaseClient';
import { ensureWriteSession } from './serverWrites';

export const ARCADE_INITIALS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
export const INITIALS_SAVE_KEY = 'tm_arcade_initials_v1';

export const EMPTY_LEADERBOARD_COPY = 'No scores yet. Be the first name on the cabinet.';
export const LEADERBOARD_FOR_FUN_COPY =
  'Leaderboards are marked for fun — browser games cannot be made cheat-proof.';

export const LEADERBOARD_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'all_time', label: 'All-time' }
];

export const ARCADE_SCORE_LIMITS = {
  invaders: { baseScore: 6000, perSec: 1500, hardMax: 500000 },
  serpent: { baseScore: 4000, perSec: 900, hardMax: 250000 },
  blaster: { baseScore: 5000, perSec: 1200, hardMax: 400000 },
  sunset: { baseScore: 8000, perSec: 1800, hardMax: 600000 },
  void: { baseScore: 6000, perSec: 1500, hardMax: 500000 },
  riders: { baseScore: 5000, perSec: 1200, hardMax: 300000 },
  pinball: { baseScore: 15000, perSec: 3000, hardMax: 1000000 },
  crush: { baseScore: 8000, perSec: 1800, hardMax: 500000 },
  pusher: { baseScore: 6000, perSec: 1500, hardMax: 500000 },
  stocks: { baseScore: 2000, perSec: 400, hardMax: 250000 },
  slots: { baseScore: 6000, perSec: 1200, hardMax: 250000 },
  blackjack: { baseScore: 5000, perSec: 1000, hardMax: 250000 },
  roulette: { baseScore: 8000, perSec: 1500, hardMax: 250000 },
  poker: { baseScore: 6000, perSec: 1200, hardMax: 250000 },
  bingo: { baseScore: 3000, perSec: 600, hardMax: 100000 },
  derby: { baseScore: 4000, perSec: 900, hardMax: 150000 },
  hilow: { baseScore: 100, perSec: 12, hardMax: 5000 }
};

export const LEADERBOARD_GAMES = [
  { id: 'invaders', label: "Meme Invaders '86", icon: '👾', unit: 'pts', accent: '#00f3ff' },
  { id: 'serpent', label: 'Neon Serpent', icon: '🐍', unit: 'pts', accent: '#4ade80' },
  { id: 'blaster', label: 'Brick Blaster', icon: '🧱', unit: 'pts', accent: '#f472b6' },
  { id: 'sunset', label: 'Sunset Sprint', icon: '🌅', unit: 'pts', accent: '#fb923c' },
  { id: 'void', label: 'Vector Void', icon: '🛸', unit: 'pts', accent: '#38bdf8' },
  { id: 'riders', label: 'Grid Riders', icon: '🏍️', unit: 'pts', accent: '#00f3ff' },
  { id: 'pinball', label: "Vegas Neon Pinball '86", icon: '🎱', unit: 'pts', accent: '#c084fc' },
  { id: 'crush', label: "Meme Crush '86", icon: '🍬', unit: 'pts', accent: '#f472b6' },
  { id: 'pusher', label: "Neon Coin Dozer '86", icon: '🎰', unit: 'pts', accent: '#facc15' },
  { id: 'hilow', label: 'Higher or Lower', icon: '⬆️', unit: 'streak', accent: '#38bdf8' },
  { id: 'stocks', label: "Meme Stonks '86", icon: '📈', unit: 'M$', accent: '#a3e635' },
  { id: 'slots', label: 'Cyber-Vegas Slots', icon: '🎰', unit: 'M$', accent: '#fb7185' },
  { id: 'blackjack', label: "Neon 21's Blackjack", icon: '🃏', unit: 'M$', accent: '#22d3ee' },
  { id: 'roulette', label: "Lightning Roulette '86", icon: '🎡', unit: 'M$', accent: '#fb923c' },
  { id: 'poker', label: "Neon Hold'em '86", icon: '♠️', unit: 'chips', accent: '#34d399' },
  { id: 'bingo', label: "Neon Bingo '86", icon: '🔮', unit: 'M$', accent: '#e879f9' },
  { id: 'derby', label: "Neon Derby '86", icon: '🏇', unit: 'M$', accent: '#fbbf24' }
];

// Keep exact parity with SQL check_initials_allowed() blocklist.
export const BLOCKED_INITIALS = new Set([
  'ASS', 'AZN', 'COK', 'CUM', 'DIK', 'DIC', 'FAG', 'FCK', 'FKU', 'FUC',
  'FUK', 'GAY', 'HOE', 'JAP', 'JEW', 'KKK', 'KNT', 'KYS', 'NIG', 'NGR',
  'PEE', 'PIS', 'POO', 'PRK', 'PUS', 'SEX', 'SHT', 'SLM', 'SPK', 'STD',
  'TIT', 'VAG', 'WOP', 'WTF', 'XXX', 'CNT', 'BCH', 'SUK'
]);

const CONTINUOUS_GAMES = new Set(['stocks', 'pusher']);

const activeSessions = new Map();

export function isLeaderboardGame(gameId) {
  return Boolean(gameId && Object.prototype.hasOwnProperty.call(ARCADE_SCORE_LIMITS, gameId));
}

export function isContinuousLeaderboardGame(gameId) {
  return CONTINUOUS_GAMES.has(gameId);
}

export function sanitizeInitials(raw) {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return cleaned.padEnd(3, 'A');
}

export function isAllowedInitials(raw) {
  const code = String(raw || '').toUpperCase().trim();
  if (!/^[A-Z0-9]{3}$/.test(code)) return false;
  return !BLOCKED_INITIALS.has(code);
}

export function maxPlausibleScoreForElapsed(gameId, elapsedSeconds = 1) {
  const lim = ARCADE_SCORE_LIMITS[gameId];
  if (!lim) return 0;
  const elapsed = Math.max(1, Number(elapsedSeconds) || 1);
  return Math.min(lim.hardMax, lim.baseScore + Math.floor(elapsed * lim.perSec));
}

export function qualifiesForTop10(entries, score, limit = 10) {
  const cleanScore = Math.floor(Number(score) || 0);
  if (cleanScore < 1) return false;
  if (!Array.isArray(entries) || entries.length < limit) return true;
  const sorted = [...entries].sort((a, b) => (b?.score || 0) - (a?.score || 0));
  const cutoff = sorted[limit - 1]?.score || 0;
  return cleanScore > cutoff;
}

export function loadSavedInitials() {
  try {
    const raw = localStorage.getItem(INITIALS_SAVE_KEY);
    if (raw && isAllowedInitials(raw)) return raw;
  } catch {
    // ignore storage failures
  }
  return 'NEO';
}

export function saveInitials(initials) {
  const clean = sanitizeInitials(initials);
  if (!isAllowedInitials(clean)) return;
  try {
    localStorage.setItem(INITIALS_SAVE_KEY, clean);
  } catch {
    // ignore storage failures
  }
}

export function getActiveGameSession(gameId) {
  return activeSessions.get(gameId) || null;
}

export function clearActiveGameSession(gameId) {
  activeSessions.delete(gameId);
}

export async function startGameSession(gameId, client = supabase) {
  if (!isLeaderboardGame(gameId) || !client?.rpc) {
    return { ok: false, error: 'unknown_game' };
  }
  try {
    const session = await ensureWriteSession(client);
    if (!session) return { ok: false, error: 'sign_in_required' };

    const { data, error } = await client.rpc('start_game_session', { p_game: gameId });
    if (error || !data?.ok) {
      return { ok: false, error: data?.error || error?.message || 'session_failed' };
    }
    const record = {
      sessionId: data.session_id,
      gameId,
      issuedAtMs: Date.now()
    };
    activeSessions.set(gameId, record);
    return { ok: true, ...record };
  } catch (err) {
    return { ok: false, error: err?.message || 'network' };
  }
}

export async function fetchGameLeaderboard(
  gameId,
  period = 'all_time',
  limit = 10,
  client = supabase
) {
  if (!isLeaderboardGame(gameId) || !client?.rpc) {
    return { ok: false, game: gameId, period, entries: [] };
  }
  try {
    const { data, error } = await client.rpc('get_game_leaderboard', {
      p_game: gameId,
      p_period: period,
      p_limit: limit
    });
    if (error || !data?.ok) {
      return { ok: false, game: gameId, period, entries: [], error: error?.message || data?.error };
    }
    return {
      ok: true,
      game: data.game || gameId,
      period: data.period || period,
      entries: Array.isArray(data.entries) ? data.entries : []
    };
  } catch (err) {
    return { ok: false, game: gameId, period, entries: [], error: err?.message || 'network' };
  }
}

export async function submitArcadeScore({
  sessionId,
  gameId,
  score,
  initials,
  client = supabase
}) {
  const cleanInitials = String(initials || '').toUpperCase().trim();
  const cleanScore = Math.floor(Number(score) || 0);

  if (!isLeaderboardGame(gameId)) return { ok: false, error: 'unknown_game' };
  if (cleanScore < 1) return { ok: false, error: 'invalid_score' };
  if (!isAllowedInitials(cleanInitials)) return { ok: false, error: 'blocked_initials' };
  if (!client?.rpc) return { ok: false, error: 'network' };

  try {
    const authSess = await ensureWriteSession(client);
    if (!authSess) return { ok: false, error: 'sign_in_required' };

    let resolvedSessionId = sessionId || activeSessions.get(gameId)?.sessionId || null;
    if (!resolvedSessionId) {
      const started = await startGameSession(gameId, client);
      if (!started.ok) return started;
      resolvedSessionId = started.sessionId;
    }

    const { data, error } = await client.rpc('submit_arcade_score', {
      p_session_id: resolvedSessionId,
      p_game: gameId,
      p_score: cleanScore,
      p_initials: cleanInitials
    });

    if (error) {
      return { ok: false, error: error.message || 'submit_failed' };
    }
    if (!data?.ok) {
      return { ok: false, error: data?.error || 'submit_rejected', ...data };
    }

    saveInitials(cleanInitials);
    activeSessions.delete(gameId);
    // Start a fresh cabinet token in the background for the player's next run.
    void startGameSession(gameId, client);
    return data;
  } catch (err) {
    return { ok: false, error: err?.message || 'network' };
  }
}
