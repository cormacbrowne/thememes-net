import { useState } from 'react';
import { SOUND_PACKS, SOUNDBOARD_PADS } from '../utils/soundEngine';
import {
  CHAOS_MUTATORS,
  SILLY_STAMPEDES,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from '../data/starterMemes';

export default function MemeSoundboardBar({
  soundPack,
  onChangeSoundPack,
  soundOn,
  onToggleSound,
  onPlayPad,
  onTriggerChaosRoulette,
  onOpenRewards,
  unclaimedRewardsCount,
  onToggleBossKey,
  chaosMutator,
  onChangeChaosMutator,
  onSummonGoblin,
  goblinsLeftInWindow = ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW,
  goblinResetMs = 0,
  onLaunchStampede
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tm_soundboard_open') === 'true';
  });
  const [activePadId, setActivePadId] = useState(null);

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem('tm_soundboard_open', String(next));
      return next;
    });
  };

  const handlePadClick = (pad, e) => {
    setActivePadId(pad.id);
    if (onPlayPad) onPlayPad(pad, e);
    setTimeout(() => setActivePadId(null), 220);
  };

  return (
    <section className="tm-soundboard-shell" aria-label="Crazy Meme Soundboard and Chaos Toys">
      <div className="tm-soundboard-header">
        <div className="tm-soundboard-title-group">
          <button
            type="button"
            className="tm-soundboard-toggle-btn"
            onClick={toggleExpanded}
            title={isExpanded ? 'Collapse Soundboard & Chaos Deck' : 'Expand 16-Pad Soundboard, Reality FX & Toys'}
          >
            🎹 <span>{isExpanded ? 'HIDE ARCADE TOYS' : '16-PAD SOUNDBOARD & TOYS'}</span>
            <span className="tm-soundboard-chevron">{isExpanded ? '▴' : '▾'}</span>
          </button>

          {isExpanded && (
            <div className="tm-pack-pills" role="group" aria-label="Sound Effect Packs">
              {SOUND_PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`tm-pack-pill ${soundPack === p.id ? 'active' : ''}`}
                  onClick={(e) => onChangeSoundPack(p.id, e)}
                  title={`Switch all site sound effects to ${p.label}`}
                >
                  {p.short}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tm-chaos-actions">
          <button
            type="button"
            className="tm-chaos-btn tm-chaos-roulette-btn"
            onClick={onTriggerChaosRoulette}
            title="Generate an unhinged random meme with deep-fried filters & goofy sounds!"
          >
            🎲 Chaos Roulette
          </button>

          {onSummonGoblin && (
            <button
              type="button"
              className="tm-chaos-btn tm-goblin-summon-btn"
              disabled={goblinsLeftInWindow <= 0}
              onClick={onSummonGoblin}
              title={
                goblinsLeftInWindow > 0
                  ? `Summon a roaming Golden Loot Goblin (${goblinsLeftInWindow}/${ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW} left in 30m window)`
                  : `Goblin window limit reached — resets in ${formatWindowCountdown(goblinResetMs)}`
              }
            >
              {goblinsLeftInWindow > 0
                ? `👾 Goblin (${goblinsLeftInWindow}/${ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW})`
                : `⏳ Goblin (${formatWindowCountdown(goblinResetMs)})`}
            </button>
          )}

          <button
            type="button"
            className="tm-chaos-btn tm-chaos-rewards-btn"
            onClick={onOpenRewards}
            title="Spin the Wheel of Chaos, play Brainrot Slots & complete Quests!"
          >
            🎰 Vault &amp; Slots
            {unclaimedRewardsCount > 0 && (
              <span className="tm-reward-alert-dot">{unclaimedRewardsCount}</span>
            )}
          </button>

          <button
            type="button"
            className="tm-chaos-btn tm-boss-key-btn"
            onClick={onToggleBossKey}
            title="Panic Button! 6 Disguises: Excel, Terminal, Zoom, Enterprise AI, OS Update & BSOD (Shortcut: Shift+B)"
          >
            💼 Boss Key (6 Tabs)
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* LIVE SCREEN REALITY MUTATORS BAR */}
          <div className="tm-mutator-strip">
            <span className="tm-mutator-label">🌪️ REALITY FX:</span>
            <div className="tm-mutator-pills">
              {CHAOS_MUTATORS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`tm-mutator-pill ${chaosMutator === m.id ? 'active' : ''}`}
                  onClick={(e) => onChangeChaosMutator && onChangeChaosMutator(m.id, e)}
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* PHASE 18: SILLY ANIMATED SCREEN STAMPEDES & DOPAMINE TOYS LAUNCHER */}
          <div className="tm-mutator-strip tm-stampede-strip">
            <span className="tm-mutator-label" style={{ color: '#facc15' }}>
              🎪 SILLY STAMPEDES:
            </span>
            <div className="tm-mutator-pills">
              {SILLY_STAMPEDES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="tm-mutator-pill tm-stampede-pill"
                  onClick={(e) => onLaunchStampede && onLaunchStampede(s.id, e)}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tm-soundboard-pads-row">
            {!soundOn && (
              <button
                type="button"
                className="tm-ios-unlock-pill"
                onClick={onToggleSound}
              >
                🔇 Audio Muted — Tap to Unmute iPhone / iPad / Speaker SFX!
              </button>
            )}
            {SOUNDBOARD_PADS.map((pad) => (
              <button
                key={pad.id}
                type="button"
                className={`tm-sound-pad ${activePadId === pad.id ? 'pressed' : ''}`}
                style={{ '--pad-color': pad.color }}
                onClick={(e) => handlePadClick(pad, e)}
              >
                <span className="tm-sound-pad-emoji">{pad.emoji}</span>
                <span className="tm-sound-pad-label">{pad.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
