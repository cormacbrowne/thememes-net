import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flash,
  getTimeScale,
  haptic,
  hitStop,
  isJuiceDisabled,
  punch,
  resetJuiceForTests,
  shake,
  slowMo
} from '../../src/utils/juice';
import { updateSettings } from '../../src/utils/settingsStore';

function createMockElement() {
  return {
    style: {},
    animate: vi.fn(() => ({ cancel: vi.fn(), onfinish: null, oncancel: null }))
  };
}

describe('Phase 35.6 juice kit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T12:00:00Z'));
    resetJuiceForTests();
    updateSettings({ reducedMotion: 'off', litePerfMode: false, hapticsOn: true });
  });

  afterEach(() => {
    updateSettings({ reducedMotion: 'auto', litePerfMode: false, hapticsOn: true });
    vi.useRealTimers();
  });

  it('refuses a fourth flash inside one second, then recovers once 1000 ms pass', () => {
    const el = createMockElement();

    expect(flash(el, '#ff2bd6', 120)).toBe(true);
    vi.advanceTimersByTime(250);
    expect(flash(el, '#ff2bd6', 120)).toBe(true);
    vi.advanceTimersByTime(250);
    expect(flash(el, '#ff2bd6', 120)).toBe(true);

    // 4th flash at t=500ms must be refused
    expect(flash(el, '#ff2bd6', 120)).toBe(false);

    // At t=999ms the oldest flash is still inside 1000ms
    vi.advanceTimersByTime(499);
    expect(flash(el, '#ff2bd6', 120)).toBe(false);

    // At t=1001ms the first flash leaves the 1000ms window
    vi.advanceTimersByTime(2);
    expect(flash(el, '#ff2bd6', 120)).toBe(true);
  });

  it('turns every juice function into a no-op under reduced motion or lite mode', async () => {
    const el = createMockElement();

    updateSettings({ reducedMotion: 'on' });
    expect(isJuiceDisabled()).toBe(true);
    expect(haptic('tap')).toBe(false);
    expect(shake(el, 4)).toBeNull();
    expect(punch(el, 1.1)).toBeNull();
    expect(flash(el, '#00f3ff', 120)).toBe(false);
    expect(slowMo(0.25, 300)).toBe(false);
    expect(getTimeScale()).toBe(1);
    expect(await hitStop(80)).toBe(false);
    expect(el.animate).not.toHaveBeenCalled();

    updateSettings({ reducedMotion: 'off', litePerfMode: true });
    expect(isJuiceDisabled()).toBe(true);
    expect(shake(el, 2)).toBeNull();
    expect(el.animate).not.toHaveBeenCalled();
  });

  it('scales shake amplitude/duration by power and temporarily adjusts slowMo', () => {
    const el = createMockElement();

    shake(el, 1);
    expect(el.animate).toHaveBeenCalledTimes(1);
    expect(el.animate.mock.calls[0][1].duration).toBe(120);

    shake(el, 5);
    expect(el.animate).toHaveBeenCalledTimes(2);
    expect(el.animate.mock.calls[1][1].duration).toBe(420);

    expect(slowMo(0.3, 300)).toBe(true);
    expect(getTimeScale()).toBeCloseTo(0.3);
    vi.advanceTimersByTime(300);
    expect(getTimeScale()).toBe(1);
  });
});
