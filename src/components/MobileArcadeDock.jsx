export default function MobileArcadeDock({
  viewMode,
  showStudio,
  showProfile,
  isAnyModalOpen,
  unreadNotificationsCount = 0,
  onSelectMode,
  onOpenBlankStudio,
  onOpenProfile,
  onNavigateBack
}) {
  const isSideGameActive = [
    'lobby',
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
    'hilow',
    'battle',
    'arena',
    'swipe'
  ].includes(viewMode);

  const handlePickMode = (mode) => {
    onSelectMode(mode);
  };

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
        onClick={onOpenBlankStudio}
      >
        <span className="tm-dock-icon">{showStudio ? '✕' : '➕'}</span>
        <span>{showStudio ? 'Close' : '+Create'}</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${isSideGameActive && !isAnyModalOpen ? 'active' : ''}`}
        onClick={() => handlePickMode('lobby')}
      >
        <span className="tm-dock-icon">🕹️</span>
        <span>Games</span>
      </button>

      <button
        type="button"
        className={`tm-dock-btn ${showProfile ? 'active' : ''}`}
        onClick={() => {
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
  );
}
