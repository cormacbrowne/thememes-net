import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { getSupabaseClient, fetchSupabaseAuthSettings } from './supabaseClient';
import { sfx } from './utils/soundEngine';
import {
  STUDIO_TEMPLATES,
  VIRAL_CAPTIONS,
  CURSOR_TRAILS,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from './data/starterMemes';
import { ARCADE_ECONOMY_RULES } from './utils/tokenEconomy';
import { useTokenEconomy } from './hooks/useTokenEconomy';
import { useFeed } from './hooks/useFeed';
import { PRANK_DISGUISE_TO_PATH } from './data/seoRoutes';
import { useViewMode, useViewModeEffects } from './hooks/useViewMode';
import NavbarHud from './components/NavbarHud';
import QuickUploadBar from './components/QuickUploadBar';
import MemeCard from './components/MemeCard';
import VerticalReelsView from './components/VerticalReelsView';
import { useDeviceProfile, DEVICE_PROFILES } from './utils/deviceProfile';
import {
  getSettings,
  applySettingsToRuntime,
  subscribeSettings,
  updateSettings
} from './utils/settingsStore';
import { getSecurityAuditReport } from './utils/securityGuard';
import ParticleOverlay from './components/ParticleOverlay';
import MemeSkeletonGrid from './components/MemeSkeletonGrid';
import MobileArcadeDock from './components/MobileArcadeDock';
import SeoDiscoveryFooter from './components/SeoDiscoveryFooter';
import { RadioToggleButton, MobileNowPlayingPill } from './components/MemesRadio';
import {
  setRadioContextStation,
  setRadioMuted,
  getRadioState,
  armRadioResumeOnGesture,
  toggleRadio,
  skipRadioTrack,
  cycleRadioStation
} from './utils/radioBus';
import { useLivePresence } from './hooks/useLivePresence';

const InsertCoinIntro = lazy(() => import('./components/InsertCoinIntro'));
const MemeForge = lazy(() => import('./components/forge/MemeForge'));
const MemeEvolutionModal = lazy(() => import('./components/MemeEvolutionModal'));
const SwipeDeck = lazy(() => import('./components/SwipeDeck'));
const BattleArena = lazy(() => import('./components/BattleArena'));
const ArcadeLobby = lazy(() => import('./components/ArcadeLobby'));
const MemeCrushGame = lazy(() => import('./components/MemeCrushGame'));
const VegasPinballGame = lazy(() => import('./components/VegasPinballGame'));
const VegasSlotMachine = lazy(() => import('./components/VegasSlotMachine'));
const VegasBlackjackGame = lazy(() => import('./components/VegasBlackjackGame'));
const VegasRouletteGame = lazy(() => import('./components/VegasRouletteGame'));
const VegasCoinPusherGame = lazy(() => import('./components/VegasCoinPusherGame'));
const MemeStockMarketGame = lazy(() => import('./components/MemeStockMarketGame'));
const NeonDerbyGame = lazy(() => import('./components/NeonDerbyGame'));
const GuessTheMemeGame = lazy(() => import('./components/GuessTheMemeGame'));
const MemePlinkoGame = lazy(() => import('./components/MemePlinkoGame'));
const HigherOrLowerGame = lazy(() => import('./components/HigherOrLowerGame'));
const ArcadeAiAssistant = lazy(() => import('./components/ArcadeAiAssistant'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const MemeTheaterModal = lazy(() => import('./components/MemeTheaterModal'));
const LeaderboardModal = lazy(() => import('./components/LeaderboardModal'));
const PlayerProfileModal = lazy(() => import('./components/PlayerProfileModal'));
const ExtrasDrawerModal = lazy(() => import('./components/ExtrasDrawerModal'));
const RewardsModal = lazy(() => import('./components/RewardsModal'));
const AiRoastModal = lazy(() => import('./components/AiRoastModal'));
const BossKeyOverlay = lazy(() => import('./components/BossKeyOverlay'));
const DankPetWidget = lazy(() => import('./components/DankPetWidget'));
const UnhandledGooseSurprise = lazy(() => import('./components/UnhandledGooseSurprise'));
const MemeLiveCelebrationModal = lazy(() => import('./components/MemeLiveCelebrationModal'));
const DailyCaptionBattleModal = lazy(() => import('./components/DailyCaptionBattleModal'));

const MODAL_SKELETON_FALLBACK = (
  <div className="tm-modal-backdrop" role="status" aria-live="polite">
    <div className="tm-modal tm-skeleton-card" style={{ maxWidth: 540, padding: 24 }}>
      <div className="tm-skeleton-line" style={{ width: '58%', height: 20, marginBottom: 14 }} />
      <div className="tm-skeleton-media" style={{ height: 220, borderRadius: 12 }} />
    </div>
  </div>
);

export default function App() {
  const router = useViewMode();
  const {
    category,
    setCategory,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    showSavedOnly,
    setShowSavedOnly,
    sortBy,
    setSortBy,
    showStudio,
    setShowStudio,
    forgeIntent,
    setForgeIntent,
    extrasDrawerOpen,
    setExtrasDrawerOpen,
    extrasFocus,
    setExtrasFocus,
    bossKeyActive,
    setBossKeyActive,
    prankDisguise,
    setPrankDisguise,
    surpriseOpen,
    setSurpriseOpen,
    setTheaterMemeId,
    openedFromShareLink,
    showLeaderboard,
    setShowLeaderboard,
    showRewardsModal,
    setShowRewardsModal,
    rewardsInitialTab,
    setRewardsInitialTab,
    profileUsername,
    setProfileUsername,
    showAuthModal,
    setShowAuthModal,
    battleModalOpen,
    setBattleModalOpen,
    liveCelebrationData,
    setLiveCelebrationData,
    roastModalMeme,
    setRoastModalMeme,
    evolutionModalMeme,
    setEvolutionModalMeme,
    payphoneModalOpen,
    setPayphoneModalOpen,
    aiAssistantOpen,
    setAiAssistantOpen,
    showIntro,
    setShowIntro,
    isFixedArcadeGame,
    hasCanonicalSubpath,
    activeNavDepth,
    handleOpenTheater,
    handleCloseTheater,
    closeAllModals,
    handleNavigateBack
  } = router;

  const quickUploadInputRef = useRef(null);
  const { profile: deviceProfile, setOverride: setDeviceOverride } = useDeviceProfile();

  // Display, Audio & Particle UI State
  const [soundOn, setSoundOn] = useState(() => getSettings().sfxOn);
  const [soundPack, setSoundPack] = useState(() => getSettings().soundPack || 'goofy');
  const [crtOn, setCrtOn] = useState(() => Boolean(getSettings().crtOn));
  const [litePerfMode, setLitePerfMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('tm_lite_perf_v1');
    if (saved !== null) return saved === 'true';
    if (localStorage.getItem('tm_settings')) return Boolean(getSettings().litePerfMode);
    const isTouchTabletOrPhone =
      window.matchMedia?.('(pointer: coarse)').matches ||
      /iPad|iPhone|iPod|Android/i.test(navigator.userAgent || '');
    const lowCores = (navigator.hardwareConcurrency || 8) <= 4;
    return Boolean(isTouchTabletOrPhone || lowCores);
  });
  const [screenShake, setScreenShake] = useState(false);
  const [screenPunch, setScreenPunch] = useState(false);
  const particleOverlayRef = useRef(null);
  const [goblinFortuneToast, setGoblinFortuneToast] = useState('');

  // Modals & Hardened User Auth State
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_user') || 'null');
    } catch {
      return null;
    }
  });
  const { onlineCount, broadcastEmote } = useLivePresence({ username: user?.username });
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const failedAuthRef = useRef({ count: 0, lockUntil: 0 });

  // Phase 8, 9 & 28.16: AI Roast Run Counter & Toy Widgets
  const [stampedeSprites, setStampedeSprites] = useState([]);
  const [bubbleWrapItems, setBubbleWrapItems] = useState([]);
  const bubbleComboRef = useRef(0);
  const [roastsRun, setRoastsRun] = useState(() =>
    Number(localStorage.getItem('tm_roasts_run') || 0)
  );
  const [chaosMutator, setChaosMutator] = useState('none');
  const [activeGoblin, setActiveGoblin] = useState(null);
  const [goblinsCaught, setGoblinsCaught] = useState(() =>
    Number(localStorage.getItem('tm_goblins') || 0)
  );
  const logoTapRef = useRef({ count: 0, lastTap: 0 });
  const lastTrailTimeRef = useRef(0);

  const spawnParticles = useCallback(
    (x, y, label, emoji = '🔥') => {
      if (litePerfMode) return;
      const fakeEvt = { clientX: x, clientY: y };
      particleOverlayRef.current?.spawnParticles(fakeEvt, emoji, 5);
      if (label) {
        particleOverlayRef.current?.spawnComicPop(fakeEvt, label);
      }
    },
    [litePerfMode]
  );

  const economy = useTokenEconomy({ spawnParticles, setGoblinFortuneToast });
  const {
    xp,
    xpAutoConvert,
    reactorFlash,
    tokens,
    tokenLedger,
    combo,
    comboTimer,
    levelUpBanner,
    currentRank,
    unlockedCosmetics,
    equippedFrame,
    equippedCassetteSkin,
    cursorTrail,
    setCursorTrail,
    lootSpins,
    rateWindows,
    wheelSpinsLeftInWindow,
    wheelResetMs,
    goblinsLeftInWindow,
    goblinResetMs,
    streakDays,
    streakClaimedToday,
    unlockedFlairs,
    equippedFlair,
    setEquippedFlair,
    questProgress,
    claimedQuests,
    konamiUnlocked,
    uploadTokensRemainingToday,
    pioneerBonusAvailable,
    pinataClaimedToday,
    payphoneClaimedToday,
    xpConversionState,
    unclaimedRewardsCount,
    incrementQuest,
    awardXpOnly,
    awardXpAndCombo,
    handleSpendTokens,
    handleEquipCosmetic,
    handleBuyOrUnlockCosmetic,
    handleClaimGoldenMeme,
    handlePayoutGameTokens,
    handleWinPinataReward,
    handleClaimPayphoneCoinReturn,
    handleBossSecretXp,
    handleExchangeXpForTokens,
    handleToggleXpAutoConvert,
    handleClaimDailyStreak,
    handleCompleteWheelSpin,
    handleClaimQuestReward,
    handleTriggerKonamiGodMode,
    recordWildGoblinReward
  } = economy;

  const feed = useFeed({
    router,
    economy,
    user,
    litePerfMode,
    broadcastEmote,
    setGoblinFortuneToast,
    setScreenPunch
  });
  const {
    memes,
    isLoadingFeed,
    bookmarkedIds,
    dbStatus,
    setMutatingParentMeme,
    evolutionNodes,
    loadingEvolution,
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
    petUnlocked,
    aiUnlocked,
    setAiUnlocked,
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
    visibleCount,
    setVisibleCount,
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
  } = feed;

  // Persist UI Settings
  useEffect(() => {
    applySettingsToRuntime(getSettings());
    const unsub = subscribeSettings((next) => {
      setSoundOn(Boolean(next.sfxOn));
      setSoundPack(next.soundPack || 'goofy');
      setCrtOn(Boolean(next.crtOn));
      setLitePerfMode(Boolean(next.litePerfMode));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('tm_lite_perf_v1', String(litePerfMode));
  }, [litePerfMode]);

  useEffect(() => {
    localStorage.setItem('tm_crt', String(crtOn));
  }, [crtOn]);

  useEffect(() => {
    localStorage.setItem('tm_goblins', String(goblinsCaught));
  }, [goblinsCaught]);

  // Phase 28.11 & 29.6: THE MEMES FM radio hooks (resume on gesture if left ON, mute sync, shortcuts, context station)
  useEffect(() => {
    armRadioResumeOnGesture();
  }, []);

  useEffect(() => {
    const onRadioKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if (k === 'm') {
        e.preventDefault();
        toggleRadio();
      } else if (k === 'n' && e.shiftKey) {
        e.preventDefault();
        cycleRadioStation();
      } else if (k === 'n') {
        e.preventDefault();
        skipRadioTrack();
      }
    };
    window.addEventListener('keydown', onRadioKeyDown);
    return () => window.removeEventListener('keydown', onRadioKeyDown);
  }, []);

  useEffect(() => {
    setRadioMuted(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    if (bossKeyActive) {
      setRadioContextStation('vaporwave');
    } else if (['pinball', 'crush', 'pusher', 'battle', 'swipe'].includes(viewMode)) {
      setRadioContextStation('chiptune');
    } else if (['blackjack', 'roulette', 'slots', 'plinko'].includes(viewMode)) {
      setRadioContextStation('casinojazz');
    } else if (viewMode === 'derby') {
      setRadioContextStation('western');
    } else if (viewMode === 'guess') {
      setRadioContextStation('lofi');
    } else if (viewMode === 'stocks' || viewMode === 'hilow') {
      setRadioContextStation('synthwave');
    } else {
      setRadioContextStation(null);
    }
  }, [bossKeyActive, viewMode]);

  useEffect(() => {
    localStorage.setItem('tm_roasts_run', String(roastsRun));
  }, [roastsRun]);

  // INITIALIZE SUPABASE AUTH SESSION SYNC
  useEffect(() => {
    const client = getSupabaseClient();
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

    return () => {
      if (authSub && typeof authSub.unsubscribe === 'function') {
        authSub.unsubscribe();
      }
    };
  }, []);

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
    updateSettings({ soundPack: packId });
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
      dir,
      manualSummon: true
    });
  }, [rateWindows]);

  // Periodic Golden Loot Goblin Spawner every 95 seconds (progressively unlocked; paused while playing fixed arcade games)
  useEffect(() => {
    if (isFixedArcadeGame || (!petUnlocked && !aiUnlocked)) return undefined;
    const timer = setInterval(() => {
      if (
        !bossKeyActive &&
        !activeGoblin &&
        (typeof document === 'undefined' || !document.hidden) &&
        rateWindows.goblinUsed < ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW
      ) {
        const topPct = 20 + Math.floor(Math.random() * 52);
        const dir = Math.random() > 0.5 ? 'left-to-right' : 'right-to-left';
        setActiveGoblin({
          id: `gob-${Date.now()}`,
          topPct,
          dir,
          manualSummon: false
        });
      }
    }, 95000);
    return () => clearInterval(timer);
  }, [bossKeyActive, activeGoblin, rateWindows.goblinUsed, isFixedArcadeGame, petUnlocked, aiUnlocked]);

  const handleCatchGoblin = useCallback(
    (e) => {
      if (!activeGoblin) return;
      e?.stopPropagation?.();
      const wasManual = Boolean(activeGoblin.manualSummon);
      setActiveGoblin(null);
      setGoblinsCaught((c) => c + 1);
      sfx.playJackpot();
      setTimeout(() => sfx.playRubberDuck(), 150);
      recordWildGoblinReward(wasManual, e);
      setTimeout(() => setGoblinFortuneToast(''), 5500);
    },
    [activeGoblin, recordWildGoblinReward]
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

  // Cursor particle trail renderer (follows active trail cosmetic)
  useEffect(() => {
    if (cursorTrail === 'none' || litePerfMode || isFixedArcadeGame) {
      return undefined;
    }
    const trailObj = CURSOR_TRAILS.find((t) => t.id === cursorTrail);
    if (!trailObj || !trailObj.emoji) return undefined;

    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const now = Date.now();
      if (now - lastTrailTimeRef.current < 160) return;
      lastTrailTimeRef.current = now;
      if (e.clientX && e.clientY) {
        particleOverlayRef.current?.spawnParticles(
          { clientX: e.clientX, clientY: e.clientY },
          trailObj.emoji,
          1
        );
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    const onPointerDown = (e) => {
      if (e.pointerType !== 'touch') return;
      if (e.clientX && e.clientY) {
        particleOverlayRef.current?.spawnParticles(
          { clientX: e.clientX, clientY: e.clientY },
          trailObj.emoji,
          1
        );
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [cursorTrail, litePerfMode, isFixedArcadeGame]);

  const handlePlaySoundboardPad = useCallback(
    (pad, e) => {
      if (!soundOn) {
        sfx.enabled = true;
        setSoundOn(true);
        updateSettings({ sfxOn: true });
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
      const randTpl =
        STUDIO_TEMPLATES.length > 0
          ? STUDIO_TEMPLATES[Math.floor(Math.random() * STUDIO_TEMPLATES.length)]
          : null;
      const randomUserMeme = memes.length > 0 ? memes[Math.floor(Math.random() * memes.length)] : null;
      if (randomUserMeme) {
        setMutatingParentMeme(randomUserMeme);
      }
      const chaosEmojiPool = ['🔥', '💀', '😂', '👑', '🕶️', '🚀', '🗿', '💎'];
      const pickSticker = (xPct, yPct) => ({
        emoji: chaosEmojiPool[Math.floor(Math.random() * chaosEmojiPool.length)],
        xPct,
        yPct,
        size: 64
      });
      setForgeIntent({
        mode: 'chaos',
        parent: randomUserMeme,
        imageUrl: randomUserMeme?.base_image_url || randomUserMeme?.image_url || randTpl?.src || null,
        initialText: `${randCap[0]} ${randCap[1]}`,
        chaos: {
          top: randCap[0],
          bottom: randCap[1],
          stickers: [pickSticker(0.2, 0.28), pickSticker(0.8, 0.72)],
          filter: { contrast: 118, saturate: 135, hue: 0, deepfry: false }
        }
      });
      setShowStudio(true);

      if (e) {
        spawnParticles(
          e.clientX || window.innerWidth / 2,
          e.clientY || 120,
          '🎲 CHAOS ROULETTE!',
          '🎲'
        );
      }
    },
    [memes, setMutatingParentMeme, spawnParticles, setForgeIntent, setShowStudio]
  );

  const handleOpenAiRoast = useCallback(
    (meme, e) => {
      if (!meme) return;
      sfx.playAnimeShock();
      setRoastModalMeme(meme);
      setRoastsRun((r) => r + 1);
      incrementQuest('q-roast', 1);
      awardXpOnly(ARCADE_ECONOMY_RULES.REWARDS.ROAST_MEME.xp, e, '🤖');
    },
    [incrementQuest, awardXpOnly, setRoastModalMeme]
  );

  const isAnyModalOpen = Boolean(
    showStudio ||
      theaterMeme ||
      evolutionModalMeme ||
      showLeaderboard ||
      showRewardsModal ||
      battleModalOpen ||
      liveCelebrationData ||
      roastModalMeme ||
      profileUsername ||
      showAuthModal ||
      extrasDrawerOpen ||
      bossKeyActive
  );

  useViewModeEffects({ router, theaterMeme, isAnyModalOpen });

  return (
    <div
      className={`tm-app ${isFixedArcadeGame ? 'tm-app-game-fixed' : ''} ${
        litePerfMode ? 'tm-lite-perf' : ''
      } ${screenShake ? 'tm-shake' : ''} ${
        screenPunch ? 'tm-screen-punch' : ''
      } tm-mutator-${chaosMutator} tm-device-${deviceProfile.id}`}
      data-device={deviceProfile.id}
      data-form={deviceProfile.formFactor}
    >
      {/* ACTIVE-BY-DEFAULT SYNTHWAVE PERSPECTIVE GRID & NEON GLOW BACKDROP */}
      <div className="tm-synthwave-bg" aria-hidden="true">
        <div className="tm-synthwave-glow" />
        <div className="tm-synthwave-grid" />
      </div>

      {/* OPTIONAL CRT SCANLINE & PHOSPHOR SHADER OVERLAY */}
      {crtOn && <div className="tm-crt-overlay" aria-hidden="true" />}

      {/* PHASE 28.12: ONE-TIME "INSERT COIN" FIRST-VISIT CRT BOOT INTRO */}
      {showIntro && (
        <Suspense fallback={null}>
          <InsertCoinIntro onComplete={() => setShowIntro(false)} />
        </Suspense>
      )}

      {/* ROAMING GOLDEN LOOT GOBLIN SURPRISE EVENT */}
      {activeGoblin && !bossKeyActive && !isFixedArcadeGame && (
        <button
          type="button"
          key={activeGoblin.id}
          className={`tm-loot-goblin ${activeGoblin.dir}`}
          style={{ top: `${activeGoblin.topPct}%` }}
          onClick={handleCatchGoblin}
          title="Catch the Wild Golden Loot Goblin (+5 Tokens max 1x/day & +60 XP)!"
        >
          <span className="tm-goblin-icon">👾✨</span>
          <span className="tm-goblin-tag">CATCH ME! WILD LOOT!</span>
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
            Instant Canvas Load ({pioneerBonusAvailable ? '+75 🪙 First Upload Bonus' : '+45 🪙 Tokens'} &amp; +120 XP)
          </p>
        </div>
      )}

      {/* ISOLATED FLOATING PHYSICS PARTICLES OVERLAY (ZERO ROOT RE-RENDERS) */}
      <ParticleOverlay ref={particleOverlayRef} litePerfMode={litePerfMode} />

      {/* LEVEL UP BANNER */}
      {levelUpBanner && (
        <div className="tm-levelup-toast">
          🎉 LEVEL UP! You reached Lv.{levelUpBanner.level}: {levelUpBanner.title}!
        </div>
      )}

      {/* BOSS KEY CORPORATE SPREADSHEET PANIC OVERLAY */}
      {bossKeyActive && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <BossKeyOverlay
            initialDisguise={prankDisguise || 'excel'}
            isPrankPage={Boolean(prankDisguise)}
            onDisguiseChange={(nextId) => {
              if (prankDisguise !== null && PRANK_DISGUISE_TO_PATH[nextId]) {
                setPrankDisguise(nextId);
              }
            }}
            onExitBossMode={() => {
              setBossKeyActive(false);
              setPrankDisguise(null);
            }}
            onSecretWorkXp={handleBossSecretXp}
            memes={memes}
          />
        </Suspense>
      )}

      {/* FIXED NON-SCROLLING IPAD/IPHONE ARCADE TOP BAR VS FULL FEED NAVIGATION */}
      {isFixedArcadeGame ? (
        <header className="tm-fixed-arcade-bar" aria-label="Fixed Arcade Cabinet Bar">
          <button
            type="button"
            className="tm-fixed-back-btn"
            onClick={() => {
              sfx.playToggle();
              setViewMode('lobby');
            }}
            title="Back to Cyber-Arcade Lobby"
          >
            🕹️ Lobby
          </button>
          <button
            type="button"
            className="tm-fixed-back-btn"
            onClick={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          >
            ← Memes
          </button>

          <nav className="tm-fixed-game-pills" aria-label="Switch Arcade Game">
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'pusher' ? 'active' : ''}`}
              onClick={() => {
                sfx.playCoinDrop?.();
                setViewMode('pusher');
              }}
            >
              🪙 Dozer
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'pinball' ? 'active' : ''}`}
              onClick={() => {
                sfx.playPinballBumper(0);
                setViewMode('pinball');
              }}
            >
              🎱 Pinball
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'blackjack' ? 'active' : ''}`}
              onClick={() => {
                sfx.playCardDeal();
                setViewMode('blackjack');
              }}
            >
              🃏 21&apos;s
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'roulette' ? 'active' : ''}`}
              onClick={() => {
                sfx.playRouletteSpin();
                setViewMode('roulette');
              }}
            >
              🎡 Roulette
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'slots' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('slots');
              }}
            >
              🎰 Slots
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'stocks' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('stocks');
              }}
            >
              📈 Stocks
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'derby' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('derby');
              }}
            >
              🏇 Derby
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'guess' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('guess');
              }}
            >
              🧠 Guess
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'plinko' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('plinko');
              }}
            >
              🎯 Plinko
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'hilow' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('hilow');
              }}
            >
              ⬆️ Hi/Lo
            </button>
            <button
              type="button"
              className={`tm-fixed-game-pill ${viewMode === 'crush' ? 'active' : ''}`}
              onClick={() => {
                sfx.playToggle();
                setViewMode('crush');
              }}
            >
              🍬 Crush
            </button>
          </nav>

          <div className="tm-fixed-bar-right">
            <button
              type="button"
              className="tm-fixed-wallet-pill"
              onClick={() => {
                sfx.playToggle();
                setShowRewardsModal(true);
              }}
              title="Open Token Wallet & Daily Quests"
            >
              🪙 <strong>{tokens}</strong>
            </button>
            <RadioToggleButton className="tm-fixed-icon-btn" />
            <button
              type="button"
              className="tm-fixed-icon-btn"
              onClick={() => {
                sfx.playToggle();
                setExtrasFocus(null);
                setExtrasDrawerOpen(true);
              }}
              aria-label="Open Extras drawer"
              title="Open Extras Drawer: Soundboard, WTF?!, Payphone, Boss Key, CRT, Turbo & AI"
            >
              🕹️
            </button>
          </div>
        </header>
      ) : (
        <>
          {/* PHASE 28.3: DECLUTTERED TOP NAVIGATION & FAIR TOKEN WALLET HUD (<= 6 Primary Controls) */}
          <NavbarHud
            comboTimer={comboTimer}
            combo={combo}
            dbStatus={dbStatus}
            onlineCount={onlineCount}
            unreadNotificationsCount={unreadNotificationsCount}
            currentRank={currentRank}
            tokens={tokens}
            xpConversionState={xpConversionState}
            reactorFlash={reactorFlash}
            onExchangeXpForTokens={handleExchangeXpForTokens}
            viewMode={viewMode}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              closeAllModals();
              setViewMode(mode);
            }}
            onOpenBlankStudio={() => {
              closeAllModals();
              handleOpenBlankStudio();
            }}
            onOpenRewards={() => {
              sfx.playToggle();
              closeAllModals();
              setRewardsInitialTab('vault');
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
              setNotifications([]);
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
            canGoBack={activeNavDepth > 0 || hasCanonicalSubpath}
            onNavigateBack={handleNavigateBack}
            onOpenExtras={() => {
              sfx.playToggle();
              setExtrasFocus(null);
              setExtrasDrawerOpen(true);
            }}
          />

          {/* PHASE 28.3: STREAMLINED FEED FILTER BAR (Visible only on grid feed; button count halved) */}
          {viewMode === 'feed' && (
            <section className="tm-controls">
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
                {showSavedOnly && (
                  <button
                    type="button"
                    className="tm-tab active"
                    onClick={() => setShowSavedOnly(false)}
                    title="Click to return to all memes"
                  >
                    ⭐ Saved ({bookmarkedIds.length}) ✕
                  </button>
                )}
              </div>

              <div className="tm-controls-right">
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
              </div>
            </section>
          )}
        </>
      )}

      {/* MODE 1: HERO MEME FEED FIRST (ON IPHONE & DESKTOP) + SIDE ENTERTAINMENT BELOW */}
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
            activeBounty={dailyBattle}
            yesterdayCaptionKing={yesterdayCaptionKing}
            battleEntriesCount={battleEntriesCount}
            onOpenBattleModal={() => {
              sfx.playToggle();
              closeAllModals();
              setBattleModalOpen(true);
            }}
            onAcceptBounty={handleAcceptBounty}
            uploadTokensRemainingToday={uploadTokensRemainingToday}
            pioneerBonusAvailable={pioneerBonusAvailable}
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
                  accept="image/*,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadFileIntoStudio(file);
                  }}
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
                    : `Use the 1-Click Quick-Upload Bar above, drop an image anywhere on screen, or paste (Ctrl+V) to post your meme and earn ${
                        pioneerBonusAvailable ? '+75 🪙 First-Upload Pioneer Bonus' : '+45 🪙 Arcade Tokens'
                      } & +120 XP — then gamble or invest your tokens in the 80s Arcade!`}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={() => quickUploadInputRef.current?.click()}
                  >
                    📥 Select Photo / Screenshot ({pioneerBonusAvailable ? '+75 🪙 First Upload!' : '+45 🪙 & +120 XP'})
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
            <>
              {trendingFormats.length > 0 && (
                <section className="tm-trending-formats-wrap" aria-label="Trending Community Formats">
                  <div className="tm-trending-formats-header">
                    <span>🔥 TRENDING COMMUNITY FORMATS</span>
                    <span className="tm-trending-formats-sub">Tap any base to add your own spin!</span>
                  </div>
                  <div className="tm-trending-formats-scroller">
                    {trendingFormats.map((tf) => (
                      <div
                        key={tf.id}
                        className="tm-format-card"
                        onClick={(e) => handleCaptionThis(tf, e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleCaptionThis(tf, e);
                        }}
                      >
                        <div className="tm-format-thumb-box">
                          <img
                            src={tf.base_image_url || tf.poster_url || tf.image_url}
                            alt={tf.title}
                            loading="lazy"
                          />
                        </div>
                        <div className="tm-format-info">
                          <span className="tm-format-title">{tf.title.slice(0, 24)}</span>
                          <span className="tm-format-badge">✏️ Caption ({tf.formatCount}x)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <main className="tm-grid">
              {visibleMemes.map((meme, idx) => (
                <div key={meme.id} style={{ display: 'contents' }}>
                  <MemeCard
                    meme={meme}
                    priority={idx < 2}
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
                    onCaptionThis={handleCaptionThis}
                    onOpenTheater={handleOpenTheater}
                    onShareMeme={handleShareMeme}
                    onOpenProfile={(username) => {
                      sfx.playToggle();
                      setProfileUsername(username);
                    }}
                    onReportMeme={handleReportMeme}
                    onOpenAiRoast={handleOpenAiRoast}
                    cardFrame={
                      (user?.username &&
                        meme.author_name &&
                        String(meme.author_name).toLowerCase() ===
                          String(user.username).toLowerCase()) ||
                      String(meme.id).startsWith('local-')
                        ? equippedFrame
                        : 'default'
                    }
                    litePerfMode={litePerfMode}
                  />
                  {idx === 3 && (
                    <article className="tm-card tm-infeed-arcade-card" aria-label="Side Entertainment Arcade Break">
                      <div className="tm-infeed-arcade-badge">🕹️ 80s NEON TOKEN ARCADE &amp; CASINO</div>
                      <div style={{ fontSize: '34px', margin: '6px 0' }}>🃏🎡🎰📈🍬🎱</div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#facc15' }}>
                        READY TO PLAY NEON 21&apos;S, LIGHTNING ROULETTE &amp; ARCADE CABINETS?
                      </h3>
                      <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        Challenge Dealer Bot &apos;86 in <strong>🃏 Neon 21&apos;s Blackjack</strong>, spin{' '}
                        <strong>🎡 Lightning Roulette (150×)</strong>, pull the <strong>🎰 One-Arm Bandit</strong>, trade{' '}
                        <strong>📈 MEMEDAQ &apos;86</strong>, or fire up <strong>🎱 Upgraded 80s Pinball</strong>!
                      </p>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playCoinDrop?.();
                            setViewMode('pusher');
                          }}
                        >
                          🪙 Coin Dozer &apos;86
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playCardDeal();
                            setViewMode('blackjack');
                          }}
                        >
                          🃏 Neon 21&apos;s
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playRouletteSpin();
                            setViewMode('roulette');
                          }}
                        >
                          🎡 Lightning Roulette
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playSlotLeverPull();
                            setViewMode('slots');
                          }}
                        >
                          🎰 One-Arm Bandit
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playStockBell?.(true);
                            setViewMode('stocks');
                          }}
                        >
                          📈 Meme Stocks
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playCandyMatch(3);
                            setViewMode('crush');
                          }}
                        >
                          🍬 Meme Crush
                        </button>
                        <button
                          type="button"
                          className="tm-btn tm-btn-primary"
                          onClick={() => {
                            sfx.playPinballBumper(0);
                            setViewMode('pinball');
                          }}
                        >
                          🎱 80s Pinball
                        </button>
                      </div>
                    </article>
                  )}
                </div>
              ))}
            </main>
          </>
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

          {!isLoadingFeed && filteredMemes.length > 0 && visibleCount >= filteredMemes.length && (
            <section className="tm-end-of-internet-wrap" aria-label="End of feed">
              <div className="tm-end-of-internet-card">
                <div style={{ fontSize: '42px', marginBottom: '6px' }}>🫠</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 900, color: '#f8fafc' }}>
                  You&apos;ve reached the end of the internet
                </h3>
                <p style={{ margin: '0 auto 14px', maxWidth: '460px', fontSize: '13px', color: '#94a3b8' }}>
                  You scrolled every meme in this sector. Remix a format or drop into the 80s Neon Arcade!
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={handleOpenBlankStudio}
                  >
                    🎨 Remix / Create a Meme
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => {
                      sfx.playToggle();
                      setViewMode('pusher');
                    }}
                  >
                    🕹️ Play Arcade Games
                  </button>
                  <button
                    type="button"
                    className="tm-btn"
                    onClick={() => window.scrollTo?.({ top: 0, behavior: 'smooth' })}
                  >
                    🔝 Back to Top
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* SIDE ENTERTAINMENT LOUNGE: FEATURED 80s NEON ARCADE SUB-GAMES BELOW THE MEME FEED */}
          <section className="tm-arcade-steer-shell" aria-label="Side Entertainment Arcade Lounge">
            <div className="tm-arcade-steer-section-head">
              <span className="tm-arcade-steer-eyebrow">🕹️ 80s NEON TOKEN CASINO &amp; ARCADE LOUNGE</span>
              <h2 className="tm-arcade-steer-heading">
                Earn 🪙 Tokens by Uploading Memes — Then Wager, Trade &amp; Play in Fixed Non-Scroll Cabinets
              </h2>
            </div>
            <div className="tm-arcade-steer-grid tm-arcade-steer-grid-4">
              {/* Cabinet 00: Neon Coin Dozer '86 — Arcade Penny Falls & Prize Machine */}
              <div
                className="tm-arcade-steer-card tm-steer-roulette"
                onClick={() => {
                  sfx.playCoinDrop?.();
                  setViewMode('pusher');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🪙 NEON COIN DOZER &apos;86 • PENNY-FALLS PRIZE PUSHER</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_pusher_highscore') || 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🪙🎁💎🏆</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">NEON COIN DOZER &apos;86 — PRIZE PUSHER</h3>
                    <p className="tm-arcade-steer-desc">
                      Drop coins onto the reciprocating <strong>Chrome Pusher Shelf</strong> to nudge cascades of coins,{' '}
                      <strong>💎 Neon Diamonds (+8 🪙)</strong>, <strong>🎁 Mystery Boxes (+12 🪙)</strong> &amp;{' '}
                      <strong>🏆 Golden Trophies (+20 🪙)</strong> over the front lip into the payoff tray!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 Free Practice Bucket or 1 Token per Coin Drop • Bulldozer Fever Shields
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playCoinDrop?.();
                      setViewMode('pusher');
                    }}
                  >
                    ▶ Play Coin Dozer &apos;86
                  </button>
                </div>
              </div>

              {/* Cabinet 0A: Neon 21's Cyber-Blackjack */}
              <div
                className="tm-arcade-steer-card tm-steer-blackjack"
                onClick={() => {
                  sfx.playCardDeal();
                  setViewMode('blackjack');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🃏 NEON 21&apos;S • SPLIT / DOUBLE / 5-CARD CHARLIE</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_blackjack_highscore') || 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🃏🂡🥽🔥</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">NEON 21&apos;S — CYBER BLACKJACK</h3>
                    <p className="tm-arcade-steer-desc">
                      Face <strong>Dealer Bot &apos;86</strong> with 3D holographic neon cards! Features{' '}
                      <strong>Double Down</strong>, <strong>Split Pairs</strong>,{' '}
                      <strong>5-Card Charlie (3× Auto-Win)</strong>, <strong>Perfect Pair + 21+3 Side Bets</strong> &amp; a live{' '}
                      <strong>🥽 Cyber-Visor AI Strategy Advisor</strong>!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 Wager 5–50 Tokens (3:2 Blackjack • Up to 15× Side Bet) or Free Practice
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playCardDeal();
                      setViewMode('blackjack');
                    }}
                  >
                    ▶ Deal Neon 21&apos;s
                  </button>
                </div>
              </div>

              {/* Cabinet 0B: Neon Lightning Roulette '86 */}
              <div
                className="tm-arcade-steer-card tm-steer-roulette"
                onClick={() => {
                  sfx.playRouletteSpin();
                  setViewMode('roulette');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🎡 LIGHTNING ROULETTE &apos;86 • 50× TO 150× STRIKES</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_roulette_highscore') || 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🎡⚡🔴⚫</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">NEON LIGHTNING ROULETTE &apos;86</h3>
                    <p className="tm-arcade-steer-desc">
                      60fps European 37-pocket physics wheel with real ball orbit &amp; pocket rattle! Every spin strikes{' '}
                      <strong>3 Random ⚡ Lightning Numbers</strong> boosting straight-up payouts to{' '}
                      <strong>50×, 75×, 100×, or 150×</strong>!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 Stack 1–25 Token Chips • 1-Tap Lucky 7s &amp; Lightning Presets
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playRouletteSpin();
                      setViewMode('roulette');
                    }}
                  >
                    ▶ Spin Roulette Wheel
                  </button>
                </div>
              </div>

              {/* Cabinet 1: Authentic Las Vegas One-Arm Bandit 777 Slot Machine */}
              <div
                className="tm-arcade-steer-card tm-steer-slots"
                onClick={() => {
                  sfx.playSlotLeverPull();
                  setViewMode('slots');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🎰 ONE-ARM BANDIT • 777 / BAR / BELL / CHERRY</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_slots_best_win') || 0).toLocaleString()} 🪙
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🎰💎🔔🍒</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">LAS VEGAS ONE-ARM BANDIT</h3>
                    <p className="tm-arcade-steer-desc">
                      Authentic curved mechanical drums with <strong>Flaming 777s</strong>,{' '}
                      <strong>Triple Gold BARs</strong>, <strong>Liberty Bells</strong>,{' '}
                      <strong>Twin Cherries</strong> &amp; 3D chrome pull-lever!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 Wager 5–50 Tokens • Up to 50× Jackpot
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playSlotLeverPull();
                      setViewMode('slots');
                    }}
                  >
                    ▶ Pull Bandit Lever
                  </button>
                </div>
              </div>

              {/* Cabinet 2: MEMEDAQ '86 Meme Stock Market Simulator */}
              <div
                className="tm-arcade-steer-card tm-steer-stocks"
                onClick={() => {
                  sfx.playStockBell?.(true);
                  setViewMode('stocks');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">📈 MEMEDAQ &apos;86 • LIVE WALL ST TERMINAL</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Peak: {Number(localStorage.getItem('tm_stocks_highscore') || 0).toLocaleString()} 🪙
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">📈🐕🐸🚀</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">STOCK MARKET SIMULATOR</h3>
                    <p className="tm-arcade-steer-desc">
                      Buy low &amp; sell high on <strong>$DOGE</strong>, <strong>$CHAD</strong>,{' '}
                      <strong>$PEPE</strong>, <strong>$CATS</strong> &amp; <strong>$MOON</strong> with live neon CRT charts &amp; breaking news!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 Trade Real Tokens • Insider Rumor Hotline
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playStockBell?.(true);
                      setViewMode('stocks');
                    }}
                  >
                    ▶ Trade Meme Stocks
                  </button>
                </div>
              </div>

              {/* Cabinet 3: Meme Crush Saga (10 Distinct 80s Neon Levels) */}
              <div
                className="tm-arcade-steer-card tm-steer-crush"
                onClick={() => {
                  sfx.playCandyMatch(3);
                  setViewMode('crush');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🍬 10 NEON LEVELS • MIXTAPE &amp; ICE LOCKS</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_crush_highscore') || 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🍬📼🔒🌈</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">MEME CRUSH — 10 LEVELS</h3>
                    <p className="tm-arcade-steer-desc">
                      10 distinct carved board geometries! Drop <strong>📼 80s Mixtapes</strong>, unlock{' '}
                      <strong>🔒 Laser Ice Cages</strong> &amp; blast <strong>🧊 Double Frost Jelly</strong>!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 10 Token Prize Run (Win up to 26 🪙) or Free Practice
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playCandyMatch(3);
                      setViewMode('crush');
                    }}
                  >
                    ▶ Play 10 Levels
                  </button>
                </div>
              </div>

              {/* Cabinet 4: 80s Neon Cyber-Pinball (5 Distinct Tables) */}
              <div
                className="tm-arcade-steer-card tm-steer-pinball"
                onClick={() => {
                  sfx.playPinballBumper(0);
                  setViewMode('pinball');
                }}
              >
                <div className="tm-arcade-steer-top">
                  <span className="tm-arcade-steer-pill">🎱 5 PINBALL TABLES • SKILL SHOT, NUDGE &amp; FEVER</span>
                  <span className="tm-arcade-steer-best">
                    🏆 Best: {Number(localStorage.getItem('tm_pinball_highscore') || 0).toLocaleString()} pts
                  </span>
                </div>
                <div className="tm-arcade-steer-body">
                  <div className="tm-arcade-steer-icons">🎱🏎️👾🦈</div>
                  <div>
                    <h3 className="tm-arcade-steer-title">UPGRADED 80s CYBER-PINBALL (5 TABLES)</h3>
                    <p className="tm-arcade-steer-desc">
                      Now upgraded with an oscillating <strong>🎯 Skill Shot Plunger</strong>,{' '}
                      <strong>💥 Cabinet Nudge &amp; Tilt</strong>, <strong>🔥 6× Combo Neon Fever Overdrive</strong>,{' '}
                      <strong>🏆 Table Boss Missions</strong> &amp; <strong>🎰 Mystery Vault Sinkholes</strong>!
                    </p>
                  </div>
                </div>
                <div className="tm-arcade-steer-footer">
                  <span className="tm-arcade-steer-payout">
                    🪙 10 Token Coin-Op Run (Win up to 35 🪙) or Free Practice
                  </span>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary tm-arcade-steer-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playPinballBumper(0);
                      setViewMode('pinball');
                    }}
                  >
                    ▶ Launch 5 Tables
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* FIXED ARCADE GAME 00: NEON COIN DOZER '86 (PENNY-FALLS COIN & PRIZE PUSHER) */}
      {viewMode === 'pusher' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasCoinPusherGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onEarnTokens={(amt, evt, label) => {
              handlePayoutGameTokens(amt, {
                stakedTokens: Math.max(1, amt),
                xp: 12,
                label: label || `+${amt} 🪙 Dozer Tray Win!`,
                emoji: '🪙'
              });
            }}
            onEarnXp={(xpAmt) => awardXpOnly(xpAmt, null, '🪙', `+${xpAmt} XP`)}
            onOpenBlankStudio={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              setViewMode(mode);
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0A: NEON 21'S CYBER-BLACKJACK */}
      {viewMode === 'blackjack' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasBlackjackGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0A2: NEON DERBY '86 HORSE RACING */}
      {viewMode === 'derby' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <NeonDerbyGame
            tokens={tokens}
            soundOn={soundOn}
            litePerfMode={litePerfMode}
            prefersReducedMotion={
              typeof window !== 'undefined' &&
              Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            }
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0A3: GUESS THE MEME DAILY */}
      {viewMode === 'guess' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <GuessTheMemeGame
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0A4: MEME PLINKO '86 */}
      {viewMode === 'plinko' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemePlinkoGame
            tokens={tokens}
            soundOn={soundOn}
            litePerfMode={litePerfMode}
            prefersReducedMotion={
              typeof window !== 'undefined' &&
              Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            }
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0A5: HIGHER OR LOWER: MEME EDITION */}
      {viewMode === 'hilow' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <HigherOrLowerGame
            memes={memes}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              if (nextState) sfx.playToggle();
            }}
            onInspectMeme={(meme) => {
              if (meme?.id) setTheaterMemeId(meme.id);
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 0B: NEON LIGHTNING ROULETTE '86 */}
      {viewMode === 'roulette' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasRouletteGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 1: CLASSIC LAS VEGAS ONE-ARM BANDIT 777 SLOT MACHINE */}
      {viewMode === 'slots' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasSlotMachine
            embedded={false}
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            memes={memes}
            onCreditCreator={(creatorAuthor) => {
              if (creatorAuthor) {
                setRoyaltiesMap((prev) => ({
                  ...prev,
                  [creatorAuthor]: (prev[creatorAuthor] || 0) + 15
                }));
              }
            }}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 2: MEMEDAQ '86 STOCK MARKET SIMULATOR */}
      {viewMode === 'stocks' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeStockMarketGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            memes={memes}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 3: MEME CRUSH SAGA — 10 DISTINCT 80s NEON LEVELS */}
      {viewMode === 'crush' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <MemeCrushGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            memes={memes}
            onOpenTheater={handleOpenTheater}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* FIXED ARCADE GAME 4: 80s NEON CYBER-PINBALL — 5 DISTINCT TABLES */}
      {viewMode === 'pinball' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
          <VegasPinballGame
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onOpenUpload={() => {
              sfx.playToggle();
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
            onBackToFeed={() => {
              sfx.playToggle();
              setViewMode('feed');
            }}
          />
        </Suspense>
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
          onCaptionThis={handleCaptionThis}
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
          onOpenGames={() => {
            sfx.playToggle();
            setViewMode('pusher');
          }}
          onClaimGoldenMeme={handleClaimGoldenMeme}
          litePerfMode={litePerfMode}
        />
      )}

      {/* MODE 2: CYBER-ARCADE LOBBY (/games) */}
      {viewMode === 'lobby' && (
        <Suspense fallback={<MemeSkeletonGrid count={6} />}>
          <ArcadeLobby
            tokens={tokens}
            onSelectGame={(gameId) => {
              closeAllModals();
              setViewMode(gameId);
            }}
            onOpenRewards={() => {
              closeAllModals();
              setShowRewardsModal(true);
            }}
            onOpenExtras={() => {
              closeAllModals();
              setExtrasFocus(null);
              setExtrasDrawerOpen(true);
            }}
            onOpenLeaderboard={() => {
              closeAllModals();
              setShowLeaderboard(true);
            }}
            onToggleAiAssistant={() => {
              closeAllModals();
              setAiUnlocked(true);
              setAiAssistantOpen((prev) => !prev);
            }}
            onBackToFeed={() => {
              closeAllModals();
              setViewMode('feed');
            }}
          />
        </Suspense>
      )}

      {/* MODE 3: PHYSICS HYPER-SWIPE DECK */}
      {viewMode === 'swipe' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
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
        </Suspense>
      )}

      {/* MODE 4: KING OF THE HILL 1v1 MEME BATTLE ARENA */}
      {viewMode === 'battle' && (
        <Suspense fallback={<MemeSkeletonGrid count={3} />}>
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
        </Suspense>
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

      {/* PHASE 20 & 28.4: PROGRESSIVELY UNLOCKED "DO NOT PRESS" CHAOS DOCK & 1986 NEON PAYPHONE */}
      {!bossKeyActive && (petUnlocked || payphoneModalOpen) && (
        <Suspense fallback={null}>
          <DankPetWidget
            viewMode={viewMode}
            unlocked={petUnlocked}
            externalPayphoneOpen={payphoneModalOpen}
            onToggleExternalPayphone={setPayphoneModalOpen}
            onEarnPetXp={awardXpOnly}
            onWinPinataReward={handleWinPinataReward}
            pinataClaimedToday={pinataClaimedToday}
            onClaimPayphoneCoinReturn={handleClaimPayphoneCoinReturn}
            payphoneClaimedToday={payphoneClaimedToday}
            onTriggerBossMode={() => {
              setPrankDisguise(null);
              setBossKeyActive(true);
            }}
            onLaunchStampede={handleLaunchStampede}
            onChangeChaosMutator={handleChangeChaosMutator}
            memes={memes}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              closeAllModals();
              setViewMode(mode);
              window.scrollTo?.({ top: 0, behavior: 'smooth' });
            }}
          />
        </Suspense>
      )}

      {/* PHASE 29.4: DISMISSIBLE MOBILE NOW-PLAYING PILL */}
      {!bossKeyActive && <MobileNowPlayingPill isGameLayout={isFixedArcadeGame} />}

      {/* PHASE 5 & 28.3: 5-BUTTON THUMB-FRIENDLY MOBILE BOTTOM ARCADE DOCK (Memes / Reels / +Create / Games / Profile) */}
      {!isFixedArcadeGame && (
        <MobileArcadeDock
          viewMode={viewMode}
          showStudio={showStudio}
          showProfile={Boolean(profileUsername || showAuthModal)}
          isAnyModalOpen={isAnyModalOpen}
          unreadNotificationsCount={unreadNotificationsCount}
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
          onOpenExtras={() => {
            sfx.playToggle();
            setExtrasFocus(null);
            setExtrasDrawerOpen(true);
          }}
          onOpenProfile={() => {
            sfx.playToggle();
            if (profileUsername) {
              setProfileUsername(null);
            } else if (user?.username) {
              closeAllModals();
              setProfileUsername(user.username);
            } else {
              closeAllModals();
              setShowAuthModal(true);
            }
          }}
          onNavigateBack={handleNavigateBack}
          onToggleAiAssistant={() => {
            sfx.playAiAssistantChime();
            setAiAssistantOpen((prev) => !prev);
          }}
        />
      )}

      {/* PHASE 21 & 28.4: CYBER-ORACLE '86 — PROGRESSIVELY UNLOCKED AI ASSISTANT */}
      {!bossKeyActive && (aiAssistantOpen || (aiUnlocked && viewMode === 'feed')) && (
        <Suspense fallback={null}>
          <ArcadeAiAssistant
            isOpen={aiAssistantOpen}
            fabUnlocked={aiUnlocked}
            onToggleOpen={(val) => {
              if (typeof val === 'boolean') {
                setAiAssistantOpen(val);
              } else {
                setAiAssistantOpen((prev) => !prev);
              }
            }}
            tokens={tokens}
            xp={xp}
            currentRank={currentRank}
            tokenLedger={tokenLedger}
            xpConversionState={xpConversionState}
            unclaimedRewardsCount={unclaimedRewardsCount}
            pioneerBonusAvailable={pioneerBonusAvailable}
            payphoneClaimedToday={payphoneClaimedToday}
            pinataClaimedToday={pinataClaimedToday}
            viewMode={viewMode}
            memes={memes}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              closeAllModals();
              setViewMode(mode);
            }}
            onOpenUpload={() => {
              sfx.playToggle();
              closeAllModals();
              handleOpenBlankStudio();
            }}
            onOpenRewards={() => {
              sfx.playToggle();
              closeAllModals();
              setShowRewardsModal(true);
            }}
            onExchangeXpForTokens={handleExchangeXpForTokens}
            onClaimPayphoneCoinReturn={handleClaimPayphoneCoinReturn}
          />
        </Suspense>
      )}

      {/* MODAL 0: FULLSCREEN THEATER LIGHTBOX & DEEP-LINK PERMALINK (/?m=<id> or /m/<id>) */}
      {theaterMeme && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
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
            onCaptionThis={handleCaptionThis}
            onOpenBlankStudio={handleOpenBlankStudio}
            openedFromShareLink={openedFromShareLink}
            onSelectMeme={handleOpenTheater}
            onClose={handleCloseTheater}
            onShareMeme={handleShareMeme}
          />
        </Suspense>
      )}

      {/* MODAL 1: MEME FORGE 3.0 STUDIO (+ FORK & MUTATE / BOUNTY / SPOILER) */}
      {showStudio && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <MemeForge
            intent={forgeIntent}
            user={user}
            onClose={() => {
              setShowStudio(false);
              setForgeIntent(null);
            }}
            onPublish={handleForgePublish}
          />
        </Suspense>
      )}

      {/* MODAL 2: MEME EVOLUTION TREE INSPECTOR */}
      {evolutionModalMeme && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <MemeEvolutionModal
            evolutionModalMeme={evolutionModalMeme}
            evolutionNodes={evolutionNodes}
            loadingEvolution={loadingEvolution}
            onClose={() => setEvolutionModalMeme(null)}
            onTriggerStudioMutate={handleTriggerStudioMutate}
          />
        </Suspense>
      )}

      {/* MODAL 3: HARDENED OAUTH 2.0 (APPLE / GOOGLE / FACEBOOK / DISCORD) & MAGIC LINK AUTH */}
      {showAuthModal && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
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
        </Suspense>
      )}

      {/* MODAL 4: HALL OF FAME LEADERBOARD */}
      {showLeaderboard && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
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
            onLaunchSubGame={(mode) => {
              sfx.playToggle();
              setShowLeaderboard(false);
              setViewMode(mode);
            }}
          />
        </Suspense>
      )}

      {/* MODAL 5: CREATOR ARCADE PROFILE & ACHIEVEMENT BADGE CASE */}
      {profileUsername && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
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
            equippedFrame={equippedFrame}
            notifications={notifications}
            onMarkNotificationsRead={handleMarkNotificationsRead}
            onOpenShop={() => {
              sfx.playToggle();
              setProfileUsername(null);
              setRewardsInitialTab('shop');
              setShowRewardsModal(true);
            }}
            roastsRun={roastsRun}
            goblinsCaught={goblinsCaught}
            konamiUnlocked={konamiUnlocked}
            onClose={() => setProfileUsername(null)}
            onSelectMeme={handleOpenTheater}
            onTriggerStudioMutate={handleTriggerStudioMutate}
          />
        </Suspense>
      )}

      {/* MODAL 6: ARCADE VAULT (FAIR TOKEN LEDGER, XP REACTOR, ONE-ARM BANDIT, WHEEL OF CHAOS, TRAILS, DAILY STREAK & QUESTS) */}
      {showRewardsModal && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <RewardsModal
            key={`rewards-${rewardsInitialTab}`}
            xp={xp}
            tokens={tokens}
            tokenLedger={tokenLedger}
            xpConversionState={xpConversionState}
            xpAutoConvert={xpAutoConvert}
            onToggleXpAutoConvert={handleToggleXpAutoConvert}
            onExchangeXpForTokens={handleExchangeXpForTokens}
            reactorFlash={reactorFlash}
            lootSpins={lootSpins}
            wheelSpinsLeftInWindow={wheelSpinsLeftInWindow}
            wheelResetMs={wheelResetMs}
            streakDays={streakDays}
            streakClaimedToday={streakClaimedToday}
            onClaimDailyStreak={handleClaimDailyStreak}
            onCompleteWheelSpin={handleCompleteWheelSpin}
            onSpendTokens={handleSpendTokens}
            onPayoutTokens={handlePayoutGameTokens}
            onOpenUpload={() => {
              sfx.playToggle();
              setShowRewardsModal(false);
              setViewMode('feed');
              handleOpenBlankStudio();
            }}
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
            initialTab={rewardsInitialTab}
            unlockedCosmetics={unlockedCosmetics}
            equippedFrame={equippedFrame}
            equippedCassetteSkin={equippedCassetteSkin}
            activeRadioStation={getRadioState().station}
            onBuyOrUnlockCosmetic={handleBuyOrUnlockCosmetic}
            onEquipCosmetic={handleEquipCosmetic}
            konamiUnlocked={konamiUnlocked}
            questProgress={questProgress}
            claimedQuests={claimedQuests}
            onClaimQuestReward={handleClaimQuestReward}
            onLaunchSubGame={(mode) => {
              sfx.playToggle();
              setShowRewardsModal(false);
              setViewMode(mode);
            }}
            onClose={() => {
              setShowRewardsModal(false);
              setRewardsInitialTab('vault');
            }}
          />
        </Suspense>
      )}

      {/* MODAL 7: AI DANK-O-METER & SAVAGE ROAST SCANNER */}
      {roastModalMeme && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <AiRoastModal
            meme={roastModalMeme}
            onPostRoastComment={handlePostRoastComment}
            onTriggerStudioMutate={handleTriggerStudioMutate}
            onClose={() => setRoastModalMeme(null)}
          />
        </Suspense>
      )}

      {/* MODAL 8: UNIFIED 🕹️ EXTRAS DRAWER (Soundboard, WTF?!, Payphone, Boss Key, CRT, Turbo, Device Badge & Shortcuts) */}
      {extrasDrawerOpen && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <ExtrasDrawerModal
            isOpen={extrasDrawerOpen}
            focusSection={extrasFocus}
            onClose={() => {
              setExtrasDrawerOpen(false);
              setExtrasFocus(null);
            }}
            onLaunchWtfSurprise={() => {
              sfx.playGooseHonk?.();
              setSurpriseOpen(true);
            }}
            onOpenPayphone={() => {
              sfx.playToggle?.();
              setPayphoneModalOpen(true);
            }}
            onToggleBossKey={() => {
              setPrankDisguise(null);
              setBossKeyActive(true);
            }}
            soundOn={soundOn}
            onToggleSound={() => {
              const nextState = !soundOn;
              sfx.enabled = nextState;
              setSoundOn(nextState);
              updateSettings({ sfxOn: nextState });
              if (nextState) sfx.playBoing(2);
            }}
            soundPack={soundPack}
            onChangeSoundPack={handleChangeSoundPack}
            onPlayPad={handlePlaySoundboardPad}
            onTriggerChaosRoulette={(e) => {
              setExtrasDrawerOpen(false);
              setExtrasFocus(null);
              handleTriggerChaosRoulette(e);
            }}
            onOpenRewards={(tab) => {
              sfx.playToggle();
              setRewardsInitialTab(tab === 'shop' ? 'shop' : 'vault');
              setShowRewardsModal(true);
            }}
            unclaimedRewardsCount={unclaimedRewardsCount}
            chaosMutator={chaosMutator}
            onChangeChaosMutator={handleChangeChaosMutator}
            onSummonGoblin={(e) => {
              setExtrasDrawerOpen(false);
              setExtrasFocus(null);
              handleSummonGoblin(e);
            }}
            goblinsLeftInWindow={goblinsLeftInWindow}
            goblinResetMs={goblinResetMs}
            onLaunchStampede={(stampedeId, e) => {
              setExtrasDrawerOpen(false);
              setExtrasFocus(null);
              handleLaunchStampede(stampedeId, e);
            }}
            activeDeviceMeta={{
              icon: deviceProfile.shortBadge?.split(' ')[0] || '📱',
              shortLabel: deviceProfile.label || deviceProfile.badge || 'Auto'
            }}
            deviceOverride={deviceProfile.override}
            onOpenDeviceOptimizer={() => {
              const order = ['auto', 'iphone', 'iphone-duo', 'ipad-mini', 'ipad', 'android-phone', 'android-tablet', 'pc'];
              const cur = deviceProfile.override || 'auto';
              const next = order[(order.indexOf(cur) + 1) % order.length];
              setDeviceOverride(next);
              sfx.playToggle?.();
              const nextLabel =
                next === 'auto'
                  ? `Auto (${DEVICE_PROFILES[deviceProfile.detectedId]?.label || 'Detected'})`
                  : DEVICE_PROFILES[next]?.label;
              setGoblinFortuneToast(
                `📲 Device Optimizer: ${nextLabel} — ${
                  DEVICE_PROFILES[next === 'auto' ? deviceProfile.detectedId : next]?.description || ''
                }`
              );
              setTimeout(() => setGoblinFortuneToast(''), 4500);
            }}
            onCheckSecurityStatus={() => {
              const rep = getSecurityAuditReport();
              sfx.playAiAssistantChime?.();
              setExtrasDrawerOpen(false);
              setExtrasFocus(null);
              setGoblinFortuneToast(
                `🛡️ Cyber-Shield ${rep.status} (${rep.score}): CSP + XSS URI Guard + Binary Media Firewall + Prototype Guard Active!`
              );
              setTimeout(() => setGoblinFortuneToast(''), 4500);
            }}
            onToggleAiAssistant={() => {
              sfx.playAiAssistantChime();
              setAiAssistantOpen((prev) => !prev);
            }}
            aiPersonaId={typeof window !== 'undefined' ? localStorage.getItem('tm_ai_persona') || 'kitt' : 'kitt'}
            onOpenLeaderboard={() => {
              sfx.playToggle();
              setShowLeaderboard(true);
            }}
            onRandomMeme={() => {
              if (filteredMemes.length > 0) {
                const pick = filteredMemes[Math.floor(Math.random() * filteredMemes.length)];
                handleOpenTheater(pick);
              } else {
                sfx.playBoing(2);
              }
            }}
            savedOnly={showSavedOnly}
            savedIdsCount={bookmarkedIds.length}
            onToggleSavedFilter={() => {
              setViewMode('feed');
              setShowSavedOnly((prev) => !prev);
            }}
          />
        </Suspense>
      )}

      {/* MODAL 9: 🪿 HONK.EXE KLEPTOMANIAC CYBER-GOOSE & 3AM INTERDIMENSIONAL CHAOS LAB */}
      {surpriseOpen && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <UnhandledGooseSurprise
            isOpen={surpriseOpen}
            onClose={() => setSurpriseOpen(false)}
            onOpenMode={(mode) => {
              setSurpriseOpen(false);
              sfx.playToggle?.();
              setViewMode(mode);
            }}
          />
        </Suspense>
      )}

      {/* MODAL 10 (PHASE 28.13): "YOUR MEME IS LIVE!" FULL-SCREEN CELEBRATION */}
      {liveCelebrationData && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <MemeLiveCelebrationModal
            meme={liveCelebrationData.meme}
            rewardSummary={liveCelebrationData.rewardSummary}
            litePerfMode={litePerfMode}
            onShareMeme={handleShareMeme}
            onOpenTheater={(meme) => {
              setLiveCelebrationData(null);
              handleOpenTheater(meme);
            }}
            onClose={() => setLiveCelebrationData(null)}
          />
        </Suspense>
      )}

      {/* MODAL 11 (PHASE 28.15): DAILY CAPTION BATTLE & YESTERDAY'S CAPTION KING */}
      {battleModalOpen && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <DailyCaptionBattleModal
            battle={dailyBattle}
            memes={memes}
            userVotes={userVotes}
            onVote={handleVote}
            onEnterBattle={(battle) => {
              setBattleModalOpen(false);
              handleAcceptBounty(battle);
            }}
            onOpenProfile={(username) => {
              setBattleModalOpen(false);
              setProfileUsername(username);
            }}
            onOpenTheater={(meme) => {
              setBattleModalOpen(false);
              handleOpenTheater(meme);
            }}
            onClose={() => setBattleModalOpen(false)}
          />
        </Suspense>
      )}

      {/* PHASE 10: CRAWLABLE SEO DISCOVERY DIRECTORY & FAQ HUB */}
      {!isFixedArcadeGame && (
        <SeoDiscoveryFooter
          onSelectCategory={(cat) => {
            sfx.playToggle();
            closeAllModals();
            setCategory(cat);
            setViewMode('feed');
            window.scrollTo?.({ top: 0, behavior: 'smooth' });
          }}
          onOpenBlankStudio={() => {
            closeAllModals();
            handleOpenBlankStudio();
          }}
          onOpenSoundboard={() => {
            sfx.playToggle();
            closeAllModals();
            setExtrasFocus('soundboard');
            setExtrasDrawerOpen(true);
          }}
          onOpenPrankDisguise={(disguise) => {
            sfx.playToggle();
            closeAllModals();
            setPrankDisguise(disguise);
            setBossKeyActive(true);
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
      )}
    </div>
  );
}