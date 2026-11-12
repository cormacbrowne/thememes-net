import MemeSoundboardBar from './MemeSoundboardBar';
import MemesRadio from './MemesRadio';
import SettingsSheet from './SettingsSheet';

export default function ExtrasDrawerModal({
  isOpen,
  onClose,
  focusSection = null,
  onLaunchWtfSurprise,
  onOpenPayphone,
  onToggleBossKey,
  soundOn,
  onToggleSound,
  soundPack,
  onChangeSoundPack,
  onPlayPad,
  onTriggerChaosRoulette,
  onOpenRewards,
  unclaimedRewardsCount,
  chaosMutator,
  onChangeChaosMutator,
  onSummonGoblin,
  goblinsLeftInWindow,
  goblinResetMs,
  onLaunchStampede,
  activeDeviceMeta,
  deviceOverride,
  onOpenDeviceOptimizer,
  onCheckSecurityStatus,
  onToggleAiAssistant,
  aiPersonaId,
  onOpenLeaderboard,
  onRandomMeme,
  savedOnly,
  savedIdsCount,
  onToggleSavedFilter
}) {
  if (!isOpen) return null;

  const isSoundboardFocused = focusSection === 'soundboard';

  const soundboardSection = (
    <div className="tm-extras-section">
      {isSoundboardFocused && (
        <>
          <div className="tm-extras-section-label">🎹 VINE BOOM &amp; 16-PAD COMEDY SOUNDBOARD</div>
          <p className="tm-extras-soundboard-lead">
            Tap any pad below for instant Vine Boom, MLG Airhorn, Clown Honk, Sad Trombone &amp; more — works offline and on iPhone even with the Mute Switch ON!
          </p>
        </>
      )}
      <MemeSoundboardBar
        defaultExpanded={true}
        soundPack={soundPack}
        onChangeSoundPack={onChangeSoundPack}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onPlayPad={onPlayPad}
        onTriggerChaosRoulette={onTriggerChaosRoulette}
        onOpenRewards={() => {
          onClose();
          if (onOpenRewards) onOpenRewards();
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        onToggleBossKey={() => {
          onClose();
          if (onToggleBossKey) onToggleBossKey();
        }}
        chaosMutator={chaosMutator}
        onChangeChaosMutator={onChangeChaosMutator}
        onSummonGoblin={onSummonGoblin}
        goblinsLeftInWindow={goblinsLeftInWindow}
        goblinResetMs={goblinResetMs}
        onLaunchStampede={onLaunchStampede}
      />
    </div>
  );

  return (
    <div
      className="tm-modal-backdrop tm-extras-drawer-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isSoundboardFocused ? 'Vine Boom & 16-Pad Meme Soundboard' : 'Extras, Toys, Soundboard and Display Settings'}
    >
      <div
        className="tm-modal-card tm-extras-drawer-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tm-extras-drawer-header">
          <div>
            <span className="tm-extras-drawer-kicker">
              {isSoundboardFocused ? '🎹 INSTANT WEB AUDIO SOUNDBOARD' : '🕹️ ARCADE TOYBOX & SYSTEM CONTROLS'}
            </span>
            <h2 className="tm-extras-drawer-title">
              {isSoundboardFocused ? 'MEME SOUNDBOARD & SOUND PACKS' : 'EXTRAS, FX & SOUNDBOARD'}
            </h2>
          </div>
          <button
            type="button"
            className="tm-close-btn"
            onClick={onClose}
            aria-label="Close Extras Drawer"
          >
            ✕
          </button>
        </div>

        {isSoundboardFocused && soundboardSection}

        {/* SECTION 0: THE MEMES FM PROCEDURAL SYNTHWAVE RADIO DECK */}
        <div className="tm-extras-section">
          <div className="tm-extras-section-label">📼 THE MEMES FM — PROCEDURAL RADIO DECK</div>
          <MemesRadio
            onOpenShop={() => {
              onClose();
              if (onOpenRewards) onOpenRewards('shop');
            }}
          />
        </div>

        {/* SECTION 1: TOYS, EASTER EGGS & UTILITIES */}
        <div className="tm-extras-section">
          <div className="tm-extras-section-label">🎪 SECRET TOYS, LABS &amp; SHORTCUTS</div>
          <div className="tm-extras-grid">
            <button
              type="button"
              className="tm-extras-tile tm-extras-tile-wtf"
              onClick={() => {
                onClose();
                if (onLaunchWtfSurprise) onLaunchWtfSurprise();
              }}
            >
              <span className="tm-extras-tile-icon">🪿</span>
              <span className="tm-extras-tile-name">WTF?! Surprise</span>
              <span className="tm-extras-tile-desc">Cyber-Goose &amp; 3AM Lab</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile tm-extras-tile-payphone"
              onClick={() => {
                onClose();
                if (onOpenPayphone) onOpenPayphone();
              }}
            >
              <span className="tm-extras-tile-icon">☎️</span>
              <span className="tm-extras-tile-name">1-800-MEME</span>
              <span className="tm-extras-tile-desc">Retro Payphone Hotline</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile tm-extras-tile-boss"
              onClick={() => {
                onClose();
                if (onToggleBossKey) onToggleBossKey();
              }}
            >
              <span className="tm-extras-tile-icon">💼</span>
              <span className="tm-extras-tile-name">Boss Key (Shift+B)</span>
              <span className="tm-extras-tile-desc">6 Fake Work Screens</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile tm-extras-tile-ai"
              onClick={() => {
                onClose();
                if (onToggleAiAssistant) onToggleAiAssistant();
              }}
            >
              <span className="tm-extras-tile-icon">{aiPersonaId === 'hal' ? '🔴' : '🚗'}</span>
              <span className="tm-extras-tile-name">
                {aiPersonaId === 'hal' ? 'HAL 9000 AI' : 'K.I.T.T. AI'}
              </span>
              <span className="tm-extras-tile-desc">Voice Co-Pilot &amp; Jokes</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile"
              onClick={() => {
                onClose();
                if (onOpenRewards) onOpenRewards();
              }}
            >
              <span className="tm-extras-tile-icon">🎰</span>
              <span className="tm-extras-tile-name">
                Arcade Vault {unclaimedRewardsCount > 0 ? `(${unclaimedRewardsCount})` : ''}
              </span>
              <span className="tm-extras-tile-desc">Daily Wheel &amp; Bounties</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile"
              onClick={() => {
                onClose();
                if (onOpenLeaderboard) onOpenLeaderboard();
              }}
            >
              <span className="tm-extras-tile-icon">🏆</span>
              <span className="tm-extras-tile-name">Hall of Fame</span>
              <span className="tm-extras-tile-desc">Ranks &amp; Achievements</span>
            </button>

            <button
              type="button"
              className="tm-extras-tile"
              onClick={() => {
                onClose();
                if (onRandomMeme) onRandomMeme();
              }}
            >
              <span className="tm-extras-tile-icon">🎲</span>
              <span className="tm-extras-tile-name">Random Meme</span>
              <span className="tm-extras-tile-desc">Jump to a surprise meme</span>
            </button>

            <button
              type="button"
              className={`tm-extras-tile ${savedOnly ? 'active' : ''}`}
              onClick={() => {
                onClose();
                if (onToggleSavedFilter) onToggleSavedFilter();
              }}
            >
              <span className="tm-extras-tile-icon">⭐</span>
              <span className="tm-extras-tile-name">Saved ({savedIdsCount || 0})</span>
              <span className="tm-extras-tile-desc">
                {savedOnly ? 'Showing Saved Only' : 'View Saved Collection'}
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 2: UNIFIED SETTINGS SHEET & HARDWARE STATUS */}
        <div className="tm-extras-section">
          <SettingsSheet />
          <div className="tm-extras-toggles-row" style={{ marginTop: '10px' }}>
            <button
              type="button"
              className="tm-extras-toggle-pill"
              onClick={() => {
                onClose();
                if (onOpenDeviceOptimizer) onOpenDeviceOptimizer();
              }}
            >
              <span>
                {activeDeviceMeta?.icon || '📱'} Device: {activeDeviceMeta?.shortLabel || 'Auto'}
                {deviceOverride && deviceOverride !== 'auto' ? ' (Manual)' : ' (Auto)'}
              </span>
            </button>

            <button
              type="button"
              className="tm-extras-toggle-pill"
              onClick={onCheckSecurityStatus}
            >
              <span>🛡️ Security: Active</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: 16-PAD SOUNDBOARD, REALITY FX & STAMPEDES */}
        {!isSoundboardFocused && soundboardSection}
      </div>
    </div>
  );
}
