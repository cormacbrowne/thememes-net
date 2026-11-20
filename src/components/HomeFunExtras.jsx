import './HomeFunExtras.css';

const EXTRA_TILES = [
  { id: 'pranks', emoji: '🎭', title: 'Prank Screens', sub: 'Fake updates & office jokes' },
  { id: 'soundboard', emoji: '🎹', title: 'Soundboard', sub: 'Vine Boom & comedy SFX' },
  { id: 'arcade', emoji: '🕹️', title: 'Arcade', sub: 'Retro skill & meme games' },
  { id: 'radio', emoji: '📻', title: 'Radio', sub: 'THE MEMES FM synthwave' }
];

/**
 * Plan 2.7 — Compact "Fun extras" tiles shown below the mobile feed
 * (and pinned inside the desktop left rail).
 */
export default function HomeFunExtras({
  onOpenPranks,
  onOpenSoundboard,
  onOpenArcade,
  onOpenRadio
}) {
  const handlers = {
    pranks: onOpenPranks,
    soundboard: onOpenSoundboard,
    arcade: onOpenArcade,
    radio: onOpenRadio
  };

  return (
    <section className="tm-fun-extras" aria-label="Fun extras" data-testid="home-fun-extras">
      <div className="tm-fun-extras-head">
        <h2>✨ Fun extras</h2>
        <span>Instant chaos tools</span>
      </div>
      <div className="tm-fun-extras-grid">
        {EXTRA_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="tm-fun-extra-tile"
            data-testid={`fun-extra-${tile.id}`}
            onClick={handlers[tile.id]}
          >
            <span className="tm-fun-extra-emoji" aria-hidden="true">{tile.emoji}</span>
            <span className="tm-fun-extra-copy">
              <strong>{tile.title}</strong>
              <small>{tile.sub}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
