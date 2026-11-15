import { useEffect, useMemo, useState } from 'react';
import { RANKS, formatMemeUploadDate } from '../data/starterMemes';
import {
  EMPTY_LEADERBOARD_COPY,
  LEADERBOARD_FOR_FUN_COPY,
  LEADERBOARD_GAMES,
  LEADERBOARD_PERIODS,
  fetchGameLeaderboard
} from '../utils/arcadeLeaderboards';
import './LeaderboardModal.css';

const LOCAL_SCORE_KEYS = {
  pinball: 'tm_pinball_highscore',
  crush: 'tm_crush_highscore',
  pusher: 'tm_pusher_highscore',
  hilow: 'tm_hilow_best_v1',
  stocks: 'tm_stocks_highscore',
  slots: 'tm_slots_best_win',
  blackjack: 'tm_blackjack_highscore',
  roulette: 'tm_roulette_highscore',
  poker: 'tm_poker_best_pot_v1'
};

function readLocalBest(gameId) {
  const key = LOCAL_SCORE_KEYS[gameId];
  if (!key) return 0;
  try {
    return Number(localStorage.getItem(key) || 0) || 0;
  } catch {
    return 0;
  }
}

export default function LeaderboardModal({
  memes,
  currentUser,
  currentXp,
  royaltiesMap,
  initialTab = 'creators',
  initialGame = 'pinball',
  onClose,
  onSelectMeme,
  onTriggerStudioMutate,
  onOpenProfile,
  onLaunchSubGame
}) {
  const [tab, setTab] = useState(initialTab); // 'creators' | 'subgames' | 'memes' | 'origins'
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [period, setPeriod] = useState('all_time'); // 'today' | 'week' | 'all_time'
  const [boardState, setBoardState] = useState({ key: '', entries: [], error: '' });

  const activeGameMeta = useMemo(
    () => LEADERBOARD_GAMES.find((g) => g.id === selectedGame) || LEADERBOARD_GAMES[0],
    [selectedGame]
  );

  const localBestScore = useMemo(() => readLocalBest(selectedGame), [selectedGame]);
  const boardKey = `${selectedGame}:${period}`;
  const boardLoading = tab === 'subgames' && boardState.key !== boardKey;

  useEffect(() => {
    if (tab !== 'subgames') return undefined;
    let cancelled = false;
    fetchGameLeaderboard(selectedGame, period, 10).then((res) => {
      if (cancelled) return;
      setBoardState({
        key: `${selectedGame}:${period}`,
        entries: Array.isArray(res.entries) ? res.entries : [],
        error: res.ok ? '' : 'Could not load cabinet scores right now.'
      });
    });
    return () => {
      cancelled = true;
    };
  }, [tab, selectedGame, period]);

  // 1. Aggregate Top Creators Leaderboard
  const topCreators = useMemo(() => {
    const map = new Map();

    const ensureCreator = (handle) => {
      const key = handle || 'AnonMemer';
      if (!map.has(key)) {
        map.set(key, {
          username: key,
          memeCount: 0,
          totalScore: 0,
          remixesSpawned: 0,
          royaltyXp: Number(royaltiesMap?.[key] || 0),
          xp: 0
        });
      }
      return map.get(key);
    };

    memes.forEach((m) => {
      const entry = ensureCreator(m.author_name || 'AnonMemer');
      entry.memeCount += 1;
      entry.totalScore += Number(m.score || 0);
      entry.remixesSpawned += Number(m.mutation_count || 0);
    });

    const myHandle = currentUser?.username || 'You (Arcade Player)';
    const me = ensureCreator(myHandle);
    me.isCurrentUser = true;

    return Array.from(map.values())
      .map((c) => {
        const computedXp = c.isCurrentUser
          ? Math.max(currentXp, Math.round(c.totalScore * 0.4) + c.royaltyXp + c.remixesSpawned * 50)
          : Math.round(c.totalScore * 0.65) + c.royaltyXp + c.remixesSpawned * 50 + c.memeCount * 100;
        let rankObj = RANKS[0];
        for (const r of RANKS) {
          if (computedXp >= r.minXp) rankObj = r;
        }
        return {
          ...c,
          xp: computedXp,
          rank: rankObj
        };
      })
      .sort((a, b) => b.xp - a.xp);
  }, [memes, currentUser, currentXp, royaltiesMap]);

  // 2. Top Memes by Score
  const topMemes = useMemo(() => {
    return [...memes].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 15);
  }, [memes]);

  // 3. Most Mutated GEN-0 Origins
  const topOrigins = useMemo(() => {
    return memes
      .filter((m) => (m.generation || 0) === 0)
      .sort((a, b) => (b.mutation_count || 0) - (a.mutation_count || 0) || (b.score || 0) - (a.score || 0))
      .slice(0, 15);
  }, [memes]);

  const getMedal = (idx) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div className="tm-modal tm-leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sticky Header */}
        <div className="tm-modal-sticky-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="tm-btn tm-back-pill" onClick={onClose}>
              ← Back
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#facc15' }}>
                🏆 CYBER-ARCADE HALL OF FAME
              </h2>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                Real global cabinet initials &amp; verified creators — zero synthetic bots.
              </div>
            </div>
          </div>
          <button type="button" className="tm-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tm-tab ${tab === 'creators' ? 'active' : ''}`}
            onClick={() => setTab('creators')}
          >
            👾 Top Meme Lords (XP)
          </button>
          <button
            type="button"
            className={`tm-tab ${tab === 'subgames' ? 'active' : ''}`}
            data-testid="leaderboard-subgames-tab"
            onClick={() => setTab('subgames')}
          >
            🕹️ Arcade Cabinets
          </button>
          <button
            type="button"
            className={`tm-tab ${tab === 'memes' ? 'active' : ''}`}
            onClick={() => setTab('memes')}
          >
            🔥 Highest Scored Memes
          </button>
          <button
            type="button"
            className={`tm-tab ${tab === 'origins' ? 'active' : ''}`}
            onClick={() => setTab('origins')}
          >
            🧬 Most Mutated Origins
          </button>
        </div>

        {/* TAB 0: GLOBAL ARCADE CABINET LEADERBOARDS */}
        {tab === 'subgames' && (
          <div>
            <div className="tm-cabinet-for-fun-bar" data-testid="leaderboard-for-fun-notice">
              <span>ℹ️ {LEADERBOARD_FOR_FUN_COPY}</span>
              {localBestScore > 0 && (
                <span className="tm-tag" style={{ color: '#a3e635' }}>
                  Device Best: {localBestScore.toLocaleString()} {activeGameMeta.unit}
                </span>
              )}
            </div>

            <div className="tm-cabinet-pill-strip" role="tablist" aria-label="Select arcade game">
              {LEADERBOARD_GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedGame === g.id}
                  data-testid={`cabinet-select-${g.id}`}
                  className={`tm-cabinet-pill ${selectedGame === g.id ? 'active' : ''}`}
                  onClick={() => setSelectedGame(g.id)}
                >
                  {g.icon} {g.label}
                </button>
              ))}
            </div>

            <div
              className="tm-cabinet-board-card"
              style={{ borderColor: `${activeGameMeta.accent}66` }}
            >
              <div className="tm-cabinet-board-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: activeGameMeta.accent }}>
                    {activeGameMeta.icon} {activeGameMeta.label}
                  </h3>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Top 10 cabinet initials • Ranked highest score first
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div className="tm-period-tabs" role="tablist" aria-label="Leaderboard time period">
                    {LEADERBOARD_PERIODS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={period === p.id}
                        data-testid={`period-tab-${p.id}`}
                        className={`tm-tab ${period === p.id ? 'active' : ''}`}
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => setPeriod(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => onLaunchSubGame(activeGameMeta.id)}
                  >
                    🕹️ Play Cabinet
                  </button>
                </div>
              </div>

              {boardLoading ? (
                <div className="tm-cabinet-empty">⏳ Loading cabinet scores…</div>
              ) : boardState.error ? (
                <div className="tm-cabinet-empty">⚠️ {boardState.error}</div>
              ) : boardState.entries.length === 0 ? (
                <div className="tm-cabinet-empty" data-testid="cabinet-empty-state">
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
                    {EMPTY_LEADERBOARD_COPY}
                  </div>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={() => onLaunchSubGame(activeGameMeta.id)}
                  >
                    {activeGameMeta.icon} Play {activeGameMeta.label}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {boardState.entries.map((entry, idx) => (
                    <div
                      key={entry.id || `${entry.initials}-${entry.score}-${idx}`}
                      data-testid={`cabinet-score-row-${idx}`}
                      className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}
                      style={{ padding: '9px 12px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span className="tm-medal-badge" style={{ fontSize: '16px' }}>
                          {getMedal(idx)}
                        </span>
                        <span className="tm-arcade-initials">{entry.initials}</span>
                        {entry.created_at && (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {formatMemeUploadDate(entry.created_at).dateTime}
                          </span>
                        )}
                      </div>
                      <strong style={{ color: activeGameMeta.accent, fontSize: '15px', whiteSpace: 'nowrap' }}>
                        {Number(entry.score || 0).toLocaleString()} {activeGameMeta.unit}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: TOP CREATORS */}
        {tab === 'creators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCreators.map((c, idx) => (
              <div
                key={c.username}
                className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}
                onClick={() => {
                  onClose();
                  onOpenProfile(c.username);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#38bdf8' }}>@{c.username}</strong>
                      {c.isCurrentUser && (
                        <span className="tm-tag" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                          YOU
                        </span>
                      )}
                      <span className="tm-tag">
                        Lv.{c.rank.level} {c.rank.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                      📸 {c.memeCount} drops • 🔥 {c.totalScore} score • 🧬 {c.remixesSpawned} remixes spawned
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#facc15' }}>⚡ {c.xp} XP</div>
                  {(c.remixesSpawned > 0 || c.royaltyXp > 0) && (
                    <div style={{ fontSize: '11px', color: '#a3e635', fontWeight: 700 }}>
                      +{c.remixesSpawned * 50 + c.royaltyXp} XP Royalties
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: TOP MEMES */}
        {tab === 'memes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topMemes.map((m, idx) => (
              <div key={m.id} className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <img
                    src={m.image_url}
                    alt={m.title}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        onClose();
                        onSelectMeme(m);
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      by{' '}
                      <strong
                        style={{ color: '#38bdf8', cursor: 'pointer' }}
                        onClick={() => {
                          onClose();
                          onOpenProfile(m.author_name);
                        }}
                      >
                        @{m.author_name}
                      </strong>{' '}
                      • 🔥 {m.score} pts • 📅 {formatMemeUploadDate(m.created_at).dateTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      onClose();
                      onSelectMeme(m);
                    }}
                  >
                    🔍 View
                  </button>
                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => {
                      onClose();
                      onTriggerStudioMutate(m, e);
                    }}
                  >
                    🧬 Mutate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MOST MUTATED ORIGINS */}
        {tab === 'origins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topOrigins.map((m, idx) => (
              <div key={m.id} className={`tm-leaderboard-row ${idx < 3 ? `podium-${idx + 1}` : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span className="tm-medal-badge">{getMedal(idx)}</span>
                  <img
                    src={m.image_url}
                    alt={m.title}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px' }}>{m.title}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Origin by{' '}
                      <strong
                        style={{ color: '#38bdf8', cursor: 'pointer' }}
                        onClick={() => {
                          onClose();
                          onOpenProfile(m.author_name);
                        }}
                      >
                        @{m.author_name}
                      </strong>{' '}
                      • <strong style={{ color: '#a3e635' }}>+{(m.mutation_count || 0) * 50} XP Royalties Earned</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="tm-lineage-btn">🧬 {m.mutation_count || 0} REMIXES</span>
                  <button
                    type="button"
                    className="tm-mutate-btn"
                    onClick={(e) => {
                      onClose();
                      onTriggerStudioMutate(m, e);
                    }}
                  >
                    🧬 Fork Origin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
