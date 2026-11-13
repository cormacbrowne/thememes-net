import { useState, useEffect, useRef, useMemo } from 'react';
import { STUDIO_TEMPLATES } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';
import { triggerWinCelebration } from '../utils/winCelebration';
import GameShell from './GameShell';
import './GuessTheMemeGame.css';

// ==========================================
// GUESS THE MEME: DAILY (Phase 29.9)
//
// ECONOMY & HOUSE EDGE NOTE:
//   - 100% Free-to-Play daily trivia / growth loop (0 tokens wagered, 0% house edge).
//   - Date-seeded deterministic PRNG gives every visitor on earth the exact same
//     5 meme templates each day, with progressive 5-step canvas pixelation.
//   - Tracks current/best daily streak in localStorage (`tm_guess_meme_v1`).
// ==========================================

const STORAGE_KEY = 'tm_guess_meme_v1';
const CLARITY_SIZES = [
  [10, 9],
  [18, 16],
  [34, 30],
  [68, 60],
  [150, 134]
];

function createSeededRng(seed) {
  let a = (seed >>> 0) || 98765;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getLocalDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPuzzleNumber(dateKey) {
  const epoch = Date.UTC(2026, 0, 1);
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = Date.UTC(y, (m || 1) - 1, d || 1);
  return Math.max(1, Math.floor((target - epoch) / 86400000) + 1);
}

function dateHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateRoundSet(seedNum) {
  const rng = createSeededRng(seedNum);
  const pool = [...STUDIO_TEMPLATES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 5);
  return chosen.map((answer) => {
    const others = STUDIO_TEMPLATES.filter((t) => t.id !== answer.id);
    for (let i = others.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const options = [answer, ...others.slice(0, 3)];
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { answer, options };
  });
}

function loadSavedProgress(todayKey) {
  const fresh = {
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    dailyDate: todayKey,
    dailyResults: null // array of { won, stepUsed, points, emoji }
  };
  if (typeof window === 'undefined') return fresh;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return fresh;
    return {
      streak: Math.max(0, Number(raw.streak) || 0),
      bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
      lastCompletedDate: typeof raw.lastCompletedDate === 'string' ? raw.lastCompletedDate : null,
      dailyDate: raw.dailyDate === todayKey ? todayKey : todayKey,
      dailyResults: raw.dailyDate === todayKey && Array.isArray(raw.dailyResults) ? raw.dailyResults : null
    };
  } catch {
    return fresh;
  }
}

export default function GuessTheMemeGame({
  soundOn = true,
  onToggleSound,
  onBackToFeed
}) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const puzzleNumber = useMemo(() => getPuzzleNumber(todayKey), [todayKey]);

  const [savedState, setSavedState] = useState(() => loadSavedProgress(todayKey));
  const [practiceRunSeed, setPracticeRunSeed] = useState(0); // 0 = Today's Daily; >0 = Endless Practice
  const isPracticeRun = practiceRunSeed > 0;

  const rounds = useMemo(
    () => generateRoundSet(isPracticeRun ? practiceRunSeed : dateHash(`tm-guess-${todayKey}`)),
    [isPracticeRun, practiceRunSeed, todayKey]
  );

  const [roundIdx, setRoundIdx] = useState(0);
  const [clarityStep, setClarityStep] = useState(1); // 1..5 (higher = sharper)
  const [wrongIds, setWrongIds] = useState([]);
  const [roundOutcome, setRoundOutcome] = useState(null); // { won, points, emoji } | null
  const [results, setResults] = useState(() =>
    !isPracticeRun && savedState.dailyResults ? savedState.dailyResults : []
  );
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [imgLoadedTick, setImgLoadedTick] = useState(0);

  const canvasRef = useRef(null);
  const loadedImgRef = useRef(null);

  const isFinished = results.length >= rounds.length;
  const activeRound = rounds[Math.min(roundIdx, rounds.length - 1)];

  // Load current round image cleanly for canvas pixelation
  useEffect(() => {
    if (isFinished || !activeRound) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      loadedImgRef.current = img;
      setImgLoadedTick((n) => n + 1);
    };
    img.src = activeRound.answer.src;
    return () => {
      cancelled = true;
    };
  }, [activeRound, isFinished]);

  // Render pixelated (or unblurred upon reveal) meme canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = loadedImgRef.current;
    if (!canvas || !img || isFinished) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);

    if (roundOutcome) {
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.drawImage(img, 0, 0, w, h);
      return;
    }

    const [pxW, pxH] = CLARITY_SIZES[Math.min(clarityStep - 1, CLARITY_SIZES.length - 1)];
    const off = document.createElement('canvas');
    off.width = pxW;
    off.height = pxH;
    const offCtx = off.getContext('2d');
    if (offCtx) {
      offCtx.drawImage(img, 0, 0, pxW, pxH);
      ctx2d.imageSmoothingEnabled = false;
      ctx2d.drawImage(off, 0, 0, pxW, pxH, 0, 0, w, h);
    }
  }, [clarityStep, imgLoadedTick, isFinished, roundOutcome]);

  const recordRoundComplete = (outcome) => {
    const nextResults = [...results, outcome];
    setRoundOutcome(outcome);
    setResults(nextResults);

    if (!isPracticeRun && nextResults.length >= rounds.length) {
      const wonCount = nextResults.filter((r) => r.won).length;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const nextStreak =
        wonCount >= 3
          ? savedState.lastCompletedDate === yKey
            ? savedState.streak + 1
            : savedState.lastCompletedDate === todayKey
              ? Math.max(1, savedState.streak)
              : 1
          : 0;
      const nextBest = Math.max(savedState.bestStreak, nextStreak);
      const nextSaved = {
        streak: nextStreak,
        bestStreak: nextBest,
        lastCompletedDate: todayKey,
        dailyDate: todayKey,
        dailyResults: nextResults
      };
      setSavedState(nextSaved);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const handleGuess = (tpl) => {
    if (roundOutcome || wrongIds.includes(tpl.id)) return;
    if (tpl.id === activeRound.answer.id) {
      const pts = Math.max(20, (6 - clarityStep) * 20);
      const emoji = clarityStep <= 2 ? '🟩' : '🟨';
      triggerWinCelebration({
        amount: pts,
        unit: 'PTS',
        game: 'Guess The Meme',
        headline: clarityStep <= 2 ? '🧠 EAGLE EYE! NAILED IT!' : '✅ CORRECT MEME!',
        detail: `${activeRound.answer.title || activeRound.answer.name || 'Meme'} • Step ${clarityStep}/5`,
        multiplier: clarityStep <= 2 ? 4 : 2,
        tier: clarityStep <= 2 ? 'big' : 'win'
      });
      recordRoundComplete({ won: true, stepUsed: clarityStep, points: pts, emoji });
      return;
    }

    sfx.playClownHonk?.();
    const nextWrong = [...wrongIds, tpl.id];
    setWrongIds(nextWrong);
    if (nextWrong.length >= 3) {
      // Missed all 3 guesses for this meme
      recordRoundComplete({ won: false, stepUsed: 5, points: 0, emoji: '⬛' });
    } else {
      setClarityStep((s) => Math.min(5, s + 1));
    }
  };

  const handleEnhance = () => {
    if (roundOutcome || clarityStep >= 5) return;
    sfx.playClick();
    setClarityStep((s) => Math.min(5, s + 1));
  };

  const handleNextMeme = () => {
    if (!roundOutcome) return;
    setRoundIdx((i) => i + 1);
    setClarityStep(1);
    setWrongIds([]);
    setRoundOutcome(null);
  };

  const startEndlessPractice = () => {
    sfx.playToggle();
    setPracticeRunSeed(Date.now());
    setRoundIdx(0);
    setClarityStep(1);
    setWrongIds([]);
    setRoundOutcome(null);
    setResults([]);
    setCopiedNotice(false);
  };

  const totalScore = results.reduce((s, r) => s + r.points, 0);
  const solvedCount = results.filter((r) => r.won).length;
  const shareGrid = results.map((r) => r.emoji).join('');

  const handleCopyShare = async () => {
    const shareText = `${shareGrid} THE MEMES.net #${puzzleNumber} (${solvedCount}/5 · ${totalScore} pts)\n🔥 Streak: ${savedState.streak}\nhttps://thememes.net/games/guess-the-meme`;
    try {
      if (navigator.share && typeof window !== 'undefined' && window.innerWidth <= 860) {
        await navigator.share({ title: `Guess The Meme #${puzzleNumber}`, text: shareText });
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
    <GameShell
      title={`🧠 GUESS THE MEME ${!isPracticeRun ? `#${puzzleNumber}` : '· Practice'}`}
      ariaLabel="Guess The Meme Daily Game"
      onBack={onBackToFeed}
      showWallet={false}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      extraBadges={
        <>
          <span className="tm-guess-badge">🆓 Free Play</span>
          <span className="tm-guess-streak" title="Daily streak (3+/5 keeps streak alive)">
            🔥 {savedState.streak}
          </span>
        </>
      }
      howToPlay={[
        'Each day features 5 pixelated meme templates shared worldwide.',
        'Pick the format from 4 options — fewer clues gives up to 100 pts.',
        'Solve 3+ in a day to grow your streak and copy your share grid.'
      ]}
    >
      <div className="tm-guess-stage">

      {!isFinished ? (
        <div className="tm-guess-card">
          <div className="tm-guess-progress-row">
            <span>
              Meme {roundIdx + 1} / {rounds.length}
            </span>
            <div className="tm-guess-dots" aria-label="Round progress">
              {rounds.map((_, idx) => {
                const done = results[idx];
                return (
                  <span
                    key={idx}
                    className={`tm-guess-dot ${idx === roundIdx ? 'is-current' : ''} ${
                      done ? (done.won ? 'is-won' : 'is-lost') : ''
                    }`}
                  >
                    {done ? (done.won ? '✓' : '✕') : idx + 1}
                  </span>
                );
              })}
            </div>
            <span>Score: {totalScore}</span>
          </div>

          <div className="tm-guess-canvas-wrap">
            <canvas ref={canvasRef} width={360} height={320} className="tm-guess-canvas" />
            <div className="tm-guess-clarity-bar">
              <span>Clarity Step {clarityStep} / 5</span>
              <span>Worth {Math.max(20, (6 - clarityStep) * 20)} pts</span>
            </div>
          </div>

          {roundOutcome ? (
            <div className={`tm-guess-feedback ${roundOutcome.won ? 'is-win' : 'is-miss'}`} aria-live="polite">
              <strong>
                {roundOutcome.won
                  ? `${roundOutcome.emoji} Nailed it! +${roundOutcome.points} pts`
                  : `⬛ Out of tries — it was "${activeRound.answer.name}"`}
              </strong>
              <button type="button" className="tm-guess-next-btn" onClick={handleNextMeme}>
                {roundIdx + 1 >= rounds.length ? '📊 See Final Score →' : 'Next Meme →'}
              </button>
            </div>
          ) : (
            <div className="tm-guess-actions-row">
              <button
                type="button"
                className="tm-guess-enhance-btn"
                disabled={clarityStep >= 5}
                onClick={handleEnhance}
              >
                🔍 Enhance Clarity ({clarityStep}/5)
              </button>
              <span className="tm-guess-lives">Lives left: {'❤️'.repeat(3 - wrongIds.length)}</span>
            </div>
          )}

          <div className="tm-guess-options">
            {activeRound.options.map((opt) => {
              const isWrong = wrongIds.includes(opt.id);
              const isAnswer = Boolean(roundOutcome) && opt.id === activeRound.answer.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(roundOutcome) || isWrong}
                  className={`tm-guess-opt ${isWrong ? 'is-wrong' : ''} ${isAnswer ? 'is-correct' : ''}`}
                  onClick={() => handleGuess(opt)}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="tm-guess-summary" aria-live="polite">
          <h2>
            {isPracticeRun
              ? `🎮 Practice Clear: ${solvedCount}/5`
              : `🏆 Daily #${puzzleNumber} Complete!`}
          </h2>
          <div className="tm-guess-share-box">
            <div className="tm-guess-share-emoji">{shareGrid}</div>
            <p>
              <strong>{solvedCount}/5 solved</strong> · {totalScore} pts · 🔥 Streak: {savedState.streak} (Best:{' '}
              {savedState.bestStreak})
            </p>
          </div>
          <div className="tm-guess-summary-actions">
            <button type="button" className="tm-guess-share-btn" onClick={handleCopyShare}>
              {copiedNotice ? '✅ Copied Share Grid!' : '📋 Share Result Grid'}
            </button>
            <button type="button" className="tm-guess-practice-btn" onClick={startEndlessPractice}>
              🎲 Play Practice Set
            </button>
          </div>
        </div>
      )}
      </div>
    </GameShell>
  );
}
