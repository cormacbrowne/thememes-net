import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { voteCaptionBattleEntry, submitCaptionBattleEntry } from '../../src/utils/dailyCaptionBattle.js';
import { executeMemeNativeShare, executeMemeCopy } from '../../src/components/ShareMemeSheet.jsx';
import { formatGuessShareCard } from '../../src/utils/guessTheMeme.js';
import { trackReturnVisitOnce, isPulseAllowed } from '../../src/utils/analytics.js';
import {
  pulse,
  flushPulse,
  resetPulseForTest,
  RETURNING_VISITOR_KEY
} from '../../src/utils/pulse.js';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function makeMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    }
  };
}

describe('WP3 analytics accuracy', () => {
  const origDescriptors = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    sessionStorage: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document')
  };

  function setupBrowserEnv({ dnt = '0', gpc = false, local, session } = {}) {
    const localStore = local || makeMemoryStorage();
    const sessionStore = session || makeMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: localStore, configurable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStore, configurable: true });
    Object.defineProperty(globalThis, 'document', {
      value: { referrer: '', visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() },
      configurable: true
    });
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: { search: '?pulse=debug', pathname: '/', hostname: 'www.thememes.net' },
        innerWidth: 1280,
        localStorage: localStore,
        sessionStorage: sessionStore,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setInterval: vi.fn(() => 1),
        clearInterval: vi.fn()
      },
      configurable: true
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: gpc, doNotTrack: dnt, webdriver: false },
      configurable: true
    });
    return { localStore, sessionStore };
  }

  beforeEach(() => {
    resetPulseForTest();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetPulseForTest();
    for (const [key, desc] of Object.entries(origDescriptors)) {
      if (desc) Object.defineProperty(globalThis, key, desc);
      else delete globalThis[key];
    }
  });

  it('voteCaptionBattleEntry does not double-fire battle_vote while modal keeps the single event and entry tracking stays intact', async () => {
    setupBrowserEnv();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'u-wp3' }, access_token: 'jwt' } }
        }))
      },
      rpc: vi.fn(async () => ({ data: { ok: true, voted: true, score: 1 }, error: null })),
      functions: {
        invoke: vi.fn(async () => ({ data: { ok: true, status: 'approved' }, error: null }))
      }
    };

    const res = await voteCaptionBattleEntry('entry-1', true, mockClient);
    expect(res.ok).toBe(true);
    flushPulse();
    const afterVoteEvents = infoSpy.mock.calls.flatMap((c) => c[1]?.events || []).map((e) => e.name);
    expect(afterVoteEvents).not.toContain('battle_vote');

    const entryRes = await submitCaptionBattleEntry(
      { battleDate: '2026-11-21', templateId: 'tpl-drake-compare', topText: 'ONE', bottomText: 'TWO' },
      mockClient
    );
    expect(entryRes.ok).toBe(true);
    flushPulse();
    const afterEntryEvents = infoSpy.mock.calls.flatMap((c) => c[1]?.events || []).map((e) => e.name);
    expect(afterEntryEvents.filter((n) => n === 'battle_entry')).toHaveLength(1);

    const modalSrc = read('src/components/DailyCaptionBattleModal.jsx');
    expect(modalSrc.match(/track\('battle_vote'/g)).toHaveLength(1);
  });

  it('ShareMemeSheet fires one meme_shared per successful native share or copy, zero on cancel/fail/download', async () => {
    const meme = { id: 'meme-42', title: 'Test Meme' };
    const result = { blob: new Blob(['x'], { type: 'image/png' }), mime: 'image/png', filename: 'test.png' };
    const shareUrl = 'https://www.thememes.net/m/meme-42?ref=share&m=meme-42';

    const trackedFile = [];
    const outFile = await executeMemeNativeShare({
      meme,
      result,
      filename: 'test-thememes-net.png',
      shareUrl,
      nav: { canShare: () => true, share: vi.fn(async () => {}) },
      onTrack: (name, props) => trackedFile.push({ name, props }),
      onDownload: vi.fn()
    });
    expect(outFile).toEqual({ status: 'shared', channel: 'native_file' });
    expect(trackedFile).toEqual([{ name: 'meme_shared', props: { channel: 'native_file', meme_id: 'meme-42' } }]);

    const trackedLink = [];
    const outLink = await executeMemeNativeShare({
      meme,
      result,
      filename: 'test-thememes-net.png',
      shareUrl,
      nav: { share: vi.fn(async () => {}) },
      onTrack: (name, props) => trackedLink.push({ name, props }),
      onDownload: vi.fn()
    });
    expect(outLink).toEqual({ status: 'shared', channel: 'native_link' });
    expect(trackedLink).toEqual([{ name: 'meme_shared', props: { channel: 'native_link', meme_id: 'meme-42' } }]);

    const trackedCancel = [];
    const downloadSpy = vi.fn();
    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    const outCancel = await executeMemeNativeShare({
      meme,
      result,
      filename: 'test-thememes-net.png',
      shareUrl,
      nav: { share: vi.fn(async () => { throw abortErr; }) },
      onTrack: (name, props) => trackedCancel.push({ name, props }),
      onDownload: downloadSpy
    });
    expect(outCancel).toEqual({ status: 'cancelled' });
    expect(trackedCancel).toEqual([]);
    expect(downloadSpy).not.toHaveBeenCalled();

    const trackedFailFallback = [];
    const outFail = await executeMemeNativeShare({
      meme,
      result,
      filename: 'test-thememes-net.png',
      shareUrl,
      nav: { share: vi.fn(async () => { throw new Error('NotAllowedError'); }) },
      onTrack: (name, props) => trackedFailFallback.push({ name, props }),
      onDownload: downloadSpy
    });
    expect(outFail).toEqual({ status: 'fallback_download' });
    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(trackedFailFallback).toEqual([]);

    const trackedCopyOk = [];
    const copyOk = await executeMemeCopy({
      meme,
      shareUrl,
      nav: { clipboard: { writeText: vi.fn(async () => {}) } },
      onTrack: (name, props) => trackedCopyOk.push({ name, props })
    });
    expect(copyOk).toBe(true);
    expect(trackedCopyOk).toEqual([{ name: 'meme_shared', props: { channel: 'copy', meme_id: 'meme-42' } }]);

    const trackedCopyFail = [];
    const copyFail = await executeMemeCopy({
      meme,
      shareUrl,
      nav: { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } },
      onTrack: (name, props) => trackedCopyFail.push({ name, props })
    });
    expect(copyFail).toBe(false);
    expect(trackedCopyFail).toEqual([]);

    const sheetSrc = read('src/components/ShareMemeSheet.jsx');
    const doDownloadBlock = sheetSrc.match(/const doDownload = \(\) => \{[\s\S]*?\n {2}\};/)?.[0] || '';
    expect(doDownloadBlock).toContain("track('meme_downloaded'");
    expect(doDownloadBlock).not.toContain('meme_shared');
    expect(sheetSrc).toMatch(/catch\s*\{\s*setNote\(shareUrl\);\s*return;\s*\}/);
  });

  it('trackReturnVisitOnce returns early when Pulse is disallowed and reports false on 1st visit, true on 2nd', () => {
    const blocked = setupBrowserEnv({ dnt: '1' });
    const infoBlocked = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(isPulseAllowed()).toBe(false);
    trackReturnVisitOnce();
    flushPulse();
    expect(blocked.sessionStore.getItem('tm_return_tracked')).toBeNull();
    expect(blocked.localStore.getItem(RETURNING_VISITOR_KEY)).toBeNull();
    expect(infoBlocked).not.toHaveBeenCalled();

    const optOut = setupBrowserEnv();
    optOut.localStore.setItem('tm_settings', JSON.stringify({ pulseOn: false }));
    expect(isPulseAllowed()).toBe(false);
    trackReturnVisitOnce();
    expect(optOut.sessionStore.getItem('tm_return_tracked')).toBeNull();
    expect(optOut.localStore.getItem(RETURNING_VISITOR_KEY)).toBeNull();

    // Visit 1: trackReturnVisitOnce before pulse()
    vi.restoreAllMocks();
    resetPulseForTest();
    const visit1 = setupBrowserEnv();
    const infoVisit1 = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    expect(visit1.localStore.getItem(RETURNING_VISITOR_KEY)).toBe('1');
    const visit1Events = infoVisit1.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(visit1Events.map((e) => e.name)).toEqual(['view']);
    expect(visit1Events[0].returning).toBe(false);

    // Visit 1 (reverse order): pulse() before trackReturnVisitOnce()
    vi.restoreAllMocks();
    resetPulseForTest();
    const visit1Rev = setupBrowserEnv();
    const infoVisit1Rev = vi.spyOn(console, 'info').mockImplementation(() => {});
    pulse('view', { mode: 'feed' });
    trackReturnVisitOnce();
    flushPulse();
    expect(visit1Rev.localStore.getItem(RETURNING_VISITOR_KEY)).toBe('1');
    const visit1RevEvents = infoVisit1Rev.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(visit1RevEvents.map((e) => e.name)).toEqual(['view']);
    expect(visit1RevEvents[0].returning).toBe(false);

    // Visit 2: returning user (fresh sessionStorage, persisted localStorage)
    vi.restoreAllMocks();
    resetPulseForTest();
    setupBrowserEnv({ local: visit1.localStore, session: makeMemoryStorage() });
    const infoVisit2 = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    trackReturnVisitOnce(); // idempotent in same session
    pulse('view', { mode: 'feed' });
    flushPulse();
    const visit2Events = infoVisit2.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(visit2Events.map((e) => e.name)).toEqual(['return_visit', 'view']);
    expect(visit2Events[0].returning).toBe(true);
    expect(visit2Events[1].returning).toBe(true);
  });

  it('treats same-session reloads as non-returning and only later sessions as returning', () => {
    const dntEnv = setupBrowserEnv({ dnt: '1' });
    const dntSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    expect(dntEnv.localStore.getItem(RETURNING_VISITOR_KEY)).toBeNull();
    expect(dntEnv.sessionStore.getItem('tm_return_tracked')).toBeNull();
    expect(dntSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
    resetPulseForTest();
    const optOutEnv = setupBrowserEnv();
    optOutEnv.localStore.setItem('tm_settings', JSON.stringify({ pulseOn: false }));
    const optOutSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    expect(optOutEnv.localStore.getItem(RETURNING_VISITOR_KEY)).toBeNull();
    expect(optOutEnv.sessionStore.getItem('tm_return_tracked')).toBeNull();
    expect(optOutSpy).not.toHaveBeenCalled();

    // First load
    vi.restoreAllMocks();
    resetPulseForTest();
    const first = setupBrowserEnv();
    const firstSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    const firstEvents = firstSpy.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(firstEvents.map((e) => e.name)).toEqual(['view']);
    expect(firstEvents[0].returning).toBe(false);
    expect(first.sessionStore.getItem('tm_return_tracked')).toBe('first');
    expect(first.localStore.getItem(RETURNING_VISITOR_KEY)).toBe('1');

    // Same-session reload (same local and session stores after reset)
    vi.restoreAllMocks();
    resetPulseForTest();
    setupBrowserEnv({ local: first.localStore, session: first.sessionStore });
    const reloadSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    const reloadEvents = reloadSpy.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(reloadEvents.map((e) => e.name)).toEqual(['view']);
    expect(reloadEvents[0].returning).toBe(false);

    // Later session (same local store, fresh session store)
    vi.restoreAllMocks();
    resetPulseForTest();
    const laterSession = makeMemoryStorage();
    setupBrowserEnv({ local: first.localStore, session: laterSession });
    const laterSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    const laterEvents = laterSpy.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(laterEvents.map((e) => e.name)).toEqual(['return_visit', 'view']);
    expect(laterEvents.filter((e) => e.name === 'return_visit')).toHaveLength(1);
    expect(laterEvents.every((e) => e.returning === true)).toBe(true);

    // Reload in that later session
    vi.restoreAllMocks();
    resetPulseForTest();
    setupBrowserEnv({ local: first.localStore, session: laterSession });
    const laterReloadSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackReturnVisitOnce();
    pulse('view', { mode: 'feed' });
    flushPulse();
    const laterReloadEvents = laterReloadSpy.mock.calls.flatMap((c) => c[1]?.events || []);
    expect(laterReloadEvents.map((e) => e.name)).toEqual(['view']);
    expect(laterReloadEvents[0].returning).toBe(true);
  });

  it('uses canonical www URLs and tracks share after success in modal, profile, and footer', () => {
    const card = formatGuessShareCard({ puzzleNumber: 7, solvedCount: 4, totalRounds: 5, shareGrid: '🟩🟩🟩🟩🟥', streak: 2 });
    expect(card).toContain('https://www.thememes.net/games/guess-the-meme?ref=daily');

    const hilow = read('src/components/HigherOrLowerGame.jsx');
    expect(hilow).toContain('https://www.thememes.net/games/higher-or-lower?ref=score');

    const battleModal = read('src/components/DailyCaptionBattleModal.jsx');
    const shareBattleFn = battleModal.match(/const shareBattleLink = [\s\S]*?\n {2}\};/)?.[0] || '';
    expect(shareBattleFn.indexOf('await navigator.share')).toBeLessThan(shareBattleFn.indexOf('recordShare()'));
    expect(shareBattleFn).toContain('await navigator.clipboard.writeText(url)');

    const profile = read('src/components/CreatorProfilePage.jsx');
    const shareProfileFn = profile.match(/const handleShareProfile = [\s\S]*?\n {2}\};/)?.[0] || '';
    expect(shareProfileFn.indexOf('await navigator.share')).toBeLessThan(shareProfileFn.indexOf("track('meme_shared'"));
    expect(shareProfileFn).toContain('await navigator.clipboard.writeText(url)');

    const footer = read('src/components/SeoDiscoveryFooter.jsx');
    const shareSiteFn = footer.match(/const handleShareSite = [\s\S]*?\n {2}\};/)?.[0] || '';
    expect(shareSiteFn.indexOf('await navigator.share')).toBeLessThan(shareSiteFn.indexOf("trackShareClicked(null, 'site_footer')"));
    expect(shareSiteFn).toContain('await navigator.clipboard.writeText');
  });
});
