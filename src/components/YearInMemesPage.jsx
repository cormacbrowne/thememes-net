import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { entryCaption } from '../utils/dailyCaptionBattle';
import './YearInMemesPage.css';
import { AI_BATTLE_IMAGE_LABEL, isAiBattleImage } from '../utils/battleImages';

/**
 * Plan 2.9 — /year-in-memes retrospective page.
 * Shows real-vote Top Memes, Caption Battle Champions, and Creators of the Year
 * backed by public.get_year_in_memes(p_year, p_limit).
 */
export default function YearInMemesPage() {
  const client = getSupabaseClient();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getUTCFullYear());
  const [status, setStatus] = useState('loading');
  const [report, setReport] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!client?.rpc) {
      return undefined;
    }
    client
      .rpc('get_year_in_memes', { p_year: selectedYear, p_limit: 24 })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data?.ok) {
          setStatus('error');
          return;
        }
        setReport(data);
        setStatus('ready');
      });
    return () => {
      alive = false;
    };
  }, [client, selectedYear]);

  const summary = report?.summary || {};
  const availableYears =
    Array.isArray(summary.available_years) && summary.available_years.length
      ? summary.available_years
      : [new Date().getUTCFullYear()];
  const topMemes = Array.isArray(report?.top_memes) ? report.top_memes : [];
  const topWinners = Array.isArray(report?.top_battle_winners) ? report.top_battle_winners : [];
  const topCreators = Array.isArray(report?.top_creators) ? report.top_creators : [];

  return (
    <main className="tm-yim-page" data-testid="year-in-memes-page">
      <div className="tm-yim-wrap">
        <div className="tm-yim-topbar">
          <a href="/" className="tm-yim-link">
            ← Back to Memes &amp; Arcade
          </a>
          <nav className="tm-yim-nav" aria-label="Archive navigation">
            <a href="/hall-of-fame" className="tm-yim-link">
              👑 Battle Hall of Fame
            </a>
            <a href="/games" className="tm-yim-link">
              🕹️ Cyber-Arcade
            </a>
          </nav>
        </div>

        <header className="tm-yim-hero">
          <span className="tm-yim-kicker">✨ NEW YEAR RETROSPECTIVE // REAL VOTES ONLY</span>
          <h1>Year in Memes {selectedYear}</h1>
          <p className="tm-yim-sub">
            Ranked strictly by real community upvotes and official Daily Caption Battle crowns.
          </p>

          <div className="tm-yim-years" role="group" aria-label="Select year">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`tm-yim-year-pill ${Number(yr) === Number(selectedYear) ? 'is-on' : ''}`}
                onClick={() => {
                  setStatus('loading');
                  setSelectedYear(Number(yr));
                }}
              >
                {yr}
              </button>
            ))}
          </div>

          <div className="tm-yim-stats" aria-label="Annual totals">
            <div className="tm-yim-stat">
              <strong>{Number(summary.total_real_votes) || 0}</strong>
              <span>Real upvotes</span>
            </div>
            <div className="tm-yim-stat">
              <strong>{Number(summary.total_memes) || 0}</strong>
              <span>Top-voted memes</span>
            </div>
            <div className="tm-yim-stat">
              <strong>{Number(summary.total_battles_won) || 0}</strong>
              <span>Battle crowns</span>
            </div>
          </div>
        </header>

        {status === 'loading' && client?.rpc && (
          <div className="tm-yim-empty">✨ Tallying {selectedYear} votes from the arcade vault…</div>
        )}

        {(status === 'error' || !client?.rpc) && (
          <div className="tm-yim-empty">
            Could not load Year in Memes stats right now.{' '}
            <a href="/" className="tm-yim-link">
              Return to the feed →
            </a>
          </div>
        )}

        {status === 'ready' && (
          <>
            <section className="tm-yim-sec" aria-labelledby="yim-memes-h2">
              <h2 id="yim-memes-h2">🏆 Top Memes of {selectedYear}</h2>
              {topMemes.length === 0 ? (
                <div className="tm-yim-empty">
                  No community memes with real votes recorded for {selectedYear} yet. Be the first to post &amp; vote!
                </div>
              ) : (
                <div className="tm-yim-grid">
                  {topMemes.map((m, idx) => (
                    <a key={m.id} href={`/m/${encodeURIComponent(m.id)}`} className="tm-yim-card">
                      <div className="tm-yim-media">
                        <span className="tm-yim-rank">#{idx + 1}</span>
                        <img
                          src={m.poster_url || m.image_url}
                          alt={m.title || 'Top meme'}
                          loading="lazy"
                        />
                      </div>
                      <div className="tm-yim-body">
                        <strong>{m.title || 'Community Meme'}</strong>
                        <div className="tm-yim-meta">
                          <span>@{m.author_name || 'Anon'}</span>
                          <span>▲ {m.real_votes} votes</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="tm-yim-sec" aria-labelledby="yim-battles-h2">
              <h2 id="yim-battles-h2">👑 Top Battle Champions of {selectedYear}</h2>
              {topWinners.length === 0 ? (
                <div className="tm-yim-empty">
                  No Caption Battle crowns awarded yet in {selectedYear}.{' '}
                  <a href="/hall-of-fame" className="tm-yim-link">
                    Check Hall of Fame →
                  </a>
                </div>
              ) : (
                <div className="tm-yim-grid">
                  {topWinners.map((w) => (
                    <article key={`${w.battle_date}-${w.entry_id}`} className="tm-yim-card is-static">
                      <div className="tm-yim-media">
                        <span className="tm-yim-rank">👑 {w.battle_date}</span>
                        <img src={w.image_url} alt={entryCaption(w) || 'Battle champion'} loading="lazy" />
                      </div>
                      <div className="tm-yim-body">
                        <strong>“{entryCaption(w)}”</strong>
                        {isAiBattleImage(w.image_url) && <p className="tm-yim-ai-note">{AI_BATTLE_IMAGE_LABEL}</p>}
                        <div className="tm-yim-meta">
                          <span>@{w.author_name}</span>
                          <span>▲ {w.winning_score} votes</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {topCreators.length > 0 && (
              <section className="tm-yim-sec" aria-labelledby="yim-creators-h2">
                <h2 id="yim-creators-h2">⭐ Creators of {selectedYear}</h2>
                <div className="tm-yim-creators">
                  {topCreators.map((c, idx) => (
                    <a
                      key={c.author_name}
                      href={`/u/${encodeURIComponent(String(c.author_name).toLowerCase())}`}
                      className="tm-yim-creator-pill"
                    >
                      <span>#{idx + 1} @{c.author_name}</span>
                      <small>
                        {c.total_votes} votes{c.battle_wins > 0 ? ` · 👑 ${c.battle_wins}` : ''}
                      </small>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
