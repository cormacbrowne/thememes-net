// Security Spec (Phase 33 task 33.13)
// Plain fetch assertions using ONLY the staging Supabase publishable (anon) key.
// Never uses a service_role key.
//
// Usage:
//   STAGING_SUPABASE_URL=https://<project>.supabase.co \
//   STAGING_SUPABASE_ANON_KEY=<publishable_key> \
//   npm run test:security
//
// Optional: STAGING_TEST_MEME_ID=<approved meme uuid> (enables live cast_vote idempotency test).
import test from 'node:test';
import assert from 'node:assert/strict';

const STAGING_URL = (process.env.STAGING_SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY || '';
const TEST_MEME_ID = process.env.STAGING_TEST_MEME_ID || '';
const REQUIRED = process.env.SECURITY_SPEC_REQUIRED === '1';

function missingConfigMessage() {
  return 'Set STAGING_SUPABASE_URL and STAGING_SUPABASE_ANON_KEY to run tests/security.spec.js';
}

async function apiFetch(baseUrl, anonKey, path, { method = 'GET', token = null, body = null, headers = {} } = {}) {
  const reqHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    ...headers
  };
  let payload = body;
  if (body && !(body instanceof Uint8Array) && typeof body === 'object') {
    reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: payload
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Leave json null for plain-text error responses
    }
  }
  return { status: res.status, text, json };
}

async function signUpAnonUser(baseUrl, anonKey) {
  const { status, json, text } = await apiFetch(baseUrl, anonKey, '/auth/v1/signup', {
    method: 'POST',
    body: {}
  });
  if (status < 200 || status >= 300 || !json?.access_token || !json?.user?.id) {
    throw new Error(`Staging anonymous sign-up failed (${status}): ${text.slice(0, 200)}`);
  }
  return {
    token: json.access_token,
    userId: json.user.id
  };
}

if (!STAGING_URL || !ANON_KEY) {
  test('staging security configuration present when SECURITY_SPEC_REQUIRED=1', (t) => {
    if (REQUIRED) {
      assert.fail(missingConfigMessage());
    }
    t.skip(missingConfigMessage());
  });
} else {
  let userA = null;
  let userB = null;

  test.before(async () => {
    userA = await signUpAnonUser(STAGING_URL, ANON_KEY);
    userB = await signUpAnonUser(STAGING_URL, ANON_KEY);
  });

  test('cannot update or delete others memes via REST API', async () => {
    const listRes = await apiFetch(
      STAGING_URL,
      ANON_KEY,
      '/rest/v1/memes?select=id,user_id,title&status=eq.approved&limit=1',
      { token: userA.token }
    );
    assert.equal(listRes.status, 200);
    const targetMeme = Array.isArray(listRes.json) ? listRes.json.find((m) => m.user_id !== userA.userId) : null;
    if (!targetMeme) return;

    const patchRes = await apiFetch(
      STAGING_URL,
      ANON_KEY,
      `/rest/v1/memes?id=eq.${targetMeme.id}`,
      {
        method: 'PATCH',
        token: userA.token,
        headers: { Prefer: 'return=representation' },
        body: { title: 'TAMPERED TITLE' }
      }
    );
    const updatedRows = Array.isArray(patchRes.json) ? patchRes.json : [];
    assert.ok(patchRes.status >= 400 || updatedRows.length === 0, 'must not update another user meme');

    const delRes = await apiFetch(
      STAGING_URL,
      ANON_KEY,
      `/rest/v1/memes?id=eq.${targetMeme.id}`,
      {
        method: 'DELETE',
        token: userA.token,
        headers: { Prefer: 'return=representation' }
      }
    );
    const deletedRows = Array.isArray(delRes.json) ? delRes.json : [];
    assert.ok(delRes.status >= 400 || deletedRows.length === 0, 'must not delete another user meme');
  });

  test('cannot insert into memes directly via REST API', async () => {
    const res = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/memes', {
      method: 'POST',
      token: userA.token,
      body: {
        title: 'Direct Insert Attempt',
        image_url: '/seed/meme1.jpg',
        category: 'dank',
        status: 'approved',
        user_id: userA.userId
      }
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403 on direct memes insert, got ${res.status}`);
  });

  test('cannot upload directly to memes or quarantine storage buckets', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    for (const bucket of ['memes', 'quarantine']) {
      const res = await apiFetch(
        STAGING_URL,
        ANON_KEY,
        `/storage/v1/object/${bucket}/security-probe-${Date.now()}.png`,
        {
          method: 'POST',
          token: userA.token,
          headers: { 'Content-Type': 'image/png' },
          body: bytes
        }
      );
      assert.ok(res.status === 400 || res.status === 401 || res.status === 403, `direct upload to ${bucket} returned ${res.status}`);
    }
  });

  test('cannot read or forge others notifications', async () => {
    const readRes = await apiFetch(
      STAGING_URL,
      ANON_KEY,
      `/rest/v1/notifications?recipient_id=eq.${userB.userId}&select=id,message`,
      { token: userA.token }
    );
    assert.ok(readRes.status === 200 || readRes.status === 401 || readRes.status === 403);
    if (readRes.status === 200) {
      assert.deepEqual(readRes.json, []);
    }

    const insertRes = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/notifications', {
      method: 'POST',
      token: userA.token,
      body: {
        recipient_id: userB.userId,
        actor_name: 'Spoofed',
        type: 'upvote',
        message: 'Forged notification'
      }
    });
    assert.ok(insertRes.status === 401 || insertRes.status === 403, `direct notification insert returned ${insertRes.status}`);
  });

  test('vote replay via cast_vote RPC is idempotent', async (t) => {
    let targetId = TEST_MEME_ID;
    if (!targetId) {
      const listRes = await apiFetch(
        STAGING_URL,
        ANON_KEY,
        '/rest/v1/memes?select=id&status=eq.approved&limit=1',
        { token: userA.token }
      );
      targetId = listRes.json?.[0]?.id || '';
    }
    if (!targetId) {
      t.skip('No approved meme available on staging for vote replay test');
      return;
    }

    const first = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/rpc/cast_vote', {
      method: 'POST',
      token: userA.token,
      body: { p_meme_id: targetId, p_direction: 1 }
    });
    assert.equal(first.status, 200);
    assert.equal(first.json?.ok, true);

    const replay = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/rpc/cast_vote', {
      method: 'POST',
      token: userA.token,
      body: { p_meme_id: targetId, p_direction: 1 }
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.json?.ok, true);
    assert.equal(replay.json?.changed, false);
    assert.equal(replay.json?.score, first.json?.score);
  });

  test('non-moderator cannot read reports or access mod_queue', async () => {
    const reportsRes = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/reports?select=id,reason', {
      token: userA.token
    });
    assert.ok(reportsRes.status === 200 || reportsRes.status === 401 || reportsRes.status === 403);
    if (reportsRes.status === 200) {
      assert.deepEqual(reportsRes.json, []);
    }

    const modQueueRes = await apiFetch(STAGING_URL, ANON_KEY, '/rest/v1/rpc/mod_queue', {
      method: 'POST',
      token: userA.token,
      body: {}
    });
    assert.ok(
      modQueueRes.status === 400 || modQueueRes.status === 401 || modQueueRes.status === 403,
      `non-moderator mod_queue returned ${modQueueRes.status}`
    );
  });

  test('publishable key cannot select from any pulse_* table', async () => {
    for (const tbl of ['pulse_events', 'pulse_salts', 'pulse_daily']) {
      const res = await apiFetch(STAGING_URL, ANON_KEY, `/rest/v1/${tbl}?select=*&limit=1`);
      assert.ok(
        res.status === 401 || res.status === 403,
        `expected 401/403 selecting from ${tbl}, got ${res.status}`
      );
    }
  });
}
