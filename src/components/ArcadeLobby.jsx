import { useState, useMemo } from 'react';
import { sfx } from '../utils/soundEngine';
import { RadioStationStrip } from './MemesRadio';
import {
  ARCADE_GAMES_CATALOG,
  ARCADE_LOBBY_GROUPS,
  getRecentArcadeGames,
  getFavoriteArcadeGameIds,
  toggleFavoriteArcadeGameId
} from '../data/arcadeGamesCatalog';
import './ArcadeLobby.css';

export default function ArcadeLobby({
  tokens = 0,
  onSelectGame,
  onOpenRewards,
  onOpenExtras,
  onOpenLeaderboard,
  onToggleAiAssistant,
  onBackToFeed
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteArcadeGameIds());
  const recentGames = useMemo(() => getRecentArcadeGames(), []);

  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const handleToggleFavorite = (gameId) => {
    sfx.playToggle();
    setFavoriteIds(toggleFavoriteArcadeGameId(gameId));
  };

  const handlePlay = (gameId) => {
    sfx.playPop(2);
    if (onSelectGame) onSelectGame(gameId);
  };

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'favs') {
      const favGames = ARCADE_GAMES_CATALOG.filter((g) => favSet.has(g.id));
      return favGames.length > 0
        ? [{ id: 'favs', label: '★ Favourites', desc: 'Your pinned cabinets', games: favGames }]
        : [];
    }

    return ARCADE_LOBBY_GROUPS.filter(
      (grp) => activeFilter === 'all' || activeFilter === grp.id
    ).map((grp) => ({
      ...grp,
      games: ARCADE_GAMES_CATALOG.filter((g) => g.group === grp.id)
    }));
  }, [activeFilter, favSet]);

  return (
    <section className="tm-lobby" aria-label="Cyber Arcade Lobby">
      <header className="tm-lobby-hero">
        <div className="tm-lobby-hero-copy">
          <h1 className="tm-lobby-title">🕹️ Cyber-Arcade Lobby</h1>
          <p className="tm-lobby-sub">
            13 retro cabinets, free token tables &amp; daily meme games.
          </p>
        </div>

        <div className="tm-lobby-quick-actions">
          {onOpenRewards && (
            <button
              type="button"
              className="tm-lobby-wallet"
              onClick={() => {
                sfx.playToggle();
                onOpenRewards();
              }}
              aria-label={`Wallet balance ${tokens} tokens`}
            >
              🪙 <span>{tokens}</span>
            </button>
          )}
          {onOpenLeaderboard && (
            <button
              type="button"
              className="tm-lobby-util-btn"
              onClick={() => {
                sfx.playToggle();
                onOpenLeaderboard();
              }}
            >
              🏆 Ranks
            </button>
          )}
          {onOpenExtras && (
            <button
              type="button"
              className="tm-lobby-util-btn"
              onClick={() => {
                sfx.playToggle();
                onOpenExtras();
              }}
            >
              ⚙️ Settings &amp; SFX
            </button>
          )}
          {onToggleAiAssistant && (
            <button
              type="button"
              className="tm-lobby-util-btn"
              onClick={() => {
                sfx.playToggle();
                onToggleAiAssistant();
              }}
            >
              🤖 AI
            </button>
          )}
          {onBackToFeed && (
            <button
              type="button"
              className="tm-lobby-util-btn"
              onClick={() => {
                sfx.playToggle();
                onBackToFeed();
              }}
            >
              ← Feed
            </button>
          )}
        </div>
      </header>

      <div className="tm-lobby-radio-wrap">
        <RadioStationStrip autoStart compact />
      </div>

      {/* Category Filter Pills */}
      <div className="tm-lobby-filters" role="tablist" aria-label="Filter Arcade Games">
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'all'}
          className={`tm-lobby-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({ARCADE_GAMES_CATALOG.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'favs'}
          className={`tm-lobby-filter-pill ${activeFilter === 'favs' ? 'active' : ''}`}
          onClick={() => setActiveFilter('favs')}
        >
          ★ Favourites ({favoriteIds.length})
        </button>
        {ARCADE_LOBBY_GROUPS.map((grp) => (
          <button
            key={grp.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === grp.id}
            className={`tm-lobby-filter-pill ${activeFilter === grp.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(grp.id)}
          >
            {grp.label}
          </button>
        ))}
      </div>

      {/* Continue Playing Row */}
      {activeFilter === 'all' && recentGames.length > 0 && (
        <div className="tm-lobby-section">
          <div className="tm-lobby-section-head">
            <h2 className="tm-lobby-section-title">⏯️ Continue playing</h2>
            <span className="tm-lobby-section-desc">Your last {recentGames.length} cabinets</span>
          </div>
          <div className="tm-lobby-continue-grid">
            {recentGames.map((game) => (
              <CabinetCard
                key={`recent-${game.id}`}
                game={game}
                isFav={favSet.has(game.id)}
                onPlay={handlePlay}
                onToggleFav={handleToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped Sections */}
      {visibleGroups.length === 0 ? (
        <div className="tm-lobby-empty">
          Tap the ☆ star on any cabinet to pin it to your Favourites row.
        </div>
      ) : (
        visibleGroups.map((group) => (
          <div key={group.id} className="tm-lobby-section">
            <div className="tm-lobby-section-head">
              <h2 className="tm-lobby-section-title">{group.label}</h2>
              <span className="tm-lobby-section-desc">{group.desc}</span>
            </div>
            <div className="tm-lobby-grid">
              {group.games.map((game) => (
                <CabinetCard
                  key={game.id}
                  game={game}
                  isFav={favSet.has(game.id)}
                  onPlay={handlePlay}
                  onToggleFav={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <p className="tm-lobby-compliance">
        Tokens are free, just for fun, can&apos;t be bought or cashed out.
      </p>
    </section>
  );
}

function CabinetCard({ game, isFav, onPlay, onToggleFav }) {
  return (
    <article className="tm-lobby-card" style={{ '--card-accent': game.accent }}>
      <button
        type="button"
        className={`tm-lobby-fav-btn ${isFav ? 'is-fav' : ''}`}
        onClick={() => onToggleFav(game.id)}
        aria-label={isFav ? `Remove ${game.label} from favourites` : `Pin ${game.label} to favourites`}
        aria-pressed={isFav}
      >
        {isFav ? '★' : '☆'}
      </button>

      <button
        type="button"
        className="tm-lobby-card-play"
        onClick={() => onPlay(game.id)}
      >
        <div className="tm-lobby-card-thumb">
          <span className="tm-lobby-card-icon" aria-hidden="true">
            {game.icon}
          </span>
          <div className="tm-lobby-card-badges">
            {game.isNew && <span className="tm-lobby-badge tm-lobby-badge-new">NEW</span>}
            {game.badge && game.badge !== 'NEW' && (
              <span className="tm-lobby-badge">{game.badge}</span>
            )}
          </div>
        </div>
        <div className="tm-lobby-card-body">
          <h3 className="tm-lobby-card-title">{game.label}</h3>
          <p className="tm-lobby-card-pitch">{game.pitch}</p>
        </div>
      </button>
    </article>
  );
}
