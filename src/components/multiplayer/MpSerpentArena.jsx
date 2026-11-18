import { useCallback, useEffect, useRef } from 'react';
import { sfx } from '../../utils/soundEngine';
import { SERPENT_FOOD_EMOJI } from '../../utils/multiplayer/mpSerpentEngine';
import { GameOverPanel } from './MpBits';
import { useHostNow } from '../../hooks/useHostNow';

const CELL = 20;
const KEY_DIRS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right'
};

function drawArena(ctx, state, me) {
  const w = state.cols * CELL;
  const h = state.rows * CELL;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07060f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(138, 61, 255, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= state.cols; x += 1) {
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, h);
  }
  for (let y = 0; y <= state.rows; y += 1) {
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(w, y * CELL + 0.5);
  }
  ctx.stroke();

  ctx.font = `${CELL - 4}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  state.foods.forEach((f) => {
    ctx.fillText(SERPENT_FOOD_EMOJI[f.t] || '😂', f.x * CELL + CELL / 2, f.y * CELL + CELL / 2 + 1);
  });

  // Dead worms first so live ones draw on top.
  const order = [...state.snakes].sort((a, b) => Number(a.alive) - Number(b.alive));
  order.forEach((sn) => {
    const len = sn.body.length / 2;
    ctx.globalAlpha = sn.alive ? 1 : 0.22;
    ctx.fillStyle = sn.color;
    ctx.shadowColor = sn.color;
    ctx.shadowBlur = sn.alive ? 8 : 0;
    for (let i = len - 1; i >= 0; i -= 1) {
      const x = sn.body[i * 2] * CELL;
      const y = sn.body[i * 2 + 1] * CELL;
      const pad = i === 0 ? 1 : 3;
      ctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
    }
    ctx.shadowBlur = 0;
    if (len > 0) {
      // Eyes on the head.
      const hx = sn.body[0] * CELL;
      const hy = sn.body[1] * CELL;
      ctx.fillStyle = '#07060f';
      ctx.fillRect(hx + 5, hy + 6, 3, 3);
      ctx.fillRect(hx + CELL - 8, hy + 6, 3, 3);
      if (sn.alive) {
        ctx.font = 'bold 10px Oxanium, sans-serif';
        ctx.fillStyle = sn.id === me ? '#ffffff' : sn.color;
        const label = sn.id === me ? 'YOU' : sn.name.slice(0, 10);
        const ly = hy < CELL * 2 ? hy + CELL + 9 : hy - 7;
        ctx.fillText(label, hx + CELL / 2, ly);
        ctx.font = `${CELL - 4}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      }
    }
    ctx.globalAlpha = 1;
  });
}

export default function MpSerpentArena({ state, me, isHost, hostName, clockOffset, sendAction, onRematch, onLobby, canRematch }) {
  const canvasRef = useRef(null);
  const swipeRef = useRef(null);
  const mine = state.snakes.find((sn) => sn.id === me);
  const now = useHostNow(clockOffset, state.phase === 'countdown', 200);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawArena(ctx, state, me);
  }, [state, me]);

  const steer = useCallback(
    (d) => {
      if (!mine || !mine.alive) return;
      sendAction('dir', { d });
    },
    [mine, sendAction]
  );

  useEffect(() => {
    const onKey = (e) => {
      const d = KEY_DIRS[e.key];
      if (!d) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      steer(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steer]);

  // Sounds: someone died / round ended.
  const aliveCount = state.snakes.filter((sn) => sn.alive).length;
  const prevAliveRef = useRef(aliveCount);
  useEffect(() => {
    if (aliveCount < prevAliveRef.current && state.phase !== 'countdown') sfx.playDamageGong?.();
    prevAliveRef.current = aliveCount;
  }, [aliveCount, state.phase]);
  const myLen = mine ? mine.body.length : 0;
  const prevLenRef = useRef(myLen);
  useEffect(() => {
    if (myLen > prevLenRef.current && state.phase === 'playing') sfx.playBubblePop?.(1);
    prevLenRef.current = myLen;
  }, [myLen, state.phase]);

  const onPointerDown = (e) => {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const winner = state.snakes.find((sn) => sn.id === state.winnerId);
  const roundWinner = state.snakes.find((sn) => sn.id === state.roundWinnerId);
  const countdown = Math.max(0, Math.ceil((state.startAt - now) / 1000));

  return (
    <div className="tm-mp-sp" data-testid="mp-serpent">
      <ul className="tm-mp-sp-score">
        {state.snakes.map((sn) => (
          <li key={sn.id} className={`${sn.alive ? '' : 'is-dead'} ${sn.id === me ? 'is-me' : ''}`} style={{ '--sp-color': sn.color }}>
            <span className="tm-mp-sp-swatch" />
            <span className="tm-mp-sp-name">
              {sn.avatar} {sn.name}
            </span>
            <span className="tm-mp-sp-wins">
              {'★'.repeat(sn.wins)}
              <span className="tm-mp-sp-wins-off">{'☆'.repeat(Math.max(0, state.target - sn.wins))}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="tm-mp-sp-stage">
        <canvas
          ref={canvasRef}
          className="tm-mp-sp-canvas"
          width={state.cols * CELL}
          height={state.rows * CELL}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipeRef.current = null;
          }}
          aria-label="Worm Wars arena"
          role="img"
        />
        {state.phase === 'countdown' && (
          <div className="tm-mp-sp-overlay">
            {state.waiting ? (
              <p className="tm-mp-sp-big is-small">Waiting for players…</p>
            ) : (
              <>
                <p className="tm-mp-sp-big">{countdown || 'GO!'}</p>
                {mine && (
                  <p className="tm-mp-sp-you" style={{ color: mine.color }}>
                    You are the {colorName(mine.color)} worm — round {state.round}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {state.phase === 'roundover' && (
          <div className="tm-mp-sp-overlay">
            <p className="tm-mp-sp-big is-small" style={{ color: roundWinner?.color }}>
              {roundWinner ? `${roundWinner.name} wins round ${state.round}!` : 'Nobody survived!'}
            </p>
          </div>
        )}
        {state.phase === 'over' && (
          <div className="tm-mp-sp-overlay">
            <GameOverPanel
              title={`🏆 ${winner ? winner.name : 'Nobody'} wins Worm Wars!`}
              sub={`First to ${state.target} rounds`}
              isHost={isHost}
              hostName={hostName}
              canRematch={canRematch}
              onRematch={onRematch}
              onLobby={onLobby}
            />
          </div>
        )}
      </div>

      {mine && (
        <div className="tm-mp-sp-pad" aria-label="Steer your worm">
          <button type="button" className="tm-mp-sp-key is-up" onPointerDown={() => steer('up')} aria-label="Up">
            ▲
          </button>
          <button type="button" className="tm-mp-sp-key is-left" onPointerDown={() => steer('left')} aria-label="Left">
            ◀
          </button>
          <button type="button" className="tm-mp-sp-key is-right" onPointerDown={() => steer('right')} aria-label="Right">
            ▶
          </button>
          <button type="button" className="tm-mp-sp-key is-down" onPointerDown={() => steer('down')} aria-label="Down">
            ▼
          </button>
        </div>
      )}
      <p className="tm-mp-fine">Arrow keys / WASD, swipe the arena, or use the pad. Hitting a wall or any worm ends your round.</p>
    </div>
  );
}

function colorName(hex) {
  return { '#19f0ff': 'CYAN', '#ff2e88': 'PINK', '#ffb800': 'GOLD', '#3dff9a': 'GREEN' }[hex] || 'NEON';
}
