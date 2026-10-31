import { useState, useEffect, useRef } from 'react';
import { sfx } from '../utils/soundEngine';

const CHAOS_EVENTS = ['pinata', 'boss', 'police', 'jackpot'];
const MAX_TARGET_HP = 8;
const ESCAPE_DURATION_MS = 7200;

function randomArenaPos(prevPos = { x: 50, y: 50 }) {
  let nx = 18 + Math.round(Math.random() * 64);
  let ny = 22 + Math.round(Math.random() * 56);
  if (Math.abs(nx - prevPos.x) < 18) {
    nx = nx > 50 ? nx - 26 : nx + 26;
  }
  return {
    x: Math.max(15, Math.min(85, nx)),
    y: Math.max(20, Math.min(80, ny))
  };
}

export default function DankPetWidget({
  onEarnPetXp,
  onWinPinataReward,
  pinataClaimedToday = false,
  onSelectViewMode
}) {
  const [minimized, setMinimized] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null); // null | 'pinata' | 'boss' | 'police' | 'jackpot'
  const [hp, setHp] = useState(MAX_TARGET_HP);
  const [timeLeftMs, setTimeLeftMs] = useState(ESCAPE_DURATION_MS);
  const [escaped, setEscaped] = useState(false);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [missFlash, setMissFlash] = useState(false);
  const [hitShake, setHitShake] = useState(false);
  const [victoryMsg, setVictoryMsg] = useState('');
  const [burstShards, setBurstShards] = useState([]);

  const timerRef = useRef(null);
  const moveRef = useRef(null);

  const clearArenaTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (moveRef.current) {
      clearInterval(moveRef.current);
      moveRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearArenaTimers();
  }, []);

  useEffect(() => {
    clearArenaTimers();
    if (activeEvent !== 'pinata' && activeEvent !== 'boss') return undefined;

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const rem = Math.max(0, ESCAPE_DURATION_MS - elapsed);
      setTimeLeftMs(rem);
      if (rem <= 0) {
        clearArenaTimers();
        setEscaped(true);
        sfx.playSadTrombone();
        setVictoryMsg(
          activeEvent === 'pinata'
            ? '🪅💨 TOO SLOW! The Piñata dodged away with the tokens! (Click directly on it 8x next time!)'
            : '🗿💨 GIGA-MOAI TELEPORTED AWAY! Too slow!'
        );
      }
    }, 100);

    moveRef.current = setInterval(() => {
      setTargetPos((prev) => randomArenaPos(prev));
    }, 680);

    return () => clearArenaTimers();
  }, [activeEvent]);

  const awardDailyEventXp = (amount, e, emoji) => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `tm_chaos_btn_xp_${today}`;
    const dailyCount = Number(localStorage.getItem(dailyKey) || 0);
    if (dailyCount < 3 && onEarnPetXp) {
      localStorage.setItem(dailyKey, String(dailyCount + 1));
      onEarnPetXp(amount, e, emoji);
    }
  };

  const spawnMiniShards = () => {
    const now = Date.now();
    const items = Array.from({ length: 8 }).map((_, idx) => ({
      id: `cs-${now}-${idx}`,
      dx: Math.round((Math.random() - 0.5) * 180),
      dy: Math.round((Math.random() - 0.5) * 150),
      emoji: ['🍬', '✨', '💎', '🔥', '🦆', '🍕', '🎱', '⚡'][idx % 8]
    }));
    setBurstShards(items);
    setTimeout(() => setBurstShards([]), 650);
  };

  const handlePressChaosButton = (e) => {
    const nextEvent = CHAOS_EVENTS[eventIdx % CHAOS_EVENTS.length];
    setEventIdx((i) => i + 1);
    setVictoryMsg('');
    setEscaped(false);
    setMissFlash(false);
    setHp(MAX_TARGET_HP);
    setTimeLeftMs(ESCAPE_DURATION_MS);
    setTargetPos(randomArenaPos());
    setActiveEvent(nextEvent);

    if (nextEvent === 'pinata') {
      sfx.playBoing(3);
    } else if (nextEvent === 'boss') {
      sfx.playAnimeShock();
    } else if (nextEvent === 'police') {
      sfx.playPoliceSiren();
      awardDailyEventXp(10, e, '🚔');
      setTimeout(() => {
        setActiveEvent((curr) => (curr === 'police' ? null : curr));
      }, 3800);
    } else if (nextEvent === 'jackpot') {
      sfx.playPinballBumper(0);
      spawnMiniShards();
      awardDailyEventXp(10, e, '🕹️');
      setTimeout(() => {
        setActiveEvent((curr) => (curr === 'jackpot' ? null : curr));
      }, 3800);
    }
  };

  const handleArenaMiss = () => {
    if (hp <= 0 || escaped) return;
    setMissFlash(true);
    sfx.playClownHonk();
    setTargetPos((prev) => randomArenaPos(prev));
    setTimeout(() => setMissFlash(false), 260);
  };

  const handleHitTarget = (e) => {
    e.stopPropagation();
    if (hp <= 0 || escaped) return;
    const nextHp = hp - 1;
    setHp(nextHp);
    setHitShake(true);
    setTimeout(() => setHitShake(false), 180);
    setTargetPos((prev) => randomArenaPos(prev));
    spawnMiniShards();

    if (activeEvent === 'pinata') {
      sfx.playMetalPipe();
    } else {
      sfx.playLaserZap();
    }

    if (nextHp <= 0) {
      clearArenaTimers();
      sfx.playJackpot();
      if (activeEvent === 'pinata') {
        const awardedTokens = onWinPinataReward ? onWinPinataReward(e) : 0;
        if (awardedTokens > 0) {
          setVictoryMsg(
            `🎉 DIRECT SMASH! You whacked the dodging Piñata 8x & won +${awardedTokens} 🪙 (+50 XP)!`
          );
        } else {
          awardDailyEventXp(20, e, '🪅');
          setVictoryMsg(
            '🪅 SMASHED! (+20 XP — Daily Piñata token prize already claimed today. Upload a meme for +45 🪙!)'
          );
        }
      } else {
        awardDailyEventXp(25, e, '🗿');
        setVictoryMsg('💥 GIGA-MOAI DEFEATED! +25 XP earned!');
      }
      setTimeout(() => {
        setActiveEvent(null);
        setVictoryMsg('');
      }, 3400);
    }
  };

  if (minimized) {
    return (
      <button
        type="button"
        className="tm-dank-pet-launcher"
        onClick={() => {
          sfx.playToggle();
          setMinimized(false);
        }}
        title="Restore the 🚨 DO NOT PRESS Chaos Button!"
      >
        <span>🚨</span>
        <span>Chaos Btn</span>
      </button>
    );
  }

  return (
    <>
      {/* INTERACTIVE DODGING PIÑATA & BOSS SKILL MINI-EVENTS */}
      {(activeEvent === 'pinata' || activeEvent === 'boss') && (
        <div className="tm-chaos-event-overlay" role="dialog" aria-label="Interactive Arcade Skill Event">
          <div className={`tm-chaos-event-card ${hitShake ? 'tm-shake' : ''}`}>
            <button
              type="button"
              className="tm-dank-pet-close"
              style={{ position: 'absolute', top: '10px', right: '10px' }}
              onClick={() => {
                clearArenaTimers();
                setActiveEvent(null);
              }}
              title="Close Mini-Event"
            >
              ✕
            </button>

            <div className="tm-chaos-event-tag">
              {activeEvent === 'pinata'
                ? pinataClaimedToday
                  ? '🪅 GOLDEN PIÑATA PRACTICE (XP ONLY TODAY)'
                  : '🪅 DODGING PIÑATA CHALLENGE (+5 🪙 IF SMASHED!)'
                : '🚨 DODGING BOSS ENCOUNTER (+25 XP)'}
            </div>

            <h3 style={{ margin: '4px 0 6px', fontSize: '16px', color: '#facc15' }}>
              {activeEvent === 'pinata'
                ? 'CLICK THE MOVING PIÑATA 8X BEFORE IT ESCAPES!'
                : 'ZAP MOVING GIGA-MOAI 8X BEFORE ESCAPE!'}
            </h3>

            {/* Dual Status: HP + Escape Countdown */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                fontWeight: 800,
                marginBottom: '4px',
                color: timeLeftMs < 2200 ? '#f43f5e' : '#38bdf8'
              }}
            >
              <span>❤️ HP: {hp}/{MAX_TARGET_HP} HITS</span>
              <span>⏱️ ESCAPE IN: {(timeLeftMs / 1000).toFixed(1)}s</span>
            </div>

            <div className="tm-xp-track" style={{ height: '8px', marginBottom: '10px' }}>
              <div
                className="tm-xp-bar"
                style={{
                  width: `${(timeLeftMs / ESCAPE_DURATION_MS) * 100}%`,
                  background:
                    timeLeftMs < 2200
                      ? 'linear-gradient(90deg, #ef4444, #f43f5e)'
                      : 'linear-gradient(90deg, #00f3ff, #facc15, #ec4899)'
                }}
              />
            </div>

            {/* Dodging Arena Surface — must physically click the moving target! */}
            <div
              onClick={handleArenaMiss}
              style={{
                position: 'relative',
                width: '100%',
                height: '195px',
                borderRadius: '14px',
                background: missFlash
                  ? 'rgba(239, 68, 68, 0.22)'
                  : 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.22), rgba(7,6,20,0.92))',
                border: missFlash
                  ? '2px solid #ef4444'
                  : '1.5px solid rgba(0, 243, 255, 0.45)',
                overflow: 'hidden',
                cursor: 'crosshair',
                userSelect: 'none',
                touchAction: 'manipulation'
              }}
            >
              {missFlash && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: 900,
                    color: '#fca5a5',
                    pointerEvents: 'none'
                  }}
                >
                  💨 MISSED! CLICK DIRECTLY ON THE TARGET!
                </span>
              )}

              {burstShards.map((sh) => (
                <span
                  key={sh.id}
                  className="tm-crush-candy-shard"
                  style={{
                    top: `${targetPos.y}%`,
                    left: `${targetPos.x}%`,
                    '--dx': `${sh.dx}px`,
                    '--dy': `${sh.dy}px`
                  }}
                >
                  {sh.emoji}
                </span>
              ))}

              {!escaped && hp > 0 && (
                <button
                  type="button"
                  onClick={handleHitTarget}
                  style={{
                    position: 'absolute',
                    top: `${targetPos.y}%`,
                    left: `${targetPos.x}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    border: '2px solid #facc15',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.35), rgba(236,72,153,0.45))',
                    boxShadow: '0 0 18px rgba(250, 204, 21, 0.55)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'top 0.16s ease-out, left 0.16s ease-out',
                    padding: 0
                  }}
                  title="WHACK!"
                >
                  <span style={{ fontSize: '34px', lineHeight: 1 }}>
                    {activeEvent === 'pinata' ? '🪅' : '🗿'}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>
                    WHACK!
                  </span>
                </button>
              )}

              {(hp <= 0 || escaped) && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '44px' }}>{hp <= 0 ? '💥🏆💥' : '💨🪅'}</span>
                </div>
              )}
            </div>

            {victoryMsg && (
              <div
                style={{
                  color: escaped ? '#fda4af' : '#4ade80',
                  fontWeight: 900,
                  fontSize: '12.5px',
                  marginTop: '10px',
                  lineHeight: 1.4
                }}
              >
                {victoryMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DANK POLICE SIREN & VIBE CHECK BANNER (VISUAL + XP ONLY, 0 TOKENS) */}
      {activeEvent === 'police' && (
        <div
          className="tm-police-siren-banner"
          onClick={() => setActiveEvent(null)}
          role="status"
        >
          <span>
            🚨🚔 <strong>WEE-WOO! MEME POLICE AUDIT:</strong> Verdict:{' '}
            <strong style={{ color: '#4ade80' }}>80s NEON CERTIFIED!</strong> (Upload memes to earn +45 🪙!)
          </span>
        </div>
      )}

      {/* ARCADE HYPE BANNER (VISUAL + XP ONLY, 0 TOKENS) */}
      {activeEvent === 'jackpot' && (
        <div
          className="tm-police-siren-banner"
          style={{ borderColor: '#facc15' }}
          onClick={() => setActiveEvent(null)}
          role="status"
        >
          <span>
            🎰📈🍬 <strong>80s CYBER-ARCADE LOUNGE OPEN!</strong> Wager your meme tokens on One-Arm
            Bandit, Meme Stocks, Crush &amp; Pinball!
          </span>
          {onSelectViewMode && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEvent(null);
                  onSelectViewMode('stocks');
                }}
              >
                📈 Meme Stocks
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEvent(null);
                  onSelectViewMode('slots');
                }}
              >
                🎰 Slots
              </button>
            </div>
          )}
        </div>
      )}

      {/* CORNER BIG RED "DO NOT PRESS" CHAOS BUTTON */}
      <div className="tm-donotpress-dock">
        <button
          type="button"
          className="tm-donotpress-btn"
          onClick={handlePressChaosButton}
          title="Trigger a dodging Meme Piñata challenge, Boss Fight, or 80s Arcade Alert!"
        >
          <span className="tm-donotpress-led">🚨</span>
          <span>DO NOT PRESS</span>
        </button>
        <button
          type="button"
          className="tm-donotpress-hide"
          onClick={() => setMinimized(true)}
          title="Minimize button"
        >
          ✕
        </button>
      </div>
    </>
  );
}
