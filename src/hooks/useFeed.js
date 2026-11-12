import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSupabaseClient } from '../supabaseClient';
import { sfx } from '../utils/soundEngine';
import {
  loadImageFromFileOrBlob,
  stampArcadeCartridgeFooter
} from '../utils/canvasMutator';
import {
  STARTER_MEMES,
  isSeedMeme,
  formatMemeUploadDate
} from '../data/starterMemes';
import { ARCADE_ECONOMY_RULES } from '../utils/tokenEconomy';
import {
  trackUpvote,
  trackRemixOpened,
  trackMemePublished,
  trackShareClicked
} from '../utils/analytics';
import { publishMeme } from '../utils/publishMeme';
import { validateFile, canvasToCompressedBlob } from '../utils/mediaPipeline';
import { recordPublishDailyPerk } from '../utils/memeFeedBridge';
import {
  getDailyCaptionBattle,
  getYesterdayCaptionKing,
  getBattleEntriesForBattle
} from '../utils/dailyCaptionBattle';
import {
  sendCreatorNotification,
  fetchCreatorNotifications,
  markCreatorNotificationsRead
} from '../utils/notifications';

/**
 * Manages the community meme feed: Supabase sync, realtime subscriptions,
 * votes, reactions, comments, publishing (Quick Upload & Meme Forge),
 * evolution trees, bookmarks, moderation, infinite scroll, Swipe Deck & Battle Arena.
 */
export function useFeed({
  router,
  economy,
  user,
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
        ? saved.filter((m) => m && !isSeedMeme(m))
        : [];
      const seen = new Set(userUploads.map((m) => String(m.id)));
      return [...userUploads, ...STARTER_MEMES.filter((m) => !seen.has(String(m.id)))];
    } catch {
      return [...STARTER_MEMES];
    }
  });
  const memesRef = useRef(memes);
  useEffect(() => {
    memesRef.current = memes;
  }, [memes]);

  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
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
  const yesterdayCaptionKing = useMemo(() => getYesterdayCaptionKing(memes), [memes]);
  const battleEntriesCount = useMemo(
    () => getBattleEntriesForBattle(memes, dailyBattle).length,
    [memes, dailyBattle]
  );
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Supabase Feed Sync & Realtime Memes Channel
  const fetchSupabaseMemes = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setDbStatus('local');
      setIsLoadingFeed(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('memes')
        .select('*, comments(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setDbStatus('local');
        setIsLoadingFeed(false);
        return;
      }

      setDbStatus('live');
      const normalized = Array.isArray(data)
        ? data.map((row) => ({
            ...row,
            generation: row.generation || 0,
            mutation_count: row.mutation_count || 0,
            reactions: row.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 },
            comments: Array.isArray(row.comments) ? row.comments : []
          }))
        : [];
      const liveIds = new Set(normalized.map((m) => String(m.id)));
      setMemes((prev) => {
        const localUserUploads = prev.filter(
          (m) =>
            m &&
            String(m.id).startsWith('local-') &&
            !liveIds.has(String(m.id))
        );
        const prevSeedsById = new Map(
          prev.filter((m) => m && isSeedMeme(m)).map((m) => [String(m.id), m])
        );
        const mergedSeeds = STARTER_MEMES
          .filter((m) => !liveIds.has(String(m.id)))
          .map((m) => prevSeedsById.get(String(m.id)) || m);
        return [...normalized, ...localUserUploads, ...mergedSeeds];
      });
      setIsLoadingFeed(false);
    } catch {
      setDbStatus('local');
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    Promise.resolve().then(() => {
      fetchSupabaseMemes();
    });

    let channel = null;
    if (client && client.channel) {
      channel = client
        .channel('public:memes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memes' }, () => {
          fetchSupabaseMemes();
        })
        .subscribe();
    }

    return () => {
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [fetchSupabaseMemes]);

  // Creator Notifications Subscription
  useEffect(() => {
    const client = getSupabaseClient();
    const myName = user?.username;
    if (!client || !myName || String(myName).toLowerCase() === 'anonmemer') {
      return undefined;
    }

    let cancelled = false;
    fetchCreatorNotifications(client, myName).then((rows) => {
      if (!cancelled) {
        setNotifications(rows);
      }
    });

    const notifChannel = client.channel
      ? client
          .channel(`public:notifications:${myName}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              if (String(row.recipient_username || '').toLowerCase() !== String(myName).toLowerCase()) {
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
  }, [user?.username, setGoblinFortuneToast]);

  const handleMarkNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const client = getSupabaseClient();
    if (client && user?.username) {
      await markCreatorNotificationsRead(client, user.username);
    }
  }, [user]);

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
      let delta;
      if (currentVote === direction) {
        delta = -direction;
        setUserVotes((prev) => ({ ...prev, [memeId]: 0 }));
      } else {
        delta = direction - currentVote;
        setUserVotes((prev) => ({ ...prev, [memeId]: direction }));
      }

      const safeDelta = Math.max(-2, Math.min(2, delta));
      sfx.playVote(direction > 0, combo);

      if (direction > 0) {
        if (!litePerfMode) {
          setScreenPunch(true);
          setTimeout(() => setScreenPunch(false), 140);
        }
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(10);
          }
        } catch {
          // ignore vibrate unsupported
        }
        broadcastEmote(memeId, '🔥');
        if (currentVote <= 0) {
          const votedMeme = memesRef.current.find((m) => String(m.id) === String(memeId));
          trackUpvote(memeId, votedMeme?.category || 'unknown', Math.max(1, safeDelta));
          if (votedMeme?.author_name) {
            const clientForNotif = getSupabaseClient();
            if (clientForNotif) {
              const actorName = user?.username || 'Someone';
              sendCreatorNotification({
                client: clientForNotif,
                recipientUsername: votedMeme.author_name,
                actorName,
                type: 'upvote',
                memeId,
                message: `🔥 Someone upvoted your meme "${String(votedMeme.title || 'Meme').slice(0, 36)}"!`
              });
            }
          }
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

      let updatedScore = 1;
      setMemes((prev) =>
        prev.map((m) => {
          if (m.id === memeId) {
            updatedScore = (m.score || 0) + safeDelta;
            return { ...m, score: updatedScore };
          }
          return m;
        })
      );

      const client = getSupabaseClient();
      if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
        try {
          const { error: rpcError } = await client.rpc('increment_meme_score', {
            row_id: memeId,
            delta: safeDelta
          });
          if (rpcError) {
            await client.from('memes').update({ score: updatedScore }).eq('id', memeId);
          }
        } catch {
          // Local state already updated
        }
      }
    },
    [
      userVotes,
      combo,
      litePerfMode,
      broadcastEmote,
      user?.username,
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
      if (existingForMeme.includes(emoji)) {
        sfx.playToggle();
        return;
      }

      setUserReactionsMap((prev) => ({
        ...prev,
        [memeId]: [...(prev[memeId] || []), emoji]
      }));

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

      let updatedReactions = null;
      setMemes((prev) =>
        prev.map((m) => {
          if (m.id === memeId) {
            const current = m.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 };
            updatedReactions = { ...current, [emoji]: (current[emoji] || 0) + 1 };
            return { ...m, reactions: updatedReactions, score: (m.score || 0) + 1 };
          }
          return m;
        })
      );

      const reactedMeme = memesRef.current.find((m) => String(m.id) === String(memeId));
      const client = getSupabaseClient();
      if (client && reactedMeme?.author_name) {
        sendCreatorNotification({
          client,
          recipientUsername: reactedMeme.author_name,
          actorName: user?.username || 'Someone',
          type: 'upvote',
          memeId,
          message: `${emoji} Someone reacted to your meme "${String(reactedMeme.title || 'Meme').slice(0, 36)}"!`
        });
      }
      if (
        client &&
        !String(memeId).startsWith('seed-') &&
        !String(memeId).startsWith('local-') &&
        updatedReactions
      ) {
        try {
          await client.from('memes').update({ reactions: updatedReactions }).eq('id', memeId);
        } catch {
          // Local state already updated
        }
      }
    },
    [userReactionsMap, combo, broadcastEmote, user?.username, awardFairReward, incrementQuest]
  );

  const handleToggleComments = useCallback((memeId) => {
    setOpenComments((prev) => ({ ...prev, [memeId]: !prev[memeId] }));
  }, []);

  const handleCommentInputChange = useCallback((memeId, val) => {
    setCommentInputs((prev) => ({ ...prev, [memeId]: val }));
  }, []);

  const handleAddComment = useCallback(
    async (memeId, e) => {
      e.preventDefault();
      const text = (commentInputs[memeId] || '').trim();
      if (!text) return;

      const author = user?.username || 'AnonMemer';
      const newComment = {
        id: `local-${Date.now()}`,
        meme_id: memeId,
        author_name: author,
        body: text,
        created_at: new Date().toISOString()
      };

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
        prev.map((m) =>
          m.id === memeId ? { ...m, comments: [...(m.comments || []), newComment] } : m
        )
      );

      const client = getSupabaseClient();
      const commentedMeme = memesRef.current.find((m) => String(m.id) === String(memeId));
      if (client && commentedMeme?.author_name) {
        sendCreatorNotification({
          client,
          recipientUsername: commentedMeme.author_name,
          actorName: author,
          type: 'comment',
          memeId,
          message: `💬 @${author} commented on "${String(commentedMeme.title || 'Meme').slice(0, 36)}"!`
        });
      }
      if (client && !String(memeId).startsWith('seed-') && !String(memeId).startsWith('local-')) {
        try {
          await client.from('comments').insert([
            {
              meme_id: memeId,
              author_name: author,
              body: text
            }
          ]);
        } catch {
          // Local state already updated
        }
      }
    },
    [commentInputs, user, combo, awardFairReward]
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
        prev.map((m) =>
          m.id === memeId ? { ...m, comments: [...(m.comments || []), newComment] } : m
        )
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
    event = null
  }) => {
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
      cleanLayers.push({
        id: 'top',
        type: 'text',
        text: topText.toUpperCase(),
        font: 'Anton',
        align: 'center',
        fill: '#ffffff',
        stroke: 0.08,
        strokeColor: '#000000',
        x: 0.5,
        y: 0.1,
        w: 0.9,
        h: 0.18
      });
    }
    if (bottomText) {
      cleanLayers.push({
        id: 'bot',
        type: 'text',
        text: bottomText.toUpperCase(),
        font: 'Anton',
        align: 'center',
        fill: '#facc15',
        stroke: 0.08,
        strokeColor: '#000000',
        x: 0.5,
        y: 0.9,
        w: 0.9,
        h: 0.18
      });
    }

    let media;
    let overlay = null;
    if (v.kind === 'video' || v.kind === 'gif') {
      media = {
        kind: v.kind,
        file,
        width: v.probe?.width || 0,
        height: v.probe?.height || 0,
        duration: v.probe?.duration || 0
      };
      if (cleanLayers.length) {
        overlay = { v: 1, layers: cleanLayers };
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
      if (cleanLayers.length) {
        cleanLayers.forEach((l) => {
          ctx.save();
          ctx.font = `900 ${Math.round(H * 0.08)}px Impact, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = Math.round(H * 0.015);
          ctx.fillStyle = l.fill;
          ctx.strokeText(l.text, W * l.x, H * l.y, W * l.w);
          ctx.fillText(l.text, W * l.x, H * l.y, W * l.w);
          ctx.restore();
        });
      }
      stampArcadeCartridgeFooter(ctx, W, H, { generation: 0, authorName: user?.username || 'AnonMemer' });
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
    const { meme: insertedMeme } = await publishMeme({
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

    setMemes((prev) => [insertedMeme, ...prev]);
    trackMemePublished(insertedMeme, 'quick_upload');
    recordPublishDailyPerk();
    if (!aiUnlocked) {
      setAiUnlocked(true);
      localStorage.setItem('tm_first_meme_created', 'true');
      setGoblinFortuneToast('🕹️ First meme created! Arcade Games & Cyber-AI Co-Pilot unlocked!');
      setTimeout(() => setGoblinFortuneToast(''), 5000);
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
      rewardSummary: `+${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens} 🪙 & +${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp} XP`
    });
    setSortBy('latest');
  };

  const handleForgePublish = async ({ media, overlay, meta, intent }) => {
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
    const { meme: insertedMeme } = await publishMeme({
      media,
      overlay,
      meta: {
        ...meta,
        author: user?.username || 'AnonMemer',
        parentId,
        rootId,
        generation,
        isBounty,
        bountyId: activeBounty?.id || intent?.bounty?.id || null
      },
      client
    });

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
      if (client) {
        sendCreatorNotification({
          client,
          recipientUsername: parentAuthor,
          actorName: user?.username || 'Someone',
          type: 'remix',
          memeId: insertedMeme.id,
          message: `🧬 @${user?.username || 'Someone'} remixed your meme "${String(parent.title || 'Meme').slice(0, 32)}"!`
        });
      }
    }

    recordPublishDailyPerk();
    if (!aiUnlocked) {
      setAiUnlocked(true);
      localStorage.setItem('tm_first_meme_created', 'true');
      setGoblinFortuneToast('🕹️ First meme created! Arcade Games & Cyber-AI Co-Pilot unlocked!');
      setTimeout(() => setGoblinFortuneToast(''), 5000);
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
        ? `⚔️ Caption Battle Entry! +${ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.tokens} 🪙`
        : parent
        ? `🧬 Remix Live! +${ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.tokens} 🪙`
        : `+${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens} 🪙 & +${ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp} XP`
    });
    setSortBy('latest');
  };

  // Moderation, Bookmarks & Sharing
  const handleReportMeme = useCallback((meme) => {
    if (!meme) return;
    sfx.playVote(false, 1);
    setReportedMemeIds((prev) =>
      prev.includes(String(meme.id)) ? prev : [...prev, String(meme.id)]
    );
    setModerationToast(`🚩 Hidden "${(meme.title || 'Meme').slice(0, 26)}..." from your feed.`);
    setTimeout(() => setModerationToast(''), 4500);
  }, []);

  const handleRestoreReportedMemes = useCallback(() => {
    sfx.playToggle();
    setReportedMemeIds([]);
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

  const handleShareMeme = useCallback(
    (meme, e) => {
      if (!meme) return;
      const shareUrl = `${window.location.origin}/?m=${encodeURIComponent(String(meme.id))}`;
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        navigator
          .share({
            title: `${meme.title} — THE MEMES.net`,
            text: `Check out "${meme.title}" on THE MEMES.net — tap to view or make your own!`,
            url: shareUrl
          })
          .catch(() => {});
      }
      trackShareClicked(meme, 'card');
      sfx.playPop(1);
      setGoblinFortuneToast('🔗 Direct meme link copied! Opens this exact meme in Theater view.');
      setTimeout(() => setGoblinFortuneToast(''), 4000);
      awardFairReward({
        category: 'engagement',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.SHARE_MEME.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.SHARE_MEME.xp,
        actionKey: `share:${meme.id}`,
        event: e,
        emoji: '🔗'
      });
    },
    [awardFairReward, setGoblinFortuneToast]
  );

  // Derived Feed Filters & Trending Formats
  const filteredMemes = useMemo(() => {
    return memes
      .filter((m) => {
        if (reportedMemeIds.includes(String(m.id))) return false;
        if (showSavedOnly && !bookmarkedIds.includes(String(m.id))) return false;
        if (sortBy === 'new24h' && !formatMemeUploadDate(m.created_at).isNewToday) return false;
        if (category !== 'all' && m.category !== category) return false;
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
        if (sortBy === 'latest' || sortBy === 'new24h') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return (b.score || 0) - (a.score || 0);
      });
  }, [memes, reportedMemeIds, showSavedOnly, bookmarkedIds, category, searchQuery, sortBy]);

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
    if (viewMode !== 'feed' || visibleCount >= filteredMemes.length) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + 6);
        }
      },
      { rootMargin: '180px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, visibleCount, filteredMemes.length]);

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
    setBattleStreak((s) => s + 1);
    setChampionWins((prev) => (slotIdx === 0 ? prev + 1 : 1));
    handleVote(pickedMeme.id, 1, e);

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
    memes,
    isLoadingFeed,
    visibleCount,
    setVisibleCount,
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
    yesterdayCaptionKing,
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
    handlePostRoastComment,
    handleQuickPublishFile,
    handleForgePublish,
    handleReportMeme,
    handleRestoreReportedMemes,
    handleToggleBookmark,
    handleShareMeme,
    triggerSwipe,
    handlePrevSwipeCard,
    handleBattlePick,
    handleSkipMatchup
  };
}
