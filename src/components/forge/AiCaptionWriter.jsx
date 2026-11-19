import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { AI_IDEA_MAX, fetchAiCaptionQuota, requestAiCaptions } from '../../utils/aiCaption';

/**
 * AI Caption Writer: the user types an idea, the AI writes 3 top/bottom caption options,
 * one tap puts an option onto the meme. Free uses: 25/month signed in, 3 for anonymous visitors.
 */
export default function AiCaptionWriter({ onApply, templateHint = '', onRequireAuth }) {
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [message, setMessage] = useState('');
  const [quota, setQuota] = useState(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      // Only look the quota up when a session already exists, so opening the editor never
      // creates an anonymous account by itself.
      if (!data?.session) return;
      fetchAiCaptionQuota(supabase).then((q) => live && q && setQuota(q));
    });
    return () => {
      live = false;
    };
  }, []);

  const handleWrite = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setNeedsSignIn(false);
    const res = await requestAiCaptions(supabase, { idea, template: templateHint });
    setBusy(false);
    if (res.quota) setQuota(res.quota);
    if (res.ok) {
      setOptions(res.options);
      onApply(res.options[0].top, res.options[0].bottom);
      return;
    }
    setMessage(res.message);
    if (res.error === 'ai_quota_used' && res.quota?.tier !== 'account') setNeedsSignIn(true);
  };

  const left = quota ? `${quota.remaining}/${quota.limit} free left` : '';

  return (
    <div className="tm-tool-section tm-ai-caption">
      <div className="tm-tool-row" style={{ justifyContent: 'space-between' }}>
        <label className="tm-label" htmlFor="tm-ai-idea">
          🤖 AI CAPTION WRITER
        </label>
        {left && <span className="tm-ai-quota">{left}</span>}
      </div>
      <div className="tm-tool-row" style={{ flexWrap: 'nowrap' }}>
        <input
          id="tm-ai-idea"
          type="text"
          className="tm-input tm-w-full"
          value={idea}
          maxLength={AI_IDEA_MAX}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleWrite(e);
          }}
          placeholder="Your idea, e.g. my flight got delayed"
          disabled={busy}
        />
        <button
          type="button"
          className="tm-btn tm-btn-primary"
          onClick={handleWrite}
          disabled={busy || idea.trim().length < 2}
          style={{ whiteSpace: 'nowrap' }}
        >
          {busy ? '⏳ Writing…' : '✨ Write it'}
        </button>
      </div>

      {options.length > 1 && (
        <div className="tm-ai-options" role="list">
          {options.map((o, i) => (
            <button
              key={`${o.top}|${o.bottom}|${i}`}
              type="button"
              role="listitem"
              className="tm-btn tm-ai-option"
              onClick={() => onApply(o.top, o.bottom)}
              title="Use this caption"
            >
              {o.top && <span>{o.top}</span>}
              {o.top && o.bottom && <span aria-hidden="true"> / </span>}
              {o.bottom && <span>{o.bottom}</span>}
            </button>
          ))}
        </div>
      )}

      {message && (
        <p className="tm-ai-msg" role="status">
          {message}{' '}
          {needsSignIn && onRequireAuth && (
            <button type="button" className="tm-link-btn" onClick={onRequireAuth}>
              Sign in
            </button>
          )}
        </p>
      )}
    </div>
  );
}
