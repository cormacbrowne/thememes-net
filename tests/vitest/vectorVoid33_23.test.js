import { describe, expect, it } from 'vitest';
import {
  VOID_HEIGHT,
  VOID_WIDTH,
  createInitialVectorVoidState,
  createRock,
  stepVectorVoidState,
  wrapCoord
} from '../../src/utils/vectorVoidEngine.js';
import { isLeaderboardGame } from '../../src/utils/arcadeLeaderboards.js';
import { GAME_VIEW_MODE_TO_PATH, resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

describe('Task 33.23 — Vector Void twin-stick shooter & splitting rocks', () => {
  it('registers /games/vector-void, leaderboard, and wraps coordinates cleanly', () => {
    expect(wrapCoord(-5, VOID_WIDTH)).toBe(VOID_WIDTH - 5);
    expect(wrapCoord(VOID_HEIGHT + 7, VOID_HEIGHT)).toBe(7);

    const state = createInitialVectorVoidState({ rng: () => 0.25 });
    expect(state.status).toBe('playing');
    expect(isLeaderboardGame('void')).toBe(true);
    expect(GAME_VIEW_MODE_TO_PATH.void).toBe('/games/vector-void');
    expect(resolveRouteFromLocation('/games/vector-void', '').viewMode).toBe('void');
  });

  it('supports twin-stick move + aim, splits large rocks into pairs, and advances sector wave', () => {
    const state = createInitialVectorVoidState({ rng: () => 0.3 });
    const targetRock = createRock({
      x: state.ship.x + 110,
      y: state.ship.y,
      vx: 0,
      vy: 0,
      size: 3,
      rng: () => 0.3
    });
    state.rocks = [targetRock];

    // Aim right and fire with right stick while thrusting left with left stick
    stepVectorVoidState(state, { moveX: -1, moveY: 0, aimX: 1, aimY: 0 }, 0.02);
    expect(state.bullets.length).toBe(1);
    expect(state.ship.vx).toBeLessThan(0);

    // Advance until bullet hits the rock -> splits size 3 rock into two size 2 rocks
    for (let i = 0; i < 12; i += 1) {
      stepVectorVoidState(state, {}, 0.025);
    }
    expect(state.score).toBeGreaterThanOrEqual(100);
    expect(state.rocks).toHaveLength(2);
    expect(state.rocks[0].size).toBe(2);

    // Clearing the final mini-rock advances sector wave
    state.rocks = [
      createRock({
        x: state.ship.x + 28,
        y: state.ship.y,
        vx: 0,
        vy: 0,
        size: 1,
        rng: () => 0.3
      })
    ];
    state.fireCooldown = 0;
    stepVectorVoidState(state, { aimX: 1, aimY: 0 }, 0.02);
    for (let i = 0; i < 6; i += 1) {
      stepVectorVoidState(state, {}, 0.025);
    }
    expect(state.wave).toBe(2);
    expect(state.rocks.length).toBeGreaterThanOrEqual(4);
  });

  it('decrements lives on rock impact until gameover', () => {
    const state = createInitialVectorVoidState({ rng: () => 0.4 });
    state.lives = 1;
    state.ship.invulnTimer = 0;
    state.rocks = [
      createRock({ x: state.ship.x, y: state.ship.y, vx: 0, vy: 0, size: 3, rng: () => 0.4 })
    ];
    stepVectorVoidState(state, {}, 0.016);
    expect(state.status).toBe('gameover');
    expect(state.sfxEvents).toContain('gameOver');
  });
});
