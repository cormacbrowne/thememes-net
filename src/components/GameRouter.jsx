import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { sfx } from '../utils/soundEngine';
import { GAME_VIEW_MODE_TO_PATH, SITE_ORIGIN } from '../data/seoRoutes';
import { getArcadeGameById } from '../data/arcadeGamesCatalog';
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

const ArcadeInitialsModal = lazyWithRetry(() => import('./ArcadeInitialsModal'));

const SwipeDeck = lazyWithRetry(() => import('./SwipeDeck'));
const BattleArena = lazyWithRetry(() => import('./BattleArena'));
const ArcadeLobby = lazyWithRetry(() => import('./ArcadeLobby'));
const NeonBingoGame = lazyWithRetry(() => import('./NeonBingoGame'));
const MemeCrushGame = lazyWithRetry(() => import('./MemeCrushGame'));
const MemeInvadersGame = lazyWithRetry(() => import('./MemeInvadersGame'));
const VegasPinballGame = lazyWithRetry(() => import('./VegasPinballGame'));
const VegasSlotMachine = lazyWithRetry(() => import('./VegasSlotMachine'));
const VegasBlackjackGame = lazyWithRetry(() => import('./VegasBlackjackGame'));
const VegasPokerGame = lazyWithRetry(() => import('./VegasPokerGame'));
const VegasRouletteGame = lazyWithRetry(() => import('./VegasRouletteGame'));
const VegasCoinPusherGame = lazyWithRetry(() => import('./VegasCoinPusherGame'));
const MemeStockMarketGame = lazyWithRetry(() => import('./MemeStockMarketGame'));
const NeonDerbyGame = lazyWithRetry(() => import('./NeonDerbyGame'));
const GuessTheMemeGame = lazyWithRetry(() => import('./GuessTheMemeGame'));
const Magic8BallOracle = lazyWithRetry(() => import('./Magic8BallOracle'));
const HigherOrLowerGame = lazyWithRetry(() => import('./HigherOrLowerGame'));

function readSafeNumber(key, fallback = 0) {
  try {
    return Number(localStorage.getItem(key) || fallback) || fallback;
  } catch {
    return fallback;
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
    const shareUrl = `${window.location.origin || SITE_ORIGIN}${canonical}`;
    const gameMeta = getArcadeGameById(viewMode);
    const shareTitle = gameMeta
      ? `${gameMeta.icon} ${gameMeta.label} | THE MEMES.net`
      : `80s Cyber-Arcade | THE MEMES.net`;
    const shareText = gameMeta
      ? `${gameMeta.icon} ${gameMeta.label} — ${gameMeta.pitch}`
      : `Play 15 free 80s neon arcade games on THE MEMES.net! 🕹️`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({
          title: shareTitle,
          text: shareText,
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
        className="tm-fixed-back-btn"
        onClick={() => {
          sfx.playToggle();
          setExtrasDrawerOpen?.(false);
          setViewMode('feed');
          window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
        }}
        title="Return to Home Page"
      >
        🏠 Home
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
      >
        🕹️ Lobby
      </button>

      <nav className="tm-fixed-game-pills" aria-label="Switch Arcade Game">
        <button
          type="button"
          className={`tm-fixed-game-pill ${viewMode === 'bingo' ? 'active' : ''}`}
          onClick={() => {
            sfx.playBingoBallPop?.();
            setViewMode('bingo');
          }}
        >
          🎱 Bingo &apos;86
        </button>
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
          className={`tm-fixed-game-pill ${viewMode === 'poker' ? 'active' : ''}`}
          onClick={() => {
            sfx.playPokerChip?.(2);
            setViewMode('poker');
          }}
        >
          🟡 Poker
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
          className={`tm-fixed-game-pill ${viewMode === 'eightball' ? 'active' : ''}`}
          onClick={() => {
            sfx.playMagic8BallShake?.();
            setViewMode('eightball');
          }}
        >
          🎱 8-Ball
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
          className={`tm-fixed-game-pill ${viewMode === 'invaders' ? 'active' : ''}`}
          onClick={() => {
            sfx.playToggle();
            setViewMode('invaders');
          }}
        >
          👾 Invaders
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
            🏆
          </button>
        )}
        <button
          type="button"
          className="tm-fixed-icon-btn"
          onClick={handleShareCurrentGame}
          title="Copy or Share Direct Link to This Game"
          aria-label="Share direct link to this game"
        >
          {sharedGame ? '✅' : '🔗'}
        </button>
        <button
          type="button"
          className="tm-fixed-wallet-pill"
          onClick={() => {
            sfx.playToggle();
            setShowRewardsModal(true);
          }}
          title="Open MemeDollarz Wallet & Daily Quests"
        >
          🪙 <strong>M${tokens}.{String(memeCentz || 0).padStart(2, '0')}</strong>
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
          🎛️
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
        {/* Cabinet 00-A: Neon Bingo '86 — 1986 Electric Bingo Hall */}
        <div
          className="tm-arcade-steer-card tm-steer-pinball"
          onClick={() => {
            sfx.playBingoBallPop?.();
            setViewMode('bingo');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🎱 NEON BINGO &apos;86 • 90 UK COMEDY CALLS</span>
            <span className="tm-arcade-steer-best">
              📺 Ceefax P.888 + UV Dabber
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎱🦆🎟️🏆</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON BINGO &apos;86 — ELECTRIC BINGO HALL</h3>
              <p className="tm-arcade-steer-desc">
                Spin the rotary <strong>Air-Blower Ball Cage</strong> while DJ Flashman calls all{' '}
                <strong>90 Classic UK Rhymes</strong> (&ldquo;Two Little Ducks 22!&rdquo;), stamp with{' '}
                <strong>UV Neon Dabbers</strong> (+15¢ Manual Skill Bonus) &amp; shout <strong>BINGO!</strong>
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🎟️ Free Practice or M$10 Card Buy-In (Up to 8.5× Full House!)
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playBingoBallPop?.();
                setViewMode('bingo');
              }}
            >
              ▶ Play Neon Bingo &apos;86
            </button>
          </div>
        </div>

        {/* Cabinet 00: Neon Coin Dozer '86 — Arcade Penny Falls & Prize Machine */}
        <div
          className="tm-arcade-steer-card tm-steer-roulette"
          onClick={() => {
            sfx.playCoinDrop?.();
            setViewMode('pusher');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🪙 NEON COIN DOZER &apos;86 • 25¢ PER COIN DROP</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {readSafeNumber('tm_pusher_highscore').toLocaleString()} pts
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
              🏆 Best: {readSafeNumber('tm_blackjack_highscore').toLocaleString()} pts
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

        {/* Cabinet 0A-2: Neon Hold'em '86 Poker */}
        <div
          className="tm-arcade-steer-card tm-steer-blackjack"
          onClick={() => {
            sfx.playPokerChip?.(2);
            setViewMode('poker');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🟡 NEON HOLD&apos;EM &apos;86 • $2.50–$25 BUY-INS</span>
            <span className="tm-arcade-steer-best">
              🏆 Best Pot: {readSafeNumber('tm_poker_best_pot_v1').toLocaleString()}
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🟡🃏🐍🕶️</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON HOLD&apos;EM &apos;86 — TEXAS POKER</h3>
              <p className="tm-arcade-steer-desc">
                Stack your site <strong>🪙 Tokens</strong> into glowing casino chips and play full{' '}
                <strong>No-Limit Texas Hold&apos;em</strong> against AI sharks! Bet Flop, Turn &amp; River, shove{' '}
                <strong>ALL IN</strong>, and <strong>💰 Cash Out</strong> your stack back into your wallet!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🟡 Buy In 10–100 🪙 or Practice Free • Real-Time 7-Card Hand Evaluator
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-arcade-steer-cta"
              onClick={(e) => {
                e.stopPropagation();
                sfx.playPokerChip?.(2);
                setViewMode('poker');
              }}
            >
              ▶ Play Texas Poker
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
              🏆 Best: {readSafeNumber('tm_roulette_highscore').toLocaleString()} pts
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

        {/* Cabinet 1: Las Vegas Slot Arcade (5 Machines incl. Neon Supernova Special) */}
        <div
          className="tm-arcade-steer-card tm-steer-slots"
          onClick={() => {
            sfx.playSlotLeverPull();
            setViewMode('slots');
          }}
        >
          <div className="tm-arcade-steer-top">
            <span className="tm-arcade-steer-pill">🎰 VEGAS SLOT ARCADE • 5 MACHINES (25¢ PLAY)</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {readSafeNumber('tm_slots_best_win').toLocaleString()} 🪙
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎰⚡☕🚁</div>
            <div>
              <h3 className="tm-arcade-steer-title">LAS VEGAS SLOT ARCADE (5 MACHINES)</h3>
              <p className="tm-arcade-steer-desc">
                Authentic 1985 <strong>One-Arm Bandit</strong>, NEW flashing{' '}
                <strong>Neon Supernova Special &apos;86 (6 Powerups!)</strong>,{' '}
                <strong>Mr. Jackpots: Silver Mustang</strong>,{' '}
                <strong>Lightning Vault 5000</strong> &amp; <strong>Cyber Buffalo &apos;86</strong>!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🪙 1980s Vegas Quarter Stakes ($1.25–$12.50 / 5–50 🪙) • House Always Wins Odds
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
              ▶ Enter Slot Arcade
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
              🏆 Peak: {readSafeNumber('tm_stocks_highscore').toLocaleString()} 🪙
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
            <span className="tm-arcade-steer-pill">🍬 10 NEON LEVELS • $2.50 COIN-OP ENTRY</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {readSafeNumber('tm_crush_highscore').toLocaleString()} pts
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
            <span className="tm-arcade-steer-pill">🎱 5 PINBALL TABLES • $2.50 ARCADE RUN</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {readSafeNumber('tm_pinball_highscore').toLocaleString()} pts
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
  handleSkipMatchup,
  deloreanEra,
  activeCarId,
  onSelectCar,
  onOpenTimeCircuits,
  onTriggerDeLoreanWarp,
  onOpenPrankDisguise
}) {
  const [initialsPrompt, setInitialsPrompt] = useState(null);
  const [continuousPeak, setContinuousPeak] = useState(null);
  const sessionLoggedPeakRef = useRef({});

  useEffect(() => {
    if (isLeaderboardGame(viewMode)) {
      void startGameSession(viewMode);
    }
  }, [viewMode]);

  const openInitialsForScore = useCallback(async (gameId, rawScore) => {
    const cleanScore = Math.floor(Number(rawScore) || 0);
    if (!isLeaderboardGame(gameId) || cleanScore < 1) return;
    const board = await fetchGameLeaderboard(gameId, 'all_time', 10);
    if (!board.ok || !qualifiesForTop10(board.entries, cleanScore)) return;
    sessionLoggedPeakRef.current[gameId] = cleanScore;
    setInitialsPrompt({
      gameId,
      score: cleanScore,
      sessionId: getActiveGameSession(gameId)?.sessionId || null
    });
  }, []);

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
                label: label || `+${amt} 🪙 Dozer Tray Win!`,
                emoji: '🪙'
              });
            }}
            onEarnXp={(xpAmt) => awardXpOnly(xpAmt, null, '🪙', `+${xpAmt} XP`)}
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
          <VegasBlackjackGame
            tokens={tokens}
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

      {viewMode === 'poker' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasPokerGame
            tokens={tokens}
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
          />
        </Suspense>
      )}

      {viewMode === 'eightball' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <Magic8BallOracle
            tokens={tokens}
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
            onOpenLeaderboard={() => onOpenCabinetLeaderboard?.('invaders')}
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

      {initialsPrompt && (
        <Suspense fallback={null}>
          <ArcadeInitialsModal
            gameId={initialsPrompt.gameId}
            score={initialsPrompt.score}
            sessionId={initialsPrompt.sessionId}
            onClose={() => setInitialsPrompt(null)}
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
