import { useEffect, useState } from 'react';
import {
  fetchCaptionHallOfFame,
  getTemplateById,
  isActiveCaptionKing
} from '../utils/dailyCaptionBattle';
import './HallOfFamePage.css';

export default function HallOfFamePage() {
  const [state, setState] = useState({ loading: true, winners: [], activeKings: [], error: '' });

  useEffect(() => {
    let active = true;
    fetchCaptionHallOfFame(50).then((res) => {
      if (!active) return;
      setState({
        loading: false,
        winners: res.winners || [],
        activeKings: res.activeKings || [],
        error: res.ok ? '' : 'Could not load Hall of Fame archive right now.'
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="tm-hof-page">
      <div className="tm-hof-shell">
        <div className="tm-hof-topbar">
          <a href="/" className="tm-hof-back">
            ← Back to Memes &amp; Arcade
          </a>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href="/games" className="tm-hof-back">
              🕹️ Cyber-Arcade
            </a>
            <a href="/rules" className="tm-hof-back">
              🛡️ House Rules
            </a>
          </div>
        </div>

        <header className="tm-hof-hero">
          <h1>👑 Caption King Hall of Fame</h1>
          <p>
            Permanent archive of every Daily Caption Battle champion. Each daily winner wears the{' '}
            <strong style={{ color: 'var(--tm-amber)' }}>👑 Caption King frame for 24 hours</strong> across their memes and
            profile card, and stays immortalized here forever.
          </p>
        </header>

        {state.loading ? (
          <div className="tm-hof-empty">⏳ Loading Hall of Fame archive…</div>
        ) : state.error ? (
          <div className="tm-hof-empty">⚠️ {state.error}</div>
        ) : state.winners.length === 0 ? (
          <div className="tm-hof-empty" data-testid="hof-empty-state">
            <h2 style={{ margin: '0 0 8px', color: 'var(--tm-amber)' }}>🏆 First Caption King Awaits</h2>
            <p style={{ margin: '0 0 14px' }}>
              No Daily Caption Battle days have finalized yet. Enter today&apos;s battle on the homepage to claim the
              first crown!
            </p>
            <a href="/" className="tm-hof-back">
              ⚔️ Join Today&apos;s Battle
            </a>
          </div>
        ) : (
          <main className="tm-hof-grid" data-testid="hof-winners-grid">
            {state.winners.map((w) => {
              const tpl = getTemplateById(w.template_id);
              const isReigning = isActiveCaptionKing(w.author_name, state.activeKings);
              return (
                <article
                  key={`${w.battle_date}-${w.author_name}`}
                  data-testid={`hof-winner-${w.battle_date}`}
                  className={`tm-hof-card ${isReigning ? 'reigning' : ''}`}
                >
                  <div className="tm-hof-meta">
                    <span style={{ color: 'var(--tm-amber)', fontWeight: 900 }}>📅 {w.battle_date}</span>
                    {isReigning ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(250, 204, 21, 0.2)',
                          color: 'var(--tm-amber)',
                          fontSize: '11px',
                          fontWeight: 900
                        }}
                      >
                        👑 REIGNING 24H KING
                      </span>
                    ) : (
                      <span style={{ color: 'var(--tm-text-dim)', fontSize: '11px' }}>🏛️ Hall Champion</span>
                    )}
                  </div>

                  <div className="tm-hof-media">
                    <img src={tpl.src} alt={tpl.name} loading="lazy" />
                    {w.top_text && <div className="tm-hof-cap top">{w.top_text}</div>}
                    {w.bottom_text && <div className="tm-hof-cap bottom">{w.bottom_text}</div>}
                  </div>

                  <div className="tm-hof-meta">
                    <strong style={{ color: 'var(--tm-cyan)' }}>👑 @{w.author_name}</strong>
                    <span style={{ color: '#a3e635', fontWeight: 800 }}>🔥 {w.winning_score} votes</span>
                  </div>
                </article>
              );
            })}
          </main>
        )}
      </div>
    </div>
  );
}
