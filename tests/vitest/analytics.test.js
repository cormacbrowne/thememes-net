// Plan 1.4 — analytics wrapper, events, share links, and no Clarity.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { track, PLAN_EVENTS, memeShareUrl } from '../../src/utils/analytics.js';
import { UMAMI_EVENTS, cleanProps } from '../../src/lib/analytics.ts';
import { isUmamiEnabled, isLocalHost, UMAMI_SCRIPT_SRC } from '../../src/lib/umami.ts';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('analytics (plan 1.4, Umami + Vercel)', () => {
  it('exposes one track(event, props) wrapper that never throws', () => {
    expect(typeof track).toBe('function');
    expect(() => track('vote_cast', { meme_id: 'x', nested: { a: 1 } })).not.toThrow();
    expect(() => track('')).not.toThrow();
  });

  it('every plan event is accepted by the Pulse server allowlist', () => {
    const sql = read('supabase/migrations/20261120140806_pulse_plan_events.sql');
    for (const name of PLAN_EVENTS) {
      expect(sql, name).toContain(`'${name}'`);
    }
  });

  it('every plan event is fired somewhere in the app', () => {
    const files = fs
      .readdirSync(path.join(root, 'src'), { recursive: true })
      .filter((f) => /\.(js|jsx)$/.test(f))
      .map((f) => read(path.join('src', f)))
      .join('\n');
    for (const name of PLAN_EVENTS) {
      expect(files, name).toMatch(new RegExp(`track\\('${name}'|safeTrack\\('${name}'|trackGameStarted`));
    }
  });

  it('share links carry ?ref=share&m=<memeId>', () => {
    expect(memeShareUrl('abc-123', 'https://www.thememes.net')).toBe(
      'https://www.thememes.net/m/abc-123?ref=share&m=abc-123'
    );
    for (const f of ['src/components/ShareMemeSheet.jsx', 'src/components/MemeLiveCelebrationModal.jsx']) {
      expect(read(f)).toContain('memeShareUrl(');
    }
  });

  it('Umami stays off without a website ID, and never runs on localhost', () => {
    expect(isUmamiEnabled()).toBe(false); // node: no window
    for (const h of ['localhost', '127.0.0.1', 'foo.local', '192.168.1.20', '10.0.0.5', '']) {
      expect(isLocalHost(h), h).toBe(true);
    }
    for (const h of ['www.thememes.net', 'thememes.net', 'thememes-net-git-x.vercel.app']) {
      expect(isLocalHost(h), h).toBe(false);
    }
  });

  it('Umami gets exactly the six public product events', () => {
    expect(Object.values(UMAMI_EVENTS).sort()).toEqual(
      ['battle_entry', 'game_started', 'guess_the_meme_played', 'meme_created', 'prank_started', 'share_clicked'].sort()
    );
    // every in-app name mapped to Umami is also accepted by Pulse
    for (const inApp of Object.keys(UMAMI_EVENTS)) expect(PLAN_EVENTS).toContain(inApp);
  });

  it('cleanProps keeps only flat, short, non-null values', () => {
    expect(cleanProps({ a: 'x'.repeat(200), b: 2, c: true, d: null, e: undefined, f: { g: 1 } })).toEqual({
      a: 'x'.repeat(120),
      b: 2,
      c: true,
      f: '[object Object]'
    });
  });

  it('the Umami website ID comes only from VITE_UMAMI_WEBSITE_ID (never hard-coded)', () => {
    const files = fs
      .readdirSync(path.join(root, 'src'), { recursive: true })
      .filter((f) => /\.(js|jsx|ts|tsx)$/.test(f))
      .map((f) => read(path.join('src', f)))
      .join('\n');
    expect(files).toContain('VITE_UMAMI_WEBSITE_ID');
    expect(files).not.toMatch(/data-website-id['"]?\s*[,=]\s*['"][0-9a-f]{8}-/i);
    for (const f of ['index.html', 'vercel.json']) {
      expect(read(f)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    }
    expect(UMAMI_SCRIPT_SRC).toBe('https://cloud.umami.is/script.js');
  });

  it('Plausible is completely gone', () => {
    expect(fs.existsSync(path.join(root, 'src/utils/plausible.js'))).toBe(false);
    for (const f of ['index.html', 'vercel.json', 'src/main.jsx', 'src/utils/analytics.js', 'package.json']) {
      expect(read(f), f).not.toMatch(/plausible/i);
    }
  });

  it('Microsoft Clarity is gone (script and CSP)', () => {
    for (const f of ['index.html', 'vercel.json']) {
      expect(read(f)).not.toMatch(/clarity/i);
    }
  });

  it('CSP allows Umami and nothing else third-party for analytics (index.html + vercel.json)', () => {
    for (const f of ['index.html', 'vercel.json']) {
      const csp = read(f).match(/default-src 'self';[^"]*/)[0];
      const directive = (name) => (csp.match(new RegExp(`${name} ([^;]*);`)) || [])[1] || '';
      expect(directive('script-src'), f).toBe("'self' https://cloud.umami.is https://challenges.cloudflare.com");
      expect(directive('connect-src'), f).toMatch(/^'self' https:\/\/gateway\.umami\.is /);
      // Vercel Analytics + Speed Insights load same-origin (/_vercel/*) in production builds.
      expect(csp, f).not.toMatch(/plausible|vercel-scripts|vercel-insights/);
    }
  });

  it('Vercel Analytics + Speed Insights are mounted once, production builds only', () => {
    const main = read('src/main.jsx');
    expect(main.match(/<Analytics\b/g)).toHaveLength(1);
    expect(main.match(/<SpeedInsights\b/g)).toHaveLength(1);
    expect(main).toMatch(/import\.meta\.env\.PROD && <Analytics \/>/);
    expect(read('index.html')).not.toMatch(/_vercel\/(insights|speed-insights)/);
  });
});
