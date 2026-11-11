import { useState, useEffect, useRef } from 'react';
import { sfx } from '../utils/soundEngine';
import './DankPetWidget.css';

const CHAOS_EVENTS = ['pinata', 'boss', 'ufo', 'police', 'jackpot'];
const MAX_TARGET_HP = 8;
const ESCAPE_DURATION_MS = 7200;

const CHEEKY_BUTTON_LABELS = [
  'DO NOT PRESS',
  'I SAID DO NOT!',
  'STILL PRESSING?!',
  'ABSOLUTE MADLAD!',
  'WAIT STOP IT! 💀'
];

const PAYPHONE_DIRECTORY = [
  {
    code: '555-GECKO',
    label: '📈 555-GECKO (Wall St Tip)',
    msg: '☎️ GECKO-FROG: "Greed is good, kid! Load up on $STONK & $DOGE before the short squeeze hits MEMEDAQ \'86!" (+25 XP)'
  },
  {
    code: '555-PIZZA',
    label: '🍕 555-PIZZA (Pizza Rain!)',
    msg: '☎️ RADICAL PIZZA CO.: "30-second orbital pepperoni drop incoming to your screen right now!" (+20 XP)'
  },
  {
    code: '555-BOSS',
    label: '💼 555-BOSS (CEO Panic Key)',
    msg: '☎️ CORPORATE RECEPTION: "Alert! The CEO is walking past your desk! Engaging Enterprise Spreadsheet Camouflage!"'
  },
  {
    code: '555-RAVE',
    label: '🕺 555-RAVE (Synth Rave FX)',
    msg: '☎️ DJ SYNTH-86: "Dropping 1986 neon laser overdrive across the entire arcade! (Tap again to clear)" (+20 XP)'
  },
  {
    code: '555-UFO86',
    label: '🛸 555-UFO86 (Area 51 Beam)',
    msg: '☎️ AREA 51 BUNKER: "Wait—how did you get this number?! UFO tractor beam locked onto your coordinates!"'
  },
  {
    code: '555-ORACLE',
    label: '🔮 555-ORACLE (80s Fortune)',
    msg: '☎️ CYBER-ORACLE \'86: "Your next meme upload will go platinum, and Triple 777s await your next pull!" (+25 XP)'
  }
];

function playDtmfTone(digit) {
  if (!sfx.enabled || !sfx.hasUserGesture) return;
  try {
    sfx.init();
    const ctx = sfx.ctx;
    if (!ctx) return;
    const dtmfMap = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477]
    };
    const freqs = dtmfMap[String(digit)] || [770, 1336];
    const now = ctx.currentTime;
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  } catch {
    // Ignore audio context restriction
  }
}

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
  onClaimPayphoneCoinReturn,
  payphoneClaimedToday = false,
  onTriggerBossMode,
  onLaunchStampede,
  onChangeChaosMutator,
  memes = [],
  onSelectViewMode,
  viewMode = 'feed',
  unlocked = false,
  externalPayphoneOpen = false,
  onToggleExternalPayphone = null
}) {
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024;
  });
  const [eventIdx, setEventIdx] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null); // null | 'pinata' | 'boss' | 'ufo' | 'police' | 'jackpot'
  const [internalPayphoneOpen, setInternalPayphoneOpen] = useState(false);
  const showPayphone = internalPayphoneOpen || Boolean(externalPayphoneOpen);
  const setShowPayphone = (val) => {
    setInternalPayphoneOpen(Boolean(val));
    if (onToggleExternalPayphone) onToggleExternalPayphone(Boolean(val));
  };
  const [dialedDigits, setDialedDigits] = useState('1-800-MEME');
  const [payphoneLineMsg, setPayphoneLineMsg] = useState(
    '📟 INSERT DIME OR TAP SCRATCHED BOOTH GRAFFITI BELOW TO DIAL SECRET 1986 HOTLINES!'
  );
  const [raveActive, setRaveActive] = useState(false);
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
    if (activeEvent !== 'pinata' && activeEvent !== 'boss' && activeEvent !== 'ufo') return undefined;

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
            : activeEvent === 'ufo'
            ? '🛸💨 AREA 51 SAUCER WARPED INTO HYPERSPACE! Too slow!'
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
    if (dailyCount < 6 && onEarnPetXp) {
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
    } else if (nextEvent === 'ufo') {
      sfx.playAlienBeam();
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

  const handlePressKeypadDigit = (digit) => {
    playDtmfTone(digit);
    setDialedDigits((prev) => {
      const clean = prev === '1-800-MEME' ? '' : prev;
      return (clean + digit).slice(-12);
    });
  };

  const handleDialSpeedNumber = (entry, e) => {
    // Play rapid 3-tone dial sequence
    playDtmfTone('5');
    setTimeout(() => playDtmfTone('8'), 95);
    setTimeout(() => playDtmfTone('#'), 190);

    setDialedDigits(entry.code);
    setPayphoneLineMsg(entry.msg);

    if (entry.code === '555-GECKO') {
      sfx.playStockBell?.(true);
      awardDailyEventXp(25, e, '📈');
    } else if (entry.code === '555-PIZZA') {
      sfx.playAirhorn();
      awardDailyEventXp(20, e, '🍕');
      if (onLaunchStampede) onLaunchStampede('pizza-rain', e);
    } else if (entry.code === '555-BOSS') {
      sfx.playToggle();
      setTimeout(() => {
        setShowPayphone(false);
        if (onTriggerBossMode) onTriggerBossMode();
      }, 550);
    } else if (entry.code === '555-RAVE') {
      const nextRave = !raveActive;
      setRaveActive(nextRave);
      awardDailyEventXp(20, e, '🕺');
      if (onChangeChaosMutator) {
        onChangeChaosMutator(nextRave ? 'rave' : 'none', e);
      }
    } else if (entry.code === '555-UFO86') {
      sfx.playAlienBeam();
      setShowPayphone(false);
      setVictoryMsg('');
      setEscaped(false);
      setMissFlash(false);
      setHp(MAX_TARGET_HP);
      setTimeLeftMs(ESCAPE_DURATION_MS);
      setTargetPos(randomArenaPos());
      setActiveEvent('ufo');
    } else if (entry.code === '555-ORACLE') {
      sfx.playLevelUp();
      awardDailyEventXp(25, e, '🔮');
    }
  };

  const handleFlickCoinReturn = (e) => {
    if (payphoneClaimedToday) {
      sfx.playMetalPipe();
      setPayphoneLineMsg(
        '🪙 *CLINK!* Coin return flap is empty right now — check back tomorrow for more forgotten arcade quarters!'
      );
      return;
    }
    sfx.playJackpot();
    const tokensWon = onClaimPayphoneCoinReturn ? onClaimPayphoneCoinReturn(e) : 5;
    setPayphoneLineMsg(
      `🎉 *CHA-CHING!* Two forgotten 1986 arcade quarters tumbled out of the Coin Return Flap! (+${tokensWon || 5} 🪙 Tokens & +50 XP!)`
    );
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
    } else if (activeEvent === 'ufo') {
      sfx.playAlienBeam();
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
      } else if (activeEvent === 'ufo') {
        awardDailyEventXp(25, e, '🛸');
        setVictoryMsg('🛸 AREA 51 SAUCER CAPTURED! +25 XP earned!');
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

  const isFeedMode = viewMode === 'feed';

  if (minimized && !showPayphone && !activeEvent) {
    if (!isFeedMode || (typeof window !== 'undefined' && window.innerWidth <= 1024)) {
      return null;
    }
    return (
      <button
        type="button"
        className="tm-dank-pet-launcher"
        onClick={() => {
          sfx.playToggle();
          setMinimized(false);
        }}
        title="Restore the 🚨 DO NOT PRESS Button & 1986 Payphone!"
      >
        <span>🚨☎️</span>
        <span>Chaos</span>
      </button>
    );
  }

  const buttonCaption = CHEEKY_BUTTON_LABELS[eventIdx % CHEEKY_BUTTON_LABELS.length];

  return (
    <>
      {/* 1986 NEON ARCADE PAYPHONE & HACKER HOTLINE MODAL */}
      {showPayphone && (
        <div
          className="tm-chaos-event-overlay"
          role="dialog"
          aria-label="1986 Neon Arcade Payphone Hotline"
          onClick={() => setShowPayphone(false)}
        >
          <div
            className="tm-payphone-booth-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tm-payphone-header">
              <div>
                <div className="tm-payphone-eyebrow">☎️ BELL CYBER-BOOTH • 1986 COIN-OP LINE</div>
                <h3 className="tm-payphone-title">1-800-MEME-86 SECRET HOTLINE</h3>
              </div>
              <button
                type="button"
                className="tm-dank-pet-close"
                onClick={() => setShowPayphone(false)}
                title="Hang up Payphone"
              >
                ✕
              </button>
            </div>

            {/* VFD Digital Caller Display */}
            <div className="tm-payphone-vfd">
              <div className="tm-payphone-vfd-num">DIALED: {dialedDigits}</div>
              <div className="tm-payphone-vfd-msg">{payphoneLineMsg}</div>
              {dialedDigits === '555-GECKO' && onSelectViewMode && (
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  style={{ marginTop: '6px', padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => {
                    setShowPayphone(false);
                    onSelectViewMode('stocks');
                  }}
                >
                  📈 Open MEMEDAQ &apos;86 Now
                </button>
              )}
            </div>

            <div className="tm-payphone-body-grid">
              {/* 12-Button Touch-Tone DTMF Musical Keypad */}
              <div className="tm-payphone-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="tm-payphone-key"
                    onClick={() => handlePressKeypadDigit(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Scratched Booth Graffiti Speed-Dial Numbers */}
              <div className="tm-payphone-graffiti">
                <div className="tm-payphone-graffiti-title">
                  ✏️ SCRATCHED ON BOOTH WALL (TAP TO DIAL):
                </div>
                <div className="tm-payphone-graffiti-list">
                  {PAYPHONE_DIRECTORY.map((entry) => (
                    <button
                      key={entry.code}
                      type="button"
                      className={`tm-payphone-speed-btn ${
                        dialedDigits === entry.code ? 'active' : ''
                      }`}
                      onClick={(e) => handleDialSpeedNumber(entry, e)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tactile Chrome Coin Return Flap */}
            <div className="tm-payphone-coin-return-bar">
              <button
                type="button"
                className={`tm-payphone-coin-flap-btn ${
                  payphoneClaimedToday ? 'claimed' : 'unclaimed'
                }`}
                onClick={handleFlickCoinReturn}
              >
                {payphoneClaimedToday
                  ? '🪙 Coin Return Flap Checked Today (Empty)'
                  : '🪙 Flick Coin Return Flap (+5 🪙 Forgotten Quarters & +50 XP!)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE DODGING PIÑATA, BOSS & UFO SKILL MINI-EVENTS */}
      {(activeEvent === 'pinata' || activeEvent === 'boss' || activeEvent === 'ufo') && (
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
                : activeEvent === 'ufo'
                ? '🛸 AREA 51 UFO INTERCEPTION (+25 XP)'
                : '🚨 DODGING BOSS ENCOUNTER (+25 XP)'}
            </div>

            <h3 style={{ margin: '4px 0 6px', fontSize: '16px', color: '#facc15' }}>
              {activeEvent === 'pinata'
                ? 'CLICK THE MOVING PIÑATA 8X BEFORE IT ESCAPES!'
                : activeEvent === 'ufo'
                ? 'ZAP THE TELEPORTING ALIEN SAUCER 8X BEFORE HYPERSPACE!'
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
                    {activeEvent === 'pinata' ? '🪅' : activeEvent === 'ufo' ? '🛸' : '🗿'}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff' }}>
                    {activeEvent === 'ufo' ? 'ZAP!' : 'WHACK!'}
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

      {/* CORNER BIG RED "DO NOT PRESS" CHAOS BUTTON + 1986 NEON PAYPHONE HOTLINE (PROGRESSIVELY UNLOCKED ON FEED VIEW) */}
      {unlocked && isFeedMode && !minimized && (
        <div className="tm-donotpress-dock">
          <button
            type="button"
            className="tm-payphone-dock-btn"
            onClick={() => {
              playDtmfTone('5');
              setShowPayphone(true);
            }}
            title="Open the 1986 Neon Arcade Payphone & Secret Hotline (Check Coin Return Slot for +5 🪙!)"
          >
            <span>☎️</span>
            <span className="tm-hide-mobile">1-800-MEME</span>
            {!payphoneClaimedToday && <span className="tm-payphone-coin-dot" title="Unclaimed quarters in Coin Return!" />}
          </button>

          <button
            type="button"
            className="tm-donotpress-btn"
            onClick={handlePressChaosButton}
            title={memes && memes.length > 0 ? `Latest Feed Drop: "${memes[0].title}" by @${memes[0].author_name}` : 'Trigger a dodging Meme Piñata challenge, Boss Fight, UFO or 80s Arcade Alert!'}
          >
            <span className="tm-donotpress-led">🚨</span>
            <span>{buttonCaption}</span>
          </button>
          <button
            type="button"
            className="tm-donotpress-hide"
            onClick={() => setMinimized(true)}
            title="Minimize dock"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
