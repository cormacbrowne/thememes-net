import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { fetchBattleState, entryCaption } from '../utils/dailyCaptionBattle';
import {
  SOCIAL_KIT_FORMATS,
  buildSocialCaption,
  renderSocialKitPng
} from '../utils/socialKitCanvas';
import { SOCIAL_LINKS, SOCIAL_PLATFORMS, getActiveSocialLinks } from '../config/social';
import './AdminSocialKitPage.css';

/**
 * Plan 2.8 — /admin/social (moderators only).
 * One-click 1080×1920 (Stories/TikTok) & 1080×1080 (Square) PNG generator
 * plus copy-paste social captions for today's battle & yesterday's winners.
 */
export default function AdminSocialKitPage() {
  const client = getSupabaseClient();
  const [gate, setGate] = useState('loading');
  const [battleState, setBattleState] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [copiedMode, setCopiedMode] = useState('');
  const [note, setNote] = useState('');
  const [previews, setPreviews] = useState({});
  const previewsRef = useRef({});

  const loadAll = useCallback(async () => {
    if (!client?.rpc) {
      setGate('error');
      return;
    }
    const { data, error } = await client.rpc('admin_list_battles');
    if (error) {
      setGate('error');
      return;
    }
    if (!data?.ok) {
      setGate('denied');
      return;
    }
    const state = await fetchBattleState(null, client);
    setBattleState(state);
    setGate('ready');
  }, [client]);

  useEffect(() => {
    let alive = true;
    if (!client?.rpc) {
      return undefined;
    }
    client.rpc('admin_list_battles').then(async ({ data, error }) => {
      if (!alive) return;
      if (error) {
        setGate('error');
        return;
      }
      if (!data?.ok) {
        setGate('denied');
        return;
      }
      const state = await fetchBattleState(null, client);
      if (!alive) return;
      setBattleState(state);
      setGate('ready');
    });
    return () => {
      alive = false;
    };
  }, [client]);

  useEffect(() => {
    return () => {
      Object.values(previewsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const battle = battleState?.battle || null;
  const previous = battleState?.previous || null;
  const topEntries = Array.isArray(previous?.top) ? previous.top : [];
  const winner = topEntries[0] || null;
  const runnersUp = topEntries.slice(1, 3);
  const previousBattle = previous?.battle || null;
  const entryCount = battleState?.entryCount || 0;

  const battleCaption = buildSocialCaption({ mode: 'battle', battle, entryCount });
  const winnerCaption = buildSocialCaption({
    mode: 'winner',
    battle,
    winner,
    previousBattle,
    runnersUp
  });

  const handleDownload = async (mode, format) => {
    const key = `${mode}-${format}`;
    if (busyKey) return;
    setBusyKey(key);
    setNote('');
    try {
      const result = await renderSocialKitPng({
        mode,
        format,
        battle,
        winner,
        previousBattle,
        runnersUp,
        entryCount
      });
      const url = URL.createObjectURL(result.blob);
      setPreviews((prev) => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        const next = { ...prev, [key]: url };
        previewsRef.current = next;
        return next;
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setNote(`Downloaded ${result.filename} (${result.width}×${result.height})`);
    } catch (err) {
      setNote(`⚠️ ${err?.message || 'Could not render image'}`);
    } finally {
      setBusyKey('');
    }
  };

  const handleCopyCaption = async (mode, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(''), 2200);
    } catch {
      setNote('Select the text box below and copy manually.');
    }
  };

  const activeSocial = getActiveSocialLinks(SOCIAL_LINKS);

  if (gate === 'loading') {
    return (
      <main className="tm-ask-page">
        <p>Checking moderator access…</p>
      </main>
    );
  }
  if (gate === 'denied' || gate === 'error') {
    return (
      <main className="tm-ask-page">
        <h1>📱 Social Kit admin</h1>
        <p>{gate === 'denied' ? '🔒 Moderators only. Sign in with a moderator account first.' : 'Could not load Supabase.'}</p>
        <a href="/">← Back to THE MEMES.net</a>
      </main>
    );
  }

  return (
    <main className="tm-ask-page" data-testid="admin-social-kit-page">
      <header className="tm-ask-top">
        <div>
          <h1>📱 Daily Social Kit</h1>
          <p className="tm-ask-sub">
            Export 1080×1920 Stories/TikTok &amp; 1080×1080 square PNGs with ready-to-paste captions.
          </p>
        </div>
        <nav className="tm-ask-nav" aria-label="Admin navigation">
          <a href="/admin/battles">⚔️ Battles</a>
          <a href="/admin/moderation">🛡️ Moderation</a>
          <a href="/">← Site</a>
        </nav>
      </header>

      <div className="tm-ask-status">
        <span>
          Footer social links active: <strong>{activeSocial.length}</strong> / {SOCIAL_PLATFORMS.length} (edit{' '}
          <code>src/config/social.js</code>)
        </span>
        <button type="button" className="tm-ask-btn" onClick={loadAll}>
          ↻ Refresh battle data
        </button>
      </div>

      {note && (
        <p className="tm-ask-note" role="status">
          {note}
        </p>
      )}

      <div className="tm-ask-grid">
        {/* Card 1: Today's Battle */}
        <section className="tm-ask-card" aria-labelledby="ask-today-h2">
          <h2 id="ask-today-h2">⚔️ Today’s Battle</h2>
          {battle ? (
            <div className="tm-ask-meta">
              <img src={battle.image_url} alt={battle.title} className="tm-ask-thumb" />
              <div>
                <strong>{battle.title}</strong>
                {battle.theme && <span className="tm-ask-pill">🏷️ {battle.theme}</span>}
                <p>
                  {battle.battle_day} · ✍️ {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
          ) : (
            <p className="tm-ask-empty">No battle is live right now. Queue one on /admin/battles first.</p>
          )}

          <div className="tm-ask-actions">
            {Object.values(SOCIAL_KIT_FORMATS).map((fmt) => {
              const key = `battle-${fmt.id}`;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  className="tm-ask-btn primary"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleDownload('battle', fmt.id)}
                >
                  {busyKey === key ? 'Rendering…' : `⬇️ ${fmt.shortLabel} (${fmt.width}×${fmt.height})`}
                </button>
              );
            })}
          </div>

          {(previews['battle-story'] || previews['battle-square']) && (
            <div className="tm-ask-previews">
              {previews['battle-story'] && (
                <img src={previews['battle-story']} alt="Today's battle 1080x1920 preview" className="tm-ask-preview-img" />
              )}
              {previews['battle-square'] && (
                <img src={previews['battle-square']} alt="Today's battle 1080x1080 preview" className="tm-ask-preview-img" />
              )}
            </div>
          )}

          <label className="tm-ask-caption-label">
            <span>Suggested caption</span>
            <textarea readOnly rows={7} value={battleCaption} className="tm-ask-textarea" />
          </label>
          <button
            type="button"
            className="tm-ask-btn"
            onClick={() => handleCopyCaption('battle', battleCaption)}
          >
            {copiedMode === 'battle' ? '✓ Caption copied!' : '📋 Copy Today’s Battle caption'}
          </button>
        </section>

        {/* Card 2: Yesterday's Winners */}
        <section className="tm-ask-card" aria-labelledby="ask-win-h2">
          <h2 id="ask-win-h2">👑 Yesterday’s Winners</h2>
          {winner ? (
            <div className="tm-ask-meta">
              {previousBattle?.image_url && (
                <img src={previousBattle.image_url} alt={previousBattle.title || 'Winner battle'} className="tm-ask-thumb" />
              )}
              <div>
                <strong>🏆 @{winner.author_name}</strong>
                <p>“{entryCaption(winner)}” ({winner.score} votes)</p>
                {runnersUp.length > 0 && (
                  <p className="tm-ask-runners">
                    {runnersUp.map((r, i) => `${i === 0 ? '🥈' : '🥉'} @${r.author_name} (${r.score})`).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="tm-ask-empty">No completed battle winner found yet — exports still use fallback copy.</p>
          )}

          <div className="tm-ask-actions">
            {Object.values(SOCIAL_KIT_FORMATS).map((fmt) => {
              const key = `winner-${fmt.id}`;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  className="tm-ask-btn primary"
                  disabled={Boolean(busyKey)}
                  onClick={() => handleDownload('winner', fmt.id)}
                >
                  {busyKey === key ? 'Rendering…' : `⬇️ ${fmt.shortLabel} (${fmt.width}×${fmt.height})`}
                </button>
              );
            })}
          </div>

          {(previews['winner-story'] || previews['winner-square']) && (
            <div className="tm-ask-previews">
              {previews['winner-story'] && (
                <img src={previews['winner-story']} alt="Yesterday's winner 1080x1920 preview" className="tm-ask-preview-img" />
              )}
              {previews['winner-square'] && (
                <img src={previews['winner-square']} alt="Yesterday's winner 1080x1080 preview" className="tm-ask-preview-img" />
              )}
            </div>
          )}

          <label className="tm-ask-caption-label">
            <span>Suggested caption</span>
            <textarea readOnly rows={7} value={winnerCaption} className="tm-ask-textarea" />
          </label>
          <button
            type="button"
            className="tm-ask-btn"
            onClick={() => handleCopyCaption('winner', winnerCaption)}
          >
            {copiedMode === 'winner' ? '✓ Caption copied!' : '📋 Copy Winner caption'}
          </button>
        </section>
      </div>
    </main>
  );
}
