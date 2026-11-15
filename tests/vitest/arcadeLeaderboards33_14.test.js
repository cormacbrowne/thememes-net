import { describe, it, expect, vi } from 'vitest';
import {
  ARCADE_SCORE_LIMITS,
  BLOCKED_INITIALS,
  EMPTY_LEADERBOARD_COPY,
  LEADERBOARD_FOR_FUN_COPY,
  fetchGameLeaderboard,
  isAllowedInitials,
  isLeaderboardGame,
  maxPlausibleScoreForElapsed,
  qualifiesForTop10,
  sanitizeInitials,
  startGameSession,
  submitArcadeScore
} from '../../src/utils/arcadeLeaderboards.js';

describe('Task 33.14 Global Arcade Leaderboards & Initials', () => {
  it('validates 3-letter arcade initials and rejects profanity/slurs on the blocklist', () => {
    expect(isAllowedInitials('NEO')).toBe(true);
    expect(isAllowedInitials('A86')).toBe(true);
    expect(isAllowedInitials('  ace ')).toBe(true);
    expect(isAllowedInitials('AB')).toBe(false);
    expect(isAllowedInitials('ABCD')).toBe(false);
    expect(isAllowedInitials('A$1')).toBe(false);

    for (const bad of ['ASS', 'FUK', 'KKK', 'WTF', 'XXX', ...BLOCKED_INITIALS]) {
      expect(isAllowedInitials(bad)).toBe(false);
    }

    expect(sanitizeInitials('x9!')).toBe('X9A');
    expect(sanitizeInitials('')).toBe('AAA');
  });

  it('computes per-game max-score-per-second sanity bounds and Top-10 qualification', () => {
    expect(isLeaderboardGame('pinball')).toBe(true);
    expect(isLeaderboardGame('hilow')).toBe(true);
    expect(isLeaderboardGame('feed')).toBe(false);

    expect(maxPlausibleScoreForElapsed('hilow', 1)).toBe(
      ARCADE_SCORE_LIMITS.hilow.baseScore + ARCADE_SCORE_LIMITS.hilow.perSec
    );
    expect(maxPlausibleScoreForElapsed('pinball', 99999)).toBe(ARCADE_SCORE_LIMITS.pinball.hardMax);

    expect(qualifiesForTop10([], 1)).toBe(true);
    expect(qualifiesForTop10([], 0)).toBe(false);

    const fullBoard = Array.from({ length: 10 }, (_, idx) => ({ score: (10 - idx) * 100 }));
    expect(qualifiesForTop10(fullBoard, 100)).toBe(false);
    expect(qualifiesForTop10(fullBoard, 101)).toBe(true);
  });

  it('starts a session token, rejects blocked initials client-side, and submits valid Top-10 scores via RPC', async () => {
    const rpcCalls = [];
    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'u-1' }, access_token: 'jwt-1' } }
        }))
      },
      rpc: vi.fn(async (fn, args) => {
        rpcCalls.push({ fn, args });
        if (fn === 'start_game_session') {
          return { data: { ok: true, session_id: 'sess-123', game: args.p_game }, error: null };
        }
        if (fn === 'get_game_leaderboard') {
          return {
            data: { ok: true, game: args.p_game, period: args.p_period, entries: [] },
            error: null
          };
        }
        if (fn === 'submit_arcade_score') {
          return {
            data: {
              ok: true,
              id: 'score-1',
              game: args.p_game,
              score: args.p_score,
              initials: args.p_initials,
              rank_today: 1,
              rank_all_time: 1
            },
            error: null
          };
        }
        return { data: null, error: { message: 'unknown rpc' } };
      })
    };

    const sess = await startGameSession('pinball', mockClient);
    expect(sess.ok).toBe(true);
    expect(sess.sessionId).toBe('sess-123');

    const emptyBoard = await fetchGameLeaderboard('pinball', 'today', 10, mockClient);
    expect(emptyBoard.ok).toBe(true);
    expect(emptyBoard.entries).toEqual([]);

    const blocked = await submitArcadeScore({
      sessionId: 'sess-123',
      gameId: 'pinball',
      score: 12000,
      initials: 'ASS',
      client: mockClient
    });
    expect(blocked).toEqual({ ok: false, error: 'blocked_initials' });

    const okRes = await submitArcadeScore({
      sessionId: 'sess-123',
      gameId: 'pinball',
      score: 12000,
      initials: 'neo',
      client: mockClient
    });
    expect(okRes.ok).toBe(true);
    expect(okRes.initials).toBe('NEO');
    expect(rpcCalls.some((c) => c.fn === 'submit_arcade_score' && c.args.p_initials === 'NEO')).toBe(
      true
    );
    expect(EMPTY_LEADERBOARD_COPY).toBe('No scores yet. Be the first name on the cabinet.');
    expect(LEADERBOARD_FOR_FUN_COPY.toLowerCase()).toContain('for fun');
  });
});
