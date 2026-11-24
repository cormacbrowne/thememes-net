import { SITE_URL } from './shareText.js';

export const GUESS_STORAGE_KEY = 'tm_guess_meme_v1';

export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPuzzleNumber(dateKey) {
  const epoch = Date.UTC(2026, 0, 1);
  const [y, m, d] = String(dateKey || '').split('-').map(Number);
  const target = Date.UTC(y || 2026, (m || 1) - 1, d || 1);
  return Math.max(1, Math.floor((target - epoch) / 86400000) + 1);
}

export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdownHms(ms) {
  const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatGuessShareCard({
  puzzleNumber,
  solvedCount,
  totalRounds = 5,
  shareGrid = '',
  streak = 0
}) {
  const safeNum = Math.max(1, Number(puzzleNumber) || 1);
  const safeTotal = Math.max(1, Number(totalRounds) || 5);
  const safeSolved = Math.max(0, Math.min(safeTotal, Number(solvedCount) || 0));
  const safeStreak = Math.max(0, Number(streak) || 0);
  return [
    `THE MEMES #${safeNum} 🎯 ${safeSolved}/${safeTotal}`,
    String(shareGrid || '').trim() || '🟥'.repeat(safeTotal),
    `🔥 Streak: ${safeStreak}`,
    `${SITE_URL}/games/guess-the-meme?ref=daily`
  ].join('\n');
}

export function computeStreakFromDates(winDateKeys = [], todayKey = getLocalDateKey()) {
  const clean = Array.from(
    new Set(
      (Array.isArray(winDateKeys) ? winDateKeys : [])
        .map((k) => String(k || '').trim())
        .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    )
  ).sort();

  let bestStreak = 0;
  let run = 0;
  let prevMs = null;

  for (const key of clean) {
    const [y, m, d] = key.split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d);
    if (prevMs !== null && ms - prevMs === 86400000) {
      run += 1;
    } else {
      run = 1;
    }
    prevMs = ms;
    if (run > bestStreak) bestStreak = run;
  }

  const [ty, tm, td] = String(todayKey).split('-').map(Number);
  const todayMs = Date.UTC(ty || 2026, (tm || 1) - 1, td || 1);
  const yesterdayMs = todayMs - 86400000;
  const currentStreak =
    prevMs !== null && (prevMs === todayMs || prevMs === yesterdayMs) ? run : 0;

  return { currentStreak, bestStreak };
}

function emptyGuessState(todayKey) {
  return {
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    dailyDate: todayKey,
    dailyResults: null,
    history: {}
  };
}

export function loadGuessState(todayKey = getLocalDateKey()) {
  const fresh = emptyGuessState(todayKey);
  if (typeof window === 'undefined') return fresh;
  try {
    const raw = JSON.parse(localStorage.getItem(GUESS_STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    const history = raw.history && typeof raw.history === 'object' ? { ...raw.history } : {};
    const dailyResults =
      raw.dailyDate === todayKey && Array.isArray(raw.dailyResults)
        ? raw.dailyResults
        : Array.isArray(history[todayKey]?.results)
          ? history[todayKey].results
          : null;
    return {
      streak: Math.max(0, Number(raw.streak) || 0),
      bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
      lastCompletedDate:
        typeof raw.lastCompletedDate === 'string' ? raw.lastCompletedDate : null,
      dailyDate: todayKey,
      dailyResults,
      history
    };
  } catch {
    return fresh;
  }
}

export function saveGuessState(next) {
  if (typeof window === 'undefined' || !next) return;
  try {
    localStorage.setItem(GUESS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

export function recordLocalPuzzleResult(prevState, entry) {
  const dateKey = entry?.dateKey || getLocalDateKey();
  const prev = prevState && typeof prevState === 'object' ? prevState : emptyGuessState(dateKey);
  const nextResults = Array.isArray(entry?.results) ? entry.results : [];
  const total = Math.max(1, Number(entry?.total) || nextResults.length || 5);
  const solved = Math.max(
    0,
    Math.min(total, Number(entry?.solved ?? nextResults.filter((r) => r?.won).length) || 0)
  );
  const score = Math.max(0, Number(entry?.score) || 0);
  const grid = String(entry?.grid || nextResults.map((r) => r?.emoji || '🟥').join(''));
  const puzzleNumber = Math.max(1, Number(entry?.puzzleNumber) || getPuzzleNumber(dateKey));

  const prevHistory = prev.history && typeof prev.history === 'object' ? prev.history : {};
  const nextHistory = {
    ...prevHistory,
    [dateKey]: {
      puzzleNumber,
      solved,
      total,
      score,
      grid,
      results: nextResults,
      synced: false
    }
  };

  // Compute local win-date streak when history is populated
  const [y, m, d] = dateKey.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) - 1));
  const yKey = yesterday.toISOString().slice(0, 10);

  const nextStreak =
    solved >= 3
      ? prev.lastCompletedDate === yKey
        ? Math.max(0, Number(prev.streak) || 0) + 1
        : prev.lastCompletedDate === dateKey
          ? Math.max(1, Number(prev.streak) || 0)
          : 1
      : 0;
  const nextBest = Math.max(Number(prev.bestStreak) || 0, nextStreak);

  return {
    streak: nextStreak,
    bestStreak: nextBest,
    lastCompletedDate: dateKey,
    dailyDate: dateKey,
    dailyResults: nextResults,
    history: nextHistory
  };
}

export async function syncGuestGuessResultsToServer(client, todayKey = getLocalDateKey()) {
  if (!client || typeof client.rpc !== 'function' || !client.auth?.getSession) {
    return { ok: false, synced: 0 };
  }
  try {
    const { data: sessData } = await client.auth.getSession();
    const sessionUser = sessData?.session?.user;
    if (!sessionUser || sessionUser.is_anonymous) {
      return { ok: false, synced: 0 };
    }

    const state = loadGuessState(todayKey);
    const history = state.history && typeof state.history === 'object' ? { ...state.history } : {};

    // Ensure today's dailyResults (if migrated from pre-2.3 storage without history) is also included
    if (state.dailyDate && Array.isArray(state.dailyResults) && state.dailyResults.length >= 1 && !history[state.dailyDate]) {
      const won = state.dailyResults.filter((r) => r?.won).length;
      const pts = state.dailyResults.reduce((s, r) => s + (Number(r?.points) || 0), 0);
      history[state.dailyDate] = {
        puzzleNumber: getPuzzleNumber(state.dailyDate),
        solved: won,
        total: state.dailyResults.length,
        score: pts,
        grid: state.dailyResults.map((r) => r?.emoji || '🟥').join(''),
        results: state.dailyResults,
        synced: false
      };
    }

    let syncedCount = 0;
    const keys = Object.keys(history).sort().slice(-14);
    for (const dateKey of keys) {
      const item = history[dateKey];
      if (!item || item.synced || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      const { data: saveRes, error } = await client.rpc('save_daily_puzzle_result', {
        p_puzzle_date: dateKey,
        p_puzzle_number: Math.max(1, Number(item.puzzleNumber) || getPuzzleNumber(dateKey)),
        p_solved: Math.max(0, Number(item.solved) || 0),
        p_total: Math.max(1, Number(item.total) || 5),
        p_score: Math.max(0, Number(item.score) || 0),
        p_grid: String(item.grid || ''),
        p_results: Array.isArray(item.results) ? item.results : []
      });
      if (!error && saveRes?.ok) {
        history[dateKey] = { ...item, synced: true };
        syncedCount += 1;
      }
    }

    const { data: serverState, error: stateErr } = await client.rpc('get_my_daily_puzzle_state', {
      p_today: todayKey
    });

    if (stateErr || !serverState?.ok) {
      const next = { ...state, history };
      saveGuessState(next);
      return { ok: syncedCount > 0, synced: syncedCount, state: next };
    }

    const srvToday = serverState.today_result;
    if (srvToday && srvToday.puzzle_date === todayKey && Array.isArray(srvToday.results)) {
      history[todayKey] = {
        puzzleNumber: srvToday.puzzle_number || getPuzzleNumber(todayKey),
        solved: Number(srvToday.solved) || 0,
        total: Number(srvToday.total) || srvToday.results.length || 5,
        score: Number(srvToday.score) || 0,
        grid: String(srvToday.grid || ''),
        results: srvToday.results,
        synced: true
      };
    }

    const merged = {
      streak: Math.max(0, Number(serverState.streak) || 0),
      bestStreak: Math.max(state.bestStreak || 0, Number(serverState.best_streak) || 0),
      lastCompletedDate:
        srvToday?.puzzle_date ||
        (Array.isArray(serverState.recent_dates) ? serverState.recent_dates[0] : null) ||
        state.lastCompletedDate,
      dailyDate: todayKey,
      dailyResults:
        srvToday && Array.isArray(srvToday.results)
          ? srvToday.results
          : state.dailyResults,
      history
    };
    saveGuessState(merged);
    return { ok: true, synced: syncedCount, state: merged };
  } catch {
    return { ok: false, synced: 0 };
  }
}
