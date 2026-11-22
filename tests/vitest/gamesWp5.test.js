import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  PINBALL_FIXED_STEP_MS,
  PINBALL_MAX_STEPS_PER_FRAME,
  advanceFixedTimestep,
  getPinballInputAction
} from '../../src/components/VegasPinballGame.jsx';
import { createHighScorePromptGuard } from '../../src/components/GameRouter.jsx';
import { shouldAutoCallBingo } from '../../src/components/NeonBingoGame.jsx';
import {
  COUNTDOWN_STEPS,
  isReducedMotionActive
} from '../../src/components/ui/ResumeCountdown.jsx';

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function simulateDuration(frameDeltaMs, durationMs) {
  let acc = 0;
  let totalSteps = 0;
  const frames = Math.round(durationMs / frameDeltaMs);
  for (let i = 0; i < frames; i += 1) {
    const res = advanceFixedTimestep(acc, frameDeltaMs, () => {
      totalSteps += 1;
    });
    acc = res.accumulatorMs;
  }
  return totalSteps;
}

describe('WP5 games reliability and feel', () => {
  const origDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const origWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

  afterEach(() => {
    vi.restoreAllMocks();
    if (origDocument) Object.defineProperty(globalThis, 'document', origDocument);
    else delete globalThis.document;
    if (origWindow) Object.defineProperty(globalThis, 'window', origWindow);
    else delete globalThis.window;
  });

  it('pinball fixed 60Hz timestep produces identical physics steps at 60Hz, 120Hz, and 144Hz with capped catch-up', () => {
    const steps60 = simulateDuration(1000 / 60, 1000);
    const steps120 = simulateDuration(1000 / 120, 1000);
    const steps144 = simulateDuration(1000 / 144, 1000);

    expect(steps60).toBe(60);
    expect(steps120).toBe(steps60);
    expect(steps144).toBe(steps60);

    let spikedSteps = 0;
    const capped = advanceFixedTimestep(0, 5000, () => {
      spikedSteps += 1;
    });
    expect(PINBALL_FIXED_STEP_MS).toBeCloseTo(1000 / 60, 5);
    expect(spikedSteps).toBe(PINBALL_MAX_STEPS_PER_FRAME);
    expect(capped.accumulatorMs).toBe(0);

    const pinballSrc = read('src/components/VegasPinballGame.jsx');
    expect(pinballSrc).toContain("document.addEventListener('visibilitychange'");
    expect(pinballSrc).toContain("window.addEventListener('blur'");
    expect(pinballSrc).toContain('advanceFixedTimestep(');
  });

  it('high-score prompt guard defers to Save score chip if player restarted during leaderboard lookup', async () => {
    const guard = createHighScorePromptGuard();

    let resolveBoard;
    const pendingBoard = new Promise((r) => {
      resolveBoard = r;
    });

    const evalPromise = guard.evaluateScore({
      gameId: 'serpent',
      score: 4200,
      sessionId: 'sess-run-1',
      getActiveViewMode: () => 'serpent',
      fetchBoard: () => pendingBoard,
      qualifies: (entries, score) => score > (entries[0]?.score || 0)
    });

    // Player hits Play Again before fetchBoard finishes
    guard.markRunRestarted('serpent');
    resolveBoard({ ok: true, entries: [{ score: 1000 }] });

    const deferred = await evalPromise;
    expect(deferred).toEqual({
      action: 'defer',
      payload: { gameId: 'serpent', score: 4200, sessionId: 'sess-run-1' }
    });

    // Normal game-over without restart opens the modal immediately
    const opened = await guard.evaluateScore({
      gameId: 'serpent',
      score: 5100,
      sessionId: 'sess-run-2',
      getActiveViewMode: () => 'serpent',
      fetchBoard: async () => ({ ok: true, entries: [{ score: 1000 }] }),
      qualifies: (entries, score) => score > (entries[0]?.score || 0)
    });
    expect(opened).toEqual({
      action: 'open',
      payload: { gameId: 'serpent', score: 5100, sessionId: 'sess-run-2' }
    });

    // Navigating away ignores stale lookup
    const ignoredNav = await guard.evaluateScore({
      gameId: 'serpent',
      score: 6000,
      sessionId: 'sess-run-2',
      getActiveViewMode: () => 'feed',
      fetchBoard: async () => ({ ok: true, entries: [{ score: 1000 }] }),
      qualifies: () => true
    });
    expect(ignoredNav).toEqual({ action: 'ignore' });

    const initialsSrc = read('src/components/ArcadeInitialsModal.jsx');
    expect(initialsSrc).toContain('e.stopPropagation()');
    expect(initialsSrc).toContain("window.addEventListener('keydown', onKeyDown, true)");

    const routerSrc = read('src/components/GameRouter.jsx');
    expect(routerSrc).toContain('data-testid="save-score-chip"');
  });

  it('Neon Bingo pauses auto-caller while tab is hidden and resumes on return', () => {
    expect(shouldAutoCallBingo({ roundActive: true, isAutoCalling: true, speedMs: 2800, documentHidden: false })).toBe(true);
    expect(shouldAutoCallBingo({ roundActive: true, isAutoCalling: true, speedMs: 2800, documentHidden: true })).toBe(false);
    expect(shouldAutoCallBingo({ roundActive: true, isAutoCalling: true, speedMs: 0, documentHidden: false })).toBe(false);
    expect(shouldAutoCallBingo({ roundActive: false, isAutoCalling: true, speedMs: 2800, documentHidden: false })).toBe(false);

    const bingoSrc = read('src/components/NeonBingoGame.jsx');
    expect(bingoSrc).toContain("document.addEventListener('visibilitychange'");
    expect(bingoSrc).toContain('shouldAutoCallBingo(');
  });

  it('ResumeCountdown counts 3-2-1 and respects site and OS reduced motion', () => {
    expect(COUNTDOWN_STEPS).toEqual([3, 2, 1]);

    const setEnv = (datasetPref, osMatches) => {
      Object.defineProperty(globalThis, 'document', {
        value: { documentElement: { dataset: datasetPref ? { reducedMotion: datasetPref } : {} } },
        configurable: true
      });
      Object.defineProperty(globalThis, 'window', {
        value: { matchMedia: () => ({ matches: osMatches }) },
        configurable: true
      });
    };

    setEnv('auto', true);
    expect(isReducedMotionActive()).toBe(true);
    setEnv('auto', false);
    expect(isReducedMotionActive()).toBe(false);
    setEnv('on', false);
    expect(isReducedMotionActive()).toBe(true);
    setEnv('off', true);
    expect(isReducedMotionActive()).toBe(false);
  });

  it('wires ResumeCountdown, mid-run restart confirm, and onRunRestart into all 6 canvas games including GridRiders', () => {
    const games = [
      'src/components/BrickBlasterGame.jsx',
      'src/components/GridRidersGame.jsx',
      'src/components/MemeInvadersGame.jsx',
      'src/components/NeonSerpentGame.jsx',
      'src/components/SunsetSprintGame.jsx',
      'src/components/VectorVoidGame.jsx'
    ];
    for (const file of games) {
      const src = read(file);
      expect(src, file).toContain('<ResumeCountdown');
      expect(src, file).toContain('restartArmed');
      expect(src, file).toContain('onRunRestart?.(');
    }

    const ridersSrc = read('src/components/GridRidersGame.jsx');
    expect(ridersSrc).toContain('data-testid="riders-restart-btn"');
    expect(ridersSrc).toContain('handleRestartRun');
  });

  it('blocks pinball gameplay inputs while paused and avoids side effects inside LazyCompanionRow state updater', () => {
    expect(getPinballInputAction(null, false)).toBe('none');
    expect(getPinballInputAction({ gameOver: false }, true)).toBe('none');
    expect(getPinballInputAction({ gameOver: false }, false)).toBe('play');
    expect(getPinballInputAction({ gameOver: true }, false)).toBe('restart');
    expect(getPinballInputAction({ gameOver: true }, true)).toBe('restart');

    const pinballSrc = read('src/components/VegasPinballGame.jsx');
    const launchBlock = pinballSrc.match(/const launchPlunger = useCallback\([\s\S]*?\[resetTableGame\]\);/)?.[0] || '';
    const nudgeBlock = pinballSrc.match(/const nudgeTable = useCallback\([\s\S]*?\[launchPlunger\]\s*\);/)?.[0] || '';
    const magnaBlock = pinballSrc.match(/const activateMagnaSave = useCallback\([\s\S]*?\n {2}\}, \[\]\);/)?.[0] || '';
    const flipperBlock = pinballSrc.match(/const setFlipperState = useCallback\([\s\S]*?\n {2}\}, \[\]\);/)?.[0] || '';

    expect(launchBlock).toContain('getPinballInputAction(');
    expect(nudgeBlock).toContain('getPinballInputAction(');
    expect(magnaBlock).toContain('getPinballInputAction(');
    expect(flipperBlock).toContain('isDown && isPausedRef.current');

    const companionSrc = read('src/components/LazyCompanionRow.jsx');
    expect(companionSrc).not.toContain('setExpanded((prev)');
  });
});
