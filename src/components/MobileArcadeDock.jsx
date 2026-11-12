import { useState } from 'react';
import { RadioStationStrip } from './MemesRadio';

export default function MobileArcadeDock({
  viewMode,
  showStudio,
  showProfile,
  isAnyModalOpen,
  unreadNotificationsCount = 0,
  onSelectMode,
  onOpenBlankStudio,
  onOpenLeaderboard,
  onOpenExtras,
  onOpenProfile,
  onNavigateBack,
  onToggleAiAssistant
}) {
  const [showGamesMenu, setShowGamesMenu] = useState(false);

  const isSideGameActive = [
    'pusher',
    'blackjack',
    'roulette',
    'slots',
    'crush',
    'pinball',
    'stocks',
    'derby',
    'guess',
    'plinko',
    'battle',
    'arena',
    'swipe'
  ].includes(viewMode);

  const handlePickMode = (mode) => {
    setShowGamesMenu(false);
    onSelectMode(mode);
  };

  return (
    <>
      {/* Pop-Up Side-Entertainment Games & Extras Drawer above the Mobile Dock */}
      {showGamesMenu && !isAnyModalOpen && (
        <div
          className="tm-dock-games-drawer"
          role="dialog"
          aria-label="Side Entertainment Arcade Games & Extras"
        >
          <div className="tm-dock-games-drawer-head">
            <span>🕹️ ARCADE GAMES &amp; EXTRAS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onOpenExtras && (
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                  onClick={() => {
                    setShowGamesMenu(false);
                    onOpenExtras();
                  }}
                >
                  🎹 Extras &amp; SFX
                </button>
              )}
              {onToggleAiAssistant && (
                <button
                  type="button"
                  className="tm-btn"
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                  onClick={() => {
                    setShowGamesMenu(false);
                    onToggleAiAssistant();
                  }}
                >
                  🤖 AI
                </button>
              )}
              <button
                type="button"
                className="tm-link-btn"
                onClick={() => setShowGamesMenu(false)}
              >
                ✕
              </button>
            </div>
          </div>
          <RadioStationStrip autoStart compact />
          <div className="tm-dock-games-drawer-grid">
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'pusher' ? 'active' : ''}`}
              onClick={() => handlePickMode('pusher')}
              style={{
                gridColumn: '1 / -1',
                borderColor: '#facc15',
                background:
                  'linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(236, 72, 153, 0.22))'
              }}
            >
              <span>🪙</span>
              <strong style={{ color: '#fde047' }}>
                🔥 Neon Coin Dozer &apos;86 (3D Prize Pusher)
              </strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'derby' ? 'active' : ''}`}
              onClick={() => handlePickMode('derby')}
            >
              <span>🏇</span>
              <strong>Neon Derby &apos;86</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'guess' ? 'active' : ''}`}
              onClick={() => handlePickMode('guess')}
            >
              <span>🧠</span>
              <strong>Guess The Meme</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'plinko' ? 'active' : ''}`}
              onClick={() => handlePickMode('plinko')}
            >
              <span>🎯</span>
              <strong>Meme Plinko</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'pinball' ? 'active' : ''}`}
              onClick={() => handlePickMode('pinball')}
            >
              <span>🎱</span>
              <strong>Pinball (5 Tbl)</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'blackjack' ? 'active' : ''}`}
              onClick={() => handlePickMode('blackjack')}
            >
              <span>🃏</span>
              <strong>Neon 21&apos;s</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'roulette' ? 'active' : ''}`}
              onClick={() => handlePickMode('roulette')}
            >
              <span>🎡</span>
              <strong>Lightning Roulette</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'slots' ? 'active' : ''}`}
              onClick={() => handlePickMode('slots')}
            >
              <span>🎰</span>
              <strong>Vegas 777 Slots</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'crush' ? 'active' : ''}`}
              onClick={() => handlePickMode('crush')}
            >
              <span>🍬</span>
              <strong>Meme Crush</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'stocks' ? 'active' : ''}`}
              onClick={() => handlePickMode('stocks')}
            >
              <span>📈</span>
              <strong>Meme Stocks</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'battle' ? 'active' : ''}`}
              onClick={() => handlePickMode('battle')}
            >
              <span>⚔️</span>
              <strong>1v1 Meme Arena</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'swipe' ? 'active' : ''}`}
              onClick={() => handlePickMode('swipe')}
            >
              <span>⚡</span>
              <strong>Hyper Swipe</strong>
            </button>
            {onOpenLeaderboard && (
              <button
                type="button"
                className="tm-dock-game-chip"
                onClick={() => {
                  setShowGamesMenu(false);
                  onOpenLeaderboard();
                }}
              >
                <span>🏆</span>
                <strong>Hall of Fame Ranks</strong>
              </button>
            )}
            {onOpenExtras && (
              <button
                type="button"
                className="tm-dock-game-chip"
                onClick={() => {
                  setShowGamesMenu(false);
                  onOpenExtras();
                }}
              >
                <span>🕹️</span>
                <strong>Extras &amp; Soundboard</strong>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5-BUTTON THUMB DOCK: Memes / Reels / +Create / Games / Profile */}
      <nav className="tm-mobile-dock" aria-label="Arcade Bottom Dock">
        {isAnyModalOpen ? (
          <button
            type="button"
            className="tm-dock-btn tm-dock-btn-back"
            onClick={() => {
              setShowGamesMenu(false);
              onNavigateBack();
            }}
          >
            <span className="tm-dock-icon">↩</span>
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            className={`tm-dock-btn ${viewMode === 'feed' && !isAnyModalOpen ? 'active' : ''}`}
            onClick={() => handlePickMode('feed')}
          >
            <span className="tm-dock-icon">📱</span>
            <span>Memes</span>
          </button>
        )}

        <button
          type="button"
          className={`tm-dock-btn ${viewMode === 'reels' && !isAnyModalOpen ? 'active' : ''}`}
          onClick={() => handlePickMode('reels')}
        >
          <span className="tm-dock-icon">🎬</span>
          <span>Reels</span>
        </button>

        <button
          type="button"
          className={`tm-dock-btn tm-dock-btn-forge ${showStudio ? 'active' : ''}`}
          onClick={() => {
            setShowGamesMenu(false);
            onOpenBlankStudio();
          }}
        >
          <span className="tm-dock-icon">{showStudio ? '✕' : '➕'}</span>
          <span>{showStudio ? 'Close' : '+Create'}</span>
        </button>

        <button
          type="button"
          className={`tm-dock-btn ${(isSideGameActive || showGamesMenu) && !isAnyModalOpen ? 'active' : ''}`}
          onClick={() => setShowGamesMenu((prev) => !prev)}
        >
          <span className="tm-dock-icon">🕹️</span>
          <span>Games</span>
        </button>

        <button
          type="button"
          className={`tm-dock-btn ${showProfile ? 'active' : ''}`}
          onClick={() => {
            setShowGamesMenu(false);
            if (onOpenProfile) onOpenProfile();
          }}
        >
          <span className="tm-dock-icon">
            👤
            {unreadNotificationsCount > 0 && <span className="tm-dock-notif-dot" />}
          </span>
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
}
