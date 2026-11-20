import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { STUDIO_TEMPLATES } from '../data/starterMemes';
import { entryCaption } from '../utils/dailyCaptionBattle';
import './AdminBattlesPage.css';

/**
 * /admin/battles (plan 2.1). Lazy-loaded from main.jsx. Moderators only:
 * every RPC checks is_moderator() in the database, and the image upload function checks the role.
 * Queue images ahead of time, set an optional theme and prompt, cancel queued battles,
 * and remove entries.
 */
const MAX_SIDE = 1080;

async function toWebp(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
  if (!blob || blob.type !== 'image/webp') {
    throw new Error('This browser cannot make WebP images. Try Chrome, Edge or Firefox.');
  }
  return blob;
}

function nextDayIso(offset = 1) {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toISOString().slice(0, 10);
}

const STATUS_LABEL = {
  scheduled: '🗓️ Queued',
  live: '🟢 Live',
  judging: '⚖️ Judging',
  complete: '🏁 Done',
  cancelled: '✖ Cancelled'
};

export default function AdminBattlesPage() {
  const client = getSupabaseClient();
  const [state, setState] = useState('loading');
  const [battles, setBattles] = useState([]);
  const [form, setForm] = useState({
    day: nextDayIso(1),
    templateId: STUDIO_TEMPLATES[0]?.id || '',
    file: null,
    title: '',
    theme: '',
    prompt: ''
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [openEntries, setOpenEntries] = useState(null);

  const refresh = useCallback(async () => {
    if (!client?.rpc) {
      setState('error');
      return;
    }
    const { data, error } = await client.rpc('admin_list_battles');
    if (error) {
      setState('error');
      return;
    }
    if (!data?.ok) {
      setState('denied');
      return;
    }
    setBattles(data.battles || []);
    setState('ready');
  }, [client]);

  useEffect(() => {
    let alive = true;
    if (!client?.rpc) return undefined;
    client.rpc('admin_list_battles').then(({ data, error }) => {
      if (!alive) return;
      if (error) setState('error');
      else if (!data?.ok) setState('denied');
      else {
        setBattles(data.battles || []);
        setState('ready');
      }
    });
    return () => {
      alive = false;
    };
  }, [client]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'file' ? e.target.files?.[0] || null : e.target.value }));

  const schedule = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote('');
    try {
      let imageUrl;
      let templateId = null;
      if (form.file) {
        const webp = await toWebp(form.file);
        const { data: sess } = await client.auth.getSession();
        const token = sess?.session?.access_token;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://otvvphmjojqyjaznjzyo.supabase.co'}/functions/v1/battle-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/webp' },
          body: webp
        });
        const out = await res.json().catch(() => ({}));
        if (!out.ok) throw new Error(out.error === 'forbidden' ? 'Only moderators can upload.' : 'Image upload failed.');
        imageUrl = out.url;
      } else {
        const tpl = STUDIO_TEMPLATES.find((t) => t.id === form.templateId);
        imageUrl = tpl?.src;
        templateId = tpl?.id || null;
      }
      const { data, error } = await client.rpc('admin_schedule_battle', {
        p_day: form.day,
        p_image_url: imageUrl,
        p_title: form.title || null,
        p_prompt: form.prompt || null,
        p_theme: form.theme || null,
        p_template_id: templateId
      });
      if (error || !data?.ok) {
        const map = {
          day_in_past: 'That day has already passed.',
          already_started: 'That day’s battle has already started.',
          day_taken: 'You already queued a battle for that day. Cancel it first.'
        };
        throw new Error(map[data?.error] || error?.message || 'Could not schedule.');
      }
      setNote(`✅ Scheduled for ${form.day}.`);
      setForm((f) => ({ ...f, file: null, title: '', theme: '', prompt: '', day: nextDayIso(1) }));
      await refresh();
    } catch (err) {
      setNote(`⚠️ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    const { data } = await client.rpc('admin_cancel_battle', { p_battle_id: id });
    setNote(data?.ok ? 'Cancelled. The automatic template battle takes its place.' : 'Only queued battles can be cancelled.');
    await refresh();
  };

  const showEntries = async (b) => {
    const { data } = await client.rpc('admin_battle_entries', { p_battle_id: b.id });
    setOpenEntries({ battle: b, entries: data?.entries || [] });
  };

  const removeEntry = async (entryId) => {
    const reason = window.prompt('Why remove this entry? (kept in the moderation log)', 'Breaks House Rules');
    if (reason === null) return;
    const { data } = await client.rpc('admin_remove_battle_entry', { p_entry_id: entryId, p_note: reason });
    if (data?.ok && openEntries) await showEntries(openEntries.battle);
  };

  if (state === 'loading') return <main className="tm-ab-page">⏳ Loading…</main>;
  if (state === 'denied' || state === 'error') {
    return (
      <main className="tm-ab-page">
        <h1>⚔️ Battle admin</h1>
        <p>{state === 'denied' ? 'Moderators only. Sign in with a moderator account.' : 'Could not load. Try again.'}</p>
        <a href="/">← Back to the site</a>
      </main>
    );
  }

  return (
    <main className="tm-ab-page">
      <header className="tm-ab-top">
        <h1>⚔️ Caption Battle admin</h1>
        <nav>
          <a href="/admin/social">Social Kit</a> · <a href="/admin/moderation">Moderation</a> · <a href="/">Site</a>
        </nav>
      </header>
      <p className="tm-ab-help">
        A new battle opens every day at 9:00 UK time and runs for 24 hours. If nothing is queued for a day, a template
        is picked automatically. Queue your own images below.
      </p>

      <form className="tm-ab-form" onSubmit={schedule}>
        <h2>Queue a battle</h2>
        <label>
          Day (UK)
          <input type="date" value={form.day} min={nextDayIso(0)} onChange={set('day')} required />
        </label>
        <label>
          Upload an image (any size; made into WebP, max 1080 px)
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={set('file')} />
        </label>
        {!form.file && (
          <label>
            …or pick a template
            <select value={form.templateId} onChange={set('templateId')}>
              {STUDIO_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Title (optional)
          <input value={form.title} onChange={set('title')} maxLength={80} placeholder="e.g. When the Wi-Fi drops" />
        </label>
        <label>
          Theme (optional)
          <input value={form.theme} onChange={set('theme')} maxLength={40} placeholder="e.g. Christmas" />
        </label>
        <label>
          Prompt (optional)
          <input value={form.prompt} onChange={set('prompt')} maxLength={200} placeholder="e.g. Caption the cat's face" />
        </label>
        <button type="submit" className="tm-ab-btn primary" disabled={busy}>
          {busy ? 'Saving…' : 'Queue battle'}
        </button>
        {note && <p className="tm-ab-note" role="status">{note}</p>}
      </form>

      <h2>Last 14 days and the queue</h2>
      <ul className="tm-ab-list">
        {battles.map((b) => (
          <li key={b.id} className={`tm-ab-row is-${b.status}`}>
            <img src={b.image_url} alt="" width="72" height="64" loading="lazy" />
            <div className="tm-ab-row-main">
              <strong>
                {b.battle_day} · {b.title}
              </strong>
              <span>
                {STATUS_LABEL[b.status] || b.status} · {b.source === 'auto' ? 'auto template' : 'queued by admin'}
                {b.theme ? ` · ${b.theme}` : ''} · {b.entry_count} entries
              </span>
            </div>
            <div className="tm-ab-row-actions">
              <button type="button" className="tm-ab-btn" onClick={() => showEntries(b)}>
                Entries
              </button>
              {b.status === 'scheduled' && b.source === 'admin' && (
                <button type="button" className="tm-ab-btn danger" onClick={() => cancel(b.id)}>
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {openEntries && (
        <section className="tm-ab-entries">
          <h2>
            Entries: {openEntries.battle.battle_day} ({openEntries.entries.length})
            <button type="button" className="tm-ab-btn" onClick={() => setOpenEntries(null)}>
              Close
            </button>
          </h2>
          {openEntries.entries.length === 0 ? (
            <p>No entries.</p>
          ) : (
            <ul className="tm-ab-list">
              {openEntries.entries.map((e) => (
                <li key={e.id} className={`tm-ab-row is-${e.status}`}>
                  <div className="tm-ab-row-main">
                    <strong>“{entryCaption(e)}”</strong>
                    <span>
                      @{e.author_name} · {e.status} · 😂 {e.score}
                      {e.rank ? ` · #${e.rank}` : ''}
                    </span>
                  </div>
                  {e.status !== 'removed' && (
                    <button type="button" className="tm-ab-btn danger" onClick={() => removeEntry(e.id)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
