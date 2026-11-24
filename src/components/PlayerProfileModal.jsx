import { REMIX_ENABLED } from '../config/featureFlags';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  ExternalLink,
  Eye,
  Flag,
  Flame,
  Heart,
  Image,
  Lock,
  Medal,
  Palette,
  Shield,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  X,
  Zap
} from 'lucide-react';
import { RANKS, computePlayerBadges, formatMemeUploadDate } from '../data/starterMemes';
import { loadLocalMemeViews } from '../utils/notifications';
import { isActiveCaptionKing, isUsernameCaptionKing } from '../utils/dailyCaptionBattle';
import { getSupabaseClient } from '../supabaseClient';
import {
  fetchCreatorProfile,
  getCreatorProfilePath,
  saveMyPixelAvatar,
  toggleFollowCreator
} from '../utils/creatorProfiles';
import PixelAvatar from './PixelAvatar';
import PixelAvatarPicker from './PixelAvatarPicker';
import SettingsSheet from './SettingsSheet';
import './PlayerProfileModal.css';

const INITIAL_BADGE_COUNT = 4;

const BADGE_ICON_MAP = {
  'first-meme': Palette,
  'first-battle': Swords,
  'podium-finish': Medal,
  'battle-champion': Trophy,
  'caption-king': Crown,
  'streak-7': Flame,
  'streak-30': Sparkles,
  'upvotes-100': Zap,
  'remix-master': Shuffle,
  'wholesome-hero': Heart
};

function renderBadgeIcon(badgeId) {
  const Icon = BADGE_ICON_MAP[badgeId] || Award;
  return <Icon size={18} strokeWidth={1.8} aria-hidden="true" />;
}

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
  activeCaptionKings = [],
  notifications = [],
  onMarkNotificationsRead,
  onOpenShop,
  roastsRun = 0,
  goblinsCaught = 0,
  konamiUnlocked = false,
  onClose,
  onOpenCreatorPage,
  onReportProfile,
  onAvatarUpdated,
  onRequireAuth,
  onSelectMeme,
  onTriggerStudioMutate,
  onClaimUsername
}) {
  const [handleInput, setHandleInput] = useState(currentUser?.claimedUsername || '');
  const [handleStatus, setHandleStatus] = useState(null);
  const [claimingHandle, setClaimingHandle] = useState(false);
  const [serverSummary, setServerSummary] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [followBusy, setFollowBusy] = useState(false);
  const [followMsg, setFollowMsg] = useState('');
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);

  const isMe =
    currentUser &&
    String(currentUser.username || '').toLowerCase() === String(username || '').toLowerCase();

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    if (!username) return undefined;
    fetchCreatorProfile(client, username, {
      localMemes: memes,
      currentUser,
      activeCaptionKings
    }).then((res) => {
      if (active && res?.ok) {
        setServerSummary(res);
      }
    });
    return () => {
      active = false;
    };
  }, [username, memes, currentUser, activeCaptionKings]);

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

  const isReigningKing = useMemo(
    () => isActiveCaptionKing(username, activeCaptionKings),
    [username, activeCaptionKings]
  );

  const isCaptionKing = useMemo(
    () => isUsernameCaptionKing(memes, username, activeCaptionKings),
    [memes, username, activeCaptionKings]
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

  const badges = useMemo(() => {
    const list = computePlayerBadges({
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
    });
    return [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  }, [
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
  ]);

  if (!username) return null;

  const visibleBadges = showAllBadges ? badges : badges.slice(0, INITIAL_BADGE_COUNT);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-profile-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Profile for @${username}`}
      >
        {/* Identity Header */}
        <div className="tm-profile-header tm-modal-sticky-header">
          <div className="tm-profile-identity">
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              <span>Back</span>
            </button>
            <PixelAvatar
              avatarId={(isMe && currentUser?.avatarId) || serverSummary?.avatarId}
              handle={username}
              size={58}
              frame={isReigningKing ? 'caption-king' : ''}
            />
            <div className="tm-profile-meta">
              <div className="tm-profile-name-row">
                <h2 className="tm-profile-username">@{username}</h2>
                <span className="tm-profile-level-pill">
                  Lv.{rankObj.level} {isMe && equippedFlair ? equippedFlair : rankObj.title}
                </span>
                {isMe && currentUser?.verified && (
                  <span className="tm-verified-pill">
                    <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
                    <span>Verified</span>
                  </span>
                )}
                {isReigningKing && (
                  <span className="tm-rarity-badge supernova" data-testid="profile-caption-king-badge">
                    <Crown size={12} strokeWidth={2} aria-hidden="true" />
                    <span>Reigning Caption King (24h Frame)</span>
                  </span>
                )}
              </div>
              {serverSummary?.bio && <p className="tm-profile-bio">{serverSummary.bio}</p>}
            </div>
          </div>

          <div className="tm-profile-actions">
            {!isMe && (
              <button
                type="button"
                className={`tm-btn ${serverSummary?.isFollowing ? 'is-following' : ''}`}
                disabled={followBusy}
                data-testid="modal-follow-creator-btn"
                onClick={async () => {
                  if (!currentUser?.verified) {
                    setFollowMsg('Sign in to follow creators.');
                    onRequireAuth?.();
                    return;
                  }
                  setFollowBusy(true);
                  setFollowMsg('');
                  const res = await toggleFollowCreator(
                    getSupabaseClient(),
                    username,
                    !(serverSummary?.isFollowing)
                  );
                  setFollowBusy(false);
                  if (!res.ok) {
                    setFollowMsg(res.message || 'Could not update follow.');
                    return;
                  }
                  setServerSummary((prev) =>
                    prev
                      ? { ...prev, isFollowing: res.following, followerCount: res.followerCount }
                      : prev
                  );
                }}
              >
                {serverSummary?.isFollowing ? (
                  <>
                    <Check size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
            <a
              href={getCreatorProfilePath(username)}
              className="tm-btn tm-btn-primary"
              data-testid="open-creator-page-btn"
              onClick={(e) => {
                if (onOpenCreatorPage) {
                  e.preventDefault();
                  onClose();
                  onOpenCreatorPage(username);
                }
              }}
            >
              <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
              <span>/u/{username}</span>
            </a>
            {!isMe && onReportProfile && (
              <button
                type="button"
                className="tm-btn tm-profile-icon-btn"
                data-testid="modal-report-profile-btn"
                aria-label={`Report @${username}`}
                title={`Report @${username}`}
                onClick={() => {
                  onClose?.();
                  onReportProfile(username);
                }}
              >
                <Flag size={15} strokeWidth={2} aria-hidden="true" />
                <span>Report</span>
              </button>
            )}
            <button type="button" className="tm-btn tm-profile-icon-btn" onClick={onClose} aria-label="Close profile">
              <X size={16} strokeWidth={2} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {followMsg && <div className="tm-profile-status-msg">{followMsg}</div>}

        {/* Consolidated Key Stats (4 core + optional More stats) */}
        <div
          className={`tm-creator-stats-card ${
            isReigningKing
              ? 'tm-frame-caption-king'
              : isMe && equippedFrame !== 'default'
                ? `tm-frame-${equippedFrame}`
                : ''
          }`}
        >
          <div className="tm-creator-stats-head">
            <span className="tm-profile-section-title">Key Stats</span>
            <div className="tm-creator-stats-head-actions">
              {isMe && onOpenShop && (
                <button
                  type="button"
                  className="tm-profile-text-btn"
                  onClick={() => {
                    onClose();
                    onOpenShop();
                  }}
                >
                  <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
                  <span>Cosmetics</span>
                </button>
              )}
              <button
                type="button"
                className="tm-profile-text-btn"
                aria-expanded={showMoreStats}
                onClick={() => setShowMoreStats((prev) => !prev)}
              >
                <span>{showMoreStats ? 'Fewer stats' : 'More stats'}</span>
                {showMoreStats ? (
                  <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <div className="tm-creator-stats-row">
            <div className="tm-creator-stat-item">
              <strong>{authoredMemes.length}</strong>
              <span>
                <Image size={13} strokeWidth={1.8} aria-hidden="true" /> Memes
              </span>
            </div>
            <div className="tm-creator-stat-item">
              <strong>{creatorStats.upvotes.toLocaleString()}</strong>
              <span>
                <Flame size={13} strokeWidth={1.8} aria-hidden="true" /> Upvotes
              </span>
            </div>
            <div className="tm-creator-stat-item">
              <strong>{creatorStats.views.toLocaleString()}</strong>
              <span>
                <Eye size={13} strokeWidth={1.8} aria-hidden="true" /> Views
              </span>
            </div>
            <div className="tm-creator-stat-item">
              <strong>{playerXp.toLocaleString()}</strong>
              <span>
                <Zap size={13} strokeWidth={1.8} aria-hidden="true" /> XP
              </span>
            </div>
          </div>

          {showMoreStats && (
            <div className="tm-creator-stats-row tm-creator-stats-row--extra">
              <div className="tm-creator-stat-item">
                <strong>{totalRemixesSpawned}</strong>
                <span>Remixes</span>
              </div>
              <div className="tm-creator-stat-item">
                <strong>+{royaltyBonus}</strong>
                <span>Remix XP</span>
              </div>
              <div className="tm-creator-stat-item">
                <strong>{serverSummary?.captionWins || 0}</strong>
                <span>Battle Wins</span>
              </div>
              <div className="tm-creator-stat-item">
                <strong>{serverSummary?.followerCount ?? 0}</strong>
                <span>Followers</span>
              </div>
            </div>
          )}
        </div>

        {/* Achievement Badges (top 4 + See all) */}
        <section className="tm-profile-section">
          <div className="tm-profile-section-head">
            <span className="tm-profile-section-title">
              <Award size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Badges ({unlockedCount}/{badges.length})</span>
            </span>
            {badges.length > INITIAL_BADGE_COUNT && (
              <button
                type="button"
                className="tm-profile-see-all-btn"
                aria-expanded={showAllBadges}
                onClick={() => setShowAllBadges((prev) => !prev)}
              >
                {showAllBadges ? 'Show fewer' : `See all ${badges.length}`}
              </button>
            )}
          </div>
          <div className="tm-badges-grid">
            {visibleBadges.map((b) => (
              <div
                key={b.id}
                className={`tm-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}
                title={b.desc}
              >
                <span className="tm-badge-icon-well">{renderBadgeIcon(b.id)}</span>
                <div className="tm-badge-copy">
                  <div className="tm-badge-name">
                    <span>{b.name}</span>
                    {b.unlocked ? (
                      <Check size={13} strokeWidth={2.2} className="tm-badge-state-ok" aria-label="Unlocked" />
                    ) : (
                      <Lock size={12} strokeWidth={2} className="tm-badge-state-lock" aria-label="Locked" />
                    )}
                  </div>
                  <div className="tm-badge-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {isMe && currentUser?.verified && (
          <PixelAvatarPicker
            selectedAvatarId={currentUser?.avatarId || serverSummary?.avatarId || 'pixel-alien'}
            saving={avatarBusy}
            statusMessage={avatarMsg}
            onSelectAvatar={async (avatarId) => {
              setAvatarBusy(true);
              setAvatarMsg('');
              const res = await saveMyPixelAvatar(getSupabaseClient(), avatarId);
              setAvatarBusy(false);
              if (!res.ok) {
                setAvatarMsg(res.message || 'Could not save pixel avatar.');
                return;
              }
              onAvatarUpdated?.(res.avatarId);
              setServerSummary((prev) => (prev ? { ...prev, avatarId: res.avatarId } : prev));
              setAvatarMsg('Saved built-in pixel avatar.');
            }}
          />
        )}

        {isMe && currentUser?.verified && currentUser?.needsHandle && (
          <p className="tm-profile-handle-nudge" role="note">
            Pick your @handle below. Until you do, your memes show <strong>@{currentUser.username}</strong>{' '}
            (we never show your Google name).
          </p>
        )}

        {isMe && (currentUser?.role === 'moderator' || currentUser?.role === 'admin') && (
          <a className="tm-btn tm-profile-mod-link" href="/admin/moderation">
            <Shield size={15} strokeWidth={2} aria-hidden="true" />
            <span>Open moderation queue</span>
          </a>
        )}

        {isMe && currentUser?.verified && onClaimUsername && (
          <form
            className="tm-profile-handle-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (claimingHandle) return;
              setClaimingHandle(true);
              setHandleStatus(null);
              try {
                const res = await onClaimUsername(handleInput);
                if (res?.ok) {
                  setHandleStatus({ ok: true, message: `Handle updated to @${res.username}` });
                } else {
                  setHandleStatus({
                    ok: false,
                    message: res?.message || 'Could not update handle.'
                  });
                }
              } finally {
                setClaimingHandle(false);
              }
            }}
          >
            <label htmlFor="tm-claim-handle-input" className="tm-profile-handle-label">
              @HANDLE
            </label>
            <input
              id="tm-claim-handle-input"
              type="text"
              className="tm-input tm-profile-handle-input"
              placeholder="Claim unique handle (3–20 chars)"
              maxLength={20}
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
            />
            <button type="submit" className="tm-btn tm-btn-primary" disabled={claimingHandle}>
              {claimingHandle ? 'Saving...' : 'Save @handle'}
            </button>
            {handleStatus && (
              <div className={`tm-profile-handle-status ${handleStatus.ok ? 'is-ok' : 'is-err'}`}>
                {handleStatus.message}
              </div>
            )}
          </form>
        )}

        {isMe && (
          <div className="tm-creator-notif-box">
            <div className="tm-creator-notif-head">
              <span className="tm-profile-section-title">
                <Bell size={15} strokeWidth={1.9} aria-hidden="true" />
                <span>Creator Alerts ({unreadCount} unread)</span>
              </span>
              {notifications.some((n) => !n.read) && onMarkNotificationsRead && (
                <button type="button" className="tm-profile-text-btn" onClick={onMarkNotificationsRead}>
                  <Check size={14} strokeWidth={2} aria-hidden="true" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="tm-profile-empty-note">
                No alerts yet — publish a meme and upvotes, comments &amp; remixes will appear here.
              </div>
            ) : (
              <div className="tm-creator-notif-list">
                {notifications.slice(0, 6).map((n) => {
                  const linkedMeme = memes.find((m) => String(m.id) === String(n.meme_id));
                  return (
                    <div
                      key={n.id}
                      className={`tm-creator-notif-item ${n.read ? '' : 'unread'} ${linkedMeme ? 'is-clickable' : ''}`}
                      onClick={() => {
                        if (linkedMeme && onSelectMeme) {
                          onClose();
                          onSelectMeme(linkedMeme);
                        }
                      }}
                    >
                      <span>{n.message}</span>
                      <span className="tm-profile-notif-time">
                        {formatMemeUploadDate(n.created_at).relative}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isMe && (
          <div className="tm-profile-section">
            <SettingsSheet compact />
          </div>
        )}

        {/* Creator Portfolio */}
        <section className="tm-profile-section">
          <div className="tm-profile-section-head">
            <span className="tm-profile-section-title">
              <Image size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Memes Posted ({authoredMemes.length})</span>
            </span>
          </div>
          {authoredMemes.length === 0 ? (
            <div className="tm-profile-empty-note">
              No memes published under @{username} yet — hit Create to drop your first meme.
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
                  <div className="tm-profile-meme-meta">
                    <div className="tm-profile-meme-title">{m.title}</div>
                    <div className="tm-profile-meme-date">{formatMemeUploadDate(m.created_at).dateTime}</div>
                    <div className="tm-profile-meme-foot">
                      <span className="tm-profile-meme-score">
                        <Flame size={12} strokeWidth={2} aria-hidden="true" />
                        <span>{m.score}</span>
                      </span>
                      {REMIX_ENABLED && (
                        <button
                          type="button"
                          className="tm-mutate-btn tm-profile-remix-btn"
                          onClick={(e) => {
                            onClose();
                            onTriggerStudioMutate(m, e);
                          }}
                        >
                          <Shuffle size={12} strokeWidth={2} aria-hidden="true" />
                          <span>Mutate</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
