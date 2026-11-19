import { useEffect, useRef, useState } from 'react';
import { Menu, Plus, ShieldCheck } from 'lucide-react';
import { ARCADE_ECONOMY_RULES, formatMoney } from '../utils/tokenEconomy';
import { ARCADE_GAMES_CATALOG } from '../data/arcadeGamesCatalog';
import { formatLivePresenceLabel } from '../utils/liveSignals';
import { RadioToggleButton } from './MemesRadio';
import { Wallet } from './ui/Money';
import NeonSign from './NeonSign';

export default function NavbarHud({
  comboTimer,
  combo,
  dbStatus,
  onlineCount = 0,
  unreadNotificationsCount = 0,
  currentRank,
  tokens = 50,
  memeCentz = 25,
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
  anonHandle = '',
  onLogout,
  onOpenAuthModal,
  onResetFeed,
  canGoBack,
  onNavigateBack,
  onOpenExtras,
  onOpenInstallModal
}) {
  const reactorReadyTokens = xpConversionState ? xpConversionState.readyTokens : 0;
  const activeGame = ARCADE_GAMES_CATALOG.find((g) => g.id === viewMode);
  const [scrollHidden, setScrollHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        const y = window.scrollY || 0;
        const isPhone = window.innerWidth <= 860;
        const reduced =
          document.documentElement.dataset.reducedMotion === 'on' ||
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (!isPhone || reduced || y < 72) {
          setScrollHidden(false);
        } else if (y > lastScrollYRef.current + 10) {
          setScrollHidden(true);
        } else if (y < lastScrollYRef.current - 10) {
          setScrollHidden(false);
        }
        lastScrollYRef.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      {/* COMBO TIMER PROGRESS BAR */}
      <div className="tm-combo-bar">
        <div
          className={`tm-combo-fill ${combo >= 3 ? 'overdrive' : ''}`}
          style={{ width: `${comboTimer}%` }}
        />
      </div>

      {/* STREAMLINED TOP NAVIGATION BAR */}
      <header className={`tm-nav ${viewMode === 'reels' ? 'tm-nav-reels-mode' : ''} ${scrollHidden ? 'is-scroll-hidden' : ''}`}>
        <div className="tm-brand-group">
          {canGoBack && (
            <button
              type="button"
              className="tm-btn tm-back-pill tm-hide-mobile"
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
            <NeonSign size="nav" />
            {formatLivePresenceLabel(onlineCount) ? (
              <div
                className="tm-status-pill tm-live-presence-pill tm-hide-mobile"
                title="Real connected memers currently browsing"
                data-testid="live-presence-pill"
              >
                <span className="tm-dot live" />
                <span className="tm-status-text">{formatLivePresenceLabel(onlineCount)}</span>
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

        {/* DESKTOP PRIMARY MODE SWITCHER: Home / Reels / Games */}
        {onSelectViewMode && (
          <nav className="tm-nav-primary-modes tm-hide-mobile" aria-label="Primary Views">
            <button
              type="button"
              className={`ui-tube ui-tube--cyan ui-tube-box tm-nav-mode-pill ${viewMode === 'feed' ? 'active' : 'ui-tube-box--off'}`}
              onClick={() => (onResetFeed ? onResetFeed() : onSelectViewMode('feed'))}
              title="Back to Home Page (Memes + Arcade Portal)"
            >
              Home
            </button>
            <button
              type="button"
              className={`ui-tube ui-tube--cyan ui-tube-box tm-nav-mode-pill ${viewMode === 'reels' ? 'active' : 'ui-tube-box--off'}`}
              onClick={() => onSelectViewMode('reels')}
            >
              Reels
            </button>

            <button
              type="button"
              className={`ui-tube ui-tube--cyan ui-tube-box tm-nav-mode-pill ${viewMode === 'lobby' || activeGame ? 'active' : 'ui-tube-box--off'}`}
              onClick={() => onSelectViewMode('lobby')}
              title="Open Cyber-Arcade Lobby"
            >
              {activeGame ? activeGame.label : 'Games'}
            </button>
            <button
              type="button"
              className={`ui-tube ui-tube--cyan ui-tube-box tm-nav-mode-pill tm-nav-extra-pill ${viewMode === 'templates' ? 'active' : 'ui-tube-box--off'}`}
              onClick={() => onSelectViewMode('templates')}
              title="Free meme templates"
            >
              Templates
            </button>
            <button
              type="button"
              className={`ui-tube ui-tube--cyan ui-tube-box tm-nav-mode-pill tm-nav-extra-pill ${viewMode === 'pranks' ? 'active' : 'ui-tube-box--off'}`}
              onClick={() => onSelectViewMode('pranks')}
              title="Fullscreen prank screens"
            >
              Pranks
            </button>
          </nav>
        )}

        <div className="tm-hud">
          {/* 1. +CREATE PRIMARY BUTTON (Desktop — unlit on home page so hero Make a meme leads) */}
          <button
            type="button"
            className={`ui-tube ui-tube--pink ui-tube-box ${viewMode === 'feed' ? 'ui-tube-box--off' : 'ui-tube-box--solid'} tm-nav-create-btn tm-hide-mobile`}
            onClick={onOpenBlankStudio}
            title="Create or Remix a Meme in the Studio"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>Create</span>
          </button>

          {/* 2. UNIFIED MEMEDOLLARZ & MEMECENTZ WALLET PILL */}
          <Wallet
            tokens={tokens}
            centz={memeCentz}
            size="sm"
            className={`tm-token-wallet-pill ${reactorFlash ? 'tm-wallet-mint-flash' : ''}`}
            onClick={(e) => {
              if (reactorReadyTokens > 0 && onExchangeXpForTokens) {
                onExchangeXpForTokens(e);
              } else if (onOpenRewards) {
                onOpenRewards();
              }
            }}
            ariaLabel={`Open MemeDollarz Wallet — ${formatMoney(tokens, { centz: memeCentz, zero: 'balance' })}`}
            title={
              reactorReadyTokens > 0
                ? `Tap to mint +${formatMoney(reactorReadyTokens)} MemeDollarz from your XP Reactor!`
                : `MemeDollarz Wallet & Vault: ${formatMoney(tokens, { centz: memeCentz, zero: 'balance' })} (Lv.${currentRank?.level || 1} • Max ${formatMoney(ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS)}/day)`
            }
            badge={
              (unclaimedRewardsCount > 0 || reactorReadyTokens > 0) && (
                <span className="tm-reward-alert-dot">
                  {reactorReadyTokens > 0 ? `+${formatMoney(reactorReadyTokens)}` : unclaimedRewardsCount}
                </span>
              )
            }
          />

          {/* 2.2 INSTALL AS IPHONE APP SHORTCUT (Desktop / Tablet) */}
          {onOpenInstallModal && (
            <button
              type="button"
              className="ui-tube-box ui-tube-box--off tm-nav-compact-btn tm-hide-mobile"
              onClick={onOpenInstallModal}
              title="Make THE MEMES.net an iPhone / Mobile App"
              aria-label="Make THE MEMES.net an iPhone App"
            >
              App
            </button>
          )}

          {/* 2.5 THE MEMES FM COMPACT RADIO & EQUALISER CLUSTER (Desktop) */}
          <div className="tm-hide-mobile">
            <RadioToggleButton />
          </div>

          {/* 3. UNIFIED EXTRAS DRAWER ("More" on phones) */}
          {onOpenExtras && (
            <button
              type="button"
              className="ui-tube-box ui-tube-box--off tm-extras-hud-btn"
              onClick={onOpenExtras}
              aria-label="More tools, radio, soundboard, and settings"
              title="Open Extras Drawer: Radio, Soundboard, Goose, Payphone, Boss Key, CRT & Settings"
            >
              <Menu size={18} strokeWidth={2.1} aria-hidden="true" />
              <span className="tm-extras-btn-label">More</span>
            </button>
          )}

          {/* 4. PROFILE / JOIN BUTTON (Desktop; Mobile uses bottom dock Profile tab) */}
          {user ? (
            <div className="tm-hide-mobile" style={{ display: 'inline-flex', gap: '4px' }}>
              {(user.role === 'moderator' || user.role === 'admin') && (
                <a
                  href="/admin/moderation"
                  className="tm-btn"
                  title="Moderation queue (approve / remove memes)"
                  aria-label="Open moderation queue"
                  style={{ padding: '6px 9px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                </a>
              )}
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
              title={
                anonHandle
                  ? `Anonymous session (@${anonHandle}) — click to sign in and claim your handle`
                  : 'Sign in or create your verified profile'
              }
            >
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
}
