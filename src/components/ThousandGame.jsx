import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import GameShell from './GameShell';
import ThousandTable from './thousand/ThousandTable';
import { sfx } from '../utils/soundEngine';
import { pulse } from '../utils/analytics';
import { thousandStart, thousandReduce, thousandTick } from '../utils/thousand/thousandEngine';
import './thousand/ThousandGame.css';

const ThousandRules = lazy(() => import('./thousand/ThousandRules'));

// 1000 (Tysiąc) vs the computer. The game saves itself, so you can leave and pick it up again.
const SAVE_KEY = 'tm_1000_save_v1';
const SETUP_KEY = 'tm_1000_setup_v1';
const STATS_KEY = 'tm_1000_stats_v1';
const ME = 'you';

const BOTS = [
  { id: 'cpu-1', name: 'Robo Rita', avatar: '🤖' },
  { id: 'cpu-2', name: 'Count Chip', avatar: '🦊' },
  { id: 'cpu-3', name: 'Deep Deck', avatar: '👾' }
];

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — the game still works, it just won't resume */
  }
}

function loadSave() {
  const s = readJson(SAVE_KEY, null);
  return s && s.game === 'thousand' && Array.isArray(s.seats) && s.seats.some((x) => x.id === ME) ? s : null;
}

export default function ThousandGame({ soundOn, onToggleSound, onBackToFeed, onPlayWithFriends }) {
  const [setup, setSetup] = useState(() => ({
    opponents: 2,
    level: 'hard',
    ...readJson(SETUP_KEY, {})
  }));
  const [state, setState] = useState(null);
  const [saved, setSaved] = useState(loadSave);
  const [stats, setStats] = useState(() => ({
    played: 0,
    won: 0,
    ...readJson(STATS_KEY, {})
  }));
  const [rulesOpen, setRulesOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Computer players + pauses between tricks run on a local clock.
  const running = state != null && state.phase !== 'over';
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((cur) => (cur ? thousandTick(cur, t) || cur : cur));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  // Save after every move; count the result once when a game ends.
  const countedRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    if (state.phase === 'over') {
      writeJson(SAVE_KEY, null);
      if (!countedRef.current) {
        countedRef.current = true;
        const won = state.winnerId === ME;
        setStats((cur) => {
          const next = { played: cur.played + 1, won: cur.won + (won ? 1 : 0) };
          writeJson(STATS_KEY, next);
          return next;
        });
        if (won) sfx.playLevelUp?.();
        else sfx.playSadTrombone?.();
        pulse('game_end', { game: 'thousand', result: won ? 'win' : 'loss' });
      }
      return;
    }
    writeJson(SAVE_KEY, state);
  }, [state]);

  const newGame = useCallback(() => {
    const players = [
      { id: ME, name: 'You', avatar: '😎' },
      ...BOTS.slice(0, setup.opponents).map((b) => ({
        ...b,
        bot: true,
        level: setup.level
      }))
    ];
    writeJson(SETUP_KEY, setup);
    countedRef.current = false;
    sfx.playCardDeal?.();
    pulse('game_start', {
      game: 'thousand',
      players: players.length,
      level: setup.level
    });
    setSaved(null);
    setState(thousandStart(players, Date.now(), { timers: false }));
  }, [setup]);

  const resume = () => {
    countedRef.current = false;
    sfx.playCardDeal?.();
    setState(saved);
    setSaved(null);
  };

  const onAction = useCallback((type, data) => {
    const t = Date.now();
    setState((cur) => (cur ? thousandReduce(cur, { from: ME, type, data }, t) || cur : cur));
  }, []);

  const quit = () => {
    sfx.playToggle?.();
    setSaved(state && state.phase !== 'over' ? state : null);
    setState(null);
  };

  const meIdx = state ? state.seats.findIndex((x) => x.id === ME) : -1;

  return (
    <GameShell
      title="1000"
      eyebrow="TYSIĄC • THE CLASSIC CARD GAME"
      titleBadge={<span className="tm-gs-badge tm-gs-badge-accent">FREE • 2–4 PLAYERS</span>}
      showWallet={false}
      onBack={onBackToFeed}
      soundOn={soundOn}
      onToggleSound={onToggleSound}
      sharePath="/games/1000-card-game"
      onPlayWithFriends={onPlayWithFriends}
      friendsLabel="2–4"
      fitToScreen={false}
      howToPlay={[
        'Bid for how many points you can win (starting at 100). The highest bidder takes the musik and must make their bid.',
        'Card points: A 11, 10 10, K 4, Q 3, J 2, 9 0. King + Queen of a suit (a marriage) scores ♥100 ♦80 ♣60 ♠40 and sets trumps.',
        'Follow suit; if you can’t, you must trump. First to 1000 wins. Tap 📖 Rules for the full rules.'
      ]}
    >
      <div className="tk-stage">
        {!state && (
          <div className="tk-setup" data-testid="tk-setup">
            <div className="tk-setup-hero">
              <span className="tk-setup-logo">1000</span>
              <p>
                Bid, take the musik, declare your marriages and race to a thousand. Play the computer here, or tap{' '}
                <b>👥 Friends</b> to send your family a link.
              </p>
            </div>

            {saved && (
              <div className="tk-setup-resume">
                <span>
                  Game in progress — hand {saved.handNo}, you have{' '}
                  <b>{saved.seats.find((x) => x.id === ME)?.score ?? 0}</b>
                </span>
                <button type="button" className="tk-btn is-go" onClick={resume} data-testid="tk-resume">
                  ▶ Resume
                </button>
              </div>
            )}

            <div className="tk-setup-group">
              <span className="tk-actions-label">Players</span>
              <div className="tk-row" role="radiogroup" aria-label="Number of computer opponents">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={setup.opponents === n}
                    className={`tk-btn ${setup.opponents === n ? 'is-on' : ''}`}
                    onClick={() => setSetup((s) => ({ ...s, opponents: n }))}
                    data-testid={`tk-opp-${n}`}
                  >
                    You + {n} computer{n > 1 ? 's' : ''}
                    {n === 2 && <small> (classic)</small>}
                  </button>
                ))}
              </div>
            </div>

            <div className="tk-setup-group">
              <span className="tk-actions-label">Computer</span>
              <div className="tk-row" role="radiogroup" aria-label="Computer strength">
                {[
                  ['easy', '🙂 Relaxed'],
                  ['hard', '🧠 Sharp']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={setup.level === id}
                    className={`tk-btn ${setup.level === id ? 'is-on' : ''}`}
                    onClick={() => setSetup((s) => ({ ...s, level: id }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tk-row">
              <button type="button" className="tk-btn is-go is-big" onClick={newGame} data-testid="tk-deal">
                🃏 {saved ? 'New game' : 'Deal'}
              </button>
              <button
                type="button"
                className="tk-btn is-big"
                onClick={() => setRulesOpen(true)}
                data-testid="tk-setup-rules"
              >
                📖 Rules
              </button>
            </div>
            {stats.played > 0 && (
              <p className="tk-dim">
                Your record: {stats.won} won of {stats.played} played.
              </p>
            )}
          </div>
        )}

        {state && (
          <>
            <ThousandTable
              state={state}
              meIdx={meIdx}
              onAction={onAction}
              now={now}
              footer={
                state.phase !== 'over' ? (
                  <button type="button" className="tk-btn" onClick={quit}>
                    ⏸ Menu
                  </button>
                ) : null
              }
            />
            {state.phase === 'over' && (
              <div className="tk-over" data-testid="tk-over">
                <p className="tk-over-title">
                  {state.winnerId === ME
                    ? '🏆 You win!'
                    : `🏆 ${state.seats.find((x) => x.id === state.winnerId)?.name} wins`}
                </p>
                <div className="tk-row">
                  <button type="button" className="tk-btn is-go is-big" onClick={newGame}>
                    🔁 Play again
                  </button>
                  <button type="button" className="tk-btn is-big" onClick={() => setState(null)}>
                    Menu
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {rulesOpen && (
        <Suspense fallback={null}>
          <ThousandRules onClose={() => setRulesOpen(false)} />
        </Suspense>
      )}
    </GameShell>
  );
}
