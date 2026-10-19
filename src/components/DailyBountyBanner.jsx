export default function DailyBountyBanner({
  bounty,
  bountyIdx,
  totalBounties,
  onCycleBounty,
  onAcceptBounty
}) {
  if (!bounty) return null;

  return (
    <section className="tm-bounty-wrap">
      <div className="tm-bounty-banner">
        <div className="tm-bounty-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="tm-bounty-pill">🎯 DAILY MEME BOUNTY #{bountyIdx + 1}/{totalBounties}</span>
            <span className="tm-bounty-tag">#{bounty.tag}</span>
            <span className="tm-bounty-reward">⚡ +{bounty.rewardXp} XP BONUS (2x!)</span>
          </div>
          <div className="tm-bounty-prompt">“{bounty.prompt}”</div>
        </div>

        <div className="tm-bounty-actions">
          <button
            type="button"
            className="tm-btn"
            onClick={onCycleBounty}
            title="Switch to next Daily Prompt"
          >
            🎲 Next Prompt
          </button>
          <button
            type="button"
            className="tm-mutate-btn"
            style={{ padding: '9px 16px', fontSize: '12px' }}
            onClick={() => onAcceptBounty(bounty)}
          >
            🎯 Accept Bounty (+{bounty.rewardXp} XP)
          </button>
        </div>
      </div>
    </section>
  );
}
