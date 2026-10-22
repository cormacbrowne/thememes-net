import { useMemo } from 'react';
import { RANKS, computePlayerBadges } from '../data/starterMemes';

export default function PlayerProfileModal({
  username,
  memes,
  currentUser,
  currentXp,
  battleStreak,
  bountiesCompleted,
  royaltiesMap,
  unlockedFlairs = [],
  equippedFlair = '',
  roastsRun = 0,
  goblinsCaught = 0,
  konamiUnlocked = false,
  onClose,
  onSelectMeme,
  onTriggerStudioMutate
}) {
  const isMe =
    currentUser &&
    String(currentUser.username || '').toLowerCase() === String(username || '').toLowerCase();

  const authoredMemes = useMemo(() => {
    if (!username) return [];
    return memes.filter(
      (m) => String(m.author_name || '').toLowerCase() === String(username).toLowerCase()
    );
  }, [memes, username]);

  const totalScore = useMemo(
    () => authoredMemes.reduce((acc, m) => acc + Number(m.score || 0), 0),
    [authoredMemes]
  );

  const totalRemixesSpawned = useMemo(
    () => authoredMemes.reduce((acc, m) => acc + Number(m.mutation_count || 0), 0),
    [authoredMemes]
  );

  const royaltyBonus = Number(royaltiesMap?.[username] || 0) + totalRemixesSpawned * 50;

  const playerXp = isMe
    ? currentXp
    : Math.round(totalScore * 0.65) + royaltyBonus + authoredMemes.length * 100;

  const rankObj = useMemo(() => {
    let r = RANKS[0];
    for (const item of RANKS) {
      if (playerXp >= item.minXp) r = item;
    }
    return r;
  }, [playerXp]);

  const badges = useMemo(
    () =>
      computePlayerBadges({
        authoredMemes,
        totalScore,
        totalRemixesSpawned,
        xp: playerXp,
        battleStreak: isMe ? battleStreak : 0,
        bountiesCompleted: isMe ? bountiesCompleted : 0,
        unlockedFlairs: isMe ? unlockedFlairs : [],
        roastsRun: isMe ? roastsRun : 0,
        goblinsCaught: isMe ? goblinsCaught : 0,
        konamiUnlocked: isMe ? konamiUnlocked : false
      }),
    [
      authoredMemes,
      totalScore,
      totalRemixesSpawned,
      playerXp,
      isMe,
      battleStreak,
      bountiesCompleted,
      unlockedFlairs,
      roastsRun,
      goblinsCaught,
      konamiUnlocked
    ]
  );

  if (!username) return null;

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Profile Banner */}
        <div className="tm-profile-header tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <div className="tm-profile-avatar">👾</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#00f3ff' }}>@{username}</h2>
                {isMe && currentUser?.verified && (
                  <span className="tm-verified-pill">
                    🛡️ Verified ({currentUser.provider || 'OAuth'})
                  </span>
                )}
                <span className="tm-tag" style={{ background: 'rgba(250,204,21,0.2)', color: '#facc15' }}>
                  Lv.{rankObj.level} {isMe && equippedFlair ? equippedFlair : rankObj.title}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                ⚡ <strong>{playerXp} XP</strong> • 🔥 <strong>{totalScore}</strong> Score • 🧬{' '}
                <strong style={{ color: '#a3e635' }}>+{royaltyBonus} XP</strong> Royalties
              </div>
            </div>
          </div>

          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Stat Boxes */}
        <div className="tm-profile-stats-grid">
          <div className="tm-profile-stat-card">
            <div className="tm-stat-val" style={{ color: '#facc15' }}>{authoredMemes.length}</div>
            <div className="tm-stat-lbl">Memes Dropped</div>
          </div>
          <div className="tm-profile-stat-card">
            <div className="tm-stat-val" style={{ color: '#38bdf8' }}>{totalScore}</div>
            <div className="tm-stat-lbl">Arena Score</div>
          </div>
          <div className="tm-profile-stat-card">
            <div className="tm-stat-val" style={{ color: '#f472b6' }}>{totalRemixesSpawned}</div>
            <div className="tm-stat-lbl">Remixes Spawned</div>
          </div>
          <div className="tm-profile-stat-card">
            <div className="tm-stat-val" style={{ color: '#a3e635' }}>+{royaltyBonus}</div>
            <div className="tm-stat-lbl">XP Royalties</div>
          </div>
        </div>

        {/* Achievement Badges */}
        <div style={{ marginTop: '18px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            🏅 Arcade Achievement Badges
          </div>
          <div className="tm-badges-grid">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`tm-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}
                title={b.desc}
              >
                <span style={{ fontSize: '22px' }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800 }}>
                    {b.name} {b.unlocked ? '✅' : '🔒'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Portfolio */}
        <div style={{ marginTop: '18px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            📸 Dropped Transmissions ({authoredMemes.length})
          </div>
          {authoredMemes.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '16px 0' }}>
              No memes published under @{username} yet — hit + Upload / Create to drop your first meme!
            </div>
          ) : (
            <div className="tm-profile-memes-grid">
              {authoredMemes.map((m) => (
                <div key={m.id} className="tm-profile-meme-item">
                  <img
                    src={m.image_url}
                    alt={m.title}
                    onClick={() => {
                      onClose();
                      onSelectMeme(m);
                    }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {m.title}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '6px'
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 800 }}>
                        🔥 {m.score}
                      </span>
                      <button
                        type="button"
                        className="tm-mutate-btn"
                        style={{ padding: '4px 8px', fontSize: '10px' }}
                        onClick={(e) => {
                          onClose();
                          onTriggerStudioMutate(m, e);
                        }}
                      >
                        🧬 Mutate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
