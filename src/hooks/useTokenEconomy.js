import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { sfx } from '../utils/soundEngine';
import { triggerWinCelebration, wasCelebrationRecentlyTriggered } from '../utils/winCelebration';
import {
  RANKS,
  DAILY_QUESTS,
  MEME_FORTUNES,
  ARCADE_RATE_LIMITS,
  formatWindowCountdown
} from '../data/starterMemes';
import {
  ARCADE_ECONOMY_RULES,
  loadTokenLedger,
  saveTokenLedger,
  loadTokenBalance,
  saveTokenBalance,
  evaluateTokenAward,
  hasActionBeenRewarded,
  validateStakedGamePayout,
  computeXpConversionState,
  getTodayDateString
} from '../utils/tokenEconomy';
import { setRadioStation, radioEvent } from '../utils/radioBus';
import {
  loadUnlockedCosmetics,
  saveUnlockedCosmetics,
  loadEquippedFrame,
  saveEquippedFrame,
  loadEquippedCassetteSkin,
  saveEquippedCassetteSkin,
  pickRandomLockedCosmetic
} from '../data/cosmetics';

/**
 * Manages Arcade tokens, ledger, XP, Rank, XP Reactor, cosmetics, quests, wheel, streak, and Konami rewards.
 */
export function useTokenEconomy({ spawnParticles, setGoblinFortuneToast }) {
  const [xp, setXp] = useState(() => Number(localStorage.getItem('tm_xp') || 75));
  const [xpConverted, setXpConverted] = useState(() => {
    const saved = localStorage.getItem('tm_xp_converted_v1');
    if (saved !== null) return Math.max(0, Number(saved) || 0);
    const initialXp = Number(localStorage.getItem('tm_xp') || 75);
    return Math.max(0, initialXp - 75);
  });
  const [xpAutoConvert, setXpAutoConvert] = useState(
    () => localStorage.getItem('tm_xp_autoconvert_v1') !== 'false'
  );
  const [reactorFlash, setReactorFlash] = useState(false);
  const bossStealthCountRef = useRef(0);
  const [tokens, setTokens] = useState(() => loadTokenBalance());
  const tokensRef = useRef(tokens);
  const [tokenLedger, setTokenLedger] = useState(() => loadTokenLedger());
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);
  const [levelUpBanner, setLevelUpBanner] = useState(null);

  const [unlockedCosmetics, setUnlockedCosmetics] = useState(() => loadUnlockedCosmetics());
  const [equippedFrame, setEquippedFrame] = useState(() => loadEquippedFrame());
  const [equippedCassetteSkin, setEquippedCassetteSkin] = useState(() =>
    loadEquippedCassetteSkin()
  );
  const [cursorTrail, setCursorTrail] = useState(() => {
    if (typeof window === 'undefined') return 'none';
    const saved = localStorage.getItem('tm_cursor_trail');
    if (saved) return saved;
    return window.matchMedia?.('(pointer: coarse)').matches ? 'none' : 'fire';
  });

  const [lootSpins, setLootSpins] = useState(() =>
    Math.min(
      ARCADE_RATE_LIMITS.MAX_STORED_WHEEL_SPINS,
      Math.max(0, Number(localStorage.getItem('tm_spins') ?? 1))
    )
  );
  const [rateWindows, setRateWindows] = useState(() => {
    const now = Date.now();
    try {
      const saved = JSON.parse(localStorage.getItem('tm_rate_windows') || '{}');
      return {
        wheelUsed: Number(saved.wheelUsed || 0),
        wheelStart: Number(saved.wheelStart || now),
        goblinUsed: Number(saved.goblinUsed || 0),
        goblinStart: Number(saved.goblinStart || now),
        konamiLastClaim: Number(saved.konamiLastClaim || 0)
      };
    } catch {
      return {
        wheelUsed: 0,
        wheelStart: now,
        goblinUsed: 0,
        goblinStart: now,
        konamiLastClaim: 0
      };
    }
  });
  const [windowNow, setWindowNow] = useState(() => Date.now());

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
  const [konamiUnlocked, setKonamiUnlocked] = useState(
    () => localStorage.getItem('tm_konami') === 'true'
  );

  const currentRank = useMemo(() => {
    let r = RANKS[0];
    for (const item of RANKS) {
      if (xp >= item.minXp) r = item;
    }
    return r;
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('tm_xp', String(xp));
  }, [xp]);
  useEffect(() => {
    localStorage.setItem('tm_xp_converted_v1', String(xpConverted));
  }, [xpConverted]);
  useEffect(() => {
    localStorage.setItem('tm_xp_autoconvert_v1', String(xpAutoConvert));
  }, [xpAutoConvert]);
  useEffect(() => {
    tokensRef.current = tokens;
    saveTokenBalance(tokens);
  }, [tokens]);
  useEffect(() => {
    saveTokenLedger(tokenLedger);
  }, [tokenLedger]);
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
    localStorage.setItem('tm_cursor_trail', cursorTrail);
  }, [cursorTrail]);
  useEffect(() => {
    saveUnlockedCosmetics(unlockedCosmetics);
  }, [unlockedCosmetics]);
  useEffect(() => {
    saveEquippedFrame(equippedFrame);
  }, [equippedFrame]);
  useEffect(() => {
    saveEquippedCassetteSkin(equippedCassetteSkin);
  }, [equippedCassetteSkin]);
  useEffect(() => {
    localStorage.setItem('tm_konami', String(konamiUnlocked));
  }, [konamiUnlocked]);
  useEffect(() => {
    localStorage.setItem('tm_rate_windows', JSON.stringify(rateWindows));
  }, [rateWindows]);

  useEffect(() => {
    if (rateWindows.wheelUsed === 0 && rateWindows.goblinUsed === 0) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      setWindowNow(now);
      setRateWindows((prev) => {
        let changed = false;
        const next = { ...prev };
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
        return changed ? next : prev;
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [rateWindows.wheelUsed, rateWindows.goblinUsed]);

  useEffect(() => {
    if (comboTimer <= 0) return undefined;
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

  useEffect(() => {
    radioEvent('combo', combo);
  }, [combo]);

  const wheelSpinsLeftInWindow = Math.max(
    0,
    ARCADE_RATE_LIMITS.WHEEL_SPINS_PER_WINDOW - rateWindows.wheelUsed
  );
  const wheelResetMs =
    rateWindows.wheelUsed > 0
      ? Math.max(0, ARCADE_RATE_LIMITS.WHEEL_WINDOW_MS - (windowNow - rateWindows.wheelStart))
      : 0;
  const goblinsLeftInWindow = Math.max(
    0,
    ARCADE_RATE_LIMITS.GOBLINS_PER_WINDOW - rateWindows.goblinUsed
  );
  const goblinResetMs =
    rateWindows.goblinUsed > 0
      ? Math.max(0, ARCADE_RATE_LIMITS.GOBLIN_WINDOW_MS - (windowNow - rateWindows.goblinStart))
      : 0;

  const uploadTokensRemainingToday = Math.max(
    0,
    ARCADE_ECONOMY_RULES.CATEGORY_DAILY_CAPS.upload - (tokenLedger?.byCategory?.upload || 0)
  );
  const pioneerBonusAvailable = !hasActionBeenRewarded(tokenLedger, 'pioneer:first_upload');
  const pinataClaimedToday = hasActionBeenRewarded(
    tokenLedger,
    `daily:pinata:${getTodayDateString()}`
  );
  const payphoneClaimedToday = hasActionBeenRewarded(
    tokenLedger,
    `daily:payphone_coin:${getTodayDateString()}`
  );
  const fluxBonusClaimedToday = hasActionBeenRewarded(
    tokenLedger,
    `daily:delorean_flux:${getTodayDateString()}`
  );
  const xpConversionState = useMemo(
    () => computeXpConversionState(xp, xpConverted, tokenLedger),
    [xp, xpConverted, tokenLedger]
  );

  const unclaimedRewardsCount = useMemo(() => {
    let count = lootSpins > 0 ? lootSpins : 0;
    if (!streakClaimedToday) count += 1;
    if (xpConversionState.readyUnits > 0 && !xpConversionState.isDailyCapped) {
      count += 1;
    }
    for (const q of DAILY_QUESTS) {
      if ((questProgress[q.id] || 0) >= q.target && !claimedQuests[q.id]) {
        count += 1;
      }
    }
    return count;
  }, [lootSpins, streakClaimedToday, xpConversionState, questProgress, claimedQuests]);

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

  const awardXpOnly = useCallback(
    (flatXp, event, emoji = '⚡', labelOverride = null) => {
      const gained = Math.max(0, Math.floor(Number(flatXp) || 0));
      const nextCombo = Math.min(5, combo + 1);
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
        if (evalRes.reason === 'already_rewarded') {
          return evalRes;
        }
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

  const awardXpAndCombo = useCallback(
    (baseXp, event, emoji = '⚡') => {
      awardXpOnly(Math.min(15, baseXp), event, emoji);
    },
    [awardXpOnly]
  );

  const handleSpendTokens = useCallback((cost) => {
    const cleanCost = Math.max(0, Math.floor(Number(cost) || 0));
    if (cleanCost <= 0) return true;
    if (tokensRef.current < cleanCost) {
      sfx.playSadTrombone();
      return false;
    }
    tokensRef.current = Math.max(0, tokensRef.current - cleanCost);
    setTokens(tokensRef.current);
    return true;
  }, []);

  const handleEquipCosmetic = useCallback((item) => {
    if (!item) return;
    if (item.type === 'frame') {
      setEquippedFrame(item.value);
    } else if (item.type === 'trail') {
      setCursorTrail(item.value);
    } else if (item.type === 'skin') {
      setEquippedCassetteSkin(item.value);
    } else if (item.type === 'station') {
      setRadioStation(item.value);
    } else if (item.type === 'title') {
      setUnlockedFlairs((prev) => (prev.includes(item.value) ? prev : [...prev, item.value]));
      setEquippedFlair(item.value);
    }
  }, []);

  const handleBuyOrUnlockCosmetic = useCallback(
    (item) => {
      if (!item) return { ok: false };
      if (unlockedCosmetics.includes(item.id) || item.freeDefault) {
        handleEquipCosmetic(item);
        return { ok: true };
      }
      const xpEligible = item.unlockXp > 0 && xp >= item.unlockXp;
      if (!xpEligible) {
        if (!handleSpendTokens(item.tokenCost)) {
          return { ok: false };
        }
      }
      setUnlockedCosmetics((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
      handleEquipCosmetic(item);
      return { ok: true };
    },
    [unlockedCosmetics, xp, handleSpendTokens, handleEquipCosmetic]
  );

  const handleClaimGoldenMeme = useCallback(() => {
    const lockedPick = pickRandomLockedCosmetic(unlockedCosmetics);
    if (lockedPick) {
      setUnlockedCosmetics((prev) =>
        prev.includes(lockedPick.id) ? prev : [...prev, lockedPick.id]
      );
      handleEquipCosmetic(lockedPick);
      sfx.playJackpot();
      setGoblinFortuneToast(
        `✨ GOLDEN MEME DROP! Unlocked & equipped cosmetic: ${lockedPick.icon} ${lockedPick.name}!`
      );
      setTimeout(() => setGoblinFortuneToast(''), 5000);
      return {
        label: `Unlocked ${lockedPick.icon} ${lockedPick.name}!`,
        cosmetic: lockedPick
      };
    }
    awardXpOnly(40, null, '✨', '✨ Golden Meme Drop! +40 XP');
    sfx.playJackpot();
    return { label: '+40 Bonus XP!', xp: 40 };
  }, [unlockedCosmetics, handleEquipCosmetic, awardXpOnly, setGoblinFortuneToast]);

  const handlePayoutGameTokens = useCallback(
    (rawPayout, { stakedTokens = 0, xp: xpGain = 20, label = '', emoji = '🪙', maxMultiplier = 160 } = {}) => {
      const verified = validateStakedGamePayout({
        stakedTokens,
        rawPayout,
        maxMultiplier
      });
      if (verified <= 0) return 0;
      tokensRef.current += verified;
      setTokens(tokensRef.current);
      if (xpGain > 0) {
        awardXpOnly(xpGain, null, emoji, label || `+${verified} 🪙`);
      }
      if (verified >= 2 && !wasCelebrationRecentlyTriggered(500)) {
        triggerWinCelebration({
          amount: verified,
          unit: '🪙',
          headline: label || `+${verified} 🪙 WON!`,
          multiplier: stakedTokens > 0 ? verified / Math.max(1, stakedTokens) : 2
        });
      }
      return verified;
    },
    [awardXpOnly]
  );

  const claimStarterPackIfFirst = useCallback(
    (event = null) => {
      try {
        if (localStorage.getItem('tm_starter_pack_v1') === 'true') return 0;
        localStorage.setItem('tm_starter_pack_v1', 'true');
      } catch {
        return 0;
      }
      const bonus = ARCADE_ECONOMY_RULES.STARTER_FIRST_PLAY_BONUS || 10;
      tokensRef.current += bonus;
      setTokens(tokensRef.current);
      sfx.playJackpot?.();
      const x = event?.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);
      const y = event?.clientY || 120;
      spawnParticles(x, y, `🎁 Starter Pack: +${bonus} 🪙!`, '🎁');
      setGoblinFortuneToast(`🎁 Starter Pack: +${bonus} 🪙! Play any arcade cabinet or bet in the casino.`);
      setTimeout(() => setGoblinFortuneToast(''), 5500);
      return bonus;
    },
    [spawnParticles, setGoblinFortuneToast]
  );

  const handleWinPinataReward = useCallback(
    (e) => {
      const res = awardFairReward({
        category: 'quests',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.PINATA_WHACK_WIN.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.PINATA_WHACK_WIN.xp,
        actionKey: `daily:pinata:${getTodayDateString()}`,
        event: e,
        emoji: '🪅'
      });
      return res.awardedTokens || 0;
    },
    [awardFairReward]
  );

  const handleClaimPayphoneCoinReturn = useCallback(
    (e) => {
      const res = awardFairReward({
        category: 'quests',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.PAYPHONE_COIN_RETURN.tokens,
        xpGain: ARCADE_ECONOMY_RULES.REWARDS.PAYPHONE_COIN_RETURN.xp,
        actionKey: `daily:payphone_coin:${getTodayDateString()}`,
        event: e,
        emoji: '☎️'
      });
      return res.awardedTokens || 0;
    },
    [awardFairReward]
  );

  const handleClaimDeLoreanFluxBonus = useCallback(
    (e) => {
      const res = awardFairReward({
        category: 'quests',
        requestedTokens: 5,
        xpGain: 50,
        actionKey: `daily:delorean_flux:${getTodayDateString()}`,
        event: e,
        emoji: '🚗'
      });
      return res.awardedTokens || 0;
    },
    [awardFairReward]
  );

  const handleBossSecretXp = useCallback(() => {
    if (bossStealthCountRef.current >= 12) return;
    bossStealthCountRef.current += 1;
    awardXpOnly(15, null, '💼', '+15 Stealth XP!');
  }, [awardXpOnly]);

  const handleExchangeXpForTokens = useCallback(
    (manualEvent = null) => {
      const state = computeXpConversionState(xp, xpConverted, tokenLedger);
      if (state.readyUnits <= 0 || state.isDailyCapped) return 0;

      const requestedTokens = state.readyUnits * state.tokensPerBatch;
      const evalRes = evaluateTokenAward({
        ledger: tokenLedger,
        category: 'xpConversion',
        requestedTokens,
        actionKey: null
      });

      if (!evalRes.allowed || evalRes.awardedTokens <= 0) return 0;

      const unitsActuallyMinted = Math.max(
        1,
        Math.floor(evalRes.awardedTokens / state.tokensPerBatch)
      );
      const xpConsumed = unitsActuallyMinted * state.xpThreshold;

      setTokenLedger(evalRes.nextLedger);
      setXpConverted((prev) => prev + xpConsumed);
      tokensRef.current += evalRes.awardedTokens;
      setTokens(tokensRef.current);

      setReactorFlash(true);
      setTimeout(() => setReactorFlash(false), 1800);
      sfx.playJackpot();

      const clientX =
        manualEvent?.clientX || (typeof window !== 'undefined' ? window.innerWidth * 0.65 : 500);
      const clientY = manualEvent?.clientY || 68;
      spawnParticles(
        clientX,
        clientY,
        `⚡ XP REACTOR: +${evalRes.awardedTokens} 🪙!`,
        '🪙'
      );

      setGoblinFortuneToast(
        `⚡ XP-TO-TOKEN REACTOR: Converted ${xpConsumed} XP → +${evalRes.awardedTokens} 🪙 Tokens! (Your Lv.${currentRank.level} Rank XP stays intact!)`
      );
      setTimeout(() => setGoblinFortuneToast(''), 4800);

      return evalRes.awardedTokens;
    },
    [xp, xpConverted, tokenLedger, spawnParticles, currentRank.level, setGoblinFortuneToast]
  );

  const handleToggleXpAutoConvert = useCallback(() => {
    sfx.playToggle();
    setXpAutoConvert((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!xpAutoConvert) return undefined;
    if (xpConversionState.readyUnits <= 0 || xpConversionState.isDailyCapped) return undefined;
    const timer = setTimeout(() => {
      handleExchangeXpForTokens(null);
    }, 380);
    return () => clearTimeout(timer);
  }, [
    xpAutoConvert,
    xpConversionState.readyUnits,
    xpConversionState.isDailyCapped,
    handleExchangeXpForTokens
  ]);

  const awardUploadTokensWithPioneerCheck = useCallback(
    ({ baseTokens, baseXp, event, emoji = '🚀' }) => {
      radioEvent('publish');
      let currentLedger = tokenLedger;
      let totalAwarded = 0;

      if (!hasActionBeenRewarded(currentLedger, 'pioneer:first_upload')) {
        const pioneerRes = evaluateTokenAward({
          ledger: currentLedger,
          category: 'upload',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.FIRST_UPLOAD_BONUS.tokens,
          actionKey: 'pioneer:first_upload'
        });
        if (pioneerRes.allowed) {
          currentLedger = pioneerRes.nextLedger;
          totalAwarded += pioneerRes.awardedTokens;
        }
      }

      const mainRes = evaluateTokenAward({
        ledger: currentLedger,
        category: 'upload',
        requestedTokens: baseTokens,
        actionKey: null
      });
      if (mainRes.allowed) {
        currentLedger = mainRes.nextLedger;
        totalAwarded += mainRes.awardedTokens;
      }

      setTokenLedger(currentLedger);
      if (totalAwarded > 0) {
        tokensRef.current += totalAwarded;
        setTokens(tokensRef.current);
      }

      const gainedXp =
        baseXp +
        (totalAwarded > baseTokens ? ARCADE_ECONOMY_RULES.REWARDS.FIRST_UPLOAD_BONUS.xp : 0);
      awardXpOnly(
        gainedXp,
        event,
        emoji,
        totalAwarded > 0 ? `+${totalAwarded} 🪙 & +${gainedXp} XP!` : `+${gainedXp} XP`
      );

      if (totalAwarded > baseTokens) {
        setGoblinFortuneToast(
          `🌟 FIRST MEME PIONEER BONUS UNLOCKED! +${totalAwarded} 🪙 Tokens added to your Arcade Wallet!`
        );
        setTimeout(() => setGoblinFortuneToast(''), 5500);
      }
    },
    [tokenLedger, awardXpOnly, setGoblinFortuneToast]
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
      if (prize.id === 'xp-jackpot') {
        awardFairReward({
          category: 'quests',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.WHEEL_RARE_JACKPOT.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.WHEEL_RARE_JACKPOT.xp,
          actionKey: `daily:wheeljackpot:${getTodayDateString()}`,
          event: e,
          emoji: '🎰'
        });
      } else {
        awardXpOnly(Math.min(180, prize.xpBonus || 120), e, '🎡');
      }
    },
    [awardFairReward, awardXpOnly]
  );

  const handleClaimQuestReward = useCallback(
    (quest, e) => {
      if (!quest || claimedQuests[quest.id]) return;
      const today = getTodayDateString();
      setClaimedQuests((prev) => ({ ...prev, [quest.id]: true }));
      sfx.playJackpot();
      awardFairReward({
        category: 'quests',
        requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.QUEST_CLAIM.tokens,
        xpGain: Math.min(150, quest.rewardXp || ARCADE_ECONOMY_RULES.REWARDS.QUEST_CLAIM.xp),
        actionKey: `daily:quest:${quest.id}:${today}`,
        event: e,
        emoji: '🎁'
      });
    },
    [claimedQuests, awardFairReward]
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

      if (typeof window !== 'undefined') {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const bursts = [
          { x: w * 0.25, y: h * 0.3, emoji: '👑', label: 'GOD MODE!' },
          { x: w * 0.75, y: h * 0.3, emoji: '💎', label: canClaimReward ? '+5 🪙!' : 'FIREWORKS!' },
          { x: w * 0.5, y: h * 0.45, emoji: '🚀', label: 'GIGA-CHAD!' }
        ];
        bursts.forEach((b, idx) => {
          setTimeout(() => {
            spawnParticles(b.x, b.y, b.label, b.emoji);
          }, (idx + 1) * 200);
        });
      }
    },
    [rateWindows.konamiLastClaim, addCappedWheelSpins, awardFairReward, spawnParticles, setGoblinFortuneToast]
  );

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

  const recordWildGoblinReward = useCallback(
    (wasManual, e) => {
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

      if (wasManual) {
        awardXpOnly(20, e, '👾', '+20 XP (Practice Goblin)');
        setGoblinFortuneToast(
          '👾 PRACTICE GOBLIN CAUGHT! +20 XP! (Natural wild roaming goblins drop +5 🪙 1x/day!)'
        );
      } else {
        const res = awardFairReward({
          category: 'quests',
          requestedTokens: ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.tokens,
          xpGain: ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.xp,
          actionKey: `daily:goblin:${getTodayDateString()}`,
          event: e,
          emoji: '👾'
        });
        const fortune = MEME_FORTUNES[Math.floor(Math.random() * MEME_FORTUNES.length)];
        setGoblinFortuneToast(
          res.awardedTokens > 0
            ? `👾 WILD GOLDEN GOBLIN CAUGHT! +${res.awardedTokens} 🪙 & +60 XP! ${fortune}`
            : `👾 GOBLIN CAUGHT! (+20 XP — Daily Goblin token bonus already claimed today!)`
        );
      }
    },
    [awardFairReward, awardXpOnly, setGoblinFortuneToast]
  );

  return {
    xp,
    setXp,
    xpConverted,
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
    fluxBonusClaimedToday,
    xpConversionState,
    unclaimedRewardsCount,
    addCappedWheelSpins,
    incrementQuest,
    awardXpOnly,
    awardFairReward,
    awardXpAndCombo,
    handleSpendTokens,
    handleEquipCosmetic,
    handleBuyOrUnlockCosmetic,
    handleClaimGoldenMeme,
    handlePayoutGameTokens,
    claimStarterPackIfFirst,
    handleWinPinataReward,
    handleClaimPayphoneCoinReturn,
    handleClaimDeLoreanFluxBonus,
    handleBossSecretXp,
    handleExchangeXpForTokens,
    handleToggleXpAutoConvert,
    awardUploadTokensWithPioneerCheck,
    handleClaimDailyStreak,
    handleCompleteWheelSpin,
    handleClaimQuestReward,
    handleTriggerKonamiGodMode,
    recordWildGoblinReward
  };
}
