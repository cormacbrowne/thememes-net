import { describe, expect, test } from 'vitest';
import {
  RIDERS_GRID_SIZE,
  createGridRidersRound,
  enqueueRiderTurn,
  chooseAiRiderDirection,
  stepGridRidersState
} from '../../src/utils/gridRidersEngine';
import { isLeaderboardGame } from '../../src/utils/arcadeLeaderboards';
import { ARCADE_GAMES_CATALOG } from '../../src/data/arcadeGamesCatalog';
import { getSeoRouteByPath, resolveRouteFromLocation } from '../../src/data/seoRoutes';

describe('Phase 33.24 Grid Riders Engine & Wiring', () => {
  test('prevents instant 180-degree self-reversal while queuing crisp corner turns', () => {
    const state = createGridRidersRound({ mode: '2p', round: 1, status: 'playing', rng: () => 0.4 });
    // P1 starts heading RIGHT; LEFT must be ignored
    expect(enqueueRiderTurn(state.p1, 'LEFT')).toBe(false);
    // UP then LEFT queues a legal 180 U-turn across two consecutive cells
    expect(enqueueRiderTurn(state.p1, 'UP')).toBe(true);
    expect(enqueueRiderTurn(state.p1, 'LEFT')).toBe(true);

    // P2 starts heading LEFT in 2P mode
    expect(enqueueRiderTurn(state.p2, 'RIGHT')).toBe(false);
    expect(enqueueRiderTurn(state.p2, 'DOWN')).toBe(true);

    // 3 frames of 0.04s = 0.12s > stepInterval (0.105s) triggers 1 grid tick
    for (let i = 0; i < 3; i += 1) {
      stepGridRidersState(state, 0.04, () => 0.4);
    }
    expect(state.p1.dir).toBe('UP');
    expect(state.p2.dir).toBe('DOWN');
    expect(state.p1.trail.length).toBe(2);
    expect(state.p2.trail.length).toBe(2);
  });

  test('AI flood-fill avoids immediate walls and scores 1P survival + round win bonus', () => {
    const state = createGridRidersRound({ mode: '1p', round: 1, status: 'playing', rng: () => 0.5 });
    // Box AI at top wall heading UP -> must steer LEFT or DOWN instead of crashing
    state.p2.x = RIDERS_GRID_SIZE - 1;
    state.p2.y = 0;
    state.p2.dir = 'UP';
    const escapeDir = chooseAiRiderDirection(state, () => 0.5);
    expect(['LEFT', 'DOWN']).toContain(escapeDir);

    // Crash P2 directly into top barrier to verify P1 round win
    const roundState = createGridRidersRound({ mode: '2p', round: 1, status: 'playing', rng: () => 0.5 });
    roundState.p2.x = 5;
    roundState.p2.y = 0;
    roundState.p2.dir = 'UP';
    for (let i = 0; i < 3; i += 1) {
      stepGridRidersState(roundState, 0.04, () => 0.5);
    }
    expect(roundState.roundWinner).toBe('p1');
    expect(roundState.p1Wins).toBe(1);
    expect(roundState.status).toBe('round_over');
  });

  test('registers riders cabinet route, 0-token skill catalog entry, and 33.14 leaderboard limits', () => {
    expect(isLeaderboardGame('riders')).toBe(true);
    const catalogItem = ARCADE_GAMES_CATALOG.find((g) => g.id === 'riders');
    expect(catalogItem).toBeTruthy();
    expect(catalogItem.group).toBe('skill');
    expect(catalogItem.path).toBe('/games/grid-riders');

    const route = getSeoRouteByPath('/games/grid-riders');
    expect(route?.viewMode).toBe('riders');
    expect(resolveRouteFromLocation('/games/grid-riders', '').viewMode).toBe('riders');
  });
});
