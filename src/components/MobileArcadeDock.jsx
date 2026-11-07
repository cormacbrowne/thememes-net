import { useState } from 'react';

export default function MobileArcadeDock({
  viewMode,
  showStudio,
  showLeaderboard,
  isAnyModalOpen,
  onSelectMode,
  onOpenBlankStudio,
  onOpenLeaderboard,
  onNavigateBack,
  onToggleAiAssistant
}) {
  const [showGamesMenu, setShowGamesMenu] = useState(false);

  const isSideGameActive = ['pusher', 'blackjack', 'roulette', 'slots', 'crush', 'pinball', 'stocks', 'battle', 'swipe'].includes(viewMode);

  const handlePickMode = (mode) => {
    setShowGamesMenu(false);
    onSelectMode(mode);
  };

  return (
    <>
      {/* Pop-Up Side-Entertainment Games Drawer above the Mobile Dock */}
      {showGamesMenu && !isAnyModalOpen && (
        <div
          className="tm-dock-games-drawer"
          role="dialog"
          aria-label="Side Entertainment Arcade Games"
        >
          <div className="tm-dock-games-drawer-head">
            <span>🕹️ SIDE-ENTERTAINMENT ARCADE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onToggleAiAssistant && (
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                  onClick={() => {
                    setShowGamesMenu(false);
                    onToggleAiAssistant();
                  }}
                >
                  🤖 Ask Cyber-AI
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
          <div className="tm-dock-games-drawer-grid">
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'pusher' ? 'active' : ''}`}
              onClick={() => handlePickMode('pusher')}
              style={{
                gridColumn: '1 / -1',
                borderColor: '#facc15',
                background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.25), rgba(236, 72, 153, 0.22))'
              }}
            >
              <span>🪙</span>
              <strong style={{ color: '#fde047' }}>🔥 Neon Coin Dozer &apos;86 (NEW Prize Pusher!)</strong>
            </button>
            <button
              type="button"
              className={`tm-dock-game-chip ${viewMode === 'blackjack' ? 'active' : ''}`}
              onClick={() => handlePickMode('blackjack')}
            >
              <span>🃏</span>
              <strong>Neon 21&apos;s (Blackjack)</strong>
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
              <strong>One-Arm Bandit</strong>
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
              className={`tm-dock-game-chip ${viewMode === 'crush' ? 'active' : ''}`}
              onClick={() => handlePickMode('crush')}
            >
              <span>🍬</span>
              <strong>Meme Crush (10 Lv)</strong>
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
          </div>
        </div>
      )}

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
          className={`tm-dock-btn ${viewMode === 'pusher' && !isAnyModalOpen ? 'active' : ''}`}
          onClick={() => handlePickMode('pusher')}
        >
          <span className="tm-dock-icon">🪙</span>
          <span>Dozer</span>
        </button>

        <button
          type="button"
          className={`tm-dock-btn tm-dock-btn-forge ${showStudio ? 'active' : ''}`}
          onClick={() => {
            setShowGamesMenu(false);
            onOpenBlankStudio();
          }}
        >
          <span className="tm-dock-icon">{showStudio ? '✕' : '📸'}</span>
          <span>{showStudio ? 'Close' : '+Upload'}</span>
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
          className={`tm-dock-btn ${showLeaderboard ? 'active' : ''}`}
          onClick={() => {
            setShowGamesMenu(false);
            onOpenLeaderboard();
          }}
        >
          <span className="tm-dock-icon">🏆</span>
          <span>Ranks</span>
        </button>
      </nav>
    </>
  );
}
