import { useState, useEffect } from 'react';
import {
  WHEEL_REWARDS,
  DAILY_QUESTS,
  CURSOR_TRAILS,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from '../data/starterMemes';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import { sfx } from '../utils/soundEngine';
import VegasSlotMachine from './VegasSlotMachine';

export default function RewardsModal({
  xp,
  tokens = 25,
  tokenLedger,
  xpConversionState = null,
  xpAutoConvert = true,
  onToggleXpAutoConvert,
  onExchangeXpForTokens,
  reactorFlash = false,
  lootSpins,
  wheelSpinsLeftInWindow = ARCADE_RATE_LIMITS.WHEEL_SPINS_PER_WINDOW,
  wheelResetMs = 0,
  streakDays,
  streakClaimedToday,
  onClaimDailyStreak,
  onCompleteWheelSpin,
  onSpendTokens,
  onPayoutTokens,
  onOpenUpload,
  onLaunchSubGame,
  unlockedFlairs,
  equippedFlair,
  onEquipFlair,
  cursorTrail,
  onSelectCursorTrail,
  konamiUnlocked,
  questProgress,
  claimedQuests,
  onClaimQuestReward,
  onClose
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);

  // Only tick when hourly wheel window is actively cooling down
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (wheelSpinsLeftInWindow > 0) return undefined;
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [wheelSpinsLeftInWindow]);

  const canSpinWheel = !isSpinning && lootSpins > 0 && wheelSpinsLeftInWindow > 0;

  const dailyUsed = tokenLedger?.totalToday || 0;
  const dailyMax = ARCADE_ECONOMY_RULES.MAX_DAILY_EARNED_TOKENS;
  const dailyPct = Math.min(100, Math.round((dailyUsed / dailyMax) * 100));

  const handleSpinWheel = (e) => {
    if (!canSpinWheel) return;
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
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#facc15' }}>
              🎰 Arcade Token Vault: Fair Economy, Sub-Games &amp; Rewards
            </h2>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* 0. LOGICAL & FAIR DAILY TOKEN COLLECTION METER (ANTI-LOOPHOLE TRANSPARENCY) */}
        <div className="tm-fair-ledger-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: '#4ade80', letterSpacing: '0.5px' }}>
                🛡️ FAIR ARCADE TOKEN ECONOMY (ANTI-EXPLOIT PROTECTED)
              </div>
              <div style={{ fontSize: '17px', fontWeight: 900, marginTop: '2px' }}>
                Wallet: <span style={{ color: '#facc15' }}>🪙 {tokens} Tokens</span> •{' '}
                <span style={{ color: '#00f3ff' }}>{xp} XP</span>
              </div>
            </div>
            <div className="tm-spin-counter-pill" style={{ borderColor: '#4ade80', color: '#4ade80' }}>
              Daily Collection: <strong>{dailyUsed}</strong> / {dailyMax} Max Tokens Today
            </div>
          </div>

          <div className="tm-xp-track" style={{ marginTop: '8px', height: '8px' }}>
            <div className="tm-xp-bar" style={{ width: `${dailyPct}%` }} />
          </div>

          <div className="tm-ledger-caps-grid">
            <div className="tm-ledger-cap-pill">
              📸 Meme Uploads: <strong>{tokenLedger?.byCategory?.upload || 0}</strong>/{ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload} (+45–75 🪙)
            </div>
            <div className="tm-ledger-cap-pill">
              🔥 Feed Votes/Comments: <strong>{tokenLedger?.byCategory?.engagement || 0}</strong>/{ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.engagement}
            </div>
            <div className="tm-ledger-cap-pill">
              🎯 Daily Visit &amp; Quests: <strong>{tokenLedger?.byCategory?.quests || 0}</strong>/{ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.quests}
            </div>
            <div className="tm-ledger-cap-pill">
              ⚡ XP Reactor Mint: <strong>{tokenLedger?.byCategory?.xpConversion || 0}</strong>/{ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.xpConversion}
            </div>
          </div>

          {/* ⚡ XP-TO-TOKEN NEON FUSION CORE GRAPHIC & EXCHANGE CONTROLS */}
          {xpConversionState && (
            <div className={`tm-xp-fusion-core-card ${reactorFlash ? 'flash' : ''}`}>
              <div className="tm-xp-fusion-left">
                <div className="tm-xp-fusion-svg-box">
                  <svg width="86" height="86" viewBox="0 0 86 86">
                    <defs>
                      <linearGradient id="tmVaultFusionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f3ff" />
                        <stop offset="50%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#facc15" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="43"
                      cy="43"
                      r="35"
                      fill="rgba(2, 6, 23, 0.9)"
                      stroke="rgba(148, 163, 184, 0.2)"
                      strokeWidth="7"
                    />
                    <circle
                      cx="43"
                      cy="43"
                      r="35"
                      fill="none"
                      stroke="url(#tmVaultFusionGrad)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 35}
                      strokeDashoffset={
                        2 * Math.PI * 35 -
                        ((xpConversionState.readyTokens > 0 ? 100 : xpConversionState.progressPct) /
                          100) *
                          (2 * Math.PI * 35)
                      }
                      transform="rotate(-90 43 43)"
                      style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                    />
                  </svg>
                  <div className="tm-xp-fusion-svg-center">
                    <div style={{ fontSize: '18px', lineHeight: 1 }}>
                      {reactorFlash ? '🪙' : xpConversionState.readyTokens > 0 ? '🔥' : '⚡'}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#facc15', marginTop: '2px' }}>
                      {xpConversionState.readyTokens > 0
                        ? `+${xpConversionState.readyTokens}🪙`
                        : `${xpConversionState.progressPct}%`}
                    </div>
                  </div>
                </div>

                <div className="tm-xp-fusion-info">
                  <div className="tm-xp-fusion-badge-row">
                    <span className="tm-xp-fusion-title">⚡ XP-TO-TOKEN NEON FUSION CORE</span>
                    <span className="tm-xp-fusion-rate-pill">
                      100 XP = +5 🪙 (Rank XP Never Drops!)
                    </span>
                  </div>

                  <div className="tm-xp-fusion-status-text">
                    {xpConversionState.isDailyCapped ? (
                      <span style={{ color: '#4ade80' }}>
                        ✅ Daily Reactor Cap Reached ({xpConversionState.dailyConvertedTokens}/
                        {xpConversionState.maxDailyTokens} 🪙 minted today)!
                      </span>
                    ) : xpConversionState.readyTokens > 0 ? (
                      <span style={{ color: '#facc15' }}>
                        🔥 <strong>{xpConversionState.readyUnits * 100} XP</strong> ready to exchange for{' '}
                        <strong>+{xpConversionState.readyTokens} 🪙 Tokens</strong>! (+{' '}
                        {xpConversionState.progressXp}/100 XP toward next batch)
                      </span>
                    ) : (
                      <span>
                         Reactor Charge: <strong style={{ color: '#00f3ff' }}>{xpConversionState.progressXp} / 100 XP</strong>{' '}
                        — Only <strong style={{ color: '#facc15' }}>{xpConversionState.xpRemaining} XP</strong> away from{' '}
                        <strong style={{ color: '#4ade80' }}>+5 🪙 Tokens</strong>!
                      </span>
                    )}
                  </div>

                  {/* Segmented 10-cell plasma bar showing exact proximity to next +5 🪙 */}
                  <div className="tm-xp-fusion-segments">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const threshold = (idx + 1) * 10;
                      const filled =
                        xpConversionState.readyTokens > 0 ||
                        xpConversionState.progressXp >= threshold;
                      const partial =
                        !filled &&
                        xpConversionState.progressXp > idx * 10 &&
                        xpConversionState.progressXp < threshold;
                      return (
                        <div
                          key={idx}
                          className={`tm-xp-fusion-seg ${filled ? 'filled' : ''} ${
                            partial ? 'partial' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tm-xp-fusion-actions">
                <button
                  type="button"
                  className={`tm-btn ${xpAutoConvert ? 'tm-btn-crt-active' : ''}`}
                  onClick={onToggleXpAutoConvert}
                  title="When Auto-Convert is ON, every 100 XP earned automatically mints +5 🪙 Tokens into your wallet!"
                  style={{ fontSize: '11px', padding: '7px 11px' }}
                >
                  {xpAutoConvert ? '🤖 Auto-Convert: ON' : '🖐️ Auto-Convert: OFF (Manual)'}
                </button>

                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  disabled={xpConversionState.readyTokens <= 0 || xpConversionState.isDailyCapped}
                  onClick={(e) => onExchangeXpForTokens && onExchangeXpForTokens(e)}
                  style={{
                    fontSize: '12px',
                    padding: '8px 14px',
                    opacity:
                      xpConversionState.readyTokens > 0 && !xpConversionState.isDailyCapped
                        ? 1
                        : 0.65
                  }}
                >
                  {xpConversionState.isDailyCapped
                    ? '✅ 50/50 🪙 Minted Today'
                    : xpConversionState.readyTokens > 0
                      ? `⚡ Exchange ${xpConversionState.readyUnits * 100} XP → +${xpConversionState.readyTokens} 🪙 Now!`
                      : `⚡ ${xpConversionState.xpRemaining} XP to Next +5 🪙`}
                </button>
              </div>
            </div>
          )}

          {onLaunchSubGame && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => {
                  onClose();
                  onLaunchSubGame('slots');
                }}
              >
                🎰 One-Arm Bandit
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => {
                  onClose();
                  onLaunchSubGame('stocks');
                }}
              >
                📈 Meme Stock Market
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => {
                  onClose();
                  onLaunchSubGame('crush');
                }}
              >
                🍬 Meme Crush (10 Lv)
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => {
                  onClose();
                  onLaunchSubGame('pinball');
                }}
              >
                🎱 Pinball (5 Tbl)
              </button>
            </div>
          )}
        </div>

        {/* 1. DAILY STREAK BANNER */}
        <div className="tm-streak-box" style={{ marginTop: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: '#f97316', letterSpacing: '0.6px' }}>
              🔥 DAILY ARCADE LOGIN STREAK
            </div>
            <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px' }}>
              Day {streakDays} Streak Active!{' '}
              <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                (+{ARCADE_ECONOMY_RULES.REWARDS.DAILY_STREAK.tokens} 🪙 Tokens + 100 XP + 1 Free Chaos Spin)
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

        {/* 2. RETRO NEON LAS VEGAS 777 ONE-ARM BANDIT CABINET */}
        <VegasSlotMachine
          embedded
          tokens={tokens}
          onSpendTokens={onSpendTokens}
          onPayoutTokens={onPayoutTokens}
          onOpenUpload={() => {
            onClose();
            if (onOpenUpload) onOpenUpload();
          }}
        />

        {/* 3. WHEEL OF CHAOS / LOOT BOX SPINNER (WITH TIMED WINDOW LIMITER & WALLET CAP) */}
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
                Win Neon Title Flairs &amp; XP! (Limit: {ARCADE_RATE_LIMITS.WHEEL_SPINS_PER_WINDOW} spins / hr • Max {ARCADE_RATE_LIMITS.MAX_STORED_WHEEL_SPINS} stored)
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="tm-spin-counter-pill">
                🎟️ <strong>{lootSpins}</strong>/{ARCADE_RATE_LIMITS.MAX_STORED_WHEEL_SPINS} Stored
              </div>
              <div
                className="tm-spin-counter-pill"
                style={{
                  borderColor:
                    wheelSpinsLeftInWindow > 0 ? 'rgba(0,243,255,0.45)' : 'rgba(239,68,68,0.5)',
                  color: wheelSpinsLeftInWindow > 0 ? '#00f3ff' : '#f87171'
                }}
              >
                {wheelSpinsLeftInWindow > 0 ? (
                  <>
                    🕐 <strong>{wheelSpinsLeftInWindow}</strong>/{ARCADE_RATE_LIMITS.WHEEL_SPINS_PER_WINDOW} Hourly Window
                  </>
                ) : (
                  <>⏳ Window resets in {formatWindowCountdown(wheelResetMs)}</>
                )}
              </div>
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
              disabled={!canSpinWheel}
              onClick={handleSpinWheel}
            >
              {isSpinning
                ? '🎰 SPINNING THE WHEEL OF CHAOS...'
                : wheelSpinsLeftInWindow <= 0
                  ? `⏳ Hourly Spin Limit Reached (Resets in ${formatWindowCountdown(wheelResetMs)})`
                  : lootSpins > 0
                    ? `🎰 SPIN WHEEL OF CHAOS (${lootSpins} STORED • ${wheelSpinsLeftInWindow} WINDOW LEFT)`
                    : '🔒 Complete Quests or Hit Triple Jackpot Above to Earn Spins!'}
            </button>
          </div>
        </div>

        {/* 4. TOUCH & MOUSE PARTICLE TRAIL SELECTOR */}
        <div style={{ marginTop: '18px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            ✨ Interactive Touch &amp; Cursor Particle Trail
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
          </div>
        </div>

        {/* 6. DAILY ARCADE QUESTS */}
        <div style={{ marginTop: '20px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '8px' }}>
            🎯 Live Arcade Quests (Complete for +{ARCADE_ECONOMY_RULES.REWARDS.DAILY_QUEST.tokens} 🪙 Tokens + XP + Free Chaos Spin!)
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
                          {current}/{q.target} • +{ARCADE_ECONOMY_RULES.REWARDS.DAILY_QUEST.tokens} 🪙 + {q.rewardXp} XP
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
                        🎁 Claim +{ARCADE_ECONOMY_RULES.REWARDS.DAILY_QUEST.tokens} 🪙
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

        {/* 7. SECRET KONAMI EASTER EGG HINT (MUST ACTUALLY ENTER CODE — NO FREE CLICK FARMING!) */}
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
            <strong style={{ color: '#d8b4fe' }}>🕹️ Secret 80s Arcade Easter Egg:</strong>{' '}
            <span style={{ color: '#cbd5e1' }}>
              Physically type <code>↑↑↓↓←→←→BA</code> on keyboard or rapidly tap the{' '}
              <strong>THE MEMES.net</strong> logo 5× on iPad/iPhone!
            </span>
          </div>
          <span style={{ color: konamiUnlocked ? '#4ade80' : '#94a3b8', fontWeight: 800 }}>
            {konamiUnlocked ? '✅ Secret Found!' : '🔒 Hidden'}
          </span>
        </div>
      </div>
    </div>
  );
}
