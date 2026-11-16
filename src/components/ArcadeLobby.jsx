import { useState, useMemo } from 'react';
import { sfx } from '../utils/soundEngine';
import { formatMoney } from '../utils/tokenEconomy';
import { SITE_ORIGIN } from '../data/seoRoutes';
import { RadioStationStrip } from './MemesRadio';
import { DeLoreanDockBanner } from './DeLoreanTimeMachine';
import { Wallet } from './ui/Money';
import EightiesIconsStrip from './EightiesIconsStrip';
import {
  ARCADE_GAMES_CATALOG,
  ARCADE_LOBBY_GROUPS,
  BOSS_SCREENS_CATALOG,
  getRecentArcadeGames,
  getFavoriteArcadeGameIds,
  toggleFavoriteArcadeGameId
} from '../data/arcadeGamesCatalog';
import './ArcadeLobby.css';

export default function ArcadeLobby({
  tokens = 0,
  memeCentz = 0,
  onSelectGame,
  onOpenRewards,
  onOpenExtras,
  onOpenLeaderboard,
  onToggleAiAssistant,
  onBackToFeed,
  deloreanEra = 'present',
  activeCarId = 'delorean',
  onSelectCar,
  onOpenTimeCircuits,
  onTriggerDeLoreanWarp,
  onOpenPrankDisguise
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteArcadeGameIds());
  const [copiedId, setCopiedId] = useState(null);
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

  const handleShareItem = (item) => {
    if (typeof window === 'undefined' || !item?.path) return;
    const shareUrl = `${window.location.origin || SITE_ORIGIN}${item.path}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: `${item.label} — THE MEMES.net`,
          text: `${item.pitch} 🔗`,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop?.(2);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((curr) => (curr === item.id ? null : curr)), 2000);
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
          <h1 className="tm-lobby-title">
            <span className="is-cyan">Cyber-Arcade</span> <span className="is-pink">Lobby</span>
          </h1>
          <p className="tm-lobby-sub">
            {ARCADE_GAMES_CATALOG.length} retro cabinets, MemeDollarz ($) casino tables &amp; shareable prank screens.
          </p>
        </div>

        <div className="tm-lobby-quick-actions">
          {onOpenRewards && (
            <Wallet
              tokens={tokens}
              centz={memeCentz}
              size="md"
              onClick={() => {
                sfx.playToggle();
                onOpenRewards();
              }}
              ariaLabel={`MemeDollarz Wallet balance ${formatMoney(tokens, { centz: memeCentz, zero: 'balance' })}`}
            />
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

      {onOpenTimeCircuits && (
        <DeLoreanDockBanner
          activeEra={deloreanEra}
          activeCarId={activeCarId}
          onSelectCar={onSelectCar}
          onOpenModal={onOpenTimeCircuits}
          onQuickWarp={onTriggerDeLoreanWarp}
        />
      )}

      <EightiesIconsStrip compact />

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
                copied={copiedId === game.id}
                onPlay={handlePlay}
                onToggleFav={handleToggleFavorite}
                onShare={handleShareItem}
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
                  copied={copiedId === game.id}
                  onPlay={handlePlay}
                  onToggleFav={handleToggleFavorite}
                  onShare={handleShareItem}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Shareable Funny Boss & Prank Disguise Screens */}
      {activeFilter === 'all' && (
        <div className="tm-lobby-section">
          <div className="tm-lobby-section-head">
            <h2 className="tm-lobby-section-title">🕵️ Funny Boss Key &amp; Prank Screens (Direct Links)</h2>
            <span className="tm-lobby-section-desc">
              Launch fullscreen disguises or copy direct prank links for coworkers &amp; friends
            </span>
          </div>
          <div className="tm-lobby-grid">
            {BOSS_SCREENS_CATALOG.map((item) => (
              <article
                key={item.id}
                className="tm-lobby-card"
                style={{ '--card-accent': item.accent }}
              >
                <button
                  type="button"
                  className="tm-lobby-share-btn"
                  onClick={() => handleShareItem(item)}
                  aria-label={`Copy shareable link for ${item.label}`}
                  title={`Copy link: ${SITE_ORIGIN}${item.path}`}
                >
                  {copiedId === item.id ? '✅' : '🔗'}
                </button>
                <button
                  type="button"
                  className="tm-lobby-card-play"
                  onClick={() => {
                    if (onOpenPrankDisguise) {
                      onOpenPrankDisguise(item.id);
                    } else if (typeof window !== 'undefined') {
                      window.location.assign(item.path);
                    }
                  }}
                >
                  <div className="tm-lobby-card-thumb">
                    <span className="tm-lobby-card-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="tm-lobby-card-badges">
                      <span className="tm-lobby-badge">PRANK / BOSS KEY</span>
                    </div>
                  </div>
                  <div className="tm-lobby-card-body">
                    <h3 className="tm-lobby-card-title">{item.label}</h3>
                    <p className="tm-lobby-card-pitch">{item.pitch}</p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      <p className="tm-lobby-compliance">
        Tokens are free, just for fun, can&apos;t be bought or cashed out.
      </p>
    </section>
  );
}

function CabinetCard({ game, isFav, copied, onPlay, onToggleFav, onShare }) {
  return (
    <article className="tm-lobby-card" style={{ '--card-accent': game.accent }}>
      {game.path && onShare && (
        <button
          type="button"
          className={`tm-lobby-share-btn ${copied ? 'is-copied' : ''}`}
          onClick={() => onShare(game)}
          aria-label={`Copy direct share link for ${game.label}`}
          title={`Share direct link: ${SITE_ORIGIN}${game.path}`}
        >
          {copied ? '✅' : '🔗'}
        </button>
      )}
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
