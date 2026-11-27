// T-016: smoke tests now fake get_hot_feed as missing (tests/storageStub.js), so the
// production Hot-tab path (the RPC, offset paging, its fallback) is covered here instead.
import { describe, it, expect, vi } from 'vitest';
import { fetchMemesFeedPage, HOT_FEED_RPC } from '../../src/utils/feedPagination.js';

const rows = (n, start = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(start + i).padStart(12, '0')}`,
    created_at: '2026-11-27T10:00:00.000Z'
  }));

function makeClient({ rpcResult, viewRows = [] } = {}) {
  const chain = {};
  for (const m of ['select', 'eq', 'gte', 'or', 'order']) chain[m] = vi.fn(() => chain);
  chain.limit = vi.fn(async () => ({ data: viewRows, error: null }));
  return {
    rpc: vi.fn(async () => rpcResult),
    from: vi.fn(() => chain),
    chain
  };
}

describe('Hot feed via get_hot_feed RPC', () => {
  it('calls the RPC with category, offset and limit+1 on the first page', async () => {
    const client = makeClient({ rpcResult: { data: rows(3), error: null } });
    const page = await fetchMemesFeedPage(client, { sortBy: 'hot', category: 'gaming', pageSize: 2 });

    expect(client.rpc).toHaveBeenCalledWith(HOT_FEED_RPC, { p_category: 'gaming', p_offset: 0, p_limit: 3 });
    expect(client.from).not.toHaveBeenCalled();
    expect(page.ok).toBe(true);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual({ mode: 'hot', offset: 2, source: 'rpc' });
  });

  it('sends a null category for "all" and pages on from an rpc cursor', async () => {
    const client = makeClient({ rpcResult: { data: rows(1, 2), error: null } });
    const page = await fetchMemesFeedPage(client, {
      sortBy: 'hot',
      category: 'all',
      pageSize: 2,
      cursor: { mode: 'hot', offset: 2, source: 'rpc' }
    });

    expect(client.rpc).toHaveBeenCalledWith(HOT_FEED_RPC, { p_category: null, p_offset: 2, p_limit: 3 });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toEqual({ mode: 'hot', offset: 3, source: 'rpc' });
  });

  it('falls back to memes_feed_view when the RPC errors (e.g. PGRST202)', async () => {
    const client = makeClient({
      rpcResult: { data: null, error: { code: 'PGRST202', message: 'not found' } },
      viewRows: rows(1)
    });
    const page = await fetchMemesFeedPage(client, { sortBy: 'hot', pageSize: 2 });

    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.from).toHaveBeenCalledWith('memes_feed_view');
    expect(client.chain.eq).toHaveBeenCalledWith('status', 'approved');
    expect(page.ok).toBe(true);
    expect(page.items).toHaveLength(1);
  });

  it('does not call the RPC for New or Top', async () => {
    const client = makeClient({ rpcResult: { data: [], error: null } });
    await fetchMemesFeedPage(client, { sortBy: 'new' });
    await fetchMemesFeedPage(client, { sortBy: 'top' });
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
