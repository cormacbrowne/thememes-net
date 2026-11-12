import { useMemo } from 'react';
import { RANKS, computePlayerBadges, formatMemeUploadDate } from '../data/starterMemes';
import { loadLocalMemeViews } from '../utils/notifications';
import { isUsernameCaptionKing } from '../utils/dailyCaptionBattle';
import SettingsSheet from './SettingsSheet';
import './PlayerProfileModal.css';

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
  equippedFrame = 'default',
  notifications = [],
  onMarkNotificationsRead,
  onOpenShop,
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

  const creatorStats = useMemo(() => {
    const localViews = loadLocalMemeViews();
    let views = 0;
    let upvotes = 0;
    authoredMemes.forEach((m) => {
      views += Number(m.views_count || 0) + Number(localViews[String(m.id)] || 0);
      upvotes += Math.max(0, Number(m.score || 0));
    });
    return {
      views,
      upvotes,
      remixes: totalRemixesSpawned
    };
  }, [authoredMemes, totalRemixesSpawned]);

  const isCaptionKing = useMemo(
    () => isUsernameCaptionKing(memes, username),
    [memes, username]
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
        konamiUnlocked: isMe ? konamiUnlocked : false,
        isCaptionKing
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
      konamiUnlocked,
      isCaptionKing
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

        {/* Phase 28.13: Creator Stats Card (Views, Upvotes, Remixes) */}
        <div className={`tm-creator-stats-card ${isMe && equippedFrame !== 'default' ? `tm-frame-${equippedFrame}` : ''}`}>
          <div className="tm-creator-stats-head">
            <span>📊 CREATOR IMPACT STATS</span>
            {isMe && onOpenShop && (
              <button
                type="button"
                className="tm-link-btn"
                style={{ fontSize: '11px', color: '#facc15' }}
                onClick={() => {
                  onClose();
                  onOpenShop();
                }}
              >
                🛍️ Customize Cosmetics →
              </button>
            )}
          </div>
          <div className="tm-creator-stats-row">
            <div className="tm-creator-stat-item">
              <strong style={{ color: '#00f3ff' }}>{creatorStats.views.toLocaleString()}</strong>
              <span>👁️ Views</span>
            </div>
            <div className="tm-creator-stat-item">
              <strong style={{ color: '#facc15' }}>{creatorStats.upvotes.toLocaleString()}</strong>
              <span>🔥 Upvotes</span>
            </div>
            <div className="tm-creator-stat-item">
              <strong style={{ color: '#ec4899' }}>{creatorStats.remixes.toLocaleString()}</strong>
              <span>🧬 Remixes</span>
            </div>
          </div>
        </div>

        {/* Phase 28.13: Real In-App Creator Notifications Inbox */}
        {isMe && (
          <div className="tm-creator-notif-box">
            <div className="tm-creator-notif-head">
              <span>🔔 Creator Alerts ({notifications.filter((n) => !n.read).length} unread)</span>
              {notifications.some((n) => !n.read) && onMarkNotificationsRead && (
                <button
                  type="button"
                  className="tm-link-btn"
                  style={{ fontSize: '11px' }}
                  onClick={onMarkNotificationsRead}
                >
                  ✓ Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                No alerts yet — publish a meme and real upvotes, comments &amp; remixes will appear here live!
              </div>
            ) : (
              <div className="tm-creator-notif-list">
                {notifications.slice(0, 8).map((n) => {
                  const linkedMeme = memes.find((m) => String(m.id) === String(n.meme_id));
                  return (
                    <div
                      key={n.id}
                      className={`tm-creator-notif-item ${n.read ? '' : 'unread'}`}
                      onClick={() => {
                        if (linkedMeme && onSelectMeme) {
                          onClose();
                          onSelectMeme(linkedMeme);
                        }
                      }}
                      style={{ cursor: linkedMeme ? 'pointer' : 'default' }}
                    >
                      <span>{n.message}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {formatMemeUploadDate(n.created_at).relative}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Unified Arcade Settings (Visible on Own Profile) */}
        {isMe && (
          <div style={{ marginTop: '18px' }}>
            <SettingsSheet compact />
          </div>
        )}

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
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                      📅 {formatMemeUploadDate(m.created_at).dateTime}
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
