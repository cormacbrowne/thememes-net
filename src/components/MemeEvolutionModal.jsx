import { formatMemeUploadDate } from '../data/starterMemes';

export default function MemeEvolutionModal({
  evolutionModalMeme,
  evolutionNodes,
  loadingEvolution,
  onClose,
  onTriggerStudioMutate
}) {
  if (!evolutionModalMeme) return null;

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal"
        style={{ maxWidth: '680px', borderColor: 'var(--tm-pink)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-modal-sticky-header" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <div>
              <h2 style={{ margin: 0, color: 'var(--tm-pink)', fontSize: '19px' }}>🧬 Meme Evolution Tree</h2>
              <div style={{ fontSize: '11px', color: 'var(--tm-text-dim)', marginTop: '2px' }}>
                Origin creators earn <strong style={{ color: '#a3e635' }}>+50 XP</strong> per
                remix &amp; passive royalties
              </div>
            </div>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {loadingEvolution ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tm-cyan)' }}>
            SCANNING GENETIC MEME ARCHIVES...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {evolutionNodes.map((node) => {
              const gen = node.generation || 0;
              const isCurrent = String(node.id) === String(evolutionModalMeme.id);
              const uploadInfo = formatMemeUploadDate(node.created_at);
              return (
                <div
                  key={node.id}
                  className="tm-evolution-node"
                  style={{
                    '--node-indent': `${Math.min(gen * 20, 80)}px`,
                    padding: '12px',
                    borderRadius: '14px',
                    background: isCurrent
                      ? 'rgba(0, 243, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isCurrent
                      ? '1px solid var(--tm-cyan)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
                    <img
                      src={node.image_url}
                      alt={node.title}
                      style={{
                        width: '58px',
                        height: '58px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: gen === 0 ? 'rgba(163,230,53,0.2)' : 'rgba(236,72,153,0.25)',
                          color: gen === 0 ? '#a3e635' : 'var(--tm-pink)'
                        }}
                      >
                        {gen === 0 ? 'GEN-0 ORIGIN' : `GEN-${gen} REMIX`}
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '14px', marginTop: '4px', wordBreak: 'break-word' }}>
                        {node.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--tm-text-dim)' }}>
                        by @{node.author_name || 'Anon'} • 🔥 {node.score || 0} pts • 📅 {uploadInfo.dateTime} ({uploadInfo.relative})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => onTriggerStudioMutate(node, e)}
                  >
                    🧬 Remix This
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
