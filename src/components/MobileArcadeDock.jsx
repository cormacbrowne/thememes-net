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
          <span>Grid</span>
        </button>
      )}

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'reels' && !isAnyModalOpen ? 'active' : ''}`}
        onClick={() => onSelectMode('reels')}
      >
        <span className="tm-dock-icon">🎬</span>
        <span>Reels</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn tm-dock-btn-forge ${showStudio ? 'active' : ''}`}
        onClick={onOpenBlankStudio}
      >
        <span className="tm-dock-icon">{showStudio ? '✕' : '🎨'}</span>
        <span>{showStudio ? 'Close' : '+Forge'}</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'battle' && !isAnyModalOpen ? 'active' : ''}`}
        onClick={() => onSelectMode('battle')}
      >
        <span className="tm-dock-icon">⚔️</span>
        <span>Arena</span>
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
