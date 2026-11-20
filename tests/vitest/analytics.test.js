// Plan 1.4 — analytics wrapper, events, share links, and no Clarity.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { track, PLAN_EVENTS, memeShareUrl } from '../../src/utils/analytics.js';
import { isPlausibleEnabled } from '../../src/utils/plausible.js';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('analytics (plan 1.4)', () => {
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

  it('Plausible stays off until VITE_PLAUSIBLE_DOMAIN is configured', () => {
    expect(isPlausibleEnabled()).toBe(Boolean(import.meta.env.VITE_PLAUSIBLE_DOMAIN));
  });

  it('Microsoft Clarity is gone (script and CSP)', () => {
    for (const f of ['index.html', 'vercel.json']) {
      expect(read(f)).not.toMatch(/clarity/i);
    }
  });

  it('CSP allows Plausible in both index.html and vercel.json', () => {
    for (const f of ['index.html', 'vercel.json']) {
      const s = read(f);
      expect(s).toMatch(/script-src 'self' https:\/\/plausible\.io/);
      expect(s).toMatch(/connect-src 'self' https:\/\/plausible\.io/);
    }
  });
});
