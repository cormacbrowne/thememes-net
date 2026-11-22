import { Flame, Zap, Trophy, X, SlidersHorizontal } from 'lucide-react';
import GameFullscreenToggle from './components/GameFullscreenToggle';
import { ARCADE_GAMES_CATALOG } from './data/arcadeGamesCatalog';
import { useMemeCategories, HOMEPAGE_FEATURED_CATEGORY_IDS, HOMEPAGE_FEATURED_LABELS } from './data/memeCategories';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { sfx } from './utils/soundEngine';
import lazyWithRetry from './utils/lazyWithRetry';
import {
  STUDIO_TEMPLATES,
  VIRAL_CAPTIONS,
  CURSOR_TRAILS,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from './data/starterMemes';
import { ARCADE_ECONOMY_RULES, formatMoney } from './utils/tokenEconomy';
import { useTokenEconomy } from './hooks/useTokenEconomy';
import { useAuth } from './hooks/useAuth';
import { useFeed } from './hooks/useFeed';
import { PRANK_DISGUISE_TO_PATH } from './data/seoRoutes';
import { fetchActiveCaptionKings, isActiveCaptionKing } from './utils/dailyCaptionBattle';
import { useViewMode, useViewModeEffects } from './hooks/useViewMode';
import NavbarHud from './components/NavbarHud';
import QuickUploadBar from './components/QuickUploadBar';
import MemeCard from './components/MemeCard';
import VirtualizedMemeGrid from './components/VirtualizedMemeGrid';
import { useDeviceProfile, DEVICE_PROFILES } from './utils/deviceProfile';
import {
  getSettings,
  applySettingsToRuntime,
  subscribeSettings,
  updateSettings
} from './utils/settingsStore';
import { getSecurityAuditReport } from './utils/securityGuard';
import { ACCEPT_MEDIA } from './utils/mediaPipeline';
import ParticleOverlay from './components/ParticleOverlay';
import JuiceLayer from './components/ui/JuiceLayer';
import ArcadeErrorBoundary from './components/ArcadeErrorBoundary';
import { DELOREAN_ERAS, EIGHTIES_CARS } from './data/deloreanEras';
import HomeDailyHub from './components/HomeDailyHub';
import SeasonalOverlay from './components/SeasonalOverlay';
import { getActiveSeasonalSkin } from './config/seasonal';
import HomeFunExtras from './components/HomeFunExtras';
import LazyCompanionRow from './components/LazyCompanionRow';
import MemeSkeletonGrid from './components/MemeSkeletonGrid';
import MobileArcadeDock from './components/MobileArcadeDock';
import { MobileNowPlayingPill } from './components/MemesRadio';
import {
  setRadioContextStation,
  setRadioMuted,
  getRadioState,
  subscribeRadio,
  armRadioResumeOnGesture,
  toggleRadio,
  skipRadioTrack,
  cycleRadioStation
} from './utils/radioBus';
import { useLivePresence } from './hooks/useLivePresence';

const InsertCoinIntro = lazyWithRetry(() => import('./components/InsertCoinIntro'));
const GameRouter = lazyWithRetry(() => import('./components/GameRouter'));
const FixedArcadeTopBar = lazyWithRetry(
  () => import('./components/GameRouter'),
  (m) => ({ default: m.FixedArcadeTopBar })
);
const MemeForge = lazyWithRetry(() => import('./components/forge/MemeForge'));
const MemeEvolutionModal = lazyWithRetry(() => import('./components/MemeEvolutionModal'));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal'));
const MemeTheaterModal = lazyWithRetry(() => import('./components/MemeTheaterModal'));
const ShareMemeSheet = lazyWithRetry(() => import('./components/ShareMemeSheet'));
const PRANK_SCREEN_IDS = new Set(['zoom', 'excel', 'bsod', 'update', 'terminal', 'ai', 'crackphone', 'crackpad']);
const FULLSCREEN_GAME_IDS = new Set(
  ARCADE_GAMES_CATALOG.map((g) => g.id).filter((id) => !PRANK_SCREEN_IDS.has(id))
);
const LeaderboardModal = lazyWithRetry(() => import('./components/LeaderboardModal'));
const PlayerProfileModal = lazyWithRetry(() => import('./components/PlayerProfileModal'));
const CreatorProfilePage = lazyWithRetry(() => import('./components/CreatorProfilePage'));
const TemplateLibraryPage = lazyWithRetry(() => import('./components/TemplateLibraryPage'));
const PrankScreensPage = lazyWithRetry(() => import('./components/PrankScreensPage'));
const ExtrasDrawerModal = lazyWithRetry(() => import('./components/ExtrasDrawerModal'));
const RewardsModal = lazyWithRetry(() => import('./components/RewardsModal'));
const AiRoastModal = lazyWithRetry(() => import('./components/AiRoastModal'));
const ReportSheet = lazyWithRetry(() => import('./components/ReportSheet'));
const BossKeyOverlay = lazyWithRetry(() => import('./components/BossKeyOverlay'));
const DankPetWidget = lazyWithRetry(() => import('./components/DankPetWidget'));
const UnhandledGooseSurprise = lazyWithRetry(() => import('./components/UnhandledGooseSurprise'));
const MemeLiveCelebrationModal = lazyWithRetry(() => import('./components/MemeLiveCelebrationModal'));
const DailyCaptionBattleModal = lazyWithRetry(() => import('./components/DailyCaptionBattleModal'));
const FullscreenMusicEqualizer = lazyWithRetry(
  () => import('./components/MusicEqualizer'),
  (m) => ({ default: m.FullscreenMusicEqualizer })
);
const IphoneAppModal = lazyWithRetry(() => import('./components/IphoneAppModal'));
// Plan 1.3: not needed for the first screen, so kept out of the main bundle.
const WinCelebrationOverlay = lazyWithRetry(() => import('./components/WinCelebrationOverlay'));
const DeLoreanTimeWarpStage = lazyWithRetry(
  () => import('./components/DeLoreanTimeMachine'),
  (m) => ({ default: m.DeLoreanTimeWarpStage })
);
const DeLoreanDockBanner = lazyWithRetry(
  () => import('./components/DeLoreanTimeMachine'),
  (m) => ({ default: m.DeLoreanDockBanner })
);
const SeoDiscoveryFooter = lazyWithRetry(() => import('./components/SeoDiscoveryFooter'));

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopTopicsOpen, setDesktopTopicsOpen] = useState(false);
  const [isWideDesktop, setIsWideDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(min-width: 1181px)').matches
      : true
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 1181px)');
    const onChange = (e) => setIsWideDesktop(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const {
    category,
    setCategory,
    viewMode,
    setViewMode,
    creatorHandle,
    setCreatorHandle,
    openCreatorProfile,
    templateSlug,
    openTemplatePage,
    searchQuery,
    setSearchQuery,
    showSavedOnly,
    setShowSavedOnly,
    sortBy,
    setSortBy,
    topWindow,
    setTopWindow,
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
    battleId,
    battleEntryId,
    battleModalOpen,
    setBattleModalOpen,
    handleCloseBattle,
    liveCelebrationData,
    setLiveCelebrationData,
    roastModalMeme,
    setRoastModalMeme,
    evolutionModalMeme,
    setEvolutionModalMeme,
    payphoneModalOpen,
    setPayphoneModalOpen,
    showIntro,
    setShowIntro,
    showInstallModal,
    setShowInstallModal,
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
  const [leaderboardTarget, setLeaderboardTarget] = useState(null);

  const handleOpenCabinetLeaderboard = (gameId) => {
    closeAllModals();
    setLeaderboardTarget({ tab: 'subgames', game: gameId || 'pinball' });
    setShowLeaderboard(true);
  };

  // Phase 8, 9 & 28.16: AI Roast Run Counter & Toy Widgets
  const [stampedeSprites, setStampedeSprites] = useState([]);
  const [bubbleWrapItems, setBubbleWrapItems] = useState([]);
  const bubbleComboRef = useRef(0);
  const [roastsRun] = useState(() =>
    Number(localStorage.getItem('tm_roasts_run') || 0)
  );
  const [chaosMutator, setChaosMutator] = useState('none');
  const [activeGoblin, setActiveGoblin] = useState(null);
  const [goblinsCaught, setGoblinsCaught] = useState(() =>
    Number(localStorage.getItem('tm_goblins') || 0)
  );
  const [deloreanEra, setDeloreanEra] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('tm_delorean_era_v1') || 'present' : 'present'
  );
  const [activeCarId, setActiveCarId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('tm_80s_car_v1') || 'delorean' : 'delorean'
  );
  const [deloreanModalOpen, setDeloreanModalOpen] = useState(false);
  const [deloreanFlyby, setDeloreanFlyby] = useState(null);
  const [activeCaptionKings, setActiveCaptionKings] = useState([]);
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
    memeCentz,
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
    streakFreezeAvailable,
    streakClaimedToday,
    unlockedFlairs,
    equippedFlair,
    setEquippedFlair,
    questProgress,
    claimedQuests,
    konamiUnlocked,
    pioneerBonusAvailable,
    pinataClaimedToday,
    payphoneClaimedToday,
    fluxBonusClaimedToday,
    xpConversionState,
    unclaimedRewardsCount,
    incrementQuest,
    awardXpOnly,
    awardXpAndCombo,
    handleSpendTokens,
    handleEquipCosmetic,
    handleBuyOrUnlockCosmetic,
    handleClaimGoldenMeme,
    handleEarnMemeCentz,
    handlePayoutGameTokens,
    handleWinPinataReward,
    handleClaimPayphoneCoinReturn,
    handleClaimDeLoreanFluxBonus,
    handleClaimBattlePrize,
    handleBossSecretXp,
    handleExchangeXpForTokens,
    handleToggleXpAutoConvert,
    handleClaimDailyStreak,
    handleCompleteWheelSpin,
    handleClaimQuestReward,
    handleTriggerKonamiGodMode,
    recordWildGoblinReward,
    recordMeaningfulActivity,
    syncProgressionFromProfile
  } = economy;

  const handleSelectEightiesCar = useCallback((carId) => {
    const valid = EIGHTIES_CARS.find((c) => c.id === carId);
    if (!valid) return;
    setActiveCarId(valid.id);
    try {
      localStorage.setItem('tm_80s_car_v1', valid.id);
    } catch {
      // ignore
    }
  }, []);

  const handleTriggerDeLoreanWarp = useCallback(
    (targetEra = '1985', carIdOverride = null) => {
      const eraObj = DELOREAN_ERAS.find((e) => e.id === targetEra) || DELOREAN_ERAS[0];
      const chosenCarId = carIdOverride || activeCarId || 'delorean';
      const carObj = EIGHTIES_CARS.find((c) => c.id === chosenCarId) || EIGHTIES_CARS[0];
      if (carIdOverride && carObj.id !== activeCarId) {
        setActiveCarId(carObj.id);
        try {
          localStorage.setItem('tm_80s_car_v1', carObj.id);
        } catch {
          // ignore
        }
      }
      sfx.playEightiesCarWarp?.(carObj.id);
      setDeloreanEra(eraObj.id);
      try {
        localStorage.setItem('tm_delorean_era_v1', eraObj.id);
      } catch {
        // ignore
      }
      const flyId = `fly-${Date.now()}`;
      setDeloreanFlyby({
        id: flyId,
        eraLabel: `WARPED TO ${eraObj.dateLabel}`,
        carId: carObj.id
      });
      setTimeout(() => {
        setDeloreanFlyby((curr) => (curr && curr.id === flyId ? null : curr));
      }, 1750);

      const awarded = handleClaimDeLoreanFluxBonus?.();
      setGoblinFortuneToast(
        awarded > 0
          ? `🏎️⚡ ${carObj.topSpeedMph} MPH! ${carObj.name} warped to ${eraObj.title} (${formatMoney(awarded, { sign: true })} & +50 XP)!`
          : `🏎️⚡ ${carObj.topSpeedMph} MPH! ${carObj.name} Time Circuits locked on ${eraObj.title}!`
      );
      setTimeout(() => setGoblinFortuneToast(''), 4500);
    },
    [activeCarId, handleClaimDeLoreanFluxBonus, setGoblinFortuneToast]
  );

  const memesRef = useRef([]);
  const auth = useAuth({ setShowAuthModal, awardXpAndCombo });
  const {
    user,
    anonHandle,
    profileStatus,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authUsername,
    setAuthUsername,
    authMessage,
    handleSocialOAuthLogin,
    handleMagicLinkSubmit,
    handleAuthSubmit,
    handleClaimUsername,
    setUserAvatarId,
    handleLogout
  } = auth;
  const authUserId = profileStatus?.id || user?.id || null;
  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => syncProgressionFromProfile(user));
  }, [user, syncProgressionFromProfile]);
  const memeCategories = useMemeCategories();

  // Signed in (e.g. with Google) but no @handle yet: open the profile once per session so the
  // person picks one. Memes show an anonymous-style handle until then, never the real name.
  const needsHandle = Boolean(user?.verified && user?.needsHandle);
  useEffect(() => {
    if (!needsHandle) return;
    // Only nudge from the home page, and at most once every 3 days: phones (iOS home-screen
    // apps especially) start a fresh session on almost every open, so a per-session nudge
    // made the site open on the profile sheet instead of home.
    if (typeof window !== 'undefined' && window.location.pathname !== '/') return;
    try {
      const last = Number(localStorage.getItem('tm_handle_nudged_at') || 0);
      if (Date.now() - last < 3 * 24 * 60 * 60 * 1000) return;
      localStorage.setItem('tm_handle_nudged_at', String(Date.now()));
    } catch {
      return;
    }
    const t = setTimeout(() => setProfileUsername(user.username), 900);
    return () => clearTimeout(t);
  }, [needsHandle, user?.username, setProfileUsername]);

  const { onlineCount, broadcastEmote } = useLivePresence({ username: user?.username });

  const feed = useFeed({
    router,
    economy,
    user,
    authUserId,
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
    filteredMemes,
    visibleMemes,
    visibleCount,
    hasMoreServer,
    isLoadingMoreFeed,
    loadingCommentsMap,
    loadNextFeedPage,
    theaterMeme,
    handleMarkNotificationsRead,
    handleOpenBlankStudio,
    handleTriggerStudioMutate,
    handleCaptionThis,
    handleAcceptBounty,
    handleVote,
    handleReaction,
    handleToggleComments,
    handleCommentInputChange,
    handleAddComment,
    handleDeleteComment,
    handlePostRoastComment,
    currentUserId: feedUserId,
    handleQuickPublishFile,
    handleForgePublish,
    handleReportMeme,
    handleReportComment,
    handleReportBattleEntry,
    handleReportProfile,
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
  } = feed;

  useEffect(() => {
    memesRef.current = memes;
  }, [memes]);

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

  // Automatically close overlapping drawers/modals when Fullscreen Equalizer is opened on mobile/app
  const prevFsEqRef = useRef(Boolean(getRadioState().fullscreenEqOpen));
  useEffect(() => {
    return subscribeRadio(() => {
      const nextOpen = Boolean(getRadioState().fullscreenEqOpen);
      if (nextOpen && !prevFsEqRef.current) {
        setExtrasDrawerOpen(false);
        setExtrasFocus(null);
        setShowRewardsModal(false);
        setShowLeaderboard(false);
        setProfileUsername(null);
        setDeloreanModalOpen(false);
      }
      prevFsEqRef.current = nextOpen;
    });
  }, [setExtrasDrawerOpen, setExtrasFocus, setShowRewardsModal, setShowLeaderboard, setProfileUsername]);

  useEffect(() => {
    let active = true;
    fetchActiveCaptionKings().then((kings) => {
      if (active && Array.isArray(kings)) {
        setActiveCaptionKings(kings);
      }
    });
    return () => {
      active = false;
    };
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
    } else if (['bingo', 'blackjack', 'poker', 'thousand', 'roulette', 'slots', 'eightball'].includes(viewMode)) {
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

  // Phase 30.8: Loot Goblins only spawn when manually summoned from Extras (🎛️), keeping initial meme browsing clutter-free.

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
      deloreanModalOpen ||
      showInstallModal ||
      bossKeyActive
  );

  useViewModeEffects({ router, theaterMeme, isAnyModalOpen });

  const seasonalSkin = getActiveSeasonalSkin({
    search: typeof window !== 'undefined' ? window.location.search : ''
  });

  return (
    <div
      className={`tm-app ${isFixedArcadeGame ? 'tm-app-game-fixed' : ''} ${
        litePerfMode ? 'tm-lite-perf' : ''
      } ${screenShake ? 'tm-shake' : ''} ${
        screenPunch ? 'tm-screen-punch' : ''
      } ${seasonalSkin !== 'off' ? `tm-season-${seasonalSkin}` : ''} tm-mutator-${chaosMutator} tm-era-${deloreanEra} tm-device-${deviceProfile.id}`}
      data-device={deviceProfile.id}
      data-form={deviceProfile.formFactor}
      data-view={viewMode}
      data-season={seasonalSkin}
    >
      <a
        href="#tm-main-content"
        data-testid="skip-to-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-[var(--tm-space-2)] focus:left-[var(--tm-space-2)] focus:z-[var(--tm-z-boss)] focus:px-[var(--tm-space-4)] focus:py-[var(--tm-space-2)] focus:rounded-[var(--tm-radius-btn)] focus:bg-[var(--tm-night-1)] focus:text-[var(--tm-cyan)] focus:border focus:border-[var(--tm-cyan)] focus:shadow-[var(--tm-glow-cyan)] focus:font-bold"
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById('tm-main-content');
          if (target) {
            target.focus({ preventScroll: false });
            target.scrollIntoView?.({ block: 'start' });
          }
        }}
      >
        Skip to content
      </a>
      <SeasonalOverlay skin={seasonalSkin} />
      {/* ACTIVE-BY-DEFAULT SYNTHWAVE PERSPECTIVE GRID & NEON GLOW BACKDROP */}
      <div className="tm-synthwave-bg" aria-hidden="true">
        <div className="tm-synthwave-glow" />
        <div className="tm-synthwave-sun" />
        <div className="tm-synthwave-grid" />
        <div className="tm-film-grain" />
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
          title={`Catch the Wild Golden Loot Goblin (${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.tokens, { sign: true })} max 1x/day & +60 XP)!`}
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
          <h2 style={{ margin: 0, fontSize: '26px', color: 'var(--tm-cyan)' }}>
            DROP IMAGE TO UPLOAD OR LAUNCH MEME FORGE
          </h2>
          <p style={{ margin: 0, color: 'var(--tm-pink)', fontWeight: 800 }}>
            Instant Canvas Load ({pioneerBonusAvailable ? `${formatMoney(20, { sign: true })} First Upload Bonus` : `${formatMoney(12, { sign: true })} MemeDollarz`} &amp; +120 XP)
          </p>
        </div>
      )}

      {/* ISOLATED FLOATING PHYSICS PARTICLES OVERLAY (ZERO ROOT RE-RENDERS) */}
      <ParticleOverlay ref={particleOverlayRef} litePerfMode={litePerfMode} />
      <JuiceLayer />

      {/* GLOBAL VARIED WIN CELEBRATION OVERLAY */}
      <Suspense fallback={null}>
      <WinCelebrationOverlay
        litePerfMode={litePerfMode}
        compactPlayfieldMode={viewMode === 'pinball'}
      />

      {/* DELOREAN DMC-12 88 MPH FLYBY & TIME CIRCUITS CONSOLE */}
      <DeLoreanTimeWarpStage
        flybyEvent={deloreanFlyby}
        activeEra={deloreanEra}
        activeCarId={activeCarId}
        onSelectCar={handleSelectEightiesCar}
        modalOpen={deloreanModalOpen}
        onCloseModal={() => setDeloreanModalOpen(false)}
        onTriggerWarp={handleTriggerDeLoreanWarp}
        bonusClaimedToday={fluxBonusClaimedToday}
      />
      </Suspense>

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
        <Suspense fallback={null}>
          <FixedArcadeTopBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            tokens={tokens}
            memeCentz={memeCentz}
            setShowRewardsModal={setShowRewardsModal}
            setExtrasFocus={setExtrasFocus}
            setExtrasDrawerOpen={setExtrasDrawerOpen}
            onOpenCabinetLeaderboard={handleOpenCabinetLeaderboard}
          />
        </Suspense>
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
            streakDays={streakDays}
            streakFreezeAvailable={streakFreezeAvailable}
            tokens={tokens}
            memeCentz={memeCentz}
            xpConversionState={xpConversionState}
            reactorFlash={reactorFlash}
            onExchangeXpForTokens={handleExchangeXpForTokens}
            onOpenInstallModal={() => {
              sfx.playToggle?.();
              closeAllModals();
              setShowInstallModal(true);
            }}
            viewMode={viewMode}
            onSelectViewMode={(mode) => {
              sfx.playToggle();
              closeAllModals();
              if (mode === 'templates') openTemplatePage(null);
              else setViewMode(mode);
              window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
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
            anonHandle={anonHandle}
            onLogout={() => {
              handleLogout();
              setNotifications([]);
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
        </>
      )}

      <div id="tm-main-content" tabIndex={-1} style={{ outline: 'none', flexShrink: 0 }} />

      {/* MODE 1: REDESIGNED HOMEPAGE (Battle & Daily Hub + Trending Feed + Fun Extras) */}
      {viewMode === 'feed' && (
        <div className="tm-home-layout" data-testid="home-layout">
          <div className="tm-home-daily">
            <HomeDailyHub
              onAcceptBounty={(bounty) => {
                closeAllModals();
                handleAcceptBounty(bounty);
              }}
              onClaimBountyPrize={handleClaimBattlePrize}
              onOpenBattle={(tab) => {
                sfx.playToggle?.();
                closeAllModals();
                setBattleModalOpen(tab || 'enter');
              }}
              onOpenGuess={() => {
                sfx.playToggle?.();
                closeAllModals();
                setViewMode('guess');
                window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
              }}
            />
          </div>

          <div className="tm-home-feed">
            {isWideDesktop && <LazyCompanionRow collapsible />}

            {/* STREAMLINED FEED FILTER BAR */}
            <section
              id="tm-memes-feed-start"
              className={`tm-controls ${mobileFiltersOpen ? 'is-filters-open' : ''} ${desktopTopicsOpen ? 'is-desktop-topics-open' : ''}`.trim()}
            >
              <div className="tm-tabs">
                <button
                  type="button"
                  data-testid="feed-tab-hot"
                  className={`tm-tab ${sortBy === 'hot' && !showSavedOnly ? 'active' : ''}`}
                  onClick={() => {
                    setShowSavedOnly(false);
                    setSortBy('hot');
                  }}
                >
                  <Flame size={15} aria-hidden="true" /> Hot
                </button>
                <button
                  type="button"
                  data-testid="feed-tab-new"
                  className={`tm-tab ${(sortBy === 'latest' || sortBy === 'new') && !showSavedOnly ? 'active' : ''}`}
                  onClick={() => {
                    setShowSavedOnly(false);
                    setSortBy('latest');
                  }}
                >
                  <Zap size={15} aria-hidden="true" /> New
                </button>
                <button
                  type="button"
                  data-testid="feed-tab-top"
                  className={`tm-tab ${sortBy === 'top' && !showSavedOnly ? 'active' : ''}`}
                  onClick={() => {
                    setShowSavedOnly(false);
                    setSortBy('top');
                  }}
                >
                  <Trophy size={15} aria-hidden="true" /> Top
                </button>
                <button
                  type="button"
                  className={`tm-tab tm-show-mobile-only ${mobileFiltersOpen ? 'active' : ''}`}
                  aria-expanded={mobileFiltersOpen}
                  onClick={() => setMobileFiltersOpen((prev) => !prev)}
                >
                  {mobileFiltersOpen ? <X size={15} aria-hidden="true" /> : <SlidersHorizontal size={15} aria-hidden="true" />}
                  {mobileFiltersOpen ? 'Close' : 'More'}
                </button>
                {sortBy === 'top' && !showSavedOnly && (
                  <div className="tm-top-window-pills tm-mobile-filter-item" role="group" aria-label="Top time window" style={{ display: 'inline-flex', gap: '4px' }}>
                    {[
                      { id: 'day', label: '24h' },
                      { id: 'week', label: '7d' },
                      { id: 'all', label: 'All-Time' }
                    ].map((win) => (
                      <button
                        key={win.id}
                        type="button"
                        data-testid={`top-window-${win.id}`}
                        className={`tm-tab ${topWindow === win.id ? 'active' : ''}`}
                        onClick={() => setTopWindow(win.id)}
                      >
                        {win.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="tm-controls-right tm-mobile-filter-item">
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
                          color: 'var(--tm-text-dim)',
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

                <div className="tm-featured-chips" role="group" aria-label="Featured meme categories">
                  <button
                    type="button"
                    data-testid="cat-chip-all"
                    className={`tm-tab ${category === 'all' && !showSavedOnly ? 'active' : ''}`}
                    onClick={() => {
                      setShowSavedOnly(false);
                      setCategory('all');
                    }}
                  >
                    All
                  </button>
                  {HOMEPAGE_FEATURED_CATEGORY_IDS.map((fid) => {
                    const cat = memeCategories.find((c) => c.id === fid);
                    if (!cat) return null;
                    const displayLabel = HOMEPAGE_FEATURED_LABELS[cat.id] || cat.label;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-testid={`cat-chip-${cat.id}`}
                        className={`tm-tab ${category === cat.id && !showSavedOnly ? 'active' : ''}`}
                        onClick={() => {
                          setShowSavedOnly(false);
                          setCategory(cat.id);
                        }}
                      >
                        {cat.emoji ? `${cat.emoji} ` : ''}
                        {displayLabel}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    data-testid="desktop-more-topics-btn"
                    className={`tm-tab tm-hide-mobile ${desktopTopicsOpen ? 'active' : ''}`}
                    aria-expanded={desktopTopicsOpen}
                    onClick={() => setDesktopTopicsOpen((prev) => !prev)}
                  >
                    {desktopTopicsOpen ? '− Less' : '+ More'}
                  </button>
                </div>

                {memeCategories
                  .filter((cat) => !HOMEPAGE_FEATURED_CATEGORY_IDS.includes(cat.id))
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`tm-tab tm-secondary-cat-chip tm-mobile-filter-item ${cat.trending ? 'tm-tab--trending' : ''} ${category === cat.id ? 'tm-secondary-cat-chip--current' : ''} ${category === cat.id && !showSavedOnly ? 'active' : ''}`}
                      onClick={() => {
                        setShowSavedOnly(false);
                        setCategory(cat.id);
                      }}
                      title={cat.trending ? `Trending now: ${cat.label}` : undefined}
                    >
                      {cat.emoji ? `${cat.emoji} ` : '#'}
                      {cat.label}
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
            </section>

          <QuickUploadBar
            onQuickPublishFile={handleQuickPublishFile}
            onOpenStudioWithFile={(file) => {
              closeAllModals();
              loadFileIntoStudio(file);
            }}
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
                  accept={ACCEPT_MEDIA}
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
                <p style={{ color: 'var(--tm-text-dim)', maxWidth: '540px', margin: '0 auto 18px', fontSize: '14px', lineHeight: 1.55 }}>
                  {showSavedOnly
                    ? 'Tap the ⭐ button on any meme card to save your favorites here for quick access.'
                    : `Use the 1-Click Quick-Upload Bar above, drop an image anywhere on screen, or paste (Ctrl+V) to post your meme and earn ${
                        pioneerBonusAvailable ? `${formatMoney(20, { sign: true })} First-Upload Pioneer Bonus` : `${formatMoney(12, { sign: true })} MemeDollarz`
                      } & +120 XP to play for fun in the 80s Arcade! (Free pretend money — can't be bought or cashed out.)`}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="tm-btn tm-btn-primary"
                    onClick={() => quickUploadInputRef.current?.click()}
                  >
                    📥 Select Photo / Screenshot ({pioneerBonusAvailable ? `${formatMoney(20, { sign: true })} First Upload!` : `${formatMoney(12, { sign: true })} & +120 XP`})
                  </button>
                  {(showSavedOnly || sortBy === 'new24h' || (sortBy === 'top' && topWindow !== 'all') || category !== 'all' || searchQuery.trim()) && (
                    <button
                      type="button"
                      className="tm-btn"
                      onClick={() => {
                        setShowSavedOnly(false);
                        setTopWindow('all');
                        setSortBy('hot');
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
            <VirtualizedMemeGrid
              items={visibleMemes}
              renderMemeCard={(meme, idx) => (
                <MemeCard
                  meme={meme}
                  priority={idx < 2}
                  myVote={userVotes[meme.id] || 0}
                  isBookmarked={bookmarkedIds.includes(String(meme.id))}
                  onToggleBookmark={handleToggleBookmark}
                  isCommentsOpen={!!openComments[meme.id]}
                  loadingComments={Boolean(loadingCommentsMap[meme.id])}
                  commentInput={commentInputs[meme.id] || ''}
                  onVote={handleVote}
                  onReaction={handleReaction}
                  onToggleComments={handleToggleComments}
                  onCommentInputChange={handleCommentInputChange}
                  onAddComment={handleAddComment}
                  onOpenTheater={handleOpenTheater}
                  onShareMeme={handleShareMeme}
                  onDownloadMeme={handleDownloadMeme}
                  onOpenProfile={(username) => {
                    sfx.playToggle();
                    setProfileUsername(username);
                  }}
                  onReportMeme={handleReportMeme}
                  onReportComment={handleReportComment}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={feedUserId || authUserId}
                  cardFrame={
                    isActiveCaptionKing(meme.author_name, activeCaptionKings)
                      ? 'caption-king'
                      : (user?.username &&
                          meme.author_name &&
                          String(meme.author_name).toLowerCase() ===
                            String(user.username).toLowerCase()) ||
                        String(meme.id).startsWith('local-')
                        ? equippedFrame
                        : 'default'
                  }
                  litePerfMode={litePerfMode}
                />
              )}
              inFeedCompanionCard={!isWideDesktop ? <LazyCompanionRow /> : null}
            />
          )}

          {!isLoadingFeed && (visibleCount < filteredMemes.length || hasMoreServer) && (
            <div ref={loadMoreSentinelRef} className="tm-load-more-bar">
              <button
                type="button"
                className="tm-btn tm-btn-primary"
                disabled={isLoadingMoreFeed}
                data-testid="load-more-memes-btn"
                onClick={() => {
                  sfx.playToggle();
                  void loadNextFeedPage();
                }}
              >
                {isLoadingMoreFeed
                  ? '⏳ Loading Deeper Archive...'
                  : hasMoreServer
                    ? '⚡ Load More Memes'
                    : `⚡ Load More Memes (${filteredMemes.length - visibleCount} remaining)`}
              </button>
            </div>
          )}

          {!isLoadingFeed && filteredMemes.length > 0 && visibleCount >= filteredMemes.length && !hasMoreServer && (
            <section className="tm-end-of-internet-wrap" aria-label="End of feed">
              <div className="tm-end-of-internet-card">
                <div style={{ fontSize: '42px', marginBottom: '6px' }}>🫠</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 900, color: 'var(--tm-text)' }}>
                  You&apos;ve reached the end of the internet
                </h3>
                <p style={{ margin: '0 auto 14px', maxWidth: '460px', fontSize: '13px', color: 'var(--tm-text-dim)' }}>
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

          {/* DELOREAN DMC-12 TIME MACHINE BANNER */}
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 14px' }}>
            <Suspense fallback={null}>
            <DeLoreanDockBanner
              activeEra={deloreanEra}
              activeCarId={activeCarId}
              onSelectCar={handleSelectEightiesCar}
              onOpenModal={() => {
                sfx.playToggle?.();
                setDeloreanModalOpen(true);
              }}
              onQuickWarp={handleTriggerDeLoreanWarp}
            />
            </Suspense>
          </div>
          </div>

          <div className="tm-home-extras">
            <HomeFunExtras
              onOpenPranks={() => {
                sfx.playToggle();
                closeAllModals();
                setViewMode('pranks');
                window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
              }}
              onOpenSoundboard={() => {
                sfx.playToggle();
                closeAllModals();
                setExtrasFocus('soundboard');
                setExtrasDrawerOpen(true);
              }}
              onOpenArcade={() => {
                sfx.playToggle();
                closeAllModals();
                setViewMode('lobby');
                window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
              }}
              onOpenRadio={() => {
                sfx.playToggle();
                closeAllModals();
                setExtrasFocus(null);
                setExtrasDrawerOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* PRANK SCREENS HUB (/prank-screens) */}
      {viewMode === 'pranks' && (
        <Suspense fallback={<div style={{ padding: '18px' }}><MemeSkeletonGrid count={3} /></div>}>
          <PrankScreensPage
            onOpen={(id) => {
              sfx.playToggle();
              setPrankDisguise(id);
              setBossKeyActive(true);
            }}
          />
        </Suspense>
      )}

      {/* MEME TEMPLATE LIBRARY (/templates, /templates/<slug>-meme-template) */}
      {viewMode === 'templates' && (
        <Suspense fallback={<div style={{ padding: '18px' }}><MemeSkeletonGrid count={3} /></div>}>
          <TemplateLibraryPage
            slug={templateSlug}
            onOpen={(slug) => {
              openTemplatePage(slug);
              window.scrollTo?.({ top: 0, behavior: 'auto' });
            }}
            onUse={(tpl, texts) => {
              sfx.playToggle();
              setForgeIntent({ mode: 'template', templateId: tpl.id, texts: Array.isArray(texts) ? texts : undefined });
              setShowStudio(true);
            }}
          />
        </Suspense>
      )}

      {/* CREATOR PROFILE PAGE (/u/<handle>) */}
      {viewMode === 'creator' && creatorHandle && (
        <Suspense fallback={<div style={{ padding: '18px' }}><MemeSkeletonGrid count={3} /></div>}>
          <CreatorProfilePage
            handle={creatorHandle}
            memes={memes}
            currentUser={user}
            activeCaptionKings={activeCaptionKings}
            tokens={tokens}
            memeCentz={memeCentz}
            tokenLedger={tokenLedger}
            onBackToFeed={() => {
              sfx.playToggle();
              setCreatorHandle(null);
              setViewMode('feed');
            }}
            onSelectMeme={handleOpenTheater}
            onRemixMeme={handleTriggerStudioMutate}
            onRequireAuth={() => setShowAuthModal(true)}
            onAvatarUpdated={setUserAvatarId}
            onReportProfile={handleReportProfile}
          />
        </Suspense>
      )}

      {/* ARCADE GAMES & INTERACTIVE MODES ROUTER */}
      <ArcadeErrorBoundary
        resetKey={viewMode}
        title="ARCADE CABINET SIGNAL LOST"
        onReturnHome={() => setViewMode(viewMode === 'lobby' ? 'feed' : 'lobby')}
        returnLabel={viewMode === 'lobby' ? 'Back to Feed' : 'Back to Lobby'}
        returnIcon={viewMode === 'lobby' ? '🏠' : '🕹️'}
      >
        <Suspense fallback={<div style={{ padding: '18px' }}><MemeSkeletonGrid count={3} /></div>}>
          <GameRouter
          viewMode={viewMode}
        setViewMode={setViewMode}
        tokens={tokens}
        memeCentz={memeCentz}
        handleSpendTokens={handleSpendTokens}
        handlePayoutGameTokens={handlePayoutGameTokens}
        handleEarnMemeCentz={handleEarnMemeCentz}
        awardXpOnly={awardXpOnly}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        litePerfMode={litePerfMode}
        memes={memes}
        setRoyaltiesMap={setRoyaltiesMap}
        handleOpenTheater={handleOpenTheater}
        handleOpenBlankStudio={handleOpenBlankStudio}
        setTheaterMemeId={setTheaterMemeId}
        filteredMemes={filteredMemes}
        userVotes={userVotes}
        bookmarkedIds={bookmarkedIds}
        handleVote={handleVote}
        handleReaction={handleReaction}
        handleAddComment={handleAddComment}
        handleDeleteComment={handleDeleteComment}
        currentUserId={feedUserId || authUserId}
        handleToggleBookmark={handleToggleBookmark}
        handleTriggerStudioMutate={handleTriggerStudioMutate}
        handleCaptionThis={handleCaptionThis}
        handleShareMeme={handleShareMeme}
        setProfileUsername={setProfileUsername}
        handleClaimGoldenMeme={handleClaimGoldenMeme}
        closeAllModals={closeAllModals}
        setShowRewardsModal={setShowRewardsModal}
        setExtrasFocus={setExtrasFocus}
        setExtrasDrawerOpen={setExtrasDrawerOpen}
        setShowLeaderboard={setShowLeaderboard}
        onOpenCabinetLeaderboard={handleOpenCabinetLeaderboard}
        swipeIndex={swipeIndex}
        swipeAnim={swipeAnim}
        triggerSwipe={triggerSwipe}
        handlePrevSwipeCard={handlePrevSwipeCard}
        battlePair={battlePair}
        battleWinner={battleWinner}
        battleStreak={battleStreak}
        championWins={championWins}
        crowdAgreement={crowdAgreement}
        handleBattlePick={handleBattlePick}
        handleSkipMatchup={handleSkipMatchup}
        deloreanEra={deloreanEra}
        activeCarId={activeCarId}
        onSelectCar={handleSelectEightiesCar}
        onOpenTimeCircuits={() => {
          sfx.playToggle?.();
          setDeloreanModalOpen(true);
        }}
        onTriggerDeLoreanWarp={handleTriggerDeLoreanWarp}
        onOpenPrankDisguise={(disguise) => {
          sfx.playToggle?.();
          closeAllModals();
          setPrankDisguise(disguise);
          setBossKeyActive(true);
        }}
        currentUser={user}
        onRequireAuth={() => setShowAuthModal(true)}
        onOpenBattle={() => {
          closeAllModals();
          setBattleModalOpen(true);
        }}
        onDailyPuzzleCompleted={() => recordMeaningfulActivity('daily_puzzle')}
          />
        </Suspense>
      </ArcadeErrorBoundary>

      {/* COMMUNITY MODERATION TOAST */}
      {moderationToast && (
        <div className="tm-moderation-toast">
          <span>{moderationToast}</span>
          <button
            type="button"
            className="tm-link-btn"
            style={{ color: 'var(--tm-amber)' }}
            onClick={handleRestoreReportedMemes}
          >
            ↺ Undo
          </button>
        </div>
      )}

      {/* PHASE 20 & 30.8: OPT-IN "DO NOT PRESS" CHAOS DOCK & 1986 NEON PAYPHONE (Opened via Extras / Payphone) */}
      {!bossKeyActive && payphoneModalOpen && (
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

      {/* Owner brief 17 Nov 2026 (item 5): full-screen button on every playable game */}
      <GameFullscreenToggle
        active={FULLSCREEN_GAME_IDS.has(viewMode) && !bossKeyActive}
        floatEnter={!isFixedArcadeGame}
      />

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
            window.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
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
        />
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
            onDeleteComment={handleDeleteComment}
            currentUserId={feedUserId || authUserId}
            onVote={handleVote}
            onReaction={handleReaction}
            onTriggerStudioMutate={handleTriggerStudioMutate}
            onCaptionThis={handleCaptionThis}
            onOpenBlankStudio={handleOpenBlankStudio}
            onOpenTemplateStudio={(templateSlug) => {
              setForgeIntent({ mode: 'template', templateSlug });
              setShowStudio(true);
            }}
            onOpenBattle={(tab) => {
              handleCloseTheater();
              setBattleModalOpen(tab || true);
            }}
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
            onRequireAuth={() => setShowAuthModal(true)}
            onBrowseTemplates={() => {
              setShowStudio(false);
              setForgeIntent(null);
              openTemplatePage(null);
            }}
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
            anonHandle={anonHandle}
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
            initialTab={leaderboardTarget?.tab || 'creators'}
            initialGame={leaderboardTarget?.game || 'pinball'}
            onClose={() => {
              setShowLeaderboard(false);
              setLeaderboardTarget(null);
            }}
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
      {shareSheet?.meme && (
        <Suspense fallback={null}>
          <ShareMemeSheet
            key={shareSheet.meme.id}
            meme={shareSheet.meme}
            initialAction={shareSheet.action}
            onClose={() => setShareSheet(null)}
          />
        </Suspense>
      )}

      {profileUsername && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <PlayerProfileModal
            key={profileUsername}
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
            activeCaptionKings={activeCaptionKings}
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
            onOpenCreatorPage={(targetHandle) => openCreatorProfile(targetHandle)}
            onReportProfile={handleReportProfile}
            onAvatarUpdated={setUserAvatarId}
            onRequireAuth={() => setShowAuthModal(true)}
            onSelectMeme={handleOpenTheater}
            onTriggerStudioMutate={handleTriggerStudioMutate}
            onClaimUsername={async (newName) => {
              const res = await handleClaimUsername(newName);
              if (res?.ok && res.username) {
                setProfileUsername(res.username);
              }
              return res;
            }}
          />
        </Suspense>
      )}

      {/* MODAL 6: ARCADE VAULT (FAIR TOKEN LEDGER, XP REACTOR, ONE-ARM BANDIT, WHEEL OF CHAOS, TRAILS, DAILY STREAK & QUESTS) */}
      {showRewardsModal && (
        <ArcadeErrorBoundary
          title="TOKEN VAULT SIGNAL LOST"
          loadFailMessage="The Token Vault didn't finish loading. Check your connection, then try again."
          glitchMessage="Something glitched in the Token Vault. Try again, or close it and come back later."
          retryLabel="Try Again"
          returnLabel="Close Vault"
          returnIcon="✖️"
          onReturnHome={() => {
            setShowRewardsModal(false);
            setRewardsInitialTab('vault');
          }}
        >
          <Suspense fallback={MODAL_SKELETON_FALLBACK}>
            <RewardsModal
              key={`rewards-${rewardsInitialTab}`}
              xp={xp}
              tokens={tokens}
              centz={memeCentz}
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
        </ArcadeErrorBoundary>
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

      {/* MODAL 7b: REPORT SHEET (task 33.5) */}
      {reportTarget && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <ReportSheet
            target={reportTarget}
            onClose={handleCloseReport}
            onSubmit={handleSubmitReport}
            onHideForMe={handleHideForMe}
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
              const detail = rep.checks.map((c) => `${c.ok ? '✓' : '✕'} ${c.label}`).join(' · ');
              setGoblinFortuneToast(`🛡️ ${rep.status}: ${detail}`);
              setTimeout(() => setGoblinFortuneToast(''), 5000);
            }}
            onOpenLeaderboard={() => {
              sfx.playToggle();
              setShowLeaderboard(true);
            }}
            onOpenCaptionBattle={() => {
              sfx.playToggle?.();
              closeAllModals();
              setBattleModalOpen(true);
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
            onOpenTimeCircuits={() => {
              sfx.playToggle?.();
              setDeloreanModalOpen(true);
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
            currentUser={user}
            onRequireAuth={() => setShowAuthModal(true)}
            onShareMeme={handleShareMeme}
            onOpenTheater={(meme) => {
              setLiveCelebrationData(null);
              handleOpenTheater(meme);
            }}
            onClose={() => setLiveCelebrationData(null)}
          />
        </Suspense>
      )}

      {/* MODAL 11 (PHASE 28.15 / 33.15): DAILY CAPTION BATTLE & YESTERDAY'S CAPTION KING */}
      {battleModalOpen && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <DailyCaptionBattleModal
            battleId={battleId}
            highlightEntryId={battleEntryId}
            initialTab={typeof battleModalOpen === 'string' ? battleModalOpen : null}
            currentUser={user}
            onRequireAuth={() => setShowAuthModal(true)}
            onClaimPrize={handleClaimBattlePrize}
            onOpenProfile={(username) => {
              handleCloseBattle();
              setProfileUsername(username);
            }}
            onReportEntry={handleReportBattleEntry}
            onKingsUpdated={setActiveCaptionKings}
            onActivityRecorded={recordMeaningfulActivity}
            onClose={handleCloseBattle}
          />
        </Suspense>
      )}

      {showInstallModal && (
        <Suspense fallback={MODAL_SKELETON_FALLBACK}>
          <IphoneAppModal onClose={() => setShowInstallModal(false)} />
        </Suspense>
      )}

      {/* PHASE 10: CRAWLABLE SEO DISCOVERY DIRECTORY & FAQ HUB */}
      {!isFixedArcadeGame && (
        <Suspense fallback={null}>
        <SeoDiscoveryFooter
          onOpenInstallModal={() => {
            sfx.playToggle();
            closeAllModals();
            setShowInstallModal(true);
          }}
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
          onOpenTemplates={() => {
            closeAllModals();
            openTemplatePage(null);
          }}
          onOpenTemplateStudio={(templateId) => {
            sfx.playToggle();
            closeAllModals();
            setForgeIntent({ mode: 'template', templateId });
            setShowStudio(true);
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
        </Suspense>
      )}

      {/* FULL-SCREEN MUSIC EQUALIZER STUDIO */}
      <Suspense fallback={null}>
        <FullscreenMusicEqualizer />
      </Suspense>
    </div>
  );
}