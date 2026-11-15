import { describe, it, expect, vi } from 'vitest';
import {
  getDailyCaptionBattle,
  getUtcDateString,
  getYesterdayUtcDateString,
  isActiveCaptionKing,
  isUsernameCaptionKing,
  fetchDailyCaptionBattle,
  submitCaptionBattleEntry,
  voteCaptionBattleEntry,
  fetchCaptionHallOfFame,
  fetchActiveCaptionKings
} from '../../src/utils/dailyCaptionBattle.js';

describe('Task 33.15 Real Daily Caption Battle & Hall of Fame', () => {
  it('computes deterministic daily battle templates per UTC date and checks 24h Caption King crown windows', () => {
    const day1 = getDailyCaptionBattle('2026-11-15');
    const day1Again = getDailyCaptionBattle('2026-11-15');
    expect(day1.battleId).toBe('battle-2026-11-15');
    expect(day1.template.id).toBe(day1Again.template.id);

    const nowMs = Date.parse('2026-11-15T12:00:00Z');
    const activeKings = [
      { author_name: 'KingMemer86', crowned_until: '2026-11-16T00:00:00Z' },
      { author_name: 'ExpiredKing', crowned_until: '2026-11-15T00:00:00Z' }
    ];

    expect(isActiveCaptionKing('kingmemer86', activeKings, nowMs)).toBe(true);
    expect(isActiveCaptionKing('ExpiredKing', activeKings, nowMs)).toBe(false);
    expect(isActiveCaptionKing('SomeoneElse', activeKings, nowMs)).toBe(false);
    expect(isUsernameCaptionKing([], 'KingMemer86', activeKings)).toBe(true);

    const sampleDate = new Date('2026-11-15T10:00:00Z');
    expect(getUtcDateString(sampleDate)).toBe('2026-11-15');
    expect(getYesterdayUtcDateString(sampleDate)).toBe('2026-11-14');
  });

  it('fetches live daily battle, rejects blocked text client-side, submits clean captions, and votes via RPC', async () => {
    const rpcCalls = [];
    const fnCalls = [];
    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'u-3315' }, access_token: 'jwt-3315' } }
        }))
      },
      rpc: vi.fn(async (fn, args) => {
        rpcCalls.push({ fn, args });
        if (fn === 'get_daily_caption_battle') {
          return {
            data: {
              ok: true,
              date_str: '2026-11-15',
              yesterday_date_str: '2026-11-14',
              entries: [{ id: 'e-1', author_name: 'RivalMemer', score: 4 }],
              yesterday_winner: { battle_date: '2026-11-14', author_name: 'KingMemer86', winning_score: 9 },
              my_voted_entry_ids: [],
              active_kings: [{ author_name: 'KingMemer86', crowned_until: '2099-01-01T00:00:00Z' }]
            },
            error: null
          };
        }
        if (fn === 'vote_caption_battle_entry') {
          return { data: { ok: true, voted: Boolean(args.p_active), score: 5 }, error: null };
        }
        if (fn === 'get_caption_hall_of_fame') {
          return {
            data: {
              ok: true,
              winners: [{ battle_date: '2026-11-14', author_name: 'KingMemer86', winning_score: 9 }],
              active_kings: [{ author_name: 'KingMemer86', crowned_until: '2099-01-01T00:00:00Z' }]
            },
            error: null
          };
        }
        if (fn === 'get_active_caption_kings') {
          return {
            data: { ok: true, active_kings: [{ author_name: 'KingMemer86', crowned_until: '2099-01-01T00:00:00Z' }] },
            error: null
          };
        }
        return { data: null, error: new Error('unexpected rpc') };
      }),
      functions: {
        invoke: vi.fn(async (name, opts) => {
          fnCalls.push({ name, opts });
          return {
            data: {
              ok: true,
              status: 'approved',
              entry: { id: 'e-2', author_name: 'TestCreator', top_text: 'CLEAN TOP', bottom_text: 'CLEAN BOT', score: 0 }
            },
            error: null
          };
        })
      }
    };

    const battle = await fetchDailyCaptionBattle(mockClient);
    expect(battle.ok).toBe(true);
    expect(battle.yesterdayWinner.author_name).toBe('KingMemer86');
    expect(battle.activeKings.length).toBe(1);

    // Empty caption rejected
    const emptyRes = await submitCaptionBattleEntry(
      { battleDate: '2026-11-15', templateId: 'tpl-drake-compare', topText: ' ', bottomText: '' },
      mockClient
    );
    expect(emptyRes.ok).toBe(false);
    expect(emptyRes.error).toBe('empty_caption');
    expect(fnCalls.length).toBe(0);

    // External URL rejected by precheck before hitting network
    const linkRes = await submitCaptionBattleEntry(
      {
        battleDate: '2026-11-15',
        templateId: 'tpl-drake-compare',
        topText: 'visit https://spam.example.com',
        bottomText: 'now'
      },
      mockClient
    );
    expect(linkRes.ok).toBe(false);
    expect(linkRes.error).toBe('rejected');
    expect(fnCalls.length).toBe(0);

    // Clean caption invokes submit-caption-entry
    const okRes = await submitCaptionBattleEntry(
      {
        battleDate: '2026-11-15',
        templateId: 'tpl-drake-compare',
        topText: 'PASSING ALL TESTS',
        bottomText: 'ZERO REGRESSIONS'
      },
      mockClient
    );
    expect(okRes.ok).toBe(true);
    expect(fnCalls.length).toBe(1);
    expect(fnCalls[0].name).toBe('submit-caption-entry');

    const voteRes = await voteCaptionBattleEntry('e-1', true, mockClient);
    expect(voteRes.ok).toBe(true);
    expect(voteRes.score).toBe(5);

    const hof = await fetchCaptionHallOfFame(20, mockClient);
    expect(hof.ok).toBe(true);
    expect(hof.winners[0].author_name).toBe('KingMemer86');

    const kings = await fetchActiveCaptionKings(mockClient);
    expect(kings[0].author_name).toBe('KingMemer86');
    expect(rpcCalls.map((c) => c.fn)).toEqual([
      'get_daily_caption_battle',
      'vote_caption_battle_entry',
      'get_caption_hall_of_fame',
      'get_active_caption_kings'
    ]);
  });
});
