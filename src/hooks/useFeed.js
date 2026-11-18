import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { readCachedHiddenSeeds, fetchHiddenSeeds } from '../utils/hiddenSeeds';
import { sfx } from '../utils/soundEngine';
import { haptic } from '../utils/juice';
import { triggerWinCelebration } from '../utils/winCelebration';
import { loadImageFromFileOrBlob } from '../utils/canvasMutator';
import {
  makeTextLayer,
  buildFallbackCaptionLayers,
  burnInAnimatedGif,
  renderStillImageBlob,
  drawLayers,
  ensureFontsLoaded
} from '../components/forge/forgeEngine';
import {
  STARTER_MEMES,
  isSeedMeme,
  formatMemeUploadDate
} from '../data/starterMemes';
import { ARCADE_ECONOMY_RULES, formatMoney } from '../utils/tokenEconomy';
import {
  trackUpvote,
  trackRemixOpened,
  trackMemePublished,
  trackShareClicked,
  pulse
} from '../utils/analytics';

function classifyPublishRefusal(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('rate') || msg.includes('limit') || msg.includes('cooldown') || msg.includes('429')) {
    return 'rate_limit';
  }
  if (msg.includes('moderat') || msg.includes('policy') || msg.includes('banned') || msg.includes('nsfw') || msg.includes('rejected')) {
    return 'moderation';
  }
  if (msg.includes('auth') || msg.includes('sign') || msg.includes('session')) {
    return 'auth';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network';
  }
  if (msg.includes('size') || msg.includes('type') || msg.includes('invalid') || msg.includes('empty')) {
    return 'validation';
  }
  return 'unknown';
}
import { publishMeme, PENDING_REVIEW_MESSAGE } from '../utils/publishMeme';
import {
  postComment,
  precheckTexts,
  textRejectionMessage,
  consumeJustCreatedAnonHandle,
  nextVoteState,
  castVote as castVoteRpc,
  toggleReaction as toggleReactionRpc,
  deleteComment as deleteCommentRpc
} from '../utils/serverWrites';
import { submitReport } from '../utils/reports';
import { PUBLIC_UPLOADS_ENABLED, UPLOADS_PAUSED_ERROR } from '../config/featureFlags';
import { validateFile, canvasToCompressedBlob, makePoster } from '../utils/mediaPipeline';
import { sanitizeMediaUrl } from '../utils/securityGuard';

function sanitizeMemeUrls(meme) {
  if (!meme || typeof meme !== 'object') return meme;
  return {
    ...meme,
    image_url: sanitizeMediaUrl(meme.image_url, ''),
    poster_url: meme.poster_url ? sanitizeMediaUrl(meme.poster_url, '') || null : null,
    base_image_url: meme.base_image_url ? sanitizeMediaUrl(meme.base_image_url, '') || null : null
  };
}
import { recordPublishDailyPerk } from '../utils/memeFeedBridge';
import {
  getDailyCaptionBattle,
  getBattleEntriesForBattle
} from '../utils/dailyCaptionBattle';
import {
  fetchCreatorNotifications,
  markCreatorNotificationsRead
} from '../utils/notifications';
import {
  FEED_PAGE_SIZE,
  computeHotScore,
  fetchMemeComments,
  fetchMemesFeedPage,
  getTopWindowStartIso,
  normalizeSortMode
} from '../utils/feedPagination';

/**
 * Manages the community meme feed: Supabase sync, realtime subscriptions,
 * votes, reactions, comments, publishing (Quick Upload & Meme Forge),
 * evolution trees, bookmarks, moderation, infinite scroll, Swipe Deck & Battle Arena.
 */
export function useFeed({
  router,
  economy,
  user,
  authUserId = null,
  litePerfMode,
  broadcastEmote,
  setGoblinFortuneToast,
  setScreenPunch
}) {
  const {
    category,
    viewMode,
    searchQuery,
    showSavedOnly,
    sortBy,
    setSortBy,
    topWindow = 'all',
    setShowStudio,
    setForgeIntent,
    theaterMemeId,
    setEvolutionModalMeme,
    setLiveCelebrationData
  } = router;

  const {
    combo,
    setXp,
    awardXpOnly,
    awardFairReward,
    incrementQuest,
    addCappedWheelSpins,
    awardUploadTokensWithPioneerCheck,
    claimStarterPackIfFirst
  } = economy;

  const [memes, setMemes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tm_user_memes') || '[]');
      const userUploads = Array.isArray(saved)
        ? saved.filter((m) => m && !isSeedMeme(m)).map(sanitizeMemeUrls).filter((m) => m.image_url)
        : [];
      const seen = new Set(userUploads.map((m) => String(m.id)));
      return [...userUploads, ...STARTER_MEMES.filter((m) => !seen.has(String(m.id)))];
    } catch {
      return [...STARTER_MEMES];
    }
  });
  const [hiddenSeeds, setHiddenSeeds] = useState(() => readCachedHiddenSeeds());
  useEffect(() => {
    let alive = true;
    fetchHiddenSeeds().then((set) => {
      if (alive && set) setHiddenSeeds(set);
    });
    return () => {
      alive = false;
    };
  }, []);
  const feedMemes = useMemo(
    () =>
      hiddenSeeds.size
        ? memes.filter((m) => !(m?.is_seed && hiddenSeeds.has(String(m.id))))
        : memes,
    [memes, hiddenSeeds]
  );
  const memesRef = useRef(memes);
  useEffect(() => {
    memesRef.current = memes;
  }, [memes]);

  // Owner brief 17 Nov 2026 (item 1): show skeleton cards until the live feed answers, instead of
  // painting the built-in starter memes first and then shuffling live ones in on top of them.
  const [isLoadingFeed, setIsLoadingFeed] = useState(() => Boolean(getSupabaseClient()));
  useEffect(() => {
    if (!isLoadingFeed) return undefined;
    const t = setTimeout(() => setIsLoadingFeed(false), 6000); // offline / slow network fallback
    return () => clearTimeout(t);
  }, [isLoadingFeed]);
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const [hasMoreServer, setHasMoreServer] = useState(false);
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false);
  const [loadingCommentsMap, setLoadingCommentsMap] = useState({});
  const feedCursorRef = useRef(null);
  const isFetchingPageRef = useRef(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_saved_memes') || '[]');
    } catch {
      return [];
    }
  });
  const [dbStatus, setDbStatus] = useState('connecting');

  // Fork & Mutate + Evolution Tree State
  const [mutatingParentMeme, setMutatingParentMeme] = useState(null);
  const [evolutionNodes, setEvolutionNodes] = useState([]);
  const [loadingEvolution, setLoadingEvolution] = useState(false);

  // Daily Caption Battle & Creator Profiles State
  const [activeBounty, setActiveBounty] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [bountiesCompleted, setBountiesCompleted] = useState(() =>
    Number(localStorage.getItem('tm_bounties') || 0)
  );
  const [royaltiesMap, setRoyaltiesMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_royalties') || '{}');
    } catch {
      return {};
    }
  });

  // Moderation & Infinite Scroll Refs
  const [reportedMemeIds, setReportedMemeIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_reported') || '[]');
    } catch {
      return [];
    }
  });
  const [moderationToast, setModerationToast] = useState('');
  // 33.5: report sheet target ({ kind: 'meme', meme } | { kind: 'comment', comment, meme })
  const [reportTarget, setReportTarget] = useState(null);
  const [hiddenCommentIds, setHiddenCommentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_hidden_comments') || '[]');
    } catch {
      return [];
    }
  });
  const hiddenCommentIdsRef = useRef(hiddenCommentIds);
  const lastPublishTimeRef = useRef(0);
  const loadMoreSentinelRef = useRef(null);

  // Engagement Maps (Votes, Unlocks, Reactions)
  const [userVotes, setUserVotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_votes') || '{}');
    } catch {
      return {};
    }
  });
  const [votesCastCount, setVotesCastCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(localStorage.getItem('tm_votes_cast_count') || 0);
    if (saved > 0) return saved;
    try {
      return Object.values(JSON.parse(localStorage.getItem('tm_votes') || '{}')).filter((v) => v > 0)
        .length;
    } catch {
      return 0;
    }
  });
  const [petUnlocked, setPetUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      localStorage.getItem('tm_pet_unlocked') === 'true' ||
      Number(localStorage.getItem('tm_votes_cast_count') || 0) >= 3
    );
  });
  const [aiUnlocked, setAiUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('tm_first_meme_created') === 'true';
  });
  const [userReactionsMap, setUserReactionsMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user_reactions') || '{}');
    } catch {
      return {};
    }
  });

  // Drag & Paste + Comments + Swipe + Battle State
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState('');
  const [battlePair, setBattlePair] = useState([0, 1]);
  const [battleWinner, setBattleWinner] = useState(null);
  const [battleStreak, setBattleStreak] = useState(0);
  const [championWins, setChampionWins] = useState(0);
  const [crowdAgreement, setCrowdAgreement] = useState(null);

  useEffect(() => {
    localStorage.setItem('tm_votes', JSON.stringify(userVotes));
  }, [userVotes]);

  useEffect(() => {
    localStorage.setItem('tm_user_reactions', JSON.stringify(userReactionsMap));
  }, [userReactionsMap]);

  useEffect(() => {
    localStorage.setItem('tm_bounties', String(bountiesCompleted));
  }, [bountiesCompleted]);

  useEffect(() => {
    localStorage.setItem('tm_royalties', JSON.stringify(royaltiesMap));
  }, [royaltiesMap]);

  useEffect(() => {
    localStorage.setItem('tm_reported', JSON.stringify(reportedMemeIds));
  }, [reportedMemeIds]);

  useEffect(() => {
    hiddenCommentIdsRef.current = hiddenCommentIds;
    try {
      localStorage.setItem('tm_hidden_comments', JSON.stringify(hiddenCommentIds.slice(-500)));
    } catch {
      // storage full or blocked: hiding still works for this visit
    }
  }, [hiddenCommentIds]);

  useEffect(() => {
    localStorage.setItem('tm_saved_memes', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  useEffect(() => {
    try {
      const localOnly = memes
        .filter((m) => m && !isSeedMeme(m))
        .slice(0, 20)
        .map((m) => {
          if (m.image_url && m.image_url.startsWith('data:') && m.image_url.length > 120000) {
            return { ...m, image_url: '' };
          }
          return m;
        });
      localStorage.setItem('tm_user_memes', JSON.stringify(localOnly));
    } catch {
      // Ignore storage quota if browser storage is restricted
    }
  }, [memes]);

  const dailyBattle = useMemo(() => getDailyCaptionBattle(), []);
  const battleEntriesCount = useMemo(
    () => getBattleEntriesForBattle(memes, dailyBattle).length,
    [memes, dailyBattle]
  );
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const normalizeServerMemeRow = useCallback((row) => {
    const inlineComments = Array.isArray(row.comments)
      ? row.comments.filter((c) => c && !hiddenCommentIdsRef.current.includes(String(c.id)))
      : [];
    const serverCommentsCount = Number(row.comments_count);
    return sanitizeMemeUrls({
      ...row,
      generation: row.generation || 0,
      mutation_count: row.mutation_count || 0,
      reactions: row.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 },
      hot_score: row.hot_score ?? null,
      comments_count: Number.isFinite(serverCommentsCount)
        ? serverCommentsCount
        : inlineComments.length,
      commentsLoaded: inlineComments.length > 0,
      comments: inlineComments
    });
  }, []);

  // Supabase Feed Sync (cursor-paginated SQL view `memes_feed_view`, no `comments(*)`) & Realtime
  const fetchSupabaseMemes = useCallback(
    async ({ cursor = null, append = false } = {}) => {
      const client = getSupabaseClient();
      if (!client) {
        setDbStatus('local');
        setHasMoreServer(false);
        setIsLoadingFeed(false);
        return;
      }
      if (isFetchingPageRef.current && append) return;
      isFetchingPageRef.current = true;
      if (append) setIsLoadingMoreFeed(true);

      try {
        const res = await fetchMemesFeedPage(client, {
          sortBy,
          topWindow,
          category,
          cursor,
          pageSize: FEED_PAGE_SIZE
        });

        if (!res.ok) {
          setDbStatus('local');
          setHasMoreServer(false);
          setIsLoadingFeed(false);
          setIsLoadingMoreFeed(false);
          isFetchingPageRef.current = false;
          return;
        }

        setDbStatus('live');
        setHasMoreServer(Boolean(res.hasMore));
        feedCursorRef.current = res.nextCursor || null;

        const normalized = res.items.map(normalizeServerMemeRow);
        setMemes((prev) => {
          const localUserUploads = prev.filter(
            (m) => m && String(m.id).startsWith('local-')
          );
          const prevSeedsById = new Map(
            prev.filter((m) => m && isSeedMeme(m)).map((m) => [String(m.id), m])
          );

          let serverRows;
          if (append) {
            const prevServer = prev.filter(
              (m) => m && !isSeedMeme(m) && !String(m.id).startsWith('local-')
            );
            const mergedMap = new Map(prevServer.map((m) => [String(m.id), m]));
            normalized.forEach((m) => {
              const prevMatch = mergedMap.get(String(m.id));
              mergedMap.set(
                String(m.id),
                prevMatch?.commentsLoaded
                  ? { ...m, comments: prevMatch.comments, commentsLoaded: true }
                  : m
              );
            });
            serverRows = Array.from(mergedMap.values());
          } else {
            const prevServerById = new Map(
              prev
                .filter((m) => m && !isSeedMeme(m) && !String(m.id).startsWith('local-'))
                .map((m) => [String(m.id), m])
            );
            serverRows = normalized.map((m) => {
              const prevMatch = prevServerById.get(String(m.id));
              return prevMatch?.commentsLoaded
                ? { ...m, comments: prevMatch.comments, commentsLoaded: true }
                : m;
            });
          }

          const liveIds = new Set(serverRows.map((m) => String(m.id)));
          const dedupedLocal = localUserUploads.filter((m) => !liveIds.has(String(m.id)));
          const mergedSeeds = STARTER_MEMES
            .filter((m) => !liveIds.has(String(m.id)))
            .map((m) => prevSeedsById.get(String(m.id)) || m);

          return [...serverRows, ...dedupedLocal, ...mergedSeeds];
        });
        setVisibleCount((prev) =>
          append ? prev + normalized.length : Math.max(FEED_PAGE_SIZE, normalized.length)
        );
        setIsLoadingFeed(false);
        setIsLoadingMoreFeed(false);
        isFetchingPageRef.current = false;
      } catch {
        setDbStatus('local');
        setHasMoreServer(false);
        setIsLoadingFeed(false);
        setIsLoadingMoreFeed(false);
        isFetchingPageRef.current = false;
      }
    },
    [sortBy, topWindow, category, normalizeServerMemeRow]
  );

  const loadNextFeedPage = useCallback(async () => {
    setVisibleCount((prev) => prev + FEED_PAGE_SIZE);
    if (!hasMoreServer || !feedCursorRef.current || isLoadingMoreFeed) return;
    await fetchSupabaseMemes({ cursor: feedCursorRef.current, append: true });
  }, [fetchSupabaseMemes, hasMoreServer, isLoadingMoreFeed]);

  useEffect(() => {
    feedCursorRef.current = null;
    const client = getSupabaseClient();
    Promise.resolve().then(() => {
      setVisibleCount(FEED_PAGE_SIZE);
      fetchSupabaseMemes({ cursor: null, append: false });
    });

    let channel = null;
    if (client && client.channel) {
      channel = client
        .channel('public:memes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, () => {
          fetchSupabaseMemes({ cursor: null, append: false });
        })
        .subscribe();
    }

    // 33.5: the database broadcasts { meme_id | comment_id } when an item is auto-hidden by
    // reports or removed by a moderator, so every open feed drops it within seconds.
    let modChannel = null;
    if (client && client.channel) {
      modChannel = client
        .channel('moderation')
        .on('broadcast', { event: 'hidden' }, ({ payload }) => {
          const memeId = payload?.meme_id ? String(payload.meme_id) : null;
          const commentId = payload?.comment_id ? String(payload.comment_id) : null;
          if (!memeId && !commentId) return;
          setMemes((prev) =>
            memeId
              ? prev.filter((m) => String(m.id) !== memeId)
              : prev.map((m) =>
                  Array.isArray(m.comments) && m.comments.some((c) => String(c.id) === commentId)
                    ? { ...m, comments: m.comments.filter((c) => String(c.id) !== commentId) }
                    : m
                )
          );
        })
        .subscribe();
    }

    return () => {
      if (channel && client) {
        client.removeChannel(channel);
      }
      if (modChannel && client) {
        client.removeChannel(modChannel);
      }
    };
  }, [fetchSupabaseMemes]);

  const [sessionAuthUserId, setSessionAuthUserId] = useState(null);
  const currentUserId = authUserId || sessionAuthUserId;

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client?.auth) return undefined;
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active && data?.session?.user?.id) {
          setSessionAuthUserId(data.session.user.id);
        }
      })
      .catch(() => {});

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      setSessionAuthUserId(session?.user?.id || null);
    });

    const onAnonCreated = (evt) => {
      const uid = evt?.detail?.user?.id;
      if (uid) setSessionAuthUserId(uid);
    };
    window.addEventListener('tm-anon-session', onAnonCreated);

    return () => {
      active = false;
      window.removeEventListener('tm-anon-session', onAnonCreated);
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Hydrate caller's server-authoritative votes and reactions when signed in (anon or linked)
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUserId) return undefined;
    let cancelled = false;

    Promise.all([
      client.from('votes').select('meme_id, direction').eq('user_id', currentUserId),
      client.from('reactions').select('meme_id, emoji').eq('user_id', currentUserId).eq('active', true)
    ])
      .then(([votesRes, reactionsRes]) => {
        if (cancelled) return;
        if (!votesRes?.error && Array.isArray(votesRes.data)) {
          setUserVotes((prev) => {
            const next = { ...prev };
            votesRes.data.forEach((row) => {
              if (row?.meme_id != null) {
                next[row.meme_id] = Number(row.direction) || 0;
              }
            });
            return next;
          });
        }
        if (!reactionsRes?.error && Array.isArray(reactionsRes.data)) {
          const grouped = {};
          reactionsRes.data.forEach((row) => {
            if (row?.meme_id && row?.emoji) {
              grouped[row.meme_id] = grouped[row.meme_id] || [];
              if (!grouped[row.meme_id].includes(row.emoji)) {
                grouped[row.meme_id].push(row.emoji);
              }
            }
          });
          setUserReactionsMap((prev) => ({ ...prev, ...grouped }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  // Creator Notifications Subscription (strictly recipient_id = auth.uid())
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !currentUserId) {
      return undefined;
    }

    let cancelled = false;
    fetchCreatorNotifications(client, currentUserId).then((rows) => {
      if (!cancelled) {
        setNotifications(rows);
      }
    });

    const notifChannel = client.channel
      ? client
          .channel(`public:notifications:${currentUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${currentUserId}`
            },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              if (String(row.recipient_id || '') !== String(currentUserId)) {
                return;
              }
              setNotifications((prev) => {
                if (prev.some((item) => String(item.id) === String(row.id))) return prev;
                return [row, ...prev].slice(0, 25);
              });
              setGoblinFortuneToast(row.message || '🔥 Someone interacted with your meme!');
              setTimeout(() => setGoblinFortuneToast(''), 4500);
            }
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      if (notifChannel && client) {
        client.removeChannel(notifChannel);
      }
    };
  }, [currentUserId, setGoblinFortuneToast]);

  const handleMarkNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const client = getSupabaseClient();
    if (client && currentUserId) {
      await markCreatorNotificationsRead(client, unreadIds);
    }
  }, [notifications, currentUserId]);

  // Global Drag-Drop & Ctrl+V Paste
  const loadFileIntoStudio = useCallback(
    async (fileOrBlob) => {
      const v = await validateFile(fileOrBlob);
      if (!v.ok) {
        alert(`⚠️ ${v.error || 'Invalid file'}`);
        return;
      }
      sfx.playMutate();
      setForgeIntent({ mode: 'file', file: fileOrBlob });
      setShowStudio(true);
    },
    [setForgeIntent, setShowStudio]
  );

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            loadFileIntoStudio(blob);
            break;
          }
        }
      }
    };

    const onDragOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
        setIsDraggingFile(true);
      }
    };

    const onDragLeave = (e) => {
      if (e.relatedTarget === null) {
        setIsDraggingFile(false);
      }
    };

    const onDrop = (e) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        loadFileIntoStudio(file);
      }
    };

    window.addEventListener('paste', onPaste);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadFileIntoStudio]);

  // Fork & Mutate + Evolution Tree Handlers
  const handleOpenBlankStudio = useCallback(() => {
    sfx.playToggle();
    setActiveBounty(null);
    setMutatingParentMeme(null);
    setForgeIntent({ mode: 'blank' });
    setShowStudio(true);
  }, [setForgeIntent, setShowStudio]);

  const handleAcceptBounty = useCallback(
    (bounty) => {
      if (!bounty) return;
      sfx.playPowerUp();
      setActiveBounty(bounty);
      setMutatingParentMeme(null);
      setForgeIntent({ mode: 'bounty', bounty });
      setShowStudio(true);
    },
    [setForgeIntent, setShowStudio]
  );

  const handleTriggerStudioMutate = useCallback(
    (memeToMutate, event) => {
      if (event) event.stopPropagation();
      sfx.playMutate();
      trackRemixOpened(memeToMutate, 'remix');
      setActiveBounty(null);
      setMutatingParentMeme(memeToMutate);
      setForgeIntent({ mode: 'remix', parent: memeToMutate });
      setShowStudio(true);
    },
    [setForgeIntent, setShowStudio]
  );

  const handleCaptionThis = useCallback(
    (memeToCaption, event) => {
      if (event) event.stopPropagation();
      sfx.playToggle();
      trackRemixOpened(memeToCaption, 'caption');
      setActiveBounty(null);
      setMutatingParentMeme(memeToCaption);
      setForgeIntent({ mode: 'caption', parent: memeToCaption });
      setShowStudio(true);
    },
    [setForgeIntent, setShowStudio]
  );

  const handleOpenEvolutionTree = useCallback(
    async (meme, event) => {
      if (event) event.stopPropagation();
      sfx.playPop(combo);
      setEvolutionModalMeme(meme);
      setLoadingEvolution(true);

      const rootId = meme.root_meme_id || meme.parent_meme_id || meme.id;

      const localMatches = memes
        .filter(
          (m) =>
            String(m.id) === String(rootId) ||
            String(m.root_meme_id) === String(rootId) ||
            String(m.parent_meme_id) === String(rootId) ||
            String(m.id) === String(meme.id) ||
            String(m.parent_meme_id) === String(meme.id)
        )
        .sort((a, b) => (a.generation || 0) - (b.generation || 0));

      const client = getSupabaseClient();
      if (client && !String(meme.id).startsWith('seed-') && !String(meme.id).startsWith('local-')) {
        try {
          const { data, error } = await client.rpc('get_meme_evolution_tree', {
            target_meme_id: meme.id
          });
          if (!error && Array.isArray(data) && data.length > 0) {
            setEvolutionNodes(
              data.map((row) => ({
                ...row,
                author_name: row.author_name || row.username || 'AnonMemer',
                score: row.score ?? row.upvotes ?? 1
              }))
            );
            setLoadingEvolution(false);
            return;
          }
        } catch {
          // Fallback to localMatches
        }
      }

      setEvolutionNodes(localMatches.length > 0 ? localMatches : [meme]);
      setLoadingEvolution(false);
    },
    [memes, combo, setEvolutionModalMeme]
  );

  // Voting, Reactions & Comments
  const handleVote = useCallback(
    async (memeId, direction, event) => {
      const currentVote = userVotes[memeId] || 0;
      const { nextDirection, delta } = nextVoteState(currentVote, direction);
      if (delta === 0) return;

      setUserVotes((prev) => ({ ...prev, [memeId]: nextDirection }));
      sfx.playVote(nextDirection > 0, combo);

      if (nextDirection > 0) {
        if (!litePerfMode) {
          setScreenPunch(true);
          setTimeout(() => setScreenPunch(false), 140);
        }
        haptic('tap');
        broadcastEmote(memeId, '🔥');
        if (currentVote <= 0) {
          const votedMeme = memesRef.current.find((m) => String(m.id) === String(memeId));
          trackUpvote(memeId, votedMeme?.category || 'unknown', 1);
          const nextVotes = votesCastCount + 1;
          setVotesCastCount(nextVotes);
          localStorage.setItem('tm_votes_cast_count', String(nextVotes));
          if (!petUnlocked && nextVotes >= 3) {
            setPetUnlocked(true);
            localStorage.setItem('tm_pet_unlocked', 'true');
            setGoblinFortuneToast('🐸 Cyber-Pet & Chaos Dock unlocked after 3 votes!');
            setTimeout(() => setGoblinFortuneToast(''), 4500);
          }
        }
        const res = awardFairReward({
          category: 'engagement',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.VOTE_UNIQUE_MEME.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.VOTE_UNIQUE_MEME.xp,
          actionKey: `vote:${memeId}`,
          event,
          emoji: '🔥'
        });
        if (res.allowed) {
          incrementQuest('q-upvote', 1);
        }
        claimStarterPackIfFirst(event);
      }

      setMemes((prev) =>
        prev.map((m) =>
          m.id === memeId ? { ...m, score: (m.score || 0) + delta } : m
        )
      );

      const client = getSupabaseClient();
      if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
        const revertVote = () => {
          setUserVotes((prev) => ({ ...prev, [memeId]: currentVote }));
          setMemes((prev) =>
            prev.map((m) => (m.id === memeId ? { ...m, score: (m.score || 0) - delta } : m))
          );
        };
        try {
          const result = await castVoteRpc(client, memeId, nextDirection);
          if (!result.ok) {
            revertVote();
            setGoblinFortuneToast(result.message);
            setTimeout(() => setGoblinFortuneToast(''), 5000);
            return;
          }
          setUserVotes((prev) => ({ ...prev, [memeId]: result.userVote }));
          if (typeof result.score === 'number' || typeof result.upvotesLastHour === 'number') {
            setMemes((prev) =>
              prev.map((m) =>
                m.id === memeId
                  ? {
                      ...m,
                      ...(typeof result.score === 'number' ? { score: result.score } : {}),
                      ...(typeof result.upvotesLastHour === 'number'
                        ? { upvotes_last_hour: result.upvotesLastHour }
                        : {})
                    }
                  : m
              )
            );
          }
          const newAnon = consumeJustCreatedAnonHandle();
          if (newAnon && !(nextDirection > 0 && currentVote <= 0 && !petUnlocked && votesCastCount + 1 >= 3)) {
            setGoblinFortuneToast(
              `🕶️ You’re browsing & voting as @${newAnon} — sign in anytime to claim your handle.`
            );
            setTimeout(() => setGoblinFortuneToast(''), 5500);
          }
        } catch {
          revertVote();
        }
      }
    },
    [
      userVotes,
      combo,
      litePerfMode,
      broadcastEmote,
      awardFairReward,
      incrementQuest,
      votesCastCount,
      petUnlocked,
      claimStarterPackIfFirst,
      setGoblinFortuneToast,
      setScreenPunch
    ]
  );

  const handleReaction = useCallback(
    async (memeId, emoji, event) => {
      const existingForMeme = userReactionsMap[memeId] || [];
      const alreadyActive = existingForMeme.includes(emoji);
      const nextActive = !alreadyActive;

      setUserReactionsMap((prev) => {
        const currentList = prev[memeId] || [];
        const updatedList = nextActive
          ? currentList.includes(emoji)
            ? currentList
            : [...currentList, emoji]
          : currentList.filter((item) => item !== emoji);
        return { ...prev, [memeId]: updatedList };
      });

      if (nextActive) {
        sfx.playReaction(emoji, combo);
        broadcastEmote(memeId, emoji);
        const res = awardFairReward({
          category: 'engagement',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.REACT_UNIQUE_MEME.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.REACT_UNIQUE_MEME.xp,
          actionKey: `react:${memeId}`,
          event,
          emoji
        });
        if (res.allowed) {
          incrementQuest('q-react', 1);
        }
      } else {
        sfx.playToggle();
      }

      const previousReactions =
        memesRef.current.find((m) => String(m.id) === String(memeId))?.reactions || {
          '🔥': 0,
          '💀': 0,
          '😂': 0,
          '🗿': 0
        };

      setMemes((prev) =>
        prev.map((m) => {
          if (m.id === memeId) {
            const current = m.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 };
            const nextCount = nextActive
              ? (current[emoji] || 0) + 1
              : Math.max(0, (current[emoji] || 0) - 1);
            return {
              ...m,
              reactions: { ...current, [emoji]: nextCount }
            };
          }
          return m;
        })
      );

      const client = getSupabaseClient();
      if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
        const revertReaction = () => {
          setUserReactionsMap((prev) => ({ ...prev, [memeId]: existingForMeme }));
          setMemes((prev) =>
            prev.map((m) => (m.id === memeId ? { ...m, reactions: previousReactions } : m))
          );
        };
        try {
          const result = await toggleReactionRpc(client, memeId, emoji, nextActive);
          if (!result.ok) {
            revertReaction();
            setGoblinFortuneToast(result.message);
            setTimeout(() => setGoblinFortuneToast(''), 5000);
            return;
          }
          if (result.reactions) {
            setMemes((prev) =>
              prev.map((m) => (m.id === memeId ? { ...m, reactions: result.reactions } : m))
            );
          }
          const newAnon = consumeJustCreatedAnonHandle();
          if (newAnon) {
            setGoblinFortuneToast(
              `🕶️ Reacting as @${newAnon} — sign in anytime to claim your handle.`
            );
            setTimeout(() => setGoblinFortuneToast(''), 5500);
          }
        } catch {
          revertReaction();
        }
      }
    },
    [
      userReactionsMap,
      combo,
      broadcastEmote,
      awardFairReward,
      incrementQuest,
      setGoblinFortuneToast
    ]
  );

  const loadCommentsForMeme = useCallback(async (memeId) => {
    if (!memeId) return;
    const idStr = String(memeId);
    if (idStr.startsWith('seed-') || idStr.startsWith('local-')) return;
    const target = memesRef.current.find((m) => String(m.id) === idStr);
    if (target?.commentsLoaded) return;

    const client = getSupabaseClient();
    if (!client?.from) return;

    setLoadingCommentsMap((prev) => (prev[idStr] ? prev : { ...prev, [idStr]: true }));
    const res = await fetchMemeComments(client, memeId);
    setLoadingCommentsMap((prev) => {
      const next = { ...prev };
      delete next[idStr];
      return next;
    });

    if (!res.ok) return;
    const fetched = (res.comments || []).filter(
      (c) => c && !hiddenCommentIdsRef.current.includes(String(c.id))
    );
    setMemes((prev) =>
      prev.map((m) => {
        if (String(m.id) !== idStr) return m;
        // Preserve pre-populated test-mock comments if backend returned empty for a mocked table
        const finalComments =
          fetched.length > 0 || (m.comments || []).length === 0 ? fetched : m.comments;
        return {
          ...m,
          comments: finalComments,
          comments_count: finalComments.length,
          commentsLoaded: true
        };
      })
    );
  }, []);

  const handleToggleComments = useCallback(
    (memeId) => {
      const idStr = String(memeId);
      const willOpen = !openComments[memeId];
      setOpenComments((prev) => ({ ...prev, [memeId]: !prev[memeId] }));
      if (willOpen) {
        void loadCommentsForMeme(idStr);
      }
    },
    [openComments, loadCommentsForMeme]
  );

  const handleCommentInputChange = useCallback((memeId, val) => {
    setCommentInputs((prev) => ({ ...prev, [memeId]: val }));
  }, []);

  const handleAddComment = useCallback(
    async (memeId, e, overrideText = null) => {
      e.preventDefault();
      const text = String(overrideText ?? commentInputs[memeId] ?? '').trim();
      if (!text) return;

      const client = getSupabaseClient();
      const isServerMeme =
        client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-');

      // Task 33.4: comments are checked before they appear. Real memes go through the
      // post-comment server function (text moderation, server-set author name); sample and
      // local-only memes get the same rules in the browser.
      let newComment;
      if (isServerMeme) {
        const result = await postComment(client, memeId, text);
        if (!result.ok) {
          setGoblinFortuneToast(result.message);
          setTimeout(() => setGoblinFortuneToast(''), 5000);
          return;
        }
        newComment = {
          ...result.comment,
          user_id: result.comment.user_id || currentUserId || null
        };
        const newAnon = consumeJustCreatedAnonHandle();
        if (newAnon) {
          setGoblinFortuneToast(
            `🕶️ Comment posted as @${newAnon} — sign in anytime to claim your handle.`
          );
          setTimeout(() => setGoblinFortuneToast(''), 5500);
        }
      } else {
        const problem = precheckTexts([text]);
        if (problem) {
          setGoblinFortuneToast(textRejectionMessage(problem));
          setTimeout(() => setGoblinFortuneToast(''), 5000);
          return;
        }
        newComment = {
          id: `local-${Date.now()}`,
          meme_id: memeId,
          author_name: user?.username || 'AnonMemer',
          body: text,
          user_id: currentUserId || 'local',
          created_at: new Date().toISOString()
        };
      }

      sfx.playPop(combo);
      if (text.length >= 6) {
        awardFairReward({
          category: 'engagement',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.COMMENT_UNIQUE_MEME.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.COMMENT_UNIQUE_MEME.xp,
          actionKey: `comment:${memeId}`,
          event: e,
          emoji: '💬'
        });
      }
      setCommentInputs((prev) => ({ ...prev, [memeId]: '' }));

      setMemes((prev) =>
        prev.map((m) => {
          if (m.id !== memeId) return m;
          const nextComments = [...(m.comments || []), newComment];
          return {
            ...m,
            comments: nextComments,
            comments_count: nextComments.length,
            commentsLoaded: true
          };
        })
      );
    },
    [commentInputs, user, currentUserId, combo, awardFairReward, setGoblinFortuneToast]
  );

  const handleDeleteComment = useCallback(
    async (memeId, commentId) => {
      if (!memeId || !commentId) return;
      const client = getSupabaseClient();
      const isServerComment =
        client &&
        !String(commentId).startsWith('local-') &&
        !String(memeId).startsWith('seed-') &&
        !String(memeId).startsWith('local-');

      if (isServerComment) {
        const result = await deleteCommentRpc(client, commentId);
        if (!result.ok) {
          setGoblinFortuneToast(result.message);
          setTimeout(() => setGoblinFortuneToast(''), 5000);
          return;
        }
      }

      sfx.playToggle();
      setMemes((prev) =>
        prev.map((m) => {
          if (m.id !== memeId) return m;
          const nextComments = (m.comments || []).filter((c) => String(c.id) !== String(commentId));
          return {
            ...m,
            comments: nextComments,
            comments_count: nextComments.length,
            commentsLoaded: true
          };
        })
      );
      setGoblinFortuneToast('🗑️ Comment deleted.');
      setTimeout(() => setGoblinFortuneToast(''), 3000);
    },
    [setGoblinFortuneToast]
  );

  const handlePostRoastComment = useCallback(
    async (memeId, roastText, e) => {
      const author = user?.username || 'AI_DankBot';
      const newComment = {
        id: `local-roast-${Date.now()}`,
        meme_id: memeId,
        author_name: author,
        body: roastText,
        created_at: new Date().toISOString()
      };
      sfx.playAirhorn();
      awardXpOnly(15, e, '🤖');
      setMemes((prev) =>
        prev.map((m) => {
          if (m.id !== memeId) return m;
          const nextComments = [...(m.comments || []), newComment];
          return {
            ...m,
            comments: nextComments,
            comments_count: nextComments.length,
            commentsLoaded: true
          };
        })
      );
    },
    [user, awardXpOnly]
  );

  // Unified Quick Upload & Meme Forge Publishers
  const handleQuickPublishFile = async ({
    file,
    title = '',
    topText = '',
    bottomText = '',
    category: quickCat = 'dank',
    event = null,
    onProgress = undefined
  }) => {
    if (!PUBLIC_UPLOADS_ENABLED) {
      throw new Error(UPLOADS_PAUSED_ERROR);
    }
    const now = Date.now();
    if (now - lastPublishTimeRef.current < 3500) {
      throw new Error('Cooldown active');
    }
    lastPublishTimeRef.current = now;

    const v = await validateFile(file);
    if (!v.ok) {
      throw new Error(v.error || 'Invalid file');
    }

    const cleanLayers = [];
    if (topText) {
      cleanLayers.push(
        makeTextLayer({
          id: 'top',
          slot: 'top',
          text: topText,
          fill: '#ffffff',
          y: 0.1,
          h: 0.18
        })
      );
    }
    if (bottomText) {
      cleanLayers.push(
        makeTextLayer({
          id: 'bot',
          slot: 'bottom',
          text: bottomText,
          fill: '#ffffff',
          y: 0.89,
          h: 0.18
        })
      );
    }

    const effectiveLayers = [...cleanLayers];
    if (!effectiveLayers.length && title.trim()) {
      effectiveLayers.push(...buildFallbackCaptionLayers(title.trim()));
    }

    let media;
    let overlay = null;
    if (v.kind === 'video' || v.kind === 'gif') {
      let uploadFile = file;
      let posterBlob = null;
      let burnedMotion = false;

      if (v.kind === 'gif' && effectiveLayers.length) {
        try {
          const burnedGif = await burnInAnimatedGif(
            file,
            { id: 'quick-gif', filter: 'none', layers: effectiveLayers },
            new Map(),
            { watermark: true }
          );
          if (burnedGif) {
            uploadFile = new File([burnedGif], `meme-${Date.now()}.gif`, { type: 'image/gif' });
            burnedMotion = true;
          }
        } catch {
          // Keep original GIF + non-destructive overlay if client-side GIF re-encode fails
        }
      }

      if (v.kind === 'gif' && effectiveLayers.length) {
        try {
          const rawPoster = await makePoster(file, v.kind);
          if (rawPoster) {
            posterBlob = await renderStillImageBlob(rawPoster, effectiveLayers, { watermark: true });
          }
        } catch {
          posterBlob = null;
        }
      }

      media = {
        kind: v.kind,
        file: uploadFile,
        posterBlob,
        width: v.probe?.width || 0,
        height: v.probe?.height || 0,
        duration: v.probe?.duration || 0,
        onProgress
      };
      if (effectiveLayers.length) {
        overlay = burnedMotion
          ? { v: 1, burned: true, layers: effectiveLayers }
          : { v: 1, layers: effectiveLayers };
      }
    } else {
      const img = await loadImageFromFileOrBlob(file);
      const fullCanvas = document.createElement('canvas');
      const W = Math.min(1200, img.width || 800);
      const H = Math.round((W * (img.height || 600)) / (img.width || 800));
      fullCanvas.width = W;
      fullCanvas.height = H;
      const ctx = fullCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      if (effectiveLayers.length) {
        await ensureFontsLoaded(effectiveLayers);
        drawLayers(ctx, W, H, effectiveLayers, new Map());
        overlay = { v: 1, burned: true, layers: effectiveLayers };
      }
      const blob = await canvasToCompressedBlob(fullCanvas);

      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = W;
      baseCanvas.height = H;
      const bctx = baseCanvas.getContext('2d');
      bctx.drawImage(img, 0, 0, W, H);
      const baseBlob = await canvasToCompressedBlob(baseCanvas);

      media = { kind: 'image', blob, baseBlob, width: W, height: H };
    }

    const fallbackCaption = [topText, bottomText].filter(Boolean).join(' — ');
    const author = user?.username || 'AnonMemer';
    const finalTitle = title || fallbackCaption || `Fresh Upload by @${author}`;

    const client = getSupabaseClient();
    let insertedMeme;
    let publishStatus;
    try {
      const res = await publishMeme({
        media,
        overlay,
        meta: {
          title: finalTitle,
          category: quickCat,
          author,
          generation: 0
        },
        client
      });
      insertedMeme = res.meme;
      publishStatus = res.status;
    } catch (err) {
      pulse('publish_refused', { reason_class: classifyPublishRefusal(err) });
      throw err;
    }
    pulse('publish_ok', { mode: 'quick_upload', status: publishStatus });

    setMemes((prev) => [insertedMeme, ...prev]);
    // 33.3: a meme waiting for review is only visible to its uploader and earns nothing yet.
    if (publishStatus === 'pending') {
      setSortBy('latest');
      return { status: 'pending' };
    }
    trackMemePublished(insertedMeme, 'quick_upload');
    recordPublishDailyPerk();
    if (!aiUnlocked) {
      consumeJustCreatedAnonHandle();
      setAiUnlocked(true);
      localStorage.setItem('tm_first_meme_created', 'true');
      setGoblinFortuneToast('🕹️ First meme created! Arcade Games & Cyber-AI Co-Pilot unlocked!');
      setTimeout(() => setGoblinFortuneToast(''), 5000);
    } else {
      const newAnon = consumeJustCreatedAnonHandle();
      if (newAnon) {
        setGoblinFortuneToast(
          `🕶️ Posted as @${newAnon} — sign in anytime to claim your handle.`
        );
        setTimeout(() => setGoblinFortuneToast(''), 5500);
      }
    }
    sfx.playPublishStinger();
    incrementQuest('q-mutate', 1);
    addCappedWheelSpins(1);
    awardUploadTokensWithPioneerCheck({
      baseTokens: ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens,
      baseXp: ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp,
      event,
      emoji: '🚀'
    });
    claimStarterPackIfFirst(event);
    setLiveCelebrationData({
      meme: insertedMeme,
      rewardSummary: `${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens, { sign: true })} & +${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp} XP`
    });
    setSortBy('latest');
    return { status: publishStatus };
  };

  const handleForgePublish = async ({ media, overlay, meta, intent }) => {
    if (!PUBLIC_UPLOADS_ENABLED) {
      throw new Error(UPLOADS_PAUSED_ERROR);
    }
    const now = Date.now();
    if (now - lastPublishTimeRef.current < 3500) {
      throw new Error('COOLDOWN');
    }
    lastPublishTimeRef.current = now;

    const parent = intent?.parent || mutatingParentMeme || null;
    const isBounty = intent?.mode === 'bounty' || Boolean(activeBounty);
    const parentId = parent?.id || null;
    const rootId = parent?.root_meme_id || parent?.parent_meme_id || parentId || null;
    const generation = parent && !isBounty ? (parent.generation || 0) + 1 : 0;

    const client = getSupabaseClient();
    let insertedMeme;
    let publishStatus;
    try {
      const res = await publishMeme({
        media,
        overlay,
        meta: {
          ...meta,
          author: user?.username || 'AnonMemer',
          parentId,
          rootId,
          generation,
          isBounty,
          bountyId: activeBounty?.id || intent?.bounty?.id || null,
          templateId: activeBounty?.template?.id || intent?.bounty?.template?.id || null
        },
        client
      });
      insertedMeme = res.meme;
      publishStatus = res.status;
    } catch (err) {
      pulse('publish_refused', { reason_class: classifyPublishRefusal(err) });
      throw err;
    }
    pulse('publish_ok', { mode: intent?.mode || (parent ? 'remix' : 'forge'), status: publishStatus });

    if (publishStatus === 'pending') {
      // 33.3: waiting for review — only the uploader sees it; no rewards, remix credit or
      // notifications until it is approved.
      setMemes((prev) => [insertedMeme, ...prev]);
      setShowStudio(false);
      setForgeIntent(null);
      setMutatingParentMeme(null);
      setActiveBounty(null);
      setSortBy('latest');
      setGoblinFortuneToast(PENDING_REVIEW_MESSAGE);
      setTimeout(() => setGoblinFortuneToast(''), 6000);
      return { status: 'pending' };
    }
    setMemes((prev) => [
      insertedMeme,
      ...prev.map((m) =>
        parentId && m.id === parentId ? { ...m, mutation_count: (m.mutation_count || 0) + 1 } : m
      )
    ]);
    trackMemePublished(insertedMeme, intent?.mode || (parent ? 'remix' : 'forge'));

    if (parent?.author_name) {
      const parentAuthor = parent.author_name;
      setRoyaltiesMap((prev) => ({
        ...prev,
        [parentAuthor]: (prev[parentAuthor] || 0) + 50
      }));
      if (user?.username && parentAuthor.toLowerCase() === user.username.toLowerCase()) {
        setXp((prevXp) => prevXp + 50);
      }
    }

    recordPublishDailyPerk();
    if (!aiUnlocked) {
      consumeJustCreatedAnonHandle();
      setAiUnlocked(true);
      localStorage.setItem('tm_first_meme_created', 'true');
      setGoblinFortuneToast('🕹️ First meme created! Arcade Games & Cyber-AI Co-Pilot unlocked!');
      setTimeout(() => setGoblinFortuneToast(''), 5000);
    } else {
      const newAnon = consumeJustCreatedAnonHandle();
      if (newAnon) {
        setGoblinFortuneToast(
          `🕶️ Posted as @${newAnon} — sign in anytime to claim your handle.`
        );
        setTimeout(() => setGoblinFortuneToast(''), 5500);
      }
    }
    sfx.playPublishStinger();
    incrementQuest('q-mutate', 1);
    addCappedWheelSpins(1);

    if (isBounty) {
      setBountiesCompleted((c) => c + 1);
      awardUploadTokensWithPioneerCheck({
        baseTokens: ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.tokens,
        baseXp: ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.xp,
        event: null,
        emoji: '🎯'
      });
    } else {
      awardUploadTokensWithPioneerCheck({
        baseTokens: parent
          ? ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.tokens
          : ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens,
        baseXp: parent
          ? ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.xp
          : ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp,
        event: null,
        emoji: parent ? '🧬' : '🚀'
      });
    }
    claimStarterPackIfFirst(null);

    setShowStudio(false);
    setForgeIntent(null);
    setMutatingParentMeme(null);
    setActiveBounty(null);
    setLiveCelebrationData({
      meme: insertedMeme,
      rewardSummary: isBounty
        ? `⚔️ Caption Battle Entry! ${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.tokens, { sign: true })}`
        : parent
        ? `🧬 Remix Live! ${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.tokens, { sign: true })}`
        : `${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens, { sign: true })} & +${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp} XP`
    });
    setSortBy('latest');
    return { status: publishStatus };
  };

  // Moderation, Bookmarks & Sharing
  // 33.5: the flag button opens the report sheet; "hide for me" is a separate local option.
  const handleReportMeme = useCallback((meme) => {
    if (!meme) return;
    sfx.playToggle();
    setReportTarget({ kind: 'meme', meme });
  }, []);

  const handleReportComment = useCallback((comment, meme) => {
    if (!comment) return;
    sfx.playToggle();
    setReportTarget({ kind: 'comment', comment, meme });
  }, []);

  const handleCloseReport = useCallback(() => setReportTarget(null), []);

  const hideCommentLocally = useCallback((commentId) => {
    const idStr = String(commentId);
    setHiddenCommentIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
    setMemes((prev) =>
      prev.map((m) =>
        Array.isArray(m.comments) && m.comments.some((c) => String(c.id) === idStr)
          ? { ...m, comments: m.comments.filter((c) => String(c.id) !== idStr) }
          : m
      )
    );
  }, []);

  const handleHideForMe = useCallback(
    (target) => {
      if (!target) return;
      sfx.playVote(false, 1);
      if (target.kind === 'comment') {
        hideCommentLocally(target.comment?.id);
        setModerationToast('🙈 Hidden that comment from your view.');
      } else {
        const meme = target.meme;
        setReportedMemeIds((prev) =>
          prev.includes(String(meme.id)) ? prev : [...prev, String(meme.id)]
        );
        setModerationToast(`🙈 Hidden "${(meme.title || 'Meme').slice(0, 26)}..." from your feed.`);
      }
      setTimeout(() => setModerationToast(''), 4500);
    },
    [hideCommentLocally]
  );

  const handleSubmitReport = useCallback(
    async ({ reason, note }) => {
      const target = reportTarget;
      if (!target) return { ok: false, message: 'Nothing to report.' };
      const isComment = target.kind === 'comment';
      const res = await submitReport(getSupabaseClient(), {
        memeId: isComment ? null : String(target.meme.id),
        commentId: isComment ? String(target.comment.id) : null,
        reason,
        note
      });
      if (!res.ok) return res;
      // The reporter never has to see it again, whatever the moderators decide.
      if (isComment) {
        hideCommentLocally(target.comment.id);
      } else {
        const idStr = String(target.meme.id);
        setReportedMemeIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
        if (res.hidden) setMemes((prev) => prev.filter((m) => String(m.id) !== idStr));
      }
      return res;
    },
    [reportTarget, hideCommentLocally]
  );

  const handleRestoreReportedMemes = useCallback(() => {
    sfx.playToggle();
    setReportedMemeIds([]);
    setHiddenCommentIds([]);
    setModerationToast('');
  }, []);

  const handleToggleBookmark = useCallback(
    (meme, e) => {
      if (!meme) return;
      const idStr = String(meme.id);
      const alreadySaved = bookmarkedIds.includes(idStr);
      if (!alreadySaved) {
        sfx.playPop(1);
        setBookmarkedIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
        awardFairReward({
          category: 'engagement',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.BOOKMARK_MEME.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.BOOKMARK_MEME.xp,
          actionKey: `bookmark:${idStr}`,
          event: e,
          emoji: '⭐'
        });
      } else {
        sfx.playToggle();
        setBookmarkedIds((prev) => prev.filter((id) => id !== idStr));
      }
    },
    [bookmarkedIds, awardFairReward]
  );

  // Share / download open one sheet that prepares the file with the logo burned in, then offers
  // Share (fresh tap, required by iPhone Safari), Save and Copy link (owner brief 17 Nov 2026).
  const [shareSheet, setShareSheet] = useState(null);
  const handleDownloadMeme = useCallback((meme) => {
    if (meme) setShareSheet({ meme, action: 'download' });
  }, []);
  const handleShareMeme = useCallback(
    (meme, e) => {
      if (!meme) return;
      setShareSheet({ meme, action: 'share' });
      trackShareClicked(meme, 'card');
      pulse('share', {
        surface: 'card',
        method: typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? 'native' : 'copy'
      });
      sfx.playPop(1);
      awardFairReward({
        category: 'engagement',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.SHARE_MEME.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.SHARE_MEME.xp,
        actionKey: `share:${meme.id}`,
        event: e,
        emoji: '🔗'
      });
    },
    [awardFairReward]
  );

  // Derived Feed Filters & Trending Formats (Task 33.16: Hot / New / Top Day-Week-All)
  const filteredMemes = useMemo(() => {
    const mode = normalizeSortMode(sortBy);
    const topCutoffIso = mode === 'top' ? getTopWindowStartIso(topWindow) : null;
    const topCutoffMs = topCutoffIso ? Date.parse(topCutoffIso) : null;

    return memes
      .filter((m) => {
        if (reportedMemeIds.includes(String(m.id))) return false;
        if (showSavedOnly && !bookmarkedIds.includes(String(m.id))) return false;
        if (mode === 'new24h' && !formatMemeUploadDate(m.created_at).isNewToday) return false;
        if (topCutoffMs !== null && !isSeedMeme(m)) {
          const ts = Date.parse(m.created_at || '');
          if (Number.isFinite(ts) && ts < topCutoffMs) return false;
        }
        if (category === 'remixes') {
          if ((Number(m.mutation_count) || 0) <= 0 && !m.parent_meme_id && !m.parent_id) return false;
        } else if (category !== 'all' && m.category !== category) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (m.title || '').toLowerCase().includes(q) ||
            (m.author_name || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aSeed = isSeedMeme(a);
        const bSeed = isSeedMeme(b);
        if (aSeed !== bSeed) return aSeed ? 1 : -1;
        if (mode === 'new' || mode === 'new24h') {
          const diff = Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
          if (diff !== 0) return diff;
          return String(b.id).localeCompare(String(a.id));
        }
        if (mode === 'hot') {
          const diff = computeHotScore(b) - computeHotScore(a);
          if (Math.abs(diff) > 1e-6) return diff;
          const tsDiff = Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
          if (tsDiff !== 0) return tsDiff;
          return String(b.id).localeCompare(String(a.id));
        }
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const tsDiff = Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
        if (tsDiff !== 0) return tsDiff;
        return String(b.id).localeCompare(String(a.id));
      });
  }, [memes, reportedMemeIds, showSavedOnly, bookmarkedIds, category, searchQuery, sortBy, topWindow]);

  const visibleMemes = useMemo(() => {
    return filteredMemes.slice(0, visibleCount);
  }, [filteredMemes, visibleCount]);

  const trendingFormats = useMemo(() => {
    if (!memes || !memes.length) return [];
    const counts = new Map();
    memes.forEach((m) => {
      const k = m.root_meme_id || m.base_image_url || m.id;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const seenBase = new Set();
    return memes
      .filter((m) => {
        const baseKey = m.base_image_url || m.image_url;
        if (!baseKey || seenBase.has(baseKey)) return false;
        seenBase.add(baseKey);
        return true;
      })
      .map((m) => ({
        ...m,
        formatCount: counts.get(m.root_meme_id || m.base_image_url || m.id) || 1
      }))
      .sort((a, b) => b.formatCount - a.formatCount || (b.mutation_count || 0) - (a.mutation_count || 0))
      .slice(0, 8);
  }, [memes]);

  useEffect(() => {
    if (viewMode !== 'feed' || (visibleCount >= filteredMemes.length && !hasMoreServer)) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextFeedPage();
        }
      },
      { rootMargin: '220px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, visibleCount, filteredMemes.length, hasMoreServer, loadNextFeedPage]);

  useEffect(() => {
    if (!theaterMemeId) return;
    Promise.resolve().then(() => {
      void loadCommentsForMeme(theaterMemeId);
    });
  }, [theaterMemeId, loadCommentsForMeme]);

  const theaterMeme = useMemo(() => {
    if (!theaterMemeId) return null;
    return memes.find((m) => String(m.id) === String(theaterMemeId)) || null;
  }, [memes, theaterMemeId]);

  // Swipe Deck & King-of-the-Hill Battle Handlers
  const triggerSwipe = useCallback(
    (dir, e) => {
      const activeMeme = filteredMemes[swipeIndex % Math.max(1, filteredMemes.length)];
      if (!activeMeme) return;
      setSwipeAnim(dir === 'right' ? 'swipe-right' : dir === 'up' ? 'swipe-up' : 'swipe-left');

      if (dir === 'right' || dir === 'up') {
        handleVote(activeMeme.id, dir === 'up' ? 2 : 1, e);
      } else {
        sfx.playVote(false, 1);
      }

      setTimeout(() => {
        setSwipeAnim('');
        setSwipeIndex((prev) => (prev + 1) % Math.max(1, filteredMemes.length));
      }, 240);
    },
    [filteredMemes, swipeIndex, handleVote]
  );

  const handlePrevSwipeCard = useCallback(() => {
    sfx.playToggle();
    setSwipeAnim('');
    const len = Math.max(1, filteredMemes.length);
    setSwipeIndex((prev) => (prev - 1 + len) % len);
  }, [filteredMemes.length]);

  useEffect(() => {
    if (viewMode !== 'swipe') return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') triggerSwipe('right', e);
      if (e.key === 'ArrowLeft') triggerSwipe('left', e);
      if (e.key === 'ArrowUp') triggerSwipe('up', e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode, triggerSwipe]);

  const handleBattlePick = (pickedMemeIdx, slotIdx, e) => {
    const pickedMeme = memes[pickedMemeIdx % memes.length];
    if (!pickedMeme || battleWinner !== null) return;

    const otherMemeIdx = battlePair[slotIdx === 0 ? 1 : 0];
    const otherMeme = memes[otherMemeIdx % memes.length];
    const s1 = Math.max(10, Number(pickedMeme.score || 100));
    const s2 = Math.max(10, Number(otherMeme?.score || 100));
    const pct = Math.min(96, Math.max(51, Math.round((s1 / (s1 + s2)) * 100)));

    setCrowdAgreement(pct);
    setBattleWinner(pickedMemeIdx);
    const nextStreak = battleStreak + 1;
    setBattleStreak(nextStreak);
    setChampionWins((prev) => (slotIdx === 0 ? prev + 1 : 1));
    handleVote(pickedMeme.id, 1, e);

    if (nextStreak % 3 === 0 || pct >= 75) {
      triggerWinCelebration({
        amount: nextStreak,
        unit: '🔥 STREAK',
        game: '1v1 Meme Arena',
        headline: pct >= 75 ? `👑 CROWD FAVORITE (${pct}%)!` : `⚔️ ${nextStreak}× ARENA STREAK!`,
        detail: `@${pickedMeme.author_name} holds the throne!`,
        multiplier: 2,
        tier: 'win'
      });
    }

    setTimeout(() => {
      setBattleWinner(null);
      const len = memes.length;
      if (len >= 2) {
        let nextChallenger = (Math.max(battlePair[0], battlePair[1]) + 1) % len;
        if (nextChallenger === pickedMemeIdx) {
          nextChallenger = (nextChallenger + 1) % len;
        }
        setBattlePair([pickedMemeIdx, nextChallenger]);
      }
    }, 950);
  };

  const handleSkipMatchup = () => {
    const len = memes.length;
    if (len < 2) return;
    sfx.playToggle();
    setCrowdAgreement(null);
    setChampionWins(0);
    setBattlePair(([a, b]) => [
      (a + 1) % len,
      (b + 2) % len === (a + 1) % len ? (b + 3) % len : (b + 2) % len
    ]);
  };

  return {
    memes: feedMemes,
    isLoadingFeed,
    visibleCount,
    setVisibleCount,
    hasMoreServer,
    isLoadingMoreFeed,
    loadingCommentsMap,
    loadNextFeedPage,
    bookmarkedIds,
    dbStatus,
    mutatingParentMeme,
    setMutatingParentMeme,
    evolutionNodes,
    loadingEvolution,
    activeBounty,
    setActiveBounty,
    notifications,
    setNotifications,
    unreadNotificationsCount,
    bountiesCompleted,
    royaltiesMap,
    setRoyaltiesMap,
    reportedMemeIds,
    moderationToast,
    loadMoreSentinelRef,
    userVotes,
    votesCastCount,
    petUnlocked,
    aiUnlocked,
    setAiUnlocked,
    userReactionsMap,
    isDraggingFile,
    loadFileIntoStudio,
    openComments,
    commentInputs,
    swipeIndex,
    swipeAnim,
    battlePair,
    battleWinner,
    battleStreak,
    championWins,
    crowdAgreement,
    dailyBattle,
    battleEntriesCount,
    filteredMemes,
    visibleMemes,
    trendingFormats,
    theaterMeme,
    handleMarkNotificationsRead,
    handleOpenBlankStudio,
    handleAcceptBounty,
    handleTriggerStudioMutate,
    handleCaptionThis,
    handleOpenEvolutionTree,
    handleVote,
    handleReaction,
    handleToggleComments,
    handleCommentInputChange,
    handleAddComment,
    handleDeleteComment,
    handlePostRoastComment,
    currentUserId,
    handleQuickPublishFile,
    handleForgePublish,
    handleReportMeme,
    handleReportComment,
    reportTarget,
    handleCloseReport,
    handleHideForMe,
    handleSubmitReport,
    handleRestoreReportedMemes,
    handleToggleBookmark,
    handleShareMeme,
    handleDownloadMeme,
    shareSheet,
    setShareSheet,
    triggerSwipe,
    handlePrevSwipeCard,
    handleBattlePick,
    handleSkipMatchup
  };
}
