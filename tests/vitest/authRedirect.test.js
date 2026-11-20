import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Fake supabase-js: setSession takes a moment (like the real /user round trip), and
// getSession reports whatever has been saved so far.
const state = { saved: { user: { id: 'anon-1', is_anonymous: true } }, createOptions: null };
vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url, _key, options) => {
    state.createOptions = options;
    return {
      auth: {
        setSession: vi.fn(async ({ access_token }) => {
          await new Promise((r) => setTimeout(r, 20));
          if (access_token === 'bad') return { data: null, error: { code: 'bad_jwt', message: 'invalid JWT' } };
          state.saved = { user: { id: 'google-user', is_anonymous: false } };
          return { data: { session: state.saved }, error: null };
        }),
        getSession: vi.fn(async () => ({ data: { session: state.saved }, error: null }))
      }
    };
  }
}));

function fakeWindow(href) {
  const url = new URL(href);
  const calls = [];
  globalThis.window = {
    location: {
      get href() { return url.href; },
      get hash() { return url.hash; },
      get pathname() { return url.pathname; },
      get search() { return url.search; }
    },
    history: {
      state: { kept: true },
      replaceState: (s, _t, next) => {
        calls.push(next);
        const n = new URL(next, url);
        url.hash = n.hash;
        url.pathname = n.pathname;
        url.search = n.search;
      }
    }
  };
  return { url, calls };
}

describe('sign-in redirect handling', () => {
  beforeEach(() => {
    vi.resetModules();
    state.saved = { user: { id: 'anon-1', is_anonymous: true } };
  });
  afterEach(() => {
    delete globalThis.window;
  });

  it('turns off supabase-js URL detection (it clears the hash with location.hash, firing a Back)', async () => {
    fakeWindow('https://www.thememes.net/');
    await import('../../src/supabaseClient.js');
    expect(state.createOptions.auth.detectSessionInUrl).toBe(false);
  });

  it('strips the tokens with replaceState, keeps path/query, and getSession waits for the Google session', async () => {
    const { url, calls } = fakeWindow(
      'https://www.thememes.net/arcade?x=1#access_token=aaa&refresh_token=rrr&expires_in=3600&token_type=bearer'
    );
    const mod = await import('../../src/supabaseClient.js');
    expect(calls).toEqual(['/arcade?x=1']);
    expect(url.href).toBe('https://www.thememes.net/arcade?x=1');
    // Called straight away, before setSession has finished: must NOT see the old anonymous user.
    const { data } = await mod.getSupabaseClient().auth.getSession();
    expect(data.session.user.id).toBe('google-user');
    expect(mod.getAuthRedirectError()).toBeNull();
  });

  it('reports an expired / reused link instead of failing silently', async () => {
    const { url } = fakeWindow(
      'https://www.thememes.net/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );
    const mod = await import('../../src/supabaseClient.js');
    expect(url.hash).toBe('');
    expect(mod.getAuthRedirectError()).toEqual({
      code: 'otp_expired',
      description: 'Email link is invalid or has expired'
    });
  });

  it('records an error when the returned tokens are rejected', async () => {
    fakeWindow('https://www.thememes.net/#access_token=bad&refresh_token=rrr');
    const mod = await import('../../src/supabaseClient.js');
    const { data } = await mod.getSupabaseClient().auth.getSession();
    expect(data.session.user.id).toBe('anon-1');
    expect(mod.getAuthRedirectError()).toMatchObject({ code: 'bad_jwt' });
  });

  it('leaves ordinary #anchors alone', async () => {
    const { calls } = fakeWindow('https://www.thememes.net/faq#rules');
    await import('../../src/supabaseClient.js');
    expect(calls).toEqual([]);
  });
});
