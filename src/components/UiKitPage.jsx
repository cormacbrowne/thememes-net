import { useEffect, useRef, useState } from 'react';
import NeonSign from './NeonSign';
import { Money, Wallet } from './ui/Money';
import JuiceLayer, { burst, coinsTo } from './ui/JuiceLayer';
import {
  countUp,
  flash,
  getTimeScale,
  haptic,
  hitStop,
  punch,
  shake,
  slowMo
} from '../utils/juice';
import { applySettingsToRuntime, getSettings, updateSettings } from '../utils/settingsStore';
import { formatMoney } from '../utils/tokenEconomy';

const PALETTE = [
  { name: '--tm-night-0', hex: '#07060f', job: 'Page background' },
  { name: '--tm-night-1', hex: '#110d22', job: 'Cards' },
  { name: '--tm-night-2', hex: '#1b1536', job: 'Raised sheets / cabinets' },
  { name: '--tm-night-3', hex: '#2c2452', job: 'Border / unlit glass' },
  { name: '--tm-pink', hex: '#ff2e88', job: 'Primary CTA (1 per screen)' },
  { name: '--tm-cyan', hex: '#19f0ff', job: 'Nav, links, selected, focus' },
  { name: '--tm-amber', hex: '#ffb800', job: 'Money & wins only' },
  { name: '--tm-uv', hex: '#8a3dff', job: 'Ambient glow only' },
  { name: '--tm-text', hex: '#f4f1ff', job: 'Body text' },
  { name: '--tm-text-dim', hex: '#a59fc4', job: 'Secondary text' },
  { name: '--tm-ok', hex: '#3dff9a', job: 'Upvote / success mark' },
  { name: '--tm-danger', hex: '#ff4d5e', job: 'Report / delete mark' }
];

export default function UiKitPage() {
  const [sampleTokens, setSampleTokens] = useState(20);
  const [reducedMotionOn, setReducedMotionOn] = useState(() => getSettings().reducedMotion === 'on');
  const stageRef = useRef(null);
  const counterRef = useRef(null);
  const scaleRef = useRef(null);
  const spinnerRef = useRef(null);
  const walletBoxRef = useRef(null);

  useEffect(() => {
    document.title = 'UI Kit (/__ui) · THE MEMES.net';
    applySettingsToRuntime(getSettings());
  }, []);

  useEffect(() => {
    let raf = 0;
    let angle = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const scale = getTimeScale();
      if (!reducedMotionOn) {
        angle = (angle + dt * 140 * scale) % 360;
        if (spinnerRef.current) {
          spinnerRef.current.style.transform = `rotate(${angle.toFixed(1)}deg)`;
        }
      }
      if (scaleRef.current) {
        scaleRef.current.textContent = `${scale.toFixed(2)}×`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotionOn]);

  const toggleReducedMotion = () => {
    const nextOn = !reducedMotionOn;
    setReducedMotionOn(nextOn);
    updateSettings({ reducedMotion: nextOn ? 'on' : 'off' });
  };

  const getStageOrigin = () => {
    const r = stageRef.current?.getBoundingClientRect?.();
    if (!r) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--tm-night-0)',
        color: 'var(--tm-text)',
        padding: '24px 16px 64px',
        maxWidth: '860px',
        margin: '0 auto',
        display: 'grid',
        gap: '28px'
      }}
    >
      <header>
        <h1 className="ui-tube ui-tube--cyan ui-tube-text" style={{ fontSize: 'var(--tm-text-2xl)', margin: 0 }}>
          THE MEMES.net UI KIT
        </h1>
        <p style={{ color: 'var(--tm-text-dim)', marginTop: '8px' }}>
          Dev-only primitive showcase (Phase 35.2 / 34.3). Not shipped in production builds.
        </p>
      </header>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: '0 0 14px' }}>
          0. NeonSign (hero / nav / icon)
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <NeonSign size="hero" />
          <NeonSign size="nav" />
          <NeonSign size="icon" />
        </div>
      </section>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: '0 0 14px' }}>
          1. Tube Boxes (Lit &amp; Unlit)
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <button type="button" className="ui-tube ui-tube--pink ui-tube-box ui-tube-box--solid ui-flicker-on" style={{ '--ui-stagger': 0 }}>
            Make a meme
          </button>
          <button type="button" className="ui-tube ui-tube--pink ui-tube-box ui-flicker-on" style={{ '--ui-stagger': 1 }}>
            Pink Outline
          </button>
          <button type="button" className="ui-tube ui-tube--cyan ui-tube-box ui-flicker-on" style={{ '--ui-stagger': 2 }}>
            Play (Selected)
          </button>
          <button type="button" className="ui-tube ui-tube--amber ui-tube-box ui-flicker-on" style={{ '--ui-stagger': 3 }}>
            Collect M$2.50
          </button>
          <button type="button" className="ui-tube ui-tube-box ui-tube-box--off">
            Unlit Tab
          </button>
          <button type="button" className="ui-tube ui-tube-box" disabled>
            Disabled
          </button>
        </div>
      </section>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: '0 0 14px' }}>
          2. Tube Text &amp; Rules
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'baseline' }}>
          <span className="ui-tube ui-tube--pink ui-tube-text" style={{ fontSize: 'var(--tm-text-xl)' }}>JACKPOT</span>
          <span className="ui-tube ui-tube--cyan ui-tube-text" style={{ fontSize: 'var(--tm-text-xl)' }}>ARCADE</span>
          <span className="ui-tube ui-tube--amber ui-tube-text" style={{ fontSize: 'var(--tm-text-xl)' }}>M$5.00</span>
          <span style={{ fontFamily: 'var(--tm-font-arcade)', fontSize: 'var(--tm-text-xs)', color: 'var(--tm-amber)' }}>INSERT COIN</span>
        </div>
        <hr className="ui-tube ui-tube--cyan ui-tube-rule ui-tube-rule--flow" />
        <hr className="ui-tube ui-tube--pink ui-tube-rule" />
      </section>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: '0 0 14px' }}>
          2b. One Money &amp; One Wallet (35.5b)
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <Wallet tokens={sampleTokens} centz={6} size="md" onClick={() => setSampleTokens((t) => t + 5)} />
          <Wallet tokens={sampleTokens} centz={0} size="sm" />
          <Money tokens={1} />
          <Money tokens={5} />
          <Money tokens={4000} compact />
          <Money tokens={10} sign />
          <Money tokens={0} zero="balance" />
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() => setSampleTokens((t) => (t === 20 ? 60 : 20))}
          >
            Toggle M$5.06 / M$15.06
          </button>
        </div>
      </section>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: 0 }}>
            4. Juice (35.6)
          </h2>
          <button
            type="button"
            data-testid="juice-reduced-motion-toggle"
            className={`ui-tube ${reducedMotionOn ? 'ui-tube--pink' : 'ui-tube--cyan'} ui-tube-box`}
            onClick={toggleReducedMotion}
          >
            Reduced Motion: {reducedMotionOn ? 'ON (All No-Op)' : 'OFF'}
          </button>
        </div>

        <div
          ref={stageRef}
          data-testid="juice-stage"
          style={{
            position: 'relative',
            background: 'var(--tm-night-2)',
            border: '1px solid var(--tm-night-3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              ref={spinnerRef}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '2px solid var(--tm-cyan)',
                background: 'rgba(25, 240, 255, 0.14)'
              }}
            />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--tm-text-dim)' }}>Counter &amp; Time Scale</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <strong ref={counterRef} data-testid="juice-counter" style={{ fontSize: '20px', color: 'var(--tm-amber)' }}>
                  0¢
                </strong>
                <span ref={scaleRef} data-testid="juice-timescale" style={{ fontSize: '13px', color: 'var(--tm-cyan)' }}>
                  1.00×
                </span>
              </div>
            </div>
          </div>
          <span ref={walletBoxRef} style={{ display: 'inline-flex' }}>
            <Wallet tokens={sampleTokens} centz={6} size="md" />
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button type="button" className="ui-tube ui-tube--cyan ui-tube-box" onClick={(e) => { if (haptic('tap')) punch(e.currentTarget); }}>
            haptic(&apos;tap&apos;)
          </button>
          <button type="button" className="ui-tube ui-tube--amber ui-tube-box" onClick={(e) => { if (haptic('jackpot')) punch(e.currentTarget); }}>
            haptic(&apos;jackpot&apos;)
          </button>
          <button type="button" className="ui-tube ui-tube--pink ui-tube-box" onClick={() => shake(stageRef.current, 4)}>
            shake(4)
          </button>
          <button type="button" className="ui-tube ui-tube--cyan ui-tube-box" onClick={(e) => { punch(e.currentTarget, 1.16); punch(stageRef.current, 1.05); }}>
            punch
          </button>
          <button type="button" className="ui-tube ui-tube--amber ui-tube-box" onClick={async () => { const fired = await hitStop(100); if (fired) punch(stageRef.current, 1.12); }}>
            hitStop(100)
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() => countUp(counterRef.current, 0, 250, { ms: 700, format: (v) => formatMoney(Math.round(v)) })}
          >
            countUp
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--pink ui-tube-box"
            onClick={() => flash(stageRef.current, 'rgba(255, 46, 136, 0.38)', 160)}
          >
            flash
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--cyan ui-tube-box"
            onClick={() => slowMo(0.25, 1100)}
          >
            slowMo
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--cyan ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'spark', count: 18, colour: '#19f0ff' })}
          >
            burst: spark
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'coin', count: 12 })}
          >
            burst: coin
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--pink ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'confetti', count: 24 })}
          >
            burst: confetti
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'star', count: 16 })}
          >
            burst: star
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--cyan ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'ring', colour: '#ff2e88' })}
          >
            burst: ring
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() => burst({ ...getStageOrigin(), kind: 'float', text: '+M$2.50', colour: '#ffcf4d' })}
          >
            burst: float
          </button>
          <button
            type="button"
            className="ui-tube ui-tube--amber ui-tube-box"
            onClick={() =>
              coinsTo({
                fromEl: stageRef.current,
                toEl:
                  walletBoxRef.current?.querySelector?.('[data-tm-wallet="true"]') ||
                  walletBoxRef.current,
                count: 6,
                onLand: (idx, total) => {
                  if (idx === total - 1) setSampleTokens((t) => t + 4);
                }
              })
            }
          >
            coinsTo(wallet)
          </button>
        </div>
      </section>

      <section style={{ background: 'var(--tm-night-1)', border: '1px solid var(--tm-night-3)', borderRadius: 'var(--tm-radius-card)', padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--tm-text-sm)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--tm-text-dim)', margin: '0 0 14px' }}>
          5. Phase 35 Palette
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
          {PALETTE.map((c) => (
            <div key={c.name} style={{ border: '1px solid var(--tm-night-3)', borderRadius: '10px', overflow: 'hidden', background: 'var(--tm-night-2)' }}>
              <div style={{ height: '38px', background: c.hex }} />
              <div style={{ padding: '8px', fontSize: '12px' }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: 'var(--tm-text-dim)' }}>{c.hex} · {c.job}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <JuiceLayer />
    </main>
  );
}
