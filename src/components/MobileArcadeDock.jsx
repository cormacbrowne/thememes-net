import { ArrowLeft, Clapperboard, Gamepad2, Home, Plus, User, X } from 'lucide-react';

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
    'bingo',
    'pusher',
    'blackjack',
    'poker',
    'thousand',
    'roulette',
    'slots',
    'crush',
    'pinball',
    'stocks',
    'derby',
    'guess',
    'eightball',
    'hilow',
    'battle',
    'arena',
    'swipe'
  ].includes(viewMode);

  const handlePickMode = (mode) => {
    onSelectMode(mode);
  };

  const homeActive = viewMode === 'feed' && !isAnyModalOpen && !showProfile && !showStudio;
  const reelsActive = viewMode === 'reels' && !isAnyModalOpen;
  const gamesActive = isSideGameActive && !isAnyModalOpen;
  const profileActive = Boolean(showProfile);

  return (
    <nav className="tm-mobile-dock" aria-label="Arcade Bottom Dock">
      {isAnyModalOpen ? (
        <button
          type="button"
          className="ui-tube ui-tube--cyan tm-dock-btn tm-dock-btn-back"
          onClick={onNavigateBack}
        >
          <span className="tm-dock-icon">
            <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span>Back</span>
        </button>
      ) : (
        <button
          type="button"
          className={`ui-tube ui-tube--cyan tm-dock-btn ${homeActive ? 'active' : ''}`}
          onClick={() => handlePickMode('feed')}
          aria-label="Home Memes Feed"
        >
          <span className="tm-dock-icon">
            <Home size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <span>Home</span>
        </button>
      )}

      <button
        type="button"
        className={`ui-tube ui-tube--cyan tm-dock-btn ${reelsActive ? 'active' : ''}`}
        onClick={() => handlePickMode('reels')}
      >
        <span className="tm-dock-icon">
          <Clapperboard size={20} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <span>Reels</span>
      </button>

      <button
        type="button"
        className={`ui-tube ui-tube--pink ui-tube-box ui-tube-box--solid tm-dock-btn tm-dock-btn-forge ${
          showStudio ? 'active' : ''
        }`}
        onClick={onOpenBlankStudio}
      >
        <span className="tm-dock-icon">
          {showStudio ? (
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          ) : (
            <Plus size={20} strokeWidth={2.6} aria-hidden="true" />
          )}
        </span>
        <span>{showStudio ? 'Close' : 'Create'}</span>
      </button>

      <button
        type="button"
        className={`ui-tube ui-tube--cyan tm-dock-btn ${gamesActive ? 'active' : ''}`}
        onClick={() => handlePickMode('lobby')}
      >
        <span className="tm-dock-icon">
          <Gamepad2 size={20} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <span>Games</span>
      </button>

      <button
        type="button"
        className={`ui-tube ui-tube--cyan tm-dock-btn ${profileActive ? 'active' : ''}`}
        onClick={() => {
          if (onOpenProfile) onOpenProfile();
        }}
      >
        <span className="tm-dock-icon">
          <User size={20} strokeWidth={2.1} aria-hidden="true" />
          {unreadNotificationsCount > 0 && <span className="tm-dock-notif-dot" />}
        </span>
        <span>Profile</span>
      </button>
    </nav>
  );
}
