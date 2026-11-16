import { useEffect } from 'react';
import NeonSign from './NeonSign';

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
  useEffect(() => {
    document.title = 'UI Kit (/__ui) · THE MEMES.net';
  }, []);

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
          3. Phase 35 Palette
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
    </main>
  );
}
