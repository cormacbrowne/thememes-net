import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import MemeOverlay from './MemeOverlay';
import HouseBadge from './HouseBadge';
import './AdminHousePage.css';

/**
 * /admin/house (Workstream 1). Lazy-loaded from main.jsx.
 * Moderators: review house memes / battle entries / bounties waiting in the queue
 * (admin_house_queue / admin_house_decide check is_moderator() in the database).
 * Admins: the kill switch, review mode, caps and budget (admin_*_agent_settings check is_admin()).
 */

const RUN_STATUS = { ok: '✅', skipped: '⏭️', error: '❌', running: '⏳' };

function QueueMeme({ item, busy, onDecide }) {
  return (
    <article className="tm-hq-card" data-testid="house-queue-meme">
      <div className="tm-hq-media">
        <img src={item.image_url} alt="" loading="lazy" />
        <MemeOverlay overlay={item.overlay} />
      </div>
      <div className="tm-hq-body">
        <div className="tm-hq-meta">
          <HouseBadge /> <span>#{item.category}</span>
          {item.topic && <span>Topic: {item.topic}</span>}
        </div>
        <strong>{item.title}</strong>
        <Decide busy={busy} onDecide={(ok) => onDecide('meme', item.id, ok)} />
      </div>
    </article>
  );
}

function Decide({ busy, onDecide }) {
  return (
    <div className="tm-hq-actions">
      <button type="button" className="tm-hq-btn is-approve" disabled={busy} onClick={() => onDecide(true)}>
        ✅ Approve
      </button>
      <button type="button" className="tm-hq-btn is-reject" disabled={busy} onClick={() => onDecide(false)}>
        ✖ Reject
      </button>
    </div>
  );
}

export default function AdminHousePage() {
  const client = getSupabaseClient();
  const [state, setState] = useState('loading');
  const [queue, setQueue] = useState({ memes: [], entries: [], bounties: [] });
  const [settings, setSettings] = useState(null);
  const [runs, setRuns] = useState([]);
  const [tokensToday, setTokensToday] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [blockedDraft, setBlockedDraft] = useState('');

  const load = useCallback(async () => {
    if (!client?.rpc) return { state: 'error' };
    const [q, s] = await Promise.all([client.rpc('admin_house_queue'), client.rpc('admin_get_agent_settings')]);
    if (q.error) return { state: 'error' };
    if (!q.data?.ok) return { state: 'denied' };
    return { state: 'ready', queue: q.data, settings: s.data?.ok ? s.data : null };
  }, [client]);

  const apply = useCallback((res) => {
    setState(res.state);
    if (res.queue) setQueue({ memes: res.queue.memes || [], entries: res.queue.entries || [], bounties: res.queue.bounties || [] });
    if (res.settings) {
      setIsAdmin(true);
      setSettings(res.settings.settings);
      setRuns(res.settings.runs || []);
      setTokensToday(res.settings.tokens_today || 0);
      setBlockedDraft((res.settings.settings?.blocked_topics || []).join(', '));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    load().then((res) => alive && apply(res));
    return () => {
      alive = false;
    };
  }, [load, apply]);

  const refresh = async () => apply(await load());

  const decide = async (kind, id, approve) => {
    if (busy) return;
    setBusy(true);
    setNote('');
    const { data, error } = await client.rpc('admin_house_decide', { p_kind: kind, p_id: String(id), p_approve: approve });
    setBusy(false);
    if (error || !data?.ok) {
      setNote(`Could not save: ${data?.error || error?.message || 'unknown error'}`);
      return;
    }
    setNote(approve ? 'Approved. It is live now (with the 🤖 House badge).' : 'Rejected.');
    await refresh();
  };

  const saveSettings = async (patch) => {
    if (busy) return;
    setBusy(true);
    setNote('');
    const { data, error } = await client.rpc('admin_update_agent_settings', { p_patch: patch });
    setBusy(false);
    if (error || !data?.ok) {
      setNote(`Could not save settings: ${data?.error || error?.message || 'unknown error'}`);
      return;
    }
    setSettings(data.settings);
    setNote('Settings saved. The next scheduled run uses them.');
  };

  const total = queue.memes.length + queue.entries.length + queue.bounties.length;

  return (
    <main className="tm-hq-page" data-testid="admin-house-page">
      <div className="tm-hq-top">
        <h1>🤖 House queue</h1>
        <a href="/admin/moderation">← Moderation</a>
      </div>
      <p className="tm-hq-help">
        Posts written by MemeBot, the site’s labelled AI account. While review mode is on, nothing it writes goes live until a
        moderator approves it here. House posts never win prizes, M$, XP or Hall of Fame spots.
      </p>

      {state === 'loading' && <p>Loading…</p>}
      {state === 'error' && <p>Could not reach the server. Try again.</p>}
      {state === 'denied' && <p>Moderators only. Sign in with a moderator account.</p>}

      {note && (
        <p className="tm-hq-note" role="status">
          {note}
        </p>
      )}

      {state === 'ready' && (
        <>
          {settings && (
            <section className="tm-hq-section" data-testid="house-settings">
              <h2>Switches</h2>
              <div className="tm-hq-switches">
                <label className="tm-hq-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.enabled)}
                    disabled={busy}
                    onChange={(e) => saveSettings({ enabled: e.target.checked })}
                    data-testid="house-enabled-toggle"
                  />
                  <span>
                    <strong>Agents on</strong> (kill switch: off stops every task on its next run)
                  </span>
                </label>
                <label className="tm-hq-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.review_mode)}
                    disabled={busy}
                    onChange={(e) => saveSettings({ review_mode: e.target.checked })}
                    data-testid="house-review-toggle"
                  />
                  <span>
                    <strong>Review mode</strong> (on: everything waits here; off: posts that pass moderation go live)
                  </span>
                </label>
                <label className="tm-hq-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.bounty_enabled)}
                    disabled={busy}
                    onChange={(e) => saveSettings({ bounty_enabled: e.target.checked })}
                  />
                  <span>
                    <strong>Weekly bounty</strong> ({settings.bounty_prize_mdollarz} M$ to the best human entry)
                  </span>
                </label>
              </div>
              <form
                className="tm-hq-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  saveSettings({
                    memes_per_day: Number(f.get('memes_per_day')),
                    battle_seed_entries: Number(f.get('battle_seed_entries')),
                    daily_token_budget: Number(f.get('daily_token_budget')),
                    blocked_topics: String(f.get('blocked_topics') || '')
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  });
                }}
              >
                <label>
                  Memes per day
                  <input name="memes_per_day" type="number" min="0" max="30" defaultValue={settings.memes_per_day} />
                </label>
                <label>
                  House entries per battle
                  <input name="battle_seed_entries" type="number" min="0" max="10" defaultValue={settings.battle_seed_entries} />
                </label>
                <label>
                  Daily token budget (used today: {Number(tokensToday).toLocaleString()})
                  <input name="daily_token_budget" type="number" min="0" step="1000" defaultValue={settings.daily_token_budget} />
                </label>
                <label className="is-wide">
                  Blocked topics (comma-separated)
                  <input name="blocked_topics" value={blockedDraft} onChange={(e) => setBlockedDraft(e.target.value)} />
                </label>
                <button type="submit" className="tm-hq-btn" disabled={busy}>
                  Save
                </button>
              </form>
            </section>
          )}

          <section className="tm-hq-section">
            <h2>
              Waiting for review <span className="tm-hq-count">{total}</span>
              <button type="button" className="tm-hq-btn" onClick={refresh} disabled={busy}>
                ↻ Refresh
              </button>
            </h2>
            {total === 0 && <p className="tm-hq-help">Nothing waiting. 🎉</p>}

            {queue.memes.length > 0 && <h3>Memes</h3>}
            <div className="tm-hq-grid">
              {queue.memes.map((m) => (
                <QueueMeme key={m.id} item={m} busy={busy} onDecide={decide} />
              ))}
            </div>

            {queue.entries.length > 0 && <h3>Battle entries</h3>}
            {queue.entries.map((e) => (
              <article key={e.id} className="tm-hq-row" data-testid="house-queue-entry">
                <div>
                  <div className="tm-hq-meta">
                    <HouseBadge /> <span>{e.battle_title}</span>
                    {e.style && <span>Style: {e.style}</span>}
                  </div>
                  <p className="tm-hq-caption">
                    {e.top_text && <span>{e.top_text}</span>}
                    {e.bottom_text && <span>{e.bottom_text}</span>}
                  </p>
                </div>
                <Decide busy={busy} onDecide={(ok) => decide('entry', e.id, ok)} />
              </article>
            ))}

            {queue.bounties.length > 0 && <h3>Bounties</h3>}
            {queue.bounties.map((b) => (
              <article key={b.id} className="tm-hq-row" data-testid="house-queue-bounty">
                <div>
                  <div className="tm-hq-meta">
                    <HouseBadge /> <span>#{b.tag}</span> <span>{b.prize_mdollarz} M$</span>
                  </div>
                  <p className="tm-hq-caption">
                    <span>“{b.prompt}”</span>
                  </p>
                  <small>Approving makes it live for 7 days and ends any running bounty.</small>
                </div>
                <Decide busy={busy} onDecide={(ok) => decide('bounty', b.id, ok)} />
              </article>
            ))}
          </section>

          {isAdmin && (
            <section className="tm-hq-section">
              <h2>Recent runs</h2>
              <div className="tm-hq-runs">
                {runs.length === 0 && <p className="tm-hq-help">No runs yet.</p>}
                {runs.map((r) => (
                  <div key={r.id} className="tm-hq-run">
                    <span>{RUN_STATUS[r.status] || r.status}</span>
                    <span className="tm-hq-run-key">{r.run_key}</span>
                    <span>
                      {r.items_created} items · {Number(r.tokens_used || 0).toLocaleString()} tokens
                    </span>
                    {r.error && <span className="tm-hq-run-err">{r.error}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
