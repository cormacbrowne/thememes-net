import { useState } from 'react';
import { WHEEL_REWARDS, DAILY_QUESTS } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';

export default function RewardsModal({
  xp,
  lootSpins,
  streakDays,
  streakClaimedToday,
  onClaimDailyStreak,
  onCompleteWheelSpin,
  unlockedFlairs,
  equippedFlair,
  onEquipFlair,
  questProgress,
  claimedQuests,
  onClaimQuestReward,
  onClose
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);

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

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-rewards-modal"
        style={{ maxWidth: '760px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#facc15' }}>
              🎰 Arcade Vault: Loot Wheel, Streaks & Quests
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

        {/* 2. WHEEL OF CHAOS / LOOT BOX SPINNER */}
        <div className="tm-wheel-section">
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
                Win exclusive Neon Title Flairs & Massive XP Jackpots! Earn spins from Quests & Daily Streaks.
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
                  : '🔒 Complete Quests Below to Earn More Spins!'}
            </button>
          </div>
        </div>

        {/* 3. EQUIPPED NEON TITLE FLAIR SELECTOR */}
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
                Spin the Wheel of Chaos above to unlock rare custom titles!
              </span>
            )}
          </div>
        </div>

        {/* 4. DAILY ARCADE QUESTS */}
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

        <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
          Current Vault Balance: <strong style={{ color: '#facc15' }}>{xp} XP</strong>
        </div>
      </div>
    </div>
  );
}
