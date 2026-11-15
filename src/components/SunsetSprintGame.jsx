import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import { EightiesCarSvg } from './DeLoreanTimeMachine';
import { EIGHTIES_CARS } from '../data/deloreanEras';
import { sfx } from '../utils/soundEngine';
import {
  getRadioState,
  getUnlockedStations,
  setRadioStation,
  subscribeRadio,
  toggleRadio
} from '../utils/radioBus';
import {
  SPRINT_WIDTH,
  SPRINT_HEIGHT,
  SPRINT_HORIZON_Y,
  SPRINT_BEST_SCORE_KEY,
  createInitialSunsetSprintState,
  pickNextRadioStation,
  resolveCarSpec,
  stepSunsetSprintState
} from '../utils/sunsetSprintEngine';
import './SunsetSprintGame.css';

function readStoredBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(SPRINT_BEST_SCORE_KEY) || 0));
  } catch {
    return 0;
  }
}

function writeStoredBest(score) {
  try {
    localStorage.setItem(SPRINT_BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // ignore quota errors
  }
}

function drawPlayerRearCar(ctx, state, cx, cy) {
  if (state.invulnTimer > 0 && Math.floor(state.animClock * 16) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  const carId = state.carId;
  const spec = resolveCarSpec(carId);
  const tilt = (state.steerVel || 0) * 5;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt * (Math.PI / 180));

  // Under-chassis neon flux shadow
  ctx.fillStyle = spec.accent || '#00f5ff';
  ctx.globalAlpha = state.turboTimer > 0 ? 0.55 : 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 26, 48, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rear tires
  ctx.fillStyle = '#090d16';
  ctx.fillRect(-42, 4, 14, 22);
  ctx.fillRect(28, 4, 14, 22);

  // Car body tailored per 80s ride in EIGHTIES_CARS
  if (carId === 'cosworth') {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-38, -8, 76, 26);
    // Signature whale-tail spoiler
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-40, -20, 80, 6);
    ctx.fillRect(-34, -14, 6, 8);
    ctx.fillRect(28, -14, 6, 8);
  } else if (carId === 'lagonda') {
    ctx.fillStyle = '#134e4a';
    ctx.fillRect(-40, -6, 80, 24);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(-38, -3, 76, 2);
  } else if (carId === 'porsche911') {
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(-40, -6, 80, 24);
    ctx.fillStyle = '#9f1239';
    ctx.fillRect(-32, -16, 64, 10);
  } else {
    // DeLorean DMC-12 brushed stainless + rear louvers
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-38, -8, 76, 26);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-28, -17, 56, 9);
    // Horizontal louver slats
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-24, -15, 48, 2);
    ctx.fillRect(-24, -11, 48, 2);
  }

  // Glowing 80s tail-light bar + license plate
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-36, 0, 20, 6);
  ctx.fillRect(16, 0, 20, 6);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-13, 3, 26, 9);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 6px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText((spec.plate || '80S-RUN').slice(0, 7), 0, 10);

  // Dual exhaust turbo flames during boost
  if (state.turboTimer > 0) {
    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.ellipse(-22, 22, 6, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 22, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSunsetSprintFrame(ctx, state) {
  if (!ctx || !state) return;

  const shakeX = state.crashShake > 0 ? Math.sin(state.animClock * 55) * 6 : 0;
  ctx.save();
  ctx.translate(shakeX, 0);

  // 1. Outrun twilight sky
  const sky = ctx.createLinearGradient(0, 0, 0, SPRINT_HORIZON_Y);
  sky.addColorStop(0, '#0c0524');
  sky.addColorStop(0.55, '#3b0764');
  sky.addColorStop(1, '#db2777');
  ctx.fillStyle = sky;
  ctx.fillRect(-8, 0, SPRINT_WIDTH + 16, SPRINT_HORIZON_Y);

  // 2. Retro striped sunset sun
  const sunX = SPRINT_WIDTH / 2 + state.curveOffset * 28;
  const sunY = SPRINT_HORIZON_Y - 34;
  const sunGrad = ctx.createLinearGradient(0, sunY - 68, 0, sunY + 68);
  sunGrad.addColorStop(0, '#fde047');
  sunGrad.addColorStop(0.55, '#fb923c');
  sunGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 68, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal CRT cut stripes on lower sun
  ctx.fillStyle = '#7e22ce';
  for (let s = 0; s < 5; s += 1) {
    const sy = sunY + 6 + s * 11;
    ctx.fillRect(sunX - 74, sy, 148, 2 + s * 0.8);
  }

  // Neon mountain silhouette along horizon
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(-10, SPRINT_HORIZON_Y);
  ctx.lineTo(75, SPRINT_HORIZON_Y - 38);
  ctx.lineTo(155, SPRINT_HORIZON_Y - 12);
  ctx.lineTo(245, SPRINT_HORIZON_Y - 46);
  ctx.lineTo(340, SPRINT_HORIZON_Y - 14);
  ctx.lineTo(425, SPRINT_HORIZON_Y - 34);
  ctx.lineTo(SPRINT_WIDTH + 10, SPRINT_HORIZON_Y);
  ctx.closePath();
  ctx.fill();

  // 3. Pseudo-3D sliced highway floor & OutRun rumble strips
  const roadTopY = SPRINT_HORIZON_Y;
  const roadH = SPRINT_HEIGHT - roadTopY;
  const slices = 44;
  const stripePhase = state.distance * 0.095;

  for (let i = 0; i < slices; i += 1) {
    const t1 = i / slices;
    const t2 = (i + 1) / slices;
    // Perspective depth projection (quadratically denser near horizon)
    const y1 = roadTopY + Math.pow(t1, 1.45) * roadH;
    const y2 = roadTopY + Math.pow(t2, 1.45) * roadH;

    const halfW1 = 22 + Math.pow(t1, 1.25) * 212;
    const halfW2 = 22 + Math.pow(t2, 1.25) * 212;

    const cx1 = SPRINT_WIDTH / 2 + state.curveOffset * (1 - t1) * 58;
    const cx2 = SPRINT_WIDTH / 2 + state.curveOffset * (1 - t2) * 58;

    const band = Math.floor(stripePhase - (1 - t1) * 9) % 2 === 0;

    // Ground terrain outside road
    ctx.fillStyle = band ? '#15082e' : '#1b0a3a';
    ctx.fillRect(-10, y1, SPRINT_WIDTH + 20, y2 - y1 + 1);

    // Neon road rumble curbs
    const curbPad1 = halfW1 * 1.1;
    const curbPad2 = halfW2 * 1.1;
    ctx.fillStyle = band ? '#00f3ff' : '#ec4899';
    ctx.beginPath();
    ctx.moveTo(cx1 - curbPad1, y1);
    ctx.lineTo(cx1 + curbPad1, y1);
    ctx.lineTo(cx2 + curbPad2, y2 + 1);
    ctx.lineTo(cx2 - curbPad2, y2 + 1);
    ctx.closePath();
    ctx.fill();

    // Dark synthwave asphalt
    ctx.fillStyle = band ? '#111827' : '#0b101d';
    ctx.beginPath();
    ctx.moveTo(cx1 - halfW1, y1);
    ctx.lineTo(cx1 + halfW1, y1);
    ctx.lineTo(cx2 + halfW2, y2 + 1);
    ctx.lineTo(cx2 - halfW2, y2 + 1);
    ctx.closePath();
    ctx.fill();

    // Dashed 3-lane highway markers
    if (band) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.72)';
      const lw1 = Math.max(1, halfW1 * 0.025);
      const lw2 = Math.max(1.5, halfW2 * 0.025);
      for (const laneSplit of [-0.33, 0.33]) {
        ctx.beginPath();
        ctx.moveTo(cx1 + laneSplit * halfW1 - lw1, y1);
        ctx.lineTo(cx1 + laneSplit * halfW1 + lw1, y1);
        ctx.lineTo(cx2 + laneSplit * halfW2 + lw2, y2 + 1);
        ctx.lineTo(cx2 + laneSplit * halfW2 - lw2, y2 + 1);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Helper converting normalized track coordinate (laneX, z in [1..0]) to screen pixel/scale
  const project = (laneX, z) => {
    const t = Math.max(0.02, Math.min(1, 1 - z));
    const y = roadTopY + Math.pow(t, 1.45) * roadH;
    const halfW = 22 + Math.pow(t, 1.25) * 212;
    const cx = SPRINT_WIDTH / 2 + state.curveOffset * (1 - t) * 58 + laneX * halfW;
    const scale = 0.22 + t * 0.96;
    return { x: cx, y, scale };
  };

  // 4. Collectible Cassettes sorted far-to-near
  for (let i = 0; i < state.cassettes.length; i += 1) {
    const cas = state.cassettes[i];
    const p = project(cas.laneX, cas.z);
    const sz = Math.max(14, Math.floor(34 * p.scale));

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y - sz * 0.3, sz * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `${sz}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📼', p.x, p.y - sz * 0.25);
    ctx.restore();
  }

  // 5. Oncoming Traffic sorted far-to-near
  const sortedTraffic = [...state.traffic].sort((a, b) => b.z - a.z);
  for (let i = 0; i < sortedTraffic.length; i += 1) {
    const car = sortedTraffic[i];
    const p = project(car.laneX, car.z);
    const w = 68 * p.scale;
    const h = 34 * p.scale;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-w * 0.52, -h * 0.22, w * 0.16, h * 0.36);
    ctx.fillRect(w * 0.36, -h * 0.22, w * 0.16, h * 0.36);

    ctx.fillStyle = car.style.body;
    ctx.fillRect(-w / 2, -h * 0.6, w, h * 0.6);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-w * 0.36, -h * 0.92, w * 0.72, h * 0.32);

    // Bright red brake tail lights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-w * 0.44, -h * 0.4, w * 0.24, h * 0.16);
    ctx.fillRect(w * 0.2, -h * 0.4, w * 0.24, h * 0.16);
    ctx.restore();
  }

  // 6. Player car in foreground
  const playerScreenX = SPRINT_WIDTH / 2 + state.playerX * 165;
  const playerScreenY = SPRINT_HEIGHT - 64;
  drawPlayerRearCar(ctx, state, playerScreenX, playerScreenY);

  // Checkpoint banner flash
  if (state.checkpointBannerTimer > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
    ctx.fillRect(48, 86, SPRINT_WIDTH - 96, 44);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 86, SPRINT_WIDTH - 96, 44);
    ctx.font = '900 18px "Courier New", monospace';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText('CHECKPOINT! +18s BONUS', SPRINT_WIDTH / 2, 114);
    ctx.restore();
  }

  // Crash spark particles
  for (let i = 0; i < state.particles.length; i += 1) {
    const pt = state.particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    ctx.restore();
  }

  ctx.restore();
}

export default function SunsetSprintGame({
  activeCarId = 'delorean',
  onSelectCar,
  soundOn = true,
  onToggleSound,
  onRecordHighScore,
  onOpenLeaderboard,
  onBackToFeed
}) {
  const [carOverride, setCarOverride] = useState(null);
  const selectedCar = carOverride || activeCarId;
  const [radioSnap, setRadioSnap] = useState(() => getRadioState());
  const [stationToast, setStationToast] = useState('');

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const recordedGameOverRef = useRef(false);
  const inputRef = useRef({
    left: false,
    right: false,
    boost: false,
    moveAxis: 0,
    targetRoadX: null
  });

  const [hud, setHud] = useState(() => ({
    score: 0,
    timerSeconds: 35,
    speedMph: 88,
    stage: 1,
    cassettesCollected: 0,
    nextCheckpointIn: 1200,
    status: 'playing',
    bestScore: readStoredBest()
  }));

  useEffect(() => subscribeRadio(() => setRadioSnap({ ...getRadioState() })), []);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.carId = selectedCar;
    }
  }, [selectedCar]);

  const syncHudFromState = useCallback((st) => {
    setHud((prev) => {
      const nextBest = Math.max(prev.bestScore, st.score);
      if (nextBest > prev.bestScore) writeStoredBest(nextBest);

      const timerRounded = Math.ceil(st.timerSeconds * 10) / 10;
      const mph = Math.round(st.speedMph);
      const nextCheckpointIn = Math.max(0, Math.round(st.nextCheckpointM - st.distance));

      if (
        prev.score === st.score &&
        prev.timerSeconds === timerRounded &&
        prev.speedMph === mph &&
        prev.stage === st.stage &&
        prev.cassettesCollected === st.cassettesCollected &&
        prev.nextCheckpointIn === nextCheckpointIn &&
        prev.status === st.status &&
        prev.bestScore === nextBest
      ) {
        return prev;
      }

      return {
        score: st.score,
        timerSeconds: timerRounded,
        speedMph: mph,
        stage: st.stage,
        cassettesCollected: st.cassettesCollected,
        nextCheckpointIn,
        status: st.status,
        bestScore: nextBest
      };
    });
  }, []);

  useEffect(() => {
    if (gameRef.current === null) {
      gameRef.current = createInitialSunsetSprintState({ carId: selectedCar });
      syncHudFromState(gameRef.current);
    }
  }, [selectedCar, syncHudFromState]);

  const handleChooseCar = (carId) => {
    setCarOverride(carId);
    if (gameRef.current) gameRef.current.carId = carId;
    onSelectCar?.(carId);
    sfx.playToggle?.();
  };

  const handleRestartRun = useCallback(() => {
    sfx.playToggle?.();
    recordedGameOverRef.current = false;
    inputRef.current.targetRoadX = null;
    const fresh = createInitialSunsetSprintState({ carId: selectedCar });
    gameRef.current = fresh;
    syncHudFromState(fresh);
  }, [selectedCar, syncHudFromState]);

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
        inputRef.current.targetRoadX = null;
        inputRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.targetRoadX = null;
        inputRef.current.right = true;
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (gameRef.current?.status === 'paused') {
          gameRef.current.status = 'playing';
          syncHudFromState(gameRef.current);
        }
        inputRef.current.boost = true;
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
        inputRef.current.boost = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleTogglePause, syncHudFromState]);

  // 60fps simulation + Gamepad API polling + FM cassette switching
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
            if (pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed) inp.boost = true;
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
        stepSunsetSprintState(st, inp, dt);
        for (let e = 0; e < st.sfxEvents.length; e += 1) {
          const ev = st.sfxEvents[e];
          if (ev === 'cassette') {
            sfx.playJackpot?.();
            const stations = getUnlockedStations();
            const currId = getRadioState().station;
            const next = pickNextRadioStation(stations, currId);
            if (next) {
              setRadioStation(next.id, { overrideContext: true, startIfOff: false });
              setStationToast(`📼 Switched FM -> ${next.icon} ${next.name}`);
            }
          } else if (ev === 'checkpoint') {
            sfx.playJackpot?.();
          } else if (ev === 'crash' || ev === 'gameOver') {
            sfx.playStockBell?.(false);
          }
        }

        if (st.status === 'gameover' && !recordedGameOverRef.current) {
          recordedGameOverRef.current = true;
          if (st.score > 0 && onRecordHighScore) {
            onRecordHighScore('sunset', st.score);
          }
        }
        syncHudFromState(st);
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext?.('2d');
      drawSunsetSprintFrame(ctx, st);

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [onRecordHighScore, syncHudFromState]);

  const mapPointerToRoadX = (clientX) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return null;
    const norm = ((clientX - rect.left) / rect.width) * 2 - 1;
    return norm * 1.15;
  };

  const handleCanvasPointerDown = (e) => {
    const st = gameRef.current;
    if (st?.status === 'paused') {
      st.status = 'playing';
      syncHudFromState(st);
    }
    const rx = mapPointerToRoadX(e.clientX);
    if (rx !== null) inputRef.current.targetRoadX = rx;
  };

  const handleCanvasPointerMove = (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const rx = mapPointerToRoadX(e.clientX);
    if (rx !== null) inputRef.current.targetRoadX = rx;
  };

  const currentStationList = getUnlockedStations();
  const activeStationObj =
    currentStationList.find((s) => s.id === (radioSnap.activeStation || radioSnap.station)) ||
    currentStationList[0];

  return (
    <GameShell
      title="Sunset Sprint"
      eyebrow="SYNTHWAVE CHECKPOINT RACER • FREE TO PLAY"
      titleBadge={
        <span className="tm-gs-badge tm-gs-badge-accent">0 TOKENS • STAGE {hud.stage}</span>
      }
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/sunset-sprint"
      extraBadges={
        onOpenLeaderboard ? (
          <button
            type="button"
            className="tm-gs-icon-btn"
            onClick={onOpenLeaderboard}
            data-testid="sunset-leaderboard-btn"
          >
            🏆 Leaderboard
          </button>
        ) : null
      }
      howToPlay={[
        'Steer across the glowing highway by dragging your finger left/right on the canvas, tapping the thumb buttons below, using Arrow keys / A-D, or plugging in a gamepad.',
        'Dodge oncoming retro traffic to preserve speed and reach glowing Checkpoints (+18s time bonus + stage bonus points) before the timer hits 0.0s!',
        'Drive through floating 📼 Cassette Tapes to earn +250 bonus points, ignite temporary Nitro boost, and automatically switch your THE MEMES FM radio station.',
        'Swap between all 4 classic 1980s garage rides above (DeLorean DMC-12, Lagonda, RS Cosworth, Porsche 911). Free to play (0 tokens).'
      ]}
    >
      <div className="tm-sunset-stage" data-testid="sunset-sprint-stage">
        <div className="tm-sunset-hud">
          <div className="tm-sunset-stat">
            <span className="tm-sunset-stat-label">Timer</span>
            <span
              className={`tm-sunset-stat-val ${hud.timerSeconds < 8 ? 'urgent' : 'gold'}`}
              data-testid="sunset-timer"
            >
              {hud.timerSeconds.toFixed(1)}s
            </span>
          </div>
          <div className="tm-sunset-stat">
            <span className="tm-sunset-stat-label">Speed</span>
            <span className="tm-sunset-stat-val orange" data-testid="sunset-speed">
              {hud.speedMph} MPH
            </span>
          </div>
          <div className="tm-sunset-stat">
            <span className="tm-sunset-stat-label">Score</span>
            <span className="tm-sunset-stat-val" data-testid="sunset-score">
              {hud.score.toLocaleString()}
            </span>
          </div>
          <div className="tm-sunset-stat">
            <span className="tm-sunset-stat-label">Best</span>
            <span className="tm-sunset-stat-val">{hud.bestScore.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="tm-btn"
              onClick={handleTogglePause}
              disabled={hud.status === 'gameover'}
              data-testid="sunset-pause-btn"
            >
              {hud.status === 'paused' ? '▶' : '⏸'}
            </button>
            <button
              type="button"
              className="tm-btn"
              onClick={handleRestartRun}
              data-testid="sunset-restart-btn"
            >
              ↻
            </button>
          </div>
        </div>

        <div className="tm-sunset-garage-strip" data-testid="sunset-garage-strip">
          <div className="tm-sunset-car-preview">
            <EightiesCarSvg
              carId={selectedCar}
              className="tm-sunset-car-svg"
              showFlames={hud.status === 'playing'}
              fluxActive={hud.speedMph >= 88}
            />
          </div>
          <div className="tm-sunset-car-pills">
            {EIGHTIES_CARS.map((car) => (
              <button
                key={car.id}
                type="button"
                className={`tm-sunset-car-pill ${selectedCar === car.id ? 'active' : ''}`}
                onClick={() => handleChooseCar(car.id)}
              >
                {car.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="tm-sunset-radio-bar" data-testid="sunset-radio-bar">
          <span>
            {stationToast ||
              `📻 FM: ${activeStationObj?.icon || '📼'} ${activeStationObj?.name || 'Synthwave Drive'} • 📼 ${hud.cassettesCollected}`}
          </span>
          <button
            type="button"
            className="tm-sunset-radio-btn"
            onClick={() => toggleRadio()}
            data-testid="sunset-radio-toggle"
          >
            {radioSnap.on ? '🔊 FM ON' : '🔇 Play FM'}
          </button>
        </div>

        <div className="tm-sunset-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={SPRINT_WIDTH}
            height={SPRINT_HEIGHT}
            className="tm-sunset-canvas"
            data-testid="sunset-canvas"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
          />

          {hud.status === 'paused' && (
            <div className="tm-sunset-overlay" data-testid="sunset-paused-overlay">
              <h3>⏸ RACE PAUSED</h3>
              <p>Next checkpoint in {hud.nextCheckpointIn}m — tap Resume when ready.</p>
              <div className="tm-sunset-overlay-actions">
                <button type="button" className="tm-btn tm-btn-primary" onClick={handleTogglePause}>
                  ▶ Resume Stage {hud.stage}
                </button>
                <button type="button" className="tm-btn" onClick={handleRestartRun}>
                  ↻ Restart
                </button>
              </div>
            </div>
          )}

          {hud.status === 'gameover' && (
            <div className="tm-sunset-overlay" data-testid="sunset-gameover-overlay">
              <h3>🌅 TIME EXPIRED</h3>
              <p>
                Reached <strong>Stage {hud.stage}</strong> collecting{' '}
                <strong>{hud.cassettesCollected} 📼</strong> with{' '}
                <strong style={{ color: '#fde047' }}>{hud.score.toLocaleString()} pts</strong>!
              </p>
              <div className="tm-sunset-overlay-actions">
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={handleRestartRun}
                  data-testid="sunset-play-again-btn"
                >
                  🏎️ Race Again
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

        <div className="tm-sunset-controls" aria-label="Steering & Nitro Controls">
          <button
            type="button"
            className="tm-sunset-pad-btn"
            data-testid="sunset-btn-left"
            onPointerDown={() => {
              inputRef.current.targetRoadX = null;
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
            ◀ STEER
          </button>
          <button
            type="button"
            className="tm-sunset-pad-btn nitro"
            data-testid="sunset-btn-boost"
            onPointerDown={() => {
              inputRef.current.boost = true;
            }}
            onPointerUp={() => {
              inputRef.current.boost = false;
            }}
            onPointerLeave={() => {
              inputRef.current.boost = false;
            }}
            onPointerCancel={() => {
              inputRef.current.boost = false;
            }}
          >
            ⚡ NITRO
          </button>
          <button
            type="button"
            className="tm-sunset-pad-btn"
            data-testid="sunset-btn-right"
            onPointerDown={() => {
              inputRef.current.targetRoadX = null;
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
            STEER ▶
          </button>
        </div>
      </div>
    </GameShell>
  );
}
