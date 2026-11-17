import { useCallback, useEffect, useState } from 'react';
import { loadMemeCategories } from '../data/memeCategories';

const slugify = (label) =>
  String(label || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

/**
 * /admin → Categories tab. Moderators add trending categories (e.g. "Black Friday"),
 * mark them as trending (shown first with a flame) and switch old ones off.
 * Writes go straight to public.meme_categories; RLS only lets moderators write.
 */
export default function ModerationCategories({ client }) {
  const [rows, setRows] = useState([]);
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [trending, setTrending] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await loadMemeCategories({ includeInactive: true, force: true });
    setRows(list);
  }, []);

  useEffect(() => {
    Promise.resolve().then(refresh);
  }, [refresh]);

  const save = async (id, patch) => {
    setBusy(true);
    const { error } = await client
      .from('meme_categories')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    setBusy(false);
    setMsg(error ? `⚠️ Could not save: ${error.message}` : '✅ Saved');
    await refresh();
    loadMemeCategories({ force: true });
  };

  const add = async (e) => {
    e.preventDefault();
    const id = slugify(label);
    if (id.length < 2 || label.trim().length < 2) {
      setMsg('⚠️ Give the category a name of at least 2 letters.');
      return;
    }
    setBusy(true);
    const { error } = await client.from('meme_categories').insert({
      id,
      label: label.trim().slice(0, 32),
      emoji: emoji.trim().slice(0, 8),
      trending,
      sort: trending ? 0 : 200
    });
    setBusy(false);
    if (error) {
      setMsg(
        error.code === '23505'
          ? `⚠️ "${id}" already exists. Switch it back on below instead.`
          : `⚠️ Could not add: ${error.message}`
      );
      return;
    }
    setMsg(`✅ Added #${id}. It shows in the feed filters and upload pickers straight away.`);
    setLabel('');
    setEmoji('');
    await refresh();
    loadMemeCategories({ force: true });
  };

  return (
    <section className="tm-mod-cats">
      <form className="tm-mod-cats-add" onSubmit={add}>
        <input
          className="tm-mod-input"
          placeholder="New category, e.g. Black Friday"
          value={label}
          maxLength={32}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="tm-mod-input tm-mod-input--emoji"
          placeholder="🛍️"
          value={emoji}
          maxLength={8}
          onChange={(e) => setEmoji(e.target.value)}
          aria-label="Emoji (optional)"
        />
        <label className="tm-mod-check">
          <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} />
          Trending
        </label>
        <button type="submit" className="tm-mod-btn is-approve" disabled={busy}>
          Add category
        </button>
      </form>
      {msg && <p className="tm-mod-muted" role="status">{msg}</p>}
      <table className="tm-mod-cats-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Trending</th>
            <th>Shown</th>
            <th>Order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className={c.active === false ? 'is-off' : ''}>
              <td>
                {c.emoji} {c.label} <span className="tm-mod-muted">#{c.id}</span>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={Boolean(c.trending)}
                  disabled={busy}
                  onChange={(e) => save(c.id, { trending: e.target.checked })}
                  aria-label={`Trending: ${c.label}`}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={c.active !== false}
                  disabled={busy}
                  onChange={(e) => save(c.id, { active: e.target.checked })}
                  aria-label={`Shown: ${c.label}`}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="tm-mod-input tm-mod-input--num"
                  defaultValue={c.sort ?? 100}
                  disabled={busy}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== c.sort) save(c.id, { sort: Math.round(v) });
                  }}
                  aria-label={`Order: ${c.label}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tm-mod-muted">
        Lower order numbers show first. Switching a category off hides its chip and picker option; memes already
        posted in it stay up.
      </p>
    </section>
  );
}
