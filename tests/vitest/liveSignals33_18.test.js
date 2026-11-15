import { describe, it, expect } from 'vitest';
import {
  MIN_LIVE_PRESENCE_COUNT,
  shouldShowLivePresence,
  formatLivePresenceLabel,
  getTruthfulUpvotesLastHour,
  formatUpvotesLastHourSignal
} from '../../src/utils/liveSignals.js';

describe('Phase 33.18 — Real "people here now" & truthful 1h upvote signals', () => {
  it('hides live presence below 2 connected peers and shows it at 2+', () => {
    expect(MIN_LIVE_PRESENCE_COUNT).toBe(2);
    expect(shouldShowLivePresence(undefined)).toBe(false);
    expect(shouldShowLivePresence(null)).toBe(false);
    expect(shouldShowLivePresence(-1)).toBe(false);
    expect(shouldShowLivePresence(0)).toBe(false);
    expect(shouldShowLivePresence(1)).toBe(false);
    expect(formatLivePresenceLabel(0)).toBeNull();
    expect(formatLivePresenceLabel(1)).toBeNull();

    expect(shouldShowLivePresence(2)).toBe(true);
    expect(formatLivePresenceLabel(2)).toBe('🟢 2 memers online');
    expect(formatLivePresenceLabel(14)).toBe('🟢 14 memers online');
  });

  it('never fabricates 1h upvotes on seed memes, local drafts, or from total score', () => {
    expect(
      getTruthfulUpvotesLastHour({
        id: 'seed-dank-01',
        score: 2500,
        reactions: { '🔥': 99 },
        upvotes_last_hour: 12
      })
    ).toBe(0);

    expect(
      getTruthfulUpvotesLastHour({
        id: 'local-123',
        score: 100,
        upvotes_last_hour: 5
      })
    ).toBe(0);

    expect(
      getTruthfulUpvotesLastHour({
        id: '33180000-0000-4000-8000-000000000001',
        score: 1850,
        reactions: { '🔥': 42 },
        upvotes_last_hour: 0
      })
    ).toBe(0);

    expect(
      formatUpvotesLastHourSignal({
        id: '33180000-0000-4000-8000-000000000001',
        score: 1850
      })
    ).toBeNull();
  });

  it('formats singular and plural hourly upvote signals accurately when truthful', () => {
    expect(
      formatUpvotesLastHourSignal({
        id: '33180000-0000-4000-8000-000000000001',
        upvotes_last_hour: 1
      })
    ).toBe('🔥 1 upvote in the last hour');

    expect(
      formatUpvotesLastHourSignal({
        id: '33180000-0000-4000-8000-000000000002',
        upvotes_last_hour: 12
      })
    ).toBe('🔥 12 upvotes in the last hour');

    expect(formatUpvotesLastHourSignal(12)).toBe('🔥 12 upvotes in the last hour');
    expect(formatUpvotesLastHourSignal(0)).toBeNull();
  });
});
