import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SLOT_SYMBOLS,
  MEME_FORTUNES,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from '../data/starterMemes';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { sfx } from '../utils/soundEngine';

const MARQUEE_BULB_COUNT = 18;

export default function VegasSlotMachine({
  embedded = false,
  tokens = 50,
  tokenLedger = null,
  slotPullsLeft = ARCADE_RATE_LIMITS.SLOT_PULLS_PER_WINDOW,
  slotResetMs = 0,
  gameTokensRemainingToday,
  onCompleteSlotSpin,
  onSpendTokensForPulls,
  onBackToFeed
}) {
  const [reels, setReels] = useState([0, 1, 2]);
  const [reelSpinning, setReelSpinning] = useState([false, false, false]);
  const [heldReels, setHeldReels] = useState([false, false, false]);
  const [canHoldThisTurn, setCanHoldThisTurn] = useState(true);
  const [nudgesLeft, setNudgesLeft] = useState(2);
  const [leverPulled, setLeverPulled] = useState(false);
  const [anticipationReel3, setAnticipationReel3] = useState(false);
  const [winTier, setWinTier] = useState(null); // null | 'jackpot' | 'double' | 'consolation'
  const [slotResultMsg, setSlotResultMsg] = useState(
    '🎰 Pull the Chrome Vegas Lever or tap SPIN! Lock lucky symbols with 🔒 HOLD or bump reels with ⏫ NUDGE!'
  );
  const [progressivePot, setProgressivePot] = useState(() =>
    Number(localStorage.getItem('tm_vegas_slot_pot') || 7770)
  );
  const [sessionTokensWon, setSessionTokensWon] = useState(0);
  const [sessionSpinsCount, setSessionSpinsCount] = useState(0);
  const [storedHighScore] = useState(() =>
    Number(localStorage.getItem('tm_slots_highscore') || 0)
  );
  const [sessionScore, setSessionScore] = useState(0);
  const [coinShower, setCoinShower] = useState([]);
  const [copiedShare, setCopiedShare] = useState(false);

  const timersRef = useRef([]);
  const isAnySpinning = reelSpinning[0] || reelSpinning[1] || reelSpinning[2];
  const canPull = !isAnySpinning && slotPullsLeft > 0;

  const effectiveGameTokensLeft =
    gameTokensRemainingToday ??
    Math.max(
      0,
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.games -
        (tokenLedger?.byCategory?.games || 0)
    );

  useEffect(() => {
    localStorage.setItem('tm_vegas_slot_pot', String(progressivePot));
  }, [progressivePot]);

  useEffect(() => {
    if (sessionScore > storedHighScore) {
      localStorage.setItem('tm_slots_highscore', String(sessionScore));
    }
  }, [sessionScore, storedHighScore]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const spawnCoinFountain = useCallback((count = 14) => {
    const now = Date.now();
    const coins = Array.from({ length: count }).map((_, idx) => ({
      id: `coin-${now}-${idx}-${Math.random()}`,
      leftPct: 12 + Math.round(Math.random() * 76),
      dx: Math.round((Math.random() - 0.5) * 110),
      dy: Math.round(-65 - Math.random() * 85),
      delayMs: idx * 35,
      emoji: ['🪙', '💎', '🎰', '✨', '🔥'][idx % 5]
    }));
    setCoinShower(coins);
    setTimeout(() => {
      setCoinShower([]);
    }, 1400);
  }, []);

  const evaluateReelsOutcome = useCallback(
    (finalReels, event = null, fromNudge = false) => {
      const [r1, r2, r3] = finalReels;
      const sym1 = SLOT_SYMBOLS[r1] || SLOT_SYMBOLS[0];
      const sym2 = SLOT_SYMBOLS[r2] || SLOT_SYMBOLS[0];
      const sym3 = SLOT_SYMBOLS[r3] || SLOT_SYMBOLS[0];

      if (r1 === r2 && r2 === r3) {
        // TRIPLE JACKPOT!
        const is777 = sym1.id === '777';
        const isDiamond = sym1.id === 'diamond';
        const tokensWon = 25;
        const xpWon = is777 ? 150 : isDiamond ? 135 : 120;
        const ptsWon = is777 ? progressivePot : sym1.mult * 450;

        setWinTier('jackpot');
        setSessionTokensWon((t) => t + tokensWon);
        setSessionScore((s) => s + ptsWon);
        setProgressivePot(7770);
        spawnCoinFountain(22);

        sfx.playJackpot();
        setTimeout(() => sfx.playAirhorn(), 160);

        const msg = is777
          ? `🚨 VEGAS 777 MEGA JACKPOT!! +${ptsWon.toLocaleString()} PTS, +${tokensWon} 🪙 Tokens, +${xpWon} XP, +1 Wheel Spin & "💎 High-Roller" Flair!`
          : `🎰 TRIPLE ${sym1.emoji} ${sym1.name} JACKPOT!! +${ptsWon.toLocaleString()} PTS, +${tokensWon} 🪙 Tokens, +${xpWon} XP & +1 Wheel Spin!`;
        setSlotResultMsg(msg);

        if (onCompleteSlotSpin && !fromNudge) {
          onCompleteSlotSpin(
            {
              tokensWon,
              xpWon,
              spinsWon: 1,
              flair: '💎 Diamond High-Roller'
            },
            event
          );
        }
      } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // DOUBLE MATCH!
        const matchedSym = r1 === r2 ? sym1 : r2 === r3 ? sym2 : sym1;
        const tokensWon = matchedSym.id === '777' || matchedSym.id === 'diamond' ? 12 : 9;
        const xpWon = 55;
        const ptsWon = matchedSym.mult * 140;

        setWinTier('double');
        setSessionTokensWon((t) => t + tokensWon);
        setSessionScore((s) => s + ptsWon);
        spawnCoinFountain(12);
        sfx.playJackpot();

        setSlotResultMsg(
          `🔥 DOUBLE ${matchedSym.emoji} ${matchedSym.name} HIT! +${ptsWon.toLocaleString()} PTS, +${tokensWon} 🪙 Tokens & +${xpWon} XP! ${
            nudgesLeft > 0 ? '(Tip: Use ⏫ NUDGE if the 3rd symbol is peeking!)' : ''
          }`
        );

        if (onCompleteSlotSpin && !fromNudge) {
          onCompleteSlotSpin(
            {
              tokensWon,
              xpWon,
              spinsWon: 0,
              flair: null
            },
            event
          );
        }
      } else {
        // Check if any reel has Lucky 7 or Cyber Diamond
        const hasLucky7OrDiamond = [sym1, sym2, sym3].some(
          (s) => s.id === '777' || s.id === 'diamond'
        );
        const tokensWon = hasLucky7OrDiamond ? 4 : 2;
        const xpWon = hasLucky7OrDiamond ? 25 : 15;
        const ptsWon = hasLucky7OrDiamond ? 220 : 85;

        setWinTier('consolation');
        setSessionTokensWon((t) => t + tokensWon);
        setSessionScore((s) => s + ptsWon);
        if (hasLucky7OrDiamond) {
          sfx.playCandyMatch(2);
          spawnCoinFountain(6);
          setSlotResultMsg(
            `✨ LUCKY VEGAS SCATTER (7️⃣/💎)! +${ptsWon} PTS, +${tokensWon} 🪙 Tokens & +${xpWon} XP!`
          );
        } else {
          sfx.playClownHonk();
          const fortune = MEME_FORTUNES[Math.floor(Math.random() * MEME_FORTUNES.length)];
          setSlotResultMsg(`🎲 +${tokensWon} 🪙 Consolation Tokens & +${xpWon} XP! ${fortune}`);
        }

        if (onCompleteSlotSpin && !fromNudge) {
          onCompleteSlotSpin(
            {
              tokensWon,
              xpWon,
              spinsWon: 0,
              flair: null
            },
            event
          );
        }
      }
    },
    [progressivePot, nudgesLeft, spawnCoinFountain, onCompleteSlotSpin]
  );

  const handleToggleHold = (reelIdx) => {
    if (isAnySpinning || !canHoldThisTurn) return;
    sfx.playToggle();
    setHeldReels((prev) => {
      const next = [...prev];
      const currentlyHeldCount = prev.filter(Boolean).length;
      if (!next[reelIdx] && currentlyHeldCount >= 1) {
        // Allow holding max 1 reel per spin for fair arcade balance
        return [reelIdx === 0, reelIdx === 1, reelIdx === 2];
      }
      next[reelIdx] = !next[reelIdx];
      return next;
    });
  };

  const handleNudgeReel = (reelIdx, e) => {
    if (isAnySpinning || nudgesLeft <= 0) return;
    sfx.playSlotReelStop(reelIdx);
    setNudgesLeft((n) => Math.max(0, n - 1));
    const nextReels = [...reels];
    nextReels[reelIdx] = (nextReels[reelIdx] + 1) % SLOT_SYMBOLS.length;
    setReels(nextReels);
    evaluateReelsOutcome(nextReels, e, true);
  };

  const handlePullLever = useCallback(
    (e) => {
      if (!canPull) return;

      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];

      // Animate physical side lever pull
      setLeverPulled(true);
      setTimeout(() => setLeverPulled(false), 480);
      sfx.playSlotLeverPull();

      setWinTier(null);
      setAnticipationReel3(false);
      setSessionSpinsCount((c) => c + 1);
      setProgressivePot((p) => p + 45);
      setSlotResultMsg('🎰 Las Vegas Neon Drums spinning...');

      const usedHold = heldReels.some(Boolean);
      const nextSpinning = [!heldReels[0], !heldReels[1], !heldReels[2]];
      setReelSpinning(nextSpinning);

      // Predetermine final symbols with exciting Las Vegas odds
      const r1 = heldReels[0] ? reels[0] : Math.floor(Math.random() * SLOT_SYMBOLS.length);
      const luckyRoll = Math.random();
      const r2 = heldReels[1]
        ? reels[1]
        : luckyRoll < 0.42
        ? r1
        : Math.floor(Math.random() * SLOT_SYMBOLS.length);
      const r3 = heldReels[2]
        ? reels[2]
        : luckyRoll < 0.16
        ? r1
        : Math.floor(Math.random() * SLOT_SYMBOLS.length);

      const finalReels = [r1, r2, r3];

      // Rapidly cycle unheld reels while spinning
      const spinTicker = setInterval(() => {
        setReels((prev) => [
          nextSpinning[0] ? (prev[0] + 1) % SLOT_SYMBOLS.length : prev[0],
          nextSpinning[1] ? (prev[1] + 1) % SLOT_SYMBOLS.length : prev[1],
          nextSpinning[2] ? (prev[2] + 1) % SLOT_SYMBOLS.length : prev[2]
        ]);
      }, 65);

      // Stop Reel 1 at 560ms
      const t1 = setTimeout(() => {
        nextSpinning[0] = false;
        setReelSpinning((prev) => [false, prev[1], prev[2]]);
        setReels((prev) => [r1, prev[1], prev[2]]);
        sfx.playSlotReelStop(0);
      }, 560);

      // Stop Reel 2 at 1050ms
      const t2 = setTimeout(() => {
        nextSpinning[1] = false;
        setReelSpinning((prev) => [false, false, prev[2]]);
        setReels((prev) => [r1, r2, prev[2]]);
        sfx.playSlotReelStop(1);
        if (r1 === r2 && !heldReels[2]) {
          setAnticipationReel3(true);
          setSlotResultMsg('🔥 TWO MATCHED! DRUMROLL FOR TRIPLE VEGAS JACKPOT...');
        }
      }, 1050);

      // Stop Reel 3 at 1620ms
      const t3 = setTimeout(() => {
        clearInterval(spinTicker);
        nextSpinning[2] = false;
        setReelSpinning([false, false, false]);
        setAnticipationReel3(false);
        setReels(finalReels);
        sfx.playSlotReelStop(2);

        // Reset holds if used this turn; re-enable hold every other turn
        setHeldReels([false, false, false]);
        setCanHoldThisTurn(!usedHold);
        if (Math.random() < 0.35) {
          setNudgesLeft((n) => Math.min(2, n + 1));
        }

        evaluateReelsOutcome(finalReels, e, false);
      }, 1620);

      timersRef.current = [t1, t2, t3, { clear: () => clearInterval(spinTicker) }];
    },
    [canPull, heldReels, reels, evaluateReelsOutcome]
  );

  // Keyboard Spacebar support when in standalone view
  useEffect(() => {
    if (embedded) return;
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.key === ' ') {
        e.preventDefault();
        handlePullLever(e);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [embedded, handlePullLever]);

  const handleShareSlots = () => {
    const shareUrl = `${window.location.origin}/?mode=slots`;
    const shareText = `🎰 I just hit ${sessionScore.toLocaleString()} pts & won ${sessionTokensWon} 🪙 Arcade Tokens on the LAS VEGAS 777 NEON SLOT MACHINE at THE MEMES.net!`;
    navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      navigator
        .share({
          title: '🎰 Las Vegas 777 Neon Slots — THE MEMES.net',
          text: shareText,
          url: shareUrl
        })
        .catch(() => {});
    }
    sfx.playPop(2);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const cabinetContent = (
    <div
      className={`tm-vegas-slot-cabinet ${isAnySpinning ? 'is-spinning' : ''} ${
        winTier === 'jackpot'
          ? 'win-jackpot'
          : winTier === 'double'
          ? 'win-double'
          : ''
      }`}
    >
      {/* 1. ARCHED LAS VEGAS NEON MARQUEE TOPPER */}
      <div className="tm-vegas-slot-topper">
        <div className="tm-vegas-bulb-ring" aria-hidden="true">
          {Array.from({ length: MARQUEE_BULB_COUNT }).map((_, i) => (
            <span
              key={i}
              className="tm-vegas-bulb"
              style={{ '--bulb-idx': i }}
            />
          ))}
        </div>

        <div className="tm-vegas-welcome-ribbon">
          ✨ WELCOME TO FABULOUS CYBER-VEGAS • THEMEMES.NET ✨
        </div>

        <div className="tm-vegas-neon-title">
          <span>🎰</span> 777 NEON MEME SLOTS <span>🎰</span>
        </div>

        <div className="tm-vegas-progressive-led">
          <span className="tm-led-dot" />
          <span>MEGA 777 PROGRESSIVE POT:</span>
          <strong>{progressivePot.toLocaleString()} PTS + 25 🪙 + 💎 FLAIR</strong>
        </div>
      </div>

      {/* 2. ILLUMINATED VEGAS PAYTABLE GLASS PANEL */}
      <div className="tm-vegas-paytable-glass">
        <div className="tm-vegas-pay-row highlight-gold">
          <span>7️⃣ 7️⃣ 7️⃣ VEGAS 777</span>
          <strong>+25 🪙 • +150 XP • +1 SPIN</strong>
        </div>
        <div className="tm-vegas-pay-row highlight-cyan">
          <span>💎 💎 💎 CYBER 3X</span>
          <strong>+25 🪙 • +135 XP • +1 SPIN</strong>
        </div>
        <div className="tm-vegas-pay-row highlight-pink">
          <span>🐸/🦆/🗿 TRIPLE MEME</span>
          <strong>+25 🪙 • +120 XP • +1 SPIN</strong>
        </div>
        <div className="tm-vegas-pay-row">
          <span>🍒 ANY 2 MATCH</span>
          <strong>+9–12 🪙 • +55 XP</strong>
        </div>
      </div>

      {/* 3. RECESSED 3-REEL CURVED DRUM WINDOW + PHYSICAL 3D CHROME SIDE LEVER */}
      <div className="tm-vegas-machine-body">
        <div className="tm-vegas-drum-housing">
          {/* Glowing Center Payline Indicators */}
          <div className="tm-vegas-payline-laser" aria-hidden="true">
            <span className="tm-payline-tag left">▶ PAY</span>
            <span className="tm-payline-beam" />
            <span className="tm-payline-tag right">PAY ◀</span>
          </div>

          <div className="tm-vegas-reels-grid">
            {reels.map((symIdx, reelIdx) => {
              const total = SLOT_SYMBOLS.length;
              const topSym = SLOT_SYMBOLS[(symIdx - 1 + total) % total];
              const centerSym = SLOT_SYMBOLS[symIdx] || SLOT_SYMBOLS[0];
              const bottomSym = SLOT_SYMBOLS[(symIdx + 1) % total];
              const spinning = reelSpinning[reelIdx];
              const isHeld = heldReels[reelIdx];
              const isSuspense = reelIdx === 2 && anticipationReel3 && spinning;

              return (
                <div key={reelIdx} className="tm-vegas-reel-column">
                  <div
                    className={`tm-vegas-drum-window ${spinning ? 'spinning' : ''} ${
                      isHeld ? 'held' : ''
                    } ${isSuspense ? 'suspense' : ''}`}
                    style={{ '--reel-accent': centerSym.color }}
                  >
                    {/* Cylindrical Top Shadow & Glass Glare */}
                    <div className="tm-drum-curvature-shade" aria-hidden="true" />
                    <div className="tm-drum-glass-shine" aria-hidden="true" />

                    {isHeld && <div className="tm-drum-held-stamp">🔒 HELD</div>}

                    <div className={`tm-drum-strip ${spinning ? 'blur-roll' : ''}`}>
                      {/* Top Peek Symbol */}
                      <div className="tm-drum-cell peek-top" aria-hidden="true">
                        <span className="tm-drum-peek-emoji">{topSym.emoji}</span>
                      </div>

                      {/* Center Payline Symbol */}
                      <div className="tm-drum-cell payline-center">
                        <div className="tm-drum-main-emoji">{centerSym.emoji}</div>
                        <div
                          className="tm-drum-main-name"
                          style={{ color: centerSym.color }}
                        >
                          {centerSym.name}
                        </div>
                      </div>

                      {/* Bottom Peek Symbol */}
                      <div className="tm-drum-cell peek-bottom" aria-hidden="true">
                        <span className="tm-drum-peek-emoji">{bottomSym.emoji}</span>
                      </div>
                    </div>
                  </div>

                  {/* Classic Vegas Sub-Reel Hold & Nudge Buttons */}
                  <div className="tm-vegas-reel-subbtns">
                    <button
                      type="button"
                      className={`tm-vegas-hold-btn ${isHeld ? 'active' : ''}`}
                      disabled={isAnySpinning || !canHoldThisTurn}
                      onClick={() => handleToggleHold(reelIdx)}
                      title="Hold this reel for your next spin!"
                    >
                      {isHeld ? '🔒 HELD' : '🔓 HOLD'}
                    </button>
                    <button
                      type="button"
                      className="tm-vegas-nudge-btn"
                      disabled={isAnySpinning || nudgesLeft <= 0}
                      onClick={(e) => handleNudgeReel(reelIdx, e)}
                      title="Bump this reel down 1 symbol!"
                    >
                      ⏫ NUDGE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AUTHENTIC 3D CHROME & NEON PHYSICAL PULL LEVER ON RIGHT SIDE */}
        <div className="tm-vegas-lever-mount">
          <div className="tm-vegas-lever-box">
            <button
              type="button"
              className={`tm-vegas-lever-arm ${leverPulled ? 'pulled' : ''}`}
              disabled={!canPull}
              onClick={handlePullLever}
              title={
                canPull
                  ? 'Pull the Las Vegas Slot Machine Lever!'
                  : `Cooldown active (${formatWindowCountdown(slotResetMs)})`
              }
              aria-label="Pull Slot Machine Lever"
            >
              <span className="tm-vegas-lever-knob">
                <span className="tm-knob-shine" />
                <span className="tm-knob-text">PULL</span>
              </span>
              <span className="tm-vegas-lever-shaft" />
            </button>
            <div className="tm-vegas-lever-socket" />
          </div>
          <div className="tm-vegas-lever-caption">
            {isAnySpinning ? '⚡ SPINNING' : '🕹️ PULL ARM'}
          </div>
        </div>
      </div>

      {/* 4. DIGITAL RESULT MARQUEE READOUT */}
      <div className={`tm-vegas-result-readout ${winTier ? `tier-${winTier}` : ''}`}>
        {slotResultMsg}
      </div>

      {/* 5. ILLUMINATED CASINO CONTROL DECK */}
      <div className="tm-vegas-control-deck">
        <div className="tm-vegas-deck-Meters">
          <span className="tm-vegas-meter-chip">
            🎟️ Pulls: <strong>{slotPullsLeft}</strong>/{ARCADE_RATE_LIMITS.SLOT_PULLS_PER_WINDOW}
            {slotPullsLeft <= 0 && ` (Refills ${formatWindowCountdown(slotResetMs)})`}
          </span>
          <span className="tm-vegas-meter-chip">
            ⏫ Nudges: <strong>{nudgesLeft}</strong>
          </span>
          <span className="tm-vegas-meter-chip">
            🔒 Hold: <strong>{canHoldThisTurn ? 'READY' : 'RECHARGING'}</strong>
          </span>
        </div>

        <div className="tm-vegas-deck-buttons">
          {slotPullsLeft > 0 ? (
            <button
              type="button"
              className="tm-vegas-spin-deck-btn"
              disabled={!canPull}
              onClick={handlePullLever}
            >
              {isAnySpinning
                ? '🎰 REELS ROLLING...'
                : `🎰 PULL LEVER / SPIN (${slotPullsLeft} LEFT)`}
            </button>
          ) : onSpendTokensForPulls ? (
            <button
              type="button"
              className="tm-vegas-spin-deck-btn"
              disabled={tokens < 15}
              onClick={() => onSpendTokensForPulls()}
            >
              🪙 Insert 15 Tokens for +5 Pulls (or wait {formatWindowCountdown(slotResetMs)})
            </button>
          ) : (
            <button type="button" className="tm-vegas-spin-deck-btn" disabled>
              ⏳ Refills in {formatWindowCountdown(slotResetMs)}
            </button>
          )}
        </div>
      </div>

      {/* 6. CHROME COIN HOPPER TRAY & FLYING GOLDEN COINS FOUNTAIN */}
      <div className="tm-vegas-coin-tray">
        {coinShower.map((c) => (
          <span
            key={c.id}
            className="tm-vegas-flying-coin"
            style={{
              left: `${c.leftPct}%`,
              '--dx': `${c.dx}px`,
              '--dy': `${c.dy}px`,
              animationDelay: `${c.delayMs}ms`
            }}
            aria-hidden="true"
          >
            {c.emoji}
          </span>
        ))}
        <div className="tm-coin-tray-lip">
          <span>🪙 CHROME COIN HOPPER</span>
          <span>
            Session Won: <strong style={{ color: '#4ade80' }}>+{sessionTokensWon} 🪙</strong> •{' '}
            Spins: <strong>{sessionSpinsCount}</strong> • Score:{' '}
            <strong style={{ color: '#facc15' }}>{sessionScore.toLocaleString()} PTS</strong>
          </span>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return cabinetContent;
  }

  return (
    <section className="tm-subgame-wrap" aria-label="Las Vegas 777 Retro Neon Slot Machine">
      <div className="tm-subgame-card tm-slots-page-shell">
        <div className="tm-subgame-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {onBackToFeed && (
              <button type="button" className="tm-btn tm-back-pill" onClick={onBackToFeed}>
                ← Back to Memes
              </button>
            )}
            <div>
              <h2 className="tm-subgame-title">
                🎰 LAS VEGAS 777 NEON SLOTS{' '}
                <span className="tm-subgame-badge">MEMES.NET CASINO</span>
              </h2>
              <div className="tm-subgame-subtitle">
                Pull the 3D Chrome Lever, 🔒 HOLD lucky reels, ⏫ NUDGE near-misses &amp; hit Triple
                777 for +25 🪙 Tokens!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className="tm-spin-counter-pill"
              style={{ borderColor: '#facc15', color: '#facc15' }}
            >
              🪙 {effectiveGameTokensLeft} Game Tokens Left Today
            </span>
            <button type="button" className="tm-btn" onClick={handleShareSlots}>
              {copiedShare ? '✅ Link Copied!' : '🔗 Share Machine'}
            </button>
          </div>
        </div>

        {cabinetContent}
      </div>
    </section>
  );
}
