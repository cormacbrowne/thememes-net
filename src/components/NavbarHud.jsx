import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';

export default function NavbarHud({
  comboTimer,
  combo,
  dbStatus,
  currentRank,
  equippedFlair,
  xp,
  xpProgress,
  tokens = 50,
  dailyTokensEarned = 0,
  viewMode = 'feed',
  onSelectViewMode,
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

      {/* CLEAN, STREAMLINED TOP NAVIGATION BAR */}
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
                alt="THE MEMES.net Friendly Cyber-Arcade Star Mascot Logo"
                className="tm-mascot-logo-img"
                width="38"
                height="38"
                onError={(e) => {
                  e.currentTarget.src = '/favicon.svg';
                }}
              />
            </div>
            <div className="tm-logo-badge">THE MEMES.net</div>
            <div className="tm-status-pill tm-hide-mobile" title="Live Community Feed Connected">
              <span className={`tm-dot ${dbStatus === 'live' ? 'live' : 'local'}`} />
              <span className="tm-status-text">
                {dbStatus === 'live' ? 'LIVE' : 'ARCADE'}
              </span>
            </div>
          </div>
        </div>

        <div className="tm-hud">
          {/* Sub-Game Quick Shortcuts */}
          {onSelectViewMode && (
            <div className="tm-nav-subgames tm-hide-mobile">
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'crush' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('crush')}
                title="Play Meme Crush Saga — Candy-Crush Style Match-3 Puzzle!"
              >
                🍬 Meme Crush
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'pinball' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('pinball')}
                title="Play Las Vegas Retro Pinball Machine!"
              >
                🎱 Vegas Pinball
              </button>
            </div>
          )}

          {/* Fair Arcade Token Wallet & Daily Collection Cap Indicator */}
          <div
            className="tm-token-wallet-pill"
            onClick={onOpenRewards}
            title={`Fair Arcade Token Wallet: ${tokens} Tokens • Daily Collection: ${dailyTokensEarned}/${ARCADE_ECONOMY_RULES.MAX_DAILY_TOKENS} max today`}
          >
            <span className="tm-token-coin">🪙</span>
            <div>
              <div className="tm-token-balance">{tokens} Tokens</div>
              <div className="tm-token-cap-sub">
                {dailyTokensEarned}/{ARCADE_ECONOMY_RULES.MAX_DAILY_TOKENS} Daily Cap
              </div>
            </div>
          </div>

          <div
            className="tm-xp-box tm-hide-mobile"
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
            title="Open Arcade Vault: Token Ledger, Wheel of Chaos, Slots & Quests"
          >
            🎰 <span className="tm-hide-mobile">Vault</span>
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
            className="tm-btn tm-btn-icon-mobile"
            onClick={onToggleSound}
            title={soundOn ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>

          <button
            type="button"
            className={`tm-btn tm-btn-icon-mobile tm-hide-mobile ${crtOn ? 'tm-btn-crt-active' : ''}`}
            onClick={onToggleCrt}
            title="Toggle Retro CRT Scanline Shader"
          >
            📺
          </button>

          <button
            type="button"
            className="tm-btn tm-btn-primary tm-hide-mobile"
            onClick={onOpenBlankStudio}
          >
            📸 + Upload
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
              🛡️ Join
            </button>
          )}
        </div>
      </header>
    </>
  );
}
