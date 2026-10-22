export default function NavbarHud({
  comboTimer,
  combo,
  dbStatus,
  currentRank,
  equippedFlair,
  xp,
  xpProgress,
  crtOn,
  onToggleCrt,
  soundOn,
  onToggleSound,
  onOpenBlankStudio,
  onOpenLeaderboard,
  onOpenRewards,
  unclaimedRewardsCount,
  onOpenProfile,
  user,
  onLogout,
  onOpenAuthModal,
  onResetFeed,
  canGoBack,
  onNavigateBack
}) {
  return (
    <>
      {/* COMBO TIMER PROGRESS BAR */}
      <div className="tm-combo-bar">
        <div
          className={`tm-combo-fill ${combo >= 3 ? 'overdrive' : ''}`}
          style={{ width: `${comboTimer}%` }}
        />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="tm-nav">
        <div className="tm-brand-group">
          {canGoBack && (
            <button
              type="button"
              className="tm-btn tm-back-pill"
              onClick={onNavigateBack}
              title="Navigate Back"
            >
              ← Back
            </button>
          )}
          <div
            className="tm-brand"
            onClick={onResetFeed}
            title="Return to Main Feed (Tip: Tap 5x rapidly for Secret God Mode!)"
          >
            <div className="tm-mascot-logo-wrap">
              <img
                src="/logo-512.png"
                alt="THE MEMES.net Cyber-Jester Skull Mascot Logo"
                className="tm-mascot-logo-img"
                width="38"
                height="38"
                onError={(e) => {
                  e.currentTarget.src = '/favicon.svg';
                }}
              />
            </div>
            <div className="tm-logo-badge">THE MEMES.net</div>
            <div className="tm-status-pill" title="Connected to Supabase project otvvphmjojqyjaznjzyo">
              <span className={`tm-dot ${dbStatus === 'live' ? 'live' : 'local'}`} />
              <span className="tm-status-text">
                {dbStatus === 'live' ? 'SUPABASE LIVE' : 'ARCADE READY'}
              </span>
            </div>
          </div>
        </div>

        <div className="tm-hud">
          <div className={`tm-combo-badge ${combo >= 3 ? 'hot' : ''}`}>
            {combo > 1 ? `🔥 ${combo}x` : '⚡ 1x'}
            <span className="tm-hide-mobile">{combo > 1 ? ' OVERDRIVE' : ' COMBO'}</span>
          </div>

          <div
            className="tm-xp-box"
            style={{ cursor: 'pointer' }}
            onClick={() => onOpenProfile(user?.username || 'You (Arcade Player)')}
            title="Click to inspect your Arcade Player Card & Badges"
          >
            <div className="tm-xp-top">
              <span>
                Lv.{currentRank.level}{' '}
                <span className="tm-xp-rank-title">{equippedFlair || currentRank.title}</span>
              </span>
              <span style={{ color: '#facc15' }}>{xp} XP</span>
            </div>
            <div className="tm-xp-track">
              <div className="tm-xp-bar" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <button
            type="button"
            className="tm-btn tm-rewards-hud-btn"
            onClick={onOpenRewards}
            title="Open Wheel of Chaos Loot Box, Daily Streak & Quests"
          >
            🎰 <span className="tm-hide-mobile">Loot</span>
            {unclaimedRewardsCount > 0 && (
              <span className="tm-reward-alert-dot">{unclaimedRewardsCount}</span>
            )}
          </button>

          <button
            type="button"
            className="tm-btn tm-hide-mobile"
            onClick={onOpenLeaderboard}
            title="Open Cyber-Arcade Hall of Fame Leaderboard"
          >
            🏆 Ranks
          </button>

          <button
            type="button"
            className={`tm-btn tm-btn-icon-mobile ${crtOn ? 'tm-btn-crt-active' : ''}`}
            onClick={onToggleCrt}
            title="Toggle Retro CRT Scanline & Phosphor Shader"
          >
            📺<span className="tm-hide-mobile">{crtOn ? ' CRT: ON' : ' CRT: OFF'}</span>
          </button>

          <button
            type="button"
            className="tm-btn tm-btn-icon-mobile"
            onClick={onToggleSound}
            title={soundOn ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundOn ? '🔊' : '🔇'}
            <span className="tm-hide-mobile">{soundOn ? ' SFX' : ' MUTE'}</span>
          </button>

          <button
            type="button"
            className="tm-btn tm-btn-primary tm-hide-mobile"
            onClick={onOpenBlankStudio}
          >
            + Upload / Create
          </button>

          {user ? (
            <div style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                type="button"
                className="tm-btn tm-user-btn"
                onClick={() => onOpenProfile(user.username)}
                title={user.verified ? `Verified via ${user.provider || 'Auth'}` : 'Guest Session'}
              >
                {user.verified ? '🛡️' : '👾'}{' '}
                <span className="tm-username-trunc">@{user.username}</span>
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={onLogout}
                title="Log out"
                style={{ padding: '8px 10px' }}
              >
                🚪
              </button>
            </div>
          ) : (
            <button type="button" className="tm-btn tm-auth-cta" onClick={onOpenAuthModal}>
              🛡️ <span className="tm-hide-mobile">Log in / </span>Join
            </button>
          )}
        </div>
      </header>
    </>
  );
}
