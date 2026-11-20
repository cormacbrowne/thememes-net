import { SOCIAL_LINKS, getActiveSocialLinks } from '../config/social';
import './SocialLinksBar.css';

/**
 * Plan 2.8 — Config-driven social links for footer & Extras drawer menu.
 * Reads SOCIAL_LINKS (or an override object) and hides any platform whose URL is empty.
 */
export default function SocialLinksBar({ links = SOCIAL_LINKS, variant = 'footer', className = '' }) {
  const active = getActiveSocialLinks(links);
  if (!active.length) return null;

  if (variant === 'drawer') {
    return (
      <div className={`tm-extras-section tm-social-drawer ${className}`.trim()} data-testid="social-links-drawer">
        <span className="tm-extras-section-label">FOLLOW THE MEMES.NET</span>
        <div className="tm-social-drawer-grid">
          {active.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="tm-social-drawer-pill"
              aria-label={`Follow THE MEMES.net on ${item.shortLabel} (opens in new tab)`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav
      className={`tm-social-footer ${className}`.trim()}
      aria-label="Follow THE MEMES.net on social media"
      data-testid="social-links-footer"
    >
      <span className="tm-social-footer-label">Follow:</span>
      {active.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tm-social-footer-pill"
          aria-label={`THE MEMES.net on ${item.shortLabel}`}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
