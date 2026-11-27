import { useState, useEffect, useRef } from 'react';
import { subscribeWinCelebration } from '../utils/winCelebration';
import { DeLoreanSvg } from './DeLoreanTimeMachine';
import { burst, coinsTo } from './ui/JuiceLayer';
import { countUp, flash, haptic, isJuiceDisabled } from '../utils/juice';
import './WinCelebrationOverlay.css';

const THEME_EMOJIS = {
  'gold-fountain': ['💰', '🏆', '💵', '✨', '💎'],
  'lightning-surge': ['⚡', '🌩️', '✨', '💥', '🔋'],
  'synth-lasers': ['🌈', '🔥', '✨', '🎛️', '💫'],
  'comic-confetti': ['🎉', '🎊', '💥', '⭐', '🥳'],
  'delorean-88mph': ['🔥', '⚡', '🏎️', '✨', '💨'],
  'disco-strobe': ['🪩', '🌟', '💃', '✨', '🎵'],
  'ufo-abduction': ['🛸', '👽', '💎', '💰', '✨', '🏆'],
  'meteor-vault': ['☄️', '💰', '💎', '👑', '🔥', '💵'],
  'hyperdrive-aurora': ['🌌', '⚡', '🏎️', '✨', '💫', '🚀'],
  'arcade-fireworks': ['🎆', '🎇', '👑', '🏆', '✨', '💰']
};

const FIREWORK_BURSTS = [
  { x: '18%', y: '24%', delay: '60ms', color: '#00f3ff' },
  { x: '80%', y: '22%', delay: '460ms', color: '#facc15' },
  { x: '28%', y: '44%', delay: '880ms', color: '#ec4899' },
  { x: '72%', y: '42%', delay: '1280ms', color: '#4ade80' }
];

const METEOR_TRAJECTORIES = [
  { top: '6%', left: '12%', delay: '0ms', scale: 1.05 },
  { top: '14%', left: '58%', delay: '180ms', scale: 0.92 },
  { top: '4%', left: '84%', delay: '360ms', scale: 1.1 },
  { top: '22%', left: '34%', delay: '560ms', scale: 0.88 },
  { top: '10%', left: '72%', delay: '780ms', scale: 1.0 }
];

function FlyingSaucerSvg() {
  return (
    <svg viewBox="0 0 180 84" className="tm-rare-ufo-svg" aria-hidden="true">
      <defs>
        <linearGradient id="tmUfoHull" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="tmUfoDome" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#22d3ee" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="48" rx="76" ry="18" fill="url(#tmUfoHull)" stroke="#67e8f9" strokeWidth="2.5" />
      <ellipse cx="90" cy="44" rx="52" ry="11" fill="#0f172a" opacity="0.55" />
      <path d="M54 41 C56 14, 124 14, 126 41 Z" fill="url(#tmUfoDome)" stroke="#a5f3fc" strokeWidth="2" />
      <ellipse cx="90" cy="62" rx="28" ry="6" fill="#34d399" opacity="0.9" />
      <circle cx="38" cy="48" r="4" fill="#facc15" />
      <circle cx="62" cy="54" r="4" fill="#ec4899" />
      <circle cx="90" cy="56" r="4.5" fill="#4ade80" />
      <circle cx="118" cy="54" r="4" fill="#ec4899" />
      <circle cx="142" cy="48" r="4" fill="#facc15" />
    </svg>
  );
}

/* Night Viper — original violet neon gunship with afterburner, flying left-to-right (T-019) */
function AirwolfSvg() {
  return (
    <svg viewBox="0 0 260 112" className="tm-chopper-svg tm-airwolf-svg" aria-hidden="true">
      <defs>
        <linearGradient id="awAfterburn" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#fb923c" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="awCanopy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.88" />
          <stop offset="55%" stopColor="#0f172a" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      {/* Main rotor blur disc + mast */}
      <ellipse cx="146" cy="18" rx="92" ry="5" fill="rgba(148,163,184,0.38)" />
      <rect x="64" y="16" width="164" height="3.2" rx="1.6" fill="#e2e8f0" className="tm-chopper-blade-sweep" />
      <rect x="142" y="18" width="8" height="14" rx="2" fill="#475569" />

      {/* Supersonic afterburner exhaust plumes */}
      <polygon points="82,45 14,38 26,45 10,51 82,53" fill="url(#awAfterburn)" className="tm-aw-flame" />

      {/* Tail boom & shark fin */}
      <path d="M98,44 L36,42 L26,22 L42,22 L52,42 L100,56 Z" fill="#1e1036" stroke="#7c3aed" strokeWidth="1.5" />
      <path d="M52,49 L86,52 L88,56 L50,53 Z" fill="#4c1d95" />
      {/* Tail rotor */}
      <circle cx="33" cy="31" r="10" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="4 3" />
      <line x1="33" y1="21" x2="33" y2="41" stroke="#e2e8f0" strokeWidth="2.2" />

      {/* One-colour dark violet hull with a single cyan chevron stripe */}
      <path
        d="M84,42 C104,28 148,26 178,34 C202,41 226,51 236,61 C238,67 218,74 176,75 L96,73 C84,68 78,54 84,42 Z"
        fill="#1e1036"
        stroke="#7c3aed"
        strokeWidth="1.6"
      />
      <path d="M96,60 L200,52 L232,60" fill="none" stroke="#19f0ff" strokeWidth="1.8" strokeLinejoin="round" />

      {/* Tinted cockpit canopy */}
      <path d="M168,36 L220,56 L166,57 Z" fill="url(#awCanopy)" stroke="#38bdf8" strokeWidth="1.2" />
      <line x1="190" y1="43" x2="188" y2="57" stroke="#0f172a" strokeWidth="2" />

      {/* Top engine fairing */}
      <path d="M114,32 C136,27 160,29 170,38 L110,41 Z" fill="#2e1065" stroke="#7c3aed" strokeWidth="1.2" />

      {/* Stub wing with two rocket pods */}
      <rect x="118" y="64" width="30" height="4" rx="2" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1" />
      <rect x="120" y="68" width="10" height="4" rx="2" fill="#94a3b8" />
      <rect x="136" y="68" width="10" height="4" rx="2" fill="#94a3b8" />

      {/* Landing skids */}
      <path d="M120,75 L114,86 M200,75 L206,86 M104,86 L216,86" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Viper-eye emblem */}
      <path d="M136,51 Q144,44 152,51 Q144,58 136,51 Z" fill="#020617" stroke="#19f0ff" strokeWidth="1.2" />
      <ellipse cx="144" cy="51" rx="1.4" ry="4" fill="#ff2a85" />
    </svg>
  );
}

/* Sky Patrol — original teal night-patrol chopper with a searchlight (T-019) */
function BlueThunderSvg() {
  return (
    <svg viewBox="0 0 260 128" className="tm-chopper-svg tm-bluethunder-svg" aria-hidden="true">
      <defs>
        <linearGradient id="btSearchlight" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.82" />
          <stop offset="55%" stopColor="#67e8f9" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main rotor disc */}
      <ellipse cx="114" cy="18" rx="90" ry="5" fill="rgba(56,189,248,0.34)" />
      <rect x="34" y="16" width="160" height="3.2" rx="1.6" fill="#bae6fd" className="tm-chopper-blade-sweep" />
      <rect x="110" y="18" width="8" height="14" rx="2" fill="#334155" />

      {/* Tactical xenon searchlight cone angled forward-left */}
      <polygon points="48,66 2,126 88,126" fill="url(#btSearchlight)" className="tm-bt-beam" />

      {/* Tail boom & open two-blade tail rotor (facing left) */}
      <path d="M148,44 L222,42 L232,22 L216,22 L208,42 L148,54 Z" fill="#0e3b43" stroke="#19f0ff" strokeWidth="1.5" />
      <circle cx="222" cy="36" r="10" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="4 3" />
      <line x1="222" y1="24" x2="222" y2="48" stroke="#e2e8f0" strokeWidth="2.2" />

      {/* Rounded-nose patrol hull (facing LEFT) */}
      <path
        d="M30,60 C30,40 60,32 108,32 L154,36 L160,64 L138,74 L50,74 C38,72 30,68 30,60 Z"
        fill="#0e3b43"
        stroke="#19f0ff"
        strokeWidth="1.6"
      />
      {/* Rounded glass canopy */}
      <path d="M34,58 C36,44 58,38 100,40 L102,58 Z" fill="#020617" stroke="#22d3ee" strokeWidth="1.3" />
      <path d="M44,54 C46,47 56,44 66,44 L66,54 Z" fill="#06b6d4" opacity="0.45" />

      {/* Top engine fairing */}
      <path d="M90,32 L142,30 L146,42 L88,42 Z" fill="#082f35" stroke="#19f0ff" strokeWidth="1.2" />

      {/* Chin searchlight pod */}
      <circle cx="48" cy="67" r="5" fill="#cbd5e1" stroke="#334155" strokeWidth="1.2" />
      <circle cx="46" cy="67" r="2.2" fill="#fef08a" />

      {/* Landing skids */}
      <path d="M58,74 L52,84 M132,74 L138,84 M42,84 L148,84" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Cyan patrol stripe */}
      <rect x="108" y="60" width="38" height="4" rx="1" fill="#19f0ff" />
    </svg>
  );
}

function renderChopperLayer(chopperFlyby) {
  if (!chopperFlyby) return null;
  const showAirwolf = chopperFlyby === 'airwolf' || chopperFlyby === 'both';
  const showBlueThunder = chopperFlyby === 'bluethunder' || chopperFlyby === 'both';
  return (
    <div className="tm-win-chopper-layer" aria-hidden="true">
      {showAirwolf && (
        <div className="tm-win-chopper-unit is-airwolf">
          <AirwolfSvg />
          <span className="tm-chopper-radio-tag">🦅 ACE VEGA • NIGHT VIPER MACH 1+</span>
        </div>
      )}
      {showBlueThunder && (
        <div className="tm-win-chopper-unit is-bluethunder">
          <BlueThunderSvg />
          <span className="tm-chopper-radio-tag">🚁 SKY PATROL • SILENT RUN</span>
        </div>
      )}
    </div>
  );
}

export default function WinCelebrationOverlay({
  litePerfMode = false,
  compactPlayfieldMode = false
}) {
  const [activeWin, setActiveWin] = useState(null);
  const [displayAmount, setDisplayAmount] = useState(0);
  const timerRef = useRef(null);
  const countHandleRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeWinCelebration((payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countHandleRef.current) {
        countHandleRef.current.cancel();
        countHandleRef.current = null;
      }
      setActiveWin(payload);

      const targetAmt = Number(payload.amount) || 0;
      const rank = payload.rewardRank || 2;
      if (targetAmt <= 1 || rank <= 1 || isJuiceDisabled()) {
        setDisplayAmount(targetAmt);
      } else {
        const countMs = Math.min(1150, 320 + rank * 190);
        setDisplayAmount(0);
        countHandleRef.current = countUp(null, 0, targetAmt, {
          ms: countMs,
          onTick: (val) => setDisplayAmount(Math.round(val))
        });
      }

      if (!compactPlayfieldMode && typeof window !== 'undefined') {
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.4;
        haptic(rank >= 5 ? 'jackpot' : rank >= 3 ? 'big' : 'win');
        if (payload.theme === 'lightning-surge' && typeof document !== 'undefined') {
          flash(document.body, 'rgba(0, 243, 255, 0.22)', 160);
        }
        burst({
          x: cx,
          y: cy,
          kind: 'confetti',
          count: Math.min(40, 10 + rank * 6),
          colour: '#ffcf4d'
        });
        if (rank >= 2) {
          burst({
            x: cx,
            y: cy,
            kind: 'ring',
            colour: rank >= 4 ? '#ff2bd6' : '#00f3ff'
          });
        }
        if (targetAmt > 0) {
          burst({
            x: cx,
            y: cy - 12,
            kind: 'coin',
            count: Math.min(18, 4 + rank * 3)
          });
          coinsTo({
            fromEl: { x: cx, y: cy },
            count: Math.min(12, 3 + rank * 2)
          });
        }
      }

      timerRef.current = setTimeout(() => {
        setActiveWin((curr) => (curr && curr.id === payload.id ? null : curr));
      }, payload.durationMs || 2200);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countHandleRef.current) {
        countHandleRef.current.cancel();
        countHandleRef.current = null;
      }
    };
  }, [compactPlayfieldMode]);

  if (!activeWin) return null;

  if (compactPlayfieldMode) {
    return (
      <div
        key={activeWin.id}
        className={`tm-win-overlay is-playfield-compact theme-${activeWin.theme}`}
        data-reward-tier={activeWin.rewardTier || 'nice'}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="tm-win-edge-aura" aria-hidden="true" />
        {renderChopperLayer(activeWin.chopperFlyby)}
        <div className="tm-win-playfield-ticker">
          <span className="tm-win-playfield-badge">{activeWin.headline}</span>
          {activeWin.amount > 0 && (
            <strong className="tm-win-playfield-amt">
              +{displayAmount.toLocaleString()} {activeWin.unit}
            </strong>
          )}
          {activeWin.detail && (
            <span className="tm-win-playfield-detail">{activeWin.detail}</span>
          )}
        </div>
      </div>
    );
  }

  const isRare = Boolean(activeWin.isRare);
  const rank = activeWin.rewardRank || (isRare ? 5 : activeWin.isBig ? 3 : 2);
  const tierClass = `tier-${activeWin.rewardTier || 'nice'}`;
  const emojis = THEME_EMOJIS[activeWin.theme] || THEME_EMOJIS['gold-fountain'];

  return (
    <div
      key={activeWin.id}
      className={`tm-win-overlay ${tierClass} theme-${activeWin.theme} ${
        activeWin.isBig ? 'is-big' : ''
      } ${activeWin.isMega ? 'is-mega' : ''} ${isRare ? 'is-rare' : ''}`}
      data-reward-tier={activeWin.rewardTier || 'nice'}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Background FX Layer per Theme & Escalating Rank */}
      <div className="tm-win-fx-layer" aria-hidden="true">
        {rank >= 3 && <div className="tm-win-edge-aura" />}
        {rank >= 4 && <div className="tm-win-sunburst" />}

        {rank >= 2 && activeWin.theme === 'lightning-surge' && (
          <>
            <div className="tm-win-flash-veil" />
            <div className="tm-win-shockwave" />
            {rank >= 3 && <div className="tm-win-shockwave delayed" />}
          </>
        )}

        {rank >= 2 && activeWin.theme === 'synth-lasers' && (
          <div className="tm-win-lasers">
            <span className="tm-win-laser l1" />
            <span className="tm-win-laser l2" />
            {rank >= 3 && <span className="tm-win-laser l3" />}
            {rank >= 3 && <span className="tm-win-laser l4" />}
          </div>
        )}

        {rank >= 2 && activeWin.theme === 'delorean-88mph' && (
          <div className="tm-win-delorean-pass">
            <DeLoreanSvg showFlames fluxActive />
          </div>
        )}

        {rank >= 2 && activeWin.theme === 'disco-strobe' && (
          <div className="tm-win-disco-orb">🪩</div>
        )}

        {renderChopperLayer(activeWin.chopperFlyby)}

        {/* Coin rain waterfall for Mega & Legendary rewards even on normal themes */}
        {rank >= 4 && activeWin.theme !== 'meteor-vault' && (
          <>
            {Array.from({ length: litePerfMode ? 6 : rank >= 5 ? 16 : 10 }).map((_, idx) => (
              <span
                key={`tier-rain-${idx}`}
                className="tm-rare-coin-rain"
                style={{
                  left: `${5 + ((idx * 13.7) % 90)}%`,
                  animationDelay: `${(idx % 5) * 180}ms`,
                  '--rrot': `${idx % 2 === 0 ? 300 : -300}deg`
                }}
              >
                {emojis[idx % emojis.length]}
              </span>
            ))}
          </>
        )}

        {/* Extra side fireworks on Legendary */}
        {rank >= 5 && activeWin.theme !== 'arcade-fireworks' && !litePerfMode && (
          <>
            {FIREWORK_BURSTS.slice(0, 2).map((fw, fIdx) => (
              <div
                key={`legend-fw-${fIdx}`}
                className="tm-rare-fw-cluster"
                style={{
                  left: fw.x,
                  top: fw.y,
                  '--fw-color': fw.color,
                  '--fw-delay': fw.delay
                }}
              >
                <span className="tm-rare-fw-core" />
                {Array.from({ length: 8 }).map((_, pIdx) => (
                  <span
                    key={`lpetal-${pIdx}`}
                    className="tm-rare-fw-petal"
                    style={{ '--pangle': `${pIdx * 45}deg` }}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* RARE THEME 1: UFO MOTHERSHIP ABDUCTION */}
        {activeWin.theme === 'ufo-abduction' && (
          <>
            <div className="tm-rare-aurora-veil" />
            <div className="tm-rare-tractor-beam" />
            <div className="tm-rare-ufo-craft">
              <FlyingSaucerSvg />
            </div>
            {Array.from({ length: litePerfMode ? 6 : 12 }).map((_, idx) => (
              <span
                key={`star-${idx}`}
                className="tm-rare-star"
                style={{
                  left: `${8 + ((idx * 17) % 84)}%`,
                  top: `${6 + ((idx * 23) % 52)}%`,
                  animationDelay: `${(idx % 5) * 140}ms`
                }}
              >
                ✦
              </span>
            ))}
            {Array.from({ length: litePerfMode ? 6 : 12 }).map((_, idx) => (
              <span
                key={`abduct-${idx}`}
                className="tm-rare-abduct-item"
                style={{
                  '--ax': `${((idx % 5) - 2) * 34}px`,
                  animationDelay: `${160 + idx * 175}ms`
                }}
              >
                {emojis[idx % emojis.length]}
              </span>
            ))}
          </>
        )}

        {/* RARE THEME 2: GOLDEN METEOR VAULT SHOWER */}
        {activeWin.theme === 'meteor-vault' && (
          <>
            <div className="tm-rare-vault-flare" />
            <div className="tm-rare-vault-ring" />
            <div className="tm-rare-vault-ring delayed" />
            {METEOR_TRAJECTORIES.slice(0, litePerfMode ? 3 : 5).map((m, idx) => (
              <div
                key={`meteor-${idx}`}
                className="tm-rare-meteor"
                style={{
                  top: m.top,
                  left: m.left,
                  animationDelay: m.delay,
                  '--mscale': m.scale
                }}
              />
            ))}
            {Array.from({ length: litePerfMode ? 8 : 18 }).map((_, idx) => (
              <span
                key={`rain-${idx}`}
                className="tm-rare-coin-rain"
                style={{
                  left: `${4 + ((idx * 11.5) % 92)}%`,
                  animationDelay: `${120 + (idx % 6) * 210}ms`,
                  '--rrot': `${idx % 2 === 0 ? 320 : -320}deg`
                }}
              >
                {emojis[idx % emojis.length]}
              </span>
            ))}
          </>
        )}

        {/* RARE THEME 3: 88-MPH QUANTUM HYPERDRIVE */}
        {activeWin.theme === 'hyperdrive-aurora' && (
          <>
            <div className="tm-rare-synth-horizon" />
            <div className="tm-rare-prism-ring" />
            <div className="tm-rare-prism-ring delayed" />
            <div className="tm-rare-warp-hub">
              {Array.from({ length: litePerfMode ? 6 : 14 }).map((_, idx) => (
                <span
                  key={`warp-${idx}`}
                  className="tm-rare-warp-streak"
                  style={{
                    '--wangle': `${Math.round((idx / (litePerfMode ? 6 : 14)) * 360)}deg`,
                    animationDelay: `${(idx % 4) * 140}ms`
                  }}
                />
              ))}
            </div>
            <div className="tm-rare-tire-tracks" />
            <div className="tm-rare-delorean-hyper">
              <DeLoreanSvg showFlames fluxActive />
            </div>
          </>
        )}

        {/* RARE THEME 4: NEON CHAMPIONSHIP FIREWORKS */}
        {activeWin.theme === 'arcade-fireworks' && (
          <>
            <div className="tm-rare-spotlight left" />
            <div className="tm-rare-spotlight right" />
            {FIREWORK_BURSTS.slice(0, litePerfMode ? 2 : 4).map((fw, fIdx) => (
              <div
                key={`fw-${fIdx}`}
                className="tm-rare-fw-cluster"
                style={{
                  left: fw.x,
                  top: fw.y,
                  '--fw-color': fw.color,
                  '--fw-delay': fw.delay
                }}
              >
                <span className="tm-rare-fw-core" />
                {Array.from({ length: litePerfMode ? 6 : 10 }).map((_, pIdx) => (
                  <span
                    key={`petal-${pIdx}`}
                    className="tm-rare-fw-petal"
                    style={{
                      '--pangle': `${pIdx * (litePerfMode ? 60 : 36)}deg`
                    }}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* Confetti / Coin / Ring bursts are drawn cleanly through JuiceLayer canvas */}
      </div>

      {/* Unmistakable Center-Top Reward Banner (escalates with win size) */}
      <div className="tm-win-card">
        {(isRare || activeWin.rareBadge) && activeWin.rareBadge && (
          <div className="tm-win-rare-ribbon">{activeWin.rareBadge}</div>
        )}
        <div className="tm-win-kicker-row">
          <span className="tm-win-kicker">{activeWin.kicker}</span>
          {activeWin.game && <span className="tm-win-game-tag">{activeWin.game}</span>}
        </div>
        <div className="tm-win-headline">{activeWin.headline}</div>
        {activeWin.amount > 0 && (
          <div className="tm-win-amount-pill">
            +{displayAmount.toLocaleString()} {activeWin.unit}
            {activeWin.multiplier >= 3 && rank >= 3 && (
              <span className="tm-win-mult-badge">
                {Number(activeWin.multiplier.toFixed(1))}×
              </span>
            )}
          </div>
        )}
        {activeWin.detail && <div className="tm-win-detail">{activeWin.detail}</div>}
      </div>
    </div>
  );
}
