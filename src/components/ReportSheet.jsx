import { useState, useEffect, useRef } from 'react';
import { REPORT_REASONS, REPORT_NOTE_MAX } from '../../supabase/functions/_shared/moderationQueue.js';
import { isReportableHandle, isReportableId } from '../utils/reports';
import './ReportSheet.css';

function ReportSafetyLinks() {
  return (
    <nav className="tm-report-links" aria-label="Safety and rules links">
      <a href="/rules">📜 House Rules</a>
      <a href="/takedown">🚩 Takedown</a>
      <a href="/contact">✉️ Contact</a>
    </nav>
  );
}

/**
 * Report sheet (task 33.5 + 2.6).
 * `target` = { kind: 'meme', meme }
 *          | { kind: 'comment', comment, meme }
 *          | { kind: 'battle_entry', entry, battle }
 *          | { kind: 'profile', handle }.
 */
export default function ReportSheet({ target, onClose, onSubmit, onHideForMe }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!target) return null;
  const kind = target.kind || 'meme';
  const reportable =
    kind === 'profile'
      ? isReportableHandle(target.handle)
      : kind === 'battle_entry'
        ? isReportableId(target.entry?.id)
        : kind === 'comment'
          ? isReportableId(target.comment?.id)
          : isReportableId(target.meme?.id);

  const label =
    kind === 'profile'
      ? `profile @${String(target.handle || '').replace(/^@+/, '')}`
      : kind === 'battle_entry'
        ? `caption entry by @${target.entry?.author_name || 'Anon'}`
        : kind === 'comment'
          ? `comment by @${target.comment?.author_name || 'Anon'}`
          : `"${String(target.meme?.title || 'this meme').slice(0, 40)}"`;

  const canHideLocally = kind !== 'profile' && typeof onHideForMe === 'function';

  const submit = async (e) => {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setError('');
    const res = await onSubmit({ reason, note: note.trim() });
    setBusy(false);
    if (res?.ok) setDone(res);
    else setError(res?.message || 'Could not send the report.');
  };

  return (
    <div className="tm-report-backdrop" onClick={onClose} role="presentation">
      <div
        className="tm-report-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tm-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-report-grab" aria-hidden="true" />
        {done ? (
          <div className="tm-report-done">
            <div className="tm-report-done-emoji">🛡️</div>
            <h2 id="tm-report-title">Thanks, report sent</h2>
            <p>
              {done.alreadyReported
                ? 'You had already reported this one. Our moderators will take a look.'
                : done.hidden
                ? 'It has been hidden for everyone while a moderator checks it.'
                : kind === 'profile'
                ? 'Our moderators will review this profile report.'
                : 'Our moderators will take a look. We have hidden it from your feed.'}
            </p>
            <button type="button" className="tm-report-primary" onClick={onClose} ref={firstRef}>
              Done
            </button>
            <ReportSafetyLinks />
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 id="tm-report-title">🚩 Report {label}</h2>
            {reportable ? (
              <>
                <p className="tm-report-sub">What is wrong with it? Reports are private.</p>
                <div className="tm-report-reasons" role="radiogroup" aria-label="Reason">
                  {REPORT_REASONS.map((r, i) => (
                    <label key={r.id} className={`tm-report-reason${reason === r.id ? ' is-on' : ''}`}>
                      <input
                        type="radio"
                        name="tm-report-reason"
                        value={r.id}
                        checked={reason === r.id}
                        onChange={() => setReason(r.id)}
                        ref={i === 0 ? firstRef : undefined}
                      />
                      <span aria-hidden="true">{r.emoji}</span> {r.label}
                    </label>
                  ))}
                </div>
                {reason === 'child' && (
                  <p className="tm-report-warn">
                    Thank you. This is hidden straight away and checked first. Please do not share or
                    download it. If a child is in danger, contact the police.
                  </p>
                )}
                <textarea
                  className="tm-report-note"
                  placeholder="Anything else we should know? (optional)"
                  maxLength={REPORT_NOTE_MAX}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                {error && <p className="tm-report-error" role="alert">{error}</p>}
                <button type="submit" className="tm-report-primary" disabled={!reason || busy}>
                  {busy ? 'Sending…' : 'Send report'}
                </button>
              </>
            ) : (
              <p className="tm-report-sub">
                {kind === 'profile'
                  ? 'That handle cannot be reported automatically. Use Takedown or Contact below if you need help.'
                  : 'This is a sample item from @TheMemesHQ, so it can’t be reported. You can hide it from your view instead.'}
              </p>
            )}
            {canHideLocally && (
              <>
                <div className="tm-report-divider"><span>or</span></div>
                <button
                  type="button"
                  className="tm-report-secondary"
                  onClick={() => {
                    onHideForMe(target);
                    onClose();
                  }}
                  ref={reportable ? undefined : firstRef}
                >
                  🙈 Just hide it for me (no report)
                </button>
              </>
            )}
            <button type="button" className="tm-report-cancel" onClick={onClose}>
              Cancel
            </button>
            <ReportSafetyLinks />
          </form>
        )}
      </div>
    </div>
  );
}
