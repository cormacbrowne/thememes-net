import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { ARCADE_GAMES_CATALOG } from '../data/arcadeGamesCatalog';
import { RadioToggleButton } from './MemesRadio';

export default function NavbarHud({
  comboTimer,
  combo,
  dbStatus,
  onlineCount = 0,
  unreadNotificationsCount = 0,
  currentRank,
  tokens = 50,
  xpConversionState = null,
  reactorFlash = false,
  onExchangeXpForTokens,
  viewMode = 'feed',
  onSelectViewMode,
  onOpenBlankStudio,
  onOpenRewards,
  unclaimedRewardsCount = 0,
  onOpenProfile,
  user,
  onLogout,
  onOpenAuthModal,
  onResetFeed,
  canGoBack,
  onNavigateBack,
  onOpenExtras
}) {
  const reactorReadyTokens = xpConversionState ? xpConversionState.readyTokens : 0;
  const activeGame = ARCADE_GAMES_CATALOG.find((g) => g.id === viewMode);

  return (
    <>
      {/* COMBO TIMER PROGRESS BAR */}
      <div className="tm-combo-bar">
        <div
          className={`tm-combo-fill ${combo >= 3 ? 'overdrive' : ''}`}
          style={{ width: `${comboTimer}%` }}
        />
      </div>

      {/* STREAMLINED TOP NAVIGATION BAR (<= 6 Primary Controls) */}
      <header className={`tm-nav ${viewMode === 'reels' ? 'tm-nav-reels-mode' : ''}`}>
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
                width="36"
                height="36"
                onError={(e) => {
                  e.currentTarget.src = '/favicon.svg';
                }}
              />
            </div>
            <div className="tm-logo-badge">THE MEMES.net</div>
            {onlineCount >= 2 ? (
              <div className="tm-status-pill tm-live-presence-pill" title="Real connected memers currently browsing">
                <span className="tm-dot live" />
                <span className="tm-status-text">🟢 {onlineCount} memers online</span>
              </div>
            ) : (
              <div className="tm-status-pill tm-hide-mobile" title="Live Community Feed Connected">
                <span className={`tm-dot ${dbStatus === 'live' ? 'live' : 'local'}`} />
                <span className="tm-status-text">
                  {dbStatus === 'live' ? 'LIVE' : 'ARCADE'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP PRIMARY MODE SWITCHER: Memes / Reels / Games */}
        {onSelectViewMode && (
          <nav className="tm-nav-primary-modes tm-hide-mobile" aria-label="Primary Views">
            <button
              type="button"
              className={`tm-btn tm-nav-mode-pill ${viewMode === 'feed' ? 'active' : ''}`}
              onClick={() => onSelectViewMode('feed')}
            >
              📱 Memes
            </button>
            <button
              type="button"
              className={`tm-btn tm-nav-mode-pill ${viewMode === 'reels' ? 'active' : ''}`}
              onClick={() => onSelectViewMode('reels')}
            >
              🎬 Reels
            </button>

            <button
              type="button"
              className={`tm-btn tm-nav-mode-pill ${viewMode === 'lobby' || activeGame ? 'active' : ''}`}
              onClick={() => onSelectViewMode('lobby')}
              title="Open Cyber-Arcade Lobby"
            >
              🕹️ {activeGame ? activeGame.label : 'Games'}
            </button>
          </nav>
        )}

        <div className="tm-hud">
          {/* 1. +CREATE PRIMARY BUTTON (Desktop) */}
          <button
            type="button"
            className="tm-btn tm-btn-primary tm-hide-mobile"
            onClick={onOpenBlankStudio}
            title="Create or Remix a Meme in the Studio"
          >
            ➕ Create
          </button>

          {/* 2. UNIFIED WALLET / VAULT PILL */}
          <button
            type="button"
            className={`tm-token-wallet-pill ${reactorFlash ? 'tm-wallet-mint-flash' : ''}`}
            onClick={(e) => {
              if (reactorReadyTokens > 0 && onExchangeXpForTokens) {
                onExchangeXpForTokens(e);
              } else if (onOpenRewards) {
                onOpenRewards();
              }
            }}
            title={
              reactorReadyTokens > 0
                ? `Tap to mint +${reactorReadyTokens} 🪙 from your XP Reactor!`
                : `Arcade Wallet & Vault (Lv.${currentRank?.level || 1} • Max ${ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS}/day)`
            }
          >
            <span className="tm-token-coin">{reactorReadyTokens > 0 ? '🔥' : '🪙'}</span>
            <span className="tm-token-balance">{tokens}</span>
            {(unclaimedRewardsCount > 0 || reactorReadyTokens > 0) && (
              <span className="tm-reward-alert-dot">
                {reactorReadyTokens > 0 ? `+${reactorReadyTokens}` : unclaimedRewardsCount}
              </span>
            )}
          </button>

          {/* 2.5 THE MEMES FM COMPACT RADIO TOGGLE */}
          <RadioToggleButton />

          {/* 3. UNIFIED EXTRAS DRAWER BUTTON */}
          {onOpenExtras && (
            <button
              type="button"
              className="tm-btn tm-extras-hud-btn"
              onClick={onOpenExtras}
              title="Open Extras Drawer: 16-Pad Soundboard, WTF?! Goose, 1-800-MEME Payphone, Boss Key, CRT, Turbo & Device Badge"
            >
              🕹️ <span className="tm-extras-btn-label">Extras</span>
            </button>
          )}

          {/* 4. PROFILE / JOIN BUTTON (Desktop; Mobile uses bottom dock Profile tab) */}
          {user ? (
            <div className="tm-hide-mobile" style={{ display: 'inline-flex', gap: '4px' }}>
              <button
                type="button"
                className="tm-btn tm-user-btn"
                onClick={() => onOpenProfile(user.username)}
                title={user.verified ? `Verified via ${user.provider || 'Auth'}` : 'Player Profile'}
              >
                {user.verified ? '🛡️' : '👤'}{' '}
                <span className="tm-username-trunc">@{user.username}</span>
                {unreadNotificationsCount > 0 && (
                  <span className="tm-reward-alert-dot" title="New creator alerts">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="tm-btn"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
                style={{ padding: '6px 9px' }}
              >
                🚪
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tm-btn tm-auth-cta tm-hide-mobile"
              onClick={onOpenAuthModal}
              title="Sign in or create your Arcade Profile"
            >
              👤 Profile
            </button>
          )}
        </div>
      </header>
    </>
  );
}
