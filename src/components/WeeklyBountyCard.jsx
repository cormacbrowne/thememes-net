import { useEffect, useState } from 'react';
import { fetchActiveBounty, claimBountyAward, bountyTimeLeft } from '../utils/bounties';
import HouseBadge from './HouseBadge';
import './WeeklyBountyCard.css';

/**
 * Workstream 1 — this week's bounty (written by MemeBot, approved by a moderator).
 * Hidden entirely when no bounty is live, so the home page never shows an empty box.
 */
export default function WeeklyBountyCard({ onAcceptBounty, onClaimPrize }) {
  const [state, setState] = useState({ bounty: null, myAward: null });
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => {
    let alive = true;
    fetchActiveBounty().then((res) => {
      if (alive) setState({ bounty: res.bounty, myAward: res.myAward });
    });
    return () => {
      alive = false;
    };
  }, []);

  const { bounty, myAward } = state;

  const claim = async () => {
    const res = await claimBountyAward(myAward.bounty_id);
    if (res.ok) {
      const credited = onClaimPrize?.(myAward.bounty_id, res.mdollarz, 1) ?? res.mdollarz;
      setClaimMsg(`+${credited} M$ added. Nice one!`);
      setState((s) => ({ ...s, myAward: null }));
    } else {
      setClaimMsg('Prize already claimed.');
    }
  };

  if (!bounty && !myAward && !claimMsg) return null;

  return (
    <section className="tm-weekly-bounty" data-testid="weekly-bounty">
      {myAward && (
        <div className="tm-weekly-bounty-award">
          🏆 You won the “{myAward.prompt}” bounty!
          <button type="button" className="tm-btn tm-btn-primary" onClick={claim}>
            Claim {myAward.mdollarz} M$
          </button>
        </div>
      )}
      {claimMsg && <p className="tm-weekly-bounty-note">{claimMsg}</p>}
      {bounty && (
        <>
          <div className="tm-weekly-bounty-head">
            <span className="tm-weekly-bounty-kicker">🎯 WEEKLY BOUNTY · #{bounty.tag}</span>
            <HouseBadge />
          </div>
          <p className="tm-weekly-bounty-prompt">“{bounty.prompt}”</p>
          <div className="tm-weekly-bounty-foot">
            <span>
              🏆 {bounty.prizeMdollarz} M$ to the best entry · ⏳ {bountyTimeLeft(bounty.endsAt)}
            </span>
            <button
              type="button"
              className="tm-btn tm-btn-primary tm-weekly-bounty-cta"
              onClick={() => onAcceptBounty?.(bounty)}
              data-testid="weekly-bounty-accept"
            >
              🎯 Take the bounty
            </button>
          </div>
        </>
      )}
    </section>
  );
}
