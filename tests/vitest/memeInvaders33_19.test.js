import { describe, it, expect } from 'vitest';
import {
  INVADERS_WIDTH,
  isBossWave,
  selectDailyTopApprovedMeme,
  createCrumblingShields,
  createInitialInvadersState,
  createWaveFormation,
  stepInvadersState
} from '../../src/utils/memeInvadersEngine.js';

describe('Phase 33.19 — Meme Invaders \'86 engine', () => {
  it('selects only approved memes via memeFeedBridge for the wave-5 boss', () => {
    const picked = selectDailyTopApprovedMeme([
      {
        id: 'pending-999',
        title: 'Pending NSFW Leak',
        status: 'pending',
        score: 99999,
        image_url: 'https://cdn.example.com/bad.webp'
      },
      {
        id: 'rejected-888',
        title: 'Rejected Upload',
        status: 'rejected',
        score: 50000,
        image_url: 'https://cdn.example.com/rej.webp'
      },
      {
        id: 'approved-1',
        title: 'Approved Top Meme',
        status: 'approved',
        author_name: 'SynthHero',
        score: 420,
        image_url: '/seed/seed-dank-01.webp'
      },
      {
        id: 'approved-2',
        title: 'Second Place Meme',
        status: 'approved',
        score: 90,
        image_url: '/seed/seed-tech-01.webp'
      }
    ]);

    expect(picked).toEqual({
      id: 'approved-1',
      title: 'Approved Top Meme',
      authorName: 'SynthHero',
      imageUrl: '/seed/seed-dank-01.webp',
      score: 420
    });
  });

  it('spawns 40 descending sprites on normal waves and Top Meme Boss every 5th wave', () => {
    expect(isBossWave(1)).toBe(false);
    expect(isBossWave(4)).toBe(false);
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(10)).toBe(true);

    const w1 = createWaveFormation(1, null);
    expect(w1.boss).toBeNull();
    expect(w1.invaders).toHaveLength(40);

    const w5 = createWaveFormation(5, {
      id: 'approved-1',
      title: 'Daily King',
      authorName: 'PixelQueen',
      imageUrl: '/seed/seed-gaming-01.webp',
      score: 888
    });
    expect(w5.boss).toBeTruthy();
    expect(w5.boss.title).toBe('Daily King');
    expect(w5.boss.imageUrl).toBe('/seed/seed-gaming-01.webp');
    expect(w5.boss.hp).toBeGreaterThanOrEqual(22);
  });

  it('crumbles shields on hit, moves cannon within bounds, scores hits, and advances waves', () => {
    const shields = createCrumblingShields();
    expect(shields).toHaveLength(4);
    const initialCells = shields[0].cells.flat().filter(Boolean).length;
    expect(initialCells).toBeGreaterThan(20);

    const st = createInitialInvadersState({ memes: [] });
    const startX = st.player.x;
    stepInvadersState(st, { right: true }, 0.05);
    expect(st.player.x).toBeGreaterThan(startX);
    expect(st.player.x).toBeLessThan(INVADERS_WIDTH);

    // Put a shield block directly above player bullet and confirm it crumbles
    st.playerBullets.push({
      x: st.shields[0].x + 8,
      y: st.shields[0].y + 16,
      width: 4,
      height: 12,
      vy: -200
    });
    stepInvadersState(st, {}, 0.05);
    const afterCells = st.shields[0].cells.flat().filter(Boolean).length;
    expect(afterCells).toBeLessThan(initialCells);
    expect(st.sfxEvents).toContain('shield');

    // Clear remaining wave 4 invaders -> promotes cleanly to Wave 5 Boss
    st.wave = 4;
    st.topBossMeme = {
      id: 'boss-meme',
      title: 'Boss Thumbnail',
      authorName: 'Champ',
      imageUrl: '/seed/seed-relatable-01.webp',
      score: 500
    };
    st.invaders.forEach((inv) => {
      inv.alive = false;
    });
    stepInvadersState(st, {}, 0.016);
    expect(st.wave).toBe(5);
    expect(st.boss).toBeTruthy();
    expect(st.boss.imageUrl).toBe('/seed/seed-relatable-01.webp');
  });
});
