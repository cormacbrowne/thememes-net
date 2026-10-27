import { useState } from 'react';
import { sfx } from '../utils/soundEngine';

const CHAOS_EVENTS = ['pinata', 'boss', 'police', 'jackpot'];

export default function DankPetWidget({ onEarnPetXp, onSelectViewMode }) {
  const [minimized, setMinimized] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null); // null | 'pinata' | 'boss' | 'police' | 'jackpot'
  const [hp, setHp] = useState(5);
  const [hitShake, setHitShake] = useState(false);
  const [victoryMsg, setVictoryMsg] = useState('');
  const [burstShards, setBurstShards] = useState([]);

  const awardDailyEventXp = (amount, e, emoji) => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `tm_chaos_btn_xp_${today}`;
    const dailyCount = Number(localStorage.getItem(dailyKey) || 0);
    if (dailyCount < 4 && onEarnPetXp) {
      localStorage.setItem(dailyKey, String(dailyCount + 1));
      onEarnPetXp(amount, e, emoji);
    }
  };

  const spawnMiniShards = () => {
    const now = Date.now();
    const items = Array.from({ length: 10 }).map((_, idx) => ({
      id: `cs-${now}-${idx}`,
      dx: Math.round((Math.random() - 0.5) * 220),
      dy: Math.round((Math.random() - 0.5) * 180),
      emoji: ['🍬', '🪙', '💎', '🔥', '🦆', '🍕', '🎱', '⚡'][idx % 8]
    }));
    setBurstShards(items);
    setTimeout(() => setBurstShards([]), 750);
  };

  const handlePressChaosButton = (e) => {
    const nextEvent = CHAOS_EVENTS[eventIdx % CHAOS_EVENTS.length];
    setEventIdx((i) => i + 1);
    setVictoryMsg('');
    setActiveEvent(nextEvent);

    if (nextEvent === 'pinata') {
      setHp(5);
      sfx.playBoing(3);
    } else if (nextEvent === 'boss') {
      setHp(5);
      sfx.playAnimeShock();
    } else if (nextEvent === 'police') {
      sfx.playPoliceSiren();
      awardDailyEventXp(20, e, '🚔');
      setTimeout(() => {
        setActiveEvent((curr) => (curr === 'police' ? null : curr));
      }, 4200);
    } else if (nextEvent === 'jackpot') {
      sfx.playJackpot();
      setTimeout(() => sfx.playPinballBumper(0), 160);
      spawnMiniShards();
      awardDailyEventXp(20, e, '🎱');
      setTimeout(() => {
        setActiveEvent((curr) => (curr === 'jackpot' ? null : curr));
      }, 4500);
    }
  };

  const handleHitTarget = (e) => {
    if (hp <= 0) return;
    const nextHp = hp - 1;
    setHp(nextHp);
    setHitShake(true);
    setTimeout(() => setHitShake(false), 220);
    spawnMiniShards();

    if (activeEvent === 'pinata') {
      sfx.playMetalPipe();
    } else {
      sfx.playLaserZap();
      setTimeout(() => sfx.playVineBoom(), 60);
    }

    if (nextHp <= 0) {
      sfx.playJackpot();
      setTimeout(() => sfx.playDamageGong(), 150);
      awardDailyEventXp(30, e, activeEvent === 'pinata' ? '🪅' : '🗿');
      setVictoryMsg(
        activeEvent === 'pinata'
          ? '🎉 PIÑATA OBLITERATED! +30 XP & CANDY SHOWER!'
          : '💥 EMOTIONAL DAMAGE! GIGA-MOAI DEFEATED (+30 XP)!'
      );
      setTimeout(() => {
        setActiveEvent(null);
        setVictoryMsg('');
      }, 3200);
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
      {/* INTERACTIVE SCREEN-WIDE MINI-EVENTS */}
      {(activeEvent === 'pinata' || activeEvent === 'boss') && (
        <div className="tm-chaos-event-overlay" role="dialog" aria-label="Interactive Arcade Mini-Event">
          <div className={`tm-chaos-event-card ${hitShake ? 'tm-shake' : ''}`}>
            <button
              type="button"
              className="tm-dank-pet-close"
              style={{ position: 'absolute', top: '10px', right: '10px' }}
              onClick={() => setActiveEvent(null)}
              title="Close Mini-Event"
            >
              ✕
            </button>

            <div className="tm-chaos-event-tag">
              {activeEvent === 'pinata'
                ? '🪅 SUDDEN MEME PIÑATA DROP!'
                : '🚨 SUDDEN BOSS ENCOUNTER!'}
            </div>

            <h3 style={{ margin: '4px 0 8px', fontSize: '18px', color: '#facc15' }}>
              {activeEvent === 'pinata'
                ? 'WHACK THE GOLDEN LLAMA PIÑATA!'
                : '🗿 GIGA-MOAI, CEO OF BRAINROT'}
            </h3>

            {/* Boss / Pinata Health Bar */}
            <div className="tm-xp-track" style={{ height: '12px', marginBottom: '12px' }}>
              <div
                className="tm-xp-bar"
                style={{
                  width: `${(hp / 5) * 100}%`,
                  background:
                    activeEvent === 'pinata'
                      ? 'linear-gradient(90deg, #4ade80, #facc15, #ec4899)'
                      : 'linear-gradient(90deg, #ef4444, #f97316, #facc15)'
                }}
              />
            </div>

            <div style={{ position: 'relative', margin: '10px 0' }}>
              {burstShards.map((sh) => (
                <span
                  key={sh.id}
                  className="tm-crush-candy-shard"
                  style={{
                    top: '50%',
                    left: '50%',
                    '--dx': `${sh.dx}px`,
                    '--dy': `${sh.dy}px`
                  }}
                >
                  {sh.emoji}
                </span>
              ))}

              <button
                type="button"
                className={`tm-chaos-target-btn ${hitShake ? 'hit' : ''}`}
                onClick={handleHitTarget}
                disabled={hp <= 0}
              >
                <span style={{ fontSize: '58px', display: 'block' }}>
                  {hp <= 0 ? '💥🏆💥' : activeEvent === 'pinata' ? '🪅🦄' : '🗿👑'}
                </span>
                <span className="tm-chaos-target-cta">
                  {hp <= 0
                    ? 'SMASHED!'
                    : activeEvent === 'pinata'
                    ? `🔨 TAP TO WHACK! (${hp} HITS LEFT)`
                    : `⚡ FIRE LASER! (${hp * 100} HP LEFT)`}
                </span>
              </button>
            </div>

            {victoryMsg && (
              <div style={{ color: '#4ade80', fontWeight: 900, fontSize: '13px', marginTop: '8px' }}>
                {victoryMsg}
              </div>
            )}

            {onSelectViewMode && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="tm-btn tm-btn-primary"
                  onClick={() => {
                    setActiveEvent(null);
                    onSelectViewMode(activeEvent === 'pinata' ? 'crush' : 'pinball');
                  }}
                >
                  {activeEvent === 'pinata'
                    ? '🍬 Play Meme Crush Saga!'
                    : '🎱 Play Las Vegas Pinball!'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DANK POLICE SIREN & VIBE CHECK BANNER */}
      {activeEvent === 'police' && (
        <div
          className="tm-police-siren-banner"
          onClick={() => setActiveEvent(null)}
          role="status"
        >
          <span>
            🚨🚔 <strong>WEE-WOO! OFFICIAL MEME POLICE VIBE AUDIT:</strong> Scanning browser...
            Verdict: <strong style={{ color: '#4ade80' }}>100% CERTIFIED DANK LEGEND! (+20 XP)</strong>
          </span>
          {onSelectViewMode && (
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveEvent(null);
                onSelectViewMode('pinball');
              }}
            >
              🎱 Escape to Vegas Pinball!
            </button>
          )}
        </div>
      )}

      {/* VEGAS PINBALL & CANDY JACKPOT SHOWER BANNER */}
      {activeEvent === 'jackpot' && (
        <div
          className="tm-police-siren-banner"
          style={{ borderColor: '#facc15' }}
          onClick={() => setActiveEvent(null)}
          role="status"
        >
          <span>
            🎰🎱🍬 <strong>VEGAS ARCADE FEVER ACTIVATED! (+20 XP)</strong> Multiball &amp; Turbo Candy
            Rewards are LIVE!
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
                  onSelectViewMode('crush');
                }}
              >
                🍬 Meme Crush
              </button>
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEvent(null);
                  onSelectViewMode('pinball');
                }}
              >
                🎱 Vegas Pinball
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
          title="Trigger a random interactive Meme Piñata, Boss Fight, Dank Police Audit, or Arcade Fever!"
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
