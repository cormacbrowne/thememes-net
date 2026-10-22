import { useState } from 'react';
import { SOUND_PACKS, SOUNDBOARD_PADS } from '../utils/soundEngine';
import { CHAOS_MUTATORS } from '../data/starterMemes';

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
  onSummonGoblin
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePadId, setActivePadId] = useState(null);

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
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse Soundboard' : 'Expand Crazy Soundboard'}
          >
            🎹 <span>CRAZY SOUNDBOARD &amp; CHAOS DECK</span>
            <span className="tm-soundboard-chevron">{isExpanded ? '▾' : '▸'}</span>
          </button>

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
              onClick={onSummonGoblin}
              title="Summon a roaming Golden Loot Goblin for +300 XP & Free Spins!"
            >
              👾 Loot Goblin
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
            title="Panic Button! 4 Disguises: Excel, Terminal, Zoom & OS Update (Shortcut: Shift+B)"
          >
            💼 Boss Key
          </button>
        </div>
      </div>

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

      {isExpanded && (
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
      )}
    </section>
  );
}
