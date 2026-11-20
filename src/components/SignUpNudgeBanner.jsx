import { useState } from 'react';
import './SignUpNudgeBanner.css';

const NUDGE_COPY = {
  battle: {
    icon: '⚔️',
    title: 'Sign in with 1 tap to enter & keep battle wins',
    body: 'Save your caption entries, track battle points on the weekly leaderboard, and unlock 🏆 Battle badges.'
  },
  streak: {
    icon: '🔥',
    title: 'Save your daily streak across devices',
    body: 'Sign in with Google or a 1-tap Magic Link so your Guess the Meme score and weekly freeze never get lost.'
  },
  upvotes: {
    icon: '⚡',
    title: 'Claim your @handle to keep upvotes & awards',
    body: 'Get alerts when your memes take off and build your public /u/creator showcase in seconds.'
  }
};

export default function SignUpNudgeBanner({
  reason = 'upvotes',
  currentUser = null,
  onSignIn,
  className = ''
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || currentUser?.verified || typeof onSignIn !== 'function') {
    return null;
  }

  const copy = NUDGE_COPY[reason] || NUDGE_COPY.upvotes;

  return (
    <aside
      className={`tm-signup-nudge ${className}`.trim()}
      aria-label="Account sign-in reminder"
      data-testid={`signup-nudge-${reason}`}
    >
      <div className="tm-signup-nudge-copy">
        <div className="tm-signup-nudge-title">
          <span aria-hidden="true">{copy.icon}</span> {copy.title}
        </div>
        <p className="tm-signup-nudge-body">{copy.body}</p>
      </div>
      <div className="tm-signup-nudge-actions">
        <button
          type="button"
          className="tm-btn tm-btn-primary tm-signup-nudge-cta"
          onClick={onSignIn}
        >
          1-Tap Sign In / Magic Link
        </button>
        <button
          type="button"
          className="tm-btn tm-signup-nudge-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss reminder"
        >
          Later
        </button>
      </div>
    </aside>
  );
}
