import { REMIX_ENABLED } from '../config/featureFlags';
import { useEffect, useState } from 'react';
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
import './CreatorProfilePage.css';

const NOTIF_PREFS_KEY = 'tm_notif_prefs_v1';
const DEFAULT_NOTIF_PREFS = {
  battleResults: true,
  memeMilestones: true,
  streakReminder: true,
  dailyBattleLive: false
};

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
    setBioMessage('✅ Bio saved!');
  };

  const handleShareProfile = async () => {
    const cleanHandle = profile?.handle || handle;
    const path = getCreatorProfilePath(cleanHandle);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://thememes.net';
    const url = `${origin}${path}?ref=profile`;
    const title = `@${cleanHandle} — Level ${rankObj.level} ${rankObj.title} | THE MEMES.net`;
    track('meme_shared', { channel: 'profile_link' });
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.innerWidth <= 860) {
        await navigator.share({ title, url });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard?.writeText(url);
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
    setAvatarMessage('✅ Saved built-in pixel avatar!');
  };

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
          ← Back to Feed
        </button>
        <div style={{ fontSize: '12px', color: 'var(--tm-text-dim)' }}>
          {getCreatorProfilePath(profile?.handle || handle)}
        </div>
      </div>

      {loading && !profile ? (
        <div className="tm-creator-hero-card">⏳ Loading creator profile...</div>
      ) : !profile ? (
        <div className="tm-creator-hero-card">
          <h1>Creator handle not found</h1>
          <p style={{ color: 'var(--tm-text-dim)' }}>
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
                  size={74}
                  frame={profile.isCaptionKing ? 'caption-king' : ''}
                />
                <div>
                  <div className="tm-creator-handle-row">
                    <h1 data-testid="creator-profile-handle">@{profile.handle}</h1>
                    {profile.verified && (
                      <span className="tm-verified-pill">🛡️ Verified Creator</span>
                    )}
                    {profile.isCaptionKing && (
                      <span className="tm-rarity-badge supernova">👑 Caption King (24h)</span>
                    )}
                    <span
                      className="tm-tag"
                      style={{ background: 'rgba(250,204,21,0.18)', color: 'var(--tm-amber)' }}
                    >
                      Lv.{rankObj.level} {rankObj.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--tm-text-soft)', marginTop: '6px' }}>
                    <strong data-testid="creator-follower-count">
                      {profile.followerCount.toLocaleString()}
                    </strong>{' '}
                    Followers • 🔥 {profile.streakDays || 0}d Streak • 🏆 {profile.captionWins || 0} Battle Wins •{' '}
                    {profile.stats.totalScore.toLocaleString()} Upvotes
                  </div>
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
                  className="tm-btn"
                  data-testid="creator-share-btn"
                  onClick={handleShareProfile}
                >
                  {shareCopied ? '✅ Link Copied!' : '🔗 Share Profile'}
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
                      {profile.isFollowing ? '✓ Following' : '+ Follow'}
                    </button>
                    {onReportProfile && (
                      <button
                        type="button"
                        className="tm-btn"
                        style={{ minHeight: '44px' }}
                        data-testid="creator-report-btn"
                        onClick={() => onReportProfile(profile.handle)}
                      >
                        🚩 Report
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {followMessage && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--tm-amber)' }}>
                {followMessage}
              </div>
            )}

            <div className="tm-creator-stats-strip">
              <div className="tm-creator-kpi">
                <strong>{profile.stats.memesCount}</strong>
                <span>Memes Posted</span>
              </div>
              <div className="tm-creator-kpi">
                <strong style={{ color: 'var(--tm-amber)' }}>{profile.stats.totalScore.toLocaleString()}</strong>
                <span>Total Upvotes</span>
              </div>
              <div className="tm-creator-kpi">
                <strong style={{ color: '#fb923c' }}>🔥 {profile.streakDays || 0}d</strong>
                <span>Daily Streak</span>
              </div>
              <div className="tm-creator-kpi">
                <strong style={{ color: 'var(--tm-cyan)' }}>🏆 {profile.captionWins || 0}</strong>
                <span>Battle Wins</span>
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
                    <label htmlFor="tm-creator-bio-input">✍️ YOUR PROFILE BIO</label>
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
                <h2>💵 MEMEDOLLARZ LEDGER (JUST FOR FUN)</h2>
                <div style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--tm-text-soft)' }}>
                  Balance:{' '}
                  <strong style={{ color: 'var(--tm-amber)' }}>
                    {formatMoney(tokens, { centz: memeCentz, zero: 'balance' })}
                  </strong>{' '}
                  · Earned today:{' '}
                  <strong style={{ color: 'var(--tm-ok)' }}>
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
                <h2>🔔 NOTIFICATION SETTINGS</h2>
                <p style={{ fontSize: '12px', color: 'var(--tm-text-dim)', margin: '0 0 10px' }}>
                  Saved on this device for Phase 3 push alerts.
                </p>
                <div className="tm-creator-notif-list">
                  {[
                    { key: 'battleResults', label: '🏆 Battle results are in' },
                    { key: 'memeMilestones', label: '🔥 My meme hits 10 / 100 upvotes' },
                    { key: 'streakReminder', label: '⏰ Evening streak saver reminder' },
                    { key: 'dailyBattleLive', label: '⚔️ Today’s Caption Battle goes live' }
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

          {/* Badges */}
          <div className="tm-creator-section" data-testid="creator-badges-section">
            <h2>🏅 CREATOR BADGES</h2>
            <div className="tm-badges-grid">
              {profile.badges.map((b) => (
                <div key={b.id} className={`tm-badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}>
                  <span style={{ fontSize: '24px' }}>{b.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13px' }}>{b.name || b.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--tm-text-dim)' }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arcade High Scores */}
          <div className="tm-creator-section" data-testid="creator-highscores-section">
            <h2>🕹️ ARCADE HIGH SCORES</h2>
            {profile.highScores.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--tm-text-dim)' }}>
                No cabinet high scores logged yet for @{profile.handle}.
              </div>
            ) : (
              <div className="tm-creator-scores-grid">
                {profile.highScores.map((s) => (
                  <div key={s.game} className="tm-creator-score-card">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--tm-text)' }}>
                        {s.emoji} {s.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--tm-text-dim)' }}>
                        Initials: <strong>{s.initials}</strong>
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '18px', color: 'var(--tm-cyan)' }}>
                      {s.highScore.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memes Posted */}
          <div className="tm-creator-section" data-testid="creator-memes-section">
            <h2>🖼️ MEMES POSTED ({profile.memes.length})</h2>
            {profile.memes.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--tm-text-dim)' }}>
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
                      <strong style={{ fontSize: '13px', color: '#ffffff' }}>{meme.title}</strong>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'var(--tm-text-dim)'
                        }}
                      >
                        <span>🔥 {Number(meme.score || 0).toLocaleString()}</span>
                        <span>{formatMemeUploadDate(meme.created_at).relative}</span>
                      </div>
                      {REMIX_ENABLED && (
                        <button
                          type="button"
                          className="tm-btn"
                          style={{ fontSize: '11px', padding: '5px 8px' }}
                          onClick={() => onRemixMeme?.(meme)}
                        >
                          🎨 Remix
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
