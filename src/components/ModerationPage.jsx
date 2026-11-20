import ModerationCategories from './ModerationCategories';
import ModerationCurate from './ModerationCurate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { FEATURE_IMAGE_MODERATION } from '../config/featureFlags';
import { reasonLabel } from '../../supabase/functions/_shared/moderationQueue.js';
import './ModerationPage.css';

/**
 * /admin/moderation (task 33.5). Lazy-loaded from main.jsx.
 * Access is enforced by the database: mod_queue() raises 42501 for anyone whose
 * profiles.role is not moderator/admin, reports/moderation_actions have moderator-only RLS,
 * and decisions go through the `moderate` Edge Function, which checks the role again.
 */
const DECISIONS = [
  { id: 'approve', label: '✅ Approve', key: 'a', cls: 'is-approve' },
  { id: 'remove', label: '🗑️ Remove', key: 'r', cls: 'is-remove' },
  { id: 'remove_ban_hash', label: '⛔ Remove + ban image', key: 'b', cls: 'is-remove', memeOnly: true },
  { id: 'remove_suspend', label: '🚫 Remove + suspend user', key: 's', cls: 'is-remove' }
];

const HELD_BY_COPY = {
  reports: 'Hidden by reports',
  image_moderation_not_configured: 'Upload check unavailable',
  upload_check: 'Upload check: needs a second look'
};

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 129600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export default function ModerationPage() {
  const client = getSupabaseClient();
  const [state, setState] = useState('loading'); // loading | denied | ready | error
  const [items, setItems] = useState([]);
  const [log, setLog] = useState([]);
  const [tab, setTab] = useState('queue');
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [signedInAs, setSignedInAs] = useState('');
  const [signInMsg, setSignInMsg] = useState('');
  const [autoHideReports, setAutoHideReports] = useState(3);
  const [extraTermsText, setExtraTermsText] = useState('');
  const [imageModEnabled, setImageModEnabled] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    document.title = 'Moderation queue · THE MEMES.net';
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
      setSignedInAs('');
      setState('denied');
      return;
    }
    const sessUser = sess.session.user;
    setSignedInAs(sessUser.email || sessUser.user_metadata?.name || 'this account');
    const { data, error } = await client.rpc('mod_queue');
    if (error) {
      setState(error.code === '42501' || /forbidden|permission/i.test(error.message || '') ? 'denied' : 'error');
      return;
    }
    setItems(Array.isArray(data) ? data : []);
    const [{ data: logRows }, { data: cfg }] = await Promise.all([
      client
        .from('moderation_actions')
        .select('id, action, meme_id, comment_id, battle_entry_id, reported_handle, reason, note, moderator_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      client.rpc('admin_get_moderation_settings')
    ]);
    setLog(Array.isArray(logRows) ? logRows : []);
    if (cfg?.ok) {
      setAutoHideReports(Number(cfg.auto_hide_reports) || 3);
      setExtraTermsText(
        Array.isArray(cfg.extra_blocked_terms) ? cfg.extra_blocked_terms.join('\n') : ''
      );
      setImageModEnabled(Boolean(cfg.image_moderation_enabled));
    }
    setState('ready');
  }, [client]);

  useEffect(() => {
    Promise.resolve().then(load);
    const t = setInterval(load, 30000);
    // Reload as soon as a Google / email sign-in finishes on this page.
    const sub = client?.auth?.onAuthStateChange?.((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') load();
    });
    return () => {
      clearInterval(t);
      sub?.data?.subscription?.unsubscribe?.();
    };
  }, [client, load]);

  const signInWithProvider = useCallback(
    async (provider) => {
      if (!client?.auth?.signInWithOAuth) return;
      setSignInMsg('Opening sign-in…');
      // Sign out of any anonymous session first so the OAuth account is used here.
      const { data: sess } = await client.auth.getSession();
      if (sess?.session?.user?.is_anonymous) await client.auth.signOut().catch(() => {});
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/admin/moderation`, skipBrowserRedirect: true }
      });
      if (error || !data?.url) {
        setSignInMsg(`Could not start sign-in: ${error?.message || 'provider unavailable'}`);
        return;
      }
      window.location.assign(data.url);
    },
    [client]
  );

  const signOut = useCallback(async () => {
    await client?.auth?.signOut?.().catch(() => {});
    setSignedInAs('');
    load();
  }, [client, load]);

  const current = items[cursor] || null;

  const decide = useCallback(
    async (decision, item = current) => {
      if (!item || busy) return;
      const def = DECISIONS.find((d) => d.id === decision);
      if (!def || (def.memeOnly && item.kind !== 'meme')) return;
      setBusy(true);
      const body = { decision, note: note.trim() || undefined };
      if (item.kind === 'meme') body.memeId = item.id;
      else if (item.kind === 'battle_entry') body.battleEntryId = item.id;
      else if (item.kind === 'profile') body.reportedHandle = item.id;
      else body.commentId = item.id;
      const { data, error } = await client.functions.invoke('moderate', { body });
      setBusy(false);
      if (error || !data?.ok) {
        setFlash('⚠️ That did not work. Refresh and try again.');
        return;
      }
      const shortId = item.kind === 'profile' ? `@${item.id}` : String(item.id).slice(0, 8);
      setFlash(`${def.label.split(' ')[0]} Done: ${item.kind} ${shortId}`);
      setNote('');
      setItems((prev) => prev.filter((x) => !(x.kind === item.kind && x.id === item.id)));
      setCursor((c) => Math.max(0, Math.min(c, items.length - 2)));
      setTimeout(() => setFlash(''), 3000);
      load();
    },
    [busy, client, current, items.length, load, note]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (tab !== 'queue' || e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'INPUT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === 'ArrowDown') setCursor((c) => Math.min(items.length - 1, c + 1));
      else if (k === 'k' || e.key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1));
      else if (k === 'v' && current && !current.child_flag) setRevealed((r) => ({ ...r, [current.id]: !r[current.id] }));
      else {
        const d = DECISIONS.find((x) => x.key === k);
        if (d) {
          e.preventDefault();
          decide(d.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, decide, items.length, tab]);

  const saveSettings = useCallback(
    async (e) => {
      e.preventDefault();
      if (settingsBusy) return;
      setSettingsBusy(true);
      setSettingsMsg('');
      const terms = extraTermsText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { data, error } = await client.rpc('admin_update_moderation_settings', {
        p_auto_hide_reports: Math.max(1, Math.min(25, Number(autoHideReports) || 3)),
        p_extra_blocked_terms: terms,
        p_image_moderation_enabled: Boolean(imageModEnabled)
      });
      setSettingsBusy(false);
      if (error || !data?.ok) {
        setSettingsMsg('⚠️ Could not save moderation settings.');
        return;
      }
      setAutoHideReports(Number(data.auto_hide_reports) || 3);
      setExtraTermsText(Array.isArray(data.extra_blocked_terms) ? data.extra_blocked_terms.join('\n') : '');
      setImageModEnabled(Boolean(data.image_moderation_enabled));
      setSettingsMsg('✅ Moderation settings saved!');
      load();
    },
    [autoHideReports, client, extraTermsText, imageModEnabled, load, settingsBusy]
  );

  const counts = useMemo(
    () => ({
      total: items.length,
      reported: items.filter((i) => i.open_reports > 0).length,
      child: items.filter((i) => i.child_flag).length
    }),
    [items]
  );

  if (state === 'loading') {
    return <div className="tm-mod-page tm-mod-center">Loading the queue…</div>;
  }
  if (state === 'denied') {
    return (
      <div className="tm-mod-page tm-mod-center">
        <h1>🔒 Moderators only</h1>
        {signedInAs ? (
          <>
            <p>
              You are signed in as <strong>{signedInAs}</strong>, which is not a moderator account.
            </p>
            <div className="tm-mod-signin">
              <button type="button" className="tm-mod-btn" onClick={signOut}>Sign out</button>
              <button type="button" className="tm-mod-btn" onClick={() => signInWithProvider('google')}>
                Use a different Google account
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Sign in with your moderator account to open the queue.</p>
            <div className="tm-mod-signin">
              <button type="button" className="tm-mod-btn is-approve" onClick={() => signInWithProvider('google')}>
                Sign in with Google
              </button>
            </div>
            <p className="tm-mod-muted">Email accounts: sign in on the main site, then come back to /admin.</p>
          </>
        )}
        {signInMsg && <p className="tm-mod-muted" role="status">{signInMsg}</p>}
        <a href="/" className="tm-mod-link">← Back to THE MEMES.net</a>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="tm-mod-page tm-mod-center">
        <h1>📡 Could not load the queue</h1>
        <button type="button" className="tm-mod-btn" onClick={load}>Try again</button>
      </div>
    );
  }

  return (
    <div className="tm-mod-page">
      <header className="tm-mod-header">
        <h1>🛡️ Moderation</h1>
        <div className="tm-mod-stats">
          <span>{counts.total} in queue</span>
          <span>{counts.reported} reported</span>
          {counts.child > 0 && <span className="is-alert">{counts.child} child-safety</span>}
        </div>
        <nav className="tm-mod-tabs" aria-label="Moderation views">
          <button type="button" className={tab === 'queue' ? 'is-on' : ''} onClick={() => setTab('queue')}>Queue</button>
          <button type="button" className={tab === 'curate' ? 'is-on' : ''} onClick={() => setTab('curate')}>Curate</button>
          <button type="button" className={tab === 'log' ? 'is-on' : ''} onClick={() => setTab('log')}>Log</button>
          <button type="button" className={tab === 'categories' ? 'is-on' : ''} onClick={() => setTab('categories')}>Categories</button>
          <button type="button" className={tab === 'settings' ? 'is-on' : ''} onClick={() => setTab('settings')}>⚙️ Settings</button>
          <button type="button" onClick={load}>↻</button>
        </nav>
      </header>
      {flash && <div className="tm-mod-flash" role="status">{flash}</div>}

      {tab === 'curate' ? (
        <ModerationCurate client={client} />
      ) : tab === 'categories' ? (
        <ModerationCategories client={client} />
      ) : tab === 'settings' ? (
        <form className="tm-mod-settings" onSubmit={saveSettings} data-testid="mod-settings-form">
          <h2>🛡️ Safety &amp; Filter Settings</h2>
          <label className="tm-mod-setting-field">
            <span>Auto-hide after N distinct reports (1–25; child-safety is always 1)</span>
            <input
              type="number"
              min={1}
              max={25}
              value={autoHideReports}
              onChange={(e) => setAutoHideReports(e.target.value)}
            />
          </label>
          <label className="tm-mod-setting-field">
            <span>Extra blocked words / phrases (one per line or comma-separated)</span>
            <textarea
              rows={5}
              placeholder="e.g. badphrase, scamword"
              value={extraTermsText}
              onChange={(e) => setExtraTermsText(e.target.value)}
            />
          </label>
          <label className="tm-mod-setting-check">
            <input
              type="checkbox"
              checked={imageModEnabled}
              onChange={(e) => setImageModEnabled(e.target.checked)}
            />
            <span>
              External third-party image moderation webhook enabled (client flag{' '}
              <code>FEATURE_IMAGE_MODERATION</code> = <strong>{String(FEATURE_IMAGE_MODERATION)}</strong>;
              provider comparison in <code>docs/OWNER_TODO.md</code>)
            </span>
          </label>
          <div className="tm-mod-setting-actions">
            <button type="submit" className="tm-mod-btn is-approve" disabled={settingsBusy}>
              {settingsBusy ? 'Saving…' : '💾 Save settings'}
            </button>
            {settingsMsg && <span role="status" className="tm-mod-muted">{settingsMsg}</span>}
          </div>
        </form>
      ) : tab === 'log' ? (
        <div className="tm-mod-log-wrap">
          <table className="tm-mod-log">
            <thead>
              <tr><th>When</th><th>Action</th><th>Item</th><th>Reason</th><th>By</th></tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.id}>
                  <td>{timeAgo(row.created_at)}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.meme_id
                      ? `meme ${row.meme_id.slice(0, 8)}`
                      : row.comment_id
                        ? `comment ${String(row.comment_id).slice(0, 8)}`
                        : row.battle_entry_id
                          ? `entry ${String(row.battle_entry_id).slice(0, 8)}`
                          : row.reported_handle
                            ? `@${row.reported_handle}`
                            : row.note || '—'}
                  </td>
                  <td>{row.reason || '—'}{row.note ? ` · ${row.note}` : ''}</td>
                  <td>{row.moderator_id ? row.moderator_id.slice(0, 8) : 'auto'}</td>
                </tr>
              ))}
              {log.length === 0 && <tr><td colSpan={5}>Nothing logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <div className="tm-mod-center tm-mod-empty">🎉 Queue is empty. Nice.</div>
      ) : (
        <>
          <p className="tm-mod-keys">
            Keys: <kbd>J</kbd>/<kbd>K</kbd> move · <kbd>V</kbd> reveal · <kbd>A</kbd> approve · <kbd>R</kbd> remove ·{' '}
            <kbd>B</kbd> remove + ban image · <kbd>S</kbd> remove + suspend
          </p>
          <ul className="tm-mod-list">
            {items.map((item, idx) => {
              const isOn = idx === cursor;
              const show = revealed[item.id] && !item.child_flag;
              const img = item.media_type === 'video' ? item.poster_url : item.image_url;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className={`tm-mod-item${isOn ? ' is-on' : ''}`}
                  onClick={() => setCursor(idx)}
                >
                  <div className="tm-mod-item-head">
                    <span className={`tm-mod-sev${item.severity >= 80 ? ' is-high' : ''}`}>{item.severity}</span>
                    <span className="tm-mod-kind">{item.kind}</span>
                    <span>{HELD_BY_COPY[item.held_by] || (item.status === 'pending' ? `Held: ${item.held_by}` : 'Live, reported')}</span>
                    <span className="tm-mod-muted">@{item.author_name || 'Anon'} · {timeAgo(item.created_at)}</span>
                  </div>

                  {item.kind === 'meme' ? (
                    <div className="tm-mod-media">
                      {item.child_flag ? (
                        <div className="tm-mod-hidden-media">
                          🧒 Reported as involving a child. The image is not shown. Remove it and follow the
                          legal reporting procedure; do not download or share it.
                        </div>
                      ) : item.media_type === 'video' && show ? (
                        <div className="tm-mod-video">
                          {/* 36.V: videos are always held for a person; watch it (muted first, sound on demand). */}
                          <video
                            src={item.image_url}
                            poster={item.poster_url || undefined}
                            controls
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <button
                            type="button"
                            className="tm-mod-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRevealed((r) => ({ ...r, [item.id]: false }));
                            }}
                          >
                            Hide video
                          </button>
                        </div>
                      ) : img ? (
                        <button
                          type="button"
                          className={`tm-mod-img-btn${show ? '' : ' is-blurred'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevealed((r) => ({ ...r, [item.id]: !r[item.id] }));
                          }}
                          aria-label={show ? 'Blur image' : 'Reveal image'}
                        >
                          <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" />
                          {!show && <span>Tap to reveal</span>}
                        </button>
                      ) : (
                        <div className="tm-mod-hidden-media">No image</div>
                      )}
                      <div className="tm-mod-title">
                        {item.media_type === 'video' && <span className="tm-mod-chip">🎬 Video — tap to watch</span>}{' '}
                        {item.title || '(no title)'}
                      </div>
                    </div>
                  ) : (
                    <blockquote className="tm-mod-comment">
                      {item.kind === 'battle_entry' && (
                        <span className="tm-mod-chip">⚔️ Battle caption </span>
                      )}
                      {item.kind === 'profile' && (
                        <span className="tm-mod-chip">👤 Profile report </span>
                      )}
                      {item.body}
                    </blockquote>
                  )}

                  {item.open_reports > 0 && (
                    <div className="tm-mod-reasons">
                      {Object.entries(item.reasons || {}).map(([r, n]) => (
                        <span key={r} className="tm-mod-chip">{reasonLabel(r)} × {n}</span>
                      ))}
                    </div>
                  )}
                  {(item.notes || []).length > 0 && (
                    <ul className="tm-mod-notes">
                      {item.notes.map((n, i) => <li key={i}>“{n}”</li>)}
                    </ul>
                  )}

                  {isOn && (
                    <div className="tm-mod-actions" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="tm-mod-note"
                        placeholder="Note for the log (optional)"
                        value={note}
                        maxLength={300}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="tm-mod-buttons">
                        {DECISIONS.filter((d) => !(d.memeOnly && item.kind !== 'meme')).map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className={`tm-mod-btn ${d.cls}`}
                            disabled={busy}
                            onClick={() => decide(d.id, item)}
                          >
                            {d.label} <kbd>{d.key.toUpperCase()}</kbd>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
