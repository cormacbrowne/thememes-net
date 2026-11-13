import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { updateDynamicSeo } from '../utils/seoEngine';
import {
  resolveRouteFromLocation,
  getCanonicalPathForState,
  normalizeRoutePath
} from '../data/seoRoutes';
import { recordRecentArcadeGame } from '../data/arcadeGamesCatalog';
import { trackMemeViewed, trackGameStarted } from '../utils/analytics';
import { getDeviceProfileSnapshot } from '../utils/deviceProfile';
import { recordLocalMemeView } from '../utils/notifications';

const FIXED_ARCADE_GAMES = [
  'blackjack',
  'poker',
  'roulette',
  'pusher',
  'slots',
  'crush',
  'pinball',
  'stocks',
  'derby',
  'guess',
  'plinko',
  'hilow'
];

const TRACKED_GAMES = new Set([
  ...FIXED_ARCADE_GAMES,
  'battle',
  'swipe'
]);

export function isTouchDeviceDefault() {
  if (typeof window === 'undefined') return false;
  const profile = getDeviceProfileSnapshot();
  if (profile?.isTouch) return true;
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return /iPhone|iPod|iPad|Android/i.test(navigator.userAgent || '');
}

/**
 * Manages active viewMode, URL path routing, modal stack, and popstate navigation.
 */
export function useViewMode() {
  const [initialRoute] = useState(() =>
    typeof window !== 'undefined'
      ? resolveRouteFromLocation(
          window.location.pathname,
          window.location.search,
          isTouchDeviceDefault()
        )
      : {
          matchedPath: '/',
          isDedicatedLanding: false,
          viewMode: 'feed',
          category: 'all',
          searchQuery: '',
          showStudio: false,
          forgeIntent: null,
          extrasDrawerOpen: false,
          extrasFocus: null,
          bossKeyActive: false,
          prankDisguise: null,
          surpriseOpen: false,
          theaterMemeId: null
        }
  );

  const [category, setCategory] = useState(initialRoute.category);
  const [viewMode, setViewMode] = useState(initialRoute.viewMode);
  const [searchQuery, setSearchQuery] = useState(initialRoute.searchQuery);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('latest');

  const [showStudio, setShowStudio] = useState(initialRoute.showStudio);
  const [forgeIntent, setForgeIntent] = useState(initialRoute.forgeIntent);
  const [extrasDrawerOpen, setExtrasDrawerOpen] = useState(initialRoute.extrasDrawerOpen);
  const [extrasFocus, setExtrasFocus] = useState(initialRoute.extrasFocus);
  const [bossKeyActive, setBossKeyActive] = useState(initialRoute.bossKeyActive);
  const [prankDisguise, setPrankDisguise] = useState(initialRoute.prankDisguise);
  const [surpriseOpen, setSurpriseOpen] = useState(initialRoute.surpriseOpen);
  const [theaterMemeId, setTheaterMemeId] = useState(initialRoute.theaterMemeId);
  const [openedFromShareLink, setOpenedFromShareLink] = useState(
    Boolean(initialRoute.theaterMemeId)
  );
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [rewardsInitialTab, setRewardsInitialTab] = useState('vault');
  const [profileUsername, setProfileUsername] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [liveCelebrationData, setLiveCelebrationData] = useState(null);
  const [roastModalMeme, setRoastModalMeme] = useState(null);
  const [evolutionModalMeme, setEvolutionModalMeme] = useState(null);
  const [payphoneModalOpen, setPayphoneModalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  // Phase 30: Do not gate first-time visitors behind a blocking boot dialog — land straight on memes!
  // Kept stateful so Extras / Settings can optionally replay the retro intro.
  const [showIntro, setShowIntro] = useState(false);

  const isFixedArcadeGame = FIXED_ARCADE_GAMES.includes(viewMode);

  const canonicalPath = useMemo(
    () =>
      getCanonicalPathForState({
        viewMode,
        category,
        showStudio,
        forgeIntent,
        extrasDrawerOpen,
        extrasFocus,
        bossKeyActive,
        prankDisguise
      }),
    [
      viewMode,
      category,
      showStudio,
      forgeIntent,
      extrasDrawerOpen,
      extrasFocus,
      bossKeyActive,
      prankDisguise
    ]
  );

  const hasCanonicalSubpath = canonicalPath !== '/';

  const activeNavDepth =
    (!hasCanonicalSubpath && (viewMode !== 'feed' || searchQuery.trim() !== '') ? 1 : 0) +
    (theaterMemeId ? 1 : 0) +
    (showLeaderboard ? 1 : 0) +
    (showRewardsModal ? 1 : 0) +
    (roastModalMeme ? 1 : 0) +
    (profileUsername ? 1 : 0) +
    (evolutionModalMeme ? 1 : 0) +
    (showStudio && canonicalPath !== '/meme-generator' ? 1 : 0) +
    (showAuthModal ? 1 : 0) +
    (extrasDrawerOpen && canonicalPath !== '/meme-soundboard' ? 1 : 0);

  const handleOpenTheater = useCallback((meme) => {
    if (!meme) return;
    sfx.playToggle();
    trackMemeViewed(meme, 'theater');
    recordLocalMemeView(meme.id);
    setTheaterMemeId(meme.id);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('meme');
      url.searchParams.set('m', String(meme.id));
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const handleCloseTheater = useCallback(() => {
    setTheaterMemeId(null);
    setOpenedFromShareLink(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('m');
      url.searchParams.delete('meme');
      if (/^\/m\/[^/?#]+/i.test(url.pathname)) {
        url.pathname = '/';
      }
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const closeAllModals = useCallback(() => {
    setShowStudio(false);
    setForgeIntent(null);
    setTheaterMemeId(null);
    setOpenedFromShareLink(false);
    setEvolutionModalMeme(null);
    setShowLeaderboard(false);
    setShowRewardsModal(false);
    setRewardsInitialTab('vault');
    setBattleModalOpen(false);
    setLiveCelebrationData(null);
    setRoastModalMeme(null);
    setProfileUsername(null);
    setShowAuthModal(false);
    setExtrasDrawerOpen(false);
    setExtrasFocus(null);
    setBossKeyActive(false);
    setPrankDisguise(null);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has('m') || url.searchParams.has('meme')) {
        url.searchParams.delete('m');
        url.searchParams.delete('meme');
        changed = true;
      }
      if (/^\/m\/[^/?#]+/i.test(url.pathname)) {
        url.pathname = '/';
        changed = true;
      }
      if (changed) {
        window.history.replaceState(window.history.state, '', url.toString());
      }
    }
  }, []);

  const handleNavigateBack = useCallback(() => {
    sfx.playToggle();
    if (bossKeyActive) {
      setBossKeyActive(false);
      setPrankDisguise(null);
    } else if (extrasDrawerOpen) {
      setExtrasDrawerOpen(false);
      setExtrasFocus(null);
    } else if (showAuthModal) {
      setShowAuthModal(false);
    } else if (roastModalMeme) {
      setRoastModalMeme(null);
    } else if (liveCelebrationData) {
      setLiveCelebrationData(null);
    } else if (battleModalOpen) {
      setBattleModalOpen(false);
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
      setForgeIntent(null);
    } else if (theaterMemeId) {
      handleCloseTheater();
    } else if (viewMode !== 'feed') {
      setViewMode('feed');
    } else if (category !== 'all' || searchQuery.trim() !== '') {
      setCategory('all');
      setSearchQuery('');
    }
  }, [
    bossKeyActive,
    extrasDrawerOpen,
    showAuthModal,
    roastModalMeme,
    liveCelebrationData,
    battleModalOpen,
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

  return {
    initialRoute,
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
    theaterMemeId,
    setTheaterMemeId,
    openedFromShareLink,
    setOpenedFromShareLink,
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
    canonicalPath,
    isFixedArcadeGame,
    hasCanonicalSubpath,
    activeNavDepth,
    handleOpenTheater,
    handleCloseTheater,
    closeAllModals,
    handleNavigateBack
  };
}

/**
 * Synchronizes URL paths, browser history, SEO metadata, analytics, and Boss Key shortcuts.
 */
export function useViewModeEffects({ router, theaterMeme, isAnyModalOpen }) {
  const {
    initialRoute,
    viewMode,
    category,
    searchQuery,
    showStudio,
    forgeIntent,
    extrasDrawerOpen,
    extrasFocus,
    bossKeyActive,
    prankDisguise,
    theaterMemeId,
    openedFromShareLink,
    roastModalMeme,
    canonicalPath,
    isFixedArcadeGame,
    activeNavDepth,
    handleNavigateBack,
    setCategory,
    setViewMode,
    setSearchQuery,
    setShowStudio,
    setForgeIntent,
    setExtrasDrawerOpen,
    setExtrasFocus,
    setBossKeyActive,
    setPrankDisguise,
    setSurpriseOpen,
    setTheaterMemeId
  } = router;

  useEffect(() => {
    if (openedFromShareLink && theaterMeme) {
      trackMemeViewed(theaterMeme, 'share_link');
    }
  }, [openedFromShareLink, theaterMeme]);

  useEffect(() => {
    updateDynamicSeo({
      activeMeme: theaterMeme || roastModalMeme,
      category,
      viewMode,
      showStudio,
      forgeIntent,
      extrasDrawerOpen,
      extrasFocus,
      bossKeyActive,
      prankDisguise
    });
  }, [
    theaterMeme,
    roastModalMeme,
    category,
    viewMode,
    showStudio,
    forgeIntent,
    extrasDrawerOpen,
    extrasFocus,
    bossKeyActive,
    prankDisguise
  ]);

  const prevTrackedGameRef = useRef(null);
  useEffect(() => {
    if (TRACKED_GAMES.has(viewMode)) {
      recordRecentArcadeGame(viewMode);
      if (prevTrackedGameRef.current !== viewMode) {
        prevTrackedGameRef.current = viewMode;
        trackGameStarted(viewMode, isFixedArcadeGame ? 'arcade_cabinet' : 'interactive_mode');
      }
    } else {
      prevTrackedGameRef.current = null;
    }
  }, [viewMode, isFixedArcadeGame]);

  const historyDepthRef = useRef(0);
  const lastSyncedPathRef = useRef(initialRoute.matchedPath || '/');
  const hasMountedPathSyncRef = useRef(false);
  const skipNextPushRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    if (theaterMemeId) return;

    const url = new URL(window.location.href);
    const currentNorm = normalizeRoutePath(url.pathname);
    const hadLegacyParams = url.searchParams.has('mode') || url.searchParams.has('category');
    url.searchParams.delete('mode');
    url.searchParams.delete('category');
    if (searchQuery.trim()) {
      url.searchParams.set('q', searchQuery.trim());
    } else {
      url.searchParams.delete('q');
    }

    if (canonicalPath !== currentNorm) {
      url.pathname = canonicalPath;
      const useReplace =
        !hasMountedPathSyncRef.current || skipNextPushRef.current || hadLegacyParams;
      if (useReplace) {
        window.history.replaceState(window.history.state, '', url.toString());
      } else {
        window.history.pushState({ tmCanonicalPath: canonicalPath }, '', url.toString());
      }
    } else if (hadLegacyParams || url.search !== window.location.search) {
      window.history.replaceState(window.history.state, '', url.toString());
    }

    hasMountedPathSyncRef.current = true;
    skipNextPushRef.current = false;
    lastSyncedPathRef.current = canonicalPath;
  }, [canonicalPath, searchQuery, theaterMemeId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.pushState) return;
    while (historyDepthRef.current < activeNavDepth) {
      historyDepthRef.current += 1;
      const url = new URL(window.location.href);
      window.history.pushState({ tmArcadeDepth: historyDepthRef.current }, '', url.toString());
    }
  }, [activeNavDepth]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPopState = () => {
      const nextNorm = normalizeRoutePath(window.location.pathname);
      if (nextNorm !== lastSyncedPathRef.current) {
        skipNextPushRef.current = true;
        const resolved = resolveRouteFromLocation(
          window.location.pathname,
          window.location.search,
          isTouchDeviceDefault()
        );
        lastSyncedPathRef.current = resolved.matchedPath;
        setCategory(resolved.category);
        setViewMode(resolved.viewMode);
        setSearchQuery(resolved.searchQuery);
        setShowStudio(resolved.showStudio);
        setForgeIntent(resolved.forgeIntent);
        setExtrasDrawerOpen(resolved.extrasDrawerOpen);
        setExtrasFocus(resolved.extrasFocus);
        setBossKeyActive(resolved.bossKeyActive);
        setPrankDisguise(resolved.prankDisguise);
        setSurpriseOpen(resolved.surpriseOpen);
        setTheaterMemeId(resolved.theaterMemeId);
        return;
      }
      historyDepthRef.current = Math.max(0, historyDepthRef.current - 1);
      handleNavigateBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [
    handleNavigateBack,
    setBossKeyActive,
    setCategory,
    setExtrasDrawerOpen,
    setExtrasFocus,
    setForgeIntent,
    setPrankDisguise,
    setSearchQuery,
    setShowStudio,
    setSurpriseOpen,
    setTheaterMemeId,
    setViewMode
  ]);

  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const modeChanged = prevViewModeRef.current !== viewMode;
    let lockRafId = null;

    const resetScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    if (modeChanged) {
      prevViewModeRef.current = viewMode;
      // Always release overflow lock BEFORE resetting scroll so iOS Safari cannot freeze
      // a fixed arcade cabinet off-screen at the feed's previous scroll offset.
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      resetScrollTop();
    }

    if (isAnyModalOpen || isFixedArcadeGame) {
      if (modeChanged || window.scrollY > 0 || document.documentElement.scrollTop > 0) {
        resetScrollTop();
      }
      lockRafId = window.requestAnimationFrame?.(() => {
        if (modeChanged) resetScrollTop();
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      if (lockRafId != null && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(lockRafId);
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [viewMode, isAnyModalOpen, isFixedArcadeGame]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && bossKeyActive) {
        setBossKeyActive(false);
        setPrankDisguise(null);
      } else if (e.key === 'B' && e.shiftKey && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        setPrankDisguise(null);
        setBossKeyActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bossKeyActive, setBossKeyActive, setPrankDisguise]);
}
