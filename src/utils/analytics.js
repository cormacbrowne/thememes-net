import { track } from '@vercel/analytics';

const viewedKeysThisSession = new Set();

function safeTrack(eventName, props = {}) {
  if (typeof window === 'undefined') return;
  try {
    const cleanProps = {};
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined) continue;
      if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        cleanProps[k] = typeof v === 'string' ? v.slice(0, 120) : v;
      } else {
        cleanProps[k] = String(v).slice(0, 120);
      }
    }
    track(eventName, cleanProps);
  } catch {
    // Ignore analytics transport or adblocker errors
  }
}

export function trackMemeViewed(meme, source = 'theater') {
  if (!meme?.id) return;
  const dedupeKey = `${source}:${String(meme.id)}`;
  if (viewedKeysThisSession.has(dedupeKey)) return;
  viewedKeysThisSession.add(dedupeKey);
  safeTrack('meme_viewed', {
    meme_id: String(meme.id),
    category: meme.category || 'unknown',
    media_type: meme.media_type || 'image',
    source
  });
}

export function trackUpvote(memeId, category = 'unknown', weight = 1) {
  if (!memeId) return;
  safeTrack('meme_upvote', {
    meme_id: String(memeId),
    category: category || 'unknown',
    weight: Number(weight) || 1
  });
}

export function trackRemixOpened(meme, mode = 'remix') {
  safeTrack('remix_opened', {
    meme_id: meme?.id ? String(meme.id) : 'blank',
    category: meme?.category || 'unknown',
    mode
  });
}

export function trackMemePublished(meme, mode = 'forge') {
  safeTrack('meme_published', {
    meme_id: meme?.id ? String(meme.id) : 'unknown',
    category: meme?.category || 'dank',
    media_type: meme?.media_type || 'image',
    mode
  });
}

export function trackShareClicked(meme, surface = 'card') {
  safeTrack('share_clicked', {
    meme_id: meme?.id ? String(meme.id) : 'site',
    category: meme?.category || 'site',
    surface
  });
}

export function trackGameStarted(game, mode = 'arcade') {
  if (!game) return;
  safeTrack('game_started', {
    game: String(game),
    mode
  });
}
