import { useState, useMemo } from 'react';
import { RANKS } from '../data/starterMemes';

export default function LeaderboardModal({
  memes,
  currentUser,
  currentXp,
  royaltiesMap,
  onClose,
  onSelectMeme,
  onTriggerStudioMutate,
  onOpenProfile
}) {
  const [tab, setTab] = useState('creators'); // 'creators' | 'memes' | 'origins'

  // 1. Aggregate Top Creators Leaderboard
  const topCreators = useMemo(() => {
    const map = new Map();

    const ensureCreator = (handle) => {
      const key = handle || 'AnonMemer';
      if (!map.has(key)) {
        map.set(key, {
          username: key,
          memeCount: 0,
          totalScore: 0,
          remixesSpawned: 0,
          royaltyXp: Number(royaltiesMap?.[key] || 0),
          xp: 0
        });
      }
      return map.get(key);
    };

    memes.forEach((m) => {
      const entry = ensureCreator(m.author_name || 'AnonMemer');
      entry.memeCount += 1;
      entry.totalScore += Number(m.score || 0);
      entry.remixesSpawned += Number(m.mutation_count || 0);
    });

    // Include active logged-in or guest user
    const myHandle = currentUser?.username || 'You (Arcade Player)';
    const me = ensureCreator(myHandle);
    me.isCurrentUser = true;

    return Array.from(map.values())
      .map((c) => {
        const computedXp =
          c.isCurrentUser
            ? Math.max(currentXp, Math.round(c.totalScore * 0.4) + c.royaltyXp + c.remixesSpawned * 50)
            : Math.round(c.totalScore * 0.65) + c.royaltyXp + c.remixesSpawned * 50 + c.memeCount * 100;
        let rankObj = RANKS[0];
        for (const r of RANKS) {
          if (computedXp >= r.minXp) rankObj = r;
        }
        return {
          ...c,
          xp: computedXp,
          rank: rankObj
        };
      })
      .sort((a, b) => b.xp - a.xp);
  }, [memes, currentUser, currentXp, royaltiesMap]);

  // 2. Top Memes by Score
  const topMemes = useMemo(() => {
    return [...memes].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 15);
  }, [memes]);

  // 3. Most Mutated GEN-0 Origins
  const topOrigins = useMemo(() => {
    return memes
      .filter((m) => (m.generation || 0) === 0)
      .sort((a, b) => (b.mutation_count || 0) - (a.mutation_count || 0) || (b.score || 0) - (a.score || 0))
      .slice(0, 15);
  }, [memes]);

  const getMedal = (idx) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-leaderboard-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div
          className="tm-modal-sticky-header"
          style={{
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#facc15' }}>
                🏆 CYBER-ARCADE HALL OF FAME
              </h2>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Tap any creator handle to inspect their Arcade Player Card & unlocked badges!
              </div>
            </div>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tm-tab ${tab === 'creators' ? 'active' : ''}`}
            onClick={() => setTab('creators')}
          >
            👾 Top Meme Lords (XP)
          </button>
          <button
            type="button"
            className={`tm-tab ${tab === 'memes' ? 'active' : ''}`}
            onClick={() => setTab('memes')}
          >
            🔥 Highest Scored Memes
          </button>
          <button
            type="button"
            className={`tm-tab ${tab === 'origins' ? 'active' : ''}`}
            onClick={() => setTab('origins')}
          >
            🧬 Most Mutated Origins
          </button>
        </div>

        {/* TAB 1: TOP CREATORS */}
        {tab === 'creators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCreators.map((c, idx) => (
              <div
                key={c.username}
                className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}
                onClick={() => {
                  onClose();
                  onOpenProfile(c.username);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#38bdf8' }}>
                        @{c.username}
                      </strong>
                      {c.isCurrentUser && (
                        <span className="tm-tag" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                          YOU
                        </span>
                      )}
                      <span className="tm-tag">
                        Lv.{c.rank.level} {c.rank.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                      📸 {c.memeCount} drops • 🔥 {c.totalScore} score • 🧬 {c.remixesSpawned} remixes spawned
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#facc15' }}>
                    ⚡ {c.xp} XP
                  </div>
                  {(c.remixesSpawned > 0 || c.royaltyXp > 0) && (
                    <div style={{ fontSize: '11px', color: '#a3e635', fontWeight: 700 }}>
                      +{c.remixesSpawned * 50 + c.royaltyXp} XP Royalties
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: TOP MEMES */}
        {tab === 'memes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topMemes.map((m, idx) => (
              <div
                key={m.id}
                className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <img
                    src={m.image_url}
                    alt={m.title}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        onClose();
                        onSelectMeme(m);
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      by{' '}
                      <strong
                        style={{ color: '#38bdf8', cursor: 'pointer' }}
                        onClick={() => {
                          onClose();
                          onOpenProfile(m.author_name);
                        }}
                      >
                        @{m.author_name}
                      </strong>{' '}
                      • 🔥 {m.score} pts
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      onClose();
                      onSelectMeme(m);
                    }}
                  >
                    🔍 View
                  </button>
                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => {
                      onClose();
                      onTriggerStudioMutate(m, e);
                    }}
                  >
                    🧬 Mutate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MOST MUTATED ORIGINS */}
        {tab === 'origins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topOrigins.map((m, idx) => (
              <div
                key={m.id}
                className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <img
                    src={m.image_url}
                    alt={m.title}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Origin by{' '}
                      <strong
                        style={{ color: '#38bdf8', cursor: 'pointer' }}
                        onClick={() => {
                          onClose();
                          onOpenProfile(m.author_name);
                        }}
                      >
                        @{m.author_name}
                      </strong>{' '}
                      • <strong style={{ color: '#a3e635' }}>+{(m.mutation_count || 0) * 50} XP Royalties Earned</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="tm-lineage-btn">
                    🧬 {m.mutation_count || 0} REMIXES
                  </span>
                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => {
                      onClose();
                      onTriggerStudioMutate(m, e);
                    }}
                  >
                    🧬 Fork Origin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
