// Plan 2.9 — Seasonal configuration: festive skin switcher + "12 Days of Memes" battle series.
import { SEASONAL_SKIN } from './featureFlags.js';

export const VALID_SEASONAL_SKINS = ['off', 'christmas', 'newyear', 'auto'];

/**
 * Resolves the active site-wide seasonal skin:
 * - Optional URL override (?season=christmas|newyear|off) for preview & QA
 * - Explicit feature flag ('christmas' | 'newyear' | 'off')
 * - Automatic calendar window when flag === 'auto' (1–26 Dec = christmas, 27 Dec–5 Jan = newyear)
 */
export function getActiveSeasonalSkin({
  flag = SEASONAL_SKIN,
  search = '',
  now = new Date()
} = {}) {
  const cleanSearch = String(search || '').trim();
  if (cleanSearch) {
    try {
      const qs = new URLSearchParams(cleanSearch.startsWith('?') ? cleanSearch : `?${cleanSearch}`);
      const override = String(qs.get('season') || '').trim().toLowerCase();
      if (override === 'christmas' || override === 'newyear' || override === 'off') {
        return override;
      }
    } catch {
      // ignore malformed query strings
    }
  }

  const mode = String(flag || 'off').trim().toLowerCase();
  if (mode === 'christmas' || mode === 'newyear') return mode;
  if (mode !== 'auto') return 'off';

  const d = now instanceof Date && Number.isFinite(now.getTime()) ? now : new Date();
  const month = d.getUTCMonth(); // 0 = Jan, 11 = Dec
  const day = d.getUTCDate();
  if (month === 11 && day >= 1 && day <= 26) return 'christmas';
  if ((month === 11 && day >= 27) || (month === 0 && day <= 5)) return 'newyear';
  return 'off';
}

export const TWELVE_DAYS_OF_MEMES = Object.freeze([
  {
    dayNumber: 1,
    monthDay: '12-13',
    title: 'Day 1: Skipping Plans to Scroll Memes',
    theme: '12 Days of Memes',
    prompt: 'Holiday invites vs. staying wrapped in a blanket scrolling memes all night',
    defaultTemplateId: 'tpl-drake-compare'
  },
  {
    dayNumber: 2,
    monthDay: '12-14',
    title: 'Day 2: Levels of Holiday Gift Shopping',
    theme: '12 Days of Memes',
    prompt: 'From spreadsheets in October to gas-station gift cards at 11:45 PM on 24 Dec',
    defaultTemplateId: 'tpl-expanding-brain'
  },
  {
    dayNumber: 3,
    monthDay: '12-15',
    title: 'Day 3: One Festive Button Choice',
    theme: '12 Days of Memes',
    prompt: 'Save money for Q1 vs. buy everyone absurd novelty mugs and lights',
    defaultTemplateId: 'tpl-two-buttons'
  },
  {
    dayNumber: 4,
    monthDay: '12-16',
    title: 'Day 4: Eyeing the Holiday Buffet',
    theme: '12 Days of Memes',
    prompt: 'Your New Year fitness plan watching you eye the third tray of mince pies',
    defaultTemplateId: 'tpl-distracted-choice'
  },
  {
    dayNumber: 5,
    monthDay: '12-17',
    title: 'Day 5: Deploying on the Last Friday Before Christmas',
    theme: '12 Days of Memes',
    prompt: 'When Slack pings after 4 PM while Mariah Carey plays in the background',
    defaultTemplateId: 'tpl-this-is-fine'
  },
  {
    dayNumber: 6,
    monthDay: '12-18',
    title: 'Day 6: Die Hard & Festive Food Debates',
    theme: '12 Days of Memes',
    prompt: 'Drop your boldest festive hot take at the table and defend it',
    defaultTemplateId: 'tpl-change-my-mind'
  },
  {
    dayNumber: 7,
    monthDay: '12-19',
    title: 'Day 7: Out of Office Energy vs. Still Working',
    theme: '12 Days of Memes',
    prompt: 'Coworkers already on holiday vs. you answering "quick question" emails',
    defaultTemplateId: 'tpl-buff-vs-smol'
  },
  {
    dayNumber: 8,
    monthDay: '12-20',
    title: 'Day 8: Holiday Nap & Gravy Economy',
    theme: '12 Days of Memes',
    prompt: 'When the biscuit tin actually has real biscuits instead of sewing kits',
    defaultTemplateId: 'tpl-stonks-up'
  },
  {
    dayNumber: 9,
    monthDay: '12-21',
    title: 'Day 9: Bank Account After December',
    theme: '12 Days of Memes',
    prompt: 'Checking your balance after buying "just one small Secret Santa gift"',
    defaultTemplateId: 'tpl-not-stonks'
  },
  {
    dayNumber: 10,
    monthDay: '12-22',
    title: 'Day 10: Untangling the Tree Lights',
    theme: '12 Days of Memes',
    prompt: 'Four degrees of enlightenment while one dead bulb knocks out the whole string',
    defaultTemplateId: 'tpl-expanding-brain'
  },
  {
    dayNumber: 11,
    monthDay: '12-23',
    title: 'Day 11: Wrapping Gifts With Pure Chaos',
    theme: '12 Days of Memes',
    prompt: 'Precision origami corners vs. 19 layers of Sellotape and optimism',
    defaultTemplateId: 'tpl-drake-compare'
  },
  {
    dayNumber: 12,
    monthDay: '12-24',
    title: 'Day 12: Christmas Eve Everything-is-Fine Finale',
    theme: '12 Days of Memes',
    prompt: 'Caption the grand Christmas Eve finale — crown & Hall of Fame glory await!',
    defaultTemplateId: 'tpl-this-is-fine'
  }
]);

export function buildTwelveDaysSchedule(year = new Date().getUTCFullYear()) {
  const y = Number.isInteger(Number(year)) ? Number(year) : new Date().getUTCFullYear();
  return TWELVE_DAYS_OF_MEMES.map((item) => ({
    ...item,
    battleDay: `${y}-${item.monthDay}`
  }));
}
