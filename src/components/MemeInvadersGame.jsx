import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameShell from './GameShell';
import { sfx } from '../utils/soundEngine';
import {
  INVADERS_WIDTH,
  INVADERS_HEIGHT,
  INVADER_BEST_SCORE_KEY,
  SHIELD_ROWS,
  SHIELD_COLS,
  SHIELD_CELL_W,
  SHIELD_CELL_H,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  createInitialInvadersState,
  selectDailyTopApprovedMeme,
  stepInvadersState
} from '../utils/memeInvadersEngine';
import './MemeInvadersGame.css';

const STAR_FIELD = Array.from({ length: 42 }, (_, idx) => ({
  x: ((idx * 109) % INVADERS_WIDTH) + 4,
  y: ((idx * 173) % (INVADERS_HEIGHT - 80)) + 16,
  size: (idx % 3) + 1,
  speed: 14 + (idx % 4) * 10
}));

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(INVADER_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(INVADER_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage quota errors
  }
}

function drawInvadersFrame(ctx, state, bossImg) {
  if (!ctx || !state) return;

  // Background & subtle scrolling starfield
  const bg = ctx.createLinearGradient(0, 0, 0, INVADERS_HEIGHT);
  bg.addColorStop(0, '#070913');
  bg.addColorStop(0.65, '#0b1024');
  bg.addColorStop(1, '#120826');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, INVADERS_WIDTH, INVADERS_HEIGHT);

  const t = state.animClock || 0;
  for (let i = 0; i < STAR_FIELD.length; i += 1) {
    const star = STAR_FIELD[i];
    const sy = (star.y + t * star.speed) % (INVADERS_HEIGHT - 40);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(0, 243, 255, 0.5)' : 'rgba(226, 232, 240, 0.35)';
    ctx.fillRect(star.x, sy, star.size, star.size);
  }

  // Horizon grid line
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, INVADERS_HEIGHT - 22);
  ctx.lineTo(INVADERS_WIDTH, INVADERS_HEIGHT - 22);
  ctx.stroke();

  // Crumbling shields
  for (let s = 0; s < state.shields.length; s += 1) {
    const sh = state.shields[s];
    for (let r = 0; r < SHIELD_ROWS; r += 1) {
      for (let c = 0; c < SHIELD_COLS; c += 1) {
        if (!sh.cells[r][c]) continue;
        ctx.fillStyle = r < 2 ? '#4ade80' : '#22d3ee';
        ctx.fillRect(
          sh.x + c * SHIELD_CELL_W,
          sh.y + r * SHIELD_CELL_H,
          SHIELD_CELL_W - 1,
          SHIELD_CELL_H - 1
        );
      }
    }
  }

  // Mystery Bonus Saucer
  if (state.saucer) {
    const sx = state.saucer.x;
    const sy = state.saucer.y;
    ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
    ctx.beginPath();
    ctx.ellipse(sx + 23, sy + 12, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛸', sx + 23, sy + 12);
  }

  // Every 5th wave Boss built from day's top approved meme thumbnail
  if (state.boss && state.boss.hp > 0) {
    const boss = state.boss;
    ctx.save();
    ctx.fillStyle = boss.hitFlash > 0 ? '#fef08a' : '#1e1b4b';
    ctx.strokeStyle = boss.hitFlash > 0 ? '#ffffff' : '#facc15';
    ctx.lineWidth = 3;
    ctx.fillRect(boss.x - 4, boss.y - 4, boss.width + 8, boss.height + 8);
    ctx.strokeRect(boss.x - 4, boss.y - 4, boss.width + 8, boss.height + 8);

    if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
      ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
    } else {
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
      ctx.font = '38px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', boss.x + boss.width / 2, boss.y + boss.height / 2);
    }

    // Boss HP bar
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(boss.x, boss.y - 16, boss.width, 8);
    ctx.fillStyle = hpRatio > 0.35 ? '#facc15' : '#ef4444';
    ctx.fillRect(boss.x, boss.y - 16, boss.width * hpRatio, 8);
    ctx.restore();
  }

  // Descending Emoji / Meme Sprites
  ctx.font = '24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const bob = Math.sin(t * 5.2) * 2;
  for (let i = 0; i < state.invaders.length; i += 1) {
    const inv = state.invaders[i];
    if (!inv.alive) continue;
    ctx.fillStyle = inv.color;
    ctx.fillText(inv.glyph, inv.x + inv.width / 2, inv.y + inv.height / 2 + bob);
  }

  // Player Laser Cannon (blinks during brief post-hit invulnerability)
  const p = state.player;
  if (p.invulnTimer <= 0 || Math.floor(t * 14) % 2 === 0) {
    ctx.save();
    ctx.fillStyle = p.rapidTimer > 0 ? '#facc15' : '#00f3ff';
    ctx.fillRect(p.x, p.y + 8, PLAYER_WIDTH, PLAYER_HEIGHT - 8);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(p.x + PLAYER_WIDTH / 2 - 4, p.y, 8, 10);
    ctx.restore();
  }

  // Player & Enemy Lasers
  ctx.fillStyle = p.rapidTimer > 0 ? '#facc15' : '#38bdf8';
  for (let i = 0; i < state.playerBullets.length; i += 1) {
    const b = state.playerBullets[i];
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
  for (let i = 0; i < state.enemyBullets.length; i += 1) {
    const eb = state.enemyBullets[i];
    ctx.fillStyle = eb.color || '#fb7185';
    ctx.fillRect(eb.x, eb.y, eb.width, eb.height);
  }

  // Explosion particles
  for (let i = 0; i < state.particles.length; i += 1) {
    const pt = state.particles[i];
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color || '#facc15';
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Wave/Saucer Banner
  if (state.bannerTimer > 0 && state.bannerText) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 9, 19, 0.78)';
    ctx.fillRect(24, 10, INVADERS_WIDTH - 48, 26);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.55)';
    ctx.strokeRect(24, 10, INVADERS_WIDTH - 48, 26);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px "Oxanium", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.bannerText.slice(0, 48), INVADERS_WIDTH / 2, 23);
    ctx.restore();
  }
}

export default function MemeInvadersGame({
  memes = [],
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const topBossMeme = useMemo(() => selectDailyTopApprovedMeme(memes), [memes]);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const bossImageRef = useRef(null);
  const recordedGameOverRef = useRef(false);

  const inputRef = useRef({
    left: false,
    right: false,
    fire: false,
    moveAxis: 0,
    targetX: null
  });

  const [hud, setHud] = useState(() => ({
    score: 0,
    wave: 1,
    lives: 3,
    status: 'playing',
    bestScore: readStoredBest(),
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0
  }));

  // Keep today's approved Top Meme image preloaded for Wave-5 Boss battles (read-only draw)
  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = createInitialInvadersState({ topBossMeme });
    } else {
      gameRef.current.topBossMeme = topBossMeme;
    }
    if (!topBossMeme?.imageUrl || typeof Image === 'undefined') {
      bossImageRef.current = null;
      return undefined;
    }
    const img = new Image();
    img.src = topBossMeme.imageUrl;
    bossImageRef.current = img;
    return () => {
      bossImageRef.current = null;
    };
  }, [topBossMeme]);

  const syncHudFromState = useCallback((st) => {
    setHud((prev) => {
      const nextBest = Math.max(prev.bestScore, st.score);
      if (nextBest > prev.bestScore) writeStoredBest(nextBest);
      const bossActive = Boolean(st.boss && st.boss.hp > 0);
      const bossHp = bossActive ? st.boss.hp : 0;
      const bossMaxHp = bossActive ? st.boss.maxHp : 0;
      if (
        prev.score === st.score &&
        prev.wave === st.wave &&
        prev.lives === st.lives &&
        prev.status === st.status &&
        prev.bestScore === nextBest &&
        prev.bossActive === bossActive &&
        prev.bossHp === bossHp
      ) {
        return prev;
      }
      return {
        score: st.score,
        wave: st.wave,
        lives: st.lives,
        status: st.status,
        bestScore: nextBest,
        bossActive,
        bossHp,
        bossMaxHp
      };
    });
  }, []);

  const handleRestartRun = useCallback(() => {
    sfx.playToggle?.();
    recordedGameOverRef.current = false;
    inputRef.current.targetX = null;
    const fresh = createInitialInvadersState({ memes });
    gameRef.current = fresh;
    syncHudFromState(fresh);
  }, [memes, syncHudFromState]);

  const handleTogglePause = useCallback(() => {
    const st = gameRef.current;
    if (!st || st.status === 'gameover') return;
    st.status = st.status === 'paused' ? 'playing' : 'paused';
    sfx.playToggle?.();
    syncHudFromState(st);
  }, [syncHudFromState]);

  // Auto-pause on tab hide / window blur per P2 spec
  useEffect(() => {
    const pauseIfPlaying = () => {
      const st = gameRef.current;
      if (st && st.status === 'playing') {
        st.status = 'paused';
        syncHudFromState(st);
      }
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pauseIfPlaying);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pauseIfPlaying);
    };
  }, [syncHudFromState]);

  // Keyboard controls (Arrows / A-D / Space / P)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', ' '].includes(e.key)) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputRef.current.targetX = null;
        inputRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.targetX = null;
        inputRef.current.right = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (gameRef.current?.status === 'paused') {
          gameRef.current.status = 'playing';
          syncHudFromState(gameRef.current);
        }
        inputRef.current.fire = true;
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        handleTogglePause();
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputRef.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.right = false;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputRef.current.fire = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleTogglePause, syncHudFromState]);

  // Main 60fps requestAnimationFrame loop + Gamepad API polling
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let pauseDebounce = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      pauseDebounce = Math.max(0, pauseDebounce - dt);

      const st = gameRef.current;
      const inp = { ...inputRef.current };

      // Gamepad API polling (left stick + d-pad + A/X fire + Start pause)
      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        try {
          const pads = navigator.getGamepads() || [];
          for (let g = 0; g < pads.length; g += 1) {
            const pad = pads[g];
            if (!pad || !pad.connected) continue;
            const axis = Number(pad.axes?.[0] || 0);
            const dLeft = Boolean(pad.buttons?.[14]?.pressed);
            const dRight = Boolean(pad.buttons?.[15]?.pressed);
            const gpFire = Boolean(pad.buttons?.[0]?.pressed || pad.buttons?.[2]?.pressed);
            const gpPause = Boolean(pad.buttons?.[9]?.pressed);
            if (Math.abs(axis) > 0.2) inp.moveAxis = axis;
            if (dLeft) inp.left = true;
            if (dRight) inp.right = true;
            if (gpFire) inp.fire = true;
            if (gpPause && pauseDebounce <= 0 && st && st.status !== 'gameover') {
              st.status = st.status === 'paused' ? 'playing' : 'paused';
              pauseDebounce = 0.35;
            }
            break;
          }
        } catch {
          // ignore sandboxed gamepad access errors
        }
      }

      if (st && st.status === 'playing') {
        stepInvadersState(st, inp, dt);
        for (let e = 0; e < st.sfxEvents.length; e += 1) {
          const ev = st.sfxEvents[e];
          if (ev === 'shoot') sfx.playPop?.(1);
          else if (ev === 'hit') sfx.playPop?.(2);
          else if (ev === 'saucer' || ev === 'bossDefeated' || ev === 'waveClear') {
            sfx.playJackpot?.();
          } else if (ev === 'playerHit' || ev === 'gameOver') {
            sfx.playStockBell?.(false);
          }
        }

        if (st.status === 'gameover' && !recordedGameOverRef.current) {
          recordedGameOverRef.current = true;
          if (st.score > 0 && onRecordHighScore) {
            onRecordHighScore('invaders', st.score);
          }
        }
        syncHudFromState(st);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext?.('2d');
      drawInvadersFrame(ctx, st, bossImageRef.current);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [onRecordHighScore, syncHudFromState]);

  const mapPointerToCanvasX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    return ((clientX - rect.left) / rect.width) * INVADERS_WIDTH;
  };

  const handleCanvasPointerDown = (e) => {
    const st = gameRef.current;
    if (st?.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
    const x = mapPointerToCanvasX(e.clientX);
    if (x !== null) inputRef.current.targetX = x;
    inputRef.current.fire = true;
  };

  const handleCanvasPointerMove = (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const x = mapPointerToCanvasX(e.clientX);
    if (x !== null) inputRef.current.targetX = x;
  };

  const handleCanvasPointerUp = () => {
    inputRef.current.fire = false;
  };

  return (
    <GameShell
      title="Meme Invaders '86"
      eyebrow="WAVE BLASTER CABINET • FREE TO PLAY"
      titleBadge={
        <span className="tm-gs-badge tm-gs-badge-accent">FREE • WAVE {hud.wave}</span>
      }
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/meme-invaders"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-gs-icon-btn"
            onClick={onOpenLeaderboard}
            data-testid="invaders-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Move with Arrow keys / A-D, drag directly across the neon CRT screen on phones, use the thumb pads below, or plug in any USB/Bluetooth gamepad.',
        'Shoot descending emoji/meme invaders before they breach your 4 crumbling pixel shields. Hit the mystery saucer (🛸) for bonus points and temporary Rapid Laser.',
        'Every 5th wave (Wave 5, 10, 15...) spawns a Giant Meme Boss built from today’s top approved meme thumbnail!',
        'Free to play (costs zero tokens). Tab switching automatically pauses your run.'
      ]}
    >
      <div className="tm-invaders-stage" data-testid="meme-invaders-stage">
        <div className="tm-invaders-hud">
          <div className="tm-invaders-stat">
            <span className="tm-invaders-stat-label">Score</span>
            <span className="tm-invaders-stat-val cyan" data-testid="invaders-score">
              {hud.score.toLocaleString()}
            </span>
          </div>
          <div className="tm-invaders-stat">
            <span className="tm-invaders-stat-label">Wave</span>
            <span className="tm-invaders-stat-val gold" data-testid="invaders-wave">
              {hud.wave}
            </span>
          </div>
          <div className="tm-invaders-stat">
            <span className="tm-invaders-stat-label">Lives</span>
            <span className="tm-invaders-stat-val" data-testid="invaders-lives">
              {'❤️'.repeat(Math.max(0, hud.lives)) || '💀'}
            </span>
          </div>
          <div className="tm-invaders-stat">
            <span className="tm-invaders-stat-label">Best</span>
            <span className="tm-invaders-stat-val">{hud.bestScore.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="tm-btn"
              onClick={handleTogglePause}
              disabled={hud.status === 'gameover'}
              data-testid="invaders-pause-btn"
            >
              {hud.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={handleRestartRun}
              data-testid="invaders-restart-btn"
            >
              ↻ New
            </button>
          </div>
        </div>

        {topBossMeme && (
          <div className="tm-invaders-boss-chip" data-testid="invaders-boss-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <img
                src={topBossMeme.imageUrl}
                alt={topBossMeme.title}
                className="tm-invaders-boss-thumb"
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Wave 5 Boss: <strong>{topBossMeme.title}</strong> (@{topBossMeme.authorName})
              </span>
            </div>
            {hud.bossActive && (
              <strong>
                HP {hud.bossHp}/{hud.bossMaxHp}
              </strong>
            )}
          </div>
        )}

        <div className="tm-invaders-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={INVADERS_WIDTH}
            height={INVADERS_HEIGHT}
            className="tm-invaders-canvas"
            data-testid="invaders-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
          />

          {hud.status === 'paused' && (
            <div className="tm-invaders-overlay" data-testid="invaders-paused-overlay">
              <h3>⏸ PAUSED</h3>
              <p>Grid defense halted safely while you stepped away.</p>
              <div className="tm-invaders-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={handleTogglePause}>
                  ▶ Resume Wave {hud.wave}
                </button>
                <button type="button" className="tm-btn" onClick={handleRestartRun}>
                  ↻ Restart Wave 1
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-invaders-overlay" data-testid="invaders-gameover-overlay">
              <h3>👾 GAME OVER</h3>
              <p>
                Reached <strong>Wave {hud.wave}</strong> with{' '}
                <strong style={{ color: '#facc15' }}>{hud.score.toLocaleString()} pts</strong>!
              </p>
              <div className="tm-invaders-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleRestartRun}
                  data-testid="invaders-play-again-btn"
                >
                  🕹️ Play Again
                </button>
                {onOpenLeaderboard && (
                  <button type="button" className="tm-btn" onClick={onOpenLeaderboard}>
                    🏆 View Cabinet Board
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="tm-invaders-controls" aria-label="Touch Arcade Controls">
          <button
            type="button"
            className="tm-invaders-pad-btn"
            data-testid="invaders-btn-left"
            onPointerDown={() => {
              inputRef.current.targetX = null;
              inputRef.current.left = true;
            }}
            onPointerUp={() => {
              inputRef.current.left = false;
            }}
            onPointerLeave={() => {
              inputRef.current.left = false;
            }}
            onPointerCancel={() => {
              inputRef.current.left = false;
            }}
          >
            ◀ LEFT
          </button>
          <button
            type="button"
            className="tm-invaders-pad-btn fire"
            data-testid="invaders-btn-fire"
            onPointerDown={() => {
              if (gameRef.current?.status === 'paused') {
                gameRef.current.status = 'playing';
                syncHudFromState(gameRef.current);
              }
              inputRef.current.fire = true;
            }}
            onPointerUp={() => {
              inputRef.current.fire = false;
            }}
            onPointerLeave={() => {
              inputRef.current.fire = false;
            }}
            onPointerCancel={() => {
              inputRef.current.fire = false;
            }}
          >
            🔥 FIRE LASER
          </button>
          <button
            type="button"
            className="tm-invaders-pad-btn"
            data-testid="invaders-btn-right"
            onPointerDown={() => {
              inputRef.current.targetX = null;
              inputRef.current.right = true;
            }}
            onPointerUp={() => {
              inputRef.current.right = false;
            }}
            onPointerLeave={() => {
              inputRef.current.right = false;
            }}
            onPointerCancel={() => {
              inputRef.current.right = false;
            }}
          >
            RIGHT ▶
          </button>
        </div>
      </div>
    </GameShell>
  );
}
