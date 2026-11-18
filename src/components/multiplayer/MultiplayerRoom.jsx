import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../utils/soundEngine';
import { pulse } from '../../utils/analytics';
import { useGameRoom, loadMpProfile, saveMpProfile } from '../../hooks/useGameRoom';
import { MP_AVATARS, buildInviteUrl, sanitizePlayerName, splitSeats } from '../../utils/multiplayer/roomCore';
import { MP_GAMES } from '../../utils/multiplayer/mpGames';
import './Multiplayer.css';

const MpPokerTable = lazy(() => import('./MpPokerTable'));
const MpTwentyOneTable = lazy(() => import('./MpTwentyOneTable'));
const MpSerpentArena = lazy(() => import('./MpSerpentArena'));

const BOARDS = { poker: MpPokerTable, blackjack: MpTwentyOneTable, serpent: MpSerpentArena };
const HEARTBEAT_MS = 4000;

function InviteButton({ game, code, myName, compact = false }) {
  const [copied, setCopied] = useState(false);
  const def = MP_GAMES[game];
  const handleInvite = () => {
    if (typeof window === 'undefined') return;
    const url = buildInviteUrl(window.location.origin, def.path, code);
    const text = def.invite(myName);
    navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
    if (typeof navigator.share === 'function') {
      pulse('share', { surface: 'mp_invite', method: 'native', game });
      navigator.share({ title: `${def.title} — THE MEMES.net`, text, url }).catch(() => {});
    } else {
      pulse('share', { surface: 'mp_invite', method: 'copy', game });
    }
    sfx.playPop?.(2);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  return (
    <button
      type="button"
      className={compact ? 'tm-mp-chip-btn' : 'tm-mp-primary'}
      onClick={handleInvite}
      data-testid="mp-invite-btn"
    >
      {copied ? '✓ Link copied' : compact ? '➕ Invite' : '📨 Invite friends'}
    </button>
  );
}

export default function MultiplayerRoom({ game, code, onLeave }) {
  const def = MP_GAMES[game];
  const [profile, setProfile] = useState(loadMpProfile);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const room = useGameRoom({ game, code, profile });
  const {
    clientId,
    status,
    players,
    hostId,
    isHost,
    gameState,
    clockOffset,
    stateRef,
    publishState,
    republish,
    sendAction,
    setActionHandler,
    forgetSeat
  } = room;

  const { seated, watching } = useMemo(() => splitSeats(players, def.maxPlayers), [players, def.maxPlayers]);
  const host = players.find((p) => p.id === hostId);
  const lastPublishRef = useRef(0);

  const publish = useCallback(
    (next) => {
      lastPublishRef.current = Date.now();
      publishState(next);
    },
    [publishState]
  );

  const startGame = useCallback(() => {
    if (!isHost || seated.length < def.minPlayers) return;
    sfx.playCoinInsert?.();
    pulse('game_start', { game: `mp_${game}`, players: seated.length });
    publish(def.start(seated, Date.now()));
  }, [isHost, seated, def, game, publish]);

  const backToLobby = useCallback(() => {
    if (!isHost) return;
    publish(null);
  }, [isHost, publish]);

  // Host: apply actions from every player.
  useEffect(() => {
    setActionHandler((msg) => {
      const cur = stateRef.current;
      if (!cur || !msg) return;
      const next = def.reduce(cur, msg, Date.now());
      if (next && def.publishOnAction) publish(next);
    });
    return () => setActionHandler(null);
  }, [setActionHandler, stateRef, def, publish]);

  const hasState = gameState != null;

  // Host: run the game clock (timeouts, dealer, worm ticks) + a heartbeat for dropped messages.
  useEffect(() => {
    if (!isHost || !hasState) return undefined;
    const id = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const next = def.tick(cur, Date.now());
      if (next) publish(next);
      else if (Date.now() - lastPublishRef.current > HEARTBEAT_MS) {
        lastPublishRef.current = Date.now();
        republish();
      }
    }, def.tickMs);
    return () => clearInterval(id);
  }, [isHost, hasState, def, stateRef, publish, republish]);

  // Host: players joining / leaving mid-game. Also runs when a table state first arrives
  // (a host that reloaded gets the table back from a friend and must mark itself present).
  useEffect(() => {
    if (!isHost || !hasState) return;
    const cur = stateRef.current;
    if (!cur) return;
    const next = def.sync(cur, players);
    if (next) publish(next);
  }, [players, isHost, hasState, def, stateRef, publish]);

  const saveName = () => {
    const name = sanitizePlayerName(nameDraft, profile.name);
    setNameDraft(name);
    if (name === profile.name) return;
    const next = { ...profile, name };
    setProfile(next);
    saveMpProfile(next);
    sfx.playToggle?.();
  };
  const pickAvatar = (avatar) => {
    const next = { ...profile, avatar };
    setProfile(next);
    saveMpProfile(next);
    sfx.playPop?.(1);
  };

  const Board = BOARDS[game];
  const inGame = gameState != null && gameState.game === game;
  const spectator = inGame && !isSeatedInState(gameState, clientId);

  return (
    <section className="tm-mp" aria-label={`${def.title} room ${code}`} data-testid="mp-room">
      <header className="tm-mp-top">
        <button
          type="button"
          className="tm-mp-chip-btn"
          onClick={() => {
            sfx.playToggle?.();
            forgetSeat();
            onLeave?.();
          }}
          data-testid="mp-leave-btn"
        >
          ← Leave
        </button>
        <div className="tm-mp-top-title">
          <span className="tm-mp-eyebrow">
            {def.emoji} PLAY WITH FRIENDS • ROOM <b data-testid="mp-room-code">{code}</b>
          </span>
          <h1 className="tm-mp-title">{def.title}</h1>
        </div>
        <div className="tm-mp-top-right">
          <span className={`tm-mp-conn is-${status}`} title={`Connection: ${status}`}>
            {status === 'open' ? `● ${players.length} here` : status === 'error' ? '● offline' : '● joining…'}
          </span>
          {inGame && <InviteButton game={game} code={code} myName={profile.name} compact />}
        </div>
      </header>

      {status === 'error' && (
        <div className="tm-mp-panel tm-mp-error" role="alert">
          <p>Could not reach the game server. Check your connection, then try again.</p>
          <button type="button" className="tm-mp-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      {status !== 'error' && !inGame && (
        <div className="tm-mp-lobby">
          <div className="tm-mp-panel">
            <p className="tm-mp-blurb">{def.blurb}</p>
            <ol className="tm-mp-seats" data-testid="mp-seats">
              {Array.from({ length: def.maxPlayers }, (_, i) => {
                const p = seated[i];
                return (
                  <li key={p ? p.id : `empty-${i}`} className={`tm-mp-seat ${p ? 'is-filled' : 'is-empty'}`}>
                    {p ? (
                      <>
                        <span className="tm-mp-avatar">{p.avatar}</span>
                        <span className="tm-mp-seat-name">{p.name}</span>
                        {p.id === hostId && <span className="tm-mp-tag is-host">HOST</span>}
                        {p.id === clientId && <span className="tm-mp-tag is-you">YOU</span>}
                      </>
                    ) : (
                      <span className="tm-mp-seat-wait">Waiting for player…</span>
                    )}
                  </li>
                );
              })}
            </ol>
            {watching.length > 0 && (
              <p className="tm-mp-watching">
                👀 Watching: {watching.map((p) => p.name).join(', ')} (table is full)
              </p>
            )}

            <div className="tm-mp-lobby-actions">
              <InviteButton game={game} code={code} myName={profile.name} />
              {isHost ? (
                <button
                  type="button"
                  className="tm-mp-go"
                  disabled={seated.length < def.minPlayers}
                  onClick={startGame}
                  data-testid="mp-start-btn"
                >
                  {seated.length < def.minPlayers
                    ? `Need ${def.minPlayers - seated.length} more player${def.minPlayers - seated.length === 1 ? '' : 's'}`
                    : `▶ Start with ${seated.length}`}
                </button>
              ) : (
                <p className="tm-mp-waiting" data-testid="mp-waiting">
                  {status === 'open' ? `Waiting for ${host?.name || 'the host'} to start…` : 'Joining the room…'}
                </p>
              )}
            </div>
            <p className="tm-mp-fine">
              Send the invite link to up to {def.maxPlayers - 1} friend{def.maxPlayers - 1 === 1 ? '' : 's'}. Free
              table chips only — no MemeDollarz are won or lost in rooms.
            </p>
          </div>

          <div className="tm-mp-panel">
            <label className="tm-mp-label" htmlFor="tm-mp-name">
              Your name at the table
            </label>
            <div className="tm-mp-name-row">
              <input
                id="tm-mp-name"
                className="tm-mp-input"
                value={nameDraft}
                maxLength={16}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                autoComplete="nickname"
                data-testid="mp-name-input"
              />
            </div>
            <div className="tm-mp-avatars" role="radiogroup" aria-label="Pick your icon">
              {MP_AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={profile.avatar === a}
                  className={`tm-mp-avatar-btn ${profile.avatar === a ? 'is-on' : ''}`}
                  onClick={() => pickAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {status !== 'error' && inGame && (
        <Suspense fallback={<div className="tm-mp-panel">Loading table…</div>}>
          {spectator && <p className="tm-mp-spectator">👀 You are watching — the table is full.</p>}
          <Board
            state={gameState}
            me={clientId}
            isHost={isHost}
            hostName={host?.name || 'the host'}
            clockOffset={clockOffset}
            sendAction={sendAction}
            onRematch={startGame}
            onLobby={backToLobby}
            canRematch={isHost && seated.length >= def.minPlayers}
          />
        </Suspense>
      )}
    </section>
  );
}

function isSeatedInState(state, id) {
  const list = state?.seats || state?.snakes || [];
  return list.some((x) => x.id === id);
}
