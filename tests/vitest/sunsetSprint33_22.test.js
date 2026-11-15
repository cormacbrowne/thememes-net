import { describe, expect, it } from 'vitest';
import {
  CHECKPOINT_DISTANCE_M,
  CHECKPOINT_TIME_BONUS,
  createInitialSunsetSprintState,
  pickNextRadioStation,
  resolveCarSpec,
  stepSunsetSprintState
} from '../../src/utils/sunsetSprintEngine.js';
import { EIGHTIES_CARS } from '../../src/data/deloreanEras.js';
import { isLeaderboardGame } from '../../src/utils/arcadeLeaderboards.js';
import { GAME_VIEW_MODE_TO_PATH, resolveRouteFromLocation } from '../../src/data/seoRoutes.js';

describe('Task 33.22 — Sunset Sprint synthwave racer & FM cassettes', () => {
  it('registers /games/sunset-sprint, leaderboard, and reuses all 80s garage cars', () => {
    for (const car of EIGHTIES_CARS) {
      expect(resolveCarSpec(car.id).id).toBe(car.id);
    }
    const state = createInitialSunsetSprintState({ carId: 'cosworth' });
    expect(state.status).toBe('playing');
    expect(state.carId).toBe('cosworth');
    expect(isLeaderboardGame('sunset')).toBe(true);
    expect(GAME_VIEW_MODE_TO_PATH.sunset).toBe('/games/sunset-sprint');
    expect(resolveRouteFromLocation('/games/sunset-sprint', '').viewMode).toBe('sunset');
  });

  it('collects cassettes for turbo boost & FM switch, slows on traffic crash, and extends timer at checkpoints', () => {
    const state = createInitialSunsetSprintState({ rng: () => 0.5 });
    // Position cassette directly in front of player
    state.cassettes = [{ id: 'c-test', laneX: 0, z: 0.12 }];
    state.traffic = [];
    state.playerX = 0;

    stepSunsetSprintState(state, {}, 0.02);
    expect(state.cassettesCollected).toBe(1);
    expect(state.turboTimer).toBeGreaterThan(2);
    expect(state.sfxEvents).toContain('cassette');

    const stations = [
      { id: 'synthwave', name: 'Synthwave Drive' },
      { id: 'chiptune', name: '8-Bit Chiptune' }
    ];
    expect(pickNextRadioStation(stations, 'synthwave')?.id).toBe('chiptune');
    expect(pickNextRadioStation(stations, 'chiptune')?.id).toBe('synthwave');

    // Traffic crash drops speed cleanly
    state.invulnTimer = 0;
    state.traffic = [{ id: 't-test', laneX: state.playerX, z: 0.11, speedFactor: 0.3, style: { body: '#fff' } }];
    const preCrashMph = state.speedMph;
    stepSunsetSprintState(state, {}, 0.016);
    expect(state.sfxEvents).toContain('crash');
    expect(state.speedMph).toBeLessThan(preCrashMph);

    // Checkpoint crossing awards +18s timer bonus and advances stage
    state.distance = CHECKPOINT_DISTANCE_M - 1;
    state.timerSeconds = 10;
    state.speedMph = 120;
    state.traffic = [];
    stepSunsetSprintState(state, {}, 0.04);
    expect(state.stage).toBe(2);
    expect(state.timerSeconds).toBeGreaterThanOrEqual(10 + CHECKPOINT_TIME_BONUS - 1);
    expect(state.sfxEvents).toContain('checkpoint');
  });

  it('ends the run cleanly when countdown timer expires', () => {
    const state = createInitialSunsetSprintState();
    state.timerSeconds = 0.01;
    stepSunsetSprintState(state, {}, 0.04);
    expect(state.status).toBe('gameover');
    expect(state.sfxEvents).toContain('gameOver');
  });
});
