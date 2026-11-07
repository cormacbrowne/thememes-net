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
  xpConversionState = null,
  xpAutoConvert = true,
  reactorFlash = false,
  onExchangeXpForTokens,
  viewMode = 'feed',
  onSelectViewMode,
  litePerfMode = false,
  onToggleLitePerf,
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
  onNavigateBack,
  aiAssistantOpen = false,
  onToggleAiAssistant
}) {
  const reactorPct = xpConversionState ? xpConversionState.progressPct : 0;
  const reactorProgressXp = xpConversionState ? xpConversionState.progressXp : 0;
  const reactorRemainingXp = xpConversionState ? xpConversionState.xpRemaining : 100;
  const reactorReadyTokens = xpConversionState ? xpConversionState.readyTokens : 0;
  const reactorCapped = xpConversionState ? xpConversionState.isDailyCapped : false;
  const ringRadius = 13;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - ((reactorReadyTokens > 0 ? 100 : reactorPct) / 100) * ringCircumference;

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
          {/* Side-Entertainment Quick Shortcuts */}
          {onSelectViewMode && (
            <div className="tm-nav-subgames tm-hide-mobile">
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'pusher' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('pusher')}
                style={{
                  borderColor: '#facc15',
                  background:
                    viewMode === 'pusher'
                      ? 'linear-gradient(135deg, #facc15, #f97316)'
                      : 'rgba(250, 204, 21, 0.16)',
                  color: viewMode === 'pusher' ? '#090d16' : '#fde047',
                  fontWeight: 900
                }}
                title="Play Neon Coin Dozer '86 — Push Coins, Diamonds & Prizes Over the Edge!"
              >
                🪙 Coin Dozer
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'pinball' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('pinball')}
                title="Play 5-Table 80s Hyper-Neon Cyber-Pinball (Center-Stage Widescreen)!"
              >
                🎱 Pinball
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'blackjack' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('blackjack')}
                title="Play Neon 21's Blackjack vs Dealer Bot '86!"
              >
                🃏 21&apos;s
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'roulette' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('roulette')}
                title="Spin Neon Lightning Roulette '86 (Up to 150x Multipliers)!"
              >
                🎡 Roulette
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'slots' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('slots')}
                title="Play THE MEMES.net Las Vegas 777 Slot Machine!"
              >
                🎰 Slots
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'crush' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('crush')}
                title="Play Meme Crush Saga — Candy-Crush Style Match-3 Puzzle!"
              >
                🍬 Crush
              </button>
              <button
                type="button"
                className={`tm-btn tm-subgame-nav-pill ${viewMode === 'stocks' ? 'active' : ''}`}
                onClick={() => onSelectViewMode('stocks')}
                title="Trade hilarious meme stocks on MEMEDAQ '86!"
              >
                📈 Stocks
              </button>
            </div>
          )}

          {/* Fair Arcade Token Wallet & Daily Collection Cap Indicator */}
          <div
            className={`tm-token-wallet-pill ${reactorFlash ? 'tm-wallet-mint-flash' : ''}`}
            onClick={onOpenRewards}
            title={`Arcade Token Wallet: ${tokens} Tokens • Daily Earned via Memes/Quests/Reactor: ${dailyTokensEarned}/${ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS}`}
          >
            <span className="tm-token-coin">🪙</span>
            <div>
              <div className="tm-token-balance">{tokens} Tokens</div>
              <div className="tm-token-cap-sub">
                {dailyTokensEarned}/{ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS} Earned
              </div>
            </div>
          </div>

          {/* LIVE XP-TO-TOKEN CONVERSION GRAPHIC RING */}
          {xpConversionState && (
            <div
              className={`tm-xp-reactor-pill ${reactorReadyTokens > 0 ? 'ready' : ''} ${
                reactorFlash ? 'flash' : ''
              }`}
              onClick={(e) => {
                if (reactorReadyTokens > 0 && onExchangeXpForTokens) {
                  onExchangeXpForTokens(e);
                } else if (onOpenRewards) {
                  onOpenRewards();
                }
              }}
              title={
                reactorCapped
                  ? `XP-to-Token Reactor: Daily 50 🪙 limit reached! Resets at midnight.`
                  : reactorReadyTokens > 0
                    ? `Click to Exchange ${xpConversionState.readyUnits * 100} XP → +${reactorReadyTokens} 🪙 right now! (Your Rank XP never drops)`
                    : `XP-to-Token Reactor (${xpAutoConvert ? 'AUTO' : 'MANUAL'}): ${reactorProgressXp}/100 XP — Only ${reactorRemainingXp} XP until +5 🪙 mints!`
              }
            >
              <div className="tm-xp-reactor-svg-wrap">
                <svg width="34" height="34" viewBox="0 0 34 34" className="tm-xp-reactor-svg">
                  <defs>
                    <linearGradient id="tmXpReactorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="55%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#facc15" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="17"
                    cy="17"
                    r={ringRadius}
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="rgba(148, 163, 184, 0.22)"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="17"
                    cy="17"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#tmXpReactorGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringDashOffset}
                    transform="rotate(-90 17 17)"
                    style={{ transition: 'stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  />
                </svg>
                <span className="tm-xp-reactor-center-icon">
                  {reactorFlash ? '🪙' : reactorReadyTokens > 0 ? '🔥' : '⚡'}
                </span>
              </div>
              <div className="tm-xp-reactor-meta tm-hide-mobile">
                <div className="tm-xp-reactor-top">
                  {reactorFlash
                    ? '+5 🪙 MINTED!'
                    : reactorReadyTokens > 0
                      ? `MINT +${reactorReadyTokens} 🪙!`
                      : `${reactorProgressXp}/100 XP`}
                </div>
                <div className="tm-xp-reactor-sub">
                  {reactorCapped
                    ? 'MAX 50🪙/DAY'
                    : reactorReadyTokens > 0
                      ? 'TAP TO EXCHANGE'
                      : `${reactorRemainingXp} XP → +5 🪙`}
                </div>
              </div>
            </div>
          )}

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

          {onToggleAiAssistant && (
            <button
              type="button"
              className={`tm-btn tm-ai-nav-btn ${aiAssistantOpen ? 'active' : ''}`}
              onClick={onToggleAiAssistant}
              title="Open CYBER-ORACLE '86 — Interactive AI Assistant & Smart Strategy Guide"
            >
              🤖 <span className="tm-hide-mobile">AI</span>
            </button>
          )}

          {onToggleLitePerf && (
            <button
              type="button"
              className={`tm-btn tm-btn-icon-mobile ${litePerfMode ? 'tm-btn-crt-active' : ''}`}
              onClick={onToggleLitePerf}
              title={
                litePerfMode
                  ? 'Turbo iPad/Mobile FPS Mode ON (Smooth low-CPU graphics — tap to toggle)'
                  : 'Enable Turbo FPS Mode for older iPads & battery saving'
              }
            >
              ⚡
            </button>
          )}

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
