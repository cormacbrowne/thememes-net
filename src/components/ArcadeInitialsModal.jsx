import { useCallback, useEffect, useMemo, useState } from 'react';
import { sfx } from '../utils/soundEngine';
import {
  ARCADE_INITIALS_ALPHABET,
  LEADERBOARD_FOR_FUN_COPY,
  LEADERBOARD_GAMES,
  isAllowedInitials,
  loadSavedInitials,
  sanitizeInitials,
  submitArcadeScore
} from '../utils/arcadeLeaderboards';
import './ArcadeInitialsModal.css';

const SUBMIT_ERRORS = {
  blocked_initials: '🚫 Those 3 initials are not allowed on the cabinet. Spin another code!',
  score_implausible: '⏱️ Score exceeded the per-second cabinet limit for this run duration.',
  session_already_used: '🎟️ That game session score was already logged.',
  invalid_session: '🎟️ Session expired — start a fresh round to record your next score.',
  sign_in_required: '🔑 Could not start a player session. Please retry or sign in.',
  suspended: '🚫 This account cannot post cabinet scores right now.'
};

export default function ArcadeInitialsModal({
  gameId,
  score,
  sessionId,
  onClose,
  onSubmitted,
  onOpenLeaderboard
}) {
  const [chars, setChars] = useState(() => sanitizeInitials(loadSavedInitials()).split(''));
  const [activeSlot, setActiveSlot] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedResult, setSubmittedResult] = useState(null);

  const gameMeta = useMemo(
    () => LEADERBOARD_GAMES.find((g) => g.id === gameId) || LEADERBOARD_GAMES[0],
    [gameId]
  );

  const initials = chars.join('');
  const allowed = isAllowedInitials(initials);

  const stepSlot = useCallback((slotIdx, delta) => {
    sfx.playToggle?.();
    setSubmitError('');
    setActiveSlot(slotIdx);
    setChars((prev) => {
      const next = [...prev];
      const curIdx = ARCADE_INITIALS_ALPHABET.indexOf(next[slotIdx]);
      const baseIdx = curIdx >= 0 ? curIdx : 0;
      const wrapped =
        (baseIdx + delta + ARCADE_INITIALS_ALPHABET.length) % ARCADE_INITIALS_ALPHABET.length;
      next[slotIdx] = ARCADE_INITIALS_ALPHABET[wrapped];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitting || submittedResult) return;
    if (!isAllowedInitials(initials)) {
      sfx.playClownHonk?.();
      setSubmitError(SUBMIT_ERRORS.blocked_initials);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    const res = await submitArcadeScore({
      sessionId,
      gameId,
      score,
      initials
    });
    setSubmitting(false);

    if (!res?.ok) {
      sfx.playClownHonk?.();
      setSubmitError(SUBMIT_ERRORS[res?.error] || '📡 Could not submit score right now.');
      return;
    }

    sfx.playRareWinFanfare?.({ rareTheme: 'arcade-fireworks' });
    setSubmittedResult(res);
    onSubmitted?.(res);
  }, [gameId, initials, onSubmitted, score, sessionId, submittedResult, submitting]);

  useEffect(() => {
    const onKeyDown = (e) => {
      e.stopPropagation();
      if (e.key === 'Tab') return;
      if (submittedResult) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose?.();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        stepSlot(activeSlot, 1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        stepSlot(activeSlot, -1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlot((s) => (s + 1) % 3);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        setActiveSlot((s) => (s + 2) % 3);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit();
        return;
      }
      if (/^[a-zA-Z0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const ch = e.key.toUpperCase();
        setSubmitError('');
        setChars((prev) => {
          const next = [...prev];
          next[activeSlot] = ch;
          return next;
        });
        setActiveSlot((s) => Math.min(2, s + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [activeSlot, handleSubmit, onClose, stepSlot, submittedResult]);

  return (
    <div className="tm-modal-backdrop tm-initials-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-initials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-initials-heading"
        data-testid="arcade-initials-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-modal-sticky-header" style={{ marginBottom: '12px' }}>
          <div>
            <h2 id="tm-initials-heading" style={{ margin: 0, fontSize: '19px', color: 'var(--tm-amber)' }}>
              🕹️ ENTER YOUR INITIALS
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--tm-text-dim)', marginTop: '2px' }}>
              {gameMeta.icon} {gameMeta.label} • Top-10 Cabinet Contender
            </div>
          </div>
          <button type="button" className="tm-btn" onClick={onClose} aria-label="Close initials dialog">
            ✕
          </button>
        </div>

        <div className="tm-initials-score-card">
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tm-cyan)', textTransform: 'uppercase' }}>
            Verified Run Score
          </div>
          <div className="tm-initials-score-value">
            {Number(score || 0).toLocaleString()} {gameMeta.unit}
          </div>
        </div>

        {!submittedResult ? (
          <>
            <div className="tm-initials-drums" role="group" aria-label="3-letter arcade initials picker">
              {[0, 1, 2].map((slotIdx) => {
                const isActive = activeSlot === slotIdx;
                return (
                  <div
                    key={slotIdx}
                    className={`tm-initials-slot ${isActive ? 'active' : ''} ${!allowed ? 'blocked' : ''}`}
                  >
                    <button
                      type="button"
                      className="tm-initials-step-btn"
                      aria-label={`Initial ${slotIdx + 1} next letter`}
                      data-testid={`initials-up-${slotIdx}`}
                      onClick={() => stepSlot(slotIdx, 1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="tm-initials-letter-btn"
                      aria-label={`Initial ${slotIdx + 1}: ${chars[slotIdx]}`}
                      data-testid={`initials-slot-${slotIdx}`}
                      onClick={() => setActiveSlot(slotIdx)}
                    >
                      {chars[slotIdx]}
                    </button>
                    <button
                      type="button"
                      className="tm-initials-step-btn"
                      aria-label={`Initial ${slotIdx + 1} previous letter`}
                      data-testid={`initials-down-${slotIdx}`}
                      onClick={() => stepSlot(slotIdx, -1)}
                    >
                      ▼
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="tm-initials-hint">
              Tap ▲ / ▼ or type A–Z / 0–9 and arrow keys to lock your 3-letter tag.
            </div>

            {!allowed && (
              <div className="tm-initials-error" role="alert">
                {SUBMIT_ERRORS.blocked_initials}
              </div>
            )}

            {allowed && submitError && (
              <div className="tm-initials-error" role="alert">
                {submitError}
              </div>
            )}

            <div className="tm-initials-for-fun">ℹ️ {LEADERBOARD_FOR_FUN_COPY}</div>

            <div className="tm-initials-actions">
              <button type="button" className="tm-btn" onClick={onClose} disabled={submitting}>
                Skip
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                data-testid="initials-submit-btn"
                disabled={!allowed || submitting}
                onClick={handleSubmit}
              >
                {submitting ? '⏳ Locking In…' : `🏆 Submit ${initials}`}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(163, 230, 53, 0.12)',
                border: '1px solid rgba(163, 230, 53, 0.45)',
                marginBottom: '12px'
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#a3e635' }}>
                {submittedResult.initials} LOCKED ON CABINET!
              </div>
              <div style={{ fontSize: '13px', color: 'var(--tm-text)', marginTop: '4px' }}>
                #{submittedResult.rank_today || 1} Today • #{submittedResult.rank_all_time || 1} All-time
              </div>
            </div>

            <div className="tm-initials-for-fun">ℹ️ {LEADERBOARD_FOR_FUN_COPY}</div>

            <div className="tm-initials-actions">
              <button type="button" className="tm-btn" onClick={onClose}>
                🕹️ Keep Playing
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                data-testid="initials-view-board-btn"
                onClick={() => {
                  onClose?.();
                  onOpenLeaderboard?.(gameId);
                }}
              >
                🏆 View Cabinet Board
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
