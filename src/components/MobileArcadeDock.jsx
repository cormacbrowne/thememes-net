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
  return (
    <nav className="tm-mobile-dock" aria-label="Arcade Bottom Dock">
      {isAnyModalOpen ? (
        <button
          type="button"
          className="tm-dock-btn tm-dock-btn-back"
          onClick={onNavigateBack}
        >
          <span className="tm-dock-icon">↩</span>
          <span>Back</span>
        </button>
      ) : (
        <button
          type="button"
          className={`tm-dock-btn ${viewMode === 'feed' && !isAnyModalOpen ? 'active' : ''}`}
          onClick={() => onSelectMode('feed')}
        >
          <span className="tm-dock-icon">📱</span>
          <span>Memes</span>
        </button>
      )}

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'crush' && !isAnyModalOpen ? 'active' : ''}`}
        onClick={() => onSelectMode('crush')}
      >
        <span className="tm-dock-icon">🍬</span>
        <span>Crush</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn tm-dock-btn-forge ${showStudio ? 'active' : ''}`}
        onClick={onOpenBlankStudio}
      >
        <span className="tm-dock-icon">{showStudio ? '✕' : '📸'}</span>
        <span>{showStudio ? 'Close' : '+Upload'}</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'pinball' && !isAnyModalOpen ? 'active' : ''}`}
        onClick={() => onSelectMode('pinball')}
      >
        <span className="tm-dock-icon">🎱</span>
        <span>Pinball</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${showLeaderboard ? 'active' : ''}`}
        onClick={onOpenLeaderboard}
      >
        <span className="tm-dock-icon">🏆</span>
        <span>Ranks</span>
      </button>
    </nav>
  );
}
