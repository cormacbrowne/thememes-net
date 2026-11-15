import { describe, expect, it } from 'vitest';
import {
  BLASTER_LEVELS,
  PADDLE_BASE_WIDTH,
  PADDLE_WIDE_WIDTH,
  applyBrickPowerup,
  createInitialBrickBlasterState,
  stepBrickBlasterState
} from '../../src/utils/brickBlasterEngine.js';
import { isLeaderboardGame } from '../../src/utils/arcadeLeaderboards.js';
import { GAME_VIEW_MODE_TO_PATH, resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

describe('Task 33.21 — Brick Blaster word/face levels & power-ups', () => {
  it('registers /games/brick-blaster, leaderboard, and word + pixel-face formations', () => {
    const state = createInitialBrickBlasterState();
    expect(state.status).toBe('playing');
    expect(state.levelName).toBe('LOL WORD');
    expect(state.levelKind).toBe('word');
    expect(BLASTER_LEVELS.some((lvl) => lvl.kind === 'face')).toBe(true);
    expect(isLeaderboardGame('blaster')).toBe(true);
    expect(GAME_VIEW_MODE_TO_PATH.blaster).toBe('/games/brick-blaster');
    expect(resolveRouteFromLocation('/games/brick-blaster', '').viewMode).toBe('blaster');
  });

  it('activates multi-ball, twin laser, and wide-paddle power-ups', () => {
    const state = createInitialBrickBlasterState();
    expect(state.balls).toHaveLength(1);
    expect(state.paddle.w).toBe(PADDLE_BASE_WIDTH);

    applyBrickPowerup(state, 'multiball');
    expect(state.balls.length).toBeGreaterThanOrEqual(3);

    applyBrickPowerup(state, 'wide');
    expect(state.paddle.w).toBe(PADDLE_WIDE_WIDTH);
    expect(state.effects.wideTimer).toBe(12);

    applyBrickPowerup(state, 'laser');
    expect(state.effects.laserTimer).toBe(10);
    stepBrickBlasterState(state, { fire: true }, 0.016);
    expect(state.lasers.length).toBe(2);
  });

  it('advances from word level 1 to pixel-face level 2 when final brick breaks and handles gameover', () => {
    const state = createInitialBrickBlasterState({ rng: () => 0.99 });
    state.bricks = [state.bricks[0]];
    const target = state.bricks[0];
    target.hp = 1;
    state.balls = [
      {
        x: target.x + target.w / 2,
        y: target.y + target.h + 4,
        vx: 0,
        vy: -380,
        radius: 8,
        attached: false
      }
    ];

    stepBrickBlasterState(state, { targetX: 240 }, 0.04);
    expect(state.level).toBe(2);
    expect(state.levelKind).toBe('face');
    expect(state.levelName).toContain('SMILEY');

    // Draining all lives transitions to gameover
    state.lives = 1;
    state.balls = [{ x: 240, y: 630, vx: 0, vy: 300, radius: 8, attached: false }];
    stepBrickBlasterState(state, {}, 0.016);
    expect(state.status).toBe('gameover');
  });
});
