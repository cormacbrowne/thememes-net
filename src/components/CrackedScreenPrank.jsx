import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../utils/analytics';
import { sfx } from '../utils/soundEngine';
import { haptic, isJuiceDisabled } from '../utils/juice';
import './CrackedScreenPrank.css';

/**
 * Owner brief 18 Nov 2026 (item 5): a fake smashed phone / tablet screen with sparks shorting
 * out inside the glass. Shown full screen on the real device, so it looks like *its* screen broke.
 *
 * - A generic lock screen (live clock, wallpaper) sits behind the glass. No brand logos.
 * - Cracks are generated: jagged radial lines from an impact point, spider-web rings between
 *   them and a shattered core. Every tap adds a fresh impact where you tapped.
 * - LCD damage: an ink bleed blot, dead pixel columns and a jittering glitch band.
 * - Sparks: a canvas of hot particles spitting from the cracks, plus a blue electric arc now and
 *   then. Never more than ~2 flashes a second. Reduced motion / Calm / lite mode = static cracks.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build one impact: radial jagged lines, web rings, shard polygons. Coordinates in px. */
function buildImpact(cx, cy, w, h, seed, scale = 1) {
  const rand = mulberry32(seed);
  const reach = Math.hypot(w, h) * (0.55 + rand() * 0.35) * scale;
  const spokes = 11 + Math.floor(rand() * 7);
  const radials = [];
  for (let i = 0; i < spokes; i += 1) {
    let ang = (i / spokes) * Math.PI * 2 + (rand() - 0.5) * 0.45;
    const len = reach * (0.35 + rand() * 0.75);
    const pts = [[cx, cy]];
    let x = cx;
    let y = cy;
    let travelled = 0;
    while (travelled < len) {
      const step = 12 + rand() * 34;
      ang += (rand() - 0.5) * 0.42;
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      travelled += step;
      pts.push([x, y]);
    }
    radials.push(pts);
  }

  const lines = radials.map((pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(''));

  // Branches off the radials
  const branches = [];
  radials.forEach((pts) => {
    const count = Math.floor(rand() * 3);
    for (let b = 0; b < count; b += 1) {
      const start = pts[1 + Math.floor(rand() * Math.max(1, pts.length - 2))];
      if (!start) continue;
      let ang = rand() * Math.PI * 2;
      let [x, y] = start;
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const segs = 2 + Math.floor(rand() * 5);
      for (let s = 0; s < segs; s += 1) {
        ang += (rand() - 0.5) * 0.7;
        const step = 10 + rand() * 26;
        x += Math.cos(ang) * step;
        y += Math.sin(ang) * step;
        d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      branches.push(d);
    }
  });

  // Spider-web rings: join neighbouring spokes at a few distances
  const rings = [];
  const ringFracs = [0.05, 0.11, 0.2, 0.33].map((f) => f * scale);
  ringFracs.forEach((frac) => {
    const r = reach * frac;
    let d = '';
    radials.forEach((pts, i) => {
      if (rand() < 0.22) return;
      const next = radials[(i + 1) % radials.length];
      const a = pointAtDistance(pts, r * (0.85 + rand() * 0.3));
      const bpt = pointAtDistance(next, r * (0.85 + rand() * 0.3));
      if (!a || !bpt) return;
      const mx = (a[0] + bpt[0]) / 2 + (rand() - 0.5) * 8;
      const my = (a[1] + bpt[1]) / 2 + (rand() - 0.5) * 8;
      d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${mx.toFixed(1)} ${my.toFixed(1)}L${bpt[0].toFixed(1)} ${bpt[1].toFixed(1)}`;
    });
    if (d) rings.push(d);
  });

  // Shattered core: small bright shards around the hit
  const shards = [];
  const shardCount = 9 + Math.floor(rand() * 6);
  for (let i = 0; i < shardCount; i += 1) {
    const a0 = rand() * Math.PI * 2;
    const r0 = 4 + rand() * 26 * scale;
    const px = cx + Math.cos(a0) * r0;
    const py = cy + Math.sin(a0) * r0;
    const s = 5 + rand() * 12 * scale;
    const pts = [0, 1, 2].map((k) => {
      const ang = a0 + k * 2.1 + (rand() - 0.5);
      return `${(px + Math.cos(ang) * s).toFixed(1)},${(py + Math.sin(ang) * s).toFixed(1)}`;
    });
    shards.push({ points: pts.join(' '), o: 0.08 + rand() * 0.22 });
  }

  // Points the sparks spit from: along the first part of each radial
  const sparkPoints = [];
  radials.forEach((pts) => {
    for (let i = 1; i < Math.min(pts.length, 6); i += 1) sparkPoints.push(pts[i]);
  });

  // Owner brief 18 Nov 2026: a hole where the glass and screen have fallen out, showing the
  // circuit board with a couple of chips arcing. Bigger for the first impact than for taps.
  const holeR = (scale >= 1 ? 92 : 40) * Math.max(0.8, Math.min(1.4, scale));
  const holeN = 20;
  const hole = [];
  for (let i = 0; i < holeN; i += 1) {
    const ang = (i / holeN) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const r = holeR * (i % 2 ? 0.5 + rand() * 0.25 : 0.8 + rand() * 0.45);
    hole.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  const holePoints = hole.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const chipCount = scale >= 1 ? 3 : 1;
  const chips = [];
  for (let i = 0; i < chipCount; i += 1) {
    const ang = rand() * Math.PI * 2;
    const r = holeR * (i === 0 ? 0.1 : 0.36 + rand() * 0.12);
    const cw = (i === 0 ? 40 : 22) * Math.min(1.2, Math.max(0.7, scale));
    chips.push({
      x: cx + Math.cos(ang) * r,
      y: cy + Math.sin(ang) * r,
      w: cw,
      h: cw * (i === 0 ? 1 : 0.7),
      rot: Math.round((rand() - 0.5) * 30),
      label: ['A19', 'PMU', 'NAND', 'RF', 'U2'][Math.floor(rand() * 5)],
      arc: i < 2
    });
  }
  const chipPoints = chips.filter((c) => c.arc).map((c) => [c.x, c.y]);

  return { id: seed, cx, cy, lines, branches, rings, shards, sparkPoints, radials, holePoints, chips, chipPoints };
}

function pointAtDistance(pts, dist) {
  let travelled = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (travelled + seg >= dist) {
      const t = (dist - travelled) / seg;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    travelled += seg;
  }
  return null;
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 390,
    h: typeof window !== 'undefined' ? window.innerHeight : 844
  }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function CrackedScreenPrank({ device = 'phone' }) {
  const isTablet = device === 'tablet';
  useEffect(() => {
    track('prank_opened', { prank: isTablet ? 'cracked_ipad' : 'cracked_iphone' });
  }, [isTablet]);
  const { w, h } = useViewportSize();
  const now = useClock();
  const canvasRef = useRef(null);
  const impactsRef = useRef([]);
  const burstRef = useRef(null);
  const [motionOff] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (
      isJuiceDisabled() ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('tm-lite-perf')
    );
  });

  const firstImpact = useMemo(() => {
    // iPhone: hit low on the right like a dropped corner. iPad: off-centre upper left.
    const ix = isTablet ? w * 0.66 : w * 0.72;
    const iy = isTablet ? h * 0.6 : h * 0.74;
    return buildImpact(ix, iy, w, h, isTablet ? 2061 : 1717, isTablet ? 1.1 : 1);
  }, [w, h, isTablet]);

  const [extraImpacts, setExtraImpacts] = useState([]);

  // Black browser bars / status bar while the prank runs, so whatever chrome Safari keeps blends in.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    meta?.setAttribute('content', '#000000');
    const prevBg = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#000';
    return () => {
      if (meta && prev) meta.setAttribute('content', prev);
      document.documentElement.style.backgroundColor = prevBg;
    };
  }, []);
  const impacts = useMemo(() => [firstImpact, ...extraImpacts], [firstImpact, extraImpacts]);

  useEffect(() => {
    impactsRef.current = impacts;
  }, [impacts]);

  // ---------- Sparks & arcs on a canvas ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || motionOff) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles = [];
    let arc = null;
    let raf = 0;
    let last = performance.now();
    let nextBurst = last + 400;
    let nextArc = last + 1600;

    const emit = (x, y, n, power = 1) => {
      for (let i = 0; i < n; i += 1) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (60 + Math.random() * 260) * power;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 60 * power,
          life: 0,
          max: 0.35 + Math.random() * 0.6,
          size: 0.8 + Math.random() * 1.8
        });
      }
      if (particles.length > 420) particles.splice(0, particles.length - 420);
    };

    const randomSparkPoint = () => {
      const list = impactsRef.current;
      const imp = list[Math.floor(Math.random() * list.length)];
      if (imp?.chipPoints?.length && Math.random() < 0.6) {
        const c = imp.chipPoints[Math.floor(Math.random() * imp.chipPoints.length)];
        return [c[0] + (Math.random() - 0.5) * 10, c[1] + (Math.random() - 0.5) * 10];
      }
      if (!imp?.sparkPoints.length) return null;
      return imp.sparkPoints[Math.floor(Math.random() * imp.sparkPoints.length)];
    };

    burstRef.current = (x, y) => emit(x, y, 70, 1.5);

    const makeArc = () => {
      const first = impactsRef.current[0];
      if (first?.chipPoints?.length >= 2 && Math.random() < 0.65) {
        const [p, q] = first.chipPoints;
        return { a: p, b: q, life: 0, max: 0.2 + Math.random() * 0.2 };
      }
      const a = randomSparkPoint();
      if (!a) return null;
      const ang = Math.random() * Math.PI * 2;
      const len = 30 + Math.random() * 90;
      const b = [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len];
      return { a, b, life: 0, max: 0.22 + Math.random() * 0.18 };
    };

    const drawArc = (ar) => {
      const segs = 9;
      ctx.beginPath();
      ctx.moveTo(ar.a[0], ar.a[1]);
      for (let i = 1; i < segs; i += 1) {
        const t = i / segs;
        const x = ar.a[0] + (ar.b[0] - ar.a[0]) * t + (Math.random() - 0.5) * 16;
        const y = ar.a[1] + (ar.b[1] - ar.a[1]) * t + (Math.random() - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(ar.b[0], ar.b[1]);
      ctx.strokeStyle = 'rgba(160, 220, 255, 0.95)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#7fd4ff';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (t >= nextBurst) {
        const p = randomSparkPoint();
        if (p) emit(p[0], p[1], 8 + Math.floor(Math.random() * 22));
        nextBurst = t + 450 + Math.random() * 1600;
      }
      if (!arc && t >= nextArc) {
        arc = makeArc();
        nextArc = t + 1400 + Math.random() * 3200;
        if (arc) emit(arc.b[0], arc.b[1], 14, 0.8);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += 520 * dt;
        p.vx *= 0.985;
        const px = p.x;
        const py = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.life / p.max;
        ctx.strokeStyle = `rgba(255, ${Math.round(150 + 105 * k)}, ${Math.round(60 * k)}, ${k})`;
        ctx.lineWidth = p.size * (0.6 + k);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      if (arc) {
        arc.life += dt;
        if (arc.life >= arc.max) arc = null;
        else drawArc(arc);
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === 'hidden') cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      burstRef.current = null;
    };
  }, [w, h, motionOff]);

  const handleTap = useCallback(
    (e) => {
      const x = e.clientX ?? w / 2;
      const y = e.clientY ?? h / 2;
      sfx.playJellyShatter?.();
      haptic('big');
      burstRef.current?.(x, y);
      setExtraImpacts((prev) => {
        if (prev.length >= 6) return prev;
        return [...prev, buildImpact(x, y, w, h, Math.floor(Math.random() * 1e9), 0.55)];
      });
    },
    [w, h]
  );

  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
  const dateStr = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div
      className={`tm-crack ${isTablet ? 'is-tablet' : 'is-phone'} ${motionOff ? 'is-still' : ''}`}
      onPointerUp={handleTap}
      role="img"
      aria-label="Prank: a smashed device screen with sparks. Tap to crack it more."
    >
      {/* Lock screen behind the glass */}
      <div className="tm-crack-wallpaper" />
      <div className="tm-crack-lock">
        <div className="tm-crack-date">{dateStr}</div>
        <div className="tm-crack-time">{timeStr}</div>
      </div>
      <div className="tm-crack-lock-foot">
        <span className="tm-crack-round" />
        <span className="tm-crack-round" />
      </div>
      <div className="tm-crack-homebar" />

      {/* LCD damage */}
      <div
        className="tm-crack-ink"
        style={{ left: firstImpact.cx, top: firstImpact.cy }}
      />
      <div className="tm-crack-deadline" style={{ left: `${(isTablet ? 0.61 : 0.23) * 100}%` }} />
      <div className="tm-crack-deadline is-green" style={{ left: `${(isTablet ? 0.78 : 0.81) * 100}%` }} />
      <div className="tm-crack-band" style={{ top: `${(isTablet ? 0.44 : 0.31) * 100}%` }} />

      {/* Glass */}
      <svg className="tm-crack-glass" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <defs>
          <pattern id="tm-pcb" width="90" height="90" patternUnits="userSpaceOnUse">
            <rect width="90" height="90" fill="#0a3a22" />
            <path
              d="M0 12 H34 L44 22 H90 M8 0 V30 L18 40 V90 M60 0 V18 L70 28 V58 L82 70 H90 M0 64 H24 L34 74 H54 V90 M40 38 H58 L66 46"
              stroke="#c9a640"
              strokeWidth="1.4"
              fill="none"
              opacity="0.85"
            />
            <path d="M0 48 H14 M74 0 V10 M50 52 V64 M28 84 H40" stroke="#6fbf73" strokeWidth="0.8" opacity="0.6" />
            {[[34, 12], [8, 30], [70, 58], [24, 64], [58, 38], [44, 22]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#0a3a22" stroke="#e2c15a" strokeWidth="1.2" />
            ))}
            <rect x="48" y="66" width="10" height="5" fill="#2b2b2b" />
            <rect x="12" y="44" width="6" height="3" fill="#8a6d3b" />
            <rect x="76" y="34" width="4" height="8" fill="#555" />
          </pattern>
          <radialGradient id="tm-hole-shade">
            <stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
          </radialGradient>
          <mask id="tm-glass-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
            <rect width={w} height={h} fill="#fff" />
            {impacts.map((imp) => (
              <polygon key={imp.id} points={imp.holePoints} fill="#000" />
            ))}
          </mask>
        </defs>
        {impacts.map((imp) => (
          <g key={`hole-${imp.id}`} className="tm-crack-hole">
            <polygon points={imp.holePoints} fill="url(#tm-pcb)" />
            <polygon points={imp.holePoints} fill="url(#tm-hole-shade)" />
            {imp.chips.map((c, i) => (
              <g
                key={i}
                transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.rot})`}
                className={c.arc ? 'tm-crack-chip is-arcing' : 'tm-crack-chip'}
                style={{ animationDelay: `${i * 0.9}s` }}
              >
                <rect x={-c.w / 2 - 3} y={-c.h / 2 - 3} width={c.w + 6} height={c.h + 6} fill="none" stroke="#b8b8b8" strokeWidth="1.2" strokeDasharray="1.5 2" />
                <rect x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx="1.5" fill="#141414" stroke="#333" />
                <circle cx={-c.w / 2 + 3} cy={-c.h / 2 + 3} r="1.2" fill="#555" />
                <text x="0" y="2" textAnchor="middle" fontSize={Math.max(4, c.w / 5)} fill="#9a9a9a" fontFamily="monospace">
                  {c.label}
                </text>
                {c.arc && <circle className="tm-crack-chip-glow" r={c.w * 0.45} fill="rgba(255,190,90,0.0)" />}
              </g>
            ))}
            <polygon points={imp.holePoints} fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="3.5" />
            <polygon points={imp.holePoints} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.9" />
          </g>
        ))}
        <g mask="url(#tm-glass-mask)">
        {impacts.map((imp) => (
          <g key={imp.id}>
            {imp.shards.map((s, i) => (
              <polygon key={i} points={s.points} fill={`rgba(255,255,255,${s.o})`} stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
            ))}
            <g className="tm-crack-shadow">
              {imp.lines.map((d, i) => (
                <path key={`sl${i}`} d={d} />
              ))}
              {imp.rings.map((d, i) => (
                <path key={`sr${i}`} d={d} />
              ))}
            </g>
            <g className="tm-crack-line">
              {imp.lines.map((d, i) => (
                <path key={`l${i}`} d={d} />
              ))}
              {imp.branches.map((d, i) => (
                <path key={`b${i}`} d={d} className="is-thin" />
              ))}
              {imp.rings.map((d, i) => (
                <path key={`r${i}`} d={d} className="is-thin" />
              ))}
            </g>
          </g>
        ))}
        </g>
      </svg>

      <canvas ref={canvasRef} className="tm-crack-sparks" style={{ width: w, height: h }} aria-hidden="true" />
      <div className="tm-crack-flicker" aria-hidden="true" />
    </div>
  );
}
