import { getMemeRarityTier } from '../data/starterMemes';

export default function BattleArena({
  memes,
  battlePair,
  battleWinner,
  battleStreak,
  championWins,
  crowdAgreement,
  onBattlePick,
  onSkipMatchup,
  onBackToFeed,
  onOpenTheater
}) {
  return (
    <section>
      <div style={{ textAlign: 'center', marginTop: '10px', padding: '0 16px' }}>
        <div
          style={{
            maxWidth: '1020px',
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          {onBackToFeed && (
            <button type="button" className="tm-btn tm-back-pill" onClick={onBackToFeed}>
              ← Back to Feed
            </button>
          )}
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#cbd5e1' }}>
            Vote Streak: <strong style={{ color: '#facc15' }}>{battleStreak}🔥</strong>
          </div>
          <button type="button" className="tm-btn" onClick={onSkipMatchup}>
            🎲 Next Matchup
          </button>
        </div>

        <h2 style={{ margin: '0 0 4px', fontSize: '21px', fontWeight: 900 }}>
          ⚔️ KING OF THE HILL: 1v1 MEME ARENA
        </h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
          Tap the funnier meme! The winner stays on the throne to defend its crown.
        </p>

        {crowdAgreement !== null && (
          <div className="tm-crowd-meter">
            📊 <strong>{crowdAgreement}%</strong> of arcade players agreed with your pick!
          </div>
        )}
      </div>

      <div className="tm-battle-grid">
        {battlePair.map((memeIdx, slotIdx) => {
          const m = memes[memeIdx % memes.length];
          if (!m) return null;
          const isWin = battleWinner === memeIdx;
          const rarity = getMemeRarityTier(m);
          const isReigningKing = slotIdx === 0 && championWins > 0;

          return (
            <div
              key={`${m.id}-${slotIdx}`}
              className={`tm-card tm-holo-card ${rarity.className} tm-battle-card ${
                isWin ? 'winner' : ''
              } ${isReigningKing ? 'reigning-king' : ''}`}
              onClick={(e) => onBattlePick(memeIdx, slotIdx, e)}
            >
              <div className="tm-card-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {isReigningKing ? (
                    <span className="tm-king-crown-badge">
                      👑 REIGNING KING ({championWins}W)
                    </span>
                  ) : (
                    <span className="tm-challenger-badge">⚔️ CHALLENGER</span>
                  )}
                  <strong>@{m.author_name}</strong>
                </span>
                <span className="tm-tag">{m.score} PTS</span>
              </div>

              <h3 className="tm-card-title">{m.title}</h3>

              <div className="tm-img-wrap tm-battle-img-wrap">
                {onOpenTheater && (
                  <button
                    type="button"
                    className="tm-theater-QuickBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTheater(m);
                    }}
                    title="Inspect Meme"
                  >
                    🔍
                  </button>
                )}
                <img src={m.image_url} alt={m.title} />
              </div>

              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: '14px',
                  color: isWin ? '#22c55e' : '#facc15'
                }}
              >
                {isWin
                  ? '🏆 CROWN DEFENDED! +XP'
                  : isReigningKing
                  ? '👑 TAP TO KEEP ON THRONE'
                  : '⚔️ TAP TO DETHRONE KING'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
