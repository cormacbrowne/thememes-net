import { useState } from 'react';
import {
  WHEEL_REWARDS,
  DAILY_QUESTS,
  SLOT_SYMBOLS,
  CURSOR_TRAILS,
  MEME_FORTUNES
} from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';

export default function RewardsModal({
  xp,
  lootSpins,
  streakDays,
  streakClaimedToday,
  onClaimDailyStreak,
  onCompleteWheelSpin,
  onCompleteSlotSpin,
  unlockedFlairs,
  equippedFlair,
  onEquipFlair,
  cursorTrail,
  onSelectCursorTrail,
  konamiUnlocked,
  onTriggerKonamiGodMode,
  questProgress,
  claimedQuests,
  onClaimQuestReward,
  onClose
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);

  // 3-Reel Brainrot Slot Machine State
  const [reels, setReels] = useState([0, 1, 2]);
  const [isRollingSlots, setIsRollingSlots] = useState(false);
  const [slotResultMsg, setSlotResultMsg] = useState('');

  const handleSpinWheel = (e) => {
    if (isSpinning || lootSpins <= 0) return;
    setIsSpinning(true);
    setWonPrize(null);

    const targetIdx = Math.floor(Math.random() * WHEEL_REWARDS.length);
    const totalTicks = 18 + targetIdx;
    let currentTick = 0;

    const runTick = () => {
      currentTick += 1;
      setHighlightIdx(currentTick % WHEEL_REWARDS.length);
      sfx.playToggle();

      if (currentTick < totalTicks) {
        const delay = 45 + Math.round((currentTick / totalTicks) * 140);
        setTimeout(runTick, delay);
      } else {
        const prize = WHEEL_REWARDS[targetIdx];
        setIsSpinning(false);
        setWonPrize(prize);
        sfx.playJackpot();
        if (onCompleteWheelSpin) {
          onCompleteWheelSpin(prize, e);
        }
      }
    };

    runTick();
  };

  const handlePullSlotLever = (e) => {
    if (isRollingSlots) return;
    setIsRollingSlots(true);
    setSlotResultMsg('🎰 Reels spinning...');
    sfx.playBoing(2);

    let step = 0;
    const totalSteps = 12;

    const rollInterval = setInterval(() => {
      step += 1;
      sfx.playToggle();
      setReels([
        Math.floor(Math.random() * SLOT_SYMBOLS.length),
        Math.floor(Math.random() * SLOT_SYMBOLS.length),
        Math.floor(Math.random() * SLOT_SYMBOLS.length)
      ]);

      if (step >= totalSteps) {
        clearInterval(rollInterval);
        // Slightly boost match odds so players get frequent exciting wins!
        const r1 = Math.floor(Math.random() * SLOT_SYMBOLS.length);
        const luckyRoll = Math.random();
        const r2 = luckyRoll < 0.48 ? r1 : Math.floor(Math.random() * SLOT_SYMBOLS.length);
        const r3 =
          luckyRoll < 0.22
            ? r1
            : Math.floor(Math.random() * SLOT_SYMBOLS.length);

        const finalReels = [r1, r2, r3];
        setReels(finalReels);
        setIsRollingSlots(false);

        const sym1 = SLOT_SYMBOLS[r1];
        if (r1 === r2 && r2 === r3) {
          sfx.playJackpot();
          setTimeout(() => sfx.playAirhorn(), 180);
          const msg = `🚨 TRIPLE ${sym1.emoji} MEGA JACKPOT! +750 XP + 2 Free Wheel Spins + "💎 High-Roller" Flair!`;
          setSlotResultMsg(msg);
          if (onCompleteSlotSpin) {
            onCompleteSlotSpin({ xpWon: 750, spinsWon: 2, flair: '💎 Diamond High-Roller' }, e);
          }
        } else if (r1 === r2 || r2 === r3 || r1 === r3) {
          sfx.playJackpot();
          const msg = `🔥 DOUBLE MATCH! You won +180 XP + 1 Free Wheel Spin!`;
          setSlotResultMsg(msg);
          if (onCompleteSlotSpin) {
            onCompleteSlotSpin({ xpWon: 180, spinsWon: 1, flair: null }, e);
          }
        } else {
          sfx.playClownHonk();
          const fortune = MEME_FORTUNES[Math.floor(Math.random() * MEME_FORTUNES.length)];
          setSlotResultMsg(`🎲 Consolation +45 XP! ${fortune}`);
          if (onCompleteSlotSpin) {
            onCompleteSlotSpin({ xpWon: 45, spinsWon: 0, flair: null }, e);
          }
        }
      }
    }, 75);
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-rewards-modal"
        style={{ maxWidth: '800px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#facc15' }}>
              🎰 Arcade Vault: Slots, Loot Wheel, Trails &amp; Quests
            </h2>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* 1. DAILY STREAK BANNER */}
        <div className="tm-streak-box">
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#f97316', letterSpacing: '0.6px' }}>
              🔥 DAILY ARCADE LOGIN STREAK
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px' }}>
              Day {streakDays} Streak Active!{' '}
              <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                (+{100 + streakDays * 50} XP + 1 Free Chaos Spin)
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`tm-btn ${streakClaimedToday ? '' : 'tm-btn-primary'}`}
            disabled={streakClaimedToday}
            onClick={onClaimDailyStreak}
          >
            {streakClaimedToday ? '✅ Claimed Today' : '🎁 Claim Daily Bonus!'}
          </button>
        </div>

        {/* 2. NEW: 3-REEL BRAINROT SLOT MACHINE MINI-GAME */}
        <div className="tm-slot-machine-box">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '10px'
            }}
          >
            <div>
              <div className="tm-studio-label" style={{ margin: 0, color: '#f472b6' }}>
                🍒 3-REEL BRAINROT SLOT MACHINE (UNLIMITED FREE PULLS!)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Match 2 for +180 XP &amp; +1 Wheel Spin • Match 3 for +750 XP Mega Jackpot!
              </div>
            </div>
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              disabled={isRollingSlots}
              onClick={handlePullSlotLever}
            >
              {isRollingSlots ? '🎰 ROLLING...' : '🕹️ PULL SLOT LEVER (FREE!)'}
            </button>
          </div>

          <div className="tm-slot-reels-row">
            {reels.map((symIdx, idx) => {
              const sym = SLOT_SYMBOLS[symIdx] || SLOT_SYMBOLS[0];
              return (
                <div
                  key={idx}
                  className={`tm-slot-reel ${isRollingSlots ? 'rolling' : ''}`}
                >
                  <div className="tm-slot-emoji">{sym.emoji}</div>
                  <div className="tm-slot-name">{sym.name}</div>
                </div>
              );
            })}
          </div>

          {slotResultMsg && (
            <div className="tm-slot-result-banner">{slotResultMsg}</div>
          )}
        </div>

        {/* 3. WHEEL OF CHAOS / LOOT BOX SPINNER */}
        <div className="tm-wheel-section" style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '12px'
            }}
          >
            <div>
              <div className="tm-studio-label" style={{ margin: 0 }}>
                🎡 WHEEL OF CHAOS (MYSTERY LOOT CRATES)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Win exclusive Neon Title Flairs &amp; Massive XP Jackpots!
              </div>
            </div>
            <div className="tm-spin-counter-pill">
              🎟️ <strong>{lootSpins}</strong> Spin{lootSpins === 1 ? '' : 's'} Ready
            </div>
          </div>

          <div className="tm-wheel-grid">
            {WHEEL_REWARDS.map((item, idx) => (
              <div
                key={item.id}
                className={`tm-wheel-slot ${highlightIdx === idx ? 'active' : ''}`}
                style={{ '--slot-color': item.color }}
              >
                <div style={{ fontSize: '13px', fontWeight: 900, color: item.color }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                  +{item.xpBonus} XP {item.flair ? '• Permanent Title' : '• Instant Boost'}
                </div>
              </div>
            ))}
          </div>

          {wonPrize && (
            <div className="tm-wheel-win-banner">
              🎉 <strong>JACKPOT UNLOCKED:</strong> {wonPrize.label} (+{wonPrize.xpBonus} XP)!
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-spin-cta-btn"
              disabled={isSpinning || lootSpins <= 0}
              onClick={handleSpinWheel}
            >
              {isSpinning
                ? '🎰 SPINNING THE WHEEL OF CHAOS...'
                : lootSpins > 0
                  ? `🎰 SPIN WHEEL OF CHAOS (${lootSpins} LEFT)`
                  : '🔒 Pull the Slot Machine Above to Win Free Wheel Spins!'}
            </button>
          </div>
        </div>

        {/* 4. TOUCH & MOUSE PARTICLE TRAIL SELECTOR */}
        <div style={{ marginTop: '18px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            ✨ Interactive Touch &amp; Cursor Particle Trail (Works on iPhone, iPad, Android &amp; PC!)
          </div>
          <div className="tm-flair-list">
            {CURSOR_TRAILS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tm-flair-chip ${cursorTrail === t.id ? 'active' : ''}`}
                onClick={() => onSelectCursorTrail && onSelectCursorTrail(t.id)}
              >
                {t.label} {cursorTrail === t.id ? '✅' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* 5. EQUIPPED NEON TITLE FLAIR SELECTOR */}
        <div style={{ marginTop: '18px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            👑 Unlocked Neon Title Flairs ({unlockedFlairs.length} Unlocked)
          </div>
          <div className="tm-flair-list">
            <button
              type="button"
              className={`tm-flair-chip ${!equippedFlair ? 'active' : ''}`}
              onClick={() => onEquipFlair('')}
            >
              Standard Rank Title
            </button>
            {unlockedFlairs.map((flair) => (
              <button
                key={flair}
                type="button"
                className={`tm-flair-chip ${equippedFlair === flair ? 'active' : ''}`}
                onClick={() => onEquipFlair(flair)}
              >
                {flair} {equippedFlair === flair ? '✅' : ''}
              </button>
            ))}
            {unlockedFlairs.length === 0 && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Spin the Wheel of Chaos or Slot Machine above to unlock rare custom titles!
              </span>
            )}
          </div>
        </div>

        {/* 6. DAILY ARCADE QUESTS */}
        <div style={{ marginTop: '20px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            🎯 Live Arcade Quests (Complete for XP + Free Chaos Spins!)
          </div>
          <div className="tm-quests-list">
            {DAILY_QUESTS.map((q) => {
              const current = Math.min(q.target, Number(questProgress[q.id] || 0));
              const pct = Math.round((current / q.target) * 100);
              const isDone = current >= q.target;
              const isClaimed = Boolean(claimedQuests[q.id]);

              return (
                <div
                  key={q.id}
                  className={`tm-quest-row ${isDone ? 'completed' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div className="tm-quest-icon">{q.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                        <span>{q.title}</span>
                        <span style={{ color: '#facc15' }}>
                          {current}/{q.target} • +{q.rewardXp} XP + 1 Spin
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                        {q.desc}
                      </div>
                      <div className="tm-xp-track">
                        <div className="tm-xp-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    {isClaimed ? (
                      <span className="tm-quest-claimed-badge">✅ Claimed</span>
                    ) : isDone ? (
                      <button
                        type="button"
                        className="tm-btn tm-btn-primary"
                        onClick={(e) => onClaimQuestReward(q, e)}
                      >
                        🎁 Claim +{q.rewardXp} XP
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. SECRET KONAMI GOD MODE EASTER EGG UNLOCK */}
        <div
          style={{
            marginTop: '18px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px dashed rgba(168, 85, 247, 0.45)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '12px'
          }}
        >
          <div>
            <strong style={{ color: '#d8b4fe' }}>🕹️ Secret Arcade Cheat Code:</strong>{' '}
            <span style={{ color: '#cbd5e1' }}>
              Type <code>↑↑↓↓←→←→BA</code> on PC or tap the <strong>THE MEMES.net</strong> logo 5 times on mobile/iPad!
            </span>
          </div>
          <button
            type="button"
            className="tm-btn"
            style={{ borderColor: '#a855f7', color: '#d8b4fe' }}
            onClick={onTriggerKonamiGodMode}
          >
            {konamiUnlocked ? '⚡ Re-Trigger God Mode Fireworks' : '🕹️ Activate God Mode (+1,000 XP)'}
          </button>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
          Current Vault Balance: <strong style={{ color: '#facc15' }}>{xp} XP</strong>
        </div>
      </div>
    </div>
  );
}
