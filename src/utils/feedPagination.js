// ==========================================
// PHASE 33.16: CURSOR PAGINATION, SQL VIEW FEED QUERIES,
// LAZY COMMENTS-ON-OPEN, AND RESPONSIVE GRID VIRTUALIZATION
// ==========================================

export const FEED_PAGE_SIZE = 24;
export const FEED_VIEW_NAME = 'memes_feed_view';
export const FEED_GRID_GAP_PX = 24;
export const FEED_GRID_MIN_COL_PX = 340;
export const DEFAULT_CARD_ROW_HEIGHT_PX = 540;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/;

export function normalizeSortMode(sortBy) {
  const s = String(sortBy || '').toLowerCase();
  if (s === 'top') return 'top';
  if (s === 'new24h') return 'new24h';
  if (s === 'new' || s === 'latest') return 'new';
  return 'hot';
}

export function normalizeTopWindow(topWindow) {
  const w = String(topWindow || '').toLowerCase();
  if (w === 'day' || w === '24h') return 'day';
  if (w === 'week' || w === '7d') return 'week';
  return 'all';
}

export function getTopWindowStartIso(topWindow, nowMs = Date.now()) {
  const win = normalizeTopWindow(topWindow);
  if (win === 'day') return new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  if (win === 'week') return new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export function computeHotScore(meme, nowMs = Date.now()) {
  if (!meme || typeof meme !== 'object') return 0;
  const serverHot = Number(meme.hot_score);
  if (Number.isFinite(serverHot) && serverHot > 0) return serverHot;
  // Same formula as memes_feed_view.hot_score: (reactions + 2×comments + 1) / (hours + 2)^1.5
  const reactions = Object.values(meme.reactions || {}).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0);
  const comments = Math.max(0, Number(meme.comments_count ?? (meme.comments || []).length) || 0);
  const createdMs = meme.created_at ? Date.parse(meme.created_at) : nowMs;
  const ageHours = Math.max(0, (nowMs - (Number.isFinite(createdMs) ? createdMs : nowMs)) / 3600000);
  return Number(((reactions + 2 * comments + 1) / Math.pow(ageHours + 2, 1.5)).toFixed(6));
}

export const HOT_FEED_RPC = 'get_hot_feed';

/**
 * Hot tab via the get_hot_feed RPC: ranked on the server (engagement score, at most 1 house
 * meme in any 4 cards). Offset paging. Returns null when the RPC is unavailable so the caller
 * can fall back to the plain view query.
 */
async function fetchHotFeedPage(client, { category, cursor, limit }) {
  if (typeof client?.rpc !== 'function') return null;
  const offset = Math.max(0, Math.trunc(Number(cursor?.offset) || 0));
  const { data, error } = await client.rpc(HOT_FEED_RPC, {
    p_category: category && category !== 'all' ? String(category) : null,
    p_offset: offset,
    p_limit: limit + 1
  });
  if (error || !Array.isArray(data)) return null;
  const hasMore = data.length === limit + 1;
  const items = hasMore ? data.slice(0, limit) : data;
  return {
    ok: true,
    items,
    hasMore,
    nextCursor: items.length ? { mode: 'hot', offset: offset + items.length, source: 'rpc' } : null
  };
}

export function extractFeedCursor(meme, sortBy) {
  if (!meme || !meme.id || !meme.created_at) return null;
  const mode = normalizeSortMode(sortBy);
  return {
    mode,
    id: String(meme.id),
    createdAt: String(meme.created_at),
    score: Number(meme.score || 0),
    hotScore: Number(meme.hot_score ?? computeHotScore(meme))
  };
}

function safeTimestamp(ts) {
  const clean = String(ts || '').trim();
  if (!ISO_TS_RE.test(clean)) return null;
  return clean;
}

function safeUuid(id) {
  const clean = String(id || '').trim();
  if (!UUID_RE.test(clean)) return null;
  return clean;
}

/**
 * Build a safe PostgREST `.or(...)` keyset cursor predicate for infinite scroll:
 *   - 'new' / 'new24h': keyset on (created_at DESC, id DESC)
 *   - 'top': keyset on (score DESC, created_at DESC, id DESC)
 *   - 'hot': keyset on (hot_score DESC, created_at DESC, id DESC)
 */
export function buildPostgrestCursorOr(cursor) {
  if (!cursor || typeof cursor !== 'object') return null;
  const ts = safeTimestamp(cursor.createdAt);
  const id = safeUuid(cursor.id);
  if (!ts || !id) return null;

  const mode = normalizeSortMode(cursor.mode);
  if (mode === 'top') {
    const score = Math.trunc(Number(cursor.score));
    if (!Number.isFinite(score)) return null;
    return `score.lt.${score},and(score.eq.${score},created_at.lt.${ts}),and(score.eq.${score},created_at.eq.${ts},id.lt.${id})`;
  }
  if (mode === 'hot') {
    const hot = Number(cursor.hotScore);
    if (!Number.isFinite(hot)) return null;
    return `hot_score.lt.${hot},and(hot_score.eq.${hot},created_at.lt.${ts}),and(hot_score.eq.${hot},created_at.eq.${ts},id.lt.${id})`;
  }
  return `created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`;
}

/**
 * Fetch a single page from `memes_feed_view` using keyset cursor pagination.
 * Never embeds `comments(*)` — comments load lazily when opened.
 */
export async function fetchMemesFeedPage(
  client,
  {
    sortBy = 'hot',
    topWindow = 'all',
    category = 'all',
    cursor = null,
    pageSize = FEED_PAGE_SIZE
  } = {}
) {
  if (!client?.from) {
    return { ok: false, items: [], hasMore: false, nextCursor: null, error: 'no_client' };
  }

  const mode = normalizeSortMode(sortBy);
  const effectiveCursor = cursor ? { ...cursor, mode } : null;
  const limit = Math.max(1, Math.min(100, Number(pageSize) || FEED_PAGE_SIZE));

  if (mode === 'hot' && (!cursor || cursor.source === 'rpc')) {
    const hot = await fetchHotFeedPage(client, { category, cursor, limit });
    if (hot) return hot;
  }

  // Approved only. The view runs with the viewer's rights, and moderators / authors may read
  // removed or pending rows, so without this a moderator's feed showed memes hidden in Curate.
  let query = client.from(FEED_VIEW_NAME).select('*').eq('status', 'approved');

  if (category && category !== 'all' && category !== 'remixes') {
    query = query.eq('category', String(category));
  } else if (category === 'remixes') {
    query = query.or('mutation_count.gt.0,parent_meme_id.not.is.null');
  }

  if (mode === 'new24h') {
    query = query.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } else if (mode === 'top') {
    const sinceIso = getTopWindowStartIso(topWindow);
    if (sinceIso) {
      query = query.gte('created_at', sinceIso);
    }
  }

  const cursorOr = buildPostgrestCursorOr(effectiveCursor);
  if (cursorOr) {
    query = query.or(cursorOr);
  }

  if (mode === 'top') {
    query = query
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  } else if (mode === 'hot') {
    query = query
      .order('hot_score', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  } else {
    query = query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  }

  const { data, error } = await query.limit(limit + 1);
  if (error) {
    return {
      ok: false,
      items: [],
      hasMore: false,
      nextCursor: null,
      error: error.message || 'feed_fetch_failed'
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const hasMore = rows.length === limit + 1;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = items.length ? extractFeedCursor(items[items.length - 1], mode) : null;

  return {
    ok: true,
    items,
    hasMore,
    nextCursor
  };
}

/**
 * Lazy-load visible comments for a single meme on drawer/theater open.
 */
export async function fetchMemeComments(client, memeId, limit = 100) {
  if (!client?.from || !memeId) {
    return { ok: false, comments: [] };
  }
  const { data, error } = await client
    .from('comments')
    .select('id, meme_id, author_name, body, user_id, created_at, status')
    .eq('meme_id', memeId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { ok: false, comments: [], error: error.message || 'comments_fetch_failed' };
  }
  return {
    ok: true,
    comments: Array.isArray(data) ? data : []
  };
}

/**
 * Mirror `.tm-grid { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }`
 */
export function estimateGridColumns(
  containerWidth,
  minColPx = FEED_GRID_MIN_COL_PX,
  gapPx = FEED_GRID_GAP_PX
) {
  const w = Number(containerWidth);
  if (!Number.isFinite(w) || w <= 0) return 1;
  return Math.max(1, Math.floor((w + gapPx) / (minColPx + gapPx)));
}

/**
 * Pure row-based window math for responsive grid virtualization (keeps 500+ cards smooth on older iPads).
 */
export function computeVirtualGridWindow({
  totalItems = 0,
  columns = 1,
  rowStridePx = DEFAULT_CARD_ROW_HEIGHT_PX + FEED_GRID_GAP_PX,
  gridTopPx = 0,
  scrollY = 0,
  viewportHeight = 900,
  overscanRows = 3,
  minWindowItems = 24
} = {}) {
  const count = Math.max(0, Math.trunc(Number(totalItems) || 0));
  const cols = Math.max(1, Math.trunc(Number(columns) || 1));
  const stride = Math.max(120, Number(rowStridePx) || DEFAULT_CARD_ROW_HEIGHT_PX + FEED_GRID_GAP_PX);
  const totalRows = Math.ceil(count / cols);

  if (count <= minWindowItems || totalRows === 0) {
    return {
      startIndex: 0,
      endIndex: count,
      startRow: 0,
      endRow: totalRows,
      totalRows,
      topSpacerPx: 0,
      bottomSpacerPx: 0
    };
  }

  const vpH = Math.max(320, Number(viewportHeight) || 900);
  const overscan = Math.max(1, Math.trunc(Number(overscanRows) || 3));
  const relScrollTop = Math.max(0, (Number(scrollY) || 0) - (Number(gridTopPx) || 0));

  const firstVisibleRow = Math.floor(relScrollTop / stride);
  const visibleRowCount = Math.max(1, Math.ceil(vpH / stride));

  const startRow = Math.max(0, Math.min(totalRows - 1, firstVisibleRow - overscan));
  const endRow = Math.min(totalRows, firstVisibleRow + visibleRowCount + overscan);

  const startIndex = startRow * cols;
  const endIndex = Math.min(count, endRow * cols);

  return {
    startIndex,
    endIndex,
    startRow,
    endRow,
    totalRows,
    topSpacerPx: startRow * stride,
    bottomSpacerPx: Math.max(0, totalRows - endRow) * stride
  };
}

/**
 * Group grid entries into visual rows. Full-width entries (e.g. the companion card, which spans
 * every column) always sit on a row of their own, exactly like CSS grid auto-placement does.
 * Returns an array of rows; each row is an array of entry indices.
 */
export function buildGridRows(entries = [], columns = 1) {
  const cols = Math.max(1, Math.trunc(Number(columns) || 1));
  const rows = [];
  let current = [];
  entries.forEach((entry, idx) => {
    if (entry?.fullWidth) {
      if (current.length) rows.push(current);
      rows.push([idx]);
      current = [];
      return;
    }
    current.push(idx);
    if (current.length === cols) {
      rows.push(current);
      current = [];
    }
  });
  if (current.length) rows.push(current);
  return rows;
}

/**
 * Windowing for rows of DIFFERENT heights (phones: every card is as tall as its image).
 * rowHeights[i] is the measured height of row i, or null/undefined when it has not been
 * rendered yet (then estimateRowPx is used). Spacers are built from the real heights, so the
 * page no longer jumps when rows above the screen are swapped out (owner report 20 Nov 2026).
 */
export function computeVariableGridWindow({
  rowHeights = [],
  estimateRowPx = DEFAULT_CARD_ROW_HEIGHT_PX,
  gapPx = FEED_GRID_GAP_PX,
  gridTopPx = 0,
  scrollY = 0,
  viewportHeight = 900,
  overscanPx = 1200,
  minWindowRows = 0
} = {}) {
  const totalRows = rowHeights.length;
  const est = Math.max(120, Number(estimateRowPx) || DEFAULT_CARD_ROW_HEIGHT_PX);
  const gap = Math.max(0, Number(gapPx) || 0);
  const heightOf = (i) => {
    const h = Number(rowHeights[i]);
    return Number.isFinite(h) && h > 0 ? h : est;
  };

  // offsets[i] = distance from the top of the grid content to the top of row i.
  const offsets = new Array(totalRows + 1);
  offsets[0] = 0;
  for (let i = 0; i < totalRows; i += 1) offsets[i + 1] = offsets[i] + heightOf(i) + gap;
  const totalPx = totalRows > 0 ? offsets[totalRows] - gap : 0;

  if (totalRows === 0 || totalRows <= minWindowRows) {
    return { startRow: 0, endRow: totalRows, totalRows, topSpacerPx: 0, bottomSpacerPx: 0, totalPx };
  }

  const vpH = Math.max(320, Number(viewportHeight) || 900);
  const over = Math.max(0, Number(overscanPx) || 0);
  const relTop = (Number(scrollY) || 0) - (Number(gridTopPx) || 0);
  const winTop = relTop - over;
  const winBottom = relTop + vpH + over;

  let startRow = 0;
  while (startRow < totalRows - 1 && offsets[startRow] + heightOf(startRow) < winTop) startRow += 1;
  let endRow = startRow + 1;
  while (endRow < totalRows && offsets[endRow] <= winBottom) endRow += 1;

  // Keep at least minWindowRows mounted (grow downwards first, then upwards).
  while (endRow - startRow < minWindowRows && endRow < totalRows) endRow += 1;
  while (endRow - startRow < minWindowRows && startRow > 0) startRow -= 1;

  return {
    startRow,
    endRow,
    totalRows,
    topSpacerPx: offsets[startRow],
    bottomSpacerPx: endRow < totalRows ? totalPx - offsets[endRow] + gap : 0,
    totalPx
  };
}
