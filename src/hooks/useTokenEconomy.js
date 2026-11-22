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
  CURRENCY_BRAND,
  loadTokenLedger,
  saveTokenLedger,
  loadTokenBalance,
  saveTokenBalance,
  loadMemeCentzBalance,
  saveMemeCentzBalance,
  loadDailyCentzEarned,
  saveDailyCentzEarned,
  evaluateTokenAward,
  formatMoney,
  hasActionBeenRewarded,
  validateStakedGamePayout,
  computeXpConversionState,
  getTodayDateString
} from '../utils/tokenEconomy';
import { setRadioStation, radioEvent } from '../utils/radioBus';
import { getSupabaseClient } from '../supabaseClient';
import {
  XP_AWARDS,
  applyDailyActivity,
  getLevelForXp,
  getLondonDateKey,
  getLondonIsoWeek
} from '../config/progression';
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
  const [memeCentz, setMemeCentz] = useState(() => loadMemeCentzBalance());
  const memeCentzRef = useRef(memeCentz);
  const [dailyCentzEarned, setDailyCentzEarned] = useState(() => loadDailyCentzEarned());
  const dailyCentzRef = useRef(dailyCentzEarned);
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

  const [streakDays, setStreakDays] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tm_activity_streak_v1') || 'null');
      if (saved && typeof saved.streakDays === 'number') return Math.max(0, saved.streakDays);
    } catch {
      // ignore
    }
    return Number(localStorage.getItem('tm_streak_days') || 0);
  });
  const [bestStreak, setBestStreak] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tm_activity_streak_v1') || 'null');
      if (saved && typeof saved.bestStreak === 'number') return Math.max(0, saved.bestStreak);
    } catch {
      // ignore
    }
    return Number(localStorage.getItem('tm_streak_days') || 0);
  });
  const [activityMeta, setActivityMeta] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tm_activity_streak_v1') || 'null');
      return {
        lastActiveDay: saved?.lastActiveDay || null,
        freezeUsedWeek: saved?.freezeUsedWeek || null,
        actionsToday: saved?.actionsToday || {}
      };
    } catch {
      return { lastActiveDay: null, freezeUsedWeek: null, actionsToday: {} };
    }
  });
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

  const currentRank = useMemo(() => getLevelForXp(xp), [xp]);
  const levelInfo = currentRank;
  const streakFreezeAvailable = useMemo(
    () => activityMeta.freezeUsedWeek !== getLondonIsoWeek(getLondonDateKey()),
    [activityMeta.freezeUsedWeek]
  );

  useEffect(() => {
    try {
      localStorage.setItem('tm_streak_days', String(streakDays));
      localStorage.setItem(
        'tm_activity_streak_v1',
        JSON.stringify({
          streakDays,
          bestStreak,
          lastActiveDay: activityMeta.lastActiveDay,
          freezeUsedWeek: activityMeta.freezeUsedWeek,
          actionsToday: activityMeta.actionsToday || {}
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [streakDays, bestStreak, activityMeta]);

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
    memeCentzRef.current = memeCentz;
    saveMemeCentzBalance(memeCentz);
  }, [memeCentz]);
  useEffect(() => {
    dailyCentzRef.current = dailyCentzEarned;
    saveDailyCentzEarned(dailyCentzEarned);
  }, [dailyCentzEarned]);
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

  const handleEarnMemeCentz = useCallback(
    (centzAmount = 10, event = null, label = '') => {
      const cleanCentz = Math.max(0, Math.floor(Number(centzAmount) || 0));
      if (cleanCentz <= 0) return { awardedCentz: 0, rolledOverDollarz: 0 };

      const remainingCap = Math.max(0, CURRENCY_BRAND.maxDailyCentz - dailyCentzRef.current);
      const allowedCentz = Math.min(cleanCentz, remainingCap);
      if (allowedCentz <= 0) return { awardedCentz: 0, rolledOverDollarz: 0 };

      dailyCentzRef.current += allowedCentz;
      setDailyCentzEarned(dailyCentzRef.current);

      const combined = memeCentzRef.current + allowedCentz;
      const rolledOverDollarz = Math.floor(combined / 25);
      const nextCentz = combined % 25;
      memeCentzRef.current = nextCentz;
      setMemeCentz(nextCentz);

      if (rolledOverDollarz > 0) {
        tokensRef.current += rolledOverDollarz;
        setTokens(tokensRef.current);
        sfx.playJackpot?.();
      }

      const clientX = event?.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);
      const clientY = event?.clientY || 120;
      const badge =
        rolledOverDollarz > 0
          ? `${formatMoney(rolledOverDollarz, { sign: true })} MemeDollarz!`
          : `+${allowedCentz}¢ ${label || 'MemeCentz'}`;
      spawnParticles(clientX, clientY, badge, rolledOverDollarz > 0 ? '💵' : '💰');
      return { awardedCentz: allowedCentz, rolledOverDollarz };
    },
    [spawnParticles]
  );

  const awardFairReward = useCallback(
    ({
      category = 'engagement',
      requestedTokens = 0,
      xpGain = 15,
      actionKey = null,
      event = null,
      emoji = '💰'
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
          awardXpOnly(xpGain, event, emoji, `+${xpGain} XP (Daily Cap Reached)`);
        }
        return evalRes;
      }

      setTokenLedger(evalRes.nextLedger);
      setTokens((prev) => prev + evalRes.awardedTokens);
      awardXpOnly(
        xpGain,
        event,
        emoji,
        `${formatMoney(evalRes.awardedTokens, { sign: true })} & +${xpGain} XP`
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
    (
      rawPayout,
      { stakedTokens = 0, xp: xpGain = 20, label = '', emoji = '💰', maxMultiplier = 160, skipCelebration = false } = {}
    ) => {
      const verified = validateStakedGamePayout({
        stakedTokens,
        rawPayout,
        maxMultiplier
      });
      if (verified <= 0) return 0;
      tokensRef.current += verified;
      setTokens(tokensRef.current);
      if (xpGain > 0) {
        awardXpOnly(xpGain, null, emoji, label || `+M$${verified} MemeDollarz`);
      }
      if (!skipCelebration && verified >= 2 && !wasCelebrationRecentlyTriggered(500)) {
        triggerWinCelebration({
          amount: verified,
          unit: 'M$',
          headline: label || `+M$${verified} MemeDollarz WON!`,
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
      spawnParticles(x, y, `🎁 Starter Pack: ${formatMoney(bonus, { sign: true })}!`, '🎁');
      setGoblinFortuneToast(`🎁 Starter Pack: ${formatMoney(bonus, { sign: true })}! Play any arcade cabinet.`);
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

  /**
   * Plan 2.1: Daily Caption Battle podium prize. Only called with the amount the SERVER
   * returned from claim_battle_award() (which pays out once per battle per player), so it
   * sits outside the daily earning caps; still de-duplicated per battle locally and capped.
   */
  const handleClaimBattlePrize = useCallback(
    (battleId, mdollarz, rank) => {
      const amount = Math.max(0, Math.min(ARCADE_ECONOMY_RULES.MAX_BATTLE_PRIZE, Math.floor(Number(mdollarz) || 0)));
      const actionKey = `battle_prize:${battleId}`;
      if (!battleId || amount <= 0 || tokenLedger?.rewardedActionKeys?.includes(actionKey)) return 0;
      setTokenLedger((prev) => ({
        ...prev,
        rewardedActionKeys: [...(prev?.rewardedActionKeys || []), actionKey]
      }));
      setTokens((prev) => prev + amount);
      awardXpOnly(rank === 1 ? 150 : 75, null, '🏆', `${formatMoney(amount, { sign: true })} battle prize!`);
      return amount;
    },
    [tokenLedger, awardXpOnly]
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
        `⚡ XP REACTOR: ${formatMoney(evalRes.awardedTokens, { sign: true })}!`,
        '⚡'
      );

      setGoblinFortuneToast(
        `⚡ XP-TO-MEMEDOLLARZ REACTOR: Converted ${xpConsumed} XP → ${formatMoney(evalRes.awardedTokens, { sign: true })}! (Your Lv.${currentRank.level} Rank XP stays intact!)`
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
        totalAwarded > 0 ? `${formatMoney(totalAwarded, { sign: true })} & +${gainedXp} XP!` : `+${gainedXp} XP`
      );

      if (totalAwarded > baseTokens) {
        setGoblinFortuneToast(
          `🌟 FIRST MEME PIONEER BONUS UNLOCKED! ${formatMoney(totalAwarded, { sign: true })} added to your Wallet!`
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
          `🕹️ SECRET KONAMI GOD MODE ACTIVATED! ${formatMoney(res.awardedTokens, { sign: true })}, +100 XP & "⚡ GOD MODE: GIGA-CHAD" Title Unlocked!`
        );
      } else {
        const rem = ARCADE_RATE_LIMITS.KONAMI_COOLDOWN_MS - (now - rateWindows.konamiLastClaim);
        setGoblinFortuneToast(
          `🎇 GOD MODE FIREWORKS! (24h Konami bonus resets in ${formatWindowCountdown(rem)})`
        );
      }
      setTimeout(() => setGoblinFortuneToast(''), 6500);

      if (typeof window !== 'undefined') {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const bursts = [
          { x: w * 0.25, y: h * 0.3, emoji: '👑', label: 'GOD MODE!' },
          { x: w * 0.75, y: h * 0.3, emoji: '💎', label: canClaimReward ? `${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.KONAMI_DAILY.tokens, { sign: true })}!` : 'FIREWORKS!' },
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
          `👾 PRACTICE GOBLIN CAUGHT! +20 XP! (Wild roaming goblins drop ${formatMoney(ARCADE_ECONOMY_RULES.REWARDS.GOBLIN_CATCH.tokens, { sign: true })} 1x/day!)`
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
            ? `👾 WILD GOLDEN GOBLIN CAUGHT! ${formatMoney(res.awardedTokens, { sign: true })} & +60 XP! ${fortune}`
            : '👾 GOBLIN CAUGHT! (+20 XP — Daily Goblin bonus already claimed today!)'
        );
      }
    },
    [awardFairReward, awardXpOnly, setGoblinFortuneToast]
  );

  const syncProgressionFromProfile = useCallback((profile) => {
    if (!profile) return;
    if (typeof profile.xp === 'number' && profile.xp > 0) {
      setXp((prev) => Math.max(prev, profile.xp));
    }
    if (typeof profile.streakDays === 'number' && profile.streakDays > 0) {
      setStreakDays((prev) => Math.max(prev, profile.streakDays));
    }
    if (typeof profile.bestStreak === 'number' && profile.bestStreak > 0) {
      setBestStreak((prev) => Math.max(prev, profile.bestStreak));
    }
    if (profile.lastActiveDay || profile.freezeUsedWeek) {
      setActivityMeta((prev) => ({
        ...prev,
        lastActiveDay: profile.lastActiveDay || prev.lastActiveDay,
        freezeUsedWeek: profile.freezeUsedWeek || prev.freezeUsedWeek
      }));
    }
  }, []);

  const recordMeaningfulActivity = useCallback(
    async (action) => {
      const cleanAction = String(action || '').toLowerCase();
      if (!XP_AWARDS[cleanAction]) return null;
      const londonDay = getLondonDateKey();
      const nextStreakResult = applyDailyActivity(
        {
          streakDays,
          bestStreak,
          lastActiveDay: activityMeta.lastActiveDay,
          freezeUsedWeek: activityMeta.freezeUsedWeek
        },
        londonDay
      );

      setStreakDays(nextStreakResult.streakDays);
      setBestStreak(nextStreakResult.bestStreak);
      const alreadyDoneToday = Boolean(activityMeta.actionsToday?.[`${londonDay}:${cleanAction}`]);
      setActivityMeta((prev) => ({
        lastActiveDay: nextStreakResult.lastActiveDay,
        freezeUsedWeek: nextStreakResult.freezeUsedWeek,
        actionsToday: {
          [`${londonDay}:${cleanAction}`]: true,
          ...(prev.actionsToday || {})
        }
      }));
      if (!alreadyDoneToday) {
        awardXpOnly(XP_AWARDS[cleanAction], null, '🔥', `+${XP_AWARDS[cleanAction]} XP`);
      }

      if (nextStreakResult.freezeUsed) {
        setGoblinFortuneToast('❄️ Weekly Streak Freeze used automatically — your 🔥 streak survived!');
        setTimeout(() => setGoblinFortuneToast(''), 4500);
      }

      const client = getSupabaseClient();
      if (client?.rpc && client?.auth?.getSession) {
        try {
          const { data: sess } = await client.auth.getSession();
          if (sess?.session?.user && !sess.session.user.is_anonymous) {
            const { data } = await client.rpc('record_daily_activity', { p_action: cleanAction });
            if (data?.ok) {
              if (typeof data.xp === 'number') setXp((p) => Math.max(p, data.xp));
              if (typeof data.streak_days === 'number') setStreakDays(data.streak_days);
              if (typeof data.best_streak === 'number') setBestStreak(data.best_streak);
              setActivityMeta((prev) => ({
                ...prev,
                lastActiveDay: data.last_active_day || prev.lastActiveDay,
                freezeUsedWeek: data.freeze_used_week ?? prev.freezeUsedWeek
              }));
            }
          }
        } catch {
          // non-fatal offline fallback
        }
      }
      return nextStreakResult;
    },
    [streakDays, bestStreak, activityMeta, awardXpOnly, setGoblinFortuneToast]
  );

  return {
    xp,
    setXp,
    xpConverted,
    xpAutoConvert,
    reactorFlash,
    tokens,
    memeCentz,
    dailyCentzEarned,
    tokenLedger,
    combo,
    comboTimer,
    levelUpBanner,
    currentRank,
    levelInfo,
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
    bestStreak,
    streakFreezeAvailable,
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
    handleEarnMemeCentz,
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
    handleClaimBattlePrize,
    handleBossSecretXp,
    handleExchangeXpForTokens,
    handleToggleXpAutoConvert,
    awardUploadTokensWithPioneerCheck,
    handleClaimDailyStreak,
    handleCompleteWheelSpin,
    handleClaimQuestReward,
    handleTriggerKonamiGodMode,
    recordWildGoblinReward,
    recordMeaningfulActivity,
    syncProgressionFromProfile
  };
}
