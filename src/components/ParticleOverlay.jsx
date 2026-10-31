import { useState, forwardRef, useImperativeHandle } from 'react';
import { COMIC_ACTION_WORDS } from '../data/starterMemes';

/**
 * Isolated Particle & Comic Action-Word Overlay.
 * Keeps high-frequency pointer/click bursts completely out of root App state
 * so MemeCards and game canvases never re-render when particles spawn (critical for older iPads!).
 */
const ParticleOverlay = forwardRef(function ParticleOverlay({ litePerfMode = false }, ref) {
  const [particles, setParticles] = useState([]);
  const [comicPops, setComicPops] = useState([]);

  useImperativeHandle(
    ref,
    () => ({
      spawnParticles(e, emoji = '🔥', maxCount = 6) {
        if (litePerfMode) return;
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        const x =
          e?.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
        const y =
          e?.clientY || (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);

        const count = Math.min(maxCount, 6);
        const batchId = Date.now() + Math.random();
        const newItems = Array.from({ length: count }).map((_, i) => ({
          id: `${batchId}-${i}`,
          x,
          y,
          emoji,
          tx: `${(Math.random() - 0.5) * 140}px`,
          ty: `${-55 - Math.random() * 110}px`,
          rot: `${(Math.random() - 0.5) * 90}deg`
        }));

        setParticles((prev) => [...prev.slice(-18), ...newItems]);
        const ids = new Set(newItems.map((p) => p.id));
        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
        }, 780);
      },

      spawnComicPop(e, customText = null) {
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        const x =
          e?.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
        const y =
          e?.clientY || (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);

        const text =
          customText ||
          COMIC_ACTION_WORDS[Math.floor(Math.random() * COMIC_ACTION_WORDS.length)];
        const id = `cp-${Date.now()}-${Math.random()}`;
        const rot = `${Math.round((Math.random() - 0.5) * 20)}deg`;

        setComicPops((prev) => [...prev.slice(-4), { id, x, y, text, rot }]);
        setTimeout(() => {
          setComicPops((prev) => prev.filter((c) => c.id !== id));
        }, 820);
      }
    }),
    [litePerfMode]
  );

  if (particles.length === 0 && comicPops.length === 0) return null;

  return (
    <div className="tm-particle-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="tm-particle"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            '--tx': p.tx,
            '--ty': p.ty,
            '--rot': p.rot
          }}
        >
          {p.emoji}
        </span>
      ))}
      {comicPops.map((cp) => (
        <span
          key={cp.id}
          className="tm-global-comic-pop"
          style={{
            left: `${cp.x}px`,
            top: `${cp.y}px`,
            '--rot': cp.rot
          }}
        >
          {cp.text}
        </span>
      ))}
    </div>
  );
});

export default ParticleOverlay;
