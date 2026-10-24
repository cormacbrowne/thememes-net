import { getMemeRarityTier, formatMemeUploadDate } from '../data/starterMemes';

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
  onOpenTheater,
  onOpenBlankStudio
}) {
  if (!memes || memes.length < 2) {
    return (
      <section style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="tm-empty-feed-card">
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>⚔️👑</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>
            1v1 Battle Arena Needs at Least 2 User Memes!
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '0 auto 16px', fontSize: '14px' }}>
            Currently <strong>{memes?.length || 0}</strong> user-uploaded meme{memes?.length === 1 ? ' is' : 's are'} in the arena. Upload a meme to start head-to-head King of the Hill battles!
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onOpenBlankStudio && (
              <button type="button" className="tm-btn tm-btn-primary" onClick={onOpenBlankStudio}>
                + Upload Meme to Arena (+100 XP)
              </button>
            )}
            {onBackToFeed && (
              <button type="button" className="tm-btn" onClick={onBackToFeed}>
                ← Back to Feed
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

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
          Tap the funnier user-uploaded meme! The winner stays on the throne to defend its crown.
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
          const uploadInfo = formatMemeUploadDate(m.created_at);
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                  <span className="tm-upload-date-badge">
                    📅 Uploaded {uploadInfo.dateTime} ({uploadInfo.relative})
                  </span>
                </div>
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
