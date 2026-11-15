import { describe, it, expect, vi } from 'vitest';
import {
  FEED_PAGE_SIZE,
  buildPostgrestCursorOr,
  computeHotScore,
  computeVirtualGridWindow,
  estimateGridColumns,
  extractFeedCursor,
  fetchMemeComments,
  fetchMemesFeedPage,
  normalizeSortMode,
  normalizeTopWindow
} from '../../src/utils/feedPagination.js';

function makeQueryChain(response = { data: [], error: null }) {
  const calls = [];
  const chain = {
    select: vi.fn((arg) => {
      calls.push(['select', arg]);
      return chain;
    }),
    eq: vi.fn((col, val) => {
      calls.push(['eq', col, val]);
      return chain;
    }),
    gte: vi.fn((col, val) => {
      calls.push(['gte', col, val]);
      return chain;
    }),
    or: vi.fn((expr) => {
      calls.push(['or', expr]);
      return chain;
    }),
    order: vi.fn((col, opts) => {
      calls.push(['order', col, opts]);
      return chain;
    }),
    limit: vi.fn(async (n) => {
      calls.push(['limit', n]);
      return response;
    })
  };
  return { chain, calls };
}

describe('Task 33.16 Feed Cursor Pagination, SQL View, Lazy Comments & Virtualization', () => {
  it('builds safe keyset PostgREST cursors for Hot, New, and Top sort modes', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const ts = '2026-11-15T12:00:00.000Z';

    expect(normalizeSortMode('latest')).toBe('new');
    expect(normalizeSortMode('hot')).toBe('hot');
    expect(normalizeTopWindow('24h')).toBe('day');
    expect(normalizeTopWindow('7d')).toBe('week');

    expect(buildPostgrestCursorOr({ mode: 'new', createdAt: ts, id })).toBe(
      `created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`
    );
    expect(buildPostgrestCursorOr({ mode: 'top', score: 42, createdAt: ts, id })).toBe(
      `score.lt.42,and(score.eq.42,created_at.lt.${ts}),and(score.eq.42,created_at.eq.${ts},id.lt.${id})`
    );
    expect(buildPostgrestCursorOr({ mode: 'hot', hotScore: 1.25, createdAt: ts, id })).toBe(
      `hot_score.lt.1.25,and(hot_score.eq.1.25,created_at.lt.${ts}),and(hot_score.eq.1.25,created_at.eq.${ts},id.lt.${id})`
    );

    // Rejects injection / malformed ids or timestamps
    expect(buildPostgrestCursorOr({ mode: 'new', createdAt: 'bad-ts', id })).toBeNull();
    expect(buildPostgrestCursorOr({ mode: 'new', createdAt: ts, id: 'not-a-uuid' })).toBeNull();
  });

  it('computes time-decayed hot_score matching newer vs older posts', () => {
    const nowMs = Date.parse('2026-11-15T20:00:00Z');
    const fresh = { id: 'a', score: 5, created_at: '2026-11-15T19:30:00Z' };
    const stale = { id: 'b', score: 5, created_at: '2026-10-15T19:30:00Z' };
    expect(computeHotScore(fresh, nowMs)).toBeGreaterThan(computeHotScore(stale, nowMs));
  });

  it('queries memes_feed_view without comments(*), slices page+1 for hasMore, and lazy-loads comments on open', async () => {
    const rows = Array.from({ length: FEED_PAGE_SIZE + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      title: `Meme ${i + 1}`,
      score: 100 - i,
      hot_score: 5.5 - i * 0.1,
      comments_count: i,
      created_at: new Date(Date.UTC(2026, 10, 15, 12, 0, 59 - i)).toISOString()
    }));

    const { chain, calls } = makeQueryChain({ data: rows, error: null });
    const mockClient = {
      from: vi.fn(() => chain)
    };

    const page1 = await fetchMemesFeedPage(mockClient, {
      sortBy: 'hot',
      category: 'dank',
      pageSize: FEED_PAGE_SIZE
    });

    expect(mockClient.from).toHaveBeenCalledWith('memes_feed_view');
    expect(calls.some((c) => c[0] === 'select' && String(c[1]).includes('comments'))).toBe(false);
    expect(calls).toContainEqual(['eq', 'category', 'dank']);
    expect(calls).toContainEqual(['order', 'hot_score', { ascending: false }]);
    expect(calls).toContainEqual(['limit', FEED_PAGE_SIZE + 1]);

    expect(page1.ok).toBe(true);
    expect(page1.hasMore).toBe(true);
    expect(page1.items.length).toBe(FEED_PAGE_SIZE);
    expect(page1.nextCursor).toEqual(extractFeedCursor(rows[FEED_PAGE_SIZE - 1], 'hot'));

    // Page 2 applies keyset cursor filter and Top 7d window
    const page2Setup = makeQueryChain({ data: rows.slice(FEED_PAGE_SIZE), error: null });
    mockClient.from.mockReturnValueOnce(page2Setup.chain);

    const page2 = await fetchMemesFeedPage(mockClient, {
      sortBy: 'top',
      topWindow: 'week',
      cursor: page1.nextCursor,
      pageSize: FEED_PAGE_SIZE
    });
    expect(page2.ok).toBe(true);
    expect(page2.hasMore).toBe(false);
    expect(page2Setup.calls.some((c) => c[0] === 'gte' && c[1] === 'created_at')).toBe(true);
    expect(page2Setup.calls.some((c) => c[0] === 'or' && String(c[1]).includes('score.lt.'))).toBe(
      true
    );

    // Comments fetch only happens via fetchMemeComments on open
    const commentsSetup = makeQueryChain({
      data: [{ id: 'c-1', meme_id: rows[0].id, body: 'Lazy loaded!' }],
      error: null
    });
    mockClient.from.mockReturnValueOnce(commentsSetup.chain);
    const loaded = await fetchMemeComments(mockClient, rows[0].id);
    expect(mockClient.from).toHaveBeenLastCalledWith('comments');
    expect(loaded.ok).toBe(true);
    expect(loaded.comments[0].body).toBe('Lazy loaded!');
  });

  it('virtualizes 600+ cards cleanly across phone, tablet, and desktop viewports', () => {
    expect(estimateGridColumns(350)).toBe(1);
    expect(estimateGridColumns(728)).toBe(2);
    expect(estimateGridColumns(1220)).toBe(3);

    // Small feed stays completely unclipped
    const small = computeVirtualGridWindow({ totalItems: 12, columns: 3 });
    expect(small.startIndex).toBe(0);
    expect(small.endIndex).toBe(12);
    expect(small.topSpacerPx).toBe(0);

    // 600-card feed scrolled far down renders only a small slice around viewport
    const mid = computeVirtualGridWindow({
      totalItems: 600,
      columns: 2,
      rowStridePx: 564,
      gridTopPx: 400,
      scrollY: 50000,
      viewportHeight: 1024,
      overscanRows: 3
    });
    const renderedCount = mid.endIndex - mid.startIndex;
    expect(mid.startIndex).toBeGreaterThan(100);
    expect(renderedCount).toBeLessThanOrEqual(20);
    expect(mid.topSpacerPx).toBeGreaterThan(0);
    expect(mid.bottomSpacerPx).toBeGreaterThan(0);
  });
});
