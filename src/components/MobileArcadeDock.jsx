import { useState } from 'react';

export default function MobileArcadeDock({
  viewMode,
  showStudio,
  showLeaderboard,
  isAnyModalOpen,
  onSelectMode,
  onOpenBlankStudio,
  onOpenLeaderboard,
  onNavigateBack
}) {
  const [showGamesMenu, setShowGamesMenu] = useState(false);

  const isSideGameActive = ['slots', 'crush', 'pinball', 'battle', 'swipe'].includes(viewMode);

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
            <button
              type="button"
              className="tm-link-btn"
              onClick={() => setShowGamesMenu(false)}
            >
              ✕
            </button>
          </div>
          <div className="tm-dock-games-drawer-grid">
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
              className={`tm-dock-game-chip ${viewMode === 'pinball' ? 'active' : ''}`}
              onClick={() => handlePickMode('pinball')}
            >
              <span>🎱</span>
              <strong>Vegas Pinball</strong>
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
