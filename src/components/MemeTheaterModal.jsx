import { useEffect, useState } from 'react';
import { getMemeRarityTier } from '../data/starterMemes';

export default function MemeTheaterModal({
  meme,
  filteredMemes,
  memes,
  myVote,
  commentInput,
  onCommentInputChange,
  onAddComment,
  onVote,
  onReaction,
  onTriggerStudioMutate,
  onSelectMeme,
  onClose,
  onShareMeme
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const currentIndex = filteredMemes.findIndex((m) => String(m.id) === String(meme?.id));
  const hasPrev = filteredMemes.length > 1;
  const hasNext = filteredMemes.length > 1;

  useEffect(() => {
    if (!meme) return;
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && filteredMemes.length > 1) {
        const nextIdx = (currentIndex + 1) % filteredMemes.length;
        onSelectMeme(filteredMemes[nextIdx]);
      } else if (e.key === 'ArrowLeft' && filteredMemes.length > 1) {
        const prevIdx = (currentIndex - 1 + filteredMemes.length) % filteredMemes.length;
        onSelectMeme(filteredMemes[prevIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [meme, currentIndex, filteredMemes, onSelectMeme, onClose]);

  if (!meme) return null;

  const rarity = getMemeRarityTier(meme);
  const gen = meme.generation || 0;
  const rootId = meme.root_meme_id || meme.parent_meme_id || meme.id;

  const lineageNodes = memes
    .filter(
      (m) =>
        String(m.id) === String(rootId) ||
        String(m.root_meme_id) === String(rootId) ||
        String(m.parent_meme_id) === String(rootId) ||
        String(m.id) === String(meme.id) ||
        String(m.parent_meme_id) === String(meme.id)
    )
    .sort((a, b) => (a.generation || 0) - (b.generation || 0));

  const handleCopyPermalink = (e) => {
    onShareMeme(meme, e);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className={`tm-modal tm-theater-modal ${rarity.className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="tm-theater-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="tm-tag">#{meme.category || 'meme'}</span>
            {rarity.label && (
              <span className={`tm-rarity-badge ${rarity.tier}`}>{rarity.label}</span>
            )}
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Posted by <strong style={{ color: '#38bdf8' }}>@{meme.author_name || 'Anon'}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasPrev && (
              <button
                type="button"
                className="tm-btn"
                title="Previous Meme (←)"
                onClick={() => {
                  const prevIdx = (currentIndex - 1 + filteredMemes.length) % filteredMemes.length;
                  onSelectMeme(filteredMemes[prevIdx]);
                }}
              >
                ← Prev
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                className="tm-btn"
                title="Next Meme (→)"
                onClick={() => {
                  const nextIdx = (currentIndex + 1) % filteredMemes.length;
                  onSelectMeme(filteredMemes[nextIdx]);
                }}
              >
                Next →
              </button>
            )}
            <button type="button" className="tm-btn" onClick={handleCopyPermalink}>
              {copiedLink ? '✅ Link Copied!' : '🔗 Share Link'}
            </button>
            <button type="button" className="tm-btn" onClick={onClose}>
              ✕ Esc
            </button>
          </div>
        </div>

        {/* Main Split Layout: High-Res Stage (Left) + Lineage & Comments (Right) */}
        <div className="tm-theater-grid">
          {/* Left: High-Res Artwork Stage */}
          <div className="tm-theater-stage">
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 900 }}>{meme.title}</h2>
            <div
              className="tm-theater-img-box"
              onDoubleClick={(e) => onVote(meme.id, 1, e)}
              title="Double-click to Upvote!"
            >
              {gen > 0 && <div className="tm-gen-pill">🧬 GEN-{gen} REMIX</div>}
              <img src={meme.image_url} alt={meme.title} />
            </div>

            {/* Engagement & Mutate Bar */}
            <div className="tm-theater-actions">
              <div className="tm-vote-pill">
                <button
                  type="button"
                  className={`tm-vote-btn up ${myVote === 1 ? 'voted' : ''}`}
                  onClick={(e) => onVote(meme.id, 1, e)}
                >
                  ▲
                </button>
                <span className="tm-score">{meme.score || 0}</span>
                <button
                  type="button"
                  className={`tm-vote-btn down ${myVote === -1 ? 'voted' : ''}`}
                  onClick={(e) => onVote(meme.id, -1, e)}
                >
                  ▼
                </button>
              </div>

              <div className="tm-react-group">
                {['🔥', '💀', '😂', '🗿'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="tm-react-btn"
                    onClick={(e) => onReaction(meme.id, emoji, e)}
                  >
                    {emoji} {(meme.reactions && meme.reactions[emoji]) || 0}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="tm-mutate-btn"
                onClick={(e) => {
                  onClose();
                  onTriggerStudioMutate(meme, e);
                }}
              >
                🧬 Fork & Mutate (+150 XP)
              </button>
            </div>
          </div>

          {/* Right: Side-by-Side Evolution Lineage & Comments */}
          <div className="tm-theater-sidebar">
            {/* Mini Evolution Tree */}
            <div className="tm-theater-panel">
              <div className="tm-studio-label" style={{ color: '#f472b6', marginBottom: '8px' }}>
                🧬 Genetic Lineage ({lineageNodes.length}{' '}
                {lineageNodes.length === 1 ? 'Node' : 'Nodes'})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '190px', overflowY: 'auto' }}>
                {lineageNodes.map((node) => {
                  const isCurrent = String(node.id) === String(meme.id);
                  const nGen = node.generation || 0;
                  return (
                    <div
                      key={node.id}
                      onClick={() => onSelectMeme(node)}
                      style={{
                        marginLeft: `${Math.min(nGen * 14, 56)}px`,
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: isCurrent
                          ? 'rgba(0, 243, 255, 0.14)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isCurrent
                          ? '1px solid #00f3ff'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <img
                          src={node.image_url}
                          alt={node.title}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: 900, color: nGen === 0 ? '#a3e635' : '#f472b6' }}>
                            {nGen === 0 ? 'GEN-0 ORIGIN' : `GEN-${nGen} REMIX`}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {node.title}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#facc15', flexShrink: 0 }}>
                        🔥 {node.score || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Comments Thread */}
            <div className="tm-theater-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
                💬 Comments ({(meme.comments || []).length})
              </div>
              <div style={{ flex: 1, maxHeight: '240px', overflowY: 'auto', marginBottom: '10px' }}>
                {(meme.comments || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    No comments yet — drop the first roast (+25 XP)!
                  </div>
                ) : (
                  (meme.comments || []).map((c) => (
                    <div key={c.id} className="tm-comment-item">
                      <strong style={{ color: '#38bdf8' }}>@{c.author_name}: </strong>
                      <span>{c.body}</span>
                    </div>
                  ))
                )}
              </div>

              <form className="tm-comment-form" onSubmit={(e) => onAddComment(meme.id, e)}>
                <input
                  type="text"
                  className="tm-input"
                  placeholder="Write a comment..."
                  value={commentInput || ''}
                  onChange={(e) => onCommentInputChange(meme.id, e.target.value)}
                />
                <button type="submit" className="tm-btn tm-btn-primary">
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
