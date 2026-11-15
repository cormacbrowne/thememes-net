import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { sfx } from '../utils/soundEngine';
import {
  BLASTER_WIDTH,
  BLASTER_HEIGHT,
  BLASTER_BEST_SCORE_KEY,
  createInitialBrickBlasterState,
  launchAttachedBalls,
  stepBrickBlasterState
} from '../utils/brickBlasterEngine';
import './BrickBlasterGame.css';

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BLASTER_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(BLASTER_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage errors
  }
}

function drawBlasterFrame(ctx, state) {
  if (!ctx || !state) return;

  // Synthwave CRT backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, BLASTER_HEIGHT);
  bg.addColorStop(0, '#090616');
  bg.addColorStop(0.6, '#140b29');
  bg.addColorStop(1, '#1b0a24');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BLASTER_WIDTH, BLASTER_HEIGHT);

  // Subtle vertical scan-grid lines
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 24; x < BLASTER_WIDTH; x += 48) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BLASTER_HEIGHT);
  }
  ctx.stroke();

  // Top level & pattern header inside CRT
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(10, 10, BLASTER_WIDTH - 20, 34);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.fillText(
    `LEVEL ${state.level}: ${state.levelName} (${state.levelKind === 'word' ? 'WORD ART' : 'PIXEL FACE'})`,
    BLASTER_WIDTH / 2,
    31
  );

  // Bricks
  for (let i = 0; i < state.bricks.length; i += 1) {
    const br = state.bricks[i];
    ctx.fillStyle = br.color;
    ctx.globalAlpha = br.hp < br.maxHp ? 0.68 : 1;
    ctx.fillRect(br.x, br.y, br.w, br.h);

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(br.x, br.y, br.w, 3);

    if (br.isMystery) {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', br.x + br.w / 2, br.y + br.h / 2 + 1);
    } else if (br.hp > 1) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(br.hp), br.x + br.w / 2, br.y + br.h / 2 + 1);
    }
  }

  // Falling power-up capsules
  for (let i = 0; i < state.powerups.length; i += 1) {
    const cap = state.powerups[i];
    ctx.save();
    ctx.fillStyle = cap.color;
    ctx.beginPath();
    ctx.arc(cap.x, cap.y, cap.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.font = '14px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cap.emoji, cap.x, cap.y + 1);
    ctx.restore();
  }

  // Twin lasers
  ctx.fillStyle = '#f472b6';
  for (let i = 0; i < state.lasers.length; i += 1) {
    const l = state.lasers[i];
    ctx.fillRect(l.x - 2, l.y - 10, 4, 14);
  }

  // Paddle
  const p = state.paddle;
  const paddleGrad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
  if (state.effects.laserTimer > 0) {
    paddleGrad.addColorStop(0, '#f472b6');
    paddleGrad.addColorStop(0.5, '#fde047');
    paddleGrad.addColorStop(1, '#f472b6');
  } else if (state.effects.wideTimer > 0) {
    paddleGrad.addColorStop(0, '#38bdf8');
    paddleGrad.addColorStop(0.5, '#00f3ff');
    paddleGrad.addColorStop(1, '#38bdf8');
  } else {
    paddleGrad.addColorStop(0, '#c084fc');
    paddleGrad.addColorStop(0.5, '#f472b6');
    paddleGrad.addColorStop(1, '#00f3ff');
  }
  ctx.fillStyle = paddleGrad;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 8);
    ctx.fill();
  } else {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Laser cannon turrets when active
  if (state.effects.laserTimer > 0) {
    ctx.fillStyle = '#fde047';
    ctx.fillRect(p.x + 8, p.y - 5, 6, 6);
    ctx.fillRect(p.x + p.w - 14, p.y - 5, 6, 6);
  }

  // Balls
  for (let i = 0; i < state.balls.length; i += 1) {
    const b = state.balls[i];
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Serve prompt if ball attached
  if (state.balls.some((b) => b.attached) && state.status === 'playing') {
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText('TAP OR PRESS SPACE TO LAUNCH BALL', BLASTER_WIDTH / 2, BLASTER_HEIGHT - 74);
  }

  // Particles
  for (let i = 0; i < state.particles.length; i += 1) {
    const pt = state.particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    ctx.restore();
  }
}

export default function BrickBlasterGame({
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const recordedGameOverRef = useRef(false);
  const inputRef = useRef({
    left: false,
    right: false,
    fire: false,
    launch: false,
    moveAxis: 0,
    targetX: null
  });

  const [hud, setHud] = useState(() => ({
    score: 0,
    lives: 3,
    level: 1,
    levelName: 'LOL WORD',
    ballCount: 1,
    wideTimer: 0,
    laserTimer: 0,
    status: 'playing',
    bestScore: readStoredBest()
  }));

  const syncHudFromState = useCallback((st) => {
    setHud((prev) => {
      const nextBest = Math.max(prev.bestScore, st.score);
      if (nextBest > prev.bestScore) writeStoredBest(nextBest);

      const wideTimer = Math.ceil((st.effects.wideTimer || 0) * 10) / 10;
      const laserTimer = Math.ceil((st.effects.laserTimer || 0) * 10) / 10;
      const ballCount = st.balls.length;

      if (
        prev.score === st.score &&
        prev.lives === st.lives &&
        prev.level === st.level &&
        prev.levelName === st.levelName &&
        prev.ballCount === ballCount &&
        prev.wideTimer === wideTimer &&
        prev.laserTimer === laserTimer &&
        prev.status === st.status &&
        prev.bestScore === nextBest
      ) {
        return prev;
      }

      return {
        score: st.score,
        lives: st.lives,
        level: st.level,
        levelName: st.levelName,
        ballCount,
        wideTimer,
        laserTimer,
        status: st.status,
        bestScore: nextBest
      };
    });
  }, []);

  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = createInitialBrickBlasterState();
      syncHudFromState(gameRef.current);
    }
  }, [syncHudFromState]);

  const handleRestartRun = useCallback(() => {
    sfx.playToggle?.();
    recordedGameOverRef.current = false;
    inputRef.current.targetX = null;
    const fresh = createInitialBrickBlasterState();
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

  // Auto-pause on tab hide / window blur
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

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
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
        inputRef.current.launch = true;
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
        inputRef.current.launch = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleTogglePause, syncHudFromState]);

  // 60fps requestAnimationFrame loop + Gamepad API polling
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
      inputRef.current.launch = false;

      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        try {
          const pads = navigator.getGamepads() || [];
          for (let g = 0; g < pads.length; g += 1) {
            const pad = pads[g];
            if (!pad || !pad.connected) continue;
            const axis = Number(pad.axes?.[0] || 0);
            if (Math.abs(axis) > 0.2) inp.moveAxis = axis;
            if (pad.buttons?.[14]?.pressed) inp.left = true;
            if (pad.buttons?.[15]?.pressed) inp.right = true;
            if (pad.buttons?.[0]?.pressed || pad.buttons?.[2]?.pressed) {
              inp.fire = true;
              inp.launch = true;
            }
            if (pad.buttons?.[9]?.pressed && pauseDebounce <= 0 && st && st.status !== 'gameover') {
              st.status = st.status === 'paused' ? 'playing' : 'paused';
              pauseDebounce = 0.35;
            }
            break;
          }
        } catch {
          // ignore sandboxed gamepad errors
        }
      }

      if (st && st.status === 'playing') {
        stepBrickBlasterState(st, inp, dt);
        for (let e = 0; e < st.sfxEvents.length; e += 1) {
          const ev = st.sfxEvents[e];
          if (ev === 'paddle' || ev === 'brickHit') sfx.playPop?.(1);
          else if (ev === 'brickBreak' || ev === 'laser') sfx.playPop?.(2);
          else if (ev === 'powerup' || ev === 'levelClear') sfx.playJackpot?.();
          else if (ev === 'lifeLost' || ev === 'gameOver') sfx.playStockBell?.(false);
        }

        if (st.status === 'gameover' && !recordedGameOverRef.current) {
          recordedGameOverRef.current = true;
          if (st.score > 0 && onRecordHighScore) {
            onRecordHighScore('blaster', st.score);
          }
        }
        syncHudFromState(st);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext?.('2d');
      drawBlasterFrame(ctx, st);

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
    return ((clientX - rect.left) / rect.width) * BLASTER_WIDTH;
  };

  const handleCanvasPointerDown = (e) => {
    const st = gameRef.current;
    if (st?.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
    if (st) launchAttachedBalls(st);
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
      title="Brick Blaster"
      eyebrow="PIXEL PATTERN BREAKER • FREE TO PLAY"
      titleBadge={
        <span className="tm-gs-badge tm-gs-badge-accent">0 TOKENS • LVL {hud.level}</span>
      }
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/brick-blaster"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-gs-icon-btn"
            onClick={onOpenLeaderboard}
            data-testid="blaster-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Drag anywhere across the playfield on phones or tablets to steer the neon paddle directly—or use Left/Right Arrow keys, A/D, the buttons below, or a gamepad.',
        'Break retro word and pixel-face brick formations (LOL WORD, NEON SMILEY FACE, MEME WORD, CYBER FROG FACE) by bouncing balls off timed paddle angles.',
        'Catch falling power-up orbs: ⚡ Multi-Ball splits balls up to 4x, 🔫 Twin Laser mounts edge cannons, and ↔️ Wide Paddle expands your shield.',
        'Free to play (costs zero tokens). Tab switching automatically pauses your run.'
      ]}
    >
      <div className="tm-blaster-stage" data-testid="brick-blaster-stage">
        <div className="tm-blaster-hud">
          <div className="tm-blaster-stat">
            <span className="tm-blaster-stat-label">Score</span>
            <span className="tm-blaster-stat-val pink" data-testid="blaster-score">
              {hud.score.toLocaleString()}
            </span>
          </div>
          <div className="tm-blaster-stat">
            <span className="tm-blaster-stat-label">Level</span>
            <span className="tm-blaster-stat-val gold" data-testid="blaster-level">
              {hud.level}
            </span>
          </div>
          <div className="tm-blaster-stat">
            <span className="tm-blaster-stat-label">Lives</span>
            <span className="tm-blaster-stat-val" data-testid="blaster-lives">
              {'❤️'.repeat(Math.max(0, hud.lives)) || '💀'}
            </span>
          </div>
          <div className="tm-blaster-stat">
            <span className="tm-blaster-stat-label">Best</span>
            <span className="tm-blaster-stat-val">{hud.bestScore.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="tm-btn"
              onClick={handleTogglePause}
              disabled={hud.status === 'gameover'}
              data-testid="blaster-pause-btn"
            >
              {hud.status === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={handleRestartRun}
              data-testid="blaster-restart-btn"
            >
              ↻ New
            </button>
          </div>
        </div>

        <div className="tm-blaster-level-strip" data-testid="blaster-level-strip">
          <span>
            Pattern: <strong style={{ color: '#fde047' }}>{hud.levelName}</strong>
          </span>
          <div className="tm-blaster-power-pills">
            <span className={`tm-blaster-pill ${hud.ballCount > 1 ? 'active-multi' : ''}`}>
              ⚡ {hud.ballCount}x Ball
            </span>
            <span className={`tm-blaster-pill ${hud.laserTimer > 0 ? 'active-laser' : ''}`}>
              🔫 {hud.laserTimer > 0 ? `${hud.laserTimer.toFixed(1)}s` : 'Laser'}
            </span>
            <span className={`tm-blaster-pill ${hud.wideTimer > 0 ? 'active-wide' : ''}`}>
              ↔️ {hud.wideTimer > 0 ? `${hud.wideTimer.toFixed(1)}s` : 'Wide'}
            </span>
          </div>
        </div>

        <div className="tm-blaster-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={BLASTER_WIDTH}
            height={BLASTER_HEIGHT}
            className="tm-blaster-canvas"
            data-testid="blaster-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          />

          {hud.status === 'paused' && (
            <div className="tm-blaster-overlay" data-testid="blaster-paused-overlay">
              <h3>⏸ PAUSED</h3>
              <p>Paddle & balls frozen cleanly while you stepped away.</p>
              <div className="tm-blaster-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={handleTogglePause}>
                  ▶ Resume Level {hud.level}
                </button>
                <button type="button" className="tm-btn" onClick={handleRestartRun}>
                  ↻ Restart
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-blaster-overlay" data-testid="blaster-gameover-overlay">
              <h3>🧱 GAME OVER</h3>
              <p>
                Cleared up to <strong>Level {hud.level}</strong> with{' '}
                <strong style={{ color: '#facc15' }}>{hud.score.toLocaleString()} pts</strong>!
              </p>
              <div className="tm-blaster-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleRestartRun}
                  data-testid="blaster-play-again-btn"
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

        <div className="tm-blaster-controls" aria-label="Touch Paddle Controls">
          <button
            type="button"
            className="tm-blaster-pad-btn"
            data-testid="blaster-btn-left"
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
            className="tm-blaster-pad-btn launch"
            data-testid="blaster-btn-launch"
            onPointerDown={() => {
              const st = gameRef.current;
              if (st?.status === 'paused') {
                st.status = 'playing';
                syncHudFromState(st);
              }
              if (st) launchAttachedBalls(st);
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
            🚀 LAUNCH / LASER
          </button>
          <button
            type="button"
            className="tm-blaster-pad-btn"
            data-testid="blaster-btn-right"
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
