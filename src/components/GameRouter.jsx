import { lazy, Suspense } from 'react';
import { sfx } from '../utils/soundEngine';
import MemeSkeletonGrid from './MemeSkeletonGrid';
import VerticalReelsView from './VerticalReelsView';
import { RadioToggleButton } from './MemesRadio';

const SwipeDeck = lazy(() => import('./SwipeDeck'));
const BattleArena = lazy(() => import('./BattleArena'));
const ArcadeLobby = lazy(() => import('./ArcadeLobby'));
const MemeCrushGame = lazy(() => import('./MemeCrushGame'));
const VegasPinballGame = lazy(() => import('./VegasPinballGame'));
const VegasSlotMachine = lazy(() => import('./VegasSlotMachine'));
const VegasBlackjackGame = lazy(() => import('./VegasBlackjackGame'));
const VegasRouletteGame = lazy(() => import('./VegasRouletteGame'));
const VegasCoinPusherGame = lazy(() => import('./VegasCoinPusherGame'));
const MemeStockMarketGame = lazy(() => import('./MemeStockMarketGame'));
const NeonDerbyGame = lazy(() => import('./NeonDerbyGame'));
const GuessTheMemeGame = lazy(() => import('./GuessTheMemeGame'));
const MemePlinkoGame = lazy(() => import('./MemePlinkoGame'));
const HigherOrLowerGame = lazy(() => import('./HigherOrLowerGame'));

/**
 * Fixed top cabinet bar rendered when inside a fixed arcade game view.
 */
export function FixedArcadeTopBar({
  viewMode,
  setViewMode,
  tokens,
  setShowRewardsModal,
  setExtrasFocus,
  setExtrasDrawerOpen
}) {
  return (
    <header className="tm-fixed-arcade-bar" aria-label="Fixed Arcade Cabinet Bar">
      <button
        type="button"
        className="tm-fixed-back-btn"
        onClick={() => {
          sfx.playToggle();
          setViewMode('lobby');
        }}
        title="Back to Cyber-Arcade Lobby"
      >
        🕹️ Lobby
      </button>
      <button
        type="button"
        className="tm-fixed-back-btn"
        onClick={() => {
          sfx.playToggle();
          setViewMode('feed');
        }}
      >
        ← Memes
      </button>

      <nav className="tm-fixed-game-pills" aria-label="Switch Arcade Game">
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'pusher' ? 'active' : ''}`}
          onClick={() => {
            sfx.playCoinDrop?.();
            setViewMode('pusher');
          }}
        >
          🪙 Dozer
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'pinball' ? 'active' : ''}`}
          onClick={() => {
            sfx.playPinballBumper(0);
            setViewMode('pinball');
          }}
        >
          🎱 Pinball
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'blackjack' ? 'active' : ''}`}
          onClick={() => {
            sfx.playCardDeal();
            setViewMode('blackjack');
          }}
        >
          🃏 21&apos;s
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'roulette' ? 'active' : ''}`}
          onClick={() => {
            sfx.playRouletteSpin();
            setViewMode('roulette');
          }}
        >
          🎡 Roulette
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'slots' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('slots');
          }}
        >
          🎰 Slots
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'stocks' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('stocks');
          }}
        >
          📈 Stocks
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'derby' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('derby');
          }}
        >
          🏇 Derby
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'guess' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('guess');
          }}
        >
          🧠 Guess
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'plinko' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('plinko');
          }}
        >
          🎯 Plinko
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'hilow' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('hilow');
          }}
        >
          ⬆️ Hi/Lo
        </button>
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'crush' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('crush');
          }}
        >
          🍬 Crush
        </button>
      </nav>

      <div className="tm-fixed-bar-right">
        <button
          type="button"
          className="tm-fixed-wallet-pill"
          onClick={() => {
            sfx.playToggle();
            setShowRewardsModal(true);
          }}
          title="Open Token Wallet & Daily Quests"
        >
          🪙 <strong>{tokens}</strong>
        </button>
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
          🕹️
        </button>
      </div>
    </header>
  );
}

/**
 * Side Entertainment Arcade Lounge cards rendered below the meme feed.
 */
export function ArcadeLoungePromo({ setViewMode }) {
  return (
    <section className="tm-arcade-steer-shell" aria-label="Side Entertainment Arcade Lounge">
      <div className="tm-arcade-steer-section-head">
        <span className="tm-arcade-steer-eyebrow">🕹️ 80s NEON TOKEN CASINO &amp; ARCADE LOUNGE</span>
        <h2 className="tm-arcade-steer-heading">
          Earn 🪙 Tokens by Uploading Memes — Then Wager, Trade &amp; Play in Fixed Non-Scroll Cabinets
        </h2>
      </div>
      <div className="tm-arcade-steer-grid tm-arcade-steer-grid-4">
        {/* Cabinet 00: Neon Coin Dozer '86 — Arcade Penny Falls & Prize Machine */}
        <div
          className="tm-arcade-steer-card tm-steer-roulette"
          onClick={() => {
            sfx.playCoinDrop?.();
            setViewMode('pusher');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🪙 NEON COIN DOZER &apos;86 • PENNY-FALLS PRIZE PUSHER</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_pusher_highscore') || 0).toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🪙🎁💎🏆</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON COIN DOZER &apos;86 — PRIZE PUSHER</h3>
              <p className="tm-arcade-steer-desc">
                Drop coins onto the reciprocating <strong>Chrome Pusher Shelf</strong> to nudge cascades of coins,{' '}
                <strong>💎 Neon Diamonds (+8 🪙)</strong>, <strong>🎁 Mystery Boxes (+12 🪙)</strong> &amp;{' '}
                <strong>🏆 Golden Trophies (+20 🪙)</strong> over the front lip into the payoff tray!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 Free Practice Bucket or 1 Token per Coin Drop • Bulldozer Fever Shields
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playCoinDrop?.();
                setViewMode('pusher');
              }}
            >
              ▶ Play Coin Dozer &apos;86
            </button>
          </div>
        </div>

        {/* Cabinet 0A: Neon 21's Cyber-Blackjack */}
        <div
          className="tm-arcade-steer-card tm-steer-blackjack"
          onClick={() => {
            sfx.playCardDeal();
            setViewMode('blackjack');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🃏 NEON 21&apos;S • SPLIT / DOUBLE / 5-CARD CHARLIE</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_blackjack_highscore') || 0).toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🃏🂡🥽🔥</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON 21&apos;S — CYBER BLACKJACK</h3>
              <p className="tm-arcade-steer-desc">
                Face <strong>Dealer Bot &apos;86</strong> with 3D holographic neon cards! Features{' '}
                <strong>Double Down</strong>, <strong>Split Pairs</strong>,{' '}
                <strong>5-Card Charlie (3× Auto-Win)</strong>, <strong>Perfect Pair + 21+3 Side Bets</strong> &amp; a live{' '}
                <strong>🥽 Cyber-Visor AI Strategy Advisor</strong>!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 Wager 5–50 Tokens (3:2 Blackjack • Up to 15× Side Bet) or Free Practice
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playCardDeal();
                setViewMode('blackjack');
              }}
            >
              ▶ Deal Neon 21&apos;s
            </button>
          </div>
        </div>

        {/* Cabinet 0B: Neon Lightning Roulette '86 */}
        <div
          className="tm-arcade-steer-card tm-steer-roulette"
          onClick={() => {
            sfx.playRouletteSpin();
            setViewMode('roulette');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🎡 LIGHTNING ROULETTE &apos;86 • 50× TO 150× STRIKES</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_roulette_highscore') || 0).toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎡⚡🔴⚫</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON LIGHTNING ROULETTE &apos;86</h3>
              <p className="tm-arcade-steer-desc">
                60fps European 37-pocket physics wheel with real ball orbit &amp; pocket rattle! Every spin strikes{' '}
                <strong>3 Random ⚡ Lightning Numbers</strong> boosting straight-up payouts to{' '}
                <strong>50×, 75×, 100×, or 150×</strong>!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 Stack 1–25 Token Chips • 1-Tap Lucky 7s &amp; Lightning Presets
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playRouletteSpin();
                setViewMode('roulette');
              }}
            >
              ▶ Spin Roulette Wheel
            </button>
          </div>
        </div>

        {/* Cabinet 1: Authentic Las Vegas One-Arm Bandit 777 Slot Machine */}
        <div
          className="tm-arcade-steer-card tm-steer-slots"
          onClick={() => {
            sfx.playSlotLeverPull();
            setViewMode('slots');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🎰 ONE-ARM BANDIT • 777 / BAR / BELL / CHERRY</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_slots_best_win') || 0).toLocaleString()} 🪙
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎰💎🔔🍒</div>
            <div>
              <h3 className="tm-arcade-steer-title">LAS VEGAS ONE-ARM BANDIT</h3>
              <p className="tm-arcade-steer-desc">
                Authentic curved mechanical drums with <strong>Flaming 777s</strong>,{' '}
                <strong>Triple Gold BARs</strong>, <strong>Liberty Bells</strong>,{' '}
                <strong>Twin Cherries</strong> &amp; 3D chrome pull-lever!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 Wager 5–50 Tokens • Up to 50× Jackpot
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playSlotLeverPull();
                setViewMode('slots');
              }}
            >
              ▶ Pull Bandit Lever
            </button>
          </div>
        </div>

        {/* Cabinet 2: MEMEDAQ '86 Meme Stock Market Simulator */}
        <div
          className="tm-arcade-steer-card tm-steer-stocks"
          onClick={() => {
            sfx.playStockBell?.(true);
            setViewMode('stocks');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">📈 MEMEDAQ &apos;86 • LIVE WALL ST TERMINAL</span>
            <span className="tm-arcade-steer-best">
              🏆 Peak: {Number(localStorage.getItem('tm_stocks_highscore') || 0).toLocaleString()} 🪙
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">📈🐕🐸🚀</div>
            <div>
              <h3 className="tm-arcade-steer-title">STOCK MARKET SIMULATOR</h3>
              <p className="tm-arcade-steer-desc">
                Buy low &amp; sell high on <strong>$DOGE</strong>, <strong>$CHAD</strong>,{' '}
                <strong>$PEPE</strong>, <strong>$CATS</strong> &amp; <strong>$MOON</strong> with live neon CRT charts &amp; breaking news!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 Trade Real Tokens • Insider Rumor Hotline
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playStockBell?.(true);
                setViewMode('stocks');
              }}
            >
              ▶ Trade Meme Stocks
            </button>
          </div>
        </div>

        {/* Cabinet 3: Meme Crush Saga (10 Distinct 80s Neon Levels) */}
        <div
          className="tm-arcade-steer-card tm-steer-crush"
          onClick={() => {
            sfx.playCandyMatch(3);
            setViewMode('crush');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🍬 10 NEON LEVELS • MIXTAPE &amp; ICE LOCKS</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_crush_highscore') || 0).toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🍬📼🔒🌈</div>
            <div>
              <h3 className="tm-arcade-steer-title">MEME CRUSH — 10 LEVELS</h3>
              <p className="tm-arcade-steer-desc">
                10 distinct carved board geometries! Drop <strong>📼 80s Mixtapes</strong>, unlock{' '}
                <strong>🔒 Laser Ice Cages</strong> &amp; blast <strong>🧊 Double Frost Jelly</strong>!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 10 Token Prize Run (Win up to 26 🪙) or Free Practice
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playCandyMatch(3);
                setViewMode('crush');
              }}
            >
              ▶ Play 10 Levels
            </button>
          </div>
        </div>

        {/* Cabinet 4: 80s Neon Cyber-Pinball (5 Distinct Tables) */}
        <div
          className="tm-arcade-steer-card tm-steer-pinball"
          onClick={() => {
            sfx.playPinballBumper(0);
            setViewMode('pinball');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🎱 5 PINBALL TABLES • SKILL SHOT, NUDGE &amp; FEVER</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {Number(localStorage.getItem('tm_pinball_highscore') || 0).toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎱🏎️👾🦈</div>
            <div>
              <h3 className="tm-arcade-steer-title">UPGRADED 80s CYBER-PINBALL (5 TABLES)</h3>
              <p className="tm-arcade-steer-desc">
                Now upgraded with an oscillating <strong>🎯 Skill Shot Plunger</strong>,{' '}
                <strong>💥 Cabinet Nudge &amp; Tilt</strong>, <strong>🔥 6× Combo Neon Fever Overdrive</strong>,{' '}
                <strong>🏆 Table Boss Missions</strong> &amp; <strong>🎰 Mystery Vault Sinkholes</strong>!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 10 Token Coin-Op Run (Win up to 35 🪙) or Free Practice
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playPinballBumper(0);
                setViewMode('pinball');
              }}
            >
              ▶ Launch 5 Tables
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Lazy-loaded arcade games and interactive feed view switcher (Reels, Lobby, Swipe, Battle).
 */
export default function GameRouter({
  viewMode,
  setViewMode,
  tokens,
  handleSpendTokens,
  handlePayoutGameTokens,
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
  setAiUnlocked,
  setAiAssistantOpen,
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
  handleSkipMatchup
}) {
  return (
    <>
      {viewMode === 'pusher' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasCoinPusherGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onEarnTokens={(amt, evt, label) => {
              handlePayoutGameTokens(amt, {
                stakedTokens: Math.max(1, amt),
                xp: 12,
                label: label || `+${amt} 🪙 Dozer Tray Win!`,
                emoji: '🪙'
              });
            }}
            onEarnXp={(xpAmt) => awardXpOnly(xpAmt, null, '🪙', `+${xpAmt} XP`)}
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
          <VegasBlackjackGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
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

      {viewMode === 'derby' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <NeonDerbyGame
            tokens={tokens}
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
          />
        </Suspense>
      )}

      {viewMode === 'plinko' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemePlinkoGame
            tokens={tokens}
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
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
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
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
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
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
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
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
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

      {viewMode === 'crush' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeCrushGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
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

      {viewMode === 'reels' && (
        <VerticalReelsView
          filteredMemes={filteredMemes}
          userVotes={userVotes}
          bookmarkedIds={bookmarkedIds}
          onVote={handleVote}
          onReaction={handleReaction}
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
            onToggleAiAssistant={() => {
              closeAllModals();
              setAiUnlocked(true);
              setAiAssistantOpen((prev) => !prev);
            }}
            onBackToFeed={() => {
              closeAllModals();
              setViewMode('feed');
            }}
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
