import { useCallback, useEffect, useMemo, useState } from 'react';
import { STARTER_MEMES } from '../data/starterMemes';

/**
 * Owner brief 18 Nov 2026 (item 3): curate the feed from /admin/moderation → Curate.
 * Hide is reversible and gives no strike: database memes go to status 'removed' with reason
 * 'curated' (files kept), seed memes go on the hidden_seed_memes list. Restore undoes both.
 */
const FILTERS = [
  { id: 'live', label: 'All live' },
  { id: 'suspects', label: 'Suspects' },
  { id: 'uploads', label: 'Uploads' },
  { id: 'seeds', label: 'Built-in' },
  { id: 'hidden', label: 'Hidden' }
];

const normTitle = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export default function ModerationCurate({ client }) {
  const [rows, setRows] = useState([]);
  const [hiddenSeeds, setHiddenSeeds] = useState(() => new Set());
  const [filter, setFilter] = useState('suspects');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(() => new Set());
  const [broken, setBroken] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [{ data: memes }, { data: seeds }] = await Promise.all([
      client
        .from('memes')
        .select('id, title, image_url, poster_url, media_type, author_name, score, created_at, status, removed_reason, sha256')
        .in('status', ['approved', 'removed'])
        .order('created_at', { ascending: false })
        .limit(1000),
      client.from('hidden_seed_memes').select('seed_id').limit(1000)
    ]);
    const db = (Array.isArray(memes) ? memes : [])
      .filter((m) => m.status === 'approved' || m.removed_reason === 'curated')
      .map((m) => ({ ...m, key: `db:${m.id}`, isSeed: false, hidden: m.status === 'removed' }));
    const hs = new Set((Array.isArray(seeds) ? seeds : []).map((r) => String(r.seed_id)));
    const seedRows = STARTER_MEMES.map((m) => ({
      ...m,
      key: `seed:${m.id}`,
      isSeed: true,
      hidden: hs.has(String(m.id))
    }));
    setHiddenSeeds(hs);
    setRows([...db, ...seedRows]);
    setLoaded(true);
  }, [client]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  // Flags: blank title, broken image, duplicate (same image hash / file / title), low score.
  const flagsByKey = useMemo(() => {
    const live = rows.filter((r) => !r.hidden);
    const count = (fn) => {
      const m = new Map();
      live.forEach((r) => {
        const k = fn(r);
        if (k) m.set(k, (m.get(k) || 0) + 1);
      });
      return m;
    };
    const bySha = count((r) => r.sha256);
    const byUrl = count((r) => r.image_url);
    const byTitle = count((r) => normTitle(r.title));
    const out = {};
    rows.forEach((r) => {
      const f = [];
      if (!normTitle(r.title)) f.push('No title');
      if (broken.has(r.key) || !r.image_url) f.push('Broken image');
      if (
        !r.hidden &&
        ((r.sha256 && bySha.get(r.sha256) > 1) ||
          (r.image_url && byUrl.get(r.image_url) > 1) ||
          (normTitle(r.title) && byTitle.get(normTitle(r.title)) > 1))
      ) {
        f.push('Duplicate');
      }
      if ((r.score || 0) < 0) f.push('Downvoted');
      out[r.key] = f;
    });
    return out;
  }, [rows, broken]);

  const visible = useMemo(() => {
    let list = rows.filter((r) => {
      if (filter === 'hidden') return r.hidden;
      if (r.hidden) return false;
      if (filter === 'uploads') return !r.isSeed;
      if (filter === 'seeds') return r.isSeed;
      if (filter === 'suspects') return (flagsByKey[r.key] || []).length > 0;
      return true;
    });
    if (sort === 'score') list = [...list].sort((a, b) => (a.score || 0) - (b.score || 0));
    else if (sort === 'title') list = [...list].sort((a, b) => normTitle(a.title).localeCompare(normTitle(b.title)));
    else list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [rows, filter, sort, flagsByKey]);

  const counts = useMemo(
    () => ({
      live: rows.filter((r) => !r.hidden).length,
      suspects: rows.filter((r) => !r.hidden && (flagsByKey[r.key] || []).length > 0).length,
      uploads: rows.filter((r) => !r.hidden && !r.isSeed).length,
      seeds: rows.filter((r) => !r.hidden && r.isSeed).length,
      hidden: rows.filter((r) => r.hidden).length
    }),
    [rows, flagsByKey]
  );

  const apply = useCallback(
    async (targets, hide) => {
      if (!targets.length || busy) return;
      setBusy(true);
      let ok = 0;
      for (const r of targets) {
        const { data, error } = r.isSeed
          ? await client.rpc('mod_hide_seed', { p_seed_id: String(r.id), p_hide: hide })
          : await client.rpc('mod_curate_meme', { p_meme_id: r.id, p_restore: !hide });
        if (!error && data?.ok) ok += 1;
      }
      setBusy(false);
      setSelected(new Set());
      setMsg(
        ok === targets.length
          ? `${hide ? 'Hidden' : 'Restored'} ${ok} meme${ok === 1 ? '' : 's'}.`
          : `⚠️ ${ok} of ${targets.length} worked. Refresh and try the rest again.`
      );
      setTimeout(() => setMsg(''), 3500);
      load();
    },
    [busy, client, load]
  );

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectedRows = visible.filter((r) => selected.has(r.key));
  const hideMode = filter !== 'hidden';

  if (!loaded) return <div className="tm-mod-center">Loading memes…</div>;

  return (
    <div className="tm-curate">
      <p className="tm-mod-muted tm-curate-intro">
        Hide memes from the feed: blank, broken, duplicate or just rubbish. Hiding gives the author no strike
        and can be undone from <strong>Hidden</strong>. {hiddenSeeds.size > 0 && `${hiddenSeeds.size} built-in hidden.`}
      </p>

      <div className="tm-curate-bar">
        <div className="tm-curate-filters" role="tablist" aria-label="Which memes">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? 'is-on' : ''}
              onClick={() => {
                setFilter(f.id);
                setSelected(new Set());
              }}
            >
              {f.label} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest</option>
          <option value="score">Lowest score</option>
          <option value="title">Title (finds duplicates)</option>
        </select>
      </div>

      <div className="tm-curate-actions">
        <button
          type="button"
          className="tm-mod-btn"
          onClick={() =>
            setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((r) => r.key)))
          }
          disabled={!visible.length}
        >
          {selected.size === visible.length && visible.length ? 'Select none' : 'Select all'}
        </button>
        <button
          type="button"
          className={`tm-mod-btn ${hideMode ? 'is-remove' : 'is-approve'}`}
          disabled={busy || !selectedRows.length}
          onClick={() => apply(selectedRows, hideMode)}
        >
          {busy ? 'Working…' : `${hideMode ? '🙈 Hide' : '↩️ Restore'} selected (${selectedRows.length})`}
        </button>
        {msg && (
          <span className="tm-curate-msg" role="status">
            {msg}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="tm-mod-center tm-mod-empty">
          {filter === 'suspects' ? '🎉 No suspects. The feed looks clean.' : 'Nothing here.'}
        </div>
      ) : (
        <ul className="tm-curate-grid">
          {visible.map((r) => {
            const flags = flagsByKey[r.key] || [];
            const isSel = selected.has(r.key);
            const img = r.media_type === 'video' ? r.poster_url || r.image_url : r.image_url;
            return (
              <li key={r.key} className={`tm-curate-card${isSel ? ' is-sel' : ''}${r.hidden ? ' is-hidden' : ''}`}>
                <button
                  type="button"
                  className="tm-curate-thumb"
                  onClick={() => toggle(r.key)}
                  aria-pressed={isSel}
                  aria-label={`Select ${r.title || 'untitled meme'}`}
                >
                  {img && !broken.has(r.key) ? (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setBroken((prev) => new Set(prev).add(r.key))}
                    />
                  ) : (
                    <span className="tm-curate-noimg">No image</span>
                  )}
                  <span className="tm-curate-check" aria-hidden="true">
                    {isSel ? '✓' : ''}
                  </span>
                </button>
                <div className="tm-curate-meta">
                  <div className="tm-curate-title">{r.title || '(no title)'}</div>
                  <div className="tm-mod-muted">
                    {r.isSeed ? 'Built-in' : `@${r.author_name || 'Anon'}`} · {r.score || 0} pts
                  </div>
                  {flags.length > 0 && (
                    <div className="tm-curate-flags">
                      {flags.map((f) => (
                        <span key={f} className="tm-mod-chip">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className={`tm-mod-btn tm-curate-one ${r.hidden ? 'is-approve' : 'is-remove'}`}
                    disabled={busy}
                    onClick={() => apply([r], !r.hidden)}
                  >
                    {r.hidden ? '↩️ Restore' : '🙈 Hide'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
