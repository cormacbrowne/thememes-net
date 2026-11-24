import { REMIX_ENABLED } from '../config/featureFlags';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Calendar,
  Check,
  Coins,
  Crown,
  Flag,
  Flame,
  Gamepad2,
  Heart,
  Image,
  Lock,
  Medal,
  Palette,
  PenLine,
  Share2,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Zap
} from 'lucide-react';
import { getSupabaseClient } from '../supabaseClient';
import { getLevelForXp } from '../config/progression';
import { formatMemeUploadDate } from '../data/starterMemes';
import { formatMoney } from '../utils/tokenEconomy';
import { track } from '../utils/analytics';
import {
  fetchCreatorProfile,
  getCreatorProfilePath,
  saveMyBio,
  saveMyPixelAvatar,
  toggleFollowCreator
} from '../utils/creatorProfiles';
import PixelAvatar from './PixelAvatar';
import PixelAvatarPicker from './PixelAvatarPicker';
import HouseBadge from './HouseBadge';
import './CreatorProfilePage.css';
import { SITE_URL, ensureShareUrlInText, linkSafeShareText } from '../utils/shareText.js';

const NOTIF_PREFS_KEY = 'tm_notif_prefs_v1';
const INITIAL_BADGE_COUNT = 4;
const DEFAULT_NOTIF_PREFS = {
  battleResults: true,
  memeMilestones: true,
  streakReminder: true,
  dailyBattleLive: false
};

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

function loadNotifPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || 'null');
    return raw && typeof raw === 'object' ? { ...DEFAULT_NOTIF_PREFS, ...raw } : DEFAULT_NOTIF_PREFS;
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export default function CreatorProfilePage({
  handle,
  memes = [],
  currentUser = null,
  activeCaptionKings = [],
  localHighScores = {},
  tokens = 0,
  memeCentz = 0,
  tokenLedger = null,
  onBackToFeed,
  onSelectMeme,
  onRemixMeme,
  onRequireAuth,
  onAvatarUpdated,
  onReportProfile
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [followMessage, setFollowMessage] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMessage, setBioMessage] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(() => loadNotifPrefs());

  useEffect(() => {
    let active = true;
    const client = getSupabaseClient();
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });
    fetchCreatorProfile(client, handle, {
      localMemes: memes,
      currentUser,
      activeCaptionKings,
      localHighScores
    }).then((res) => {
      if (!active) return;
      setProfile(res?.ok ? res : null);
      if (res?.ok) setBioDraft(res.bio || '');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [handle, memes, currentUser, activeCaptionKings, localHighScores]);

  const rankObj = profile?.levelInfo || getLevelForXp(profile?.stats?.playerXp || 0);

  const sortedBadges = useMemo(() => {
    const list = Array.isArray(profile?.badges) ? profile.badges : [];
    return [...list].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  }, [profile]);

  const handleSaveBio = async (e) => {
    e.preventDefault();
    if (!profile?.isMe || bioBusy) return;
    if (!currentUser?.verified) {
      setBioMessage('Sign in first to save a bio.');
      onRequireAuth?.();
      return;
    }
    setBioBusy(true);
    setBioMessage('');
    const res = await saveMyBio(getSupabaseClient(), bioDraft);
    setBioBusy(false);
    if (!res.ok) {
      setBioMessage(res.message || 'Could not save bio.');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, bio: res.bio } : prev));
    setBioDraft(res.bio || '');
    setBioMessage('Bio saved.');
  };

  const handleShareProfile = async () => {
    const cleanHandle = profile?.handle || handle;
    const path = getCreatorProfilePath(cleanHandle);
    const url = `${SITE_URL}${path}?ref=profile`;
    const title = linkSafeShareText(`@${cleanHandle} — Level ${rankObj.level} ${rankObj.title} | THE MEMES.net`);
    const text = ensureShareUrlInText(`Check out @${cleanHandle} on THE MEMES.net`, url);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth <= 860) {
        await navigator.share({ title, text, url });
        track('meme_shared', { channel: 'profile_link' });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('clipboard_unavailable');
      }
      await navigator.clipboard.writeText(url);
      track('meme_shared', { channel: 'profile_link' });
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    } catch {
      setShareCopied(false);
    }
  };

  const toggleNotifPref = (key) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleFollowClick = async () => {
    if (!profile || followBusy) return;
    if (!currentUser?.verified) {
      setFollowMessage('Sign in first to follow creators.');
      onRequireAuth?.();
      return;
    }
    setFollowBusy(true);
    setFollowMessage('');
    const client = getSupabaseClient();
    const res = await toggleFollowCreator(client, profile.normalizedHandle, !profile.isFollowing);
    setFollowBusy(false);
    if (!res.ok) {
      setFollowMessage(res.message || 'Could not update follow.');
      return;
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: res.following,
            followerCount: res.followerCount
          }
        : prev
    );
  };

  const handlePickAvatar = async (avatarId) => {
    if (!profile || avatarBusy) return;
    setAvatarBusy(true);
    setAvatarMessage('');
    const client = getSupabaseClient();
    const res = await saveMyPixelAvatar(client, avatarId);
    setAvatarBusy(false);
    if (!res.ok) {
      setAvatarMessage(res.message || 'Could not save pixel avatar.');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, avatarId: res.avatarId } : prev));
    onAvatarUpdated?.(res.avatarId);
    setAvatarMessage('Saved built-in pixel avatar.');
  };

  const visibleBadges = showAllBadges ? sortedBadges : sortedBadges.slice(0, INITIAL_BADGE_COUNT);
  const unlockedCount = sortedBadges.filter((b) => b.unlocked).length;

  return (
    <section
      className="tm-creator-page"
      data-testid="creator-profile-page"
      aria-label={`Creator profile for @${profile?.handle || handle}`}
    >
      <div className="tm-creator-top-nav">
        <button
          type="button"
          className="tm-btn tm-back-pill"
          data-testid="creator-back-to-feed"
          onClick={onBackToFeed}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to Feed</span>
        </button>
        <div className="tm-creator-path-label">{getCreatorProfilePath(profile?.handle || handle)}</div>
      </div>

      {loading && !profile ? (
        <div className="tm-creator-hero-card">Loading creator profile...</div>
      ) : !profile ? (
        <div className="tm-creator-hero-card">
          <h1>Creator handle not found</h1>
          <p className="tm-creator-empty-note">
            Handles may contain letters, numbers, underscores, or hyphens (2–32 chars).
          </p>
        </div>
      ) : (
        <>
          <div
            className={`tm-creator-hero-card ${
              profile.isCaptionKing ? 'tm-frame-caption-king' : ''
            }`}
          >
            <div className="tm-creator-hero-main">
              <div className="tm-creator-identity">
                <PixelAvatar
                  avatarId={profile.avatarId}
                  handle={profile.handle}
                  size={72}
                  frame={profile.isCaptionKing ? 'caption-king' : ''}
                />
                <div className="tm-creator-identity-text">
                  <div className="tm-creator-handle-row">
                    <h1 data-testid="creator-profile-handle">@{profile.handle}</h1>
                    {profile.isHouse && <HouseBadge />}
                    {profile.verified && !profile.isHouse && (
                      <span className="tm-verified-pill">
                        <ShieldCheck size={12} strokeWidth={2} aria-hidden="true" />
                        <span>Verified</span>
                      </span>
                    )}
                    {profile.isCaptionKing && (
                      <span className="tm-rarity-badge supernova">
                        <Crown size={12} strokeWidth={2} aria-hidden="true" />
                        <span>Caption King (24h)</span>
                      </span>
                    )}
                    <span className="tm-creator-level-pill">
                      Lv.{rankObj.level} {rankObj.title}
                    </span>
                  </div>
                  <div className="tm-creator-followers-line">
                    <strong data-testid="creator-follower-count">
                      {profile.followerCount.toLocaleString()}
                    </strong>{' '}
                    followers
                  </div>
                  {profile.isHouse && (
                    <p className="tm-creator-bio" data-testid="creator-profile-house-note">
                      This is THE MEMES.net’s AI account. Its memes and battle captions are written by AI,
                      checked by our moderators, always labelled “House”, and never win prizes, M$, XP or Hall of Fame spots.
                    </p>
                  )}
                  {profile.bio && (
                    <p className="tm-creator-bio" data-testid="creator-profile-bio">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="tm-creator-actions">
                <button
                  type="button"
                  className="tm-btn tm-creator-action-btn"
                  data-testid="creator-share-btn"
                  onClick={handleShareProfile}
                >
                  {shareCopied ? (
                    <>
                      <Check size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Share Profile</span>
                    </>
                  )}
                </button>
                {!profile.isMe && (
                  <>
                    <button
                      type="button"
                      disabled={followBusy}
                      data-testid="creator-follow-btn"
                      className={`tm-follow-btn ${profile.isFollowing ? 'following' : ''}`}
                      onClick={handleFollowClick}
                    >
                      {profile.isFollowing ? (
                        <>
                          <Check size={15} strokeWidth={2} aria-hidden="true" />
                          <span>✓ Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} strokeWidth={2} aria-hidden="true" />
                          <span>+ Follow</span>
                        </>
                      )}
                    </button>
                    {onReportProfile && (
                      <button
                        type="button"
                        className="tm-btn tm-creator-action-btn"
                        data-testid="creator-report-btn"
                        onClick={() => onReportProfile(profile.handle)}
                      >
                        <Flag size={15} strokeWidth={2} aria-hidden="true" />
                        <span>Report</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {followMessage && <div className="tm-creator-follow-msg">{followMessage}</div>}

            <div className="tm-creator-stats-strip">
              <div className="tm-creator-kpi">
                <strong>{profile.stats.memesCount}</strong>
                <span>
                  <Image size={13} strokeWidth={1.8} aria-hidden="true" /> Memes
                </span>
              </div>
              <div className="tm-creator-kpi">
                <strong>{profile.stats.totalScore.toLocaleString()}</strong>
                <span>
                  <Flame size={13} strokeWidth={1.8} aria-hidden="true" /> Upvotes
                </span>
              </div>
              <div className="tm-creator-kpi">
                <strong>{profile.streakDays || 0}d</strong>
                <span>
                  <Calendar size={13} strokeWidth={1.8} aria-hidden="true" /> Streak
                </span>
              </div>
              <div className="tm-creator-kpi">
                <strong>{profile.captionWins || 0}</strong>
                <span>
                  <Trophy size={13} strokeWidth={1.8} aria-hidden="true" /> Battle Wins
                </span>
              </div>
            </div>

            {profile.isMe && (
              <>
                <PixelAvatarPicker
                  selectedAvatarId={profile.avatarId}
                  saving={avatarBusy}
                  statusMessage={avatarMessage}
                  onSelectAvatar={handlePickAvatar}
                />

                <form className="tm-creator-bio-form" onSubmit={handleSaveBio} data-testid="creator-bio-form">
                  <div className="tm-avatar-picker-head">
                    <label htmlFor="tm-creator-bio-input" className="tm-avatar-picker-title">
                      <PenLine size={14} strokeWidth={1.9} aria-hidden="true" />
                      <span>Profile Bio</span>
                    </label>
                    <span className="tm-avatar-picker-hint">{bioDraft.length}/160</span>
                  </div>
                  <div className="tm-creator-bio-row">
                    <input
                      id="tm-creator-bio-input"
                      type="text"
                      className="tm-input"
                      value={bioDraft}
                      maxLength={160}
                      placeholder="Write a short bio (no links or personal info)..."
                      onChange={(e) => setBioDraft(e.target.value)}
                    />
                    <button type="submit" className="tm-btn tm-btn-primary" disabled={bioBusy}>
                      {bioBusy ? 'Saving...' : 'Save Bio'}
                    </button>
                  </div>
                  {bioMessage && <div className="tm-avatar-picker-status">{bioMessage}</div>}
                </form>
              </>
            )}
          </div>

          {profile.isMe && (
            <div className="tm-creator-own-grid">
              <section className="tm-creator-section" data-testid="creator-mdollarz-history">
                <h2 className="tm-creator-section-heading">
                  <Coins size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>MemeDollarz Ledger (Just for Fun)</span>
                </h2>
                <div className="tm-creator-ledger-summary">
                  Balance:{' '}
                  <strong className="tm-creator-ledger-val">
                    {formatMoney(tokens, { centz: memeCentz, zero: 'balance' })}
                  </strong>{' '}
                  · Earned today:{' '}
                  <strong className="tm-creator-ledger-ok">
                    {formatMoney(tokenLedger?.totalToday || 0, { zero: 'balance' })}
                  </strong>
                </div>
                <div className="tm-creator-ledger-cats">
                  <div>
                    <span>Uploads &amp; Entries</span>
                    <strong>{formatMoney(tokenLedger?.byCategory?.upload || 0, { zero: 'balance' })}</strong>
                  </div>
                  <div>
                    <span>Upvotes &amp; Shares</span>
                    <strong>{formatMoney(tokenLedger?.byCategory?.engagement || 0, { zero: 'balance' })}</strong>
                  </div>
                  <div>
                    <span>Quests &amp; Streak</span>
                    <strong>{formatMoney(tokenLedger?.byCategory?.quests || 0, { zero: 'balance' })}</strong>
                  </div>
                  <div>
                    <span>XP Reactor</span>
                    <strong>{formatMoney(tokenLedger?.byCategory?.xpConversion || 0, { zero: 'balance' })}</strong>
                  </div>
                </div>
                {Array.isArray(tokenLedger?.rewardedActionKeys) && tokenLedger.rewardedActionKeys.length > 0 && (
                  <ul className="tm-creator-ledger-keys">
                    {tokenLedger.rewardedActionKeys
                      .slice(-6)
                      .reverse()
                      .map((k, idx) => (
                        <li key={`${k}-${idx}`}>{String(k).replace(/[:_-]/g, ' · ')}</li>
                      ))}
                  </ul>
                )}
              </section>

              <section className="tm-creator-section" data-testid="creator-notif-prefs">
                <h2 className="tm-creator-section-heading">
                  <Bell size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>Notification Settings</span>
                </h2>
                <p className="tm-creator-section-sub">Saved on this device for alert preferences.</p>
                <div className="tm-creator-notif-list">
                  {[
                    { key: 'battleResults', label: 'Battle results are in' },
                    { key: 'memeMilestones', label: 'My meme hits 10 / 100 upvotes' },
                    { key: 'streakReminder', label: 'Evening streak saver reminder' },
                    { key: 'dailyBattleLive', label: 'Today’s Caption Battle goes live' }
                  ].map((item) => (
                    <label key={item.key} className="tm-creator-notif-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(notifPrefs[item.key])}
                        onChange={() => toggleNotifPref(item.key)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Badges (top 4 + See all) */}
          <section className="tm-creator-section" data-testid="creator-badges-section">
            <div className="tm-creator-section-head">
              <h2 className="tm-creator-section-heading">
                <Award size={16} strokeWidth={1.9} aria-hidden="true" />
                <span>Creator Badges ({unlockedCount}/{sortedBadges.length})</span>
              </h2>
              {sortedBadges.length > INITIAL_BADGE_COUNT && (
                <button
                  type="button"
                  className="tm-creator-see-all-btn"
                  aria-expanded={showAllBadges}
                  onClick={() => setShowAllBadges((prev) => !prev)}
                >
                  {showAllBadges ? 'Show fewer' : `See all ${sortedBadges.length}`}
                </button>
              )}
            </div>
            <div className="tm-creator-badges-grid">
              {visibleBadges.map((b) => (
                <div key={b.id} className={`tm-creator-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}>
                  <span className="tm-creator-badge-icon">{renderBadgeIcon(b.id)}</span>
                  <div className="tm-creator-badge-copy">
                    <div className="tm-creator-badge-name">
                      <span>{b.name || b.title}</span>
                      {b.unlocked ? (
                        <Check size={13} strokeWidth={2.2} className="tm-creator-badge-ok" aria-label="Unlocked" />
                      ) : (
                        <Lock size={12} strokeWidth={2} className="tm-creator-badge-lock" aria-label="Locked" />
                      )}
                    </div>
                    <div className="tm-creator-badge-desc">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Arcade High Scores */}
          <section className="tm-creator-section" data-testid="creator-highscores-section">
            <h2 className="tm-creator-section-heading">
              <Gamepad2 size={16} strokeWidth={1.9} aria-hidden="true" />
              <span>Arcade High Scores</span>
            </h2>
            {profile.highScores.length === 0 ? (
              <div className="tm-creator-empty-note">
                No cabinet high scores logged yet for @{profile.handle}.
              </div>
            ) : (
              <div className="tm-creator-scores-grid">
                {profile.highScores.map((s) => (
                  <div key={s.game} className="tm-creator-score-card">
                    <div>
                      <div className="tm-creator-score-title">{s.title}</div>
                      <div className="tm-creator-score-initials">
                        Initials: <strong>{s.initials}</strong>
                      </div>
                    </div>
                    <div className="tm-creator-score-value">{s.highScore.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Memes Posted */}
          <section className="tm-creator-section" data-testid="creator-memes-section">
            <h2 className="tm-creator-section-heading">
              <Image size={16} strokeWidth={1.9} aria-hidden="true" />
              <span>Memes Posted ({profile.memes.length})</span>
            </h2>
            {profile.memes.length === 0 ? (
              <div className="tm-creator-empty-note">
                @{profile.handle} has not posted any memes yet.
              </div>
            ) : (
              <div className="tm-creator-memes-grid">
                {profile.memes.map((meme) => (
                  <article key={meme.id} className="tm-creator-meme-card">
                    <img
                      src={meme.image_url}
                      alt={meme.title}
                      loading="lazy"
                      onClick={() => onSelectMeme?.(meme)}
                    />
                    <div className="tm-creator-meme-meta">
                      <strong className="tm-creator-meme-title">{meme.title}</strong>
                      <div className="tm-creator-meme-foot">
                        <span className="tm-creator-meme-score">
                          <Flame size={12} strokeWidth={2} aria-hidden="true" />
                          <span>{Number(meme.score || 0).toLocaleString()}</span>
                        </span>
                        <span>{formatMemeUploadDate(meme.created_at).relative}</span>
                      </div>
                      {REMIX_ENABLED && (
                        <button
                          type="button"
                          className="tm-btn tm-creator-remix-btn"
                          onClick={() => onRemixMeme?.(meme)}
                        >
                          <Palette size={13} strokeWidth={2} aria-hidden="true" />
                          <span>Remix</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
