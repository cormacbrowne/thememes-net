import { useCallback, useEffect, useMemo, useState } from 'react';
import MemeMedia from './MemeMedia';
import BattleCountdown from './BattleCountdown';
import {
  buildCaptionOverlay,
  fetchDailyCaptionBattle,
  getDayOneSampleCaptions,
  getTemplateById,
  submitCaptionBattleEntry,
  voteCaptionBattleEntry
} from '../utils/dailyCaptionBattle';
import './DailyCaptionBattleModal.css';

export default function DailyCaptionBattleModal({
  battle,
  onEnterBattle,
  onOpenProfile,
  onKingsUpdated,
  onClose
}) {
  const [loading, setLoading] = useState(true);
  const [liveEntries, setLiveEntries] = useState([]);
  const [yesterdayWinner, setYesterdayWinner] = useState(null);
  const [myVotes, setMyVotes] = useState(() => new Set());
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState({ type: '', text: '' });

  const samplePreviews = useMemo(() => getDayOneSampleCaptions(battle), [battle]);

  const loadBattleState = useCallback(async () => {
    setLoading(true);
    const res = await fetchDailyCaptionBattle();
    setLoading(false);
    if (!res.ok) return;
    setLiveEntries(res.entries || []);
    setYesterdayWinner(res.yesterdayWinner || null);
    setMyVotes(new Set((res.myVotedEntryIds || []).map((id) => String(id))));
    onKingsUpdated?.(res.activeKings || []);
  }, [onKingsUpdated]);

  useEffect(() => {
    let active = true;
    fetchDailyCaptionBattle().then((res) => {
      if (!active) return;
      setLoading(false);
      if (!res.ok) return;
      setLiveEntries(res.entries || []);
      setYesterdayWinner(res.yesterdayWinner || null);
      setMyVotes(new Set((res.myVotedEntryIds || []).map((id) => String(id))));
      onKingsUpdated?.(res.activeKings || []);
    });
    return () => {
      active = false;
    };
  }, [onKingsUpdated]);

  if (!battle) return null;

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormFeedback({ type: '', text: '' });
    const res = await submitCaptionBattleEntry({
      battleDate: battle.dateStr,
      templateId: battle.template?.id || 'tpl-drake-compare',
      topText,
      bottomText
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormFeedback({
        type: 'error',
        text: res.message || 'Could not submit caption right now.'
      });
      return;
    }

    setTopText('');
    setBottomText('');
    setFormFeedback({
      type: 'ok',
      text:
        res.status === 'pending'
          ? '⏳ Submitted! Waiting for moderator approval — only you see it until approved.'
          : '✅ Caption Battle entry is live! Community votes crown tomorrow’s 👑 Caption King.'
    });
    await loadBattleState();
  };

  const handleToggleVote = async (entry) => {
    if (!entry?.id || entry.status === 'pending') return;
    const entryId = String(entry.id);
    const nextActive = !myVotes.has(entryId);
    const res = await voteCaptionBattleEntry(entryId, nextActive);
    if (!res.ok) {
      setFormFeedback({ type: 'error', text: res.message || 'Could not vote right now.' });
      return;
    }
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (res.voted) next.add(entryId);
      else next.delete(entryId);
      return next;
    });
    setLiveEntries((prev) =>
      prev
        .map((item) => (String(item.id) === entryId ? { ...item, score: res.score } : item))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
    );
  };

  const yesterdayTpl = yesterdayWinner ? getTemplateById(yesterdayWinner.template_id) : null;

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-caption-battle-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Caption Battle"
        data-testid="daily-caption-battle-modal"
      >
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '19px', color: 'var(--tm-amber)' }}>⚔️ Daily Caption Battle</h2>
            <BattleCountdown />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="/hall-of-fame"
              className="tm-btn"
              style={{ textDecoration: 'none' }}
              data-testid="hall-of-fame-link"
            >
              👑 Hall of Fame
            </a>
            <button type="button" className="tm-btn" onClick={onClose}>
              ✕ Close
            </button>
          </div>
        </div>

        {/* Yesterday's Real Caption King Banner */}
        <div
          className={`tm-caption-king-banner ${yesterdayWinner ? 'crowned' : ''}`}
          data-testid="yesterday-caption-king-banner"
        >
          {yesterdayWinner ? (
            <>
              <div className="tm-caption-king-left">
                {yesterdayTpl?.src && (
                  <img
                    src={yesterdayTpl.src}
                    alt={yesterdayTpl.name}
                    style={{ width: '48px', height: '44px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                )}
                <div>
                  <div className="tm-caption-king-kicker">
                    👑 YESTERDAY&apos;S CAPTION KING ({yesterdayWinner.battle_date})
                  </div>
                  <div className="tm-caption-king-name">
                    <button
                      type="button"
                      className="tm-link-btn"
                      style={{ color: 'var(--tm-amber)', fontWeight: 900, fontSize: '15px' }}
                      onClick={() => {
                        onClose();
                        onOpenProfile?.(yesterdayWinner.author_name);
                      }}
                    >
                      @{yesterdayWinner.author_name}
                    </button>{' '}
                    won with <strong>{yesterdayWinner.winning_score}</strong> votes — wearing the{' '}
                    <strong>👑 24h Caption King Frame</strong>!
                  </div>
                  {(yesterdayWinner.top_text || yesterdayWinner.bottom_text) && (
                    <div style={{ fontSize: '11.5px', color: 'var(--tm-text-soft)', marginTop: '2px' }}>
                      “{[yesterdayWinner.top_text, yesterdayWinner.bottom_text].filter(Boolean).join(' / ')}”
                    </div>
                  )}
                </div>
              </div>
              <a href="/hall-of-fame" className="tm-btn tm-btn-primary" style={{ textDecoration: 'none' }}>
                👑 Hall of Fame
              </a>
            </>
          ) : (
            <div className="tm-caption-king-left">
              <span style={{ fontSize: '22px' }}>👑</span>
              <div>
                <div className="tm-caption-king-kicker">CROWN UP FOR GRABS TODAY</div>
                <div style={{ fontSize: '13px', color: 'var(--tm-text-soft)' }}>
                  Highest-voted moderated caption before UTC midnight wins the{' '}
                  <strong style={{ color: 'var(--tm-amber)' }}>👑 24h Caption King Frame</strong> &amp; a permanent spot on{' '}
                  <a href="/hall-of-fame" style={{ color: 'var(--tm-cyan)' }}>
                    /hall-of-fame
                  </a>
                  !
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's Featured Template + Direct Quick Submit */}
        <div className="tm-battle-hero-card">
          <div className="tm-battle-hero-preview">
            <img
              src={battle.template?.src}
              alt={battle.template?.name || 'Daily Caption Battle template'}
              className="tm-battle-hero-thumb"
            />
            {topText.trim() && <div className="tm-battle-preview-caption top">{topText}</div>}
            {bottomText.trim() && <div className="tm-battle-preview-caption bottom">{bottomText}</div>}
          </div>

          <div className="tm-battle-hero-info">
            <span className="tm-bounty-pill">🎯 TODAY&apos;S TEMPLATE • {battle.dateStr} UTC</span>
            <h3 style={{ margin: '6px 0 4px', fontSize: '17px', color: '#fff' }}>
              {battle.template?.name}
            </h3>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--tm-text-soft)' }}>
              Submit your caption directly below (checked by server text moderation) or remix inside the full
              Meme Forge.
            </p>

            <form className="tm-battle-composer" onSubmit={handleQuickSubmit}>
              <input
                type="text"
                className="tm-battle-input"
                maxLength={140}
                placeholder={`Top text (e.g. ${battle.defaultTop})`}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                data-testid="battle-top-input"
              />
              <input
                type="text"
                className="tm-battle-input"
                maxLength={140}
                placeholder={`Bottom text (e.g. ${battle.defaultBottom})`}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                data-testid="battle-bottom-input"
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  className="tm-btn tm-btn-primary"
                  disabled={submitting || (!topText.trim() && !bottomText.trim())}
                  data-testid="battle-submit-btn"
                >
                  {submitting ? '⏳ Checking Rules…' : '⚔️ Enter Battle'}
                </button>
                <button
                  type="button"
                  className="tm-btn"
                  onClick={() => {
                    onClose();
                    onEnterBattle?.(battle);
                  }}
                >
                  🎨 Open Full Meme Forge
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--tm-text-dim)' }}>
                By posting you agree to our <a href="/rules" style={{ color: 'var(--tm-cyan)' }}>House Rules</a>.
              </div>
            </form>

            {formFeedback.text && (
              <div
                className={`tm-battle-form-msg ${formFeedback.type === 'error' ? 'is-error' : ''}`}
                role="status"
                style={{ marginTop: '8px' }}
                data-testid="battle-form-feedback"
              >
                {formFeedback.text}
              </div>
            )}
          </div>
        </div>

        {/* Live Community Entries */}
        <div style={{ marginTop: '16px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '10px' }}>
            🏆 Today&apos;s Community Captions ({liveEntries.length})
          </div>

          {loading ? (
            <div style={{ padding: '16px', color: 'var(--tm-text-dim)', fontSize: '13px' }}>
              ⏳ Loading today&apos;s Supabase battle entries…
            </div>
          ) : liveEntries.length === 0 ? (
            <div style={{ marginBottom: '12px' }}>
              <div
                data-testid="battle-empty-state"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px dashed rgba(148, 163, 184, 0.35)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: 'var(--tm-text-soft)',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}
              >
                No community captions yet today. Enter above to set the score to beat!
              </div>
              <div className="tm-battle-entries-grid">
                {samplePreviews.map((sample) => {
                  const tpl = getTemplateById(sample.template_id);
                  return (
                    <article key={sample.id} className="tm-battle-entry-card">
                      <div className="tm-battle-entry-head">
                        <span className="tm-battle-entry-author">@{sample.author_name}</span>
                        <span className="tm-sample-seed-pill">🤖 Sample Preview</span>
                      </div>
                      <div className="tm-battle-entry-media">
                        <MemeMedia
                          meme={{
                            id: sample.id,
                            title: sample.top_text || sample.bottom_text,
                            media_type: 'image',
                            image_url: tpl.src,
                            overlay: buildCaptionOverlay(sample.top_text, sample.bottom_text)
                          }}
                          mode="feed"
                        />
                      </div>
                      <div className="tm-battle-entry-foot">
                        <span className="tm-battle-entry-title">
                          {[sample.top_text, sample.bottom_text].filter(Boolean).join(' / ')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--tm-text-dim)' }}>Not votable</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="tm-battle-entries-grid">
              {liveEntries.map((entry, idx) => {
                const tpl = getTemplateById(entry.template_id);
                const voted = myVotes.has(String(entry.id));
                const isPending = entry.status === 'pending';
                return (
                  <article
                    key={entry.id}
                    data-testid={`battle-entry-${entry.id}`}
                    className={`tm-battle-entry-card ${idx === 0 && !isPending ? 'leading' : ''}`}
                  >
                    <div className="tm-battle-entry-head">
                      <button
                        type="button"
                        className="tm-link-btn tm-battle-entry-author"
                        onClick={() => {
                          onClose();
                          onOpenProfile?.(entry.author_name);
                        }}
                      >
                        {idx === 0 && !isPending ? '👑 ' : ''}@{entry.author_name || 'AnonMemer'}
                      </button>
                      {isPending ? (
                        <span className="tm-sample-seed-pill">⏳ Pending Review</span>
                      ) : (
                        <span className="tm-community-entry-pill">🔥 Community</span>
                      )}
                    </div>
                    <div className="tm-battle-entry-media">
                      <MemeMedia
                        meme={{
                          id: entry.id,
                          title: [entry.top_text, entry.bottom_text].filter(Boolean).join(' / '),
                          media_type: 'image',
                          image_url: tpl.src,
                          overlay: buildCaptionOverlay(entry.top_text, entry.bottom_text)
                        }}
                        mode="feed"
                      />
                    </div>
                    <div className="tm-battle-entry-foot">
                      <span className="tm-battle-entry-title">
                        {[entry.top_text, entry.bottom_text].filter(Boolean).join(' / ')}
                      </span>
                      <button
                        type="button"
                        className={`tm-btn ${voted ? 'tm-btn-primary' : ''}`}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        disabled={isPending}
                        data-testid={`battle-vote-btn-${entry.id}`}
                        onClick={() => void handleToggleVote(entry)}
                      >
                        🔥 {entry.score || 0}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
