import { describe, expect, it } from 'vitest';
import {
  SERPENT_GRID_COLS,
  SERPENT_MIN_LENGTH,
  createInitialSerpentState,
  enqueueSerpentDirection,
  getSerpentTickInterval,
  stepSerpentState
} from '../../src/utils/neonSerpentEngine.js';
import { isLeaderboardGame } from '../../src/utils/arcadeLeaderboards.js';
import { GAME_VIEW_MODE_TO_PATH, resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

function runFrames(state, seconds, rng = () => 0.2) {
  let remaining = seconds;
  while (remaining > 0 && state.status === 'playing') {
    const slice = Math.min(0.025, remaining);
    stepSerpentState(state, slice, { rng });
    remaining -= slice;
  }
}

describe('Task 33.20 — Neon Serpent engine & reaction effects', () => {
  it('spawns cleanly and registers /games/neon-serpent + serpent leaderboard', () => {
    const state = createInitialSerpentState({ rng: () => 0.25 });
    expect(state.status).toBe('playing');
    expect(state.snake).toHaveLength(4);
    expect(state.foods.length).toBeGreaterThanOrEqual(3);
    expect(isLeaderboardGame('serpent')).toBe(true);
    expect(GAME_VIEW_MODE_TO_PATH.serpent).toBe('/games/neon-serpent');
    expect(resolveRouteFromLocation('/games/neon-serpent', '').viewMode).toBe('serpent');
  });

  it('prevents instant 180-degree neck reversals and supports queued corner turns', () => {
    const state = createInitialSerpentState({ rng: () => 0.2 });
    expect(state.dir).toBe('right');

    // Immediate opposite reversal must be rejected
    expect(enqueueSerpentDirection(state, 'left')).toBe(false);

    // Quick corner double-tap ('up' then 'left') within one tick succeeds cleanly
    expect(enqueueSerpentDirection(state, 'up')).toBe(true);
    expect(enqueueSerpentDirection(state, 'left')).toBe(true);

    const tick = getSerpentTickInterval(state);
    runFrames(state, tick + 0.005, () => 0.2);
    expect(state.dir).toBe('up');
    runFrames(state, tick + 0.005, () => 0.2);
    expect(state.dir).toBe('left');
  });

  it('applies distinct effects when eating 🔥 speed, 🗿 slow-mo, and 💀 shrink emojis', () => {
    const state = createInitialSerpentState({ rng: () => 0.1 });
    state.foods = [{ x: state.snake[0].x + 1, y: state.snake[0].y, type: 'speed', emoji: '🔥' }];

    const baseInterval = getSerpentTickInterval(state);
    runFrames(state, baseInterval + 0.005, () => 0.1);

    expect(state.effects.speedTimer).toBeGreaterThan(6);
    expect(getSerpentTickInterval(state)).toBeLessThan(baseInterval);
    expect(state.score).toBe(150);

    // Place 😂 next while speed boost is active -> earns 2x score (200 instead of 100)
    state.foods = [{ x: state.snake[0].x + 1, y: state.snake[0].y, type: 'classic', emoji: '😂' }];
    const fastInterval = getSerpentTickInterval(state);
    runFrames(state, fastInterval + 0.005, () => 0.1);
    expect(state.score).toBe(350);

    // Eating 🗿 slow-mo switches to slower movement and clears speedTimer
    state.foods = [{ x: state.snake[0].x + 1, y: state.snake[0].y, type: 'slowmo', emoji: '🗿' }];
    runFrames(state, fastInterval + 0.005, () => 0.1);
    expect(state.effects.speedTimer).toBe(0);
    expect(state.effects.slowmoTimer).toBeGreaterThan(7);
    const slowInterval = getSerpentTickInterval(state);
    expect(slowInterval).toBeGreaterThan(baseInterval);

    // Extend snake to 7 segments then eat 💀 shrink -> trims 3 segments (7 -> 4)
    while (state.snake.length < 7) {
      const tail = state.snake[state.snake.length - 1];
      state.snake.push({ x: Math.max(0, tail.x - 1), y: tail.y });
    }
    state.foods = [{ x: state.snake[0].x + 1, y: state.snake[0].y, type: 'shrink', emoji: '💀' }];
    runFrames(state, slowInterval + 0.005, () => 0.1);
    expect(state.snake.length).toBe(4);
    expect(state.snake.length).toBeGreaterThanOrEqual(SERPENT_MIN_LENGTH);
    expect(state.score).toBe(770); // 350 + 240 (moai @ 2x active speed bonus) + 180 (skull)
  });

  it('transitions to gameover on wall crash', () => {
    const state = createInitialSerpentState({ rng: () => 0.2 });
    state.snake[0] = { x: SERPENT_GRID_COLS - 1, y: 10 };
    state.dir = 'right';
    runFrames(state, 0.25);
    expect(state.status).toBe('gameover');
  });
});
