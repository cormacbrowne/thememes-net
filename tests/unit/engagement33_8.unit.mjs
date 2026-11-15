// Unit tests for tamper-resistant votes, reactions, comments, and notifications (Phase 33 task 33.8).
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVoteDirection,
  nextVoteState,
  castVote,
  toggleReaction,
  deleteComment,
  VOTE_ERROR_MESSAGES,
  REACTION_ERROR_MESSAGES,
  DELETE_COMMENT_ERROR_MESSAGES
} from '../../src/utils/serverWrites.js';
import {
  fetchCreatorNotifications,
  markCreatorNotificationsRead
} from '../../src/utils/notifications.js';

function mockSupabase({
  session = { user: { id: '00000000-0000-4000-8000-000000000001' } },
  rpcImpl = async () => ({ data: { ok: true }, error: null }),
  fromImpl = null
} = {}) {
  const rpcCalls = [];
  const queryCalls = [];
  return {
    rpcCalls,
    queryCalls,
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      async signInAnonymously() {
        return { data: { session }, error: null };
      }
    },
    async rpc(name, params) {
      rpcCalls.push({ name, params });
      return rpcImpl(name, params);
    },
    from(table) {
      if (fromImpl) return fromImpl(table, queryCalls);
      const state = { table, op: null, filters: [], selected: null };
      const chain = {
        select(cols) {
          state.op = state.op || 'select';
          state.selected = cols;
          return chain;
        },
        delete() {
          state.op = 'delete';
          return chain;
        },
        eq(col, val) {
          state.filters.push({ col, val });
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          queryCalls.push({ ...state });
          return Promise.resolve({ data: [], error: null });
        },
        then(resolve, reject) {
          queryCalls.push({ ...state });
          return Promise.resolve({ data: [], error: null }).then(resolve, reject);
        }
      };
      return chain;
    }
  };
}

test('normalizeVoteDirection and nextVoteState clamp multipliers so combo never changes stored score', () => {
  assert.equal(normalizeVoteDirection(0), 0);
  assert.equal(normalizeVoteDirection(1), 1);
  assert.equal(normalizeVoteDirection(2), 1);
  assert.equal(normalizeVoteDirection(50), 1);
  assert.equal(normalizeVoteDirection(-3), -1);
  assert.equal(normalizeVoteDirection(Number.NaN), 0);

  // Upvote + Super-swipe both map to +1
  assert.deepEqual(nextVoteState(0, 1), { nextDirection: 1, delta: 1 });
  assert.deepEqual(nextVoteState(0, 2), { nextDirection: 1, delta: 1 });
  // Clicking active upvote again clears to 0
  assert.deepEqual(nextVoteState(1, 1), { nextDirection: 0, delta: -1 });
  // Flipping downvote -> upvote swings by +2 (-1 -> +1)
  assert.deepEqual(nextVoteState(-1, 1), { nextDirection: 1, delta: 2 });
});

test('castVote invokes cast_vote RPC (never increment_meme_score) and surfaces friendly errors', async () => {
  const client = mockSupabase({
    rpcImpl: async (name, params) => {
      assert.equal(name, 'cast_vote');
      return {
        data: {
          ok: true,
          meme_id: params.p_meme_id,
          user_vote: params.p_direction,
          score: 12,
          changed: true
        },
        error: null
      };
    }
  });

  const ok = await castVote(client, '00000000-0000-4000-8000-000000000111', 5);
  assert.equal(ok.ok, true);
  assert.equal(ok.userVote, 1);
  assert.equal(ok.score, 12);
  assert.equal(client.rpcCalls[0].params.p_direction, 1);

  const suspended = await castVote(
    mockSupabase({ rpcImpl: async () => ({ data: { ok: false, error: 'suspended' }, error: null }) }),
    '00000000-0000-4000-8000-000000000111',
    1
  );
  assert.equal(suspended.ok, false);
  assert.equal(suspended.message, VOTE_ERROR_MESSAGES.suspended);

  const limited = await castVote(
    mockSupabase({
      rpcImpl: async () => ({
        data: { ok: false, error: 'rate_limited', retry_after_seconds: 120 },
        error: null
      })
    }),
    '00000000-0000-4000-8000-000000000111',
    1
  );
  assert.equal(limited.ok, false);
  assert.match(limited.message, /Try again in 2 min\./);
});

test('toggleReaction invokes toggle_reaction RPC with expected arguments and handles failures', async () => {
  const client = mockSupabase({
    rpcImpl: async (name, params) => {
      assert.equal(name, 'toggle_reaction');
      return {
        data: {
          ok: true,
          meme_id: params.p_meme_id,
          emoji: params.p_emoji,
          active: params.p_active,
          reactions: { '🔥': 3, '💀': 0, '😂': 0, '🗿': 0 }
        },
        error: null
      };
    }
  });

  const res = await toggleReaction(client, '00000000-0000-4000-8000-000000000111', '🔥', true);
  assert.equal(res.ok, true);
  assert.equal(res.reactions['🔥'], 3);

  const errRes = await toggleReaction(
    mockSupabase({
      rpcImpl: async () => ({ data: { ok: false, error: 'invalid_reaction' }, error: null })
    }),
    '00000000-0000-4000-8000-000000000111',
    '🤡',
    true
  );
  assert.equal(errRes.ok, false);
  assert.equal(errRes.message, REACTION_ERROR_MESSAGES.invalid_reaction);
});

test('deleteComment requires session and fails gracefully when zero rows match RLS', async () => {
  const noSession = await deleteComment(mockSupabase({ session: null }), 'comment-1');
  assert.equal(noSession.ok, false);
  assert.equal(noSession.message, DELETE_COMMENT_ERROR_MESSAGES.sign_in_required);

  const blockedByRls = await deleteComment(mockSupabase(), 'comment-1');
  assert.equal(blockedByRls.ok, false);
  assert.equal(blockedByRls.message, DELETE_COMMENT_ERROR_MESSAGES.not_found);

  const deleted = await deleteComment(
    mockSupabase({
      fromImpl: () => {
        const chain = {
          delete() {
            return chain;
          },
          eq() {
            return chain;
          },
          select() {
            return Promise.resolve({ data: [{ id: 'comment-1' }], error: null });
          }
        };
        return chain;
      }
    }),
    'comment-1'
  );
  assert.deepEqual(deleted, { ok: true, id: 'comment-1' });
});

test('notifications helpers filter by recipient_id UUID and use mark_notifications_read RPC', async () => {
  const emptyForUsername = await fetchCreatorNotifications(mockSupabase(), 'NotAUuidUsername');
  assert.deepEqual(emptyForUsername, []);

  const uid = '00000000-0000-4000-8000-000000000338';
  const client = mockSupabase();
  await fetchCreatorNotifications(client, uid);
  assert.equal(client.queryCalls[0].table, 'notifications');
  assert.deepEqual(client.queryCalls[0].filters[0], { col: 'recipient_id', val: uid });

  const nid = '00000000-0000-4000-8000-000000000555';
  await markCreatorNotificationsRead(client, [nid, 'not-a-uuid']);
  assert.equal(client.rpcCalls[0].name, 'mark_notifications_read');
  assert.deepEqual(client.rpcCalls[0].params, { p_ids: [nid] });
});
