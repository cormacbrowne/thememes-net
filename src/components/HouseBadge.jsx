import { Bot } from 'lucide-react';
import './HouseBadge.css';

/**
 * Workstream 1: every piece of house-agent content is labelled. Shown next to the author
 * wherever MemeBot (profiles.is_house) appears — feed cards, meme page, battle entries, profile.
 */
export default function HouseBadge({ className = '' }) {
  return (
    <span
      className={`tm-house-badge ${className}`}
      title="Made by MemeBot, THE MEMES.net's AI house account. House posts never win prizes."
      data-testid="house-badge"
    >
      <Bot size={12} strokeWidth={2.2} aria-hidden="true" />
      <span>House</span>
    </span>
  );
}
