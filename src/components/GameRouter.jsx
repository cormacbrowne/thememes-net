import { Maximize2, Gamepad2, Trophy, Share2, Check, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
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
const ArcadeLobby = lazyWithRetry(() => import('./ArcadeLobby'));
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
 * Side Entertainment Arcade Lounge cards rendered below the meme feed.
 */
export function ArcadeLoungePromo({ setViewMode }) {
  return (
    <section className="tm-arcade-steer-shell" aria-label="Side Entertainment Arcade Lounge">
      <div className="tm-arcade-steer-section-head">
        <span className="tm-arcade-steer-eyebrow">🕹️ 80s NEON MEMEDOLLARZ CASINO &amp; ARCADE LOUNGE</span>
        <h2 className="tm-arcade-steer-heading">
          Earn MemeDollarz by Uploading Memes — Then Wager, Trade &amp; Play in Fixed Non-Scroll Cabinets
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
              🎟️ Free Practice or {formatMoney(10)} Card Buy-In (Up to 8.5× Full House!)
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
            <span className="tm-arcade-steer-pill">🎰 NEON COIN DOZER &apos;86 • {formatMoney(1)} PER COIN DROP</span>
            <span className="tm-arcade-steer-best">
              🏆 Best: {readSafeNumber('tm_pusher_highscore').toLocaleString()} pts
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🎰🎁💎🏆</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON COIN DOZER &apos;86 — PRIZE PUSHER</h3>
              <p className="tm-arcade-steer-desc">
                Drop coins onto the reciprocating <strong>Chrome Pusher Shelf</strong> to nudge cascades of coins,{' '}
                <strong>💎 Neon Diamonds ({formatMoney(8, { sign: true })})</strong>,{' '}
                <strong>🎁 Mystery Boxes ({formatMoney(12, { sign: true })})</strong> &amp;{' '}
                <strong>🏆 Golden Trophies ({formatMoney(20, { sign: true })})</strong> over the front lip into the payoff tray!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🎮 Free Practice Bucket or {formatMoney(1)} per Coin Drop • Bulldozer Fever Shields
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
              🃏 Wager {formatMoney(5)}–{formatMoney(50)} (3:2 Blackjack • Up to 15× Side Bet) or Free Practice
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
            <span className="tm-arcade-steer-pill">🟡 NEON HOLD&apos;EM &apos;86 • {formatMoney(10)}–{formatMoney(100)} BUY-INS</span>
            <span className="tm-arcade-steer-best">
              🏆 Best Pot: {readSafeNumber('tm_poker_best_pot_v1').toLocaleString()}
            </span>
          </div>
          <div className="tm-arcade-steer-body">
            <div className="tm-arcade-steer-icons">🟡🃏🐍🕶️</div>
            <div>
              <h3 className="tm-arcade-steer-title">NEON HOLD&apos;EM &apos;86 — TEXAS POKER</h3>
              <p className="tm-arcade-steer-desc">
                Stack your <strong>MemeDollarz</strong> into glowing casino chips and play full{' '}
                <strong>No-Limit Texas Hold&apos;em</strong> against AI sharks! Bet Flop, Turn &amp; River, shove{' '}
                <strong>ALL IN</strong>, and <strong>💰 Cash Out</strong> your stack back into your wallet!
              </p>
            </div>
          </div>
          <div className="tm-arcade-steer-footer">
            <span className="tm-arcade-steer-payout">
              🟡 Buy In {formatMoney(10)}–{formatMoney(100)} or Practice Free • Real-Time 7-Card Hand Evaluator
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
              🎡 Stack {formatMoney(1)}–{formatMoney(25)} Chips • 1-Tap Lucky 7s &amp; Lightning Presets
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
              🏆 Best: {formatMoney(readSafeNumber('tm_slots_best_win'), { compact: true, zero: 'balance' })}
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
              🎰 1980s Vegas Quarter Stakes ({formatMoney(5)}–{formatMoney(50)}) • House Always Wins Odds
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
              🏆 Peak: {formatMoney(readSafeNumber('tm_stocks_highscore'), { compact: true, zero: 'balance' })}
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
              📈 Trade MemeDollarz • Insider Rumor Hotline
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
            <span className="tm-arcade-steer-pill">🍬 10 NEON LEVELS • {formatMoney(10)} COIN-OP ENTRY</span>
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
              🍬 {formatMoney(10)} Prize Run (Win up to {formatMoney(18)}) or Free Practice
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
            <span className="tm-arcade-steer-pill">🎱 5 PINBALL TABLES • {formatMoney(10)} ARCADE RUN</span>
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
              🎱 {formatMoney(10)} Coin-Op Run (Win up to {formatMoney(28)}) or Free Practice
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
  // Play with friends: { game, viewMode, code } while a multiplayer room is open (invite link = ?room=CODE).
  const [mpRoom, setMpRoom] = useState(() => roomFromUrl(viewMode));
  const [mpPrevView, setMpPrevView] = useState(viewMode);
  if (mpPrevView !== viewMode) {
    setMpPrevView(viewMode);
    setMpRoom(roomFromUrl(viewMode));
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
