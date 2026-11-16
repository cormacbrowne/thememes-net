import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pulse, pulseTimer, flushPulse, isPulseAllowed, resetPulseForTest } from '../../src/utils/pulse';

describe('Pulse client (35.1b)', () => {
  beforeEach(() => {
    resetPulseForTest();
    vi.restoreAllMocks();
  });

  it('respects Global Privacy Control and Do-Not-Track', () => {
    const origNav = globalThis.navigator;
    const origWin = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
      value: { location: { search: '?pulse=debug', pathname: '/', hostname: 'thememes.net' }, innerWidth: 1280, addEventListener: vi.fn(), removeEventListener: vi.fn(), setInterval: vi.fn(() => 1), clearInterval: vi.fn() },
      configurable: true
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: true, doNotTrack: '0', webdriver: false },
      configurable: true
    });
    expect(isPulseAllowed()).toBe(false);

    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: false, doNotTrack: '1', webdriver: false },
      configurable: true
    });
    expect(isPulseAllowed()).toBe(false);

    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: false, doNotTrack: '0', webdriver: true },
      configurable: true
    });
    expect(isPulseAllowed()).toBe(false);

    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: false, doNotTrack: '0', webdriver: false },
      configurable: true
    });
    expect(isPulseAllowed()).toBe(true);

    Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true });
    Object.defineProperty(globalThis, 'window', { value: origWin, configurable: true });
  });

  it('queues valid events and flushes via pulseTimer stop()', () => {
    const origNav = globalThis.navigator;
    const origWin = globalThis.window;
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    Object.defineProperty(globalThis, 'window', {
      value: { location: { search: '?pulse=debug', pathname: '/games', hostname: 'thememes.net' }, innerWidth: 390, addEventListener: vi.fn(), removeEventListener: vi.fn(), setInterval: vi.fn(() => 1), clearInterval: vi.fn() },
      configurable: true
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { globalPrivacyControl: false, doNotTrack: '0', webdriver: false },
      configurable: true
    });

    const stop = pulseTimer('game_end', { game: 'slots' });
    stop({ rounds: 3, result: 'win' });
    pulse('view', { mode: 'arcade' });
    flushPulse();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = infoSpy.mock.calls[0][1];
    expect(payload.events.length).toBe(2);
    expect(payload.events[0].name).toBe('game_end');
    expect(payload.events[0].props.game).toBe('slots');
    expect(payload.events[0].props.rounds).toBe(3);
    expect(payload.events[0].device).toBe('phone');
    expect(payload.events[1].name).toBe('view');

    Object.defineProperty(globalThis, 'navigator', { value: origNav, configurable: true });
    Object.defineProperty(globalThis, 'window', { value: origWin, configurable: true });
  });
});
