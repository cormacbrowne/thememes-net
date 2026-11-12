import { useState, useEffect } from 'react';
import { subscribeMemeEmotes } from '../hooks/useLivePresence';

/**
 * Phase 28.14: Twitch-emote style floating live reactions from OTHER online peers
 * currently interacting with this meme. Renders nothing unless real broadcasts arrive.
 */
export default function MemeLiveEmotes({ memeId, litePerfMode = false }) {
  const [emotes, setEmotes] = useState([]);

  useEffect(() => {
    if (!memeId || litePerfMode) return undefined;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const timers = new Set();
    const unsub = subscribeMemeEmotes(memeId, (payload) => {
      const id = `${payload.ts || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const leftPct = 15 + Math.floor(Math.random() * 70);
      setEmotes((prev) => [...prev.slice(-4), { id, emoji: payload.emoji || '🔥', leftPct }]);
      const t = setTimeout(() => {
        timers.delete(t);
        setEmotes((prev) => prev.filter((item) => item.id !== id));
      }, 1350);
      timers.add(t);
    });

    return () => {
      unsub();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [memeId, litePerfMode]);

  if (emotes.length === 0) return null;

  return (
    <div className="tm-live-emotes-layer" aria-hidden="true">
      {emotes.map((em) => (
        <span
          key={em.id}
          className="tm-live-emote-float"
          style={{ left: `${em.leftPct}%` }}
        >
          {em.emoji}
        </span>
      ))}
    </div>
  );
}
