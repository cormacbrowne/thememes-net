// ==========================================
// USER-UPLOADED MEME HELPERS, DATE FORMATTER & ARCADE DATA
// (100% User-Uploaded Memes — Zero Default Template Memes)
// ==========================================

export const STARTER_MEMES = [];

export const STUDIO_TEMPLATES = [];

/**
 * Formats a meme's `created_at` ISO timestamp into a clear human-readable upload date,
 * relative time string, and `isNewToday` (< 24h) flag so you can track new user uploads at a glance.
 */
export function formatMemeUploadDate(createdAt) {
  if (!createdAt) {
    return {
      dateOnly: 'Unknown date',
      dateTime: 'Unknown upload date',
      relative: 'Recently',
      fullLabel: 'Uploaded recently',
      isNewToday: false
    };
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return {
      dateOnly: 'Unknown date',
      dateTime: 'Unknown upload date',
      relative: 'Recently',
      fullLabel: 'Uploaded recently',
      isNewToday: false
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative = 'Just now';
  if (diffMins >= 1 && diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffHours >= 1 && diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays >= 1 && diffDays < 30) {
    relative = `${diffDays}d ago`;
  } else if (diffDays >= 30) {
    relative = `${Math.floor(diffDays / 30)}mo ago`;
  }

  const dateOnly = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const timeOnly = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isNewToday = diffHours < 24;

  return {
    dateOnly,
    dateTime: `${dateOnly}, ${timeOnly}`,
    relative,
    fullLabel: `${dateOnly} (${relative})`,
    isNewToday
  };
}

export const VIRAL_CAPTIONS = [
  ['ME PRETENDING TO LISTEN', 'WHILE THINKING ABOUT PIZZA & GARLIC BREAD'],
  ['WHEN SOMEONE SAYS', '"WE NEED TO TALK" AT 9 AM'],
  ['MY LAST TWO BRAINCELLS', 'FIGHTING FOR THIRD PLACE'],
  ['WHEN THE SQUAD SAYS', '"JUST ONE MORE GAME" AT 11 PM'],
  ['SOCIETY IF EVERYONE', 'UPVOTED THE MEMES THEY LAUGHED AT'],
  ['OPENING THE FRIDGE 6 TIMES', 'EXPECTING NEW SNACKS TO SPAWN'],
  ['MY PET LOOKING AT ME', 'AFTER KNOCKING EVERYTHING OFF THE TABLE'],
  ['WHEN YOUR CODE WORKS', 'ON THE VERY FIRST TRY'],
  ['SLEEP SCHEDULE SO BROKEN', 'I HAVE JETLAG IN MY OWN TIMEZONE'],
  ['ME EXPLAINING MY HOBBIES', 'TO SOMEONE WHO JUST SAID HELLO'],
  ['EXPECTATION: EARLY NIGHT', 'REALITY: WIKIPEDIA RABBIT HOLE AT 2 AM'],
  ['WHEN THE WIFI DROPS', 'FOR 0.5 SECONDS MID-MATCH']
];

export const RANKS = [
  { level: 1, title: 'Arcade Newcomer', minXp: 0 },
  { level: 2, title: 'Meme Rookie', minXp: 150 },
  { level: 3, title: 'Meme Tactician', minXp: 400 },
  { level: 4, title: 'Vibe Inspector', minXp: 800 },
  { level: 5, title: 'Remix Hero', minXp: 1400 },
  { level: 6, title: 'Meme Champion', minXp: 2200 },
  { level: 7, title: 'Joy Architect', minXp: 3200 },
  { level: 8, title: 'Grandmaster of Memes', minXp: 4500 },
  { level: 9, title: 'Supernova Creator', minXp: 6500 },
  { level: 10, title: 'Cosmic Meme Legend', minXp: 9000 }
];

export const WHEEL_REWARDS = [
  {
    id: 'title-star',
    label: '🌟 Title: Supernova Star',
    flair: '🌟 Supernova Star',
    xpBonus: 180,
    color: '#ec4899'
  },
  {
    id: 'xp-jackpot',
    label: '🪙 MEGA JACKPOT +500 XP!',
    flair: null,
    xpBonus: 500,
    color: '#facc15'
  },
  {
    id: 'title-certified',
    label: '🔥 Title: Certified Meme Legend',
    flair: '🔥 Certified Meme Legend',
    xpBonus: 200,
    color: '#f97316'
  },
  {
    id: 'xp-supernova',
    label: '🚀 SUPERNOVA +350 XP!',
    flair: null,
    xpBonus: 350,
    color: '#00f3ff'
  },
  {
    id: 'title-alchemist',
    label: '🧬 Title: Remix Alchemist',
    flair: '🧬 Remix Alchemist',
    xpBonus: 180,
    color: '#a855f7'
  },
  {
    id: 'title-10x',
    label: '👑 Title: 10x Vibe Champion',
    flair: '👑 10x Vibe Champion',
    xpBonus: 220,
    color: '#22c55e'
  },
  {
    id: 'xp-mystery',
    label: '🎁 MYSTERY CRATE +300 XP!',
    flair: null,
    xpBonus: 300,
    color: '#38bdf8'
  },
  {
    id: 'title-holo',
    label: '🌈 Title: Holo-Foil Sovereign',
    flair: '🌈 Holo-Foil Sovereign',
    xpBonus: 250,
    color: '#eab308'
  }
];

export const DAILY_QUESTS = [
  {
    id: 'q-upvote',
    icon: '🔥',
    title: 'Arena Voter',
    desc: 'Upvote or Hyper-Swipe 3 community memes',
    target: 3,
    rewardXp: 150
  },
  {
    id: 'q-react',
    icon: '😂',
    title: 'Emoji Reactor',
    desc: 'Drop 3 emoji reactions (🔥, 💀, 😂, 🗿)',
    target: 3,
    rewardXp: 120
  },
  {
    id: 'q-soundboard',
    icon: '🎹',
    title: 'Soundboard DJ',
    desc: 'Play 3 pads on the 16-Pad Comedy Soundboard',
    target: 3,
    rewardXp: 100
  },
  {
    id: 'q-roast',
    icon: '🤖',
    title: 'AI Vibe Scanner',
    desc: 'Scan any meme with the AI Dank-O-Meter tool',
    target: 1,
    rewardXp: 175
  },
  {
    id: 'q-mutate',
    icon: '📸',
    title: 'Community Creator',
    desc: 'Upload or Remix 1 meme in the Meme Forge Studio',
    target: 1,
    rewardXp: 250
  }
];

export const MEME_STOCK_TICKER = [
  { symbol: '$UPLOADS', delta: '+100%', up: true, category: 'all', label: '100% Real User Memes' },
  { symbol: '$DANK', delta: '+42.0%', up: true, category: 'dank', label: 'Viral Laughs Surging' },
  { symbol: '$GAMING', delta: '+64.8%', up: true, category: 'gaming', label: 'Squad Wins & Clips' },
  { symbol: '$RELATABLE', delta: '+88.2%', up: true, category: 'relatable', label: 'Everyday Vibes Peaking' },
  { symbol: '$TECH', delta: '+51.4%', up: true, category: 'tech', label: 'Coding & AI Humor' },
  { symbol: '$REMIXES', delta: '+29.5%', up: true, category: 'all', label: '+50 XP Creator Royalties Live' },
  { symbol: '$SOUNDBOARD', delta: '+420.0%', up: true, category: 'all', label: '16 Comedy Pads Active' }
];

export const CHAOS_MUTATORS = [
  { id: 'none', label: '✨ Normal', desc: 'Standard Cyber-Arcade Reality' },
  { id: 'rave', label: '🕺 Disco Party', desc: 'Neon Rainbow Party Glow' },
  { id: 'australian', label: '🙃 Upside-Down', desc: 'Australian Gravity Inversion' },
  { id: 'deepfry', label: '🍗 Crispy Pop', desc: 'Maximum Vibrant Saturation Overdrive' },
  { id: 'matrix', label: '🕶️ Cyber Green', desc: 'Retro Green Phosphor Vision' }
];

export const CURSOR_TRAILS = [
  { id: 'none', label: '🚫 No Trail', emoji: '' },
  { id: 'fire', label: '🔥 Fire Trail', emoji: '🔥' },
  { id: 'star', label: '🌟 Star Sparkle', emoji: '🌟' },
  { id: 'diamond', label: '💎 Diamond Trail', emoji: '💎' },
  { id: 'duck', label: '🦆 Duck Army Trail', emoji: '🦆' },
  { id: 'crown', label: '👑 Royal Crown Trail', emoji: '👑' }
];

export const SLOT_SYMBOLS = [
  { id: 'star', emoji: '🌟', name: 'Supernova Star', mult: 3 },
  { id: 'fire', emoji: '🔥', name: 'Arcade Fire', mult: 4 },
  { id: 'moai', emoji: '🗿', name: 'Giga Moai', mult: 5 },
  { id: 'clown', emoji: '😂', name: 'Laugh Riot', mult: 3 },
  { id: 'duck', emoji: '🦆', name: 'Golden Duck', mult: 6 },
  { id: 'diamond', emoji: '💎', name: 'Cyber Diamond', mult: 10 }
];

// ==========================================
// PHASE 17: TIMED-WINDOW ECONOMY & SPIN RATE LIMITS
// ==========================================
export const ARCADE_RATE_LIMITS = {
  MAX_STORED_WHEEL_SPINS: 5,
  WHEEL_SPINS_PER_WINDOW: 3,
  WHEEL_WINDOW_MS: 60 * 60 * 1000,
  SLOT_PULLS_PER_WINDOW: 5,
  SLOT_WINDOW_MS: 15 * 60 * 1000,
  GOBLINS_PER_WINDOW: 2,
  GOBLIN_WINDOW_MS: 30 * 60 * 1000,
  KONAMI_COOLDOWN_MS: 24 * 60 * 60 * 1000
};

export function formatWindowCountdown(msRemaining) {
  if (!msRemaining || msRemaining <= 0) return 'Ready!';
  const totalSec = Math.ceil(msRemaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${secs}s`;
}

// ==========================================
// PHASE 18: SILLY ANIMATED SCREEN STAMPEDES & INTERACTIVE TOYS
// ==========================================
export const SILLY_STAMPEDES = [
  {
    id: 'duck-army',
    label: '🦆 Duck Stampede',
    desc: 'Unleash 20 waddling, honking rubber ducks across the screen!'
  },
  {
    id: 'moai-drop',
    label: '🗿 Moai Gravity Drop',
    desc: 'Drop heavy stone Moai statues from orbit with boom shockwaves!'
  },
  {
    id: 'pizza-rain',
    label: '🍕 Pizza Meteor Shower',
    desc: 'Rain spinning pepperoni pizzas, tacos & garlic bread from the sky!'
  },
  {
    id: 'nyan-cat',
    label: '🌈 Disco Cat Flyby',
    desc: 'Launch a supersonic rainbow cyber-cat & dancing frog convoy!'
  },
  {
    id: 'bubble-wrap',
    label: '🫧 Pop Bubble Wrap',
    desc: 'Spawn floating neon dopamine bubbles you can pop for XP & cartoon sounds!'
  }
];

// ==========================================
// PHASE 20: INTERACTIVE DANK TAMAGOTCHI CYBER-PET & COMIC POPS
// ==========================================
export const DANK_PET_STAGES = [
  {
    stage: 0,
    minFeeds: 0,
    name: 'Cyber Star-Egg',
    emoji: '🥚',
    title: 'Lv.1 Glowing Egg',
    quips: [
      'I hear happy arcade beats from inside my shell!',
      'Feed me a snack so I can hatch!',
      'Upload a cool meme and watch me grow!'
    ]
  },
  {
    stage: 1,
    minFeeds: 3,
    name: 'Happy Froglet',
    emoji: '🐸',
    title: 'Lv.2 Cozy Buddy',
    quips: [
      'Ribbit! Your memes make my day brighter!',
      'Have an awesome day, arcade legend!',
      'I love seeing fresh user uploads in the feed!'
    ]
  },
  {
    stage: 2,
    minFeeds: 7,
    name: 'Neon Drip Duck',
    emoji: '🦆',
    title: 'Lv.3 Quack Champion',
    quips: [
      'QUACK! Keep the good vibes rolling!',
      'My star sunglasses are 100% cool-certified.',
      'Honk if you smiled at a meme today!'
    ]
  },
  {
    stage: 3,
    minFeeds: 12,
    name: 'Cosmic Legend',
    emoji: '👑',
    title: 'Lv.MAX Arcade Royalty',
    quips: [
      '👑 Maximum friendship and meme power unlocked!',
      'You are officially a Hall of Fame legend!',
      '100% pure positive arcade energy!'
    ]
  }
];

export const COMIC_ACTION_WORDS = [
  'AWESOME! 🔥',
  'HAHA! 😂',
  'SUPER COOL! 🌟',
  'YEET! 🚀',
  'LEGEND! 👑',
  'BOIOIOING! 🌀',
  'SPICY! 🌶️',
  'EPIC WIN! 💥',
  'NANI?! ⚡',
  'QUACK! 🦆'
];

export const MEME_FORTUNES = [
  '🥠 Arcade Prophecy: Your next uploaded meme is destined for Viral Supernova status!',
  '🥠 Arcade Prophecy: Good vibes and unexpected laughs are heading your way today.',
  '🥠 Arcade Prophecy: You will open the refrigerator tonight and actually find your favorite snack.',
  '🥠 Arcade Prophecy: A remix of your meme will bring you +50 XP creator royalties soon!',
  '🥠 Arcade Prophecy: Someone across the world just smiled at a meme you upvoted.',
  '🥠 Arcade Prophecy: Your creativity level is operating at 1000% overdrive!'
];

/**
 * Generates a fun AI Vibe & Comedy Scanner analysis for any meme.
 */
export function generateAiMemeRoast(meme) {
  const score = Number(meme?.score || 100);
  const gen = Number(meme?.generation || 0);
  const titleLen = (meme?.title || '').length;
  const seed = (score + titleLen * 17 + gen * 31) % 100;

  const viralProbability = Math.min(99.8, Math.max(78.4, 82 + (seed % 18) + (score >= 1000 ? 4.2 : 0.5))).toFixed(1);
  const brainrotLevel = Math.min(99, 68 + (seed % 31));
  const spiceCount = score >= 1400 ? 5 : score >= 800 ? 4 : 3;

  const roastsByCategory = {
    tech: [
      `Our neural scanner detected 47 open browser tabs and pure genius in this upload. Certified ${viralProbability}% relatable to every tech fan!`,
      `This meme compiled with zero warnings and 100% comedy power. Shipping straight to the Hall of Fame!`,
      `Warning: Viewing this meme may cause spontaneous laughing during team calls.`
    ],
    gaming: [
      `This meme hits harder than clutch-winning a final boss fight with 1 HP remaining!`,
      `Pro Gamer analysis complete: 100% pure high-score comedy energy.`,
      `Our graphics card boosted its clock speed just to render the sheer coolness of this gaming upload.`
    ],
    relatable: [
      `I am in this meme and I love it! 10/10 everyday accuracy confirmed.`,
      `Comedy output: MAXIMUM. Everyone who has ever stayed up past midnight felt this in their soul.`,
      `Scientifically proven to boost your mood by 200% in under 3 seconds.`
    ],
    dank: [
      `Pure 24-karat cyber-arcade gold! Future historians will study this upload as peak internet comedy.`,
      `High-voltage humor detected! The Arcade Council has awarded this post maximum style points.`,
      `So effortlessly funny that even the AI scanner had to stop and upvote.`
    ]
  };

  const pool = roastsByCategory[meme?.category] || roastsByCategory.dank;
  const verdict = pool[(score + titleLen) % pool.length];

  return {
    viralProbability,
    tierVerdict: Number(viralProbability) >= 92 ? '🔥 CERTIFIED SUPERNOVA HIT' : '⚡ HIGH-VOLTAGE COMEDY',
    brainrotLevel: `${brainrotLevel}/100`,
    spiceStars: '⭐'.repeat(spiceCount),
    repostRisk: gen > 0 ? `🧬 GEN-${gen} Verified Remix` : '100% Original User Upload',
    verdict
  };
}

/**
 * Computes the visual Rarity / Heat Tier of a meme card based on score & remixes.
 */
export function getMemeRarityTier(meme) {
  const score = Number(meme?.score || 0);
  const remixes = Number(meme?.mutation_count || 0);
  if (score >= 1500 || remixes >= 3) {
    return {
      tier: 'supernova',
      label: '🔥 VIRAL SUPERNOVA',
      className: 'tm-tier-supernova'
    };
  }
  if (score >= 500 || remixes >= 1) {
    return {
      tier: 'heating',
      label: '⚡ HEATING UP',
      className: 'tm-tier-heating'
    };
  }
  return {
    tier: 'standard',
    label: null,
    className: 'tm-tier-standard'
  };
}

export const DAILY_BOUNTIES = [
  {
    id: 'bounty-pet-boss',
    tag: 'PETS & ANIMALS',
    prompt: 'Upload a funny pet or animal photo and caption what they are secretly thinking',
    category: 'relatable',
    defaultTop: 'ACT NATURAL...',
    defaultBottom: 'NOBODY KNOWS I ATE THE SNACKS',
    rewardXp: 200
  },
  {
    id: 'bounty-gaming-clutch',
    tag: 'GAMER MOMENTS',
    prompt: 'Upload a screenshot or photo showing that "One More Game" energy',
    category: 'gaming',
    defaultTop: 'SAID "ONE LAST MATCH" AT 9 PM',
    defaultBottom: 'IT IS NOW TOMORROW',
    rewardXp: 200
  },
  {
    id: 'bounty-weekend-vibes',
    tag: 'WEEKEND VIBES',
    prompt: 'Upload your funniest reaction image for when the weekend finally arrives',
    category: 'dank',
    defaultTop: 'FRIDAY 5:00 PM:',
    defaultBottom: 'MAXIMUM WEEKEND MODE ACTIVATED',
    rewardXp: 200
  }
];

/**
 * Computes unlocked Cyber-Arcade achievement badges for a given player profile.
 */
export function computePlayerBadges({
  authoredMemes = [],
  totalScore = 0,
  totalRemixesSpawned = 0,
  xp = 0,
  battleStreak = 0,
  bountiesCompleted = 0,
  unlockedFlairs = [],
  roastsRun = 0,
  goblinsCaught = 0,
  konamiUnlocked = false
}) {
  const hasMutation = authoredMemes.some((m) => (m.generation || 0) > 0) || totalRemixesSpawned > 0;
  const hasBountyMeme = authoredMemes.some((m) => m.is_bounty) || bountiesCompleted > 0;

  return [
    {
      id: 'first-drop',
      icon: '🚀',
      name: 'First Upload',
      desc: 'Uploaded an original meme to the community feed',
      unlocked: authoredMemes.length >= 1
    },
    {
      id: 'dna-architect',
      icon: '🧬',
      name: 'Remix Architect',
      desc: 'Remixed a meme or inspired a community remix tree',
      unlocked: hasMutation
    },
    {
      id: 'supernova-club',
      icon: '🔥',
      name: '1K Supernova',
      desc: 'Reached 1,000+ total score across uploaded memes',
      unlocked: totalScore >= 1000
    },
    {
      id: 'bounty-hunter',
      icon: '🎯',
      name: 'Bounty Champion',
      desc: 'Completed a Daily Meme Bounty challenge',
      unlocked: hasBountyMeme
    },
    {
      id: 'overdrive-lord',
      icon: '⚡',
      name: 'Arcade Regular',
      desc: 'Earned 400+ XP in the Cyber-Arcade',
      unlocked: xp >= 400 || totalScore >= 1800
    },
    {
      id: 'arena-gladiator',
      icon: '👑',
      name: 'King of the Hill',
      desc: 'Achieved a 3+ win streak in the 1v1 Battle Arena',
      unlocked: battleStreak >= 3 || totalScore >= 1400
    },
    {
      id: 'chaos-roller',
      icon: '🎰',
      name: 'Lucky Spinner',
      desc: 'Spun the Wheel of Chaos & unlocked a Custom Flair',
      unlocked: unlockedFlairs.length > 0 || xp >= 1200
    },
    {
      id: 'ai-roaster',
      icon: '🤖',
      name: 'AI Vibe Inspector',
      desc: 'Analyzed memes with the AI Scanner',
      unlocked: roastsRun >= 1 || totalScore >= 2000
    },
    {
      id: 'goblin-catcher',
      icon: '👾',
      name: 'Golden Goblin Catcher',
      desc: 'Caught a roaming Golden Loot Goblin in the feed',
      unlocked: goblinsCaught >= 1 || xp >= 2500
    },
    {
      id: 'konami-god',
      icon: '🕹️',
      name: 'Secret Code Finder',
      desc: 'Triggered Secret Bonus Mode (↑↑↓↓←→←→BA or 5x Logo Tap)',
      unlocked: Boolean(konamiUnlocked) || xp >= 5000
    }
  ];
}
