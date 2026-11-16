// ==========================================
// JUICE LAYER CANVAS OVERLAY (Phase 35.6b)
// Single fixed full-viewport <canvas> (pointer-events: none).
// Fixed particle pool (400 cap, 120 under .tm-lite-perf).
// Stops rAF loop immediately when active particle count hits 0.
// ==========================================

import { useEffect, useRef } from 'react';
import { getSettings, subscribeSettings } from '../../utils/settingsStore';
import { sfx } from '../../utils/soundEngine';
import { getTimeScale, haptic, isJuiceDisabled, punch } from '../../utils/juice';

const MAX_POOL = 400;
const LITE_POOL_CAP = 120;
const CONFETTI_PALETTE = ['#ff2bd6', '#00f3ff', '#ffcf4d', '#39ff88', '#a855f7'];
const STAR_PALETTE = ['#ffcf4d', '#00f3ff', '#ff2bd6', '#ffffff'];

function createPoolSlot() {
  return {
    active: false,
    kind: 'spark',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    size: 4,
    rot: 0,
    vrot: 0,
    spin: 0,
    vspin: 0,
    life: 0,
    maxLife: 0.6,
    delay: 0,
    colour: '#00f3ff',
    text: '',
    bounced: false,
    floorY: 0,
    fromX: 0,
    fromY: 0,
    ctrlX: 0,
    ctrlY: 0,
    toX: 0,
    toY: 0,
    toEl: null,
    onLand: null,
    coinIdx: 0,
    coinTotal: 1
  };
}

// Pre-allocated particle pool: zero per-frame object allocations during animation.
const particlePool = Array.from({ length: MAX_POOL }, createPoolSlot);

let canvasRefGlobal = null;
let ctxGlobal = null;
let dprGlobal = 1;
let widthGlobal = 0;
let heightGlobal = 0;
let rafId = null;
let lastFrameTime = 0;
let lastPunchAt = 0;

function isLiteMode() {
  const settings = getSettings();
  if (settings?.litePerfMode) return true;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    return (
      Boolean(root?.classList?.contains('tm-lite-perf')) ||
      Boolean(document.body?.classList?.contains('tm-lite-perf'))
    );
  }
  return false;
}

function getPoolLimit() {
  return isLiteMode() ? LITE_POOL_CAP : MAX_POOL;
}

function allocSlot() {
  const cap = getPoolLimit();
  let oldestIdx = 0;
  let oldestProgress = -1;

  for (let i = 0; i < cap; i++) {
    const p = particlePool[i];
    if (!p.active) return p;
    const progress = p.maxLife > 0 ? p.life / p.maxLife : 1;
    if (progress > oldestProgress) {
      oldestProgress = progress;
      oldestIdx = i;
    }
  }

  return particlePool[oldestIdx];
}

function clearAllParticles() {
  for (let i = 0; i < MAX_POOL; i++) {
    particlePool[i].active = false;
    particlePool[i].toEl = null;
    particlePool[i].onLand = null;
  }
  if (ctxGlobal && widthGlobal > 0 && heightGlobal > 0) {
    ctxGlobal.clearRect(0, 0, widthGlobal, heightGlobal);
  }
  if (rafId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function drawAmberCoin(ctx, x, y, radius, spinAngle, alpha) {
  const scaleX = Math.max(0.22, Math.abs(Math.cos(spinAngle)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scaleX, 1);

  const grad = ctx.createRadialGradient(-radius * 0.28, -radius * 0.28, radius * 0.12, 0, 0, radius);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.55, '#ffcf4d');
  grad.addColorStop(1, '#d97706');

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1.2, radius * 0.16);
  ctx.strokeStyle = '#ffab00';
  ctx.stroke();

  if (scaleX > 0.36) {
    ctx.fillStyle = '#5c2d00';
    ctx.font = `900 ${Math.round(radius * 1.15)}px "Chakra Petch", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 0, 0.8);
  }
  ctx.restore();
}

function drawFourPointStar(ctx, x, y, radius, rot, colour, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = colour;
  ctx.beginPath();
  const inner = radius * 0.36;
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? radius : inner;
    const a = (i * Math.PI) / 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function stepFrame(now) {
  if (isJuiceDisabled() || !ctxGlobal) {
    clearAllParticles();
    return;
  }

  if (!lastFrameTime) lastFrameTime = now;
  const rawDt = Math.min(0.05, Math.max(0.004, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  const dt = rawDt * getTimeScale();

  ctxGlobal.clearRect(0, 0, widthGlobal, heightGlobal);

  let activeCount = 0;
  const cap = getPoolLimit();

  for (let i = 0; i < cap; i++) {
    const p = particlePool[i];
    if (!p.active) continue;

    if (p.delay > 0) {
      p.delay -= rawDt;
      activeCount++;
      continue;
    }

    p.life += p.kind === 'flycoin' ? rawDt : dt;
    if (p.life >= p.maxLife) {
      if (p.kind === 'flycoin') {
        const target = p.toEl;
        const idx = p.coinIdx;
        const total = p.coinTotal;
        const landCb = p.onLand;
        const landX = p.toX;
        const landY = p.toY;
        p.active = false;
        p.toEl = null;
        p.onLand = null;

        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (target && nowMs - lastPunchAt > 55) {
          lastPunchAt = nowMs;
          punch(target, 1.11);
        }
        haptic('tick');
        try {
          if (typeof sfx?.playCollectCoin === 'function') {
            sfx.playCollectCoin();
          }
        } catch {
          // ignore sound errors
        }
        if (typeof landCb === 'function') landCb(idx, total);
        burst({ x: landX, y: landY, kind: 'ring', count: 1, colour: '#ffcf4d' });
        burst({ x: landX, y: landY, kind: 'spark', count: 4, colour: '#ffcf4d' });
        activeCount++;
        continue;
      }

      p.active = false;
      continue;
    }

    activeCount++;
    const progress = p.life / p.maxLife;
    const alpha = Math.max(0, 1 - Math.pow(progress, 1.45));

    if (p.kind === 'flycoin') {
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const omt = 1 - eased;
      p.x = omt * omt * p.fromX + 2 * omt * eased * p.ctrlX + eased * eased * p.toX;
      p.y = omt * omt * p.fromY + 2 * omt * eased * p.ctrlY + eased * eased * p.toY;
      p.spin += p.vspin * rawDt;
      const flyScale = p.size * (1 - 0.18 * eased);
      drawAmberCoin(ctxGlobal, p.x, p.y, flyScale, p.spin, Math.min(1, alpha + 0.35));
      continue;
    }

    if (p.kind === 'ring') {
      const radius = p.size + p.vx * (1 - Math.pow(1 - progress, 2.2));
      ctxGlobal.save();
      ctxGlobal.globalAlpha = Math.max(0, (1 - progress) * 0.9);
      ctxGlobal.strokeStyle = p.colour;
      ctxGlobal.lineWidth = Math.max(1.5, 4.5 * (1 - progress));
      ctxGlobal.shadowColor = p.colour;
      ctxGlobal.shadowBlur = 12;
      ctxGlobal.beginPath();
      ctxGlobal.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctxGlobal.stroke();
      ctxGlobal.restore();
      continue;
    }

    if (p.kind === 'float') {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.97;
      ctxGlobal.save();
      ctxGlobal.globalAlpha = progress < 0.15 ? progress / 0.15 : Math.max(0, 1 - (progress - 0.15) / 0.85);
      ctxGlobal.font = `800 ${Math.round(p.size)}px "Chakra Petch", system-ui, sans-serif`;
      ctxGlobal.textAlign = 'center';
      ctxGlobal.textBaseline = 'middle';
      ctxGlobal.lineWidth = 4;
      ctxGlobal.strokeStyle = 'rgba(7, 8, 17, 0.9)';
      ctxGlobal.strokeText(p.text, p.x, p.y);
      ctxGlobal.fillStyle = p.colour;
      ctxGlobal.fillText(p.text, p.x, p.y);
      ctxGlobal.restore();
      continue;
    }

    // Physics update for spark, coin, confetti, star
    p.vx += p.ax * dt;
    p.vy += p.ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    p.spin += p.vspin * dt;

    if (p.kind === 'coin') {
      if (!p.bounced && p.y >= p.floorY && p.vy > 0) {
        p.y = p.floorY;
        p.vy = -p.vy * 0.48;
        p.vx *= 0.72;
        p.bounced = true;
      }
      drawAmberCoin(ctxGlobal, p.x, p.y, p.size, p.spin, Math.min(1, alpha * 1.25));
      continue;
    }

    if (p.kind === 'confetti') {
      p.vx *= 0.985;
      const flip = Math.cos(p.spin);
      ctxGlobal.save();
      ctxGlobal.globalAlpha = alpha;
      ctxGlobal.translate(p.x, p.y);
      ctxGlobal.rotate(p.rot);
      ctxGlobal.fillStyle = p.colour;
      ctxGlobal.fillRect(-p.size * 0.55, -p.size * 0.3 * flip, p.size * 1.1, p.size * 0.6);
      ctxGlobal.restore();
      continue;
    }

    if (p.kind === 'star') {
      drawFourPointStar(ctxGlobal, p.x, p.y, p.size * (1 - progress * 0.35), p.rot, p.colour, alpha);
      continue;
    }

    // Default: 'spark'
    ctxGlobal.save();
    ctxGlobal.globalAlpha = alpha;
    ctxGlobal.strokeStyle = p.colour;
    ctxGlobal.fillStyle = p.colour;
    ctxGlobal.lineWidth = Math.max(1.5, p.size * 0.45);
    ctxGlobal.lineCap = 'round';
    ctxGlobal.beginPath();
    ctxGlobal.moveTo(p.x, p.y);
    ctxGlobal.lineTo(p.x - p.vx * 0.032, p.y - p.vy * 0.032);
    ctxGlobal.stroke();
    ctxGlobal.restore();
  }

  if (activeCount > 0) {
    rafId = requestAnimationFrame(stepFrame);
  } else {
    rafId = null;
    lastFrameTime = 0;
  }
}

function ensureLoop() {
  if (rafId !== null || typeof requestAnimationFrame !== 'function') return;
  lastFrameTime = 0;
  rafId = requestAnimationFrame(stepFrame);
}

/**
 * Spawn pooled canvas particles at viewport coordinates (x, y).
 * @param {object} opts
 * @param {number} opts.x
 * @param {number} opts.y
 * @param {'spark'|'coin'|'confetti'|'star'|'ring'|'float'} [opts.kind]
 * @param {number} [opts.count]
 * @param {string} [opts.colour]
 * @param {string} [opts.text]
 */
// eslint-disable-next-line react-refresh/only-export-components
export function burst({
  x,
  y,
  kind = 'spark',
  count = 16,
  colour = '#00f3ff',
  text = ''
} = {}) {
  if (isJuiceDisabled() || !ctxGlobal) return false;

  const vw = widthGlobal || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const vh = heightGlobal || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const cx = Number.isFinite(x) ? x : vw * 0.5;
  const cy = Number.isFinite(y) ? y : vh * 0.45;
  const lite = isLiteMode();

  if (kind === 'ring') {
    const p = allocSlot();
    p.active = true;
    p.kind = 'ring';
    p.x = cx;
    p.y = cy;
    p.vx = Math.max(54, Number(count) > 1 ? 82 : 64);
    p.vy = 0;
    p.ax = 0;
    p.ay = 0;
    p.size = 8;
    p.life = 0;
    p.maxLife = 0.42;
    p.delay = 0;
    p.colour = colour;
    ensureLoop();
    return true;
  }

  if (kind === 'float') {
    const labelText = String(text || colour || '+M$1.00');
    const fill = text ? colour : '#ffcf4d';
    const p = allocSlot();
    p.active = true;
    p.kind = 'float';
    p.x = cx;
    p.y = cy;
    p.vx = (Math.random() - 0.5) * 14;
    p.vy = -78;
    p.ax = 0;
    p.ay = 0;
    p.size = 18;
    p.life = 0;
    p.maxLife = 0.95;
    p.delay = 0;
    p.colour = fill;
    p.text = labelText;
    ensureLoop();
    return true;
  }

  const requested = Math.max(1, Math.min(lite ? 24 : 60, Math.round(Number(count) || 16)));
  const total = lite ? Math.max(1, Math.ceil(requested * 0.45)) : requested;

  for (let i = 0; i < total; i++) {
    const p = allocSlot();
    const angle = (Math.PI * 2 * i) / total + (Math.random() - 0.5) * 0.45;
    p.active = true;
    p.kind = kind;
    p.x = cx + (Math.random() - 0.5) * 8;
    p.y = cy + (Math.random() - 0.5) * 8;
    p.delay = 0;
    p.life = 0;
    p.bounced = false;
    p.toEl = null;
    p.onLand = null;

    if (kind === 'coin') {
      const speed = 130 + Math.random() * 190;
      p.vx = Math.cos(angle) * speed * 0.72;
      p.vy = -170 - Math.random() * 210;
      p.ax = 0;
      p.ay = 960;
      p.size = 9 + Math.random() * 3.5;
      p.spin = Math.random() * Math.PI;
      p.vspin = 10 + Math.random() * 8;
      p.rot = 0;
      p.vrot = 0;
      p.floorY = Math.min(vh - 18, cy + 88 + Math.random() * 68);
      p.maxLife = 1.05 + Math.random() * 0.25;
      p.colour = '#ffcf4d';
    } else if (kind === 'confetti') {
      const speed = 120 + Math.random() * 240;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 150;
      p.ax = (Math.random() - 0.5) * 40;
      p.ay = 420;
      p.size = 7 + Math.random() * 5;
      p.rot = Math.random() * Math.PI * 2;
      p.vrot = (Math.random() - 0.5) * 10;
      p.spin = Math.random() * Math.PI * 2;
      p.vspin = 8 + Math.random() * 7;
      p.maxLife = 0.9 + Math.random() * 0.45;
      p.colour = colour && colour !== '#00f3ff' && i % 3 === 0
        ? colour
        : CONFETTI_PALETTE[i % CONFETTI_PALETTE.length];
    } else if (kind === 'star') {
      const speed = 90 + Math.random() * 170;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 40;
      p.ax = 0;
      p.ay = 140;
      p.size = 6 + Math.random() * 5;
      p.rot = Math.random() * Math.PI;
      p.vrot = (Math.random() - 0.5) * 6;
      p.spin = 0;
      p.vspin = 0;
      p.maxLife = 0.58 + Math.random() * 0.28;
      p.colour = colour && i % 2 === 0 ? colour : STAR_PALETTE[i % STAR_PALETTE.length];
    } else {
      // 'spark'
      const speed = 150 + Math.random() * 250;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.ax = 0;
      p.ay = 260;
      p.size = 3.2 + Math.random() * 2.4;
      p.rot = 0;
      p.vrot = 0;
      p.spin = 0;
      p.vspin = 0;
      p.maxLife = 0.36 + Math.random() * 0.22;
      p.colour = colour;
    }
  }

  ensureLoop();
  return true;
}

/**
 * Fly curved coins from win source to the wallet badge; wallet punches & ticks as each coin lands.
 * @param {object} opts
 * @param {Element|{x:number,y:number}} [opts.fromEl]
 * @param {Element} [opts.toEl]
 * @param {number} [opts.count]
 * @param {function} [opts.onLand]
 */
// eslint-disable-next-line react-refresh/only-export-components
export function coinsTo({ fromEl, toEl, count = 8, onLand } = {}) {
  if (isJuiceDisabled() || !ctxGlobal) return false;

  const vw = widthGlobal || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const vh = heightGlobal || (typeof window !== 'undefined' ? window.innerHeight : 800);

  let fromX = vw * 0.5;
  let fromY = vh * 0.45;
  if (fromEl && typeof fromEl.getBoundingClientRect === 'function') {
    const r = fromEl.getBoundingClientRect();
    fromX = r.left + r.width / 2;
    fromY = r.top + r.height / 2;
  } else if (fromEl && Number.isFinite(fromEl.x) && Number.isFinite(fromEl.y)) {
    fromX = fromEl.x;
    fromY = fromEl.y;
  }

  const resolvedTarget =
    toEl || (typeof document !== 'undefined' ? document.querySelector('[data-tm-wallet="true"]') : null);
  let toX = vw - 76;
  let toY = 34;
  if (resolvedTarget && typeof resolvedTarget.getBoundingClientRect === 'function') {
    const tr = resolvedTarget.getBoundingClientRect();
    toX = tr.left + tr.width / 2;
    toY = tr.top + tr.height / 2;
  }

  const total = Math.max(1, Math.min(isLiteMode() ? 8 : 20, Math.round(Number(count) || 8)));
  for (let i = 0; i < total; i++) {
    const p = allocSlot();
    p.active = true;
    p.kind = 'flycoin';
    p.fromX = fromX + (Math.random() - 0.5) * 18;
    p.fromY = fromY + (Math.random() - 0.5) * 14;
    p.toX = toX;
    p.toY = toY;
    const archSpread = (i % 2 === 0 ? 1 : -1) * (48 + Math.random() * 58);
    p.ctrlX = (fromX + toX) * 0.5 + archSpread;
    p.ctrlY = Math.min(fromY, toY) - 65 - Math.random() * 55;
    p.x = p.fromX;
    p.y = p.fromY;
    p.size = 10;
    p.spin = i * 0.6;
    p.vspin = 11;
    p.life = 0;
    p.maxLife = 0.56 + Math.random() * 0.14;
    p.delay = i * 0.045;
    p.toEl = resolvedTarget;
    p.onLand = onLand || null;
    p.coinIdx = i;
    p.coinTotal = total;
  }

  ensureLoop();
  return true;
}

export default function JuiceLayer() {
  const localRef = useRef(null);

  useEffect(() => {
    const canvas = localRef.current;
    if (!canvas) return undefined;

    canvasRefGlobal = canvas;
    ctxGlobal = canvas.getContext('2d');

    const resize = () => {
      if (!canvasRefGlobal) return;
      widthGlobal = window.innerWidth;
      heightGlobal = window.innerHeight;
      dprGlobal = Math.min(2, window.devicePixelRatio || 1);
      canvasRefGlobal.width = Math.max(1, Math.round(widthGlobal * dprGlobal));
      canvasRefGlobal.height = Math.max(1, Math.round(heightGlobal * dprGlobal));
      if (ctxGlobal) {
        ctxGlobal.setTransform(dprGlobal, 0, 0, dprGlobal, 0, 0);
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    const unsubSettings = subscribeSettings(() => {
      if (isJuiceDisabled()) {
        clearAllParticles();
      }
    });

    return () => {
      window.removeEventListener('resize', resize);
      unsubSettings();
      clearAllParticles();
      canvasRefGlobal = null;
      ctxGlobal = null;
    };
  }, []);

  return (
    <canvas
      ref={localRef}
      className="tm-juice-layer"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9998
      }}
    />
  );
}
