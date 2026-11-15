// ==========================================
// PHASE 33.17: CREATOR PROFILE DATA, PIXEL AVATAR SELECTION,
// FOLLOWS, BADGES & ARCADE HIGH SCORES (/u/<handle>)
// ==========================================

import { STARTER_MEMES, computePlayerBadges } from '../data/starterMemes.js';
import { getArcadeGameById } from '../data/arcadeGamesCatalog.js';
import { defaultPixelAvatarForHandle, getPixelAvatarById, PIXEL_AVATAR_IDS } from './pixelAvatars.js';

const HANDLE_RE = /^[a-zA-Z0-9_-]{2,32}$/;

export function normalizeCreatorHandle(raw) {
  const clean = String(raw || '').trim().replace(/^@+/, '');
  if (!HANDLE_RE.test(clean)) return null;
  return {
    displayHandle: clean,
    normalized: clean.toLowerCase()
  };
}

export function getCreatorProfilePath(rawHandle) {
  const parsed = normalizeCreatorHandle(rawHandle);
  if (!parsed) return '/';
  return `/u/${encodeURIComponent(parsed.displayHandle)}`;
}

export function extractUniqueCreatorHandles(memes = STARTER_MEMES) {
  const seen = new Map();
  memes.forEach((m) => {
    const parsed = normalizeCreatorHandle(m?.author_name);
    if (!parsed) return;
    const prev = seen.get(parsed.normalized);
    if (!prev) {
      seen.set(parsed.normalized, {
        handle: parsed.displayHandle,
        normalized: parsed.normalized,
        memesCount: 1,
        totalScore: Number(m?.score || 0),
        sampleMeme: m
      });
    } else {
      prev.memesCount += 1;
      prev.totalScore += Number(m?.score || 0);
    }
  });
  return Array.from(seen.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export function formatHighScoreRow(row) {
  const gameInfo = getArcadeGameById(row?.game);
  return {
    game: String(row?.game || 'arcade'),
    title: gameInfo?.title || String(row?.game || 'Arcade').toUpperCase(),
    emoji: gameInfo?.emoji || '🕹️',
    highScore: Number(row?.high_score ?? row?.score ?? 0),
    initials: String(row?.initials || 'AAA').toUpperCase().slice(0, 3),
    achievedAt: row?.achieved_at || row?.created_at || null
  };
}

export function mergeCreatorProfilePayload({
  parsed,
  serverData = null,
  localMemes = [],
  currentUser = null,
  activeCaptionKings = [],
  localHighScores = {}
}) {
  const norm = parsed.normalized;
  const fallbackAvatar = defaultPixelAvatarForHandle(norm);

  const isMe = Boolean(
    currentUser?.username && String(currentUser.username).toLowerCase() === norm
  );

  // Merge server memes + local/starter memes deduplicated by id
  const matchingLocal = (Array.isArray(localMemes) ? localMemes : []).filter(
    (m) => m && String(m.author_name || '').toLowerCase() === norm
  );
  const mergedMap = new Map();
  const serverMemes = Array.isArray(serverData?.memes) ? serverData.memes : [];
  serverMemes.forEach((m) => {
    if (m?.id) mergedMap.set(String(m.id), m);
  });
  matchingLocal.forEach((m) => {
    if (m?.id && !mergedMap.has(String(m.id))) {
      mergedMap.set(String(m.id), m);
    }
  });

  const memes = Array.from(mergedMap.values()).sort(
    (a, b) => Number(b.score || 0) - Number(a.score || 0)
  );

  const totalScore = Math.max(
    Number(serverData?.stats?.total_score || 0),
    memes.reduce((acc, m) => acc + Number(m.score || 0), 0)
  );
  const totalRemixes = Math.max(
    Number(serverData?.stats?.total_remixes || 0),
    memes.reduce((acc, m) => acc + Number(m.mutation_count || 0), 0)
  );
  const memesCount = Math.max(Number(serverData?.stats?.memes_count || 0), memes.length);

  const isCaptionKing = Boolean(
    serverData?.is_caption_king ||
      (Array.isArray(activeCaptionKings) &&
        activeCaptionKings.some((k) => String(k?.author_name || '').toLowerCase() === norm))
  );

  const playerXp = Math.round(totalScore * 0.65) + totalRemixes * 50 + memesCount * 100;
  const badges = computePlayerBadges({
    authoredMemes: memes,
    totalScore,
    totalRemixesSpawned: totalRemixes,
    xp: playerXp,
    isCaptionKing
  });

  // High scores: server authoritativeness first, enriched with local session scores if viewing own profile
  const scoresByGame = new Map();
  const serverScores = Array.isArray(serverData?.high_scores) ? serverData.high_scores : [];
  serverScores.forEach((row) => {
    const formatted = formatHighScoreRow(row);
    scoresByGame.set(formatted.game, formatted);
  });
  if (isMe && localHighScores && typeof localHighScores === 'object') {
    Object.entries(localHighScores).forEach(([gameId, scoreVal]) => {
      const numeric = Number(scoreVal || 0);
      if (numeric <= 0) return;
      const existing = scoresByGame.get(gameId);
      if (!existing || numeric > existing.highScore) {
        scoresByGame.set(
          gameId,
          formatHighScoreRow({
            game: gameId,
            high_score: numeric,
            initials: (currentUser?.username || 'YOU').replace(/[^A-Z0-9]/gi, '').slice(0, 3) || 'YOU'
          })
        );
      }
    });
  }

  const avatarIdRaw =
    (isMe && currentUser?.avatarId) || serverData?.avatar_id || fallbackAvatar.id;
  const resolvedAvatar = PIXEL_AVATAR_IDS.includes(String(avatarIdRaw).toLowerCase())
    ? getPixelAvatarById(avatarIdRaw).id
    : fallbackAvatar.id;

  return {
    ok: true,
    handle: serverData?.handle || parsed.displayHandle,
    normalizedHandle: norm,
    isMe,
    found: Boolean(serverData?.found || memes.length > 0 || scoresByGame.size > 0 || isMe),
    verified: Boolean(serverData?.verified || (isMe && currentUser?.verified)),
    avatarId: resolvedAvatar,
    joinedAt: serverData?.joined_at || null,
    followerCount: Math.max(0, Number(serverData?.follower_count || 0)),
    isFollowing: Boolean(serverData?.is_following),
    isCaptionKing,
    captionWins: Number(serverData?.caption_wins || 0),
    stats: {
      memesCount,
      totalScore,
      totalRemixes,
      playerXp
    },
    badges,
    memes,
    highScores: Array.from(scoresByGame.values()).sort((a, b) => b.highScore - a.highScore)
  };
}

export async function fetchCreatorProfile(
  client,
  rawHandle,
  { localMemes = [], currentUser = null, activeCaptionKings = [], localHighScores = {} } = {}
) {
  const parsed = normalizeCreatorHandle(rawHandle);
  if (!parsed) {
    return { ok: false, error: 'invalid_handle', message: 'Invalid creator handle.' };
  }

  let serverData = null;
  if (client && typeof client.rpc === 'function') {
    try {
      const { data, error } = await client.rpc('get_creator_profile', {
        p_handle: parsed.normalized
      });
      if (!error && data?.ok) {
        serverData = data;
      }
    } catch {
      // Offline / mock fallback below
    }
  }

  return mergeCreatorProfilePayload({
    parsed,
    serverData,
    localMemes,
    currentUser,
    activeCaptionKings,
    localHighScores
  });
}

export async function toggleFollowCreator(client, rawHandle, nextActive = null) {
  const parsed = normalizeCreatorHandle(rawHandle);
  if (!parsed) {
    return { ok: false, error: 'invalid_handle', message: 'Invalid creator handle.' };
  }
  if (!client || typeof client.rpc !== 'function') {
    return {
      ok: false,
      error: 'offline',
      message: 'Sign in with a connected account to follow creators.'
    };
  }
  try {
    const { data, error } = await client.rpc('toggle_follow_creator', {
      p_handle: parsed.normalized,
      p_active: nextActive
    });
    if (error) {
      return {
        ok: false,
        error: error.message || 'follow_failed',
        message: error.message || 'Could not update follow status.'
      };
    }
    if (!data?.ok) {
      return {
        ok: false,
        error: data?.error || 'follow_failed',
        message: data?.message || 'Could not update follow status.'
      };
    }
    return {
      ok: true,
      handle: data.handle || parsed.normalized,
      following: Boolean(data.following),
      followerCount: Number(data.follower_count || 0)
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'network_error',
      message: 'Could not reach server to update follow status.'
    };
  }
}

export async function saveMyPixelAvatar(client, avatarId) {
  const clean = String(avatarId || '').trim().toLowerCase();
  if (!PIXEL_AVATAR_IDS.includes(clean)) {
    return {
      ok: false,
      error: 'invalid_avatar',
      message: 'Pick one of the built-in pixel-art avatars.'
    };
  }
  if (!client || typeof client.rpc !== 'function') {
    return { ok: false, error: 'offline', message: 'Connect to save your pixel avatar.' };
  }
  try {
    const { data, error } = await client.rpc('set_my_avatar', { p_avatar_id: clean });
    if (error || !data?.ok) {
      return {
        ok: false,
        error: data?.error || error?.message || 'avatar_failed',
        message: data?.message || error?.message || 'Could not save pixel avatar.'
      };
    }
    return {
      ok: true,
      avatarId: data.avatar_id || clean
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'network_error',
      message: 'Could not reach server to save pixel avatar.'
    };
  }
}
