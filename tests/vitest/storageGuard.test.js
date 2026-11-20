import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal Storage with a character quota that throws like Chrome/Edge do.
function makeStorageClass(limit) {
  class FakeStorage {
    constructor() {
      this.map = new Map();
    }
    get length() {
      return this.map.size;
    }
    key(i) {
      return [...this.map.keys()][i] ?? null;
    }
    getItem(k) {
      return this.map.has(k) ? this.map.get(k) : null;
    }
    removeItem(k) {
      this.map.delete(k);
    }
    setItem(k, v) {
      if (k === 'boom') throw new TypeError('some other storage failure');
      const next = new Map(this.map);
      next.set(k, String(v));
      let used = 0;
      for (const [a, b] of next) used += a.length + b.length;
      if (used > limit) {
        const e = new Error(`Failed to execute 'setItem' on 'Storage': Setting the value of '${k}' exceeded the quota.`);
        e.name = 'QuotaExceededError';
        e.code = 22;
        throw e;
      }
      this.map = next;
    }
  }
  return FakeStorage;
}

async function setup(limit) {
  vi.resetModules();
  const FakeStorage = makeStorageClass(limit);
  const local = new FakeStorage();
  const session = new FakeStorage();
  const win = { localStorage: local, sessionStorage: session };
  const mod = await import('../../src/utils/storageGuard.js');
  mod.installStorageGuard(win);
  return { local, session, mod };
}

describe('storage guard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('never throws on a full quota: the save is skipped instead of crashing the page', async () => {
    const { local } = await setup(1000);
    local.setItem('tm_big', 'x'.repeat(900));
    expect(() => local.setItem('tm_votes', 'y'.repeat(500))).not.toThrow();
    expect(local.getItem('tm_votes')).toBeNull();
    expect(local.getItem('tm_big')).toHaveLength(900);
  });

  it('drops rebuildable caches first, then the save goes through', async () => {
    const { local } = await setup(1000);
    local.setItem('tm_meme_categories_v1', 'c'.repeat(600));
    local.setItem('tm_tokens_balance_v2', '42');
    local.setItem('tm_votes', '{"a":1,"b":-1}'.padEnd(500, ' '));
    expect(local.getItem('tm_votes')).not.toBeNull();
    expect(local.getItem('tm_meme_categories_v1')).toBeNull();
    expect(local.getItem('tm_tokens_balance_v2')).toBe('42'); // tokens untouched
  });

  it('then slims big inline images in the local meme copy, keeping the memes', async () => {
    const { local, mod } = await setup(50000);
    const memes = [
      { id: 'm1', title: 'Pizza at home', image_url: 'data:image/png;base64,' + 'A'.repeat(40000) },
      { id: 'm2', title: 'Small', image_url: 'https://cdn.example/x.png' }
    ];
    local.setItem(mod.USER_MEMES_KEY, JSON.stringify(memes));
    local.setItem('tm_votes', 'v'.repeat(15000));
    expect(local.getItem('tm_votes')).toHaveLength(15000);
    const kept = JSON.parse(local.getItem(mod.USER_MEMES_KEY));
    expect(kept.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(kept[0].image_url).toBe('');
    expect(kept[1].image_url).toBe('https://cdn.example/x.png');
  });

  it('leaves sessionStorage behaviour alone', async () => {
    const { session } = await setup(100);
    expect(() => session.setItem('k', 'z'.repeat(200))).toThrow(/quota/);
  });

  it('still throws non-quota errors', async () => {
    const { local } = await setup(1000);
    expect(() => local.setItem('boom', 'x')).toThrow(TypeError);
  });

  it('lists the biggest keys for the report', async () => {
    const { local, mod } = await setup(10000);
    local.setItem('small', 'a');
    local.setItem('big', 'b'.repeat(500));
    expect(mod.storageSizes(local)[0][0]).toBe('big');
  });
});
