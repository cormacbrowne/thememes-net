export default function MobileArcadeDock({
  viewMode,
  onSelectMode,
  onOpenBlankStudio,
  onOpenLeaderboard
}) {
  return (
    <nav className="tm-mobile-dock" aria-label="Arcade Bottom Dock">
      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'feed' ? 'active' : ''}`}
        onClick={() => onSelectMode('feed')}
      >
        <span className="tm-dock-icon">📱</span>
        <span>Feed</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'swipe' ? 'active' : ''}`}
        onClick={() => onSelectMode('swipe')}
      >
        <span className="tm-dock-icon">⚡</span>
        <span>Swipe</span>
      </button>

      <button
        type="button"
        className="tm-dock-btn tm-dock-btn-forge"
        onClick={onOpenBlankStudio}
      >
        <span className="tm-dock-icon">🎨</span>
        <span>+Forge</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${viewMode === 'battle' ? 'active' : ''}`}
        onClick={() => onSelectMode('battle')}
      >
        <span className="tm-dock-icon">⚔️</span>
        <span>Arena</span>
      </button>

      <button
        type="button"
        className="tm-dock-btn"
        onClick={onOpenLeaderboard}
      >
        <span className="tm-dock-icon">🏆</span>
        <span>Ranks</span>
      </button>
    </nav>
  );
}
