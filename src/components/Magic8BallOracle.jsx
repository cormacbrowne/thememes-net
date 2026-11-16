import { useState, useRef, useEffect } from 'react';
import { sfx } from '../utils/soundEngine';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import GameShell from './GameShell';
import './Magic8BallOracle.css';

const FORTUNE_BANK = [
  // 9 Auspicious (45% chance -> 2.0x gross payout = 90.0% RTP / 10.0% House Edge)
  { text: 'RADICAL YES! 100% LOCKED', tone: 'positive', code: 'TOTALLY' },
  { text: 'CERTAINLY! FLUX LEVELS MAXED', tone: 'positive', code: 'SYNTH YES' },
  { text: 'OUTLOOK NEON BRIGHT', tone: 'positive', code: 'BRIGHT' },
  { text: 'SIGNS POINT TO MEGA WIN', tone: 'positive', code: 'JACKPOT' },
  { text: 'WITHOUT A DOUBT, DUDE', tone: 'positive', code: 'LOCKED' },
  { text: 'ALL SYSTEMS ARE GO!', tone: 'positive', code: 'ENGAGE' },
  { text: 'YES — HIT THE TURBO NOW', tone: 'positive', code: 'TURBO YES' },
  { text: 'DESTINY SAYS CRUSH IT', tone: 'positive', code: 'COSMIC YES' },
  { text: 'IT IS DECIDEDLY SO', tone: 'positive', code: 'VERIFIED' },

  // 5 Cosmic Neutral (25% chance)
  { text: 'VHS TRACKING FUZZY — TRY AGAIN', tone: 'neutral', code: 'TRACKING' },
  { text: 'COSMIC STATIC — ASK LATER', tone: 'neutral', code: 'STATIC' },
  { text: 'CANNOT PREDICT AT 88 MPH', tone: 'neutral', code: 'WARP HAZE' },
  { text: 'CONCENTRATE & SHAKE AGAIN', tone: 'neutral', code: 'RE-SHAKE' },
  { text: 'REPLY HAZY IN LASER FOG', tone: 'neutral', code: 'HAZY' },

  // 6 Glitch / Doom (30% chance)
  { text: 'BOGUS! DO NOT COUNT ON IT', tone: 'negative', code: 'BOGUS' },
  { text: 'OUTLOOK NOT SO GOOD', tone: 'negative', code: 'NOPE' },
  { text: 'MY SOURCES SAY GAME OVER', tone: 'negative', code: 'GLITCHED' },
  { text: 'VERY DOUBTFUL IN THIS ERA', tone: 'negative', code: 'ABORT' },
  { text: 'LASER SAYS HARD PASS', tone: 'negative', code: 'DENIED' },
  { text: 'TILT DETECTED — ANSWER NO', tone: 'negative', code: 'TILT NO' }
];

const PRESET_QUESTIONS = [
  'Will my meme hit #1 today?',
  'Should I go all-in on MEMEDAQ?',
  'Will the house beat me on Pinball?',
  'Am I destined for Neon Wealth?',
  'Is today a Pizza & Synthwave night?',
  'Will I score a Royal Flush next?'
];

const FATE_STAKES = ARCADE_ECONOMY_RULES.ARCADE_STAKES.EIGHTBALL_BETS || [2, 5, 10];

export default function Magic8BallOracle({
  tokens = 0,
  soundOn,
  onToggleSound,
  onSpendTokens,
  onPayoutTokens,
  onEarnMemeCentz,
  onBackToFeed
}) {
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [stakeMode, setStakeMode] = useState('free'); // 'free' | 2 | 5 | 10
  const [phase, setPhase] = useState('idle'); // 'idle' | 'shaking' | 'revealed'
  const [fortune, setFortune] = useState({
    text: 'ASK & SHAKE THE 80s ORACLE',
    tone: 'neutral',
    code: 'ORACLE 86'
  });
  const [statusMsg, setStatusMsg] = useState(
    'Free readings grant +15¢ MemeCentz! Fate Wagers pay 2.0× on Auspicious prophecies (90% RTP / 10% House Edge).'
  );
  const [history, setHistory] = useState([]);
  const [shakeCount, setShakeCount] = useState(0);
  const [copiedId, setCopiedId] = useState(false);

  const revealTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const isFreeOracle = stakeMode === 'free';
  const numericStake = isFreeOracle ? 0 : Number(stakeMode);

  const handleShakeOracle = (e) => {
    if (phase === 'shaking') return;

    if (!isFreeOracle) {
      if (tokens < numericStake) {
        setStatusMsg(`Need M$${numericStake} MemeDollarz! Switched to Free Oracle (+15¢ per shake).`);
        setStakeMode('free');
        sfx.playSadTrombone?.();
        return;
      }
      if (onSpendTokens && !onSpendTokens(numericStake, '80s Magic 8-Ball Fate Wager')) {
        setStatusMsg(`Need M$${numericStake} MemeDollarz for a Fate Wager!`);
        return;
      }
    }

    setPhase('shaking');
    setShakeCount((c) => c + 1);
    setStatusMsg('Churning neon indigo ether through 1986 synthwave circuits...');
    sfx.playMagic8BallShake?.();

    const rollIdx = Math.floor(Math.random() * FORTUNE_BANK.length);
    const picked = FORTUNE_BANK[rollIdx];

    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      setFortune(picked);
      setPhase('revealed');
      sfx.playMagic8BallReveal?.(picked.tone);

      let outcomeTag = 'Free Prophecy';
      if (isFreeOracle) {
        onEarnMemeCentz?.(3, e, '8-Ball Prophecy');
        outcomeTag = '+3¢ MemeCentz';
        setStatusMsg(`🎱 ORACLE SAYS: "${picked.text}" (+3¢ MemeCentz added!)`);
      } else if (picked.tone === 'positive') {
        const grossWin = numericStake * 2;
        const paid = onPayoutTokens?.(grossWin, {
          stakedTokens: numericStake,
          xp: 30,
          label: `🎱 8-Ball Fate Win +M$${grossWin}`,
          emoji: '🎱',
          maxMultiplier: 4
        });
        const shown = paid ?? grossWin;
        outcomeTag = `+M$${shown} WIN`;
        setStatusMsg(`✨ AUSPICIOUS PROPHECY! Oracle paid M$${shown} MemeDollarz!`);
      } else if (picked.tone === 'neutral') {
        outcomeTag = `-${numericStake} M$ (Haze)`;
        setStatusMsg(`🌫️ Cosmic Static! Fate Wager claimed by the neon void.`);
      } else {
        outcomeTag = `-${numericStake} M$ (House)`;
        setStatusMsg(`💀 Cyber Doom! The House claims M$${numericStake} MemeDollarz.`);
      }

      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          question: question.trim() || 'Silent Cosmic Query',
          answer: picked.text,
          tone: picked.tone,
          outcomeTag
        },
        ...prev.slice(0, 5)
      ]);
    }, 920);
  };

  const handleCopyProphecy = () => {
    const shareText = `🎱 Asked the 80s Neon Magic 8-Ball: "${question}" → "${fortune.text}" #THEMEMES #80sArcade ${window.location.origin}/games/magic-8-ball`;
    navigator.clipboard?.writeText(shareText).catch(() => {});
    sfx.playToggle?.();
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <GameShell
      title="🎱 80s NEON MAGIC 8-BALL ORACLE"
      eyebrow="1986 SYNTHWAVE FORTUNE PREDICTOR"
      ariaLabel="80s Magic 8-Ball Oracle Game"
      className="tm-8ball-shell"
      onBack={onBackToFeed}
      tokens={tokens}
      hasPractice
      practiceMode={isFreeOracle}
      onTogglePractice={() => setStakeMode((prev) => (prev === 'free' ? FATE_STAKES[0] : 'free'))}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      statusBanner={statusMsg}
      howToPlay={[
        'Type any question or pick one of the 80s presets.',
        'Tap or click the 3D Magic 8-Ball (or press SHAKE THE 8-BALL) to stir the mystic indigo dye.',
        'Free Oracle mode rewards +15¢ MemeCentz every shake.',
        'Fate Wager bets M$2–M$10 on an Auspicious (Green/Cyan) outcome paying 2.0× (45% odds = strict 10% House Edge).'
      ]}
    >
      <div className="tm-8ball-layout">
        {/* LEFT / MAIN ORACLE CABINET STAGE */}
        <div className="tm-8ball-stage">
          <div className="tm-8ball-synth-grid" aria-hidden="true" />
          <div className="tm-8ball-scanlines" aria-hidden="true" />

          {/* Floating Cosmic Sparks */}
          <div className="tm-8ball-sparks" aria-hidden="true">
            <span /><span /><span /><span /><span /><span />
          </div>

          <button
            type="button"
            className={`tm-8ball-sphere phase-${phase} tone-${fortune.tone}`}
            onClick={handleShakeOracle}
            aria-label="Shake the 80s Magic 8-Ball"
            title="Tap to shake the 80s Magic 8-Ball!"
          >
            <span className="tm-8ball-rim-glow" aria-hidden="true" />
            <span className="tm-8ball-gloss" aria-hidden="true" />

            {phase === 'idle' && shakeCount === 0 ? (
              <div className="tm-8ball-front-badge" aria-hidden="true">
                <div className="tm-8ball-white-circle">
                  <span>8</span>
                </div>
                <span className="tm-8ball-tap-hint">TAP OR SHAKE</span>
              </div>
            ) : (
              <div className={`tm-8ball-window tone-${fortune.tone}`}>
                <div className="tm-8ball-liquid-swirl" aria-hidden="true" />
                <div className={`tm-8ball-triangle ${phase === 'shaking' ? 'is-tumbling' : 'is-floating'}`}>
                  <svg viewBox="0 0 200 180" className="tm-8ball-tri-svg" aria-hidden="true">
                    <defs>
                      <linearGradient id="tm8TriGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a8a" />
                        <stop offset="55%" stopColor="#312e81" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="100,12 190,168 10,168"
                      fill="url(#tm8TriGrad)"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="tm-8ball-tri-text">
                    {phase === 'shaking' ? 'DIVINING...' : fortune.text}
                  </div>
                </div>
              </div>
            )}
          </button>

          <div className="tm-8ball-readout-bar">
            <span className={`tm-8ball-tone-pill tone-${fortune.tone}`}>
              {phase === 'shaking'
                ? '🌀 CHARGING ETHER'
                : fortune.tone === 'positive'
                ? '✨ AUSPICIOUS OMEN'
                : fortune.tone === 'negative'
                ? '⚡ GLITCH WARNING'
                : '🔮 COSMIC MYSTERY'}
            </span>
            <button
              type="button"
              className="tm-8ball-share-btn"
              onClick={handleCopyProphecy}
            >
              {copiedId ? '✅ Copied Prophecy!' : '📋 Share Fortune'}
            </button>
          </div>
        </div>

        {/* RIGHT / QUESTION, STAKES & HISTORY CONSOLE */}
        <div className="tm-8ball-console">
          <label className="tm-8ball-field-label" htmlFor="tm-8ball-question">
            ASK THE 1986 ORACLE
          </label>
          <input
            id="tm-8ball-question"
            type="text"
            className="tm-8ball-input"
            value={question}
            maxLength={120}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a yes/no question about memes, luck or glory..."
          />

          <div className="tm-8ball-presets" aria-label="Preset Oracle Questions">
            {PRESET_QUESTIONS.map((pq) => (
              <button
                key={pq}
                type="button"
                className={`tm-8ball-preset-chip ${question === pq ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setQuestion(pq);
                }}
              >
                {pq}
              </button>
            ))}
          </div>

          <div className="tm-8ball-stake-section">
            <div className="tm-8ball-stake-head">
              <span>FATE WAGER (2.0× ON AUSPICIOUS • 10% HOUSE EDGE)</span>
            </div>
            <div className="tm-8ball-stake-pills">
              <button
                type="button"
                className={`tm-8ball-stake-btn ${isFreeOracle ? 'active' : ''}`}
                onClick={() => {
                  sfx.playToggle?.();
                  setStakeMode('free');
                }}
              >
                🔮 Free (+15¢)
              </button>
              {FATE_STAKES.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={tokens < amt}
                  className={`tm-8ball-stake-btn ${stakeMode === amt ? 'active' : ''}`}
                  onClick={() => {
                    sfx.playToggle?.();
                    setStakeMode(amt);
                  }}
                >
                  💵 M${amt}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="tm-8ball-shake-cta"
            onClick={handleShakeOracle}
            disabled={phase === 'shaking'}
          >
            {phase === 'shaking'
              ? '🌀 CONSULTING SYNTHWAVE ETHER...'
              : isFreeOracle
              ? '🎱 SHAKE THE 8-BALL (+15¢ MemeCentz)'
              : `🎱 SHAKE FOR DESTINY (Wager M$${numericStake} → Win M$${numericStake * 2})`}
          </button>

          {history.length > 0 && (
            <div className="tm-8ball-history" aria-label="Recent 8-Ball Prophecies">
              <div className="tm-8ball-history-title">RECENT PROPHECIES</div>
              {history.map((item) => (
                <div key={item.id} className={`tm-8ball-history-row tone-${item.tone}`}>
                  <div className="tm-8ball-history-q">Q: {item.question}</div>
                  <div className="tm-8ball-history-a">
                    <strong>{item.answer}</strong>
                    <span>{item.outcomeTag}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
