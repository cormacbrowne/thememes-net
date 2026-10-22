import { useState } from 'react';
import { SOUND_PACKS, SOUNDBOARD_PADS } from '../utils/soundEngine';

export default function MemeSoundboardBar({
  soundPack,
  onChangeSoundPack,
  soundOn,
  onToggleSound,
  onPlayPad,
  onTriggerChaosRoulette,
  onOpenRewards,
  unclaimedRewardsCount,
  onToggleBossKey
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
            🎹 <span>CRAZY SOUNDBOARD & CHAOS BAR</span>
            <span className="tm-soundboard-chevron">{isExpanded ? '▾' : '▸'}</span>
          </button>

          <div className="tm-pack-pills">
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

          <button
            type="button"
            className="tm-chaos-btn tm-chaos-rewards-btn"
            onClick={onOpenRewards}
            title="Spin the Wheel of Chaos, claim Daily Streak & complete Quests!"
          >
            🎰 Loot & Quests
            {unclaimedRewardsCount > 0 && (
              <span className="tm-reward-alert-dot">{unclaimedRewardsCount}</span>
            )}
          </button>

          <button
            type="button"
            className="tm-chaos-btn tm-boss-key-btn"
            onClick={onToggleBossKey}
            title="Panic Button! Disguise screen as a boring corporate Excel spreadsheet (Shortcut: B)"
          >
            💼 Boss Key
          </button>
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
              🔇 Audio Muted — Tap to Unmute iPhone / Speaker SFX!
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
