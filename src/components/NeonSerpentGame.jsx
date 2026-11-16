import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { sfx } from '../utils/soundEngine';
import {
  SERPENT_CANVAS_SIZE,
  SERPENT_CELL_PX,
  SERPENT_GRID_COLS,
  SERPENT_GRID_ROWS,
  SERPENT_BEST_SCORE_KEY,
  SERPENT_REACTIONS,
  createInitialSerpentState,
  enqueueSerpentDirection,
  stepSerpentState
} from '../utils/neonSerpentEngine';
import './NeonSerpentGame.css';

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(SERPENT_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(SERPENT_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore quota errors
  }
}

function drawRoundedCell(ctx, x, y, size, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, size, size, radius);
  } else {
    ctx.rect(x, y, size, size);
  }
  ctx.fill();
}

function drawSerpentFrame(ctx, state) {
  if (!ctx || !state) return;

  // Cyber-grid synthwave floor
  const bg = ctx.createLinearGradient(0, 0, SERPENT_CANVAS_SIZE, SERPENT_CANVAS_SIZE);
  bg.addColorStop(0, '#050a14');
  bg.addColorStop(0.55, '#081322');
  bg.addColorStop(1, '#091821');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SERPENT_CANVAS_SIZE, SERPENT_CANVAS_SIZE);

  // Faint CRT matrix grid lines
  ctx.strokeStyle =
    state.effects.speedTimer > 0
      ? 'rgba(251, 146, 60, 0.12)'
      : state.effects.slowmoTimer > 0
        ? 'rgba(56, 189, 248, 0.13)'
        : 'rgba(74, 222, 128, 0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < SERPENT_GRID_COLS; c += 1) {
    const gx = c * SERPENT_CELL_PX + 0.5;
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, SERPENT_CANVAS_SIZE);
  }
  for (let r = 1; r < SERPENT_GRID_ROWS; r += 1) {
    const gy = r * SERPENT_CELL_PX + 0.5;
    ctx.moveTo(0, gy);
    ctx.lineTo(SERPENT_CANVAS_SIZE, gy);
  }
  ctx.stroke();

  const clock = state.animClock || 0;

  // Reaction emoji pickups with pulsing halo rings
  for (let i = 0; i < state.foods.length; i += 1) {
    const food = state.foods[i];
    const def = SERPENT_REACTIONS[food.type] || SERPENT_REACTIONS.classic;
    const cx = (food.x + 0.5) * SERPENT_CELL_PX;
    const cy = (food.y + 0.5) * SERPENT_CELL_PX;
    const pulse = 1 + Math.sin(clock * 6 + i * 1.4) * 0.14;

    ctx.save();
    ctx.strokeStyle = def.color;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, (SERPENT_CELL_PX * 0.44) * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.restore();

    ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, cx, cy + 1);
  }

  // Smoothly interpolated snake segments for crisp 60fps phone motion
  const alpha = state.stepProgress ?? 1;
  const snakeLen = state.snake.length;
  for (let i = snakeLen - 1; i >= 0; i -= 1) {
    const curr = state.snake[i];
    const prev = state.prevSnake?.[i] || state.prevSnake?.[state.prevSnake.length - 1] || curr;
    const ix = prev.x + (curr.x - prev.x) * alpha;
    const iy = prev.y + (curr.y - prev.y) * alpha;

    const px = ix * SERPENT_CELL_PX + 2;
    const py = iy * SERPENT_CELL_PX + 2;
    const cellDraw = SERPENT_CELL_PX - 4;
    const ratio = i / Math.max(1, snakeLen - 1);

    if (i === 0) {
      ctx.fillStyle =
        state.effects.speedTimer > 0
          ? '#fb923c'
          : state.effects.slowmoTimer > 0
            ? '#38bdf8'
            : '#4ade80';
      drawRoundedCell(ctx, px - 1, py - 1, cellDraw + 2, 7);

      // Head eyes oriented with travel direction
      const eyeOffset = 5;
      const hx = ix * SERPENT_CELL_PX + SERPENT_CELL_PX * 0.5;
      const hy = iy * SERPENT_CELL_PX + SERPENT_CELL_PX * 0.5;
      ctx.fillStyle = '#050a14';
      if (state.dir === 'right' || state.dir === 'left') {
        const ex = hx + (state.dir === 'right' ? 4 : -4);
        ctx.beginPath();
        ctx.arc(ex, hy - eyeOffset, 2.2, 0, Math.PI * 2);
        ctx.arc(ex, hy + eyeOffset, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const ey = hy + (state.dir === 'down' ? 4 : -4);
        ctx.beginPath();
        ctx.arc(hx - eyeOffset, ey, 2.2, 0, Math.PI * 2);
        ctx.arc(hx + eyeOffset, ey, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      if (state.effects.speedTimer > 0) {
        ctx.fillStyle = ratio < 0.5 ? '#f97316' : '#facc15';
      } else if (state.effects.slowmoTimer > 0) {
        ctx.fillStyle = ratio < 0.5 ? '#0ea5e9' : '#6366f1';
      } else {
        ctx.fillStyle = i % 2 === 0 ? '#22c55e' : '#14b8a6';
      }
      ctx.globalAlpha = Math.max(0.48, 1 - ratio * 0.38);
      drawRoundedCell(ctx, px, py, cellDraw, 5);
      ctx.globalAlpha = 1;
    }
  }

  // Particle sparks
  for (let i = 0; i < state.particles.length; i += 1) {
    const p = state.particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }

  // Floating score/effect popups
  for (let i = 0; i < state.popups.length; i += 1) {
    const pop = state.popups[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, pop.life / pop.maxLife);
    ctx.font = 'bold 13px "Oxanium", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, Math.min(SERPENT_CANVAS_SIZE - 46, Math.max(46, pop.x)), Math.max(18, pop.y));
    ctx.restore();
  }
}

export default function NeonSerpentGame({
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const swipeOriginRef = useRef(null);
  const recordedGameOverRef = useRef(false);

  const [hud, setHud] = useState(() => ({
    score: 0,
    length: 4,
    eatenCount: 0,
    status: 'playing',
    bestScore: readStoredBest(),
    activeEffect: 'classic',
    effectTimer: 0,
    lastEffectText: '😂 Ready to slither'
  }));

  const syncHudFromState = useCallback((st) => {
    setHud((prev) => {
      const nextBest = Math.max(prev.bestScore, st.score);
      if (nextBest > prev.bestScore) writeStoredBest(nextBest);

      let activeEffect = 'normal';
      let effectTimer = 0;
      if (st.effects.speedTimer > 0) {
        activeEffect = 'speed';
        effectTimer = Math.ceil(st.effects.speedTimer * 10) / 10;
      } else if (st.effects.slowmoTimer > 0) {
        activeEffect = 'slowmo';
        effectTimer = Math.ceil(st.effects.slowmoTimer * 10) / 10;
      } else if (st.effects.shrinkFlashTimer > 0) {
        activeEffect = 'shrink';
        effectTimer = Math.ceil(st.effects.shrinkFlashTimer * 10) / 10;
      }

      const len = st.snake.length;
      if (
        prev.score === st.score &&
        prev.length === len &&
        prev.eatenCount === st.eatenCount &&
        prev.status === st.status &&
        prev.bestScore === nextBest &&
        prev.activeEffect === activeEffect &&
        prev.effectTimer === effectTimer &&
        prev.lastEffectText === st.lastEffectText
      ) {
        return prev;
      }

      return {
        score: st.score,
        length: len,
        eatenCount: st.eatenCount,
        status: st.status,
        bestScore: nextBest,
        activeEffect,
        effectTimer,
        lastEffectText: st.lastEffectText || '😂 Ready to slither'
      };
    });
  }, []);

  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = createInitialSerpentState();
      syncHudFromState(gameRef.current);
    }
  }, [syncHudFromState]);

  const steerDirection = useCallback(
    (dir) => {
      const st = gameRef.current;
      if (!st || st.status === 'gameover') return;
      if (st.status === 'paused') {
        st.status = 'playing';
      }
      if (enqueueSerpentDirection(st, dir)) {
        sfx.playToggle?.();
      }
      syncHudFromState(st);
    },
    [syncHudFromState]
  );

  const handleRestartRun = useCallback(() => {
    sfx.playToggle?.();
    recordedGameOverRef.current = false;
    const fresh = createInitialSerpentState();
    gameRef.current = fresh;
    syncHudFromState(fresh);
  }, [syncHudFromState]);

  const handleTogglePause = useCallback(() => {
    const st = gameRef.current;
    if (!st || st.status === 'gameover') return;
    st.status = st.status === 'paused' ? 'playing' : 'paused';
    sfx.playToggle?.();
    syncHudFromState(st);
  }, [syncHudFromState]);

  // Auto-pause on tab hide / window blur per P2 cabinet spec
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

  // Keyboard controls (Arrows / WASD / Space / P / R)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        steerDirection('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        steerDirection('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        steerDirection('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        steerDirection('right');
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        handleTogglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRestartRun();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRestartRun, handleTogglePause, steerDirection]);

  // 60fps requestAnimationFrame simulation & Gamepad API polling
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let pauseDebounce = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      pauseDebounce = Math.max(0, pauseDebounce - dt);

      const st = gameRef.current;

      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        try {
          const pads = navigator.getGamepads() || [];
          for (let g = 0; g < pads.length; g += 1) {
            const pad = pads[g];
            if (!pad || !pad.connected) continue;
            const axX = Number(pad.axes?.[0] || 0);
            const axY = Number(pad.axes?.[1] || 0);
            if (pad.buttons?.[12]?.pressed || axY < -0.45) steerDirection('up');
            else if (pad.buttons?.[13]?.pressed || axY > 0.45) steerDirection('down');
            else if (pad.buttons?.[14]?.pressed || axX < -0.45) steerDirection('left');
            else if (pad.buttons?.[15]?.pressed || axX > 0.45) steerDirection('right');

            if (pad.buttons?.[9]?.pressed && pauseDebounce <= 0 && st && st.status !== 'gameover') {
              st.status = st.status === 'paused' ? 'playing' : 'paused';
              pauseDebounce = 0.35;
              syncHudFromState(st);
            }
            break;
          }
        } catch {
          // ignore sandboxed gamepad access errors
        }
      }

      if (st && st.status === 'playing') {
        stepSerpentState(st, dt);
        for (let e = 0; e < st.sfxEvents.length; e += 1) {
          const ev = st.sfxEvents[e];
          if (ev === 'eat') sfx.playPop?.(2);
          else if (ev === 'shrink') sfx.playPop?.(1);
          else if (ev === 'crown') sfx.playJackpot?.();
          else if (ev === 'gameOver') sfx.playStockBell?.(false);
        }

        if (st.status === 'gameover' && !recordedGameOverRef.current) {
          recordedGameOverRef.current = true;
          if (st.score > 0 && onRecordHighScore) {
            onRecordHighScore('serpent', st.score);
          }
        }
        syncHudFromState(st);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext?.('2d');
      drawSerpentFrame(ctx, st);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [onRecordHighScore, steerDirection, syncHudFromState]);

  // Continuous swipe / thumb-slide recognition directly on touch-action: none canvas
  const handleCanvasPointerDown = (e) => {
    const st = gameRef.current;
    if (st?.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
    swipeOriginRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerMove = (e) => {
    const origin = swipeOriginRef.current;
    if (!origin) return;
    if (e.buttons === 0 && e.pointerType === 'mouse') return;

    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const threshold = 18;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      steerDirection(dx > 0 ? 'right' : 'left');
    } else {
      steerDirection(dy > 0 ? 'down' : 'up');
    }
    // Reset origin so continuous swipes can chain corners smoothly without lifting finger
    swipeOriginRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerUp = () => {
    swipeOriginRef.current = null;
  };

  return (
    <GameShell
      title="Neon Serpent"
      eyebrow="SYNTHWAVE REACTION SNAKE • FREE TO PLAY"
      titleBadge={
        <span className="tm-gs-badge tm-gs-badge-accent">FREE • LEN {hud.length}</span>
      }
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/neon-serpent"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-gs-icon-btn"
            onClick={onOpenLeaderboard}
            data-testid="serpent-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Swipe anywhere across the neon matrix canvas on phones, tap the D-pad below, use Arrow keys / WASD, or connect any USB/Bluetooth gamepad.',
        'Eat 😂 reaction bites (+100) and 👑 Viral Bonus (+300) to grow your neon serpent. Grab special reaction emojis to reshape the run:',
        '🔥 FIRE = Speed boost + 2x combo points for 6.5s • 🗿 MOAI = Slow-Mo control for 7.5s • 💀 SKULL = Shrink tail (-3 segments, +180 pts) to escape tight corners.',
        'Free to play (costs zero tokens). Tab switching automatically pauses your run.'
      ]}
    >
      <div className="tm-serpent-stage" data-testid="neon-serpent-stage">
        <div className="tm-serpent-hud">
          <div className="tm-serpent-stat">
            <span className="tm-serpent-stat-label">Score</span>
            <span className="tm-serpent-stat-val green" data-testid="serpent-score">
              {hud.score.toLocaleString()}
            </span>
          </div>
          <div className="tm-serpent-stat">
            <span className="tm-serpent-stat-label">Length</span>
            <span className="tm-serpent-stat-val gold" data-testid="serpent-length">
              {hud.length}
            </span>
          </div>
          <div className="tm-serpent-stat">
            <span className="tm-serpent-stat-label">Best</span>
            <span className="tm-serpent-stat-val">{hud.bestScore.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="tm-btn"
              onClick={handleTogglePause}
              disabled={hud.status === 'gameover'}
              data-testid="serpent-pause-btn"
            >
              {hud.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={handleRestartRun}
              data-testid="serpent-restart-btn"
            >
              ↻ New
            </button>
          </div>
        </div>

        <div className="tm-serpent-status-strip" data-testid="serpent-status-strip">
          <div className="tm-serpent-legend">
            <span className="tm-serpent-pill speed">🔥 Speed 2x</span>
            <span className="tm-serpent-pill slowmo">🗿 Slow-Mo</span>
            <span className="tm-serpent-pill shrink">💀 Shrink</span>
          </div>
          <strong data-testid="serpent-active-effect">
            {hud.effectTimer > 0
              ? `${hud.activeEffect === 'speed' ? '🔥' : hud.activeEffect === 'slowmo' ? '🗿' : '💀'} ${hud.effectTimer.toFixed(1)}s`
              : hud.lastEffectText}
          </strong>
        </div>

        <div className="tm-serpent-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={SERPENT_CANVAS_SIZE}
            height={SERPENT_CANVAS_SIZE}
            className="tm-serpent-canvas"
            data-testid="serpent-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          />

          {hud.status === 'paused' && (
            <div className="tm-serpent-overlay" data-testid="serpent-paused-overlay">
              <h3>⏸ PAUSED</h3>
              <p>Swipe or tap Resume to get back onto the grid.</p>
              <div className="tm-serpent-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={handleTogglePause}>
                  ▶ Resume Run
                </button>
                <button type="button" className="tm-btn" onClick={handleRestartRun}>
                  ↻ Restart
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-serpent-overlay" data-testid="serpent-gameover-overlay">
              <h3>🐍 GRID CRASH</h3>
              <p>
                Final length <strong>{hud.length}</strong> with{' '}
                <strong style={{ color: '#4ade80' }}>{hud.score.toLocaleString()} pts</strong>!
              </p>
              <div className="tm-serpent-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleRestartRun}
                  data-testid="serpent-play-again-btn"
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

        <div className="tm-serpent-dpad" aria-label="Swipe or Tap D-Pad Controls">
          <button
            type="button"
            className="tm-serpent-pad-btn up"
            aria-label="Turn Up"
            data-testid="serpent-btn-up"
            onPointerDown={(e) => {
              e.preventDefault();
              steerDirection('up');
            }}
          >
            ▲ UP
          </button>
          <button
            type="button"
            className="tm-serpent-pad-btn left"
            aria-label="Turn Left"
            data-testid="serpent-btn-left"
            onPointerDown={(e) => {
              e.preventDefault();
              steerDirection('left');
            }}
          >
            ◀ LEFT
          </button>
          <button
            type="button"
            className="tm-serpent-pad-btn down"
            aria-label="Turn Down"
            data-testid="serpent-btn-down"
            onPointerDown={(e) => {
              e.preventDefault();
              steerDirection('down');
            }}
          >
            ▼ DOWN
          </button>
          <button
            type="button"
            className="tm-serpent-pad-btn right"
            aria-label="Turn Right"
            data-testid="serpent-btn-right"
            onPointerDown={(e) => {
              e.preventDefault();
              steerDirection('right');
            }}
          >
            RIGHT ▶
          </button>
        </div>
      </div>
    </GameShell>
  );
}
