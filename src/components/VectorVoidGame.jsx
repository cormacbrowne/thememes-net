import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { sfx } from '../utils/soundEngine';
import {
  VOID_WIDTH,
  VOID_HEIGHT,
  VOID_BEST_SCORE_KEY,
  createInitialVectorVoidState,
  stepVectorVoidState
} from '../utils/vectorVoidEngine';
import './VectorVoidGame.css';

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(VOID_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(VOID_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage quota errors
  }
}

function drawVectorVoidFrame(ctx, state) {
  if (!ctx || !state) return;

  // Deep phosphor CRT backdrop
  ctx.fillStyle = '#040610';
  ctx.fillRect(0, 0, VOID_WIDTH, VOID_HEIGHT);

  // Subtle vector grid reticle
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let p = 48; p < VOID_WIDTH; p += 48) {
    ctx.moveTo(p, 0);
    ctx.lineTo(p, VOID_HEIGHT);
    ctx.moveTo(0, p);
    ctx.lineTo(VOID_WIDTH, p);
  }
  ctx.stroke();

  // Splitting vector asteroids
  for (let i = 0; i < state.rocks.length; i += 1) {
    const rk = state.rocks[i];
    ctx.save();
    ctx.translate(rk.x, rk.y);
    ctx.rotate(rk.angle);
    ctx.strokeStyle = rk.color;
    ctx.shadowColor = rk.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let v = 0; v < rk.vertices.length; v += 1) {
      const pt = rk.vertices[v];
      if (v === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Vector laser bolts
  ctx.save();
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 10;
  for (let i = 0; i < state.bullets.length; i += 1) {
    const b = state.bullets[i];
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Vector ship with blink during post-respawn invulnerability
  const ship = state.ship;
  const hideBlink = ship.invulnTimer > 0 && Math.floor(state.animClock * 16) % 2 === 0;
  if (!hideBlink && state.status !== 'gameover') {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.aimAngle);
    ctx.strokeStyle = ship.invulnTimer > 0 ? '#fde047' : '#4ade80';
    ctx.shadowColor = ship.invulnTimer > 0 ? '#fde047' : '#4ade80';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.stroke();

    if (ship.thrusting) {
      ctx.strokeStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-18 - (state.animClock * 30) % 6, 0);
      ctx.lineTo(-9, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Glowing vector explosion sparks
  for (let i = 0; i < state.sparks.length; i += 1) {
    const sp = state.sparks[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x - sp.vx * 0.04, sp.y - sp.vy * 0.04);
    ctx.stroke();
    ctx.restore();
  }
}

export default function VectorVoidGame({
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const recordedGameOverRef = useRef(false);
  const leftPadRef = useRef(null);
  const rightPadRef = useRef(null);

  const inputRef = useRef({
    wasd: { up: false, down: false, left: false, right: false },
    arrows: { up: false, down: false, left: false, right: false },
    canvasAim: null, // { x, y }
    canvasFire: false,
    spaceFire: false,
    stickMove: { x: 0, y: 0, pointerId: null },
    stickAim: { x: 0, y: 0, pointerId: null }
  });

  const [leftKnob, setLeftKnob] = useState({ x: 0, y: 0 });
  const [rightKnob, setRightKnob] = useState({ x: 0, y: 0 });

  const [hud, setHud] = useState(() => ({
    score: 0,
    wave: 1,
    lives: 3,
    rocksLeft: 4,
    status: 'playing',
    bestScore: readStoredBest()
  }));

  const syncHudFromState = useCallback((st) => {
    setHud((prev) => {
      const nextBest = Math.max(prev.bestScore, st.score);
      if (nextBest > prev.bestScore) writeStoredBest(nextBest);
      const rocksLeft = st.rocks.length;

      if (
        prev.score === st.score &&
        prev.wave === st.wave &&
        prev.lives === st.lives &&
        prev.rocksLeft === rocksLeft &&
        prev.status === st.status &&
        prev.bestScore === nextBest
      ) {
        return prev;
      }

      return {
        score: st.score,
        wave: st.wave,
        lives: st.lives,
        rocksLeft,
        status: st.status,
        bestScore: nextBest
      };
    });
  }, []);

  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = createInitialVectorVoidState();
      syncHudFromState(gameRef.current);
    }
  }, [syncHudFromState]);

  const handleRestartRun = useCallback(() => {
    sfx.playToggle?.();
    recordedGameOverRef.current = false;
    const fresh = createInitialVectorVoidState();
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

  // Keyboard twin-stick controls (WASD move, Arrow keys aim+fire, Space fire, P pause)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(e.key)) {
        e.preventDefault();
      }
      const w = inputRef.current.wasd;
      const a = inputRef.current.arrows;
      if (e.key === 'w' || e.key === 'W') w.up = true;
      else if (e.key === 's' || e.key === 'S') w.down = true;
      else if (e.key === 'a' || e.key === 'A') w.left = true;
      else if (e.key === 'd' || e.key === 'D') w.right = true;
      else if (e.key === 'ArrowUp') a.up = true;
      else if (e.key === 'ArrowDown') a.down = true;
      else if (e.key === 'ArrowLeft') a.left = true;
      else if (e.key === 'ArrowRight') a.right = true;
      else if (e.key === ' ') inputRef.current.spaceFire = true;
      else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') handleTogglePause();
    };
    const onKeyUp = (e) => {
      const w = inputRef.current.wasd;
      const a = inputRef.current.arrows;
      if (e.key === 'w' || e.key === 'W') w.up = false;
      else if (e.key === 's' || e.key === 'S') w.down = false;
      else if (e.key === 'a' || e.key === 'A') w.left = false;
      else if (e.key === 'd' || e.key === 'D') w.right = false;
      else if (e.key === 'ArrowUp') a.up = false;
      else if (e.key === 'ArrowDown') a.down = false;
      else if (e.key === 'ArrowLeft') a.left = false;
      else if (e.key === 'ArrowRight') a.right = false;
      else if (e.key === ' ') inputRef.current.spaceFire = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleTogglePause]);

  // 60fps requestAnimationFrame loop + dual-stick Gamepad API polling
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let pauseDebounce = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      pauseDebounce = Math.max(0, pauseDebounce - dt);

      const st = gameRef.current;
      const inpState = inputRef.current;
      let moveX = (inpState.wasd.right ? 1 : 0) - (inpState.wasd.left ? 1 : 0) + inpState.stickMove.x;
      let moveY = (inpState.wasd.down ? 1 : 0) - (inpState.wasd.up ? 1 : 0) + inpState.stickMove.y;
      let aimX = (inpState.arrows.right ? 1 : 0) - (inpState.arrows.left ? 1 : 0) + inpState.stickAim.x;
      let aimY = (inpState.arrows.down ? 1 : 0) - (inpState.arrows.up ? 1 : 0) + inpState.stickAim.y;
      let fire = inpState.spaceFire || inpState.canvasFire;

      if (inpState.canvasFire && inpState.canvasAim && st) {
        aimX = inpState.canvasAim.x - st.ship.x;
        aimY = inpState.canvasAim.y - st.ship.y;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
        try {
          const pads = navigator.getGamepads() || [];
          for (let g = 0; g < pads.length; g += 1) {
            const pad = pads[g];
            if (!pad || !pad.connected) continue;
            const lx = Number(pad.axes?.[0] || 0);
            const ly = Number(pad.axes?.[1] || 0);
            const rx = Number(pad.axes?.[2] || 0);
            const ry = Number(pad.axes?.[3] || 0);
            if (Math.hypot(lx, ly) > 0.22) {
              moveX = lx;
              moveY = ly;
            }
            if (Math.hypot(rx, ry) > 0.24) {
              aimX = rx;
              aimY = ry;
              fire = true;
            }
            if (pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed) fire = true;
            if (pad.buttons?.[9]?.pressed && pauseDebounce <= 0 && st && st.status !== 'gameover') {
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
        stepVectorVoidState(st, { moveX, moveY, aimX, aimY, fire }, dt);
        for (let e = 0; e < st.sfxEvents.length; e += 1) {
          const ev = st.sfxEvents[e];
          if (ev === 'shoot') sfx.playPop?.(1);
          else if (ev === 'split' || ev === 'shatter') sfx.playPop?.(2);
          else if (ev === 'waveClear') sfx.playJackpot?.();
          else if (ev === 'shipHit' || ev === 'gameOver') sfx.playStockBell?.(false);
        }

        if (st.status === 'gameover' && !recordedGameOverRef.current) {
          recordedGameOverRef.current = true;
          if (st.score > 0 && onRecordHighScore) {
            onRecordHighScore('void', st.score);
          }
        }
        syncHudFromState(st);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext?.('2d');
      drawVectorVoidFrame(ctx, st);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [onRecordHighScore, syncHudFromState]);

  const computeStickOffset = (el, clientX, clientY) => {
    if (!el) return { nx: 0, ny: 0, px: 0, py: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.34;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const px = Math.cos(angle) * clampedDist;
    const py = Math.sin(angle) * clampedDist;
    return {
      nx: maxR > 0 ? px / maxR : 0,
      ny: maxR > 0 ? py / maxR : 0,
      px,
      py
    };
  };

  const handleStickDown = (which, e) => {
    const st = gameRef.current;
    if (st?.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const padEl = which === 'left' ? leftPadRef.current : rightPadRef.current;
    const vec = computeStickOffset(padEl, e.clientX, e.clientY);
    if (which === 'left') {
      inputRef.current.stickMove = { x: vec.nx, y: vec.ny, pointerId: e.pointerId };
      setLeftKnob({ x: vec.px, y: vec.py });
    } else {
      inputRef.current.stickAim = { x: vec.nx, y: vec.ny, pointerId: e.pointerId };
      setRightKnob({ x: vec.px, y: vec.py });
    }
  };

  const handleStickMove = (which, e) => {
    const targetStick = which === 'left' ? inputRef.current.stickMove : inputRef.current.stickAim;
    if (targetStick.pointerId !== e.pointerId && e.buttons === 0) return;
    const padEl = which === 'left' ? leftPadRef.current : rightPadRef.current;
    const vec = computeStickOffset(padEl, e.clientX, e.clientY);
    if (which === 'left') {
      inputRef.current.stickMove.x = vec.nx;
      inputRef.current.stickMove.y = vec.ny;
      setLeftKnob({ x: vec.px, y: vec.py });
    } else {
      inputRef.current.stickAim.x = vec.nx;
      inputRef.current.stickAim.y = vec.ny;
      setRightKnob({ x: vec.px, y: vec.py });
    }
  };

  const handleStickUp = (which) => {
    if (which === 'left') {
      inputRef.current.stickMove = { x: 0, y: 0, pointerId: null };
      setLeftKnob({ x: 0, y: 0 });
    } else {
      inputRef.current.stickAim = { x: 0, y: 0, pointerId: null };
      setRightKnob({ x: 0, y: 0 });
    }
  };

  const updateCanvasAim = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    inputRef.current.canvasAim = {
      x: ((e.clientX - rect.left) / rect.width) * VOID_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * VOID_HEIGHT
    };
  };

  return (
    <GameShell
      title="Vector Void"
      eyebrow="TWIN-STICK VECTOR SPACE SHOOTER • FREE TO PLAY"
      titleBadge={
        <span className="tm-gs-badge tm-gs-badge-accent">FREE • SECTOR {hud.wave}</span>
      }
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/vector-void"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-gs-icon-btn"
            onClick={onOpenLeaderboard}
            data-testid="void-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Twin-Stick on Phones & Tablets: use the Left Stick to thrust across the wrap-around space grid and the Right Stick to aim 360° & auto-fire.',
        'On Desktop: move with W/A/S/D, aim & fire with Arrow keys or Mouse cursor, or plug in a dual-stick USB/Bluetooth gamepad.',
        'Shatter glowing vector rocks: Large rocks split into 2 Mediums, Mediums split into 2 Smalls. Everything wraps seamlessly around screen edges.',
        'Free to play (costs zero tokens). Tab switching automatically pauses your run.'
      ]}
    >
      <div className="tm-void-stage" data-testid="vector-void-stage">
        <div className="tm-void-hud">
          <div className="tm-void-stat">
            <span className="tm-void-stat-label">Score</span>
            <span className="tm-void-stat-val cyan" data-testid="void-score">
              {hud.score.toLocaleString()}
            </span>
          </div>
          <div className="tm-void-stat">
            <span className="tm-void-stat-label">Sector</span>
            <span className="tm-void-stat-val gold" data-testid="void-wave">
              {hud.wave}
            </span>
          </div>
          <div className="tm-void-stat">
            <span className="tm-void-stat-label">Ships</span>
            <span className="tm-void-stat-val" data-testid="void-lives">
              {'🛸'.repeat(Math.max(0, hud.lives)) || '💀'}
            </span>
          </div>
          <div className="tm-void-stat">
            <span className="tm-void-stat-label">Best</span>
            <span className="tm-void-stat-val">{hud.bestScore.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="tm-btn"
              onClick={handleTogglePause}
              disabled={hud.status === 'gameover'}
              data-testid="void-pause-btn"
            >
              {hud.status === 'paused' ? '▶' : '⏸'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={handleRestartRun}
              data-testid="void-restart-btn"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="tm-void-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={VOID_WIDTH}
            height={VOID_HEIGHT}
            className="tm-void-canvas"
            data-testid="void-canvas"
            onPointerDown={(e) => {
              if (gameRef.current?.status === 'paused') {
                gameRef.current.status = 'playing';
                syncHudFromState(gameRef.current);
              }
              updateCanvasAim(e);
              inputRef.current.canvasFire = true;
            }}
            onPointerMove={updateCanvasAim}
            onPointerUp={() => {
              inputRef.current.canvasFire = false;
            }}
            onPointerCancel={() => {
              inputRef.current.canvasFire = false;
            }}
          />

          {hud.status === 'paused' && (
            <div className="tm-void-overlay" data-testid="void-paused-overlay">
              <h3>⏸ SECTOR PAUSED</h3>
              <p>{hud.rocksLeft} vector fragments drifting across the wrap-around void.</p>
              <div className="tm-void-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={handleTogglePause}>
                  ▶ Resume Sector {hud.wave}
                </button>
                <button type="button" className="tm-btn" onClick={handleRestartRun}>
                  ↻ Restart
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-void-overlay" data-testid="void-gameover-overlay">
              <h3>💥 HULL SHATTERED</h3>
              <p>
                Cleared up to <strong>Sector {hud.wave}</strong> with{' '}
                <strong style={{ color: 'var(--tm-amber)' }}>{hud.score.toLocaleString()} pts</strong>!
              </p>
              <div className="tm-void-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleRestartRun}
                  data-testid="void-play-again-btn"
                >
                  🚀 Launch Again
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

        <div className="tm-void-twinstick" aria-label="Twin-Stick Virtual Touch Controls">
          <div className="tm-void-stick-box">
            <span className="tm-void-stick-label">◀ Left Stick: Move</span>
            <div
              ref={leftPadRef}
              className="tm-void-stick-pad"
              data-testid="void-left-stick"
              onPointerDown={(e) => handleStickDown('left', e)}
              onPointerMove={(e) => handleStickMove('left', e)}
              onPointerUp={() => handleStickUp('left')}
              onPointerCancel={() => handleStickUp('left')}
            >
              <div
                className="tm-void-stick-knob"
                style={{ transform: `translate(${leftKnob.x}px, ${leftKnob.y}px)` }}
              />
            </div>
          </div>

          <div className="tm-void-stick-box">
            <span className="tm-void-stick-label">Right Stick: Aim &amp; Fire ▶</span>
            <div
              ref={rightPadRef}
              className="tm-void-stick-pad aim"
              data-testid="void-right-stick"
              onPointerDown={(e) => handleStickDown('right', e)}
              onPointerMove={(e) => handleStickMove('right', e)}
              onPointerUp={() => handleStickUp('right')}
              onPointerCancel={() => handleStickUp('right')}
            >
              <div
                className="tm-void-stick-knob"
                style={{ transform: `translate(${rightKnob.x}px, ${rightKnob.y}px)` }}
              />
            </div>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
