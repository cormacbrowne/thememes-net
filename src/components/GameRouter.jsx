import { Maximize2, Gamepad2, Trophy, Share2, Check, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { sfx } from '../utils/soundEngine';
import { formatMoney } from '../utils/tokenEconomy';
import { GAME_VIEW_MODE_TO_PATH, SITE_ORIGIN } from '../data/seoRoutes';
import { getArcadeGameById } from '../data/arcadeGamesCatalog';
import { pulse, pulseTimer } from '../utils/analytics';
import {
  fetchGameLeaderboard,
  getActiveGameSession,
  isContinuousLeaderboardGame,
  isLeaderboardGame,
  qualifiesForTop10,
  startGameSession
} from '../utils/arcadeLeaderboards';
import lazyWithRetry from '../utils/lazyWithRetry';
import MemeSkeletonGrid from './MemeSkeletonGrid';
import VerticalReelsView from './VerticalReelsView';
import { RadioToggleButton } from './MemesRadio';
import NeonSign from './NeonSign';
import GameIcon from './GameIcon';
import { Wallet } from './ui/Money';
import { generateRoomCode, readRoomFromSearch } from '../utils/multiplayer/roomCore';
import { MP_GAMES, getMpGameForViewMode } from '../utils/multiplayer/mpGames';

const QUICK_ARCADE_PILLS = [
  { id: 'invaders', label: 'Invaders' },
  { id: 'serpent', label: 'Serpent' },
  { id: 'blaster', label: 'Blaster' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'void', label: 'Vector' },
  { id: 'riders', label: 'Riders' },
  { id: 'pinball', label: 'Pinball' },
  { id: 'crush', label: 'Crush' },
  { id: 'slots', label: 'Slots' },
  { id: 'blackjack', label: "21's" },
  { id: 'poker', label: 'Poker' },
  { id: 'thousand', label: '1000' },
  { id: 'roulette', label: 'Roulette' },
  { id: 'bingo', label: "Bingo '86" },
  { id: 'pusher', label: 'Dozer' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'derby', label: 'Derby' },
  { id: 'guess', label: 'Guess' },
  { id: 'eightball', label: '8-Ball' },
  { id: 'hilow', label: 'Hi/Lo' }
];

const ArcadeInitialsModal = lazyWithRetry(() => import('./ArcadeInitialsModal'));

const SwipeDeck = lazyWithRetry(() => import('./SwipeDeck'));
const BattleArena = lazyWithRetry(() => import('./BattleArena'));
import ArcadeLobby from './arcadeLobbyLazy';
import { linkSafeShareText } from '../utils/shareText.js';
const NeonBingoGame = lazyWithRetry(() => import('./NeonBingoGame'));
const MemeCrushGame = lazyWithRetry(() => import('./MemeCrushGame'));
const MemeInvadersGame = lazyWithRetry(() => import('./MemeInvadersGame'));
const NeonSerpentGame = lazyWithRetry(() => import('./NeonSerpentGame'));
const BrickBlasterGame = lazyWithRetry(() => import('./BrickBlasterGame'));
const SunsetSprintGame = lazyWithRetry(() => import('./SunsetSprintGame'));
const VectorVoidGame = lazyWithRetry(() => import('./VectorVoidGame'));
const GridRidersGame = lazyWithRetry(() => import('./GridRidersGame'));
const VegasPinballGame = lazyWithRetry(() => import('./VegasPinballGame'));
const VegasSlotMachine = lazyWithRetry(() => import('./VegasSlotMachine'));
const VegasBlackjackGame = lazyWithRetry(() => import('./VegasBlackjackGame'));
const VegasPokerGame = lazyWithRetry(() => import('./VegasPokerGame'));
const ThousandGame = lazyWithRetry(() => import('./ThousandGame'));
const VegasRouletteGame = lazyWithRetry(() => import('./VegasRouletteGame'));
const VegasCoinPusherGame = lazyWithRetry(() => import('./VegasCoinPusherGame'));
const MemeStockMarketGame = lazyWithRetry(() => import('./MemeStockMarketGame'));
const NeonDerbyGame = lazyWithRetry(() => import('./NeonDerbyGame'));
const GuessTheMemeGame = lazyWithRetry(() => import('./GuessTheMemeGame'));
const Magic8BallOracle = lazyWithRetry(() => import('./Magic8BallOracle'));
const HigherOrLowerGame = lazyWithRetry(() => import('./HigherOrLowerGame'));
const MultiplayerRoom = lazyWithRetry(() => import('./multiplayer/MultiplayerRoom'));

function roomFromUrl(viewMode) {
  if (typeof window === 'undefined') return null;
  const game = getMpGameForViewMode(viewMode);
  const code = readRoomFromSearch(window.location.search);
  return game && code ? { game: game.id, viewMode, code } : null;
}

function writeRoomToUrl(code) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (code) url.searchParams.set('room', code);
    else url.searchParams.delete('room');
    url.searchParams.delete('ref');
    if (url.toString() !== window.location.href) {
      window.history.replaceState(window.history.state, '', url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Fixed top cabinet bar rendered when inside a fixed arcade game view.
 */
export function FixedArcadeTopBar({
  viewMode,
  setViewMode,
  tokens,
  memeCentz = 0,
  setShowRewardsModal,
  setExtrasFocus,
  setExtrasDrawerOpen,
  onOpenCabinetLeaderboard
}) {
  const [sharedGame, setSharedGame] = useState(false);

  const handleShareCurrentGame = () => {
    if (typeof window === 'undefined') return;
    const canonical = GAME_VIEW_MODE_TO_PATH[viewMode] || window.location.pathname;
    const sep = canonical.includes('?') ? '&' : '?';
    const shareUrl = `${window.location.origin || SITE_ORIGIN}${canonical}${sep}ref=game`;
    const gameMeta = getArcadeGameById(viewMode);
    const shareTitle = gameMeta
      ? `${gameMeta.label} | THE MEMES.net`
      : `80s Cyber-Arcade | THE MEMES.net`;
    const shareText = gameMeta
      ? `${gameMeta.label} — ${gameMeta.pitch}`
      : `Play free 80s neon arcade games on THE MEMES.net!`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: linkSafeShareText(shareTitle),
          text: linkSafeShareText(shareText),
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop?.(2);
    setSharedGame(true);
    setTimeout(() => setSharedGame(false), 2000);
  };

  return (
    <header className="tm-fixed-arcade-bar" aria-label="Fixed Arcade Cabinet Bar">
      <button
        type="button"
        className="tm-fixed-back-btn tm-fixed-home-btn"
        onClick={() => {
          sfx.playToggle();
          setExtrasDrawerOpen?.(false);
          setViewMode('feed');
          window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        }}
        title="Return to Home Page"
        aria-label="Return to Home Page"
      >
        <NeonSign size="icon" powerOn={false} />
        <span>Home</span>
      </button>
      <button
        type="button"
        className="tm-fixed-back-btn"
        onClick={() => {
          sfx.playToggle();
          setExtrasDrawerOpen?.(false);
          setViewMode('lobby');
          window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        }}
        title="Back to Cyber-Arcade Lobby"
        aria-label="Back to Cyber-Arcade Lobby"
      >
        <Gamepad2 size={14} aria-hidden="true" />
        <span>Lobby</span>
      </button>

      <nav className="tm-fixed-game-pills" aria-label="Switch Arcade Game">
        {QUICK_ARCADE_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            className={`tm-fixed-game-pill ${viewMode === pill.id ? 'active' : ''}`}
            onClick={() => {
              sfx.playToggle();
              setViewMode(pill.id);
            }}
          >
            <GameIcon id={pill.id} size={15} />
            <span>{pill.label}</span>
          </button>
        ))}
      </nav>

      <div className="tm-fixed-bar-right">
        {isLeaderboardGame(viewMode) && onOpenCabinetLeaderboard && (
          <button
            type="button"
            className="tm-fixed-icon-btn"
            onClick={() => {
              sfx.playToggle();
              onOpenCabinetLeaderboard(viewMode);
            }}
            aria-label="Open Cabinet High Scores"
            title="Open Cabinet High Scores (Today / Week / All-time)"
          >
            <Trophy size={15} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="tm-fixed-icon-btn tm-fixed-fs-btn"
          onClick={() => window.dispatchEvent(new Event('tm-game-fs-enter'))}
          title="Play full screen"
          aria-label="Play full screen"
        >
          <Maximize2 size={15} aria-hidden="true" />
          <span>Full</span>
        </button>
        <button
          type="button"
          className="tm-fixed-icon-btn tm-fixed-share-btn"
          onClick={handleShareCurrentGame}
          title="Copy or Share Direct Link to This Game"
          aria-label="Share direct link to this game"
        >
          {sharedGame ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        </button>
        <Wallet
          tokens={tokens}
          centz={memeCentz}
          size="sm"
          className="tm-fixed-wallet-pill"
          onClick={() => {
            sfx.playToggle();
            setShowRewardsModal(true);
          }}
          title="Open MemeDollarz Wallet & Daily Quests"
        />
        <RadioToggleButton className="tm-fixed-icon-btn" />
        <button
          type="button"
          className="tm-fixed-icon-btn"
          onClick={() => {
            sfx.playToggle();
            setExtrasFocus(null);
            setExtrasDrawerOpen(true);
          }}
          aria-label="Open Extras drawer"
          title="Open Extras Drawer: Soundboard, WTF?!, Payphone, Boss Key, CRT, Turbo & AI"
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

/**
 * Lazy-loaded arcade games and interactive feed view switcher (Reels, Lobby, Swipe, Battle).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function createHighScorePromptGuard() {
  const runGenByGame = new Map();
  return {
    markRunRestarted(gameId) {
      if (!gameId) return;
      runGenByGame.set(gameId, (runGenByGame.get(gameId) || 0) + 1);
    },
    getRunGen(gameId) {
      return runGenByGame.get(gameId) || 0;
    },
    async evaluateScore({
      gameId,
      score,
      sessionId = null,
      getActiveViewMode,
      fetchBoard,
      qualifies
    }) {
      const startedGen = runGenByGame.get(gameId) || 0;
      const board = await fetchBoard(gameId);
      if (!board?.ok || !qualifies(board.entries, score)) {
        return { action: 'ignore' };
      }
      if ((runGenByGame.get(gameId) || 0) !== startedGen) {
        return { action: 'defer', payload: { gameId, score, sessionId } };
      }
      if (typeof getActiveViewMode === 'function' && getActiveViewMode() !== gameId) {
        return { action: 'ignore' };
      }
      return { action: 'open', payload: { gameId, score, sessionId } };
    }
  };
}

export default function GameRouter({
  viewMode,
  setViewMode,
  tokens,
  memeCentz = 0,
  handleSpendTokens: rawSpendTokens,
  handlePayoutGameTokens: rawPayoutGameTokens,
  handleEarnMemeCentz,
  awardXpOnly,
  soundOn,
  setSoundOn,
  litePerfMode,
  memes,
  setRoyaltiesMap,
  handleOpenTheater,
  handleOpenBlankStudio,
  setTheaterMemeId,
  filteredMemes,
  userVotes,
  bookmarkedIds,
  handleVote,
  handleReaction,
  handleAddComment,
  handleDeleteComment,
  currentUserId = null,
  handleToggleBookmark,
  handleTriggerStudioMutate,
  handleCaptionThis,
  handleShareMeme,
  setProfileUsername,
  handleClaimGoldenMeme,
  closeAllModals,
  setShowRewardsModal,
  setExtrasFocus,
  setExtrasDrawerOpen,
  setShowLeaderboard,
  onOpenCabinetLeaderboard,
  swipeIndex,
  swipeAnim,
  triggerSwipe,
  handlePrevSwipeCard,
  battlePair,
  battleWinner,
  battleStreak,
  championWins,
  crowdAgreement,
  handleBattlePick,
  handleSkipMatchup,
  deloreanEra,
  activeCarId,
  onSelectCar,
  onOpenTimeCircuits,
  onTriggerDeLoreanWarp,
  onOpenPrankDisguise,
  currentUser = null,
  onRequireAuth,
  onOpenBattle,
  onDailyPuzzleCompleted
}) {
  const [initialsPrompt, setInitialsPrompt] = useState(null);
  const [deferredSave, setDeferredSave] = useState(null);
  const viewModeRef = useRef(viewMode);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  const promptGuard = useMemo(() => createHighScorePromptGuard(), []);
  // Play with friends: { game, viewMode, code } while a multiplayer room is open (invite link = ?room=CODE).
  const [mpRoom, setMpRoom] = useState(() => roomFromUrl(viewMode));
  const [mpPrevView, setMpPrevView] = useState(viewMode);
  if (mpPrevView !== viewMode) {
    setMpPrevView(viewMode);
    setMpRoom(roomFromUrl(viewMode));
    setDeferredSave(null);
  }
  const activeRoom = mpRoom && mpRoom.viewMode === viewMode ? mpRoom : null;
  useEffect(() => {
    // Leaving the game page drops the room from the URL so other pages never carry it.
    if (!getMpGameForViewMode(viewMode)) writeRoomToUrl(null);
  }, [viewMode]);
  const openMpRoom = useCallback((gameId) => {
    const def = MP_GAMES[gameId];
    if (!def) return;
    const code = generateRoomCode();
    writeRoomToUrl(code);
    setMpRoom({ game: def.id, viewMode: def.viewMode, code });
    pulse('mp_room_open', { game: def.id });
    window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  const leaveMpRoom = useCallback(() => {
    writeRoomToUrl(null);
    setMpRoom(null);
  }, []);
  const [continuousPeak, setContinuousPeak] = useState(null);
  const sessionLoggedPeakRef = useRef({});
  const pulseGameRef = useRef({ game: null, rounds: 0, spent: 0, won: 0, stop: null });

  useEffect(() => {
    const isCatalogGame = Boolean(getArcadeGameById(viewMode));
    if (!isCatalogGame) return undefined;

    pulse('game_start', { game: viewMode });
    const stop = pulseTimer('game_end', { game: viewMode });
    const tracker = { game: viewMode, rounds: 0, spent: 0, won: 0, stop };
    pulseGameRef.current = tracker;

    const flush = () => {
      if (!tracker.stop) return;
      const fn = tracker.stop;
      tracker.stop = null;
      const result = tracker.won > tracker.spent ? 'win' : tracker.spent > 0 ? 'loss' : 'free';
      fn({ rounds: tracker.rounds, result });
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [viewMode]);

  const handleSpendTokens = useCallback(
    (amount, ...rest) => {
      const n = Number(amount) || 0;
      if (n > 0 && n > (Number(tokens) || 0)) {
        pulse('wallet_empty', { game: viewMode });
      }
      const ok = rawSpendTokens ? rawSpendTokens(amount, ...rest) : false;
      if (ok && n > 0 && pulseGameRef.current.game === viewMode) {
        pulseGameRef.current.rounds += 1;
        pulseGameRef.current.spent += n;
      }
      return ok;
    },
    [rawSpendTokens, tokens, viewMode]
  );

  const handlePayoutGameTokens = useCallback(
    (amount, ...rest) => {
      const n = Number(amount) || 0;
      if (n > 0 && pulseGameRef.current.game === viewMode) {
        pulseGameRef.current.won += n;
      }
      return rawPayoutGameTokens ? rawPayoutGameTokens(amount, ...rest) : undefined;
    },
    [rawPayoutGameTokens, viewMode]
  );

  useEffect(() => {
    if (isLeaderboardGame(viewMode)) {
      void startGameSession(viewMode);
    }
  }, [viewMode]);

  const handleRunRestart = useCallback(
    (gameId) => {
      promptGuard.markRunRestarted(gameId);
    },
    [promptGuard]
  );

  const openInitialsForScore = useCallback(
    async (gameId, rawScore) => {
      const cleanScore = Math.floor(Number(rawScore) || 0);
      if (!isLeaderboardGame(gameId) || cleanScore < 1) return;
      const sessionId = getActiveGameSession(gameId)?.sessionId || null;
      const decision = await promptGuard.evaluateScore({
        gameId,
        score: cleanScore,
        sessionId,
        getActiveViewMode: () => viewModeRef.current,
        fetchBoard: (gId) => fetchGameLeaderboard(gId, 'all_time', 10),
        qualifies: qualifiesForTop10
      });
      if (decision.action === 'open') {
        sessionLoggedPeakRef.current[gameId] = cleanScore;
        setDeferredSave(null);
        setInitialsPrompt(decision.payload);
      } else if (decision.action === 'defer') {
        sessionLoggedPeakRef.current[gameId] = cleanScore;
        setDeferredSave(decision.payload);
      }
    },
    [promptGuard]
  );

  const handleRecordHighScore = useCallback(
    async (gameId, rawScore) => {
      const cleanScore = Math.floor(Number(rawScore) || 0);
      if (!isLeaderboardGame(gameId) || cleanScore < 1) return;

      if (isContinuousLeaderboardGame(gameId)) {
        setContinuousPeak((prev) =>
          !prev || prev.gameId !== gameId || cleanScore > prev.score
            ? { gameId, score: cleanScore }
            : prev
        );
        return;
      }

      if (cleanScore <= (sessionLoggedPeakRef.current[gameId] || 0)) return;
      await openInitialsForScore(gameId, cleanScore);
    },
    [openInitialsForScore]
  );

  return (
    <>
      {viewMode === 'bingo' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <NeonBingoGame
            tokens={tokens}
            centz={memeCentz}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onEarnMemeCentz={handleEarnMemeCentz}
            onRecordHighScore={handleRecordHighScore}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'pusher' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasCoinPusherGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onEarnTokens={(amt, evt, label) => {
              handlePayoutGameTokens(amt, {
                stakedTokens: Math.max(1, amt),
                xp: 12,
                label: label || `${formatMoney(amt, { sign: true })} Dozer Tray Win!`,
                emoji: '💰'
              });
            }}
            onEarnXp={(xpAmt) => awardXpOnly(xpAmt, null, '⚡', `+${xpAmt} XP`)}
            onRecordHighScore={handleRecordHighScore}
            onOpenBlankStudio={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              setViewMode(mode);
            }}
          />
        </Suspense>
      )}

      {viewMode === 'blackjack' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          {activeRoom ? (
            <MultiplayerRoom key={activeRoom.code} game={activeRoom.game} code={activeRoom.code} onLeave={leaveMpRoom} />
          ) : (
            <VegasBlackjackGame
              onPlayWithFriends={() => openMpRoom('blackjack')}
              tokens={tokens}
              centz={memeCentz}
              onSpendTokens={handleSpendTokens}
              onPayoutTokens={handlePayoutGameTokens}
              onRecordHighScore={handleRecordHighScore}
              onOpenUpload={() => {
                sfx.playToggle();
                setViewMode('feed');
                handleOpenBlankStudio();
              }}
              onBackToFeed={() => {
                sfx.playToggle();
                setViewMode('feed');
              }}
            />
          )}
        </Suspense>
      )}

      {viewMode === 'poker' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          {activeRoom ? (
            <MultiplayerRoom key={activeRoom.code} game={activeRoom.game} code={activeRoom.code} onLeave={leaveMpRoom} />
          ) : (
            <VegasPokerGame
              onPlayWithFriends={() => openMpRoom('poker')}
              tokens={tokens}
              centz={memeCentz}
              soundOn={soundOn}
              onToggleSound={() => {
                const nextState = !soundOn;
                sfx.enabled = nextState;
                setSoundOn(nextState);
                if (nextState) sfx.playToggle();
              }}
              onSpendTokens={handleSpendTokens}
              onPayoutTokens={handlePayoutGameTokens}
              onRecordHighScore={handleRecordHighScore}
              onBackToFeed={() => {
                sfx.playToggle();
                setViewMode('feed');
              }}
            />
          )}
        </Suspense>
      )}

      {viewMode === 'derby' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <NeonDerbyGame
            tokens={tokens}
            centz={memeCentz}
            soundOn={soundOn}
            litePerfMode={litePerfMode}
            prefersReducedMotion={
              typeof window !== 'undefined' &&
              Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            }
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'guess' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <GuessTheMemeGame
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
            currentUser={currentUser}
            onRequireAuth={onRequireAuth}
            onOpenBattle={() => {
              sfx.playToggle();
              onOpenBattle?.();
            }}
            onDailyCompleted={onDailyPuzzleCompleted}
          />
        </Suspense>
      )}

      {viewMode === 'eightball' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <Magic8BallOracle
            tokens={tokens}
            centz={memeCentz}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onEarnMemeCentz={handleEarnMemeCentz}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'thousand' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          {activeRoom ? (
            <MultiplayerRoom key={activeRoom.code} game={activeRoom.game} code={activeRoom.code} onLeave={leaveMpRoom} />
          ) : (
            <ThousandGame
              onPlayWithFriends={() => openMpRoom('thousand')}
              soundOn={soundOn}
              onToggleSound={() => {
                const nextState = !soundOn;
                sfx.enabled = nextState;
                setSoundOn(nextState);
                if (nextState) sfx.playToggle();
              }}
              onBackToFeed={() => {
                sfx.playToggle();
                setViewMode('feed');
              }}
            />
          )}
        </Suspense>
      )}

      {viewMode === 'hilow' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <HigherOrLowerGame
            memes={memes}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onInspectMeme={(meme) => {
              if (meme?.id) setTheaterMemeId(meme.id);
            }}
            onRecordHighScore={handleRecordHighScore}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'roulette' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasRouletteGame
            tokens={tokens}
            centz={memeCentz}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'slots' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasSlotMachine
            embedded={false}
            tokens={tokens}
            centz={memeCentz}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            memes={memes}
            onCreditCreator={(creatorAuthor) => {
              if (creatorAuthor) {
                setRoyaltiesMap((prev) => ({
                  ...prev,
                  [creatorAuthor]: (prev[creatorAuthor] || 0) + 15
                }));
              }
            }}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'stocks' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeStockMarketGame
            tokens={tokens}
            centz={memeCentz}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            memes={memes}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'invaders' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeInvadersGame
            memes={memes}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('invaders')}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'serpent' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          {activeRoom ? (
            <MultiplayerRoom key={activeRoom.code} game={activeRoom.game} code={activeRoom.code} onLeave={leaveMpRoom} />
          ) : (
            <NeonSerpentGame
              onPlayWithFriends={() => openMpRoom('serpent')}
              soundOn={soundOn}
              onToggleSound={() => {
                const nextState = !soundOn;
                sfx.enabled = nextState;
                setSoundOn(nextState);
                if (nextState) sfx.playToggle();
              }}
              onRecordHighScore={handleRecordHighScore}
              onRunRestart={handleRunRestart}
              onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('serpent')}
              onBackToFeed={() => {
                sfx.playToggle();
                setViewMode('feed');
              }}
            />
          )}
        </Suspense>
      )}

      {viewMode === 'blaster' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <BrickBlasterGame
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('blaster')}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'sunset' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <SunsetSprintGame
            activeCarId={activeCarId}
            onSelectCar={onSelectCar}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('sunset')}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'void' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VectorVoidGame
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('void')}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'riders' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <GridRidersGame
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('riders')}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'crush' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeCrushGame
            tokens={tokens}
            centz={memeCentz}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            memes={memes}
            onOpenTheater={handleOpenTheater}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {viewMode === 'pinball' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasPinballGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onRecordHighScore={handleRecordHighScore}
            onRunRestart={handleRunRestart}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {continuousPeak && continuousPeak.gameId === viewMode && !initialsPrompt && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 820
          }}
        >
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            onClick={() => void openInitialsForScore(continuousPeak.gameId, continuousPeak.score)}
          >
            🏆 Post Peak ({continuousPeak.score.toLocaleString()}) to Cabinet
          </button>
        </div>
      )}

      {deferredSave && deferredSave.gameId === viewMode && !initialsPrompt && (
        <div
          data-testid="save-score-chip"
          style={{
            position: 'fixed',
            bottom: 'var(--tm-space-4)',
            right: 'var(--tm-space-4)',
            zIndex: 'var(--tm-z-overlay)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--tm-space-2)'
          }}
        >
          <button
            type="button"
            className="tm-btn tm-btn-primary"
            data-testid="save-score-chip-btn"
            onClick={() => {
              const next = deferredSave;
              setDeferredSave(null);
              setInitialsPrompt(next);
            }}
          >
            🏆 Save score ({deferredSave.score.toLocaleString()})
          </button>
          <button
            type="button"
            className="tm-btn"
            aria-label="Dismiss save score"
            data-testid="save-score-dismiss-btn"
            onClick={() => setDeferredSave(null)}
          >
            ✕
          </button>
        </div>
      )}

      {initialsPrompt && (
        <Suspense fallback={null}>
          <ArcadeInitialsModal
            gameId={initialsPrompt.gameId}
            score={initialsPrompt.score}
            sessionId={initialsPrompt.sessionId}
            onClose={() => setInitialsPrompt(null)}
            onSubmitted={() => {
              setDeferredSave(null);
              void startGameSession(initialsPrompt.gameId);
            }}
            onOpenLeaderboard={(gId) => {
              setInitialsPrompt(null);
              onOpenCabinetLeaderboard?.(gId);
            }}
          />
        </Suspense>
      )}

      {viewMode === 'reels' && (
        <VerticalReelsView
          filteredMemes={filteredMemes}
          userVotes={userVotes}
          bookmarkedIds={bookmarkedIds}
          onVote={handleVote}
          onReaction={handleReaction}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          currentUserId={currentUserId}
          onToggleBookmark={handleToggleBookmark}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onCaptionThis={handleCaptionThis}
          onShareMeme={handleShareMeme}
          onOpenProfile={(username) => {
            sfx.playToggle();
            setProfileUsername(username);
          }}
          onOpenTheater={handleOpenTheater}
          onOpenBlankStudio={() => {
            closeAllModals();
            handleOpenBlankStudio();
          }}
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
          onOpenGames={() => {
            sfx.playToggle();
            setViewMode('pusher');
          }}
          onClaimGoldenMeme={handleClaimGoldenMeme}
          litePerfMode={litePerfMode}
        />
      )}

      {viewMode === 'lobby' && (
        <Suspense fallback={<MemeSkeletonGrid count={6} />}>
          <ArcadeLobby
            tokens={tokens}
            memeCentz={memeCentz}
            onSelectGame={(gameId) => {
              closeAllModals();
              setViewMode(gameId);
            }}
            onOpenRewards={() => {
              closeAllModals();
              setShowRewardsModal(true);
            }}
            onOpenExtras={() => {
              closeAllModals();
              setExtrasFocus(null);
              setExtrasDrawerOpen(true);
            }}
            onOpenLeaderboard={() => {
              closeAllModals();
              setShowLeaderboard(true);
            }}
            onBackToFeed={() => {
              closeAllModals();
              setViewMode('feed');
            }}
            deloreanEra={deloreanEra}
            activeCarId={activeCarId}
            onSelectCar={onSelectCar}
            onOpenTimeCircuits={onOpenTimeCircuits}
            onTriggerDeLoreanWarp={onTriggerDeLoreanWarp}
            onOpenPrankDisguise={onOpenPrankDisguise}
          />
        </Suspense>
      )}

      {viewMode === 'swipe' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <SwipeDeck
            filteredMemes={filteredMemes}
            swipeIndex={swipeIndex}
            swipeAnim={swipeAnim}
            onTriggerSwipe={triggerSwipe}
            onPrevCard={handlePrevSwipeCard}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
            onTriggerStudioMutate={handleTriggerStudioMutate}
            onOpenTheater={handleOpenTheater}
            onOpenBlankStudio={() => {
              closeAllModals();
              handleOpenBlankStudio();
            }}
          />
        </Suspense>
      )}

      {viewMode === 'battle' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <BattleArena
            memes={memes}
            battlePair={battlePair}
            battleWinner={battleWinner}
            battleStreak={battleStreak}
            championWins={championWins}
            crowdAgreement={crowdAgreement}
            onBattlePick={handleBattlePick}
            onSkipMatchup={handleSkipMatchup}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
            onOpenTheater={handleOpenTheater}
            onOpenBlankStudio={() => {
              closeAllModals();
              handleOpenBlankStudio();
            }}
          />
        </Suspense>
      )}
    </>
  );
}
