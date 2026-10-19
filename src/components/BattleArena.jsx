import { getMemeRarityTier } from '../data/starterMemes';

export default function BattleArena({
  memes,
  battlePair,
  battleWinner,
  battleStreak,
  championWins,
  crowdAgreement,
  onBattlePick,
  onSkipMatchup
}) {
  return (
    <section>
      <div style={{ textAlign: 'center', marginTop: '10px', padding: '0 16px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 900 }}>
          ⚔️ KING OF THE HILL: 1v1 MEME ARENA
        </h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          The winning meme stays on the throne to defend its crown! Your Vote Streak:{' '}
          <strong style={{ color: '#facc15' }}>{battleStreak}🔥</strong>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

              <div className="tm-img-wrap">
                <img src={m.image_url} alt={m.title} />
              </div>

              <div
                style={{
                  padding: '14px',
                  textAlign: 'center',
                  fontWeight: 900,
                  color: isWin ? '#22c55e' : '#facc15'
                }}
              >
                {isWin
                  ? '🏆 CROWN DEFENDED! +XP'
                  : isReigningKing
                  ? '👑 KEEP ON THRONE'
                  : '⚔️ DETHRONE THE KING'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <button type="button" className="tm-btn" onClick={onSkipMatchup}>
          🎲 Rotate New Matchup
        </button>
      </div>
    </section>
  );
}
