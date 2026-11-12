import { useState, useEffect, useRef, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES, validateStakedGamePayout } from '../utils/tokenEconomy';
import GameShell from './GameShell';
import './MemePlinkoGame.css';

// ==========================================
// MEME PLINKO '86 — CANVAS PEG PHYSICS (Phase 29.10)
//
// HOUSE EDGE & FAIRNESS MATH (Target 3–5%):
//   - 8-row triangular Galton peg board -> 9 buckets (k = 0..8).
//   - With fair p = 0.5 left/right peg deflections per row, bucket weights follow
//     exact Binomial(8, 0.5): C(8, k) / 256 = [1, 8, 28, 56, 70, 56, 28, 8, 1] / 256.
//   - Low Risk    [5.0, 1.9, 1.2, 0.9, 0.55, 0.9, 1.2, 1.9, 5.0]:  EV = 246.9 / 256 = 96.45% RTP (3.55% house edge)
//   - Medium Risk [11.0, 2.8, 1.3, 0.7, 0.4, 0.7, 1.3, 2.8, 11.0]: EV = 246.0 / 256 = 96.09% RTP (3.91% house edge)
//   - High Risk   [26.0, 3.8, 1.4, 0.35, 0.2, 0.35, 1.4, 3.8, 26.0]: EV = 244.4 / 256 = 95.47% RTP (4.53% house edge)
// ==========================================

const ROWS = 8;
const BUCKETS = ROWS + 1; // 9 slots
const CANVAS_W = 400;
const CANVAS_H = 420;

const RISK_TABLES = {
  low: {
    id: 'low',
    label: '🟢 Low',
    mults: [5.0, 1.9, 1.2, 0.9, 0.55, 0.9, 1.2, 1.9, 5.0],
    edgeText: '3.55% edge • max 5×'
  },
  medium: {
    id: 'medium',
    label: '🟡 Med',
    mults: [11.0, 2.8, 1.3, 0.7, 0.4, 0.7, 1.3, 2.8, 11.0],
    edgeText: '3.91% edge • max 11×'
  },
  high: {
    id: 'high',
    label: '🔴 High',
    mults: [26.0, 3.8, 1.4, 0.35, 0.2, 0.35, 1.4, 3.8, 26.0],
    edgeText: '4.53% edge • max 26×'
  }
};

const MEME_FACES = ['🐸', '🐕', '🗿', '📈', '🌈', '💀'];

function buildPegLayout() {
  const pegs = [];
  const topY = 58;
  const rowGap = 38;
  const colGap = 38;
  for (let r = 0; r < ROWS; r += 1) {
    const count = r + 3; // row 0 has 3 pegs -> row 7 has 10 pegs framing 9 buckets
    const rowW = (count - 1) * colGap;
    const startX = CANVAS_W / 2 - rowW / 2;
    const y = topY + r * rowGap;
    for (let c = 0; c < count; c += 1) {
      pegs.push({ x: startX + c * colGap, y, r, flash: 0 });
    }
  }
  const bottomY = topY + (ROWS - 1) * rowGap;
  const slotWidth = colGap;
  const firstSlotCenter = CANVAS_W / 2 - ((BUCKETS - 1) * slotWidth) / 2;
  return { pegs, rowGap, slotWidth, firstSlotCenter, bottomY };
}

const LAYOUT = buildPegLayout();

function pickBucketColor(mult) {
  if (mult >= 10) return '#ef4444';
  if (mult >= 3) return '#f97316';
  if (mult >= 1.2) return '#eab308';
  if (mult >= 0.7) return '#22d3ee';
  return '#64748b';
}

export default function MemePlinkoGame({
  tokens = 0,
  soundOn = true,
  onToggleSound,
  onSpendTokens,
  onPayoutTokens,
  onBackToFeed,
  litePerfMode = false,
  prefersReducedMotion = false
}) {
  const chipSizes = ARCADE_ECONOMY_RULES.ARCADE_STAKES.ROULETTE_CHIPS || [1, 5, 10, 25];

  const [practiceMode, setPracticeMode] = useState(() => tokens < 10);
  const [selectedChip, setSelectedChip] = useState(() => chipSizes[1] || 5);
  const [risk, setRisk] = useState('medium');
  const [statusLine, setStatusLine] = useState('Tap Drop or board to drop a meme ball.');
  const [lastDrops, setLastDrops] = useState([]); // [{ id, mult, win, face }]
  const [autoRemaining, setAutoRemaining] = useState(0);

  const canvasRef = useRef(null);
  const ballsRef = useRef([]);
  const sparksRef = useRef([]);
  const bucketFlashRef = useRef(new Array(BUCKETS).fill(0));
  const faceCursorRef = useRef(0);

  const tokensRef = useRef(tokens);
  const practiceRef = useRef(practiceMode);
  const chipRef = useRef(selectedChip);
  const riskRef = useRef(risk);
  const onSpendRef = useRef(onSpendTokens);
  const onPayoutRef = useRef(onPayoutTokens);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);
  useEffect(() => {
    practiceRef.current = practiceMode;
  }, [practiceMode]);
  useEffect(() => {
    chipRef.current = selectedChip;
  }, [selectedChip]);
  useEffect(() => {
    riskRef.current = risk;
  }, [risk]);
  useEffect(() => {
    onSpendRef.current = onSpendTokens;
    onPayoutRef.current = onPayoutTokens;
  }, [onSpendTokens, onPayoutTokens]);

  const dropSingleBall = useCallback(() => {
    const stake = chipRef.current;
    const isPractice = practiceRef.current;
    const activeRisk = riskRef.current;
    const multTable = RISK_TABLES[activeRisk].mults;

    if (!isPractice) {
      if (tokensRef.current < stake) {
        sfx.playClownHonk?.();
        setAutoRemaining(0);
        setStatusLine('Not enough 🪙 — switch to Free Practice or lower chip.');
        return false;
      }
      if (onSpendRef.current) {
        const ok = onSpendRef.current(stake, `Plinko (${activeRisk})`);
        if (!ok) return false;
      }
      tokensRef.current -= stake;
    }

    // Fair 50/50 coin-flip per row gives exact Binomial(8, 0.5) probabilities [1,8,28,56,70,56,28,8,1]/256
    let bucketIdx = 0;
    const dirs = [];
    for (let r = 0; r < ROWS; r += 1) {
      const goRight = Math.random() < 0.5 ? 1 : 0;
      dirs.push(goRight ? 1 : -1);
      bucketIdx += goRight;
    }

    const face = MEME_FACES[faceCursorRef.current % MEME_FACES.length];
    faceCursorRef.current += 1;

    // Build smooth real-looking physics waypoints through each peg collision down to the bucket
    const targetX = LAYOUT.firstSlotCenter + bucketIdx * LAYOUT.slotWidth;
    ballsRef.current.push({
      id: `${Date.now()}-${Math.random()}`,
      x: CANVAS_W / 2 + (Math.random() - 0.5) * 4,
      y: 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 1.1,
      r: 10,
      rot: 0,
      dirs,
      nextRow: 0,
      bucketIdx,
      targetX,
      stake,
      isPractice,
      mult: multTable[bucketIdx],
      face,
      resolved: false
    });

    sfx.playClick?.();
    return true;
  }, []);

  // Auto-drop x10 timer
  useEffect(() => {
    if (autoRemaining <= 0) return undefined;
    const id = setTimeout(() => {
      const launched = dropSingleBall();
      if (launched) {
        setAutoRemaining((n) => Math.max(0, n - 1));
      } else {
        setAutoRemaining(0);
      }
    }, prefersReducedMotion ? 160 : 280);
    return () => clearTimeout(id);
  }, [autoRemaining, dropSingleBall, prefersReducedMotion]);

  // Physics + Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return undefined;

    let rafId = 0;

    const frame = () => {
      ctx2d.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background subtle glow
      const grad = ctx2d.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#070b18');
      grad.addColorStop(1, '#100824');
      ctx2d.fillStyle = grad;
      ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Update & draw pegs
      for (let i = 0; i < LAYOUT.pegs.length; i += 1) {
        const peg = LAYOUT.pegs[i];
        if (peg.flash > 0.01) peg.flash *= 0.85;
        ctx2d.beginPath();
        ctx2d.arc(peg.x, peg.y, peg.flash > 0.2 ? 5.5 : 4.2, 0, Math.PI * 2);
        ctx2d.fillStyle = peg.flash > 0.2 ? '#00f3ff' : '#cbd5e1';
        ctx2d.fill();
      }

      // Draw multiplier buckets along the bottom
      const activeMults = RISK_TABLES[riskRef.current].mults;
      const bucketY = LAYOUT.bottomY + 34;
      for (let b = 0; b < BUCKETS; b += 1) {
        const cx = LAYOUT.firstSlotCenter + b * LAYOUT.slotWidth;
        const bw = LAYOUT.slotWidth - 4;
        const bh = 34;
        const mult = activeMults[b];
        const baseCol = pickBucketColor(mult);
        const bounce = bucketFlashRef.current[b] > 0.05 ? bucketFlashRef.current[b] * 5 : 0;
        if (bucketFlashRef.current[b] > 0.01) bucketFlashRef.current[b] *= 0.88;

        ctx2d.fillStyle = baseCol;
        ctx2d.beginPath();
        ctx2d.roundRect?.(cx - bw / 2, bucketY + bounce, bw, bh, 6);
        if (!ctx2d.roundRect) ctx2d.rect(cx - bw / 2, bucketY + bounce, bw, bh);
        ctx2d.fill();

        ctx2d.fillStyle = '#090d16';
        ctx2d.font = '900 10px system-ui, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(`${mult}×`, cx, bucketY + bh / 2 + bounce);
      }

      // Update & draw falling balls with elastic peg collisions
      const gravity = prefersReducedMotion ? 0.55 : 0.28;
      for (let i = ballsRef.current.length - 1; i >= 0; i -= 1) {
        const ball = ballsRef.current[i];
        ball.vy += gravity;
        ball.vx *= 0.985;
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rot += ball.vx * 0.06;

        // Steer gently at row boundaries along this ball's fair binomial path + real circle collision
        for (let pIdx = 0; pIdx < LAYOUT.pegs.length; pIdx += 1) {
          const peg = LAYOUT.pegs[pIdx];
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const minDist = ball.r + 4.2;
          const d2 = dx * dx + dy * dy;
          if (d2 < minDist * minDist && d2 > 0.0001) {
            const dist = Math.sqrt(d2);
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = peg.x + nx * (minDist + 0.3);
            ball.y = peg.y + ny * (minDist + 0.3);
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 1.55 * dot * nx) * 0.72;
            ball.vy = Math.min(2.6, Math.abs(ball.vy - 1.45 * dot * ny) * 0.55 + 0.7);
            const dir = ball.dirs[Math.min(peg.r, ROWS - 1)] || 1;
            ball.vx += dir * 1.15;
            peg.flash = 1;

            if (!litePerfMode) {
              sparksRef.current.push({
                x: peg.x,
                y: peg.y,
                vx: (Math.random() - 0.5) * 2.2,
                vy: -Math.random() * 1.8,
                life: 1,
                color: '#00f3ff'
              });
            }
          }
        }

        // Keep horizontal motion aligned toward each row's binomial slot so physics never drifts off-board
        const rowProgress = Math.max(0, Math.min(1, (ball.y - 36) / (bucketY - 36)));
        const idealX = CANVAS_W / 2 + (ball.targetX - CANVAS_W / 2) * rowProgress;
        ball.x += (idealX - ball.x) * 0.08;

        // Draw glossy neon ball + meme face
        ctx2d.save();
        ctx2d.translate(ball.x, ball.y);
        ctx2d.rotate(ball.rot);
        ctx2d.beginPath();
        ctx2d.arc(0, 0, ball.r, 0, Math.PI * 2);
        ctx2d.fillStyle = '#ec4899';
        ctx2d.fill();
        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = '#fde047';
        ctx2d.stroke();
        ctx2d.font = '12px system-ui, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(ball.face, 0, 1);
        ctx2d.restore();

        // Check bucket arrival
        if (ball.y >= bucketY + 6 && !ball.resolved) {
          ball.resolved = true;
          bucketFlashRef.current[ball.bucketIdx] = 1;
          const rawPayout = Math.round(ball.stake * ball.mult);

          let paid = rawPayout;
          if (!ball.isPractice) {
            paid = validateStakedGamePayout({
              stakedTokens: ball.stake,
              rawPayout,
              maxMultiplier: 160
            });
            if (paid > 0 && onPayoutRef.current) {
              onPayoutRef.current(paid, {
                stakedTokens: ball.stake,
                xp: ball.mult >= 2 ? 15 : 5,
                label: `🎯 Plinko ${ball.mult}×`,
                emoji: ball.face
              });
            }
          }

          if (ball.mult >= 2) {
            sfx.playJackpot?.();
          } else if (ball.mult >= 1) {
            sfx.playMemeUpvote?.();
          } else {
            sfx.playPop?.();
          }

          const msg = ball.isPractice
            ? `${ball.face} landed ${ball.mult}× (Practice ${paid})`
            : `${ball.face} landed ${ball.mult}× → +${paid} 🪙!`;
          setStatusLine(msg);
          setLastDrops((prev) => [
            { id: ball.id, mult: ball.mult, win: paid, face: ball.face },
            ...prev.slice(0, 5)
          ]);
          ballsRef.current.splice(i, 1);
        }
      }

      // Draw sparks
      for (let s = sparksRef.current.length - 1; s >= 0; s -= 1) {
        const sp = sparksRef.current[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.06;
        if (sp.life <= 0) {
          sparksRef.current.splice(s, 1);
          continue;
        }
        ctx2d.globalAlpha = sp.life;
        ctx2d.fillStyle = sp.color;
        ctx2d.fillRect(sp.x, sp.y, 3, 3);
        ctx2d.globalAlpha = 1;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [litePerfMode, prefersReducedMotion]);

  const activeRiskMeta = RISK_TABLES[risk];

  return (
    <GameShell
      title="🎯 MEME PLINKO"
      ariaLabel="Meme Plinko 86 Game"
      onBack={onBackToFeed}
      tokens={tokens}
      hasPractice
      practiceMode={practiceMode}
      onTogglePractice={() => setPracticeMode((p) => !p)}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      howToPlay={[
        'Pick chip size and risk level (Low 5×, Med 11×, or High 26× corners).',
        'Tap Drop Ball or the board to drop meme balls down 8 peg rows.',
        'Use Auto ×10 for rapid multi-ball cascades (3.55%–4.53% edge).'
      ]}
    >
      <div className="tm-plinko-stage">

      <div className="tm-plinko-main">
        <div className="tm-plinko-board-wrap">
          <div className="tm-plinko-status" aria-live="polite">
            <span>{statusLine}</span>
            <small>{activeRiskMeta.edgeText}</small>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="tm-plinko-canvas"
            onClick={() => dropSingleBall()}
          />

          {lastDrops.length > 0 && (
            <div className="tm-plinko-history">
              {lastDrops.map((d) => (
                <span key={d.id} className={`tm-plinko-hist-pill ${d.mult >= 2 ? 'is-hot' : ''}`}>
                  {d.face} {d.mult}×
                </span>
              ))}
            </div>
          )}
        </div>

        {/* One-handed thumb controls at bottom on phone */}
        <div className="tm-plinko-controls">
          <div className="tm-plinko-risk-row" role="radiogroup" aria-label="Risk level">
            {Object.values(RISK_TABLES).map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={risk === r.id}
                className={`tm-plinko-risk-btn ${risk === r.id ? 'active' : ''}`}
                onClick={() => setRisk(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="tm-plinko-chips-row">
            {chipSizes.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`tm-plinko-chip ${selectedChip === amt ? 'active' : ''}`}
                onClick={() => setSelectedChip(amt)}
              >
                {amt} 🪙
              </button>
            ))}
          </div>

          <div className="tm-plinko-drop-row">
            <button type="button" className="tm-plinko-drop-btn" onClick={() => dropSingleBall()}>
              🎯 DROP BALL ({selectedChip} 🪙)
            </button>
            <button
              type="button"
              className={`tm-plinko-auto-btn ${autoRemaining > 0 ? 'is-running' : ''}`}
              onClick={() => setAutoRemaining((prev) => (prev > 0 ? 0 : 10))}
            >
              {autoRemaining > 0 ? `⏹ Stop (${autoRemaining})` : '⚡ AUTO ×10'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </GameShell>
  );
}
