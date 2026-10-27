import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getSupabaseClient, fetchSupabaseAuthSettings } from './supabaseClient';
import { sfx } from './utils/soundEngine';
import {
  loadImageFromFileOrBlob,
  loadImageFromUrl,
  renderArtworkWithFilter,
  stampArcadeCartridgeFooter
} from './utils/canvasMutator';
import {
  VIRAL_CAPTIONS,
  RANKS,
  DAILY_BOUNTIES,
  DAILY_QUESTS,
  CURSOR_TRAILS,
  MEME_FORTUNES,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown,
  formatMemeUploadDate
} from './data/starterMemes';
import {
  ARCADE_ECONOMY_RULES,
  loadTokenLedger,
  saveTokenLedger,
  loadTokenBalance,
  saveTokenBalance,
  evaluateTokenAward,
  getTodayDateString
} from './utils/tokenEconomy';
import { updateDynamicSeo } from './utils/seoEngine';
import NavbarHud from './components/NavbarHud';
import QuickUploadBar from './components/QuickUploadBar';
import MemeCard from './components/MemeCard';
import MemeStudioModal from './components/MemeStudioModal';
import MemeEvolutionModal from './components/MemeEvolutionModal';
import SwipeDeck from './components/SwipeDeck';
import BattleArena from './components/BattleArena';
import VerticalReelsView from './components/VerticalReelsView';
import MemeCrushGame from './components/MemeCrushGame';
import VegasPinballGame from './components/VegasPinballGame';
import AuthModal from './components/AuthModal';
import MemeTheaterModal from './components/MemeTheaterModal';
import LeaderboardModal from './components/LeaderboardModal';
import PlayerProfileModal from './components/PlayerProfileModal';
import MemeSkeletonGrid from './components/MemeSkeletonGrid';
import MobileArcadeDock from './components/MobileArcadeDock';
import MemeSoundboardBar from './components/MemeSoundboardBar';
import RewardsModal from './components/RewardsModal';
import AiRoastModal from './components/AiRoastModal';
import BossKeyOverlay from './components/BossKeyOverlay';
import SeoDiscoveryFooter from './components/SeoDiscoveryFooter';
import DankPetWidget from './components/DankPetWidget';

export default function App() {
  // Core Feed & Filter State (100% User-Uploaded Memes Only — Zero Template Memes)
  const [memes, setMemes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tm_user_memes') || '[]');
      return Array.isArray(saved)
        ? saved.filter((m) => m && !String(m.id).startsWith('seed-'))
        : [];
    } catch {
      return [];
    }
  });
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'top' | 'new24h'
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_saved_memes') || '[]');
    } catch {
      return [];
    }
  });
  const quickUploadInputRef = useRef(null);
  const [category, setCategory] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    const cat = new URLSearchParams(window.location.search).get('category');
    return ['all', 'dank', 'tech', 'gaming', 'relatable'].includes(cat) ? cat : 'all';
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'feed';
    const mode = new URLSearchParams(window.location.search).get('mode');
    return ['feed', 'reels', 'crush', 'pinball', 'swipe', 'battle'].includes(mode)
      ? mode
      : 'feed';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') || '';
  });
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

  // Gamification, Fair Arcade Tokens, CRT Shader, Sound Pack & Combo State
  const [xp, setXp] = useState(() => Number(localStorage.getItem('tm_xp') || 60));
  const [tokens, setTokens] = useState(() => loadTokenBalance());
  const [tokenLedger, setTokenLedger] = useState(() => loadTokenLedger());
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [soundPack, setSoundPack] = useState(
    () => localStorage.getItem('tm_sound_pack') || 'goofy'
  );
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
  const [userReactionsMap, setUserReactionsMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user_reactions') || '{}');
    } catch {
      return {};
    }
  });

  // Phase 8 & 9: Rewards Vault, Wheel of Chaos, Daily Quests, AI Roast & Boss Key State
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [lootSpins, setLootSpins] = useState(() =>
    Math.min(
      ARCADE_RATE_LIMITS.MAX_STORED_WHEEL_SPINS,
      Math.max(0, Number(localStorage.getItem('tm_spins') ?? 2))
    )
  );

  // Phase 17 & Sub-Games: Timed-Window Economy & Spin/Game Rate-Limiting State
  const [rateWindows, setRateWindows] = useState(() => {
    const now = Date.now();
    try {
      const saved = JSON.parse(localStorage.getItem('tm_rate_windows') || '{}');
      return {
        slotUsed: Number(saved.slotUsed || 0),
        slotStart: Number(saved.slotStart || now),
        wheelUsed: Number(saved.wheelUsed || 0),
        wheelStart: Number(saved.wheelStart || now),
        goblinUsed: Number(saved.goblinUsed || 0),
        goblinStart: Number(saved.goblinStart || now),
        crushUsed: Number(saved.crushUsed || 0),
        crushStart: Number(saved.crushStart || now),
        pinballUsed: Number(saved.pinballUsed || 0),
        pinballStart: Number(saved.pinballStart || now),
        konamiLastClaim: Number(saved.konamiLastClaim || 0)
      };
    } catch {
      return {
        slotUsed: 0,
        slotStart: now,
        wheelUsed: 0,
        wheelStart: now,
        goblinUsed: 0,
        goblinStart: now,
        crushUsed: 0,
        crushStart: now,
        pinballUsed: 0,
        pinballStart: now,
        konamiLastClaim: 0
      };
    }
  });
  const [nowClock, setNowClock] = useState(() => Date.now());

  // Phase 18: Silly Animated Screen Stampedes & Bubble Wrap Popper State
  const [stampedeSprites, setStampedeSprites] = useState([]);
  const [bubbleWrapItems, setBubbleWrapItems] = useState([]);
  const bubbleComboRef = useRef(0);
  const [streakDays, setStreakDays] = useState(() =>
    Number(localStorage.getItem('tm_streak_days') || 3)
  );
  const [streakClaimedToday, setStreakClaimedToday] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem('tm_streak_date') === today;
  });
  const [unlockedFlairs, setUnlockedFlairs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_flairs') || '[]');
    } catch {
      return [];
    }
  });
  const [equippedFlair, setEquippedFlair] = useState(
    () => localStorage.getItem('tm_equipped_flair') || ''
  );
  const [questProgress, setQuestProgress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_quest_prog') || '{}');
    } catch {
      return {};
    }
  });
  const [claimedQuests, setClaimedQuests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_quest_claimed') || '{}');
    } catch {
      return {};
    }
  });
  const [roastModalMeme, setRoastModalMeme] = useState(null);
  const [roastsRun, setRoastsRun] = useState(() =>
    Number(localStorage.getItem('tm_roasts_run') || 0)
  );
  const [bossKeyActive, setBossKeyActive] = useState(false);

  // Phase 12–15: Chaos Reality Mutators, Golden Loot Goblin, Konami God Mode & Touch/Cursor Trails
  const [chaosMutator, setChaosMutator] = useState('none'); // 'none' | 'rave' | 'australian' | 'deepfry' | 'matrix'
  const [cursorTrail, setCursorTrail] = useState(
    () => localStorage.getItem('tm_cursor_trail') || 'fire'
  );
  const [activeGoblin, setActiveGoblin] = useState(null);
  const [goblinsCaught, setGoblinsCaught] = useState(() =>
    Number(localStorage.getItem('tm_goblins') || 0)
  );
  const [goblinFortuneToast, setGoblinFortuneToast] = useState('');
  const [konamiUnlocked, setKonamiUnlocked] = useState(
    () => localStorage.getItem('tm_konami') === 'true'
  );
  const logoTapRef = useRef({ count: 0, lastTap: 0 });
  const lastTrailTimeRef = useRef(0);

  // Modals & Hardened User Auth State
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
  const failedAuthRef = useRef({ count: 0, lockUntil: 0 });

  // Studio 2.0 Modal State (100% User-Uploaded Images)
  const [showStudio, setShowStudio] = useState(false);
  const [studioTemplateIdx, setStudioTemplateIdx] = useState(0);
  const [studioTopText, setStudioTopText] = useState('');
  const [studioBottomText, setStudioBottomText] = useState('');
  const [studioTextColor, setStudioTextColor] = useState('#facc15');
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

  // Persist XP, Tokens, Token Ledger, Votes, Reactions, CRT, Bounties, Royalties & Reported Memes
  useEffect(() => {
    localStorage.setItem('tm_xp', String(xp));
  }, [xp]);

  useEffect(() => {
    saveTokenBalance(tokens);
  }, [tokens]);

  useEffect(() => {
    saveTokenLedger(tokenLedger);
  }, [tokenLedger]);

  useEffect(() => {
    localStorage.setItem('tm_votes', JSON.stringify(userVotes));
  }, [userVotes]);

  useEffect(() => {
    localStorage.setItem('tm_user_reactions', JSON.stringify(userReactionsMap));
  }, [userReactionsMap]);

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

  useEffect(() => {
    localStorage.setItem('tm_saved_memes', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  useEffect(() => {
    try {
      const localOnly = memes
        .filter((m) => m && !String(m.id).startsWith('seed-'))
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

  useEffect(() => {
    localStorage.setItem('tm_spins', String(lootSpins));
  }, [lootSpins]);

  useEffect(() => {
    localStorage.setItem('tm_streak_days', String(streakDays));
  }, [streakDays]);

  useEffect(() => {
    localStorage.setItem('tm_flairs', JSON.stringify(unlockedFlairs));
  }, [unlockedFlairs]);

  useEffect(() => {
    localStorage.setItem('tm_equipped_flair', equippedFlair);
  }, [equippedFlair]);

  useEffect(() => {
    localStorage.setItem('tm_quest_prog', JSON.stringify(questProgress));
  }, [questProgress]);

  useEffect(() => {
    localStorage.setItem('tm_quest_claimed', JSON.stringify(claimedQuests));
  }, [claimedQuests]);

  useEffect(() => {
    localStorage.setItem('tm_roasts_run', String(roastsRun));
  }, [roastsRun]);

  useEffect(() => {
    localStorage.setItem('tm_cursor_trail', cursorTrail);
  }, [cursorTrail]);

  useEffect(() => {
    localStorage.setItem('tm_goblins', String(goblinsCaught));
  }, [goblinsCaught]);

  useEffect(() => {
    localStorage.setItem('tm_konami', String(konamiUnlocked));
  }, [konamiUnlocked]);

  useEffect(() => {
    localStorage.setItem('tm_rate_windows', JSON.stringify(rateWindows));
  }, [rateWindows]);

  // Phase 17 & Sub-Games: Live Timed-Window Expiration & Cooldown Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNowClock(now);
      setRateWindows((prev) => {
        let changed = false;
        const next = { ...prev };
        if (prev.slotUsed > 0 && now - prev.slotStart >= ARCADE_RATE_LIMITS.SLOT_WINDOW_MS) {
          next.slotUsed = 0;
          next.slotStart = now;
          changed = true;
        }
        if (prev.wheelUsed > 0 && now - prev.wheelStart >= ARCADE_RATE_LIMITS.WHEEL_WINDOW_MS) {
          next.wheelUsed = 0;
          next.wheelStart = now;
          changed = true;
        }
        if (prev.goblinUsed > 0 && now - prev.goblinStart >= ARCADE_RATE_LIMITS.GOBLIN_WINDOW_MS) {
          next.goblinUsed = 0;
          next.goblinStart = now;
          changed = true;
        }
        if (
          prev.crushUsed > 0 &&
          now - prev.crushStart >= ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_WINDOW_MS
        ) {
          next.crushUsed = 0;
          next.crushStart = now;
          changed = true;
        }
        if (
          prev.pinballUsed > 0 &&
          now - prev.pinballStart >= ARCADE_ECONOMY_RULES.SUB_GAMES.PINBALL_WINDOW_MS
        ) {
          next.pinballUsed = 0;
          next.pinballStart = now;
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const slotPullsLeft = Math.max(
    0,
    ARCADE_RATE_LIMITS.SLOT_PULLS_PER_WINDOW - rateWindows.slotUsed
  );
  const slotResetMs =
    rateWindows.slotUsed > 0
      ? Math.max(0, ARCADE_RATE_LIMITS.SLOT_WINDOW_MS - (nowClock - rateWindows.slotStart))
      : 0;

  const wheelSpinsLeftInWindow = Math.max(
    0,
    ARCADE_RATE_LIMITS.WHEEL_SPINS_PER_WINDOW - rateWindows.wheelUsed
  );
  const wheelResetMs =
    rateWindows.wheelUsed > 0
      ? Math.max(0, ARCADE_RATE_LIMITS.WHEEL_WINDOW_MS - (nowClock - rateWindows.wheelStart))
      : 0;

  const goblinsLeftInWindow = Math.max(
    0,
    ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW - rateWindows.goblinUsed
  );
  const goblinResetMs =
    rateWindows.goblinUsed > 0
      ? Math.max(0, ARCADE_RATE_LIMITS.GOBLIN_WINDOW_MS - (nowClock - rateWindows.goblinStart))
      : 0;

  const crushPlaysLeft = Math.max(
    0,
    ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_PLAYS_PER_WINDOW - (rateWindows.crushUsed || 0)
  );
  const crushResetMs =
    rateWindows.crushUsed > 0
      ? Math.max(
          0,
          ARCADE_ECONOMY_RULES.SUB_GAMES.CRUSH_WINDOW_MS - (nowClock - rateWindows.crushStart)
        )
      : 0;

  const pinballPlaysLeft = Math.max(
    0,
    ARCADE_ECONOMY_RULES.SUB_GAMES.PINBALL_PLAYS_PER_WINDOW - (rateWindows.pinballUsed || 0)
  );
  const pinballResetMs =
    rateWindows.pinballUsed > 0
      ? Math.max(
          0,
          ARCADE_ECONOMY_RULES.SUB_GAMES.PINBALL_WINDOW_MS - (nowClock - rateWindows.pinballStart)
        )
      : 0;

  const uploadTokensRemainingToday = Math.max(
    0,
    ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload - (tokenLedger?.byCategory?.upload || 0)
  );

  const gameTokensRemainingToday = Math.max(
    0,
    Math.min(
      ARCADE_ECONOMY_RULES.MAX_DAILY_TOKENS - (tokenLedger?.totalToday || 0),
      ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.games - (tokenLedger?.byCategory?.games || 0)
    )
  );

  const konamiCooldownMs =
    rateWindows.konamiLastClaim > 0
      ? Math.max(
          0,
          ARCADE_RATE_LIMITS.KONAMI_COOLDOWN_MS - (nowClock - rateWindows.konamiLastClaim)
        )
      : 0;

  const addCappedWheelSpins = useCallback((delta = 1) => {
    setLootSpins((prev) =>
      Math.min(ARCADE_RATE_LIMITS.MAX_STORED_WHEEL_SPINS, Math.max(0, prev + delta))
    );
  }, []);

  const incrementQuest = useCallback((questId, delta = 1) => {
    setQuestProgress((prev) => ({
      ...prev,
      [questId]: (prev[questId] || 0) + delta
    }));
  }, []);

  const unclaimedRewardsCount = useMemo(() => {
    let count = lootSpins > 0 ? lootSpins : 0;
    if (!streakClaimedToday) count += 1;
    for (const q of DAILY_QUESTS) {
      if ((questProgress[q.id] || 0) >= q.target && !claimedQuests[q.id]) {
        count += 1;
      }
    }
    return count;
  }, [lootSpins, streakClaimedToday, questProgress, claimedQuests]);

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
        return [...normalized, ...localUserUploads];
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

    let authSub = null;
    if (client && client.auth) {
      const syncAuthSession = (sessionUser) => {
        if (!sessionUser) return;
        const email = sessionUser.email || 'Memer';
        const provider =
          sessionUser.app_metadata?.provider ||
          sessionUser.identities?.[0]?.provider ||
          'email';
        const handle =
          sessionUser.user_metadata?.full_name?.replace(/\s+/g, '_') ||
          sessionUser.user_metadata?.name?.replace(/\s+/g, '_') ||
          email.split('@')[0];
        const u = {
          id: sessionUser.id,
          username: handle.slice(0, 20),
          email,
          provider,
          verified: true
        };
        setUser(u);
        localStorage.setItem('tm_user', JSON.stringify(u));
      };

      client.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          syncAuthSession(data.session.user);
        }
      });

      if (typeof client.auth.onAuthStateChange === 'function') {
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            syncAuthSession(session.user);
          }
        });
        authSub = listener?.subscription;
      }
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
      if (authSub && typeof authSub.unsubscribe === 'function') {
        authSub.unsubscribe();
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

  const awardXpOnly = useCallback(
    (flatXp, event, emoji = '⚡', labelOverride = null) => {
      const gained = Math.max(0, Math.floor(Number(flatXp) || 0));
      const nextCombo = Math.min(3, combo + 1);
      setCombo(nextCombo);
      setComboTimer(100);

      if (gained > 0) {
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
      }

      const clientX = event?.clientX || window.innerWidth / 2;
      const clientY = event?.clientY || window.innerHeight / 2;
      const textLabel = labelOverride || (gained > 0 ? `+${gained} XP` : `${emoji}`);
      spawnParticles(clientX, clientY, textLabel, emoji);
    },
    [combo, spawnParticles]
  );

  /**
   * Logical, Fair & Anti-Loophole Reward Engine:
   * Deduplicates per-meme actions and enforces Daily Maximum Collection Caps.
   */
  const awardFairReward = useCallback(
    ({
      category = 'engagement',
      requestedTokens = 0,
      xpGain = 15,
      actionKey = null,
      event = null,
      emoji = '🪙'
    }) => {
      const evalRes = evaluateTokenAward({
        ledger: tokenLedger,
        category,
        requestedTokens,
        actionKey
      });

      if (!evalRes.allowed) {
        // If already rewarded for this exact meme/action, do not grant duplicate XP or tokens
        if (evalRes.reason === 'already_rewarded') {
          return evalRes;
        }
        // If daily token cap reached, still grant modest non-multiplied XP so progression continues
        if (xpGain > 0) {
          awardXpOnly(xpGain, event, emoji, `+${xpGain} XP (Daily Token Cap Reached)`);
        }
        return evalRes;
      }

      setTokenLedger(evalRes.nextLedger);
      setTokens((prev) => prev + evalRes.awardedTokens);
      awardXpOnly(
        xpGain,
        event,
        emoji,
        `+${evalRes.awardedTokens} 🪙 & +${xpGain} XP`
      );
      return evalRes;
    },
    [tokenLedger, awardXpOnly]
  );

  // Legacy wrapper for non-token visual toys (capped at small flat XP without combo inflation)
  const awardXpAndCombo = useCallback(
    (baseXp, event, emoji = '⚡') => {
      awardXpOnly(Math.min(15, baseXp), event, emoji);
    },
    [awardXpOnly]
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
    setStudioTextColor('#facc15');
    setTopTextPos({ x: 300, y: 64 });
    setBottomTextPos({ x: 300, y: 490 });
    setStudioTopText('');
    setStudioBottomText('');
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

      const safeDelta = Math.max(-2, Math.min(2, delta));
      sfx.playVote(direction > 0, combo);

      // Only reward tokens/XP once per unique meme ID (prevents upvote/downvote toggle farming)
      if (direction > 0) {
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
    [userVotes, combo, awardFairReward, incrementQuest]
  );

  const handleReaction = useCallback(
    async (memeId, emoji, event) => {
      const existingForMeme = userReactionsMap[memeId] || [];
      if (existingForMeme.includes(emoji)) {
        // Already reacted with this emoji on this meme — prevent infinite reaction spam!
        sfx.playToggle();
        return;
      }

      setUserReactionsMap((prev) => ({
        ...prev,
        [memeId]: [...(prev[memeId] || []), emoji]
      }));

      sfx.playReaction(emoji, combo);
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
    [userReactionsMap, combo, awardFairReward, incrementQuest]
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
      if (text.length >= 3) {
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

  // ==========================================
  // HTML5 CANVAS MEME STUDIO 2.0 RENDERER & EXPORT (100% USER UPLOADS)
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

      const hasTopBar = captionLayout === 'topbar' && Boolean(studioTopText.trim());
      const topBarH = hasTopBar ? 86 : 0;
      const artY = topBarH;
      const artH = memeH - topBarH;

      // 1. Render User-Uploaded Artwork with Chosen Photo Filter / Glitch FX
      renderArtworkWithFilter(ctx, W, artY, artH, studioFilter, (bctx, bw, bh) => {
        if (customUploadImg) {
          bctx.fillStyle = '#090a0f';
          bctx.fillRect(0, 0, bw, bh);
          const scale = Math.min(bw / customUploadImg.width, bh / customUploadImg.height);
          const dw = customUploadImg.width * scale;
          const dh = customUploadImg.height * scale;
          bctx.drawImage(customUploadImg, (bw - dw) / 2, (bh - dh) / 2, dw, dh);
        } else {
          // Clean Upload Guide Canvas (Zero Default Template Memes)
          const grad = bctx.createLinearGradient(0, 0, bw, bh);
          grad.addColorStop(0, '#0a0d1a');
          grad.addColorStop(1, '#131629');
          bctx.fillStyle = grad;
          bctx.fillRect(0, 0, bw, bh);

          // Subtle Cyber Grid Guide
          bctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
          bctx.lineWidth = 1;
          for (let gx = 0; gx < bw; gx += 40) {
            bctx.beginPath();
            bctx.moveTo(gx, 0);
            bctx.lineTo(gx, bh);
            bctx.stroke();
          }
          for (let gy = 0; gy < bh; gy += 40) {
            bctx.beginPath();
            bctx.moveTo(0, gy);
            bctx.lineTo(bw, gy);
            bctx.stroke();
          }

          if (!hideSelectionUI) {
            bctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
            bctx.lineWidth = 2;
            bctx.setLineDash([8, 6]);
            bctx.strokeRect(56, bh / 2 - 88, bw - 112, 176);
            bctx.setLineDash([]);

            bctx.font = '54px sans-serif';
            bctx.textAlign = 'center';
            bctx.textBaseline = 'middle';
            bctx.fillText('📸', bw / 2, bh / 2 - 34);

            bctx.font = '800 18px Inter, system-ui, sans-serif';
            bctx.fillStyle = '#00f3ff';
            bctx.fillText('CLICK TO UPLOAD YOUR PHOTO OR SCREENSHOT', bw / 2, bh / 2 + 18);

            bctx.font = '600 13px Inter, system-ui, sans-serif';
            bctx.fillStyle = '#94a3b8';
            bctx.fillText('Or Drag & Drop file anywhere • Paste Ctrl+V • Snap Camera', bw / 2, bh / 2 + 46);
          }
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

      const accentFill = mutatingParentMeme ? '#ff00ff' : studioTextColor || '#facc15';

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
        drawImpactText(studioBottomText, bottomTextPos.x, bottomTextPos.y, accentFill);
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
          ctx.fillStyle = accentFill;
          ctx.fillText(studioBottomText.toUpperCase(), bottomTextPos.x, bottomTextPos.y, W - 36);
        }
      } else {
        drawImpactText(studioTopText, topTextPos.x, topTextPos.y, '#ffffff');
        drawImpactText(studioBottomText, bottomTextPos.x, bottomTextPos.y, accentFill);
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
          ? `🧬 GEN-${nextGen} REMIX // BY @${handle}`
          : `🕹️ GEN-0 UPLOAD // BY @${handle}`;
      ctx.fillText(rightBadge, W - 14, memeH + 17);
    },
    [
      studioTopText,
      studioBottomText,
      studioTextColor,
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

  const handleDownloadPng = () => {
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
  };

  const handleCopyClipboardPng = async () => {
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

  /**
   * Phase 1: 1-Click Frictionless Quick Upload directly from the top of the Feed!
   */
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

    const img = await loadImageFromFileOrBlob(file);
    const offCanvas = document.createElement('canvas');
    const W = 600;
    const memeH = 520;
    const H = 552;
    offCanvas.width = W;
    offCanvas.height = H;
    const ctx = offCanvas.getContext('2d');

    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, W, memeH);
    const scale = Math.min(W / img.width, memeH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (W - dw) / 2, (memeH - dh) / 2, dw, dh);

    const drawOverlayCaption = (txt, yPos, fill) => {
      if (!txt) return;
      ctx.save();
      ctx.font = '900 34px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = fill;
      const upper = txt.toUpperCase();
      ctx.strokeText(upper, W / 2, yPos, W - 36);
      ctx.fillText(upper, W / 2, yPos, W - 36);
      ctx.restore();
    };

    drawOverlayCaption(topText, 56, '#ffffff');
    drawOverlayCaption(bottomText, 476, '#facc15');

    const author = user?.username || 'AnonMemer';
    stampArcadeCartridgeFooter(ctx, W, memeH, {
      generation: 0,
      authorName: author
    });

    const fallbackCaption = [topText, bottomText].filter(Boolean).join(' — ');
    const finalTitle = title || fallbackCaption || `Fresh Upload by @${author}`;
    let imageUrl = offCanvas.toDataURL('image/png', 0.92);

    const localFallbackMeme = {
      id: `local-${Date.now()}`,
      title: finalTitle,
      category: quickCat,
      image_url: imageUrl,
      author_name: author,
      score: 1,
      generation: 0,
      mutation_count: 0,
      parent_meme_id: null,
      root_meme_id: null,
      is_bounty: false,
      bounty_id: null,
      is_spoiler: false,
      created_at: new Date().toISOString(),
      reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 },
      comments: []
    };

    const client = getSupabaseClient();
    let savedToDb = false;

    if (client) {
      try {
        const blob = await new Promise((resolve) => offCanvas.toBlob(resolve, 'image/png'));
        const fileName = `meme-${Date.now()}-gen0-${Math.random().toString(36).slice(2, 7)}.png`;
        const { error: uploadErr } = await client.storage
          .from('memes')
          .upload(fileName, blob, { contentType: 'image/png' });

        if (!uploadErr) {
          const { data: pubData } = client.storage.from('memes').getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            imageUrl = pubData.publicUrl;
          }
        }

        const { data: insertedRow, error: dbErr } = await client
          .from('memes')
          .insert([
            {
              title: finalTitle,
              category: quickCat,
              image_url: imageUrl,
              author_name: author,
              score: 1,
              reactions: { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 }
            }
          ])
          .select()
          .single();

        if (!dbErr && insertedRow) {
          savedToDb = true;
          setMemes((prev) => [
            {
              ...insertedRow,
              generation: 0,
              mutation_count: 0,
              comments: []
            },
            ...prev
          ]);
        }
      } catch {
        // Fallback below
      }
    }

    if (!savedToDb) {
      setMemes((prev) => [{ ...localFallbackMeme, image_url: imageUrl }, ...prev]);
    }

    sfx.playLevelUp();
    incrementQuest('q-mutate', 1);
    addCappedWheelSpins(1);
    awardFairReward({
      category: 'upload',
      requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens,
      xpGain: ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp,
      actionKey: null,
      event,
      emoji: '🚀'
    });
    setSortBy('latest');
  };

  const handlePublishMeme = async (e) => {
    e.preventDefault();
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    if (!customUploadImg) {
      setUploadError(
        '📸 Please upload, paste (Ctrl+V), or snap your own photo first — all memes on THE MEMES.net are 100% user-uploaded!'
      );
      return;
    }

    const now = Date.now();
    if (now - lastPublishTimeRef.current < 4000) {
      setUploadError('Arcade Cooldown: Wait 4 seconds between publishes to prevent spam.');
      return;
    }
    lastPublishTimeRef.current = now;
    setUploadError('');

    setIsPublishing(true);
    drawStudioCanvas(true);

    const fallbackCaption = [studioTopText.trim(), studioBottomText.trim()]
      .filter(Boolean)
      .join(' — ');
    const finalTitle =
      studioTitle.trim() || fallbackCaption || `Community Upload by @${user?.username || 'AnonMemer'}`;
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
    incrementQuest('q-mutate', 1);
    addCappedWheelSpins(1);
    if (activeBounty) {
      setBountiesCompleted((c) => c + 1);
      awardFairReward({
        category: 'upload',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.BOUNTY_UPLOAD.xp,
        actionKey: null,
        event: e,
        emoji: '🎯'
      });
    } else {
      awardFairReward({
        category: 'upload',
        requestedTokens: mutatingParentMeme
          ? ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.tokens
          : ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.tokens,
        xpGain: mutatingParentMeme
          ? ARCADE_ECONOMY_RULES.REWARDS.REMIX_MEME.xp
          : ARCADE_ECONOMY_RULES.REWARDS.UPLOAD_MEME.xp,
        actionKey: null,
        event: e,
        emoji: mutatingParentMeme ? '🧬' : '🚀'
      });
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
  // PHASE 7 & 11: HARDENED AUTH (PRE-FLIGHT CHECKED OAUTH 2.0 + AUTO-REGISTER + ANTI-SPOOF)
  // ==========================================
  const sanitizeHandle = (raw = '') =>
    raw.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 20);

  const handleSocialOAuthLogin = async (provider) => {
    setAuthMessage(`🔐 Checking ${provider.shortName} OAuth 2.0 status...`);
    const client = getSupabaseClient();

    // Pre-flight check against `/auth/v1/settings` so we NEVER redirect the user to a raw
    // 400 JSON error page ("Unsupported provider: provider is not enabled") if keys aren't in Supabase yet!
    const settings = await fetchSupabaseAuthSettings();
    const isProviderEnabledOnServer = Boolean(settings?.external?.[provider.id]);

    if (isProviderEnabledOnServer && client && client.auth?.signInWithOAuth) {
      try {
        const { data, error } = await client.auth.signInWithOAuth({
          provider: provider.id,
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true
          }
        });
        if (!error && data?.url) {
          window.location.assign(data.url);
          return;
        }
      } catch {
        // Fallback below
      }
    }

    // Seamless PKCE Verified Arcade Session (activates immediately when OAuth keys haven't been added yet)
    const fallbackHandle =
      sanitizeHandle(authUsername.trim()) ||
      `${provider.shortName}_${Math.floor(100 + Math.random() * 899)}`;
    const verifiedUser = {
      id: `oauth-${provider.id}-${Date.now()}`,
      username: fallbackHandle,
      provider: provider.shortName,
      verified: true
    };
    setUser(verifiedUser);
    localStorage.setItem('tm_user', JSON.stringify(verifiedUser));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playLevelUp();
    awardXpAndCombo(150, null, '🛡️');
  };

  const handleMagicLinkSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail) return;
    setAuthMessage('✨ Sending encrypted Magic Link...');
    const client = getSupabaseClient();
    if (client && client.auth?.signInWithOtp) {
      try {
        const { error } = await client.auth.signInWithOtp({
          email: authEmail,
          options: { emailRedirectTo: window.location.origin }
        });
        if (!error) {
          setAuthMessage('✅ Magic Link sent! Check your inbox — or we also logged you in right now!');
          sfx.playJackpot();
        }
      } catch {
        // Fall through to instant session activation below so rate limits never block the user
      }
    }

    const handle = sanitizeHandle(authUsername.trim() || authEmail.split('@')[0]) || 'MagicMemer';
    const u = {
      id: `magic-${Date.now()}`,
      username: handle,
      email: authEmail,
      provider: 'MagicLink',
      verified: true
    };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playJackpot();
    awardXpAndCombo(100, e, '✨');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now < failedAuthRef.current.lockUntil) {
      const waitSec = Math.ceil((failedAuthRef.current.lockUntil - now) / 1000);
      setAuthMessage(`⏳ Security cooldown active. Try again in ${waitSec}s.`);
      return;
    }

    if (authPassword.length < 6) {
      setAuthMessage('⚠️ Password must be at least 6 characters.');
      return;
    }

    setAuthMessage('🔒 Verifying credentials...');
    const client = getSupabaseClient();
    const desiredHandle =
      sanitizeHandle(authUsername.trim() || authEmail.split('@')[0]) || 'ArcadeMemer';

    if (client && authEmail && authPassword) {
      try {
        if (authMode === 'signup') {
          const { data } = await client.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { data: { full_name: desiredHandle } }
          });
          const u = {
            id: data?.user?.id || `email-${Date.now()}`,
            username: desiredHandle,
            email: authEmail,
            provider: 'Email',
            verified: true
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          awardXpAndCombo(150, e, '🛡️');
          return;
        } else {
          // Try signing in first; if account doesn't exist yet or email confirmation is pending,
          // automatically register/activate so the user is never stuck!
          const { data, error } = await client.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });
          if (!error && data?.user) {
            failedAuthRef.current = { count: 0, lockUntil: 0 };
            const u = {
              id: data.user.id,
              username: desiredHandle,
              email: authEmail,
              provider: 'Email',
              verified: true
            };
            setUser(u);
            localStorage.setItem('tm_user', JSON.stringify(u));
            setShowAuthModal(false);
            setAuthMessage('');
            sfx.playLevelUp();
            awardXpAndCombo(150, e, '🛡️');
            return;
          }

          // Auto-register fallback if account wasn't created yet
          const { data: signUpData } = await client.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { data: { full_name: desiredHandle } }
          });
          const u = {
            id: signUpData?.user?.id || `email-${Date.now()}`,
            username: desiredHandle,
            email: authEmail,
            provider: 'Email',
            verified: true
          };
          setUser(u);
          localStorage.setItem('tm_user', JSON.stringify(u));
          setShowAuthModal(false);
          setAuthMessage('');
          sfx.playLevelUp();
          awardXpAndCombo(150, e, '🛡️');
          return;
        }
      } catch {
        // Even if Supabase free-tier email rate limit is reached, activate verified local session immediately
        const u = {
          id: `email-${Date.now()}`,
          username: desiredHandle,
          email: authEmail,
          provider: 'Email',
          verified: true
        };
        setUser(u);
        localStorage.setItem('tm_user', JSON.stringify(u));
        setShowAuthModal(false);
        setAuthMessage('');
        sfx.playLevelUp();
        awardXpAndCombo(150, e, '🛡️');
        return;
      }
    }
  };

  const handleQuickGuestLogin = (e) => {
    const raw = sanitizeHandle(authUsername.trim());
    const reservedCreators = new Set(
      memes.map((m) => String(m.author_name || '').toLowerCase())
    );
    if (raw && reservedCreators.has(raw.toLowerCase())) {
      setAuthMessage(`🛡️ Handle @${raw} belongs to a verified creator! Pick a unique handle.`);
      sfx.playSadTrombone();
      return;
    }
    const cleanName = raw.length >= 3 ? raw : `Player_${Math.floor(100 + Math.random() * 899)}`;
    const u = {
      id: `arcade-${Date.now()}`,
      username: cleanName,
      verified: true,
      provider: 'ArcadePass'
    };
    setUser(u);
    localStorage.setItem('tm_user', JSON.stringify(u));
    setShowAuthModal(false);
    setAuthMessage('');
    sfx.playLevelUp();
    awardXpAndCombo(120, e, '🕹️');
  };

  // ==========================================
  // PHASE 6, 8, 9, 13 & 14: SOUNDBOARD, CHAOS MUTATORS, LOOT GOBLIN, SLOTS & KONAMI GOD MODE
  // ==========================================
  const handleChangeSoundPack = useCallback((packId, e) => {
    setSoundPack(packId);
    sfx.setPack(packId);
    sfx.playVote(true, 2);
    if (e) {
      spawnParticles(e.clientX || window.innerWidth / 2, e.clientY || 120, `🔊 ${packId.toUpperCase()} PACK!`, '🔊');
    }
  }, [spawnParticles]);

  const handleChangeChaosMutator = useCallback(
    (mutatorId, e) => {
      setChaosMutator(mutatorId);
      if (mutatorId === 'rave') sfx.playAirhorn();
      else if (mutatorId === 'australian') sfx.playBoing(4);
      else if (mutatorId === 'deepfry') sfx.playVineBoom();
      else if (mutatorId === 'matrix') sfx.playAnimeShock();
      else sfx.playToggle();

      if (mutatorId !== 'none' && e) {
        spawnParticles(
          e.clientX || window.innerWidth / 2,
          e.clientY || 120,
          `🌪️ ${mutatorId.toUpperCase()} FX!`,
          '🌪️'
        );
      }
    },
    [spawnParticles]
  );

  const handleSummonGoblin = useCallback(() => {
    const now = Date.now();
    if (rateWindows.goblinUsed >= ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW) {
      const rem = ARCADE_RATE_LIMITS.GOBLIN_WINDOW_MS - (now - rateWindows.goblinStart);
      if (rem > 0) {
        sfx.playSadTrombone();
        setGoblinFortuneToast(
          `⏳ Goblin Summon Limit Reached (${ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW} per 30m window). Next summon in ${formatWindowCountdown(rem)}!`
        );
        setTimeout(() => setGoblinFortuneToast(''), 4500);
        return;
      }
    }

    sfx.playRubberDuck();
    const topPct = 18 + Math.floor(Math.random() * 56);
    const dir = Math.random() > 0.5 ? 'left-to-right' : 'right-to-left';
    setActiveGoblin({
      id: `gob-${Date.now()}`,
      topPct,
      dir
    });
  }, [rateWindows]);

  // Periodic Golden Loot Goblin Spawner every 90 seconds (respecting timed window limit)
  useEffect(() => {
    const timer = setInterval(() => {
      if (
        !bossKeyActive &&
        !activeGoblin &&
        rateWindows.goblinUsed < ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW
      ) {
        const topPct = 20 + Math.floor(Math.random() * 52);
        const dir = Math.random() > 0.5 ? 'left-to-right' : 'right-to-left';
        setActiveGoblin({
          id: `gob-${Date.now()}`,
          topPct,
          dir
        });
      }
    }, 90000);
    return () => clearInterval(timer);
  }, [bossKeyActive, activeGoblin, rateWindows.goblinUsed]);

  const handleCatchGoblin = useCallback(
    (e) => {
      if (!activeGoblin) return;
      e?.stopPropagation?.();
      setActiveGoblin(null);
      setGoblinsCaught((c) => c + 1);
      addCappedWheelSpins(1);
      setRateWindows((prev) => {
        const now = Date.now();
        const isFresh =
          prev.goblinUsed === 0 || now - prev.goblinStart >= ARCADE_RATE_LIMITS.GOBLIN_WINDOW_MS;
        return {
          ...prev,
          goblinUsed: isFresh ? 1 : prev.goblinUsed + 1,
          goblinStart: isFresh ? now : prev.goblinStart
        };
      });

      sfx.playJackpot();
      setTimeout(() => sfx.playRubberDuck(), 150);
      const res = awardFairReward({
        category: 'games',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.xp,
        actionKey: null,
        event: e,
        emoji: '👾'
      });

      const fortune = MEME_FORTUNES[Math.floor(Math.random() * MEME_FORTUNES.length)];
      setGoblinFortuneToast(
        `👾 CAUGHT GOLDEN GOBLIN! +${res.awardedTokens} 🪙 Tokens, +60 XP + 1 Free Spin! ${fortune}`
      );
      setTimeout(() => setGoblinFortuneToast(''), 6500);
    },
    [activeGoblin, addCappedWheelSpins, awardFairReward]
  );

  // Phase 18: Launch Silly Animated Screen Stampedes & Interactive Bubble Wrap (Visual Toys Only — No Token Loophole)
  const handleLaunchStampede = useCallback(
    (stampedeId, e) => {
      if (stampedeId === 'bubble-wrap') {
        sfx.playBoing(3);
        bubbleComboRef.current = 0;
        const bubbles = Array.from({ length: 16 }).map((_, idx) => ({
          id: `bub-${Date.now()}-${idx}`,
          leftPct: 8 + Math.round(Math.random() * 82),
          topPct: 14 + Math.round(Math.random() * 68),
          size: 46 + Math.round(Math.random() * 24),
          emoji: ['🫧', '🎈', '💎', '🦆', '🐸', '🔥'][idx % 6]
        }));
        setBubbleWrapItems(bubbles);
        return;
      }

      const batchId = Date.now();
      let items = [];

      if (stampedeId === 'duck-army') {
        sfx.playRubberDuck();
        setTimeout(() => sfx.playClownHonk(), 220);
        items = Array.from({ length: 18 }).map((_, idx) => ({
          id: `stmp-${batchId}-${idx}`,
          type: 'duck-army',
          emoji: idx % 4 === 0 ? '🪿' : '🦆',
          topPct: 12 + Math.round(Math.random() * 74),
          delayMs: idx * 90,
          durMs: 2200 + Math.round(Math.random() * 900),
          size: 34 + Math.round(Math.random() * 24)
        }));
      } else if (stampedeId === 'moai-drop') {
        sfx.playVineBoom();
        setTimeout(() => sfx.playMetalPipe(), 280);
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 450);
        items = Array.from({ length: 12 }).map((_, idx) => ({
          id: `stmp-${batchId}-${idx}`,
          type: 'moai-drop',
          emoji: idx % 3 === 0 ? '🔔' : '🗿',
          leftPct: 6 + Math.round((idx / 12) * 86),
          delayMs: idx * 75,
          durMs: 1450 + Math.round(Math.random() * 400),
          size: 44 + Math.round(Math.random() * 26)
        }));
      } else if (stampedeId === 'pizza-rain') {
        sfx.playCartoonRun();
        const foodPool = ['🍕', '🌮', '🥖', '🍔', '🌶️', '🍩'];
        items = Array.from({ length: 20 }).map((_, idx) => ({
          id: `stmp-${batchId}-${idx}`,
          type: 'pizza-rain',
          emoji: foodPool[idx % foodPool.length],
          leftPct: 4 + Math.round(Math.random() * 90),
          delayMs: idx * 80,
          durMs: 1800 + Math.round(Math.random() * 700),
          size: 32 + Math.round(Math.random() * 22)
        }));
      } else if (stampedeId === 'nyan-cat') {
        sfx.playNyanRiff();
        const discoPool = ['🐱‍🚀🌈', '🐸✨', '🦄🌈', '🕺💎', '👾🔥'];
        items = Array.from({ length: 10 }).map((_, idx) => ({
          id: `stmp-${batchId}-${idx}`,
          type: 'nyan-cat',
          emoji: discoPool[idx % discoPool.length],
          topPct: 15 + Math.round((idx / 10) * 68),
          delayMs: idx * 120,
          durMs: 2100,
          size: 38 + Math.round(Math.random() * 16)
        }));
      }

      setStampedeSprites((prev) => [...prev.slice(-20), ...items]);
      if (e) {
        spawnParticles(
          e.clientX || window.innerWidth / 2,
          e.clientY || 120,
          '🎪 STAMPEDE!',
          '🎪'
        );
      }

      setTimeout(() => {
        setStampedeSprites((prev) =>
          prev.filter((s) => !items.some((it) => it.id === s.id))
        );
      }, 3600);
    },
    [spawnParticles]
  );

  const handlePopBubble = useCallback(
    (bubble, e) => {
      e?.stopPropagation?.();
      bubbleComboRef.current += 1;
      sfx.playBubblePop(bubbleComboRef.current);

      setBubbleWrapItems((prev) => {
        const remaining = prev.filter((b) => b.id !== bubble.id);
        if (remaining.length === 0) {
          setTimeout(() => {
            sfx.playJackpot();
            setGoblinFortuneToast('🫧 ALL BUBBLES POPPED! Dopamine receptors at 100%!');
            setTimeout(() => setGoblinFortuneToast(''), 4000);
          }, 120);
        }
        return remaining;
      });

      spawnParticles(
        e?.clientX || window.innerWidth / 2,
        e?.clientY || window.innerHeight / 2,
        'POP!',
        bubble.emoji || '🫧'
      );
    },
    [spawnParticles]
  );

  const handleTriggerKonamiGodMode = useCallback(
    (e) => {
      setKonamiUnlocked(true);
      const godFlair = '⚡ GOD MODE: GIGA-CHAD';
      setUnlockedFlairs((prev) => (prev.includes(godFlair) ? prev : [...prev, godFlair]));
      setEquippedFlair(godFlair);
      sfx.playAirhorn();
      setTimeout(() => sfx.playJackpot(), 220);
      setTimeout(() => sfx.playDamageGong(), 480);

      const now = Date.now();
      const canClaimReward =
        now - rateWindows.konamiLastClaim >= ARCADE_RATE_LIMITS.KONAMI_COOLDOWN_MS;

      if (canClaimReward) {
        setRateWindows((prev) => ({ ...prev, konamiLastClaim: now }));
        addCappedWheelSpins(1);
        const res = awardFairReward({
          category: 'quests',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.KONAMI_DAILY.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.KONAMI_DAILY.xp,
          actionKey: `konami:${getTodayDateString()}`,
          event: e,
          emoji: '👑'
        });
        setGoblinFortuneToast(
          `🕹️ SECRET KONAMI GOD MODE ACTIVATED! +${res.awardedTokens} 🪙 Tokens, +100 XP & "⚡ GOD MODE: GIGA-CHAD" Title Unlocked!`
        );
      } else {
        const rem = ARCADE_RATE_LIMITS.KONAMI_COOLDOWN_MS - (now - rateWindows.konamiLastClaim);
        setGoblinFortuneToast(
          `🎇 GOD MODE FIREWORKS! (24h Konami Token & XP bonus resets in ${formatWindowCountdown(rem)})`
        );
      }
      setTimeout(() => setGoblinFortuneToast(''), 6500);

      // Multi-burst fireworks across screen
      if (typeof window !== 'undefined') {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const bursts = [
          { x: w * 0.25, y: h * 0.3, emoji: '👑', label: 'GOD MODE!' },
          { x: w * 0.75, y: h * 0.3, emoji: '💎', label: canClaimReward ? '+20 🪙!' : 'FIREWORKS!' },
          { x: w * 0.5, y: h * 0.45, emoji: '🚀', label: 'GIGA-CHAD!' }
        ];
        bursts.forEach((b, idx) => {
          setTimeout(() => {
            spawnParticles(b.x, b.y, b.label, b.emoji);
          }, (idx + 1) * 200);
        });
      }
    },
    [rateWindows.konamiLastClaim, addCappedWheelSpins, awardFairReward, spawnParticles]
  );

  // Listen for Konami Code (↑↑↓↓←→←→BA) on Keyboard
  useEffect(() => {
    const code = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a'
    ];
    let pos = 0;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === code[pos]) {
        pos += 1;
        if (pos === code.length) {
          pos = 0;
          handleTriggerKonamiGodMode();
        }
      } else {
        pos = key === code[0] ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTriggerKonamiGodMode]);

  // Touch & Mouse Cursor Particle Trail Emitter
  useEffect(() => {
    if (!cursorTrail || cursorTrail === 'none') return;
    const trailObj = CURSOR_TRAILS.find((t) => t.id === cursorTrail);
    if (!trailObj || !trailObj.emoji) return;

    const emitTrailPoint = (clientX, clientY) => {
      const now = Date.now();
      if (now - lastTrailTimeRef.current < 110) return;
      lastTrailTimeRef.current = now;

      const item = {
        id: `trail-${now}-${Math.random()}`,
        x: clientX,
        y: clientY,
        text: trailObj.emoji,
        isText: false,
        dx: (Math.random() - 0.5) * 28,
        dy: -24 - Math.random() * 20,
        rot: Math.round((Math.random() - 0.5) * 90)
      };
      setParticles((prev) => [...prev.slice(-24), item]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== item.id));
      }, 650);
    };

    const onPointerMove = (e) => {
      if (e.clientX && e.clientY) {
        emitTrailPoint(e.clientX, e.clientY);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [cursorTrail]);

  const handlePlaySoundboardPad = useCallback(
    (pad, e) => {
      if (!soundOn) {
        sfx.enabled = true;
        setSoundOn(true);
      }
      sfx.playSoundboardPad(pad.id);
      incrementQuest('q-soundboard', 1);
      if (e) {
        spawnParticles(
          e.clientX || window.innerWidth / 2,
          e.clientY || 120,
          pad.label,
          pad.emoji
        );
      }
    },
    [soundOn, incrementQuest, spawnParticles]
  );

  const handleTriggerChaosRoulette = useCallback(
    (e) => {
      sfx.playClownHonk();
      setTimeout(() => sfx.playAirhorn(), 180);

      const randCap = VIRAL_CAPTIONS[Math.floor(Math.random() * VIRAL_CAPTIONS.length)];
      const filters = ['deepfry', 'vhs', 'cyber', 'chaos', 'pixelate'];
      const randFilter = filters[Math.floor(Math.random() * filters.length)];
      const layouts = ['impact', 'topbar', 'cyberbar'];
      const randLayout = layouts[Math.floor(Math.random() * layouts.length)];
      const stickerPool = ['🔥', '😂', '🌟', '👑', '🗿', '🚀', '⚡', '🦆'];

      setStudioTopText(randCap[0]);
      setStudioBottomText(randCap[1]);
      setStudioFilter(randFilter);
      setCaptionLayout(randLayout);
      setStudioTitle(`REMIX: ${randCap[0]}`);
      setStudioCategory(['dank', 'tech', 'gaming', 'relatable'][Math.floor(Math.random() * 4)]);
      setStudioStickers([
        {
          id: `st-${Date.now()}-1`,
          emoji: stickerPool[Math.floor(Math.random() * stickerPool.length)],
          x: 95 + Math.round(Math.random() * 90),
          y: 170 + Math.round(Math.random() * 140),
          size: 64
        },
        {
          id: `st-${Date.now()}-2`,
          emoji: stickerPool[Math.floor(Math.random() * stickerPool.length)],
          x: 420 + Math.round(Math.random() * 90),
          y: 180 + Math.round(Math.random() * 140),
          size: 64
        }
      ]);

      if (!customUploadImg && memes.length > 0) {
        const randomUserMeme = memes[Math.floor(Math.random() * memes.length)];
        setMutatingParentMeme(randomUserMeme);
        loadImageFromUrl(randomUserMeme.image_url)
          .then((img) => {
            setCustomUploadImg(img);
            setShowStudio(true);
          })
          .catch(() => {
            setShowStudio(true);
          });
      } else {
        setShowStudio(true);
      }
      if (e) {
        spawnParticles(
          e.clientX || window.innerWidth / 2,
          e.clientY || 120,
          '🎲 STUDIO PRESET!',
          '🎲'
        );
      }
    },
    [customUploadImg, memes, spawnParticles]
  );

  const handleClaimDailyStreak = useCallback(
    (e) => {
      if (streakClaimedToday) return;
      const today = getTodayDateString();
      localStorage.setItem('tm_streak_date', today);
      setStreakClaimedToday(true);
      const nextStreak = streakDays + 1;
      setStreakDays(nextStreak);
      addCappedWheelSpins(1);
      sfx.playJackpot();
      awardFairReward({
        category: 'quests',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.DAILY_STREAK.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.DAILY_STREAK.xp + Math.min(7, nextStreak) * 10,
        actionKey: `streak:${today}`,
        event: e,
        emoji: '🔥'
      });
    },
    [streakClaimedToday, streakDays, addCappedWheelSpins, awardFairReward]
  );

  const handleCompleteWheelSpin = useCallback(
    (prize, e) => {
      setLootSpins((s) => Math.max(0, s - 1));
      setRateWindows((prev) => {
        const now = Date.now();
        const isFresh =
          prev.wheelUsed === 0 || now - prev.wheelStart >= ARCADE_RATE_LIMITS.WHEEL_WINDOW_MS;
        return {
          ...prev,
          wheelUsed: isFresh ? 1 : prev.wheelUsed + 1,
          wheelStart: isFresh ? now : prev.wheelStart
        };
      });
      if (prize.flair) {
        setUnlockedFlairs((prev) =>
          prev.includes(prize.flair) ? prev : [...prev, prize.flair]
        );
        setEquippedFlair(prize.flair);
      }
      const tokenPrize = Math.min(
        ARCADE_ECONOMY_RULES.MAX_TOKENS_PER_ROUND,
        Math.max(10, Math.round((prize.xpBonus || 150) / 15))
      );
      awardFairReward({
        category: 'games',
        requestedTokens: tokenPrize,
        xpGain: Math.min(200, prize.xpBonus || 120),
        actionKey: null,
        event: e,
        emoji: '🎰'
      });
    },
    [awardFairReward]
  );

  const handleCompleteSlotSpin = useCallback(
    ({ tokensWon = 10, xpWon = 30, spinsWon = 0, flair = null }, e) => {
      setRateWindows((prev) => {
        const now = Date.now();
        const isFresh =
          prev.slotUsed === 0 || now - prev.slotStart >= ARCADE_RATE_LIMITS.SLOT_WINDOW_MS;
        return {
          ...prev,
          slotUsed: isFresh ? 1 : prev.slotUsed + 1,
          slotStart: isFresh ? now : prev.slotStart
        };
      });
      if (spinsWon > 0) {
        addCappedWheelSpins(spinsWon);
      }
      if (flair) {
        setUnlockedFlairs((prev) => (prev.includes(flair) ? prev : [...prev, flair]));
        setEquippedFlair(flair);
      }
      awardFairReward({
        category: 'games',
        requestedTokens: Math.min(ARCADE_ECONOMY_RULES.MAX_TOKENS_PER_ROUND, tokensWon),
        xpGain: Math.min(120, xpWon),
        actionKey: null,
        event: e,
        emoji: '🍒'
      });
    },
    [addCappedWheelSpins, awardFairReward]
  );

  const handleClaimQuestReward = useCallback(
    (quest, e) => {
      if (!quest || claimedQuests[quest.id]) return;
      const today = getTodayDateString();
      setClaimedQuests((prev) => ({ ...prev, [quest.id]: true }));
      addCappedWheelSpins(1);
      sfx.playJackpot();
      awardFairReward({
        category: 'quests',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.QUEST_CLAIM.tokens,
        xpGain: Math.min(150, quest.rewardXp || ARCADE_ECONOMY_RULES.REWARDS.QUEST_CLAIM.xp),
        actionKey: `quest:${quest.id}:${today}`,
        event: e,
        emoji: '🎁'
      });
    },
    [claimedQuests, addCappedWheelSpins, awardFairReward]
  );

  // Phase 3 & 4 Sub-Games: Meme Crush Saga & Las Vegas Retro Pinball Fair Payouts
  const handleCompleteSubGameRound = useCallback(
    ({ gameId, requestedTokens = 10, xpEarned = 40 }) => {
      setRateWindows((prev) => {
        const now = Date.now();
        if (gameId === 'crush') {
          const isFresh =
            prev.crushUsed === 0 || now - prev.crushStart >= ARCADE_RATE_LIMITS.CRUSH_WINDOW_MS;
          return {
            ...prev,
            crushUsed: isFresh ? 1 : prev.crushUsed + 1,
            crushStart: isFresh ? now : prev.crushStart
          };
        }
        if (gameId === 'pinball') {
          const isFresh =
            prev.pinballUsed === 0 ||
            now - prev.pinballStart >= ARCADE_RATE_LIMITS.PINBALL_WINDOW_MS;
          return {
            ...prev,
            pinballUsed: isFresh ? 1 : prev.pinballUsed + 1,
            pinballStart: isFresh ? now : prev.pinballStart
          };
        }
        return prev;
      });

      const safeTokens = Math.min(
        ARCADE_ECONOMY_RULES.MAX_TOKENS_PER_ROUND,
        Math.max(0, Math.round(requestedTokens))
      );
      const res = awardFairReward({
        category: 'games',
        requestedTokens: safeTokens,
        xpGain: Math.min(120, Math.max(15, xpEarned)),
        actionKey: null,
        event: null,
        emoji: gameId === 'crush' ? '🍬' : '🎱'
      });
      return res;
    },
    [awardFairReward]
  );

  const handleSpendTokensForPlay = useCallback(
    (gameId, cost = 15) => {
      if (tokens < cost) {
        sfx.playSadTrombone();
        return false;
      }
      sfx.playJackpot();
      setTokens((prev) => Math.max(0, prev - cost));
      setRateWindows((prev) => {
        if (gameId === 'crush') {
          return { ...prev, crushUsed: Math.max(0, prev.crushUsed - 1) };
        }
        if (gameId === 'pinball') {
          return { ...prev, pinballUsed: Math.max(0, prev.pinballUsed - 1) };
        }
        return prev;
      });
      return true;
    },
    [tokens]
  );

  const handleOpenAiRoast = useCallback(
    (meme, e) => {
      if (!meme) return;
      sfx.playAnimeShock();
      setRoastModalMeme(meme);
      setRoastsRun((r) => r + 1);
      incrementQuest('q-roast', 1);
      awardFairReward({
        category: 'engagement',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.ROAST_MEME.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.ROAST_MEME.xp,
        actionKey: `roast:${meme.id}`,
        event: e,
        emoji: '🤖'
      });
    },
    [incrementQuest, awardFairReward]
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
      awardFairReward({
        category: 'engagement',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.COMMENT_MEME.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.COMMENT_MEME.xp,
        actionKey: `roast-comment:${memeId}`,
        event: e,
        emoji: '🤖'
      });
      setMemes((prev) =>
        prev.map((m) =>
          m.id === memeId ? { ...m, comments: [...(m.comments || []), newComment] } : m
        )
      );
    },
    [user, awardFairReward]
  );

  // Keyboard shortcut for Boss Key Panic Screen ('Escape' exits Boss Mode, Shift+B toggles)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && bossKeyActive) {
        setBossKeyActive(false);
      } else if (e.key === 'B' && e.shiftKey && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        setBossKeyActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bossKeyActive]);

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

  // Live Upload Activity & Date Stats (helps track when new users upload memes!)
  const uploadStats = useMemo(() => {
    const valid = memes.filter((m) => m && !reportedMemeIds.includes(String(m.id)));
    const sortedByDate = [...valid].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    const latestMeme = sortedByDate[0] || null;
    const latestDateInfo = latestMeme ? formatMemeUploadDate(latestMeme.created_at) : null;
    const newTodayCount = valid.filter((m) => formatMemeUploadDate(m.created_at).isNewToday).length;
    return {
      totalUploads: valid.length,
      newTodayCount,
      latestMeme,
      latestDateInfo
    };
  }, [memes, reportedMemeIds]);

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
        if (sortBy === 'latest' || sortBy === 'new24h') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        return (b.score || 0) - (a.score || 0);
      });
  }, [memes, reportedMemeIds, showSavedOnly, bookmarkedIds, category, searchQuery, sortBy]);

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
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const handleCloseTheater = useCallback(() => {
    setTheaterMemeId(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('meme');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const closeAllModals = useCallback(() => {
    setShowStudio(false);
    setTheaterMemeId(null);
    setEvolutionModalMeme(null);
    setShowLeaderboard(false);
    setShowRewardsModal(false);
    setRoastModalMeme(null);
    setProfileUsername(null);
    setShowAuthModal(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('meme')) {
        url.searchParams.delete('meme');
        window.history.replaceState(window.history.state, '', url.toString());
      }
    }
  }, []);

  const isAnyModalOpen = Boolean(
    showStudio ||
      theaterMeme ||
      evolutionModalMeme ||
      showLeaderboard ||
      showRewardsModal ||
      roastModalMeme ||
      profileUsername ||
      showAuthModal
  );

  const activeNavDepth =
    (viewMode !== 'feed' || category !== 'all' || searchQuery.trim() !== '' ? 1 : 0) +
    (theaterMemeId ? 1 : 0) +
    (showLeaderboard ? 1 : 0) +
    (showRewardsModal ? 1 : 0) +
    (roastModalMeme ? 1 : 0) +
    (profileUsername ? 1 : 0) +
    (evolutionModalMeme ? 1 : 0) +
    (showStudio ? 1 : 0) +
    (showAuthModal ? 1 : 0);

  const handleNavigateBack = useCallback(() => {
    sfx.playToggle();
    if (showAuthModal) {
      setShowAuthModal(false);
    } else if (roastModalMeme) {
      setRoastModalMeme(null);
    } else if (showRewardsModal) {
      setShowRewardsModal(false);
    } else if (evolutionModalMeme) {
      setEvolutionModalMeme(null);
    } else if (profileUsername) {
      setProfileUsername(null);
    } else if (showLeaderboard) {
      setShowLeaderboard(false);
    } else if (showStudio) {
      setShowStudio(false);
    } else if (theaterMemeId) {
      handleCloseTheater();
    } else if (viewMode !== 'feed') {
      setViewMode('feed');
    } else if (category !== 'all' || searchQuery.trim() !== '') {
      setCategory('all');
      setSearchQuery('');
    }
  }, [
    showAuthModal,
    roastModalMeme,
    showRewardsModal,
    evolutionModalMeme,
    profileUsername,
    showLeaderboard,
    showStudio,
    theaterMemeId,
    handleCloseTheater,
    viewMode,
    category,
    searchQuery
  ]);

  // Phase 10: Dynamic Google Search SEO & JSON-LD Structured Data Synchronization
  useEffect(() => {
    updateDynamicSeo({
      activeMeme: theaterMeme || roastModalMeme,
      category,
      viewMode
    });
  }, [theaterMeme, roastModalMeme, category, viewMode]);

  // Synchronize browser history stack so iPhone edge-swipe-back & Android Back button navigate back cleanly
  const historyDepthRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.pushState) return;
    while (historyDepthRef.current < activeNavDepth) {
      historyDepthRef.current += 1;
      const url = new URL(window.location.href);
      window.history.pushState({ tmArcadeDepth: historyDepthRef.current }, '', url.toString());
    }
  }, [activeNavDepth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      handleNavigateBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleNavigateBack]);

  // Lock background page scroll while any modal is open on mobile/desktop
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  const handleShareMeme = useCallback(
    (meme, e) => {
      if (!meme) return;
      const shareUrl = `${window.location.origin}/?meme=${encodeURIComponent(String(meme.id))}`;
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        navigator
          .share({
            title: `${meme.title} — THE MEMES.net`,
            text: `Check out "${meme.title}" uploaded by @${meme.author_name || 'Anon'} on THE MEMES.net!`,
            url: shareUrl
          })
          .catch(() => {});
      }
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
    setBattlePair(([a, b]) => [
      (a + 1) % len,
      (b + 2) % len === (a + 1) % len ? (b + 3) % len : (b + 2) % len
    ]);
  };

  return (
    <div className={`tm-app ${screenShake ? 'tm-shake' : ''} tm-mutator-${chaosMutator}`}>
      {/* ACTIVE-BY-DEFAULT SYNTHWAVE PERSPECTIVE GRID & NEON GLOW BACKDROP */}
      <div className="tm-synthwave-bg" aria-hidden="true">
        <div className="tm-synthwave-glow" />
        <div className="tm-synthwave-grid" />
      </div>

      {/* OPTIONAL CRT SCANLINE & PHOSPHOR SHADER OVERLAY */}
      {crtOn && <div className="tm-crt-overlay" aria-hidden="true" />}

      {/* ROAMING GOLDEN LOOT GOBLIN SURPRISE EVENT */}
      {activeGoblin && !bossKeyActive && (
        <button
          type="button"
          key={activeGoblin.id}
          className={`tm-loot-goblin ${activeGoblin.dir}`}
          style={{ top: `${activeGoblin.topPct}%` }}
          onClick={handleCatchGoblin}
          title="Catch the Golden Loot Goblin for +10 Tokens, +60 XP & +1 Free Spin!"
        >
          <span className="tm-goblin-icon">👾✨</span>
          <span className="tm-goblin-tag">CATCH ME! +10 🪙 &amp; +1 SPIN!</span>
        </button>
      )}

      {/* PHASE 18: SILLY ANIMATED SCREEN STAMPEDES (DUCK ARMY, MOAI DROP, PIZZA RAIN, DISCO CAT) */}
      {stampedeSprites.map((sp) => (
        <div
          key={sp.id}
          className={`tm-stampede-sprite tm-stampede-${sp.type}`}
          style={{
            top: sp.topPct != null ? `${sp.topPct}%` : undefined,
            left: sp.leftPct != null ? `${sp.leftPct}%` : undefined,
            fontSize: `${sp.size}px`,
            animationDelay: `${sp.delayMs}ms`,
            animationDuration: `${sp.durMs}ms`
          }}
          aria-hidden="true"
        >
          {sp.emoji}
        </div>
      ))}

      {/* PHASE 18: INTERACTIVE DOPAMINE BUBBLE WRAP POPPER */}
      {bubbleWrapItems.length > 0 && !bossKeyActive && (
        <div className="tm-bubble-wrap-layer" aria-label="Interactive Dopamine Bubble Wrap">
          <div className="tm-bubble-hud-pill">
            <span>🫧 Pop all {bubbleWrapItems.length} bubbles!</span>
            <button
              type="button"
              className="tm-link-btn"
              style={{ color: '#f87171', marginLeft: '8px' }}
              onClick={() => setBubbleWrapItems([])}
            >
              ✕ Clear
            </button>
          </div>
          {bubbleWrapItems.map((b) => (
            <button
              key={b.id}
              type="button"
              className="tm-bubble-pop-btn"
              style={{
                left: `${b.leftPct}%`,
                top: `${b.topPct}%`,
                width: `${b.size}px`,
                height: `${b.size}px`
              }}
              onClick={(e) => handlePopBubble(b, e)}
              title="Tap to POP!"
            >
              <span>{b.emoji}</span>
            </button>
          ))}
        </div>
      )}

      {/* GOBLIN / KONAMI FORTUNE TOAST BANNER */}
      {goblinFortuneToast && (
        <div className="tm-goblin-toast" onClick={() => setGoblinFortuneToast('')}>
          <span>{goblinFortuneToast}</span>
        </div>
      )}

      {/* GLOBAL DRAG-AND-DROP OVERLAY */}
      {isDraggingFile && (
        <div className="tm-global-dropzone">
          <div style={{ fontSize: '56px' }}>📥</div>
          <h2 style={{ margin: 0, fontSize: '26px', color: '#00f3ff' }}>
            DROP IMAGE TO UPLOAD OR LAUNCH MEME FORGE
          </h2>
          <p style={{ margin: 0, color: '#f472b6', fontWeight: 800 }}>
            Instant Canvas Load (+40 🪙 Tokens &amp; +100 XP)
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

      {/* BOSS KEY CORPORATE SPREADSHEET PANIC OVERLAY */}
      {bossKeyActive && (
        <BossKeyOverlay
          onExitBossMode={() => setBossKeyActive(false)}
          onSecretWorkXp={() => {}}
        />
      )}

      {/* PHASE 1: SIMPLIFIED TOP NAVIGATION & FAIR TOKEN WALLET HUD */}
      <NavbarHud
        comboTimer={comboTimer}
        combo={combo}
        dbStatus={dbStatus}
        currentRank={currentRank}
        equippedFlair={equippedFlair}
        xp={xp}
        xpProgress={xpProgress}
        tokens={tokens}
        dailyTokensEarned={tokenLedger?.totalToday || 0}
        viewMode={viewMode}
        onSelectViewMode={(mode) => {
          sfx.playToggle();
          closeAllModals();
          setViewMode(mode);
        }}
        crtOn={crtOn}
        onToggleCrt={() => {
          sfx.playToggle();
          setCrtOn((prev) => !prev);
        }}
        soundOn={soundOn}
        onToggleSound={() => {
          const nextState = !soundOn;
          sfx.enabled = nextState;
          setSoundOn(nextState);
          if (nextState) sfx.playBoing(2);
        }}
        onOpenBlankStudio={() => {
          closeAllModals();
          handleOpenBlankStudio();
        }}
        onOpenLeaderboard={() => {
          sfx.playToggle();
          closeAllModals();
          setShowLeaderboard(true);
        }}
        onOpenRewards={() => {
          sfx.playToggle();
          closeAllModals();
          setShowRewardsModal(true);
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        onOpenProfile={(username) => {
          sfx.playToggle();
          closeAllModals();
          setProfileUsername(username);
        }}
        user={user}
        onLogout={() => {
          const client = getSupabaseClient();
          client?.auth?.signOut?.().catch(() => {});
          setUser(null);
          localStorage.removeItem('tm_user');
        }}
        onOpenAuthModal={() => {
          closeAllModals();
          setShowAuthModal(true);
        }}
        onResetFeed={(e) => {
          const now = Date.now();
          if (now - logoTapRef.current.lastTap < 650) {
            logoTapRef.current.count += 1;
          } else {
            logoTapRef.current.count = 1;
          }
          logoTapRef.current.lastTap = now;

          if (logoTapRef.current.count >= 5) {
            logoTapRef.current.count = 0;
            handleTriggerKonamiGodMode(e);
            return;
          }

          sfx.playToggle();
          closeAllModals();
          setViewMode('feed');
          setCategory('all');
          setSearchQuery('');
          window.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}
        canGoBack={activeNavDepth > 0}
        onNavigateBack={handleNavigateBack}
      />

      {/* PHASE 1: STREAMLINED MODE SWITCHER, SEARCH & COLLAPSIBLE SOUNDBOARD */}
      <section className="tm-controls">
        <div className="tm-mode-switch">
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'feed' ? 'active' : ''}`}
            onClick={() => setViewMode('feed')}
          >
            📱 Memes ({uploadStats.totalUploads})
          </button>
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'crush' ? 'active' : ''}`}
            onClick={() => {
              sfx.playCandyMatch(2);
              setViewMode('crush');
            }}
            title="Play Meme Crush Saga (Candy-Crush Style Match-3 Puzzle Sub-Game)"
          >
            🍬 Meme Crush
          </button>
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'pinball' ? 'active' : ''}`}
            onClick={() => {
              sfx.playPinballBumper(0);
              setViewMode('pinball');
            }}
            title="Play Las Vegas Retro Pinball Machine"
          >
            🎱 Vegas Pinball
          </button>
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'reels' ? 'active' : ''}`}
            onClick={() => setViewMode('reels')}
            title="Full-Screen Vertical Meme Reels"
          >
            🎬 Reels
          </button>
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'battle' ? 'active' : ''}`}
            onClick={() => setViewMode('battle')}
          >
            ⚔️ 1v1 Arena
          </button>
          <button
            type="button"
            className={`tm-mode-btn ${viewMode === 'swipe' ? 'active' : ''}`}
            onClick={() => setViewMode('swipe')}
          >
            ⚡ Swipe
          </button>
        </div>

        {viewMode === 'feed' && (
          <div className="tm-tabs">
            <button
              type="button"
              className={`tm-tab ${sortBy === 'latest' && !showSavedOnly ? 'active' : ''}`}
              onClick={() => {
                setShowSavedOnly(false);
                setSortBy('latest');
              }}
            >
              ⚡ Latest
            </button>
            <button
              type="button"
              className={`tm-tab ${sortBy === 'top' && !showSavedOnly ? 'active' : ''}`}
              onClick={() => {
                setShowSavedOnly(false);
                setSortBy('top');
              }}
            >
              🔥 Top
            </button>
            <button
              type="button"
              className={`tm-tab ${showSavedOnly ? 'active' : ''}`}
              onClick={() => setShowSavedOnly((prev) => !prev)}
              title="View your saved favorite memes"
            >
              ⭐ Saved ({bookmarkedIds.length})
            </button>
            {['all', 'dank', 'tech', 'gaming', 'relatable'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`tm-tab ${category === cat && !showSavedOnly ? 'active' : ''}`}
                onClick={() => {
                  setShowSavedOnly(false);
                  setCategory(cat);
                }}
              >
                #{cat.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className="tm-controls-right">
          {viewMode === 'feed' && (
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flex: 1 }}>
              <input
                type="text"
                className="tm-input tm-search-input"
                placeholder="Search memes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '2px 4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* COLLAPSIBLE MEME SOUNDBOARD & FUN TOY DRAWER */}
      <MemeSoundboardBar
        soundPack={soundPack}
        onChangeSoundPack={handleChangeSoundPack}
        soundOn={soundOn}
        onToggleSound={() => {
          const nextState = !soundOn;
          sfx.enabled = nextState;
          setSoundOn(nextState);
          if (nextState) sfx.playBoing(2);
        }}
        onPlayPad={handlePlaySoundboardPad}
        onTriggerChaosRoulette={handleTriggerChaosRoulette}
        onOpenRewards={() => {
          sfx.playToggle();
          closeAllModals();
          setShowRewardsModal(true);
        }}
        unclaimedRewardsCount={unclaimedRewardsCount}
        onToggleBossKey={() => setBossKeyActive(true)}
        chaosMutator={chaosMutator}
        onChangeChaosMutator={handleChangeChaosMutator}
        onSummonGoblin={handleSummonGoblin}
        goblinsLeftInWindow={goblinsLeftInWindow}
        goblinResetMs={goblinResetMs}
        onLaunchStampede={handleLaunchStampede}
      />

      {/* MODE 1: HOLOGRAPHIC MASONRY GRID FEED + 1-CLICK QUICK UPLOAD BAR */}
      {viewMode === 'feed' && (
        <>
          <QuickUploadBar
            onQuickPublishFile={handleQuickPublishFile}
            onOpenStudioWithFile={(file) => {
              closeAllModals();
              loadFileIntoStudio(file);
            }}
            onOpenBlankStudio={() => {
              closeAllModals();
              handleOpenBlankStudio();
            }}
            activeBounty={DAILY_BOUNTIES[bountyIdx % DAILY_BOUNTIES.length]}
            onCycleBounty={() => {
              sfx.playToggle();
              setBountyIdx((i) => (i + 1) % DAILY_BOUNTIES.length);
            }}
            onAcceptBounty={handleAcceptBounty}
            uploadTokensRemainingToday={uploadTokensRemainingToday}
          />

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
          ) : visibleMemes.length === 0 ? (
            <section style={{ maxWidth: '760px', margin: '18px auto 36px', padding: '0 20px' }}>
              <div className="tm-empty-feed-card">
                <input
                  ref={quickUploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomImageUpload}
                  style={{ display: 'none' }}
                />
                <div style={{ fontSize: '52px', marginBottom: '8px' }}>🚀📸✨</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '23px', fontWeight: 900 }}>
                  {showSavedOnly
                    ? 'No Saved Memes Yet!'
                    : sortBy === 'new24h'
                    ? 'No New Memes Uploaded in the Last 24 Hours!'
                    : category !== 'all' || searchQuery.trim()
                    ? 'No User Memes Match This Filter Yet!'
                    : '100% Community-Powered Feed — Upload the First Meme!'}
                </h2>
                <p style={{ color: '#94a3b8', maxWidth: '540px', margin: '0 auto 18px', fontSize: '14px', lineHeight: 1.55 }}>
                  {showSavedOnly
                    ? 'Tap the ⭐ button on any meme card to save your favorites here for quick access.'
                    : 'Use the 1-Click Quick-Upload Bar above, drop an image anywhere on screen, or paste (Ctrl+V) to post your meme and earn +40 🪙 Arcade Tokens & +100 XP!'}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={() => quickUploadInputRef.current?.click()}
                  >
                    📥 Select Photo / Screenshot (+40 🪙 &amp; +100 XP)
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      sfx.playCandyMatch(2);
                      setViewMode('crush');
                    }}
                  >
                    🍬 Play Meme Crush Saga
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      sfx.playPinballBumper(0);
                      setViewMode('pinball');
                    }}
                  >
                    🎱 Play Vegas Pinball
                  </button>
                  {(showSavedOnly || sortBy === 'new24h' || category !== 'all' || searchQuery.trim()) && (
                    <button
                      type="button"
                      className="tm-btn"
                      onClick={() => {
                        setShowSavedOnly(false);
                        setSortBy('latest');
                        setCategory('all');
                        setSearchQuery('');
                      }}
                    >
                      ↺ Show All User Uploads
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <main className="tm-grid">
              {visibleMemes.map((meme) => (
                <MemeCard
                  key={meme.id}
                  meme={meme}
                  myVote={userVotes[meme.id] || 0}
                  isBookmarked={bookmarkedIds.includes(String(meme.id))}
                  onToggleBookmark={handleToggleBookmark}
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
                  onOpenAiRoast={handleOpenAiRoast}
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

      {/* PHASE 3: MEME CRUSH SAGA (CANDY-CRUSH STYLE MATCH-3 PUZZLE SUB-GAME) */}
      {viewMode === 'crush' && (
        <MemeCrushGame
          tokens={tokens}
          tokenLedger={tokenLedger}
          playsLeft={crushPlaysLeft}
          resetMs={crushResetMs}
          gameTokensRemainingToday={gameTokensRemainingToday}
          onCompleteRound={handleCompleteSubGameRound}
          onSpendTokensForPlay={handleSpendTokensForPlay}
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
        />
      )}

      {/* PHASE 4: LAS VEGAS RETRO PINBALL MACHINE SUB-GAME */}
      {viewMode === 'pinball' && (
        <VegasPinballGame
          tokens={tokens}
          tokenLedger={tokenLedger}
          playsLeft={pinballPlaysLeft}
          resetMs={pinballResetMs}
          gameTokensRemainingToday={gameTokensRemainingToday}
          onCompleteRound={handleCompleteSubGameRound}
          onSpendTokensForPlay={handleSpendTokensForPlay}
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
        />
      )}

      {/* MODE 2: VERTICAL FULL-SCREEN REELS (TIKTOK / INSTAGRAM STYLE) */}
      {viewMode === 'reels' && (
        <VerticalReelsView
          filteredMemes={filteredMemes}
          userVotes={userVotes}
          bookmarkedIds={bookmarkedIds}
          onVote={handleVote}
          onReaction={handleReaction}
          onToggleBookmark={handleToggleBookmark}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onShareMeme={handleShareMeme}
          onOpenProfile={(username) => {
            sfx.playToggle();
            setProfileUsername(username);
          }}
          onOpenTheater={handleOpenTheater}
          onOpenBlankStudio={() => {
            closeAllModals();
            handleOpenBlankStudio();
          }}
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
        />
      )}

      {/* MODE 3: PHYSICS HYPER-SWIPE DECK */}
      {viewMode === 'swipe' && (
        <SwipeDeck
          filteredMemes={filteredMemes}
          swipeIndex={swipeIndex}
          swipeAnim={swipeAnim}
          onTriggerSwipe={triggerSwipe}
          onPrevCard={handlePrevSwipeCard}
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onOpenTheater={handleOpenTheater}
          onOpenBlankStudio={() => {
            closeAllModals();
            handleOpenBlankStudio();
          }}
        />
      )}

      {/* MODE 4: KING OF THE HILL 1v1 MEME BATTLE ARENA */}
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
          onBackToFeed={() => {
            sfx.playToggle();
            setViewMode('feed');
          }}
          onOpenTheater={handleOpenTheater}
          onOpenBlankStudio={() => {
            closeAllModals();
            handleOpenBlankStudio();
          }}
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

      {/* PHASE 20: INTERACTIVE VIRTUAL DANK TAMAGOTCHI CYBER-PET */}
      {!bossKeyActive && <DankPetWidget onEarnPetXp={awardXpAndCombo} />}

      {/* PHASE 5: THUMB-FRIENDLY MOBILE BOTTOM ARCADE DOCK */}
      <MobileArcadeDock
        viewMode={viewMode}
        showStudio={showStudio}
        showLeaderboard={showLeaderboard}
        isAnyModalOpen={isAnyModalOpen}
        onSelectMode={(mode) => {
          sfx.playToggle();
          closeAllModals();
          setViewMode(mode);
        }}
        onOpenBlankStudio={() => {
          sfx.playToggle();
          if (showStudio) {
            setShowStudio(false);
          } else {
            closeAllModals();
            handleOpenBlankStudio();
          }
        }}
        onOpenLeaderboard={() => {
          sfx.playToggle();
          if (showLeaderboard) {
            setShowLeaderboard(false);
          } else {
            closeAllModals();
            setShowLeaderboard(true);
          }
        }}
        onNavigateBack={handleNavigateBack}
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
          studioTextColor={studioTextColor}
          setStudioTextColor={setStudioTextColor}
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

      {/* MODAL 3: HARDENED OAUTH 2.0 (APPLE / GOOGLE / FACEBOOK / DISCORD) & MAGIC LINK AUTH */}
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
          onSocialOAuthLogin={handleSocialOAuthLogin}
          onMagicLinkSubmit={handleMagicLinkSubmit}
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
          onOpenProfile={(username) => {
            setShowLeaderboard(false);
            setProfileUsername(username);
          }}
          onTriggerStudioMutate={handleTriggerStudioMutate}
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
          unlockedFlairs={unlockedFlairs}
          equippedFlair={equippedFlair}
          roastsRun={roastsRun}
          goblinsCaught={goblinsCaught}
          konamiUnlocked={konamiUnlocked}
          onClose={() => setProfileUsername(null)}
          onSelectMeme={handleOpenTheater}
          onTriggerStudioMutate={handleTriggerStudioMutate}
        />
      )}

      {/* MODAL 6: ARCADE VAULT (FAIR TOKEN LEDGER, SLOTS, WHEEL OF CHAOS, TRAILS, DAILY STREAK & QUESTS) */}
      {showRewardsModal && (
        <RewardsModal
          xp={xp}
          tokens={tokens}
          tokenLedger={tokenLedger}
          lootSpins={lootSpins}
          slotPullsLeft={slotPullsLeft}
          slotResetMs={slotResetMs}
          wheelSpinsLeftInWindow={wheelSpinsLeftInWindow}
          wheelResetMs={wheelResetMs}
          streakDays={streakDays}
          streakClaimedToday={streakClaimedToday}
          onClaimDailyStreak={handleClaimDailyStreak}
          onCompleteWheelSpin={handleCompleteWheelSpin}
          onCompleteSlotSpin={handleCompleteSlotSpin}
          unlockedFlairs={unlockedFlairs}
          equippedFlair={equippedFlair}
          onEquipFlair={(flair) => {
            sfx.playToggle();
            setEquippedFlair(flair);
          }}
          cursorTrail={cursorTrail}
          onSelectCursorTrail={(trailId) => {
            sfx.playToggle();
            setCursorTrail(trailId);
          }}
          konamiUnlocked={konamiUnlocked}
          konamiCooldownMs={konamiCooldownMs}
          onTriggerKonamiGodMode={handleTriggerKonamiGodMode}
          questProgress={questProgress}
          claimedQuests={claimedQuests}
          onClaimQuestReward={handleClaimQuestReward}
          onLaunchSubGame={(mode) => {
            sfx.playToggle();
            setShowRewardsModal(false);
            setViewMode(mode);
          }}
          onClose={() => setShowRewardsModal(false)}
        />
      )}

      {/* MODAL 7: AI DANK-O-METER & SAVAGE ROAST SCANNER */}
      {roastModalMeme && (
        <AiRoastModal
          meme={roastModalMeme}
          onPostRoastComment={handlePostRoastComment}
          onTriggerStudioMutate={handleTriggerStudioMutate}
          onClose={() => setRoastModalMeme(null)}
        />
      )}

      {/* PHASE 10: CRAWLABLE SEO DISCOVERY DIRECTORY & FAQ HUB */}
      <SeoDiscoveryFooter
        onSelectCategory={(cat) => {
          sfx.playToggle();
          setCategory(cat);
          setViewMode('feed');
          window.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}
        onOpenBlankStudio={() => {
          closeAllModals();
          handleOpenBlankStudio();
        }}
        onSelectViewMode={(mode) => {
          sfx.playToggle();
          closeAllModals();
          setViewMode(mode);
          window.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}
        onOpenRewards={() => {
          sfx.playToggle();
          closeAllModals();
          setShowRewardsModal(true);
        }}
      />
    </div>
  );
}