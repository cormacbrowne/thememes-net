// ==========================================
// PHASE 2.4: CONFIG-DRIVEN ACHIEVEMENT BADGES
// Add a new badge entry here — zero component changes required.
// ==========================================

export const BADGE_CONFIG = [
  {
    id: 'first-meme',
    icon: '🎨',
    name: 'First Meme',
    desc: 'Created and posted your first meme to the feed',
    metric: 'memeCount',
    threshold: 1
  },
  {
    id: 'first-battle',
    icon: '⚔️',
    name: 'First Battle',
    desc: 'Entered a Daily Caption Battle',
    metric: 'battleEntries',
    threshold: 1
  },
  {
    id: 'podium-finish',
    icon: '🏅',
    name: 'Podium Finish',
    desc: 'Placed in the top 3 of a Daily Caption Battle',
    metric: 'podiumFinishes',
    threshold: 1
  },
  {
    id: 'battle-champion',
    icon: '🏆',
    name: 'Battle Champion',
    desc: 'Won 1st place in a Daily Caption Battle',
    metric: 'captionWins',
    threshold: 1
  },
  {
    // Preserves id 'caption-king' for Hall of Famer crown checks
    id: 'caption-king',
    icon: '👑',
    name: 'Hall of Famer',
    desc: 'Earned a permanent spot in the Caption Hall of Fame',
    test: (stats) => Boolean(stats.isCaptionKing || (Number(stats.captionWins) || 0) >= 1)
  },
  {
    id: 'streak-7',
    icon: '🔥',
    name: '7-Day Streak',
    desc: 'Stayed active for 7 consecutive days',
    metric: 'streakPeak',
    threshold: 7
  },
  {
    id: 'streak-30',
    icon: '☄️',
    name: '30-Day Streak',
    desc: 'Reached an epic 30-day activity streak',
    metric: 'streakPeak',
    threshold: 30
  },
  {
    id: 'upvotes-100',
    icon: '⚡',
    name: '100 Upvotes',
    desc: 'Collected 100+ real upvotes across your memes',
    metric: 'totalUpvotes',
    threshold: 100
  },
  {
    id: 'remix-master',
    icon: '🧬',
    name: 'Remix Master',
    desc: 'Remixed or inspired 5+ community meme evolutions',
    test: (stats) =>
      (Number(stats.remixesSpawned) || 0) >= 5 || (Number(stats.remixesCreated) || 0) >= 5
  },
  {
    id: 'wholesome-hero',
    icon: '💛',
    name: 'Wholesome Hero',
    desc: 'Shared a meme in the Wholesome category',
    metric: 'wholesomeMemes',
    threshold: 1
  }
];

export function evaluateBadges(rawStats = {}) {
  const stats = {
    memeCount: Math.max(0, Number(rawStats.memeCount ?? rawStats.authoredMemesCount) || 0),
    battleEntries: Math.max(0, Number(rawStats.battleEntries) || 0),
    podiumFinishes: Math.max(
      0,
      Number(rawStats.podiumFinishes) || 0,
      Number(rawStats.captionWins) || 0
    ),
    captionWins: Math.max(0, Number(rawStats.captionWins) || 0),
    isCaptionKing: Boolean(rawStats.isCaptionKing),
    streakPeak: Math.max(
      0,
      Number(rawStats.streakDays) || 0,
      Number(rawStats.bestStreak) || 0,
      Number(rawStats.streakPeak) || 0
    ),
    totalUpvotes: Math.max(0, Number(rawStats.totalUpvotes ?? rawStats.totalScore) || 0),
    remixesSpawned: Math.max(0, Number(rawStats.remixesSpawned) || 0),
    remixesCreated: Math.max(0, Number(rawStats.remixesCreated) || 0),
    wholesomeMemes: Math.max(0, Number(rawStats.wholesomeMemes) || 0)
  };

  return BADGE_CONFIG.map((cfg) => {
    const unlocked =
      typeof cfg.test === 'function'
        ? Boolean(cfg.test(stats))
        : (Number(stats[cfg.metric]) || 0) >= (cfg.threshold || 1);
    return {
      id: cfg.id,
      icon: cfg.icon,
      name: cfg.name,
      desc: cfg.desc,
      unlocked
    };
  });
}
