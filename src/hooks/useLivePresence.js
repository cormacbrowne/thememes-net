import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '../supabaseClient';

const emoteSubscribers = new Map();

function notifyEmoteSubscribers(memeId, payload) {
  const key = String(memeId || '');
  const listeners = emoteSubscribers.get(key);
  if (!listeners || listeners.size === 0) return;
  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribeMemeEmotes(memeId, callback) {
  const key = String(memeId || '');
  if (!key || typeof callback !== 'function') return () => {};
  let set = emoteSubscribers.get(key);
  if (!set) {
    set = new Set();
    emoteSubscribers.set(key, set);
  }
  set.add(callback);
  return () => {
    const cur = emoteSubscribers.get(key);
    if (!cur) return;
    cur.delete(callback);
    if (cur.size === 0) {
      emoteSubscribers.delete(key);
    }
  };
}

/**
 * Phase 28.14: Real Supabase Realtime Presence & Twitch-emote live reactions.
 * Only reports `onlineCount` from genuine connected peers (`>= 2` to display).
 * Never fakes online users or fake emotes.
 */
export function useLivePresence({ username = '' } = {}) {
  const [onlineCount, setOnlineCount] = useState(0);
  const channelRef = useRef(null);
  const onlineCountRef = useRef(0);
  const [sessionKey] = useState(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `tm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const sessionKeyRef = useRef(sessionKey);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || typeof client.channel !== 'function') {
      return undefined;
    }

    const activeSessionKey = sessionKeyRef.current;
    const channel = client.channel('tm:live-presence', {
      config: { presence: { key: activeSessionKey } }
    });

    const syncCount = () => {
      try {
        const state = channel.presenceState ? channel.presenceState() : {};
        const count = Object.keys(state || {}).length;
        onlineCountRef.current = count;
        setOnlineCount(count);
      } catch {
        onlineCountRef.current = 0;
        setOnlineCount(0);
      }
    };

    channel
      .on('presence', { event: 'sync' }, syncCount)
      .on('presence', { event: 'join' }, syncCount)
      .on('presence', { event: 'leave' }, syncCount)
      .on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (!payload || !payload.memeId || !payload.emoji) return;
        // Only float other people's real upvote/reaction emojis
        if (payload.senderKey === activeSessionKey) return;
        notifyEmoteSubscribers(payload.memeId, payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              key: activeSessionKey,
              username: username || 'Memer',
              onlineAt: Date.now()
            });
          } catch {
            // ignore track failures
          }
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      onlineCountRef.current = 0;
      setOnlineCount(0);
      try {
        client.removeChannel(channel);
      } catch {
        // ignore cleanup error
      }
    };
  }, [username]);

  const broadcastEmote = useCallback((memeId, emoji = '🔥') => {
    const ch = channelRef.current;
    if (!ch || !memeId || onlineCountRef.current < 2) return;
    try {
      ch.send({
        type: 'broadcast',
        event: 'emote',
        payload: {
          memeId: String(memeId),
          emoji: String(emoji).slice(0, 4),
          senderKey: sessionKeyRef.current,
          ts: Date.now()
        }
      });
    } catch {
      // ignore broadcast failures
    }
  }, []);

  return {
    onlineCount,
    broadcastEmote
  };
}
