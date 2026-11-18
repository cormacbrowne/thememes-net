import { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Settings,
  Bot,
  ArrowLeft,
  Star,
  Heart,
  Share2,
  Check,
  Gamepad2,
  Brain,
  TrendingUp,
  Coins,
  EyeOff,
  Play,
  ArrowUpDown
} from 'lucide-react';
import { sfx } from '../utils/soundEngine';
import { formatMoney } from '../utils/tokenEconomy';
import { haptic } from '../utils/juice';
import { SITE_ORIGIN } from '../data/seoRoutes';
import { RadioStationStrip } from './MemesRadio';
import { DeLoreanDockBanner } from './DeLoreanTimeMachine';
import { Wallet } from './ui/Money';
import EightiesIconsStrip from './EightiesIconsStrip';
import GameIcon from './GameIcon';
import {
  ARCADE_GAMES_CATALOG,
  ARCADE_LOBBY_GROUPS,
  BOSS_SCREENS_CATALOG,
  getRecentArcadeGames,
  getFavoriteArcadeGameIds,
  toggleFavoriteArcadeGameId
} from '../data/arcadeGamesCatalog';
import {
  loadUserGameRatings,
  loadCachedCommunityRatings,
  buildRatingsSummaryMap,
  sortGamesByRating,
  fetchCommunityGameRatings,
  saveGameRating
} from '../utils/gameRatings';
import './ArcadeLobby.css';

/** sessionStorage key the home portal sets to open the lobby on the Prank Screens list. */
export const LOBBY_REALM_KEY = 'tm_lobby_realm';

const GROUP_ICONS = {
  skill: Gamepad2,
  meme: Brain,
  sim: TrendingUp,
  casino: Coins
};

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
  const [realm, setRealm] = useState(() => {
    try {
      const wanted = sessionStorage.getItem(LOBBY_REALM_KEY);
      sessionStorage.removeItem(LOBBY_REALM_KEY);
      return wanted === 'pranks' ? 'pranks' : 'games';
    } catch {
      return 'games';
    }
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortMode, setSortMode] = useState('top-rated'); // 'top-rated' | 'grouped'
  const [favoriteIds, setFavoriteIds] = useState(() => getFavoriteArcadeGameIds());
  const [copiedId, setCopiedId] = useState(null);
  const [userRatings, setUserRatings] = useState(() => loadUserGameRatings());
  const [communityRatings, setCommunityRatings] = useState(() => loadCachedCommunityRatings());
  const recentGames = useMemo(() => getRecentArcadeGames(), []);

  useEffect(() => {
    let active = true;
    fetchCommunityGameRatings().then((agg) => {
      if (active && agg && typeof agg === 'object') {
        setCommunityRatings(agg);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const ratingsSummary = useMemo(
    () => buildRatingsSummaryMap(communityRatings, userRatings),
    [communityRatings, userRatings]
  );

  const handleToggleFavorite = (gameId) => {
    sfx.playToggle();
    haptic('tap');
    setFavoriteIds(toggleFavoriteArcadeGameId(gameId));
  };

  const handleRateGame = async (gameId, stars) => {
    sfx.playPop?.(Math.min(4, Math.max(1, stars - 1)));
    haptic('tap');
    const result = await saveGameRating(gameId, stars, communityRatings);
    setUserRatings(result.userRatings);
    setCommunityRatings(result.community);
  };

  const handlePlay = (gameId) => {
    sfx.playPop(2);
    if (onSelectGame) onSelectGame(gameId);
  };

  const handleShareItem = (item) => {
    if (typeof window === 'undefined' || !item?.path) return;
    const sep = item.path.includes('?') ? '&' : '?';
    const refTag = item.group ? 'arcade' : 'prank';
    const shareUrl = `${window.location.origin || SITE_ORIGIN}${item.path}${sep}ref=${refTag}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: `${item.label} — THE MEMES.net`,
          text: `${item.pitch}`,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop?.(2);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((curr) => (curr === item.id ? null : curr)), 2000);
  };

  const sortedAllGames = useMemo(
    () => sortGamesByRating(ARCADE_GAMES_CATALOG, ratingsSummary),
    [ratingsSummary]
  );

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'favs') {
      const favGames = sortGamesByRating(
        ARCADE_GAMES_CATALOG.filter((g) => favSet.has(g.id)),
        ratingsSummary
      );
      return favGames.length > 0
        ? [{ id: 'favs', label: 'Favourites', desc: 'Your pinned cabinets (sorted by rating)', games: favGames }]
        : [];
    }

    if (activeFilter === 'all' && sortMode === 'top-rated') {
      return [
        {
          id: 'top-rated',
          label: 'All Arcade Games — Top Rated First',
          desc: 'Rate any game 1–5 stars; higher-rated games rise straight to the top',
          games: sortedAllGames
        }
      ];
    }

    return ARCADE_LOBBY_GROUPS.filter(
      (grp) => activeFilter === 'all' || activeFilter === grp.id
    ).map((grp) => ({
      ...grp,
      games: sortGamesByRating(
        ARCADE_GAMES_CATALOG.filter((g) => g.group === grp.id),
        ratingsSummary
      )
    }));
  }, [activeFilter, sortMode, favSet, ratingsSummary, sortedAllGames]);


  return (
    <section className="tm-lobby" aria-label="Cyber Arcade Lobby">
      <header className="tm-lobby-hero">
        <div className="tm-lobby-hero-copy">
          <h1 className="tm-lobby-title">
            {realm === 'pranks' ? (
              <>
                <span className="is-pink">Prank</span> <span className="is-cyan">Screens</span>
              </>
            ) : (
              <>
                <span className="is-cyan">Cyber-Arcade</span> <span className="is-pink">Lobby</span>
              </>
            )}
          </h1>
          <p className="tm-lobby-sub">
            {realm === 'pranks'
              ? `${BOSS_SCREENS_CATALOG.length} fullscreen fakes: tap one, go fullscreen, hand over the phone`
              : `${ARCADE_GAMES_CATALOG.length} retro skill cabinets & MemeDollarz (M$) tables`}
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
              <Trophy size={15} aria-hidden="true" />
              <span>Ranks</span>
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
              <Settings size={15} aria-hidden="true" />
              <span>Settings</span>
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
              <Bot size={15} aria-hidden="true" />
              <span>AI</span>
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
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Feed</span>
            </button>
          )}
        </div>
      </header>

      {/* Owner brief 18 Nov 2026 (item 8): games and prank screens are two separate lists. */}
      <div className="tm-lobby-realm" role="tablist" aria-label="Games or prank screens">
        <button
          type="button"
          role="tab"
          aria-selected={realm === 'games'}
          data-testid="lobby-realm-games"
          className={`tm-lobby-realm-btn is-games ${realm === 'games' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setRealm('games');
          }}
        >
          <Gamepad2 size={18} aria-hidden="true" />
          <span>Games</span>
          <span className="tm-lobby-realm-count">{ARCADE_GAMES_CATALOG.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={realm === 'pranks'}
          data-testid="lobby-realm-pranks"
          className={`tm-lobby-realm-btn is-pranks ${realm === 'pranks' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setRealm('pranks');
          }}
        >
          <EyeOff size={18} aria-hidden="true" />
          <span>Pranks</span>
          <span className="tm-lobby-realm-count">{BOSS_SCREENS_CATALOG.length}</span>
        </button>
      </div>

      {realm === 'games' && (
      <div className="tm-lobby-toolbar">
        <div className="tm-lobby-filters" role="tablist" aria-label="Filter Arcade Games and Prank Screens">
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'all'}
            className={`tm-lobby-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <Gamepad2 size={14} aria-hidden="true" />
            <span>All Games ({ARCADE_GAMES_CATALOG.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'favs'}
            className={`tm-lobby-filter-pill ${activeFilter === 'favs' ? 'active' : ''}`}
            onClick={() => setActiveFilter('favs')}
          >
            <Heart size={14} aria-hidden="true" />
            <span>Favourites ({favoriteIds.length})</span>
          </button>
          {ARCADE_LOBBY_GROUPS.map((grp) => {
            const GroupIcon = GROUP_ICONS[grp.id] || Gamepad2;
            return (
              <button
                key={grp.id}
                type="button"
                role="tab"
                aria-selected={activeFilter === grp.id}
                className={`tm-lobby-filter-pill ${activeFilter === grp.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(grp.id)}
              >
                <GroupIcon size={14} aria-hidden="true" />
                <span>{grp.label}</span>
              </button>
            );
          })}
        </div>

        {activeFilter === 'all' && (
          <div className="tm-lobby-sort-toggle" role="group" aria-label="Games list order">
            <ArrowUpDown size={13} aria-hidden="true" />
            <button
              type="button"
              className={`tm-lobby-sort-btn ${sortMode === 'top-rated' ? 'active' : ''}`}
              onClick={() => setSortMode('top-rated')}
            >
              Top Rated
            </button>
            <button
              type="button"
              className={`tm-lobby-sort-btn ${sortMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setSortMode('grouped')}
            >
              By Category
            </button>
          </div>
        )}
      </div>
      )}

      {/* Continue Playing Row */}
      {realm === 'games' && activeFilter === 'all' && recentGames.length > 0 && (
        <div className="tm-lobby-section">
          <div className="tm-lobby-section-head">
            <h2 className="tm-lobby-section-title">
              <Play size={15} aria-hidden="true" /> Continue playing
            </h2>
            <span className="tm-lobby-section-desc">Your last {recentGames.length} cabinets</span>
          </div>
          <div className="tm-lobby-continue-grid">
            {recentGames.map((game) => (
              <CabinetCard
                key={`recent-${game.id}`}
                game={game}
                ratingInfo={ratingsSummary[game.id]}
                isFav={favSet.has(game.id)}
                copied={copiedId === game.id}
                onPlay={handlePlay}
                onToggleFav={handleToggleFavorite}
                onRate={handleRateGame}
                onShare={handleShareItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Arcade & Casino Games Sections (Higher star ratings at the top) */}
      {realm === 'games' && (
        visibleGroups.length === 0 ? (
          <div className="tm-lobby-empty">
            Tap the heart on any cabinet to pin it to your Favourites row.
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
                    ratingInfo={ratingsSummary[game.id]}
                    isFav={favSet.has(game.id)}
                    copied={copiedId === game.id}
                    onPlay={handlePlay}
                    onToggleFav={handleToggleFavorite}
                    onRate={handleRateGame}
                    onShare={handleShareItem}
                  />
                ))}
              </div>
            </div>
          ))
        )
      )}

      {/* Separate Office Disguise & Prank Screens Section */}
      {realm === 'pranks' && (
        <div className="tm-lobby-section tm-lobby-pranks-section">
          <div className="tm-lobby-section-head">
            <h2 className="tm-lobby-section-title">
              <EyeOff size={15} aria-hidden="true" /> Fake screens &amp; office disguises
            </h2>
            <span className="tm-lobby-section-desc">
              Not games: fullscreen fakes to fool a friend (or hide from the boss). Tap to launch.
            </span>
          </div>
          <div className="tm-lobby-grid">
            {BOSS_SCREENS_CATALOG.map((item) => (
              <article
                key={item.id}
                className="tm-lobby-card tm-lobby-prank-card"
                style={{ '--card-accent': item.accent }}
              >
                <button
                  type="button"
                  className={`tm-lobby-share-btn ${copiedId === item.id ? 'is-copied' : ''}`}
                  onClick={() => handleShareItem(item)}
                  aria-label={`Copy shareable link for ${item.label}`}
                  title={`Copy link: ${SITE_ORIGIN}${item.path}`}
                >
                  {copiedId === item.id ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
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
                      <GameIcon id={item.id} size={42} />
                    </span>
                    <div className="tm-lobby-card-badges">
                      <span className="tm-lobby-badge tm-lobby-badge-prank">PRANK SCREEN</span>
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

      {/* Companion Radio, DeLorean & 80s Icons sit below the games (Phase 34.9) */}
      <div className="tm-lobby-companions">
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
      </div>

      <p className="tm-lobby-compliance">
        MemeDollarz (M$) are free, just for fun, and can&apos;t be bought or cashed out.
      </p>
    </section>
  );
}

function CabinetCard({ game, ratingInfo, isFav, copied, onPlay, onToggleFav, onRate, onShare }) {
  const avgStars = ratingInfo?.avgStars || 0;
  const ratingCount = ratingInfo?.count || 0;
  const userStars = ratingInfo?.userStars || 0;
  const activeStars = userStars || Math.round(avgStars);

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
          {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        </button>
      )}
      <button
        type="button"
        className={`tm-lobby-fav-btn ${isFav ? 'is-fav' : ''}`}
        onClick={() => onToggleFav(game.id)}
        aria-label={isFav ? `Remove ${game.label} from favourites` : `Pin ${game.label} to favourites`}
        aria-pressed={isFav}
      >
        <Heart size={15} fill={isFav ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="tm-lobby-card-play"
        onClick={() => onPlay(game.id)}
      >
        <div className="tm-lobby-card-thumb">
          <span className="tm-lobby-card-icon" aria-hidden="true">
            <GameIcon id={game.id} size={42} />
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

      <div className="tm-lobby-card-rating" aria-label={`Rate ${game.label} 1 to 5 stars`}>
        <div className="tm-lobby-stars-row" role="group" aria-label={`Star rating for ${game.label}`}>
          {[1, 2, 3, 4, 5].map((star) => {
            const lit = star <= activeStars;
            return (
              <button
                key={star}
                type="button"
                className={`tm-lobby-star-btn ${lit ? 'is-lit' : ''} ${
                  userStars >= star ? 'is-user' : ''
                }`}
                onClick={() => onRate(game.id, star)}
                aria-label={`Rate ${game.label} ${star} out of 5 stars`}
                aria-pressed={userStars === star}
                title={`Rate ${star}/5 stars`}
              >
                <Star size={14} fill={lit ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <span className="tm-lobby-rating-meta">
          {avgStars > 0
            ? `${avgStars.toFixed(1)}★ (${ratingCount})`
            : 'Rate 1–5★'}
        </span>
      </div>
    </article>
  );
}
