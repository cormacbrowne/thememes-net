import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  redactUmamiPath,
  redactUmamiPayload,
  redactUmamiReferrer,
  umamiBeforeSend
} from '../../src/lib/umami.ts';

describe('Umami redaction', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('hides meme, profile and battle identifiers', () => {
    expect(redactUmamiPath('/m/seed-dank-01/funny-slug')).toBe('/m/:id');
    expect(redactUmamiPath('/u/qa_user')).toBe('/u/:id');
    expect(redactUmamiPath('/battle/abc/e/def')).toBe('/battle/:id');
    expect(redactUmamiPath('https://www.thememes.net/u/qa_user')).toBe('https://www.thememes.net/u/:id');
  });

  it('leaves ordinary pages alone', () => {
    expect(redactUmamiPath('/games/roulette')).toBe('/games/roulette');
    expect(redactUmamiPath('/memes/gaming')).toBe('/memes/gaming');
  });

  it('never sends a page title', () => {
    expect(
      redactUmamiPayload({
        url: '/u/qa_user',
        referrer: 'https://www.thememes.net/m/seed-dank-01',
        title: '@qa_user — Creator Profile'
      })
    ).toEqual({ url: '/u/:id', referrer: 'https://www.thememes.net/m/:id', title: 'THE MEMES.net' });
    expect(redactUmamiPayload({ url: '/', title: 'Funny cat — Meme by @qa_user' })).toEqual({
      url: '/',
      title: 'THE MEMES.net'
    });
  });

  it('removes queries and hashes from the page URL', () => {
    expect(redactUmamiPayload({ url: '/m/abc?m=M1#top' }).url).toBe('/m/:id');
    expect(redactUmamiPayload({ url: '/?m=M1&ref=share' }).url).toBe('/');
  });

  it('reduces other sites to their origin and drops unusable referrers', () => {
    expect(redactUmamiReferrer('https://other.example/page?q=private#x')).toBe('https://other.example');
    expect(redactUmamiReferrer('https://www.thememes.net/u/qa_user?x=1')).toBe('https://www.thememes.net/u/:id');
    expect(redactUmamiReferrer('/m/abc?x=1')).toBe('/m/:id');
    expect(redactUmamiReferrer('android-app://com.example/')).toBe('');
    expect(redactUmamiReferrer('not a url')).toBe('');
    expect(redactUmamiReferrer('')).toBe('');
  });

  it('drops sends as soon as Usage stats is off', () => {
    vi.stubEnv('DEV', false);
    let stored = JSON.stringify({ pulseOn: true });
    vi.stubGlobal('window', { location: { hostname: 'www.thememes.net' } });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('localStorage', { getItem: () => stored });
    expect(umamiBeforeSend('event', { url: '/games', title: 'Games' })).toEqual({
      url: '/games',
      title: 'THE MEMES.net'
    });
    stored = JSON.stringify({ pulseOn: false });
    expect(umamiBeforeSend('event', { url: '/games', title: 'Games' })).toBeNull();
  });
});
