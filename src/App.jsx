import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSupabaseClient } from './supabaseClient';
import { sfx } from './utils/soundEngine';
import {
  loadImageFromFileOrBlob,
  loadImageFromUrl,
  renderArtworkWithFilter
} from './utils/canvasMutator';
import { STARTER_MEMES, STUDIO_TEMPLATES, RANKS, DAILY_BOUNTIES } from './data/starterMemes';
import NavbarHud from './components/NavbarHud';
import MemeCard from './components/MemeCard';
import MemeStudioModal from './components/MemeStudioModal';
import MemeEvolutionModal from './components/MemeEvolutionModal';
import SwipeDeck from './components/SwipeDeck';
import BattleArena from './components/BattleArena';
import AuthModal from './components/AuthModal';
import MemeTheaterModal from './components/MemeTheaterModal';
import DailyBountyBanner from './components/DailyBountyBanner';
import LeaderboardModal from './components/LeaderboardModal';
import PlayerProfileModal from './components/PlayerProfileModal';
import MemeSkeletonGrid from './components/MemeSkeletonGrid';
import MobileArcadeDock from './components/MobileArcadeDock';

export default function App() {
  // Core Feed & Filter State
  const [memes, setMemes] = useState(STARTER_MEMES);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'top'
  const [category, setCategory] = useState('all'); // 'all' | 'dank' | 'tech' | 'gaming' | 'relatable'
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'swipe' | 'battle'
  const [searchQuery, setSearchQuery] = useState('');
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'live' | 'local'

  // Fork & Mutate + Evolution Tree + Theater Lightbox State
  const [mutatingParentMeme, setMutatingParentMeme] = useState(null);
  const [evolutionModalMeme, setEvolutionModalMeme] = useState(null);
  const [evolutionNodes, setEvolutionNodes] = useState([]);
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [theaterMemeId, setTheaterMemeId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('meme') || null;
  });

  // Phase 4: Daily Bounties, Hall of Fame Leaderboard & Player Profiles State
  const [bountyIdx, setBountyIdx] = useState(0);
  const [activeBounty, setActiveBounty] = useState(null);
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [profileUsername, setProfileUsername] = useState(null);

  // Phase 5: Safety, Moderation & Spoiler State
  const [studioIsSpoiler, setStudioIsSpoiler] = useState(false);
  const [uploadError, setUploadError] = useState('');
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

  // Gamification, CRT Shader & Combo State
  const [xp, setXp] = useState(() => Number(localStorage.getItem('tm_xp') || 60));
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [crtOn, setCrtOn] = useState(() => localStorage.getItem('tm_crt') === 'true');
  const [screenShake, setScreenShake] = useState(false);
  const [particles, setParticles] = useState([]);
  const [levelUpBanner, setLevelUpBanner] = useState(null);
  const [userVotes, setUserVotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_votes') || '{}');
    } catch {
      return {};
    }
  });

  // Modals & User Auth State
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user') || 'null');
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Studio 2.0 Modal State
  const [showStudio, setShowStudio] = useState(false);
  const [studioTemplateIdx, setStudioTemplateIdx] = useState(0);
  const [studioTopText, setStudioTopText] = useState(STUDIO_TEMPLATES[0].defaultTop);
  const [studioBottomText, setStudioBottomText] = useState(STUDIO_TEMPLATES[0].defaultBottom);
  const [topTextPos, setTopTextPos] = useState({ x: 300, y: 64 });
  const [bottomTextPos, setBottomTextPos] = useState({ x: 300, y: 490 });
  const [captionFontSize, setCaptionFontSize] = useState(34);
  const [captionLayout, setCaptionLayout] = useState('impact'); // 'impact' | 'topbar' | 'cyberbar'
  const [studioFilter, setStudioFilter] = useState('none'); // 'none' | 'deepfry' | 'vhs' | 'pixelate' | 'chaos' | 'cyber'
  const [studioTitle, setStudioTitle] = useState('');
  const [studioCategory, setStudioCategory] = useState('dank');
  const [studioStickers, setStudioStickers] = useState([]);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [customUploadImg, setCustomUploadImg] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const studioCanvasRef = useRef(null);

  // Interactive Modes State (Comments, Swipe, King of the Hill 1v1 Battle)
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState('');
  const [battlePair, setBattlePair] = useState([0, 1]);
  const [battleWinner, setBattleWinner] = useState(null);
  const [battleStreak, setBattleStreak] = useState(0);
  const [championWins, setChampionWins] = useState(0);
  const [crowdAgreement, setCrowdAgreement] = useState(null);

  // Calculate Rank & Level Progress
  const currentRank = useMemo(() => {
    let r = RANKS[0];
    for (const item of RANKS) {
      if (xp >= item.minXp) r = item;
    }
    return r;
  }, [xp]);

  const nextRank = useMemo(() => {
    return (
      RANKS.find((r) => r.minXp > xp) || {
        level: currentRank.level + 1,
        title: 'Immortal Memer',
        minXp: xp + 1000
      }
    );
  }, [xp, currentRank]);

  const xpProgress = useMemo(() => {
    const prevMin = currentRank.minXp;
    const needed = nextRank.minXp - prevMin;
    const current = xp - prevMin;
    return Math.min(100, Math.max(5, Math.round((current / needed) * 100)));
  }, [xp, currentRank, nextRank]);

  // Persist XP, Votes, CRT, Bounties, Royalties & Reported Memes
  useEffect(() => {
    localStorage.setItem('tm_xp', String(xp));
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('tm_votes', JSON.stringify(userVotes));
  }, [userVotes]);

  useEffect(() => {
    localStorage.setItem('tm_crt', String(crtOn));
  }, [crtOn]);

  useEffect(() => {
    localStorage.setItem('tm_bounties', String(bountiesCompleted));
  }, [bountiesCompleted]);

  useEffect(() => {
    localStorage.setItem('tm_royalties', JSON.stringify(royaltiesMap));
  }, [royaltiesMap]);

  useEffect(() => {
    localStorage.setItem('tm_reported', JSON.stringify(reportedMemeIds));
  }, [reportedMemeIds]);

  // ==========================================
  // INITIALIZE SUPABASE & REALTIME FEED
  // ==========================================
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
      if (data && data.length > 0) {
        const normalized = data.map((row) => ({
          ...row,
          generation: row.generation || 0,
          mutation_count: row.mutation_count || 0,
          reactions: row.reactions || { '🔥': 0, '💀': 0, '😂': 0, '🗿': 0 },
          comments: Array.isArray(row.comments) ? row.comments : []
        }));
        const liveIds = new Set(normalized.map((m) => String(m.id)));
        const merged = [...normalized, ...STARTER_MEMES.filter((s) => !liveIds.has(String(s.id)))];
        setMemes(merged);
      }
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

    if (client && client.auth) {
      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          const email = data.session.user.email || 'Memer';
          const u = {
            id: data.session.user.id,
            username: email.split('@')[0],
            email
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
        }
      });
    }

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

  // ==========================================
  // COMBO MULTIPLIER DECAY LOOP
  // ==========================================
  useEffect(() => {
    if (comboTimer <= 0) return;
    const interval = setInterval(() => {
      setComboTimer((prev) => {
        if (prev <= 4) {
          setCombo(1);
          return 0;
        }
        return prev - 4;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [comboTimer]);

  // ==========================================
  // JUICE HELPERS: ROTATIONAL PARTICLES, XP & COMBO
  // ==========================================
  const spawnParticles = useCallback((x, y, label, emoji = '🔥') => {
    const idBase = Date.now() + Math.random();
    const newItems = [
      {
        id: idBase,
        x,
        y,
        text: label,
        isText: true,
        dx: (Math.random() - 0.5) * 45,
        dy: -80,
        rot: 0
      }
    ];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const speed = 50 + Math.random() * 75;
      newItems.push({
        id: idBase + i + 1,
        x,
        y,
        text: emoji,
        isText: false,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 45,
        rot: Math.round((Math.random() - 0.5) * 260)
      });
    }
    setParticles((prev) => [...prev.slice(-30), ...newItems]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 960);
  }, []);

  const awardXpAndCombo = useCallback(
    (baseXp, event, emoji = '⚡') => {
      const nextCombo = Math.min(5, combo + 1);
      setCombo(nextCombo);
      setComboTimer(100);

      const gained = baseXp * nextCombo;
      setXp((prevXp) => {
        const updated = prevXp + gained;
        const oldRank = RANKS.slice().reverse().find((r) => prevXp >= r.minXp) || RANKS[0];
        const newRank = RANKS.slice().reverse().find((r) => updated >= r.minXp) || RANKS[0];
        if (newRank.level > oldRank.level) {
          sfx.playLevelUp();
          setLevelUpBanner(newRank);
          setTimeout(() => setLevelUpBanner(null), 3500);
        }
        return updated;
      });

      if (nextCombo >= 3) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 260);
      }

      const clientX = event?.clientX || window.innerWidth / 2;
      const clientY = event?.clientY || window.innerHeight / 2;
      spawnParticles(
        clientX,
        clientY,
        `+${gained} XP ${nextCombo > 1 ? `(${nextCombo}x!)` : ''}`,
        emoji
      );
    },
    [combo, spawnParticles]
  );

  // ==========================================
  // PHASE 2: ZERO-FRICTION GLOBAL DRAG-DROP & CTRL+V PASTE
  // ==========================================
  const loadFileIntoStudio = useCallback(async (fileOrBlob) => {
    if (fileOrBlob && fileOrBlob.size && fileOrBlob.size > 15 * 1024 * 1024) {
      setUploadError('Image exceeds 15MB limit. Please choose a smaller file.');
      setShowStudio(true);
      return;
    }
    try {
      const img = await loadImageFromFileOrBlob(fileOrBlob);
      sfx.playMutate();
      setUploadError('');
      setCustomUploadImg(img);
      setSelectedStickerId(null);
      setShowStudio(true);
    } catch {
      setUploadError('Could not decode image file. Try PNG, JPG, GIF, or WebP.');
    }
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
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
      if (file && file.type.startsWith('image/')) {
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

  const handleLoadUrlIntoStudio = useCallback(async (url) => {
    const img = await loadImageFromUrl(url);
    sfx.playMutate();
    setUploadError('');
    setCustomUploadImg(img);
    setSelectedStickerId(null);
    setShowStudio(true);
  }, []);

  // ==========================================
  // FORK & MUTATE HANDLERS + EVOLUTION TREE
  // ==========================================
  const handleOpenBlankStudio = useCallback(() => {
    setMutatingParentMeme(null);
    setActiveBounty(null);
    setCustomUploadImg(null);
    setStudioTitle('');
    setStudioStickers([]);
    setSelectedStickerId(null);
    setStudioFilter('none');
    setStudioIsSpoiler(false);
    setUploadError('');
    setCaptionLayout('impact');
    setCaptionFontSize(34);
    setTopTextPos({ x: 300, y: 64 });
    setBottomTextPos({ x: 300, y: 490 });
    setStudioTopText(STUDIO_TEMPLATES[0].defaultTop);
    setStudioBottomText(STUDIO_TEMPLATES[0].defaultBottom);
    setShowStudio(true);
  }, []);

  const handleAcceptBounty = useCallback((bounty) => {
    if (!bounty) return;
    sfx.playMutate();
    setActiveBounty(bounty);
    setMutatingParentMeme(null);
    setCustomUploadImg(null);
    setStudioTemplateIdx(bounty.templateIdx || 0);
    setStudioCategory(bounty.category || 'dank');
    setStudioTitle(`BOUNTY: ${bounty.prompt}`);
    setStudioTopText(bounty.defaultTop || 'WHEN THE BOUNTY DROPS');
    setStudioBottomText(bounty.defaultBottom || '+200 XP INCOMING');
    setTopTextPos({ x: 300, y: 64 });
    setBottomTextPos({ x: 300, y: 490 });
    setStudioStickers([]);
    setSelectedStickerId(null);
    setStudioFilter('none');
    setShowStudio(true);
  }, []);

  const handleTriggerStudioMutate = useCallback((memeToMutate, event) => {
    if (event) event.stopPropagation();
    sfx.playMutate();

    setActiveBounty(null);
    setMutatingParentMeme(memeToMutate);
    setEvolutionModalMeme(null);
    setStudioTitle(`REMIX: ${memeToMutate.title || 'Untitled'}`);
    setStudioCategory(memeToMutate.category || 'dank');
    setStudioTopText('WAIT A SECOND...');
    setStudioBottomText('PLOT TWIST UNLOCKED 💀');
    setTopTextPos({ x: 300, y: 64 });
    setBottomTextPos({ x: 300, y: 490 });
    setStudioStickers([]);
    setSelectedStickerId(null);
    setStudioFilter('none');

    loadImageFromUrl(memeToMutate.image_url)
      .then((img) => {
        setCustomUploadImg(img);
        setShowStudio(true);
      })
      .catch(() => {
        setCustomUploadImg(null);
        setShowStudio(true);
      });
  }, []);

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
    [memes, combo]
  );

  // ==========================================
  // VOTING, REACTIONS & COMMENTS
  // ==========================================
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

      const multipliedDelta = delta * (direction > 0 ? combo : 1);
      sfx.playVote(direction > 0, combo);
      awardXpAndCombo(15, event, direction > 0 ? '🔥' : '💀');

      let updatedScore = 1;
      setMemes((prev) =>
        prev.map((m) => {
          if (m.id === memeId) {
            updatedScore = (m.score || 0) + multipliedDelta;
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
            delta: multipliedDelta
          });
          if (rpcError) {
            await client.from('memes').update({ score: updatedScore }).eq('id', memeId);
          }
        } catch {
          // Local state already updated
        }
      }
    },
    [userVotes, combo, awardXpAndCombo]
  );

  const handleReaction = useCallback(
    async (memeId, emoji, event) => {
      sfx.playPop(combo);
      awardXpAndCombo(10, event, emoji);

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

      const client = getSupabaseClient();
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
    [combo, awardXpAndCombo]
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
      awardXpAndCombo(25, e, '💬');
      setCommentInputs((prev) => ({ ...prev, [memeId]: '' }));

      setMemes((prev) =>
        prev.map((m) =>
          m.id === memeId ? { ...m, comments: [...(m.comments || []), newComment] } : m
        )
      );

      const client = getSupabaseClient();
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
    [commentInputs, user, combo, awardXpAndCombo]
  );

  // ==========================================
  // HTML5 CANVAS MEME STUDIO 2.0 RENDERER & EXPORT
  // ==========================================
  const drawStudioCanvas = useCallback(
    (hideSelectionUI = false) => {
      const canvas = studioCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = 600;
      const H = 552; // 520px meme area + 32px 16-bit Arcade Cartridge Footer
      const memeH = 520;
      canvas.width = W;
      canvas.height = H;

      const tpl = STUDIO_TEMPLATES[studioTemplateIdx] || STUDIO_TEMPLATES[0];
      const hasTopBar = captionLayout === 'topbar' && Boolean(studioTopText.trim());
      const topBarH = hasTopBar ? 86 : 0;
      const artY = topBarH;
      const artH = memeH - topBarH;

      // 1. Render Base Artwork with Chosen Viral Filter / Glitch FX
      renderArtworkWithFilter(ctx, W, artY, artH, studioFilter, (bctx, bw, bh) => {
        if (customUploadImg) {
          bctx.fillStyle = '#090a0f';
          bctx.fillRect(0, 0, bw, bh);
          const scale = Math.min(bw / customUploadImg.width, bh / customUploadImg.height);
          const dw = customUploadImg.width * scale;
          const dh = customUploadImg.height * scale;
          bctx.drawImage(customUploadImg, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
        } else {
          const grad = bctx.createLinearGradient(0, 0, bw, bh);
          grad.addColorStop(0, tpl.bg1);
          grad.addColorStop(1, tpl.bg2);
          bctx.fillStyle = grad;
          bctx.fillRect(0, 0, bw, bh);

          bctx.fillStyle = tpl.accent;
          bctx.globalAlpha = 0.14;
          bctx.beginPath();
          bctx.arc(bw / 2, bh / 2, 150, 0, Math.PI * 2);
          bctx.fill();
          bctx.globalAlpha = 1;

          bctx.font = '120px sans-serif';
          bctx.textAlign = 'center';
          bctx.textBaseline = 'middle';
          bctx.fillText(tpl.emoji, bw / 2, bh / 2);
        }
      });

      // 2. Draw Draggable Stickers
      studioStickers.forEach((st) => {
        const sz = st.size || 60;
        ctx.save();
        ctx.font = `${sz}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.emoji, st.x, st.y);

        if (!hideSelectionUI && st.id === selectedStickerId) {
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.arc(st.x, st.y, sz * 0.62, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 3. Draw Captions According to Layout Mode ('impact' | 'topbar' | 'cyberbar')
      const drawImpactText = (text, xPos, yPos, fill) => {
        if (!text) return;
        ctx.save();
        ctx.font = `900 ${captionFontSize}px Impact, "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(5, Math.round(captionFontSize * 0.2));
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = fill;
        const upper = text.toUpperCase();
        ctx.strokeText(upper, xPos, yPos, W - 36);
        ctx.fillText(upper, xPos, yPos, W - 36);
        ctx.restore();
      };

      if (captionLayout === 'topbar') {
        if (hasTopBar) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, W, topBarH);
          ctx.fillStyle = '#090a0f';
          ctx.font = `800 ${Math.min(28, captionFontSize - 4)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(studioTopText, W / 2, topBarH / 2, W - 36);
        }
        drawImpactText(
          studioBottomText,
          bottomTextPos.x,
          bottomTextPos.y,
          mutatingParentMeme ? '#ff00ff' : tpl.accent || '#facc15'
        );
      } else if (captionLayout === 'cyberbar') {
        if (studioTopText) {
          ctx.fillStyle = 'rgba(7, 8, 16, 0.82)';
          ctx.fillRect(0, topTextPos.y - 28, W, 56);
          ctx.fillStyle = '#00f3ff';
          ctx.fillRect(0, topTextPos.y + 26, W, 2);
          ctx.font = `900 ${Math.min(30, captionFontSize)}px "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#00f3ff';
          ctx.fillText(studioTopText.toUpperCase(), topTextPos.x, topTextPos.y, W - 36);
        }
        if (studioBottomText) {
          ctx.fillStyle = 'rgba(7, 8, 16, 0.82)';
          ctx.fillRect(0, bottomTextPos.y - 28, W, 56);
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(0, bottomTextPos.y - 28, W, 2);
          ctx.font = `900 ${Math.min(30, captionFontSize)}px "Courier New", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f472b6';
          ctx.fillText(studioBottomText.toUpperCase(), bottomTextPos.x, bottomTextPos.y, W - 36);
        }
      } else {
        drawImpactText(studioTopText, topTextPos.x, topTextPos.y, '#ffffff');
        drawImpactText(
          studioBottomText,
          bottomTextPos.x,
          bottomTextPos.y,
          mutatingParentMeme ? '#ff00ff' : tpl.accent || '#facc15'
        );
      }

      // 4. 16-Bit Arcade Cartridge Footer Bar (Bottom 32px)
      const nextGen = mutatingParentMeme ? (mutatingParentMeme.generation || 0) + 1 : 0;
      const handle = (user?.username || 'ANON_PLAYER').toUpperCase();

      ctx.fillStyle = '#06070d';
      ctx.fillRect(0, memeH, W, 32);

      ctx.fillStyle = nextGen > 0 ? '#ec4899' : '#00f3ff';
      ctx.fillRect(0, memeH, W, 2);

      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00f3ff';
      ctx.fillText('⚡ THEMEMES.NET', 14, memeH + 17);

      ctx.textAlign = 'right';
      ctx.fillStyle = nextGen > 0 ? '#f472b6' : '#facc15';
      const rightBadge =
        nextGen > 0
          ? `🧬 GEN-${nextGen} MUTATION // BY @${handle}`
          : `🕹️ GEN-0 ORIGIN // BY @${handle}`;
      ctx.fillText(rightBadge, W - 14, memeH + 17);
    },
    [
      studioTemplateIdx,
      studioTopText,
      studioBottomText,
      topTextPos,
      bottomTextPos,
      captionFontSize,
      captionLayout,
      studioFilter,
      studioStickers,
      selectedStickerId,
      customUploadImg,
      mutatingParentMeme,
      user
    ]
  );

  useEffect(() => {
    if (showStudio) {
      drawStudioCanvas(false);
    }
  }, [showStudio, drawStudioCanvas]);

  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFileIntoStudio(file);
  };

  const handleDownloadPng = (e) => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    drawStudioCanvas(true);
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    drawStudioCanvas(false);

    const link = document.createElement('a');
    link.download = `thememes-net-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    sfx.playPop(combo);
    awardXpAndCombo(25, e, '💾');
  };

  const handleCopyClipboardPng = async (e) => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    try {
      drawStudioCanvas(true);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      drawStudioCanvas(false);

      if (blob && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setClipboardStatus('✅ Copied Image!');
        sfx.playPop(combo);
        awardXpAndCombo(20, e, '📋');
        setTimeout(() => setClipboardStatus(''), 2500);
      } else {
        setClipboardStatus('⚠️ Use Download PNG');
        setTimeout(() => setClipboardStatus(''), 2500);
      }
    } catch {
      setClipboardStatus('⚠️ Copy blocked by browser');
      setTimeout(() => setClipboardStatus(''), 2500);
    }
  };

  const handlePublishMeme = async (e) => {
    e.preventDefault();
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    const now = Date.now();
    if (now - lastPublishTimeRef.current < 4000) {
      setUploadError('Arcade Cooldown: Wait 4 seconds between publishes to prevent spam.');
      return;
    }
    lastPublishTimeRef.current = now;
    setUploadError('');

    setIsPublishing(true);
    drawStudioCanvas(true);

    const finalTitle = studioTitle.trim() || `${studioTopText} — ${studioBottomText}`;
    const author = user?.username || 'AnonMemer';
    const nextGen = mutatingParentMeme ? (mutatingParentMeme.generation || 0) + 1 : 0;
    const parentId = mutatingParentMeme ? mutatingParentMeme.id : null;
    const rootId = mutatingParentMeme
      ? mutatingParentMeme.root_meme_id || mutatingParentMeme.id
      : null;

    let imageUrl = canvas.toDataURL('image/png', 0.92);

    const localFallbackMeme = {
      id: `local-${Date.now()}`,
      title: finalTitle,
      category: studioCategory,
      image_url: imageUrl,
      author_name: author,
      score: 1,
      generation: nextGen,
      mutation_count: 0,
      parent_meme_id: parentId,
      root_meme_id: rootId,
      is_bounty: Boolean(activeBounty),
      bounty_id: activeBounty?.id || null,
      is_spoiler: Boolean(studioIsSpoiler),
      created_at: new Date().toISOString(),
      reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
      comments: []
    };

    const client = getSupabaseClient();
    let savedToDb = false;

    if (client) {
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const fileName = `meme-${Date.now()}-gen${nextGen}-${Math.random().toString(36).slice(2, 7)}.png`;
        const { error: uploadErr } = await client.storage
          .from('memes')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadErr) {
          const { data: pubData } = client.storage.from('memes').getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            imageUrl = pubData.publicUrl;
          }
        }

        const isParentUuid =
          parentId && !String(parentId).startsWith('seed-') && !String(parentId).startsWith('local-');

        const payload = {
          title: finalTitle,
          category: studioCategory,
          image_url: imageUrl,
          author_name: author,
          score: 1,
          reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
          ...(isParentUuid ? { parent_meme_id: parentId } : {})
        };

        const { data: insertedRow, error: dbErr } = await client
          .from('memes')
          .insert([payload])
          .select()
          .single();

        if (!dbErr && insertedRow) {
          savedToDb = true;
          setMemes((prev) => [
            {
              ...insertedRow,
              generation: insertedRow.generation ?? nextGen,
              mutation_count: 0,
              parent_meme_id: parentId,
              root_meme_id: rootId || insertedRow.id,
              is_bounty: Boolean(activeBounty),
              bounty_id: activeBounty?.id || null,
              is_spoiler: Boolean(studioIsSpoiler),
              comments: []
            },
            ...prev.map((m) =>
              m.id === parentId ? { ...m, mutation_count: (m.mutation_count || 0) + 1 } : m
            )
          ]);
        }
      } catch {
        // Fallback handled below
      }
    }

    if (!savedToDb) {
      setMemes((prev) => [
        { ...localFallbackMeme, image_url: imageUrl },
        ...prev.map((m) =>
          m.id === parentId ? { ...m, mutation_count: (m.mutation_count || 0) + 1 } : m
        )
      ]);
    }

    // Credit +50 XP Creator Royalty to the Parent Meme Author on Fork & Mutate
    if (mutatingParentMeme?.author_name) {
      const parentAuthor = mutatingParentMeme.author_name;
      setRoyaltiesMap((prev) => ({
        ...prev,
        [parentAuthor]: (prev[parentAuthor] || 0) + 50
      }));
      if (user?.username && parentAuthor.toLowerCase() === user.username.toLowerCase()) {
        setXp((prevXp) => prevXp + 50);
      }
    }

    sfx.playLevelUp();
    if (activeBounty) {
      setBountiesCompleted((c) => c + 1);
      awardXpAndCombo(activeBounty.rewardXp || 200, e, '🎯');
    } else {
      awardXpAndCombo(mutatingParentMeme ? 150 : 100, e, mutatingParentMeme ? '🧬' : '🚀');
    }

    setIsPublishing(false);
    setShowStudio(false);
    setMutatingParentMeme(null);
    setActiveBounty(null);
    setStudioIsSpoiler(false);
    setStudioTitle('');
    setStudioStickers([]);
    setSelectedStickerId(null);
    setCustomUploadImg(null);
    setViewMode('feed');
    setSortBy('latest');
  };

  // ==========================================
  // AUTH HANDLER (SUPABASE AUTH + INSTANT GUEST)
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthMessage('Connecting...');
    const client = getSupabaseClient();

    if (client && authEmail && authPassword) {
      try {
        if (authMode === 'signup') {
          const { data, error } = await client.auth.signUp({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          const handle = authUsername.trim() || authEmail.split('@')[0];
          const u = { id: data?.user?.id || Date.now(), username: handle, email: authEmail };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          return;
        } else {
          const { data, error } = await client.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          if (error) throw error;
          const handle = authEmail.split('@')[0];
          const u = { id: data?.user?.id || Date.now(), username: handle, email: authEmail };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          return;
        }
      } catch (err) {
        setAuthMessage(err.message || 'Auth error — try Quick Arcade Guest login below!');
        return;
      }
    }
  };

  const handleQuickGuestLogin = () => {
    const cleanName = authUsername.trim() || `Memer_${Math.floor(100 + Math.random() * 899)}`;
    const u = { id: `guest-${Date.now()}`, username: cleanName };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    sfx.playLevelUp();
  };

  // ==========================================
  // PHASE 3 & 5: FILTERING, PAGINATION, MODERATION, THEATER, SWIPE & ARENA
  // ==========================================
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

  const filteredMemes = useMemo(() => {
    return memes
      .filter((m) => {
        if (reportedMemeIds.includes(String(m.id))) return false;
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
        if (sortBy === 'latest') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return (b.score || 0) - (a.score || 0);
      });
  }, [memes, reportedMemeIds, category, searchQuery, sortBy]);

  const visibleMemes = useMemo(() => {
    return filteredMemes.slice(0, visibleCount);
  }, [filteredMemes, visibleCount]);

  // Automatic Infinite-Scroll Observer on Sentinel
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

  const handleOpenTheater = useCallback((meme) => {
    if (!meme) return;
    sfx.playToggle();
    setTheaterMemeId(meme.id);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('meme', String(meme.id));
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleCloseTheater = useCallback(() => {
    setTheaterMemeId(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('meme');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleShareMeme = useCallback(
    (meme, e) => {
      if (!meme) return;
      const shareUrl = `${window.location.origin}/?meme=${encodeURIComponent(String(meme.id))}`;
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      sfx.playPop(combo);
      awardXpAndCombo(10, e, '🔗');
    },
    [combo, awardXpAndCombo]
  );

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
        let nextChallenger = ( Math.max(battlePair[0], battlePair[1]) + 1 ) % len;
        if (nextChallenger === pickedMemeIdx) {
          nextChallenger = (nextChallenger + 1) % len;
        }
        // King stays in Slot 0, new Challenger enters Slot 1
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
    setBattlePair(([a, b]) => [(a + 1) % len, (b + 2) % len === (a + 1) % len ? (b + 3) % len : (b + 2) % len]);
  };

  return (
    <div className={`tm-app ${screenShake ? 'tm-shake' : ''}`}>
      {/* ACTIVE-BY-DEFAULT SYNTHWAVE PERSPECTIVE GRID & NEON GLOW BACKDROP */}
      <div className="tm-synthwave-bg" aria-hidden="true">
        <div className="tm-synthwave-glow" />
        <div className="tm-synthwave-grid" />
      </div>

      {/* OPTIONAL CRT SCANLINE & PHOSPHOR SHADER OVERLAY */}
      {crtOn && <div className="tm-crt-overlay" aria-hidden="true" />}

      {/* GLOBAL DRAG-AND-DROP OVERLAY */}
      {isDraggingFile && (
        <div className="tm-global-dropzone">
          <div style={{ fontSize: '56px' }}>📥</div>
          <h2 style={{ margin: 0, fontSize: '26px', color: '#00f3ff' }}>
            DROP IMAGE TO LAUNCH MEME FORGE STUDIO
          </h2>
          <p style={{ margin: 0, color: '#f472b6', fontWeight: 800 }}>
            Instant Canvas Load + 16-Bit Cartridge Stamp (+100 XP)
          </p>
        </div>
      )}

      {/* FLOATING PHYSICS PARTICLES OVERLAY */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="tm-particle"
          style={{
            left: p.x,
            top: p.y,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rot': `${p.rot || 0}deg`,
            fontSize: p.isText ? '16px' : '24px',
            color: '#facc15',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)'
          }}
        >
          {p.text}
        </div>
      ))}

      {/* LEVEL UP BANNER */}
      {levelUpBanner && (
        <div className="tm-levelup-toast">
          🎉 LEVEL UP! You reached Lv.{levelUpBanner.level}: {levelUpBanner.title}!
        </div>
      )}

      {/* TOP NAVIGATION & ARCADE HUD */}
      <NavbarHud
        comboTimer={comboTimer}
        combo={combo}
        dbStatus={dbStatus}
        currentRank={currentRank}
        xp={xp}
        xpProgress={xpProgress}
        crtOn={crtOn}
        onToggleCrt={() => {
          sfx.playToggle();
          setCrtOn((prev) => !prev);
        }}
        soundOn={soundOn}
        onToggleSound={() => {
          sfx.enabled = !soundOn;
          setSoundOn(!soundOn);
        }}
        onOpenBlankStudio={handleOpenBlankStudio}
        onOpenLeaderboard={() => {
          sfx.playToggle();
          setShowLeaderboard(true);
        }}
        onOpenProfile={(username) => {
          sfx.playToggle();
          setProfileUsername(username);
        }}
        user={user}
        onLogout={() => {
          setUser(null);
          localStorage.removeItem('tm_user');
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onResetFeed={() => {
          setViewMode('feed');
          setCategory('all');
        }}
      />

      {/* PHASE 4: FEATURED DAILY MEME BOUNTY BANNER */}
      <DailyBountyBanner
        bounty={DAILY_BOUNTIES[bountyIdx % DAILY_BOUNTIES.length]}
        bountyIdx={bountyIdx % DAILY_BOUNTIES.length}
        totalBounties={DAILY_BOUNTIES.length}
        onCycleBounty={() => {
          sfx.playToggle();
          setBountyIdx((i) => (i + 1) % DAILY_BOUNTIES.length);
        }}
        onAcceptBounty={handleAcceptBounty}
      />

      {/* SUB-NAVIGATION: SORT, CATEGORIES & GAME MODES */}
      <section className="tm-controls">
        <div className="tm-tabs">
          <button
            type="button"
            className={`tm-tab ${sortBy === 'latest' ? 'active' : ''}`}
            onClick={() => setSortBy('latest')}
          >
            ⚡ Latest
          </button>
          <button
            type="button"
            className={`tm-tab ${sortBy === 'top' ? 'active' : ''}`}
            onClick={() => setSortBy('top')}
          >
            🔥 Top This Week
          </button>
          {['all', 'dank', 'tech', 'gaming', 'relatable'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`tm-tab ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              #{cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="tm-input"
            placeholder="Search memes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '170px' }}
          />
          <div className="tm-mode-switch">
            <button
              type="button"
              className={`tm-mode-btn ${viewMode === 'feed' ? 'active' : ''}`}
              onClick={() => setViewMode('feed')}
            >
              📱 Grid Feed
            </button>
            <button
              type="button"
              className={`tm-mode-btn ${viewMode === 'swipe' ? 'active' : ''}`}
              onClick={() => setViewMode('swipe')}
            >
              ⚡ Hyper-Swipe
            </button>
            <button
              type="button"
              className={`tm-mode-btn ${viewMode === 'battle' ? 'active' : ''}`}
              onClick={() => setViewMode('battle')}
            >
              ⚔️ 1v1 Arena
            </button>
          </div>
        </div>
      </section>

      {/* MODE 1: HOLOGRAPHIC MASONRY GRID FEED (+ SKELETON SHIMMER & INFINITE PAGINATION) */}
      {viewMode === 'feed' && (
        <>
          {reportedMemeIds.length > 0 && (
            <div className="tm-moderation-bar">
              <button
                type="button"
                className="tm-link-btn"
                onClick={handleRestoreReportedMemes}
              >
                👁️ {reportedMemeIds.length} Hidden Meme{reportedMemeIds.length > 1 ? 's' : ''} — Click to Restore
              </button>
            </div>
          )}

          {isLoadingFeed ? (
            <MemeSkeletonGrid count={6} />
          ) : (
            <main className="tm-grid">
              {visibleMemes.map((meme) => (
                <MemeCard
                  key={meme.id}
                  meme={meme}
                  myVote={userVotes[meme.id] || 0}
                  isCommentsOpen={!!openComments[meme.id]}
                  commentInput={commentInputs[meme.id] || ''}
                  onVote={handleVote}
                  onReaction={handleReaction}
                  onToggleComments={handleToggleComments}
                  onCommentInputChange={handleCommentInputChange}
                  onAddComment={handleAddComment}
                  onOpenEvolutionTree={handleOpenEvolutionTree}
                  onTriggerStudioMutate={handleTriggerStudioMutate}
                  onOpenTheater={handleOpenTheater}
                  onShareMeme={handleShareMeme}
                  onOpenProfile={(username) => {
                    sfx.playToggle();
                    setProfileUsername(username);
                  }}
                  onReportMeme={handleReportMeme}
                />
              ))}
            </main>
          )}

          {!isLoadingFeed && visibleCount < filteredMemes.length && (
            <div ref={loadMoreSentinelRef} className="tm-load-more-bar">
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                onClick={() => {
                  sfx.playToggle();
                  setVisibleCount((prev) => prev + 6);
                }}
              >
                ⚡ Load More Memes ({filteredMemes.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* MODE 2: PHYSICS HYPER-SWIPE DECK */}
      {viewMode === 'swipe' && (
        <SwipeDeck
          filteredMemes={filteredMemes}
          swipeIndex={swipeIndex}
          swipeAnim={swipeAnim}
          onTriggerSwipe={triggerSwipe}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onOpenTheater={handleOpenTheater}
        />
      )}

      {/* MODE 3: KING OF THE HILL 1v1 MEME BATTLE ARENA */}
      {viewMode === 'battle' && (
        <BattleArena
          memes={memes}
          battlePair={battlePair}
          battleWinner={battleWinner}
          battleStreak={battleStreak}
          championWins={championWins}
          crowdAgreement={crowdAgreement}
          onBattlePick={handleBattlePick}
          onSkipMatchup={handleSkipMatchup}
        />
      )}

      {/* COMMUNITY MODERATION TOAST */}
      {moderationToast && (
        <div className="tm-moderation-toast">
          <span>{moderationToast}</span>
          <button
            type="button"
            className="tm-link-btn"
            style={{ color: '#facc15' }}
            onClick={handleRestoreReportedMemes}
          >
            ↺ Undo
          </button>
        </div>
      )}

      {/* PHASE 5: THUMB-FRIENDLY MOBILE BOTTOM ARCADE DOCK */}
      <MobileArcadeDock
        viewMode={viewMode}
        onSelectMode={(mode) => {
          sfx.playToggle();
          setViewMode(mode);
        }}
        onOpenBlankStudio={handleOpenBlankStudio}
        onOpenLeaderboard={() => {
          sfx.playToggle();
          setShowLeaderboard(true);
        }}
      />

      {/* MODAL 0: FULLSCREEN THEATER LIGHTBOX & DEEP-LINK PERMALINK */}
      {theaterMeme && (
        <MemeTheaterModal
          meme={theaterMeme}
          filteredMemes={filteredMemes}
          memes={memes}
          myVote={userVotes[theaterMeme.id] || 0}
          commentInput={commentInputs[theaterMeme.id] || ''}
          onCommentInputChange={handleCommentInputChange}
          onAddComment={handleAddComment}
          onVote={handleVote}
          onReaction={handleReaction}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onSelectMeme={handleOpenTheater}
          onClose={handleCloseTheater}
          onShareMeme={handleShareMeme}
        />
      )}

      {/* MODAL 1: HTML5 CANVAS MEME STUDIO 2.0 (+ FORK & MUTATE / BOUNTY / SPOILER) */}
      {showStudio && (
        <MemeStudioModal
          mutatingParentMeme={mutatingParentMeme}
          activeBounty={activeBounty}
          studioIsSpoiler={studioIsSpoiler}
          setStudioIsSpoiler={setStudioIsSpoiler}
          uploadError={uploadError}
          studioCanvasRef={studioCanvasRef}
          studioTemplateIdx={studioTemplateIdx}
          setStudioTemplateIdx={setStudioTemplateIdx}
          studioTopText={studioTopText}
          setStudioTopText={setStudioTopText}
          studioBottomText={studioBottomText}
          setStudioBottomText={setStudioBottomText}
          topTextPos={topTextPos}
          setTopTextPos={setTopTextPos}
          bottomTextPos={bottomTextPos}
          setBottomTextPos={setBottomTextPos}
          captionFontSize={captionFontSize}
          setCaptionFontSize={setCaptionFontSize}
          captionLayout={captionLayout}
          setCaptionLayout={setCaptionLayout}
          studioFilter={studioFilter}
          setStudioFilter={setStudioFilter}
          studioTitle={studioTitle}
          setStudioTitle={setStudioTitle}
          studioCategory={studioCategory}
          setStudioCategory={setStudioCategory}
          studioStickers={studioStickers}
          setStudioStickers={setStudioStickers}
          selectedStickerId={selectedStickerId}
          setSelectedStickerId={setSelectedStickerId}
          customUploadImg={customUploadImg}
          setCustomUploadImg={setCustomUploadImg}
          setMutatingParentMeme={setMutatingParentMeme}
          onCustomImageUpload={handleCustomImageUpload}
          onLoadUrlIntoStudio={handleLoadUrlIntoStudio}
          onOpenBlankStudio={handleOpenBlankStudio}
          onDownloadPng={handleDownloadPng}
          onCopyClipboardPng={handleCopyClipboardPng}
          clipboardStatus={clipboardStatus}
          onClose={() => setShowStudio(false)}
          onPublishMeme={handlePublishMeme}
          isPublishing={isPublishing}
        />
      )}

      {/* MODAL 2: MEME EVOLUTION TREE INSPECTOR */}
      <MemeEvolutionModal
        evolutionModalMeme={evolutionModalMeme}
        evolutionNodes={evolutionNodes}
        loadingEvolution={loadingEvolution}
        onClose={() => setEvolutionModalMeme(null)}
        onTriggerStudioMutate={handleTriggerStudioMutate}
      />

      {/* MODAL 3: SUPABASE AUTH & INSTANT GUEST LOGIN */}
      {showAuthModal && (
        <AuthModal
          authMode={authMode}
          setAuthMode={setAuthMode}
          authUsername={authUsername}
          setAuthUsername={setAuthUsername}
          authEmail={authEmail}
          setAuthEmail={setAuthEmail}
          authPassword={authPassword}
          setAuthPassword={setAuthPassword}
          authMessage={authMessage}
          onQuickGuestLogin={handleQuickGuestLogin}
          onAuthSubmit={handleAuthSubmit}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* MODAL 4: HALL OF FAME LEADERBOARD */}
      {showLeaderboard && (
        <LeaderboardModal
          memes={memes}
          currentUser={user}
          currentXp={xp}
          royaltiesMap={royaltiesMap}
          onClose={() => setShowLeaderboard(false)}
          onSelectCreator={(username) => {
            setShowLeaderboard(false);
            setProfileUsername(username);
          }}
          onSelectMeme={handleOpenTheater}
        />
      )}

      {/* MODAL 5: CREATOR ARCADE PROFILE & ACHIEVEMENT BADGE CASE */}
      {profileUsername && (
        <PlayerProfileModal
          username={profileUsername}
          memes={memes}
          currentUser={user}
          currentXp={xp}
          battleStreak={battleStreak}
          bountiesCompleted={bountiesCompleted}
          royaltiesMap={royaltiesMap}
          onClose={() => setProfileUsername(null)}
          onSelectMeme={handleOpenTheater}
          onTriggerStudioMutate={handleTriggerStudioMutate}
        />
      )}
    </div>
  );
}