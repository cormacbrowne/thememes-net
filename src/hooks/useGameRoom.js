import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import {
  MP_AVATARS,
  electHost,
  playersFromPresence,
  sanitizeAvatar,
  sanitizePlayerName,
  shouldAcceptState
} from '../utils/multiplayer/roomCore';

const CLIENT_ID_KEY = 'tm_mp_client_v1';
const NAME_KEY = 'tm_mp_name_v1';
const AVATAR_KEY = 'tm_mp_avatar_v1';

function safeSession() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
function safeLocal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** One id per browser tab (sessionStorage), so a reload keeps your seat but two tabs are two players. */
function getClientId() {
  const ss = safeSession();
  let id;
  try {
    id = ss?.getItem(CLIENT_ID_KEY) || null;
  } catch {
    id = null;
  }
  if (!id) {
    id = randomId();
    try {
      ss?.setItem(CLIENT_ID_KEY, id);
    } catch {
      // private mode: a fresh id per load is fine
    }
  }
  return id;
}

/** When this tab first entered the room. Kept across reloads so the host stays the host. */
function getJoinStamp(game, code) {
  const key = `tm_mp_join_${game}_${code}`;
  const ss = safeSession();
  try {
    const saved = Number(ss?.getItem(key));
    if (saved > 0) return saved;
  } catch {
    // ignore
  }
  const now = Date.now();
  try {
    ss?.setItem(key, String(now));
  } catch {
    // ignore
  }
  return now;
}

export function loadMpProfile() {
  const ls = safeLocal();
  let name = null;
  let avatar = null;
  try {
    name = ls?.getItem(NAME_KEY);
    avatar = ls?.getItem(AVATAR_KEY);
    if (!name) {
      const cached = JSON.parse(ls?.getItem('tm_user') || 'null');
      if (cached?.username) name = cached.username;
    }
  } catch {
    // ignore
  }
  const generated = !name || !avatar;
  if (!avatar) avatar = MP_AVATARS[Math.floor(Math.random() * MP_AVATARS.length)];
  const profile = {
    name: sanitizePlayerName(name, `Player${Math.floor(100 + Math.random() * 900)}`),
    avatar: sanitizeAvatar(avatar)
  };
  // Keep a made-up name and icon, so a reload doesn't turn you into someone else.
  if (generated) saveMpProfile(profile);
  return profile;
}

export function saveMpProfile({ name, avatar }) {
  const ls = safeLocal();
  try {
    if (name) ls?.setItem(NAME_KEY, name);
    if (avatar) ls?.setItem(AVATAR_KEY, avatar);
  } catch {
    // ignore
  }
}

/**
 * Realtime game room (Supabase broadcast + presence).
 *
 * - `players`: everyone connected, oldest first. `hostId` = players[0].
 * - `gameState`: last state the host published (null = still in the lobby).
 * - Host only: `publishState(next)` and `setActionHandler(fn)` (fn receives {from, type, data}).
 * - Everyone: `sendAction(type, data)`; on the host this calls the handler directly.
 */
export function useGameRoom({ game, code, profile }) {
  const [clientId] = useState(getClientId);
  const [joinedAt] = useState(() => getJoinStamp(game, code));
  const [status, setStatus] = useState(() => {
    const client = getSupabaseClient();
    return client && typeof client.channel === 'function' && code ? 'connecting' : 'error';
  });
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [clockOffset, setClockOffset] = useState(0);

  const channelRef = useRef(null);
  const subscribedRef = useRef(false);
  const hostIdRef = useRef(null);
  const lastVRef = useRef(-1);
  const stateRef = useRef(null);
  const actionHandlerRef = useRef(null);
  const profileRef = useRef(profile);
  const lastHelloReplyRef = useRef(0);

  const hostId = useMemo(() => electHost(players), [players]);
  const isHost = !!hostId && hostId === clientId;

  useEffect(() => {
    hostIdRef.current = hostId;
  }, [hostId]);

  const sendRaw = useCallback((event, payload) => {
    const ch = channelRef.current;
    if (!ch || !subscribedRef.current) return;
    try {
      ch.send({ type: 'broadcast', event, payload });
    } catch {
      // dropped message: the host re-sends full state regularly
    }
  }, []);

  const publishState = useCallback(
    (next) => {
      lastVRef.current += 1;
      stateRef.current = next;
      setGameState(next);
      sendRaw('state', { from: clientId, v: lastVRef.current, now: Date.now(), state: next });
    },
    [clientId, sendRaw]
  );

  const republish = useCallback(() => {
    if (stateRef.current == null) return;
    sendRaw('state', { from: clientId, v: lastVRef.current, now: Date.now(), state: stateRef.current });
  }, [clientId, sendRaw]);

  const setActionHandler = useCallback((fn) => {
    actionHandlerRef.current = fn;
  }, []);

  const sendAction = useCallback(
    (type, data = {}) => {
      const msg = { from: clientId, type: String(type), data, ts: Date.now() };
      if (hostIdRef.current === clientId) {
        actionHandlerRef.current?.(msg);
        return;
      }
      sendRaw('action', msg);
    },
    [clientId, sendRaw]
  );

  const track = useCallback(
    async (p) => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return;
      try {
        await ch.track({ id: clientId, name: p.name, avatar: p.avatar, joinedAt });
      } catch {
        // ignore
      }
    },
    [clientId, joinedAt]
  );

  useEffect(() => {
    profileRef.current = profile;
    track(profile);
  }, [profile, track]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || typeof client.channel !== 'function' || !code) return undefined;
    const channel = client.channel(`tm-mp:${game}:${code}`, {
      config: { presence: { key: clientId }, broadcast: { self: false, ack: false } }
    });
    channelRef.current = channel;

    const syncPlayers = () => {
      try {
        setPlayers(playersFromPresence(channel.presenceState()));
      } catch {
        setPlayers([]);
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncPlayers)
      .on('presence', { event: 'join' }, syncPlayers)
      .on('presence', { event: 'leave' }, syncPlayers)
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (!payload || payload.from === clientId) return;
        if (!shouldAcceptState(payload, { hostId: hostIdRef.current, lastV: lastVRef.current })) return;
        lastVRef.current = Math.max(lastVRef.current, payload.v);
        stateRef.current = payload.state ?? null;
        setGameState(payload.state ?? null);
        if (typeof payload.now === 'number') setClockOffset(payload.now - Date.now());
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        if (!payload || hostIdRef.current !== clientId) return;
        actionHandlerRef.current?.(payload);
      })
      .on('broadcast', { event: 'hello' }, ({ payload }) => {
        // The host answers every hello. If the elected host itself has no state (it reloaded
        // mid-game), whoever still holds the table sends it back so the game carries on.
        const iAmHost = hostIdRef.current === clientId;
        const hostIsAsking = payload?.from && payload.from === hostIdRef.current && payload.hasState === false;
        if (!iAmHost && !(hostIsAsking && stateRef.current != null)) return;
        const now = Date.now();
        if (now - lastHelloReplyRef.current < 400) return;
        lastHelloReplyRef.current = now;
        republish();
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          subscribedRef.current = true;
          setStatus('open');
          track(profileRef.current);
          sendRaw('hello', { from: clientId, hasState: stateRef.current != null });
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error');
        } else if (s === 'CLOSED') {
          subscribedRef.current = false;
        }
      });

    return () => {
      subscribedRef.current = false;
      channelRef.current = null;
      try {
        client.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [game, code, clientId, republish, sendRaw, track]);

  // A newly elected host (old host left) adopts the latest state it holds, or asks for it.
  useEffect(() => {
    if (!isHost) return;
    if (stateRef.current != null) republish();
    else sendRaw('hello', { from: clientId, hasState: false });
  }, [isHost, republish, sendRaw, clientId]);

  /** Leaving on purpose: rejoining later puts you at the back of the host queue. */
  const forgetSeat = useCallback(() => {
    try {
      safeSession()?.removeItem(`tm_mp_join_${game}_${code}`);
    } catch {
      // ignore
    }
  }, [game, code]);

  return {
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
  };
}
