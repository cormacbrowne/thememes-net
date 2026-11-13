import { useMemo } from 'react';
import MemeMedia from './MemeMedia';
import BattleCountdown from './BattleCountdown';
import { isSeedMeme } from '../data/starterMemes';
import { getBattleEntriesForBattle, getYesterdayCaptionKing } from '../utils/dailyCaptionBattle';
import './DailyCaptionBattleModal.css';

export default function DailyCaptionBattleModal({
  battle,
  memes,
  userVotes,
  onVote,
  onEnterBattle,
  onOpenProfile,
  onOpenTheater,
  onClose
}) {
  const entries = useMemo(() => getBattleEntriesForBattle(memes, battle), [memes, battle]);
  const yesterdayKing = useMemo(() => getYesterdayCaptionKing(memes), [memes]);

  if (!battle) return null;

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal tm-caption-battle-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Caption Battle"
      >
        <div className="tm-modal-sticky-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '19px', color: '#facc15' }}>
              ⚔️ Daily Caption Battle
            </h2>
            <BattleCountdown />
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Yesterday's Caption King Banner (shown when a real community winner exists) */}
        <div className={`tm-caption-king-banner ${yesterdayKing ? 'crowned' : ''}`}>
          {yesterdayKing ? (
            <>
              <div className="tm-caption-king-left">
                <span style={{ fontSize: '26px' }}>👑</span>
                <div>
                  <div className="tm-caption-king-kicker">YESTERDAY&apos;S CAPTION KING</div>
                  <div className="tm-caption-king-name">
                    <button
                      type="button"
                      className="tm-link-btn"
                      style={{ color: '#fde047', fontWeight: 900, fontSize: '15px' }}
                      onClick={() => {
                        onClose();
                        if (onOpenProfile) onOpenProfile(yesterdayKing.author_name);
                      }}
                    >
                      @{yesterdayKing.author_name}
                    </button>{' '}
                    won with <strong>{yesterdayKing.score}</strong> pts!
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="tm-btn"
                onClick={() => {
                  onClose();
                  if (onOpenTheater) onOpenTheater(yesterdayKing.meme);
                }}
              >
                👀 Winning Caption
              </button>
            </>
          ) : (
            <div className="tm-caption-king-left">
              <span style={{ fontSize: '22px' }}>👑</span>
              <div>
                <div className="tm-caption-king-kicker">CROWN UP FOR GRABS TODAY</div>
                <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  Top-voted caption before midnight wins tomorrow&apos;s{' '}
                  <strong style={{ color: '#facc15' }}>👑 Caption King</strong> banner &amp; profile badge!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's Featured Template */}
        <div className="tm-battle-hero-card">
          <img
            src={battle.template?.src}
            alt={battle.template?.name || 'Daily Caption Battle template'}
            className="tm-battle-hero-thumb"
          />
          <div className="tm-battle-hero-info">
            <span className="tm-bounty-pill">🎯 TODAY&apos;S TEMPLATE • {battle.dateStr}</span>
            <h3 style={{ margin: '6px 0 4px', fontSize: '17px', color: '#fff' }}>
              {battle.template?.name}
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#cbd5e1' }}>
              Everyone captions the exact same blank format today. Highest-voted community entry wins{' '}
              <strong>👑 Caption King</strong> tomorrow + <strong>+18 🪙 &amp; +200 XP</strong> on submit!
            </p>
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              onClick={() => {
                onClose();
                if (onEnterBattle) onEnterBattle(battle);
              }}
            >
              ✏️ Caption This Template (+18 🪙)
            </button>
          </div>
        </div>

        {/* Entries Grid */}
        <div style={{ marginTop: '16px' }}>
          <div className="tm-studio-label" style={{ marginBottom: '10px' }}>
            🏆 Today&apos;s Captions ({entries.length})
          </div>
          <div className="tm-battle-entries-grid">
            {entries.map((entry, idx) => {
              const isSample = isSeedMeme(entry) || entry.is_sample_caption;
              const myVote = userVotes?.[entry.id] || 0;
              return (
                <article
                  key={entry.id}
                  className={`tm-battle-entry-card ${idx === 0 && !isSample ? 'leading' : ''}`}
                >
                  <div className="tm-battle-entry-head">
                    <span className="tm-battle-entry-author">
                      {idx === 0 && !isSample ? '👑 ' : ''}@{entry.author_name || 'Anon'}
                    </span>
                    {isSample ? (
                      <span className="tm-sample-seed-pill" title="Day-one seed caption by @TheMemesHQ">
                        🤖 Sample (@TheMemesHQ)
                      </span>
                    ) : (
                      <span className="tm-community-entry-pill">🔥 Community</span>
                    )}
                  </div>
                  <div className="tm-battle-entry-media">
                    <MemeMedia meme={entry} mode="feed" />
                  </div>
                  <div className="tm-battle-entry-foot">
                    <span className="tm-battle-entry-title">{entry.title}</span>
                    <button
                      type="button"
                      className={`tm-btn ${myVote === 1 ? 'tm-btn-primary' : ''}`}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={(e) => onVote && onVote(entry.id, 1, e)}
                    >
                      🔥 {entry.score || 0}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
