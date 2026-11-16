import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import './PulseReportPage.css';

function fmtDuration(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function fmtMinutes(ms) {
  return ((Number(ms) || 0) / 60000).toFixed(1);
}

function SummaryCard({ title, data }) {
  const d = data || {};
  return (
    <div className="tm-pulse-card">
      <h2>{title}</h2>
      <div className="tm-pulse-kpis">
        <div>
          <div className="tm-pulse-kpi-val">{d.visitors ?? 0}</div>
          <div className="tm-pulse-kpi-lbl">Visitors</div>
        </div>
        <div>
          <div className="tm-pulse-kpi-val">{d.sessions ?? 0}</div>
          <div className="tm-pulse-kpi-lbl">Sessions</div>
        </div>
        <div>
          <div className="tm-pulse-kpi-val">{d.bounce_pct ?? 0}%</div>
          <div className="tm-pulse-kpi-lbl">Bounce rate</div>
        </div>
        <div>
          <div className="tm-pulse-kpi-val">{fmtDuration(d.median_session_ms)}</div>
          <div className="tm-pulse-kpi-lbl">Median session</div>
        </div>
        <div>
          <div className="tm-pulse-kpi-val">{d.new_sessions ?? 0}</div>
          <div className="tm-pulse-kpi-lbl">New sessions</div>
        </div>
        <div>
          <div className="tm-pulse-kpi-val">{d.returning_sessions ?? 0}</div>
          <div className="tm-pulse-kpi-lbl">Returning</div>
        </div>
      </div>
    </div>
  );
}

export default function PulseReportPage() {
  const client = getSupabaseClient();
  const [state, setState] = useState('loading'); // loading | denied | ready | error
  const [days, setDays] = useState(14);
  const [report, setReport] = useState(null);

  useEffect(() => {
    document.title = 'Pulse · THE MEMES.net';
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
  }, []);

  const load = useCallback(async () => {
    const { data: sess } = await client.auth.getSession();
    if (!sess?.session || sess.session.user?.is_anonymous) {
      setState('denied');
      return;
    }
    const { data, error } = await client.rpc('pulse_report', { p_days: days });
    if (error) {
      setState(
        error.code === '42501' || String(error.message || '').includes('forbidden')
          ? 'denied'
          : 'error'
      );
      return;
    }
    setReport(data || {});
    setState('ready');
  }, [client, days]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  if (state === 'loading') {
    return (
      <div className="tm-pulse-page tm-pulse-center">
        <p>Loading Pulse report…</p>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="tm-pulse-page tm-pulse-center">
        <h1>Moderators only</h1>
        <p>Sign in with a moderator account to view Pulse.</p>
        <a className="tm-pulse-link" href="/">← Back to THE MEMES.net</a>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="tm-pulse-page tm-pulse-center">
        <h1>Could not load Pulse</h1>
        <button type="button" className="tm-pulse-btn" onClick={load}>Retry</button>
        <a className="tm-pulse-link" href="/">← Back to THE MEMES.net</a>
      </div>
    );
  }

  const daily = Array.isArray(report?.daily) ? report.daily : [];
  const maxDailyVisitors = Math.max(1, ...daily.map((d) => Number(d.visitors) || 0));
  const sources = Array.isArray(report?.sources) ? report.sources : [];
  const firstScreens = Array.isArray(report?.first_screens) ? report.first_screens : [];
  const games = Array.isArray(report?.games) ? report.games : [];
  const funnel = report?.funnel || {};
  const funnelMax = Math.max(
    1,
    Number(funnel.feed_views) || 0,
    Number(funnel.forge_open) || 0,
    Number(funnel.forge_export) || 0,
    Number(funnel.publish_ok) || 0
  );
  const features = Array.isArray(report?.features) ? report.features : [];
  const errors = Array.isArray(report?.errors) ? report.errors : [];

  return (
    <main className="tm-pulse-page">
      <header className="tm-pulse-header">
        <div>
          <h1>Pulse — First-Party Stats</h1>
          <a className="tm-pulse-link" href="/admin/moderation">Moderation queue</a>
          {' · '}
          <a className="tm-pulse-link" href="/">Site home</a>
        </div>
        <div className="tm-pulse-controls">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`tm-pulse-btn ${days === d ? 'is-active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
          <button type="button" className="tm-pulse-btn" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

      <section className="tm-pulse-grid">
        <SummaryCard title="Today (UTC)" data={report?.today} />
        <SummaryCard title={`Last ${days} days`} data={report?.period} />
      </section>

      <section className="tm-pulse-section">
        <h2>Daily visitors ({days}d)</h2>
        {daily.length === 0 ? (
          <p className="tm-pulse-empty">No events yet.</p>
        ) : (
          daily.map((d) => (
            <div key={d.day} className="tm-pulse-bar-row">
              <span>{d.day}</span>
              <div className="tm-pulse-bar-track">
                <div
                  className="tm-pulse-bar-fill"
                  style={{ width: `${Math.round(((Number(d.visitors) || 0) / maxDailyVisitors) * 100)}%` }}
                />
              </div>
              <span>{d.visitors} vis</span>
            </div>
          ))
        )}
      </section>

      <section className="tm-pulse-section">
        <h2>Where they came from</h2>
        {sources.length === 0 ? (
          <p className="tm-pulse-empty">No source data yet.</p>
        ) : (
          <table className="tm-pulse-table">
            <thead>
              <tr>
                <th>Source (ref/utm)</th>
                <th>Referrer host</th>
                <th>Visitors</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, idx) => (
                <tr key={`${s.src}-${s.ref_host}-${idx}`}>
                  <td>{s.src}</td>
                  <td>{s.ref_host}</td>
                  <td>{s.visitors}</td>
                  <td>{s.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tm-pulse-section">
        <h2>First screen</h2>
        {firstScreens.length === 0 ? (
          <p className="tm-pulse-empty">No landing views yet.</p>
        ) : (
          <table className="tm-pulse-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Sessions</th>
                <th>Bounces</th>
                <th>Bounce %</th>
              </tr>
            </thead>
            <tbody>
              {firstScreens.map((fs) => (
                <tr key={fs.path}>
                  <td>{fs.path}</td>
                  <td>{fs.sessions}</td>
                  <td>{fs.bounces}</td>
                  <td>{fs.bounce_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tm-pulse-section">
        <h2>Games league table</h2>
        {games.length === 0 ? (
          <p className="tm-pulse-empty">No game sessions yet.</p>
        ) : (
          <table className="tm-pulse-table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Starts</th>
                <th>Total min</th>
                <th>Median min</th>
                <th>Rounds/sess</th>
                <th>2nd game %</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.game}>
                  <td>{g.game}</td>
                  <td>{g.starts}</td>
                  <td>{fmtMinutes(g.total_ms)}</td>
                  <td>{fmtMinutes(g.median_ms)}</td>
                  <td>{g.avg_rounds}</td>
                  <td>{g.second_game_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tm-pulse-section">
        <h2>Meme funnel</h2>
        {[
          { label: 'Feed views', val: Number(funnel.feed_views) || 0 },
          { label: 'Forge open', val: Number(funnel.forge_open) || 0 },
          { label: 'Forge export', val: Number(funnel.forge_export) || 0 },
          { label: 'Publish OK', val: Number(funnel.publish_ok) || 0 },
          { label: 'Publish refused', val: Number(funnel.publish_refused) || 0, pink: true }
        ].map((step) => (
          <div key={step.label} className="tm-pulse-bar-row">
            <span>{step.label}</span>
            <div className="tm-pulse-bar-track">
              <div
                className={`tm-pulse-bar-fill ${step.pink ? 'is-pink' : ''}`}
                style={{ width: `${Math.round((step.val / funnelMax) * 100)}%` }}
              />
            </div>
            <span>{step.val}</span>
          </div>
        ))}
      </section>

      <section className="tm-pulse-section">
        <h2>Feature use (% of sessions)</h2>
        {features.length === 0 ? (
          <p className="tm-pulse-empty">No feature events yet.</p>
        ) : (
          features.map((f) => (
            <div key={f.feature} className="tm-pulse-bar-row">
              <span>{f.feature}</span>
              <div className="tm-pulse-bar-track">
                <div
                  className="tm-pulse-bar-fill"
                  style={{ width: `${Math.min(100, Math.round(Number(f.pct) || 0))}%` }}
                />
              </div>
              <span>{f.pct}%</span>
            </div>
          ))
        )}
      </section>

      <section className="tm-pulse-section">
        <h2>Top 10 client errors</h2>
        {errors.length === 0 ? (
          <p className="tm-pulse-empty">No client errors recorded.</p>
        ) : (
          <table className="tm-pulse-table">
            <thead>
              <tr>
                <th>Where</th>
                <th>Message</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err, idx) => (
                <tr key={`${err.where}-${idx}`}>
                  <td>{err.where}</td>
                  <td>{err.message}</td>
                  <td>{err.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
