// ==========================================
// PHASE 27: AUTOMATIC DEVICE DETECTION & ADAPTIVE EXPERIENCE ENGINE
// Detects iPhone, iPhone Duo / Foldable Dual-Screen, Android Phones,
// iPad, iPad Mini, Android Tablets, and Desktop/Laptop PCs.
// Automatically tunes viewport scaling, touch targets, grid density,
// and arcade cabinet stage dimensions.
// ==========================================
import { useState, useEffect, useCallback } from 'react';

export const DEVICE_PROFILES = {
  iphone: {
    id: 'iphone',
    label: 'iPhone',
    badge: '📱 iPhone Optimized',
    shortBadge: '📱 iPhone',
    os: 'ios',
    formFactor: 'phone',
    isTouch: true,
    isIOS: true,
    touchMinHeight: '44px',
    feedColumns: 1,
    arcadeStageScale: 1.0,
    description: 'iOS Safari Audio/TTS Unlock + Safe-Area Dynamic Island + 16px No-Zoom Inputs'
  },
  'iphone-duo': {
    id: 'iphone-duo',
    label: 'iPhone Duo / Foldable',
    badge: '📖 iPhone Duo / Foldable Split-Deck',
    shortBadge: '📖 Duo/Fold',
    os: 'ios',
    formFactor: 'foldable-duo',
    isTouch: true,
    isIOS: true,
    touchMinHeight: '46px',
    feedColumns: 2,
    arcadeStageScale: 1.08,
    description: 'Dual-Screen Hinge-Aware Split Deck + Expanded Side-by-Side Arcade Playfield'
  },
  'ipad-mini': {
    id: 'ipad-mini',
    label: 'iPad Mini',
    badge: '📟 iPad Mini Optimized',
    shortBadge: '📟 iPad Mini',
    os: 'ipados',
    formFactor: 'tablet-mini',
    isTouch: true,
    isIOS: true,
    touchMinHeight: '44px',
    feedColumns: 2,
    arcadeStageScale: 1.12,
    description: 'Compact Tablet 2-Column Grid + Enlarged Touch Arcade Controls'
  },
  ipad: {
    id: 'ipad',
    label: 'iPad / iPad Pro',
    badge: '📲 iPad Studio Deck',
    shortBadge: '📲 iPad',
    os: 'ipados',
    formFactor: 'tablet',
    isTouch: true,
    isIOS: true,
    touchMinHeight: '44px',
    feedColumns: 2,
    arcadeStageScale: 1.18,
    description: 'Full-Stage Tablet Arcade Cabinet + Multi-Touch Flipper & Wheel Deck'
  },
  'android-phone': {
    id: 'android-phone',
    label: 'Android Phone',
    badge: '🤖 Android Phone Optimized',
    shortBadge: '🤖 Android',
    os: 'android',
    formFactor: 'phone',
    isTouch: true,
    isIOS: false,
    touchMinHeight: '44px',
    feedColumns: 1,
    arcadeStageScale: 1.0,
    description: 'High-FPS Canvas Touch Pipeline + Haptic Vibration Feedback'
  },
  'android-tablet': {
    id: 'android-tablet',
    label: 'Android Tablet',
    badge: '平板 Android Tablet Deck',
    shortBadge: '📟 Android Tab',
    os: 'android',
    formFactor: 'tablet',
    isTouch: true,
    isIOS: false,
    touchMinHeight: '44px',
    feedColumns: 2,
    arcadeStageScale: 1.15,
    description: 'Wide Tablet Arcade Playfield + Dual-Column Meme Grid'
  },
  pc: {
    id: 'pc',
    label: 'PC / Mac Workstation',
    badge: '🖥️ PC Widescreen Arcade',
    shortBadge: '🖥️ PC',
    os: 'desktop',
    formFactor: 'desktop',
    isTouch: false,
    isIOS: false,
    touchMinHeight: '38px',
    feedColumns: 3,
    arcadeStageScale: 1.25,
    description: 'Widescreen Full-Viewport Arcade Cabinets + Keyboard Hotkeys & Hover 3D Tilt'
  }
};

const OVERRIDE_STORAGE_KEY = 'tm_device_profile_override';

export function detectHardwareDeviceId() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'pc';
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const shortSide = Math.min(vw, vh);
  const longSide = Math.max(vw, vh);
  const aspect = vw / Math.max(1, vh);

  // 1. Check for Dual-Screen / Foldable / iPhone Duo / Surface Duo / Galaxy Fold
  const hasViewportSegments =
    (typeof window.matchMedia === 'function' &&
      (window.matchMedia('(horizontal-viewport-segments: 2)').matches ||
        window.matchMedia('(vertical-viewport-segments: 2)').matches)) ||
    (window.visualViewport && Array.isArray(window.visualViewport.segments) && window.visualViewport.segments.length > 1);

  const isFoldableUa =
    /iphone\s*duo|surface\s*duo|sm-f9|pixel\s*fold|foldable/i.test(ua);

  // Unfolded book-style dual-screen touch devices have a distinctive near-square aspect ratio (0.78..1.26)
  // with a short side between 540px and 730px and long side under 940px.
  const isUnfoldedBookRatio =
    maxTouchPoints > 1 &&
    shortSide >= 530 &&
    shortSide <= 720 &&
    longSide <= 920 &&
    aspect >= 0.78 &&
    aspect <= 1.28;

  if (hasViewportSegments || isFoldableUa || isUnfoldedBookRatio) {
    return 'iphone-duo';
  }

  // 2. iPad & iPad Mini detection (including iPadOS 13+ desktop-class Safari where platform === 'MacIntel' + maxTouchPoints > 1)
  const isIPadUa = /\b(ipad)\b/i.test(ua) || (platform === 'macintel' && maxTouchPoints > 1);
  if (isIPadUa) {
    // iPad Mini has logical shortSide <= 768 and longSide <= 1140 (744x1133 on Gen 6/7, 768x1024 on Gen 5)
    const screenShort = Math.min(window.screen?.width || vw, window.screen?.height || vh);
    const screenLong = Math.max(window.screen?.width || vw, window.screen?.height || vh);
    if (screenShort <= 768 && screenLong <= 1145) {
      return 'ipad-mini';
    }
    return 'ipad';
  }

  // 3. iPhone / iPod detection
  if (/\b(iphone|ipod)\b/i.test(ua)) {
    return 'iphone';
  }

  // 4. Android Phone & Android Tablet detection
  if (/\bandroid\b/i.test(ua)) {
    // Android Phones include "Mobile" in UA and have shortSide < 600px; Android Tablets omit "Mobile" or have shortSide >= 600px
    const isAndroidMobile = /\bmobile\b/i.test(ua) && shortSide < 600;
    return isAndroidMobile ? 'android-phone' : 'android-tablet';
  }

  // 5. Generic touch tablet fallback (e.g. Windows/ChromeOS touch tablet)
  if (maxTouchPoints > 1 && shortSide >= 600 && longSide <= 1366) {
    return shortSide <= 768 ? 'ipad-mini' : 'android-tablet';
  }

  if (maxTouchPoints > 1 && shortSide < 600) {
    return 'iphone';
  }

  return 'pc';
}

export function getDeviceProfileSnapshot() {
  const override =
    typeof window !== 'undefined' ? localStorage.getItem(OVERRIDE_STORAGE_KEY) || 'auto' : 'auto';
  const detectedId = detectHardwareDeviceId();
  const activeId = override !== 'auto' && DEVICE_PROFILES[override] ? override : detectedId;
  const base = DEVICE_PROFILES[activeId] || DEVICE_PROFILES.pc;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const orientation = vw > vh ? 'landscape' : 'portrait';

  return {
    ...base,
    detectedId,
    override,
    vw,
    vh,
    orientation,
    isIOS: base.isIOS || /iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    isCompactViewport: vw <= 640 || vh <= 700
  };
}

export function applyDeviceAttributesToDom(profile) {
  if (typeof document === 'undefined' || !profile) return;
  const root = document.documentElement;
  root.dataset.device = profile.id;
  root.dataset.formFactor = profile.formFactor;
  root.dataset.os = profile.os;
  root.dataset.orientation = profile.orientation;
  root.style.setProperty('--tm-touch-min-h', profile.touchMinHeight || '44px');
  root.style.setProperty('--tm-stage-scale', String(profile.arcadeStageScale || 1));
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState(() => getDeviceProfileSnapshot());

  const refreshProfile = useCallback(() => {
    const next = getDeviceProfileSnapshot();
    applyDeviceAttributesToDom(next);
    setProfile(next);
  }, []);

  const setOverride = useCallback(
    (nextOverride) => {
      if (typeof window !== 'undefined') {
        if (!nextOverride || nextOverride === 'auto') {
          localStorage.removeItem(OVERRIDE_STORAGE_KEY);
        } else {
          localStorage.setItem(OVERRIDE_STORAGE_KEY, nextOverride);
        }
      }
      refreshProfile();
    },
    [refreshProfile]
  );

  useEffect(() => {
    applyDeviceAttributesToDom(profile);
  }, [profile]);

  useEffect(() => {
    window.addEventListener('resize', refreshProfile, { passive: true });
    window.addEventListener('orientationchange', refreshProfile, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', refreshProfile, { passive: true });
    }
    return () => {
      window.removeEventListener('resize', refreshProfile);
      window.removeEventListener('orientationchange', refreshProfile);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', refreshProfile);
      }
    };
  }, [refreshProfile]);

  return { profile, setOverride, refreshProfile };
}
