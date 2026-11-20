// Plan 2.1 — Daily Caption Battle v2 client logic.
import { describe, it, expect } from 'vitest';
import {
  normalizeBattleState,
  shuffleForVoter,
  entriesToVoteOn,
  formatCountdown,
  entryCaption
} from '../../src/utils/dailyCaptionBattle.js';

const entries = Array.from({ length: 12 }, (_, i) => ({
  id: `e${i}`,
  status: 'approved',
  is_mine: i === 0,
  top_text: `cap ${i}`
}));

describe('caption battle v2 (plan 2.1)', () => {
  it('normalizes the server state with safe defaults', () => {
    expect(normalizeBattleState(null).ok).toBe(false);
    const s = normalizeBattleState({ ok: true, entries, my_votes: ['e1'], settings: { caption_max: 100 } });
    expect(s.ok).toBe(true);
    expect(s.myVotes).toEqual(['e1']);
    expect(s.captionMax).toBe(100);
  });

  it('shuffles per voter: stable for the same voter, different between voters', () => {
    const a1 = shuffleForVoter(entries, 'voter-a').map((e) => e.id);
    const a2 = shuffleForVoter(entries, 'voter-a').map((e) => e.id);
    const b = shuffleForVoter(entries, 'voter-b').map((e) => e.id);
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b);
    expect([...a1].sort()).toEqual(entries.map((e) => e.id).sort());
  });

  it('never asks you to vote on your own entry or ones you already judged', () => {
    const state = normalizeBattleState({ ok: true, entries, my_votes: ['e1'], my_skips: ['e2'], battle: { id: 'b' } });
    const queue = entriesToVoteOn(state, 'voter-a').map((e) => e.id);
    expect(queue).not.toContain('e0');
    expect(queue).not.toContain('e1');
    expect(queue).not.toContain('e2');
    expect(queue).toHaveLength(9);
  });

  it('formats the countdown to the real close time', () => {
    const now = Date.parse('2026-11-20T08:00:00Z');
    expect(formatCountdown('2026-11-20T09:30:05Z', now)).toBe('01:30:05');
    expect(formatCountdown('2026-11-20T07:00:00Z', now)).toBe('00:00:00');
    expect(formatCountdown(null, now)).toBe('--:--:--');
  });

  it('joins captions for display', () => {
    expect(entryCaption({ top_text: 'a', bottom_text: 'b' })).toBe('a / b');
    expect(entryCaption({ top_text: 'a' })).toBe('a');
  });
});
