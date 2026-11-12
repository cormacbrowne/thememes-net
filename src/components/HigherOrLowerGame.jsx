import { useState, useMemo, useRef } from 'react';
import { STARTER_MEMES } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';
import { RadioToggleButton } from './MemesRadio';
import './HigherOrLowerGame.css';

// ==========================================
// HIGHER OR LOWER: MEME EDITION (Phase 29.11)
//
// ECONOMY & HOUSE EDGE NOTE:
//   - 100% Free-to-Play endless upvote prediction game (0 tokens wagered, 0% house edge).
//   - Combines live community feed memes with STARTER_MEMES seed scores.
//   - Any equal-upvote tie resolves in the player's favor so streak runs stay fair.
//   - Tracks best endless streak in localStorage (`tm_hilow_best_v1`).
// ==========================================

const BEST_STREAK_KEY = 'tm_hilow_best_v1';

function buildMemePool(feedMemes = []) {
  const combined = [];
  const seen = new Set();
  const addItem = (m) => {
    if (!m || !m.id || seen.has(m.id)) return;
    if (!m.image_url) return;
    seen.add(m.id);
    const score = Math.max(12, Math.floor(Number(m.votes ?? m.score ?? 50) || 50));
    combined.push({
      id: m.id,
      title: m.title || 'Community Meme',
      image_url: m.image_url,
      author_name: m.author_name || 'TheMemesHQ',
      category: m.category || 'dank',
      votes: score
    });
  };
  feedMemes.forEach(addItem);
  STARTER_MEMES.forEach(addItem);
  return combined;
}

function pickRandomIndex(pool, excludeIndices = []) {
  if (pool.length <= 1) return 0;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    if (!excludeIndices.includes(idx)) return idx;
  }
  return (excludeIndices[0] + 1) % pool.length;
}

export default function HigherOrLowerGame({
  memes = [],
  soundOn = true,
  onToggleSound,
  onInspectMeme,
  onBackToFeed
}) {
  const pool = useMemo(() => buildMemePool(memes), [memes]);

  const initialPair = useMemo(() => {
    const leftIdx = 0;
    const rightIdx = pool.length > 1 ? 1 : 0;
    return { leftIdx, rightIdx };
  }, [pool.length]);

  const [leftIdx, setLeftIdx] = useState(() => initialPair.leftIdx);
  const [rightIdx, setRightIdx] = useState(() => initialPair.rightIdx);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      return Math.max(0, Number(localStorage.getItem(BEST_STREAK_KEY) || 0));
    } catch {
      return 0;
    }
  });
  const [revealed, setRevealed] = useState(null); // { correct: boolean, guess: 'higher'|'lower' } | null
  const [gameOver, setGameOver] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const advanceTimerRef = useRef(null);

  const leftMeme = pool[leftIdx % pool.length];
  const rightMeme = pool[rightIdx % pool.length];

  const handleGuess = (dir) => {
    if (revealed || gameOver || !leftMeme || !rightMeme) return;
    const isCorrect =
      dir === 'higher'
        ? rightMeme.votes >= leftMeme.votes
        : rightMeme.votes <= leftMeme.votes;

    setRevealed({ correct: isCorrect, guess: dir });

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        try {
          localStorage.setItem(BEST_STREAK_KEY, String(nextStreak));
        } catch {
          // ignore storage quota
        }
      }
      sfx.playMemeUpvote?.();

      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        const nextRight = pickRandomIndex(pool, [rightIdx, leftIdx]);
        setLeftIdx(rightIdx);
        setRightIdx(nextRight);
        setRevealed(null);
      }, 900);
    } else {
      sfx.playClownHonk?.();
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        setGameOver(true);
      }, 950);
    }
  };

  const handleRestart = () => {
    clearTimeout(advanceTimerRef.current);
    const a = Math.floor(Math.random() * pool.length);
    const b = pickRandomIndex(pool, [a]);
    setLeftIdx(a);
    setRightIdx(b);
    setStreak(0);
    setRevealed(null);
    setGameOver(false);
    setCopiedNotice(false);
    sfx.playToggle?.();
  };

  const handleShareStreak = async () => {
    const shareText = `⬆️⬇️ HIGHER OR LOWER — Meme Edition\n🔥 Streak: ${streak} (Best: ${bestStreak})\nCan you beat me? https://thememes.net/games/higher-or-lower`;
    try {
      if (navigator.share && typeof window !== 'undefined' && window.innerWidth <= 860) {
        await navigator.share({ title: 'Meme Higher or Lower Streak', text: shareText });
        return;
      }
    } catch {
      // fallback to clipboard
    }
    try {
      await navigator.clipboard?.writeText(shareText);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2200);
    } catch {
      setCopiedNotice(false);
    }
  };

  return (
    <section className="tm-hilow-stage" aria-label="Higher or Lower Meme Edition">
      <header className="tm-hilow-header">
        <div className="tm-hilow-header-left">
          {onBackToFeed && (
            <button type="button" className="tm-hilow-btn" onClick={onBackToFeed}>
              ← Back
            </button>
          )}
          <h1 className="tm-hilow-title">⬆️⬇️ HIGHER OR LOWER</h1>
        </div>
        <div className="tm-hilow-header-right">
          <span className="tm-hilow-badge">🆓 Free Play</span>
          <span className="tm-hilow-streak">🔥 {streak}</span>
          <span className="tm-hilow-best">🏆 Best {bestStreak}</span>
          <RadioToggleButton className="tm-hilow-btn" />
          {onToggleSound && (
            <button
              type="button"
              className="tm-hilow-btn"
              onClick={onToggleSound}
              aria-label={soundOn ? 'Mute SFX' : 'Unmute SFX'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
          )}
          <button
            type="button"
            className="tm-hilow-btn"
            onClick={() => setShowHowToPlay((v) => !v)}
            aria-label="How to play Higher or Lower"
            aria-expanded={showHowToPlay}
          >
            ?
          </button>
        </div>
      </header>

      {showHowToPlay && (
        <div className="tm-hilow-howto" role="dialog" aria-label="How to play Higher or Lower">
          <ul>
            <li>Compare the known meme upvotes on Card A against Card B.</li>
            <li>Tap <strong>⬆️ HIGHER</strong> or <strong>⬇️ LOWER</strong> — correct calls extend your endless streak!</li>
            <li>One miss ends the run and builds a shareable streak card; tap any meme title to inspect it in the feed.</li>
          </ul>
        </div>
      )}

      {!gameOver && leftMeme && rightMeme ? (
        <div className="tm-hilow-arena">
          {/* Card A: Known Score */}
          <article className="tm-hilow-card">
            <img src={leftMeme.image_url} alt={leftMeme.title} className="tm-hilow-img" />
            <div className="tm-hilow-card-body">
              <button
                type="button"
                className="tm-hilow-title-link"
                onClick={() => onInspectMeme?.(leftMeme)}
                title="Inspect meme in theater view"
              >
                {leftMeme.title}
              </button>
              <span className="tm-hilow-meta">
                @{leftMeme.author_name} · #{leftMeme.category}
              </span>
              <div className="tm-hilow-score-pill">👍 {leftMeme.votes.toLocaleString()} upvotes</div>
            </div>
          </article>

          <div className="tm-hilow-vs" aria-hidden="true">
            VS
          </div>

          {/* Card B: Challenger */}
          <article className={`tm-hilow-card ${revealed ? (revealed.correct ? 'is-win' : 'is-loss') : ''}`}>
            <img src={rightMeme.image_url} alt={rightMeme.title} className="tm-hilow-img" />
            <div className="tm-hilow-card-body">
              <button
                type="button"
                className="tm-hilow-title-link"
                onClick={() => onInspectMeme?.(rightMeme)}
                title="Inspect meme in theater view"
              >
                {rightMeme.title}
              </button>
              <span className="tm-hilow-meta">
                @{rightMeme.author_name} · #{rightMeme.category}
              </span>

              {revealed ? (
                <div className="tm-hilow-score-pill is-revealed" aria-live="polite">
                  {revealed.correct ? '✅' : '❌'} {rightMeme.votes.toLocaleString()} upvotes
                </div>
              ) : (
                <div className="tm-hilow-guess-btns">
                  <button
                    type="button"
                    className="tm-hilow-choice is-higher"
                    onClick={() => handleGuess('higher')}
                  >
                    ⬆️ HIGHER
                  </button>
                  <button
                    type="button"
                    className="tm-hilow-choice is-lower"
                    onClick={() => handleGuess('lower')}
                  >
                    ⬇️ LOWER
                  </button>
                </div>
              )}
            </div>
          </article>
        </div>
      ) : (
        <div className="tm-hilow-gameover" aria-live="polite">
          <div className="tm-hilow-share-card">
            <span className="tm-hilow-share-kicker">THE MEMES.NET // HIGHER OR LOWER</span>
            <h2>
              {streak >= bestStreak && streak > 0 ? '🏆 NEW RECORD STREAK!' : '💥 STREAK OVER!'}
            </h2>
            <div className="tm-hilow-big-num">🔥 {streak}</div>
            <p>
              Final miss: &ldquo;{rightMeme?.title}&rdquo; had{' '}
              <strong>{rightMeme?.votes.toLocaleString()}</strong> upvotes vs{' '}
              <strong>{leftMeme?.votes.toLocaleString()}</strong> · Best: {bestStreak}
            </p>
          </div>
          <div className="tm-hilow-gameover-actions">
            <button type="button" className="tm-hilow-share-btn" onClick={handleShareStreak}>
              {copiedNotice ? '✅ Streak Card Copied!' : '📋 Share Streak Card'}
            </button>
            <button type="button" className="tm-hilow-restart-btn" onClick={handleRestart}>
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
