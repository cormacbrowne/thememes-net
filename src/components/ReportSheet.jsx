import { useState, useEffect, useRef } from 'react';
import { REPORT_REASONS, REPORT_NOTE_MAX } from '../../supabase/functions/_shared/moderationQueue.js';
import { isReportableId } from '../utils/reports';
import './ReportSheet.css';

/**
 * Report sheet (task 33.5). `target` = { kind: 'meme', meme } | { kind: 'comment', comment, meme }.
 * "Hide it for me" stays a separate, local-only option.
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
  const isComment = target.kind === 'comment';
  const item = isComment ? target.comment : target.meme;
  const reportable = isReportableId(item?.id);
  const label = isComment
    ? `comment by @${target.comment?.author_name || 'Anon'}`
    : `"${String(target.meme?.title || 'this meme').slice(0, 40)}"`;

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
                : 'Our moderators will take a look. We have hidden it from your feed.'}
            </p>
            <button type="button" className="tm-report-primary" onClick={onClose} ref={firstRef}>
              Done
            </button>
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
                This is a sample meme from @TheMemesHQ, so it can’t be reported. You can hide it from your
                feed instead.
              </p>
            )}
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
            <button type="button" className="tm-report-cancel" onClick={onClose}>
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
