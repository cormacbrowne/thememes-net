import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { sfx } from '../utils/soundEngine';
import {
  RIDERS_GRID_SIZE,
  RIDERS_CELL_PX,
  RIDERS_CANVAS_SIZE,
  RIDERS_BEST_SCORE_KEY,
  createGridRidersRound,
  enqueueRiderTurn,
  stepGridRidersState
} from '../utils/gridRidersEngine';
import './GridRidersGame.css';

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(RIDERS_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(RIDERS_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore storage quota errors
  }
}

function drawRiderTrail(ctx, rider) {
  if (!rider || rider.trail.length === 0) return;

  ctx.save();
  ctx.strokeStyle = rider.color;
  ctx.shadowColor = rider.color;
  ctx.shadowBlur = rider.turboTimer > 0 ? 16 : 9;
  ctx.lineWidth = RIDERS_CELL_PX - 3;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  for (let i = 0; i < rider.trail.length; i += 1) {
    const pt = rider.trail[i];
    const px = (pt.x + 0.5) * RIDERS_CELL_PX;
    const py = (pt.y + 0.5) * RIDERS_CELL_PX;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Bright lightcycle head nose
  if (rider.alive) {
    const hx = rider.x * RIDERS_CELL_PX + 1;
    const hy = rider.y * RIDERS_CELL_PX + 1;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.fillRect(hx, hy, RIDERS_CELL_PX - 2, RIDERS_CELL_PX - 2);
  }
  ctx.restore();
}

function drawGridRidersFrame(ctx, state) {
  if (!ctx || !state) return;

  // Synthwave grid arena floor
  ctx.fillStyle = '#040712';
  ctx.fillRect(0, 0, RIDERS_CANVAS_SIZE, RIDERS_CANVAS_SIZE);

  ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 2; i < RIDERS_GRID_SIZE; i += 2) {
    const p = i * RIDERS_CELL_PX + 0.5;
    ctx.moveTo(p, 0);
    ctx.lineTo(p, RIDERS_CANVAS_SIZE);
    ctx.moveTo(0, p);
    ctx.lineTo(RIDERS_CANVAS_SIZE, p);
  }
  ctx.stroke();

  // Arena perimeter border
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.42)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, RIDERS_CANVAS_SIZE - 2, RIDERS_CANVAS_SIZE - 2);

  // Round 2+ obstacle pylons
  if (state.obstacles.size > 0) {
    ctx.save();
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    for (const key of state.obstacles) {
      const [ox, oy] = key.split(',').map(Number);
      ctx.fillRect(
        ox * RIDERS_CELL_PX + 1,
        oy * RIDERS_CELL_PX + 1,
        RIDERS_CELL_PX - 2,
        RIDERS_CELL_PX - 2
      );
    }
    ctx.restore();
  }

  // Hyper-cell pickup
  if (state.pickup) {
    const px = (state.pickup.x + 0.5) * RIDERS_CELL_PX;
    const py = (state.pickup.y + 0.5) * RIDERS_CELL_PX;
    const pulse = 1 + Math.sin((state.animClock || 0) * 6) * 0.16;
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, (RIDERS_CELL_PX * 0.58) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('⚡', px, py + 0.5);
    ctx.restore();
  }

  drawRiderTrail(ctx, state.p1);
  drawRiderTrail(ctx, state.p2);

  // Derezzed collision sparks
  for (let i = 0; i < state.sparks.length; i += 1) {
    const sp = state.sparks[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, sp.life * 2);
    ctx.fillStyle = sp.color;
    ctx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
    ctx.restore();
  }
}

export default function GridRidersGame({
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const [bestScore, setBestScore] = useState(() => readStoredBest());
  const [arenaMode, setArenaMode] = useState('1p');
  const [hud, setHud] = useState({
    mode: '1p',
    status: 'title',
    round: 1,
    score: 0,
    p1Wins: 0,
    p2Wins: 0,
    roundWinner: null,
    roundMessage: ''
  });

  const canvasRef = useRef(null);
  const swipeStartRef = useRef(null);
  const lastGpDirRef = useRef({ p1: null, p2: null });
  const recordedRunRef = useRef(false);
  const stateRef = useRef(null);

  const syncHudFromState = useCallback((st) => {
    setHud({
      mode: st.mode,
      status: st.status,
      round: st.round,
      score: st.score,
      p1Wins: st.p1Wins,
      p2Wins: st.p2Wins,
      roundWinner: st.roundWinner,
      roundMessage: st.roundMessage
    });
    if (st.bestScore > readStoredBest()) {
      writeStoredBest(st.bestScore);
      setBestScore(st.bestScore);
    }
  }, []);

  const recordRunIfNeeded = useCallback(
    (st) => {
      if (st.mode !== '1p' || recordedRunRef.current || st.score <= 0) return;
      recordedRunRef.current = true;
      onRecordHighScore?.('riders', st.score);
    },
    [onRecordHighScore]
  );

  const startFreshMatch = useCallback(
    (nextMode = arenaMode) => {
      recordedRunRef.current = false;
      const next = createGridRidersRound({
        mode: nextMode,
        round: 1,
        score: 0,
        p1Wins: 0,
        p2Wins: 0,
        bestScore: Math.max(bestScore, readStoredBest()),
        status: 'playing'
      });
      stateRef.current = next;
      setArenaMode(nextMode);
      syncHudFromState(next);
      sfx.playLaser?.();
    },
    [arenaMode, bestScore, syncHudFromState]
  );

  const handleModeSwitch = useCallback(
    (nextMode) => {
      if (stateRef.current?.mode === nextMode && stateRef.current?.status === 'title') return;
      recordedRunRef.current = false;
      const next = createGridRidersRound({
        mode: nextMode,
        round: 1,
        score: 0,
        p1Wins: 0,
        p2Wins: 0,
        bestScore: Math.max(bestScore, readStoredBest()),
        status: 'playing'
      });
      stateRef.current = next;
      setArenaMode(nextMode);
      syncHudFromState(next);
      sfx.playToggle?.();
    },
    [bestScore, syncHudFromState]
  );

  const startNextRound = useCallback(() => {
    const prev = stateRef.current;
    if (!prev) return;
    const next = createGridRidersRound({
      mode: prev.mode,
      round: prev.round + 1,
      score: prev.score,
      p1Wins: prev.p1Wins,
      p2Wins: prev.p2Wins,
      bestScore: prev.bestScore,
      status: 'playing'
    });
    stateRef.current = next;
    syncHudFromState(next);
    sfx.playLaser?.();
  }, [syncHudFromState]);

  const togglePause = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    if (st.status === 'playing') {
      st.status = 'paused';
      syncHudFromState(st);
    } else if (st.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
  }, [syncHudFromState]);

  // Auto-pause on tab hide or window blur
  useEffect(() => {
    const pauseIfPlaying = () => {
      const st = stateRef.current;
      if (st && st.status === 'playing') {
        st.status = 'paused';
        syncHudFromState(st);
      }
    };
    const handleVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', pauseIfPlaying);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', pauseIfPlaying);
    };
  }, [syncHudFromState]);

  // Keyboard listeners: 1P (WASD or Arrows), 2P (WASD for P1, Arrows for P2)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const st = stateRef.current;
      if (!st) return;

      const key = e.key;
      const lower = key.toLowerCase();

      if (lower === 'p' || key === 'Escape') {
        if (st.status === 'playing' || st.status === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (key === ' ' || key === 'Enter') {
        if (st.status === 'title' || st.status === 'gameover') {
          e.preventDefault();
          startFreshMatch(st.mode);
          return;
        }
        if (st.status === 'round_over') {
          e.preventDefault();
          startNextRound();
          return;
        }
      }

      if (st.status !== 'playing') return;

      const p1WasdMap = { w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT' };
      const arrowMap = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT'
      };

      if (p1WasdMap[lower]) {
        e.preventDefault();
        if (enqueueRiderTurn(st.p1, p1WasdMap[lower])) sfx.playToggle?.();
      } else if (arrowMap[key]) {
        e.preventDefault();
        const target = st.mode === '2p' ? st.p2 : st.p1;
        if (enqueueRiderTurn(target, arrowMap[key])) sfx.playToggle?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startFreshMatch, startNextRound, togglePause]);

  // Main 60fps simulation + gamepad polling loop
  useEffect(() => {
    if (!stateRef.current) {
      stateRef.current = createGridRidersRound({
        mode: '1p',
        round: 1,
        bestScore: readStoredBest(),
        status: 'title'
      });
    }
    let rafId = 0;
    let lastTs = performance.now();
    let hudClock = 0;

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const st = stateRef.current;

      if (st && st.status === 'playing' && typeof navigator !== 'undefined' && navigator.getGamepads) {
        try {
          const pads = navigator.getGamepads();
          const pollPad = (padIndex, rider, slotKey) => {
            const pad = pads?.[padIndex];
            if (!pad) return;
            const axX = pad.axes?.[0] || 0;
            const axY = pad.axes?.[1] || 0;
            let nextDir = null;
            if (pad.buttons?.[12]?.pressed || axY < -0.55) nextDir = 'UP';
            else if (pad.buttons?.[13]?.pressed || axY > 0.55) nextDir = 'DOWN';
            else if (pad.buttons?.[14]?.pressed || axX < -0.55) nextDir = 'LEFT';
            else if (pad.buttons?.[15]?.pressed || axX > 0.55) nextDir = 'RIGHT';
            if (nextDir && nextDir !== lastGpDirRef.current[slotKey]) {
              enqueueRiderTurn(rider, nextDir);
            }
            lastGpDirRef.current[slotKey] = nextDir;
          };
          pollPad(0, st.p1, 'p1');
          if (st.mode === '2p') pollPad(1, st.p2, 'p2');
        } catch {
          // ignore sandboxed gamepad access errors
        }
      }

      if (st) {
        const { events } = stepGridRidersState(st, dt);
        for (const ev of events) {
          if (ev.type === 'pickup') sfx.playCoinDrop?.();
          else if (ev.type === 'round_win') sfx.playBonus?.();
          else if (ev.type === 'crash') sfx.playHit?.();
          else if (ev.type === 'gameover') {
            recordRunIfNeeded(st);
          }
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) drawGridRidersFrame(ctx, st);

        hudClock += dt;
        if (events.length > 0 || hudClock >= 0.12) {
          hudClock = 0;
          syncHudFromState(st);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [recordRunIfNeeded, syncHudFromState]);

  const handleTurnPress = (playerSlot, dir) => {
    const st = stateRef.current;
    if (!st || st.status !== 'playing') return;
    const rider = playerSlot === 'p2' ? st.p2 : st.p1;
    if (enqueueRiderTurn(rider, dir)) {
      sfx.playToggle?.();
    }
  };

  const handleCanvasPointerDown = (e) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerMove = (e) => {
    const start = swipeStartRef.current;
    const st = stateRef.current;
    if (!start || !st || st.status !== 'playing' || st.mode !== '1p') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) < 18) return;
    const dir =
      Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP';
    if (enqueueRiderTurn(st.p1, dir)) {
      sfx.playToggle?.();
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerUp = () => {
    swipeStartRef.current = null;
  };

  const renderTouchPad = (playerSlot, flipped = false) => {
    const label = playerSlot === 'p2' ? 'P2 (RED)' : 'P1 (CYAN)';
    return (
      <div
        className={`tm-riders-pad-shell ${flipped ? 'p2-flipped' : ''}`}
        data-testid={playerSlot === 'p2' ? 'riders-p2-pad' : 'riders-p1-pad'}
      >
        <div className="tm-riders-pad-label">
          <div className={playerSlot === 'p2' ? 'tm-riders-p2-tag' : 'tm-riders-p1-tag'}>
            {label}
          </div>
          <div>{playerSlot === 'p2' ? 'Arrow Keys / Top Touch' : 'WASD / Touch Pad'}</div>
        </div>
        <div className="tm-riders-dpad" role="group" aria-label={`${label} Directional Pad`}>
          <button
            type="button"
            className="tm-riders-dir-btn tm-riders-dir-up"
            aria-label={`${label} Up`}
            onPointerDown={(e) => {
              e.preventDefault();
              handleTurnPress(playerSlot, 'UP');
            }}
          >
            ▲
          </button>
          <button
            type="button"
            className="tm-riders-dir-btn tm-riders-dir-left"
            aria-label={`${label} Left`}
            onPointerDown={(e) => {
              e.preventDefault();
              handleTurnPress(playerSlot, 'LEFT');
            }}
          >
            ◀
          </button>
          <button
            type="button"
            className="tm-riders-dir-btn tm-riders-dir-down"
            aria-label={`${label} Down`}
            onPointerDown={(e) => {
              e.preventDefault();
              handleTurnPress(playerSlot, 'DOWN');
            }}
          >
            ▼
          </button>
          <button
            type="button"
            className="tm-riders-dir-btn tm-riders-dir-right"
            aria-label={`${label} Right`}
            onPointerDown={(e) => {
              e.preventDefault();
              handleTurnPress(playerSlot, 'RIGHT');
            }}
          >
            ▶
          </button>
        </div>
      </div>
    );
  };

  return (
    <GameShell
      title="🏍️ GRID RIDERS"
      eyebrow="Light-Trail Arena · Free Cabinet"
      titleBadge="FREE"
      showWallet={false}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      onBack={onBackToFeed}
      sharePath="/games/grid-riders"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-shell-badge tm-shell-badge-free"
            style={{ cursor: 'pointer', borderColor: 'rgba(250, 204, 21, 0.5)', color: '#fde047' }}
            onClick={onOpenLeaderboard}
            title="Open Grid Riders Global Leaderboard"
            data-testid="riders-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Steer your neon lightcycle across the 44x44 circuit and force rivals into barriers or solid trails.',
        '1P vs AI: play with WASD, Arrow keys, USB/Bluetooth Gamepad, bottom D-pad, or swipe anywhere on the grid.',
        '2P Local Duel: battle on one keyboard (P1 WASD vs P2 Arrow keys) or place one phone between two players with Player 2 using the rotated top touch D-pad.',
        'Free to play. Tab switching automatically pauses active rounds.'
      ]}
    >
      <div className="tm-riders-wrap" data-testid="grid-riders-cabinet">
        <div className="tm-riders-mode-bar" role="group" aria-label="Grid Riders Mode">
          <button
            type="button"
            className={`tm-riders-mode-btn ${arenaMode === '1p' ? 'active' : ''}`}
            data-testid="riders-mode-1p"
            onClick={() => handleModeSwitch('1p')}
          >
            🤖 1P VS AI
          </button>
          <button
            type="button"
            className={`tm-riders-mode-btn ${arenaMode === '2p' ? 'active' : ''}`}
            data-testid="riders-mode-2p"
            onClick={() => handleModeSwitch('2p')}
          >
            👥 2P LOCAL DUEL
          </button>
        </div>

        <div className="tm-riders-hud">
          <div className="tm-riders-hud-cell">
            <span className="tm-riders-p1-tag">P1</span>
            <strong>{hud.p1Wins}W</strong>
          </div>
          <div className="tm-riders-hud-cell">
            <span>R{hud.round}</span>
            {hud.mode === '1p' ? (
              <span>
                SCORE <strong>{hud.score.toLocaleString()}</strong> · BEST{' '}
                <strong>{Math.max(bestScore, hud.score).toLocaleString()}</strong>
              </span>
            ) : (
              <span>HEAD-TO-HEAD DUEL</span>
            )}
          </div>
          <div className="tm-riders-hud-cell">
            <span className="tm-riders-p2-tag">{hud.mode === '2p' ? 'P2' : 'AI'}</span>
            <strong>{hud.p2Wins}W</strong>
            {(hud.status === 'playing' || hud.status === 'paused') && (
              <button
                type="button"
                className="tm-btn"
                style={{ padding: '2px 8px', minHeight: '28px', fontSize: '0.75rem' }}
                onClick={togglePause}
                title={hud.status === 'paused' ? 'Resume Match' : 'Pause Match'}
                data-testid="riders-pause-btn"
              >
                {hud.status === 'paused' ? '▶' : '⏸'}
              </button>
            )}
          </div>
        </div>

        {/* Face-to-face rotated Player 2 D-pad in 2P Local Duel mode */}
        {arenaMode === '2p' && renderTouchPad('p2', true)}

        <div className="tm-riders-stage">
          <canvas
            ref={canvasRef}
            width={RIDERS_CANVAS_SIZE}
            height={RIDERS_CANVAS_SIZE}
            className="tm-riders-canvas"
            data-testid="grid-riders-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          />

          {hud.status === 'title' && (
            <div className="tm-riders-overlay" data-testid="riders-title-overlay">
              <h3>GRID RIDERS</h3>
              <p>
                Trap opponents inside solid neon light-trails and snag ⚡ Hyper-Cells!
                <br />
                <strong>1P:</strong> WASD / Arrows / Swipe · <strong>2P:</strong> WASD vs Arrows
                or hold phone between 2 players.
              </p>
              <div className="tm-riders-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  data-testid="riders-start-1p-btn"
                  onClick={() => startFreshMatch('1p')}
                >
                  ▶ START 1P VS AI
                </button>
                <button
                  type="button"
                  className="tm-btn"
                  data-testid="riders-start-2p-btn"
                  onClick={() => startFreshMatch('2p')}
                >
                  👥 START 2P DUEL
                </button>
              </div>
            </div>
          )}

          {hud.status === 'paused' && (
            <div className="tm-riders-overlay" data-testid="riders-pause-overlay">
              <h3>PAUSED</h3>
              <p>Arena cycles suspended. Ready to resume?</p>
              <div className="tm-riders-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={togglePause}>
                  ▶ RESUME
                </button>
                <button
                  type="button"
                  className="tm-btn"
                  onClick={() => startFreshMatch(arenaMode)}
                >
                  ↺ RESTART
                </button>
              </div>
            </div>
          )}

          {hud.status === 'round_over' && (
            <div className="tm-riders-overlay" data-testid="riders-roundover-overlay">
              <h3>{hud.roundMessage || 'ROUND COMPLETE'}</h3>
              <p>
                Scoreboard: P1 {hud.p1Wins} — {hud.p2Wins}{' '}
                {hud.mode === '2p' ? 'P2' : 'AI'}
              </p>
              <div className="tm-riders-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  data-testid="riders-next-round-btn"
                  onClick={startNextRound}
                >
                  ▶ ROUND {hud.round + 1}
                </button>
                <button
                  type="button"
                  className="tm-btn"
                  onClick={() => startFreshMatch(arenaMode)}
                >
                  ↺ NEW MATCH
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-riders-overlay" data-testid="riders-gameover-overlay">
              <h3>GRID OVERLOAD</h3>
              <p>
                {hud.roundMessage}
                <br />
                Final Score: <strong>{hud.score.toLocaleString()} pts</strong>
              </p>
              <div className="tm-riders-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  data-testid="riders-retry-btn"
                  onClick={() => startFreshMatch('1p')}
                >
                  ▶ PLAY AGAIN
                </button>
                {onOpenLeaderboard && (
                  <button type="button" className="tm-btn" onClick={onOpenLeaderboard}>
                    🏆 SCORES
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {renderTouchPad('p1', false)}

        <p className="tm-riders-controls-note">
          Free Cabinet ·{' '}
          {arenaMode === '2p'
            ? 'P1: WASD / Bottom Pad · P2: Arrows / Rotated Top Pad'
            : 'WASD / Arrows / Gamepad · Swipe Arena or Use D-Pad'}
        </p>
      </div>
    </GameShell>
  );
}
