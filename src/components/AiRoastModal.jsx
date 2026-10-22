import { useState, useMemo } from 'react';
import { generateAiMemeRoast } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';

export default function AiRoastModal({
  meme,
  onPostRoastComment,
  onTriggerStudioMutate,
  onClose
}) {
  const [copied, setCopied] = useState(false);
  const [postedToComments, setPostedToComments] = useState(false);

  const analysis = useMemo(() => (meme ? generateAiMemeRoast(meme) : null), [meme]);

  if (!meme || !analysis) return null;

  const handleCopyRoast = () => {
    const text = `🤖 AI DANK-O-METER (${analysis.viralProbability}% VIRAL): "${analysis.verdict}" — Scanned on THEMEMES.net`;
    navigator.clipboard?.writeText(text).catch(() => {});
    sfx.playPop(2);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDropInComments = (e) => {
    if (postedToComments) return;
    setPostedToComments(true);
    if (onPostRoastComment) {
      onPostRoastComment(
        meme.id,
        `🤖 [AI DANK-O-METER: ${analysis.viralProbability}% VIRAL] ${analysis.verdict}`,
        e
      );
    }
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-roast-modal"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '19px', color: '#00f3ff' }}>
              🤖 AI Dank-O-Meter & Roast Scanner
            </h2>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="tm-roast-preview-grid">
          <div className="tm-roast-img-box">
            <div className="tm-roast-laser-line" />
            <img src={meme.image_url} alt={meme.title} />
          </div>

          <div className="tm-roast-metrics">
            <div className="tm-roast-score-banner">
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#00f3ff' }}>
                NEURAL VIRAL PROBABILITY
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#facc15', lineHeight: 1.1 }}>
                {analysis.viralProbability}%
              </div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#f472b6', marginTop: '2px' }}>
                {analysis.tierVerdict}
              </div>
            </div>

            <div className="tm-roast-stat-row">
              <span>🧠 Brainrot Index:</span>
              <strong style={{ color: '#ec4899' }}>{analysis.brainrotLevel}</strong>
            </div>
            <div className="tm-roast-stat-row">
              <span>🌶️ Spice Output:</span>
              <strong>{analysis.spiceStars}</strong>
            </div>
            <div className="tm-roast-stat-row">
              <span>🧬 Lineage Check:</span>
              <strong style={{ color: '#38bdf8' }}>{analysis.repostRisk}</strong>
            </div>
          </div>
        </div>

        {/* AI Verdict Box */}
        <div className="tm-roast-verdict-box">
          <div style={{ fontSize: '11px', fontWeight: 900, color: '#a855f7', marginBottom: '4px' }}>
            🎙️ SAVAGE AI CRITIQUE FOR &ldquo;{meme.title}&rdquo;:
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#f8fafc', fontWeight: 600 }}>
            &ldquo;{analysis.verdict}&rdquo;
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            disabled={postedToComments}
            onClick={handleDropInComments}
          >
            {postedToComments ? '✅ Posted to Comments!' : '💬 Drop AI Roast in Comments (+40 XP)'}
          </button>
          <button
            type="button"
            className="tm-btn"
            onClick={handleCopyRoast}
          >
            {copied ? '✅ Copied Verdict!' : '📋 Copy AI Roast'}
          </button>
          <button
            type="button"
            className="tm-mutate-btn"
            onClick={(e) => {
              onClose();
              onTriggerStudioMutate(meme, e);
            }}
          >
            🧬 Mutate This Meme
          </button>
        </div>
      </div>
    </div>
  );
}
