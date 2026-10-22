// ==========================================
// PROCEDURAL SVG MEME GENERATOR & SEED DATA
// ==========================================

export function makeSvgMeme({ bg1, bg2, badge, topText, bottomText, emoji, accent }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="100%" height="100%">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.85"/>
      </filter>
    </defs>
    <rect width="600" height="520" fill="url(#g)" />
    <circle cx="300" cy="260" r="170" fill="${accent}" opacity="0.14" />
    <circle cx="300" cy="260" r="115" fill="${accent}" opacity="0.1" />
    <rect x="20" y="20" width="560" height="480" rx="18" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    <text x="300" y="295" font-size="125" text-anchor="middle" filter="url(#shadow)">${emoji}</text>
    <rect x="230" y="18" width="140" height="28" rx="14" fill="rgba(0,0,0,0.65)" />
    <text x="300" y="37" font-family="system-ui, sans-serif" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="1.5">${badge}</text>
    <text x="300" y="92" font-family="Impact, Arial Black, sans-serif" font-size="34" font-weight="900" fill="#ffffff" stroke="#000000" stroke-width="2" text-anchor="middle" filter="url(#shadow)" letter-spacing="1">${topText}</text>
    <text x="300" y="458" font-family="Impact, Arial Black, sans-serif" font-size="34" font-weight="900" fill="${accent}" stroke="#000000" stroke-width="2" text-anchor="middle" filter="url(#shadow)" letter-spacing="1">${bottomText}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const STARTER_MEMES = [
  {
    id: 'seed-1',
    title: 'Production deploys on a Friday at 4:59 PM',
    category: 'tech',
    author_name: 'NullPointerGod',
    score: 1420,
    generation: 0,
    mutation_count: 2,
    parent_meme_id: null,
    root_meme_id: 'seed-1',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    reactions: { '🔥': 84, '💀': 142, '😂': 63, '🗿': 29 },
    image_url: makeSvgMeme({
      bg1: '#1a0b2e',
      bg2: '#3b0764',
      badge: 'DEV LIFE',
      topText: 'TESTS FAILED IN STAGING?',
      bottomText: 'FORCE PUSH TO MAIN ANYWAY',
      emoji: '🔥',
      accent: '#facc15'
    }),
    comments: [
      { id: 'c1', author_name: 'SeniorDev99', body: 'Closed my laptop immediately after git push --force.' },
      { id: 'c2', author_name: 'PagerDutyBot', body: 'See you at 2:14 AM King 💀' }
    ]
  },
  {
    id: 'seed-2',
    title: 'My brain at 3 AM calculating how much sleep I get if I fall asleep right now',
    category: 'relatable',
    author_name: 'SleepDeprived',
    score: 980,
    generation: 0,
    mutation_count: 1,
    parent_meme_id: null,
    root_meme_id: 'seed-2',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    reactions: { '🔥': 41, '💀': 210, '😂': 95, '🗿': 44 },
    image_url: makeSvgMeme({
      bg1: '#0f172a',
      bg2: '#1e1b4b',
      badge: '3:47 AM',
      topText: 'ALARM SET FOR 6:30 AM',
      bottomText: 'TIME FOR A 4-HOUR DOCUMENTARY',
      emoji: '🧠',
      accent: '#38bdf8'
    }),
    comments: [
      { id: 'c3', author_name: 'InsomniaCEO', body: 'Why is Wikipedia on 14th-century siege weapons so compelling at 3am?' }
    ]
  },
  {
    id: 'seed-3',
    title: 'When the code works on the very first compile with zero warnings',
    category: 'gaming',
    author_name: 'ShaderWizard',
    score: 2150,
    generation: 0,
    mutation_count: 4,
    parent_meme_id: null,
    root_meme_id: 'seed-3',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    reactions: { '🔥': 190, '💀': 64, '😂': 120, '🗿': 310 },
    image_url: makeSvgMeme({
      bg1: '#064e3b',
      bg2: '#022c22',
      badge: 'SUSPICIOUS',
      topText: 'ZERO ERRORS ON FIRST RUN',
      bottomText: 'SOMETHING IS TERRIBLY WRONG',
      emoji: '🗿',
      accent: '#34d399'
    }),
    comments: [
      { id: 'c4', author_name: 'QA_Destroyer', body: 'Plot twist: you forgot to save the file before running build.' }
    ]
  },
  {
    id: 'seed-4',
    title: 'Me explaining to my bank account why I needed another mechanical keyboard',
    category: 'dank',
    author_name: 'ThockMaster',
    score: 420,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-4',
    created_at: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    reactions: { '🔥': 52, '💀': 88, '😂': 112, '🗿': 19 },
    image_url: makeSvgMeme({
      bg1: '#3f1d38',
      bg2: '#701a75',
      badge: 'FINANCIAL IQ',
      topText: 'RENT IS TEMPORARY',
      bottomText: 'CREAMY THOCK SWITCHES ARE FOREVER',
      emoji: '💸',
      accent: '#f472b6'
    }),
    comments: []
  },
  {
    id: 'seed-5',
    title: 'Boss: "Quick 5-minute sync?" — The sync 90 minutes later:',
    category: 'relatable',
    author_name: 'ZoomZombie',
    score: 1640,
    generation: 0,
    mutation_count: 3,
    parent_meme_id: null,
    root_meme_id: 'seed-5',
    created_at: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    reactions: { '🔥': 73, '💀': 295, '😂': 134, '🗿': 88 },
    image_url: makeSvgMeme({
      bg1: '#450a0a',
      bg2: '#7f1d1d',
      badge: 'CORPORATE CORE',
      topText: 'THIS COULD HAVE BEEN',
      bottomText: 'A TWO SENTENCE SLACK MESSAGE',
      emoji: '💀',
      accent: '#fb923c'
    }),
    comments: [
      { id: 'c5', author_name: 'MutedMic', body: '"Let’s circle back offline and touch base" -> instant psychic damage.' }
    ]
  },
  {
    id: 'seed-6',
    title: 'Skipping the 30-second tutorial and immediately getting clapped by the first mob',
    category: 'gaming',
    author_name: 'EldenL0rd',
    score: 1290,
    generation: 0,
    mutation_count: 1,
    parent_meme_id: null,
    root_meme_id: 'seed-6',
    created_at: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    reactions: { '🔥': 110, '💀': 175, '😂': 205, '🗿': 60 },
    image_url: makeSvgMeme({
      bg1: '#1e293b',
      bg2: '#0f172a',
      badge: 'PRO GAMER',
      topText: 'SKIP TUTORIAL: YES',
      bottomText: 'WHAT BUTTON OPENS PARACHUTE?!',
      emoji: '🎮',
      accent: '#a78bfa'
    }),
    comments: []
  },
  {
    id: 'seed-7',
    title: 'REMIX: Production deploys on a Friday at 4:59 PM (Plot Twist)',
    category: 'tech',
    author_name: 'CyberHotfix',
    score: 890,
    generation: 1,
    mutation_count: 1,
    parent_meme_id: 'seed-1',
    root_meme_id: 'seed-1',
    is_bounty: true,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    reactions: { '🔥': 64, '💀': 92, '😂': 41, '🗿': 18 },
    image_url: makeSvgMeme({
      bg1: '#31102f',
      bg2: '#0f172a',
      badge: 'GEN-1 MUTATION',
      topText: 'FORCE PUSHED TO MAIN AT 4:59 PM',
      bottomText: 'CEO REPLIED: "LGTM, SHIP IT 🚀"',
      emoji: '🚀',
      accent: '#f472b6'
    }),
    comments: [
      { id: 'c6', author_name: 'NullPointerGod', body: 'Best mutation of my origin meme yet! +50 XP Royalty received 🔥' }
    ]
  },
  {
    id: 'seed-8',
    title: 'Opening 47 StackOverflow tabs just to center a div in 2026',
    category: 'tech',
    author_name: 'CSS_Alchemist',
    score: 760,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-8',
    created_at: new Date(Date.now() - 1000 * 60 * 960).toISOString(),
    reactions: { '🔥': 45, '💀': 130, '😂': 88, '🗿': 22 },
    image_url: makeSvgMeme({
      bg1: '#090d16',
      bg2: '#1e293b',
      badge: 'FRONTEND LORE',
      topText: '64GB RAM INSTALLED',
      bottomText: 'CHROME TABS: "FINALLY, A SNACK"',
      emoji: '💻',
      accent: '#22c55e'
    }),
    comments: []
  },
  {
    id: 'seed-9',
    title: 'SPICY LEAK: My honest reaction when someone says light mode is better',
    category: 'dank',
    author_name: 'RetinaProtector',
    score: 1580,
    generation: 0,
    mutation_count: 2,
    parent_meme_id: null,
    root_meme_id: 'seed-9',
    is_spoiler: true,
    created_at: new Date(Date.now() - 1000 * 60 * 1120).toISOString(),
    reactions: { '🔥': 140, '💀': 210, '😂': 95, '🗿': 120 },
    image_url: makeSvgMeme({
      bg1: '#3b0764',
      bg2: '#450a0a',
      badge: 'FLASHBANG WARNING',
      topText: 'SWITCHED IDE TO LIGHT MODE',
      bottomText: 'MY RETINAS HAVE LEFT THE CHAT',
      emoji: '😎',
      accent: '#facc15'
    }),
    comments: []
  },
  {
    id: 'seed-10',
    title: 'When the squad says "One last match" at 11:30 PM on a work night',
    category: 'gaming',
    author_name: 'LobbyLeader',
    score: 640,
    generation: 0,
    mutation_count: 0,
    parent_meme_id: null,
    root_meme_id: 'seed-10',
    created_at: new Date(Date.now() - 1000 * 60 * 1400).toISOString(),
    reactions: { '🔥': 58, '💀': 77, '😂': 114, '🗿': 42 },
    image_url: makeSvgMeme({
      bg1: '#1a0b2e',
      bg2: '#064e3b',
      badge: 'SQUAD GOALS',
      topText: '"WE END ON A WIN BOYS"',
      bottomText: 'SUN BIRDS CHIRPING AT 5:15 AM',
      emoji: '🤡',
      accent: '#34d399'
    }),
    comments: []
  }
];

export const STUDIO_TEMPLATES = [
  { name: 'Cyber Warning', bg1: '#1a0b2e', bg2: '#3b0764', emoji: '🔥', accent: '#facc15', defaultTop: 'WHEN YOU FIX ONE BUG', defaultBottom: 'AND UNLOCK 14 NEW ONES' },
  { name: 'Giga Chad', bg1: '#064e3b', bg2: '#022c22', emoji: '🗿', accent: '#34d399', defaultTop: 'REFUSES TO ELABORATE', defaultBottom: 'LEAVES IMMEDIATELY' },
  { name: 'Skull Moment', bg1: '#450a0a', bg2: '#7f1d1d', emoji: '💀', accent: '#fb923c', defaultTop: 'BRO REALLY THOUGHT', defaultBottom: 'WE WOULDNT NOTICE' },
  { name: 'Galaxy Brain', bg1: '#0f172a', bg2: '#1e1b4b', emoji: '🧠', accent: '#38bdf8', defaultTop: 'SLEEPING 8 HOURS: NO', defaultBottom: 'SCROLLING MEMES AT 4AM: YES' },
  { name: 'Clown Protocol', bg1: '#3f1d38', bg2: '#701a75', emoji: '🤡', accent: '#f472b6', defaultTop: 'I WILL JUST CHECK ONE MEME', defaultBottom: '2 HOURS LATER...' },
  { name: 'Rocket Stonks', bg1: '#1e293b', bg2: '#090d16', emoji: '🚀', accent: '#22c55e', defaultTop: 'BUY HIGH', defaultBottom: 'PANIC SELL LOW' }
];

export const VIRAL_CAPTIONS = [
  ['ME PRETENDING TO LISTEN', 'WHILE THINKING ABOUT GARLIC BREAD'],
  ['WHEN SOMEONE SAYS', '"WE NEED TO TALK" AT 9 AM'],
  ['MY LAST TWO BRAINCELLS', 'FIGHTING FOR THIRD PLACE'],
  ['DEPLOYING ON FRIDAY', 'BECAUSE I FEAR NOTHING'],
  ['SOCIETY IF EVERYONE', 'UPVOTED THE MEMES THEY LAUGHED AT'],
  ['OPENING THE FRIDGE 6 TIMES', 'EXPECTING NEW FOOD TO SPAWN'],
  ['MY DOPAMINE RECEPTORS', 'AFTER 14 HOURS OF HYPER-SWIPE'],
  ['AI SAID MY CODE IS CLEAN', 'IT WAS LOOKING AT AN EMPTY FILE'],
  ['SLEEP SCHEDULE SO BROKEN', 'I HAVE JETLAG IN MY OWN TIMEZONE'],
  ['BOSS ASKED FOR ESTIMATES', 'I PULLED A NUMBER FROM THE ASTRAL PLANE']
];

export const RANKS = [
  { level: 1, title: 'Lurker', minXp: 0 },
  { level: 2, title: 'Shitposter', minXp: 150 },
  { level: 3, title: 'Meme Tactician', minXp: 400 },
  { level: 4, title: 'Sauce Inspector', minXp: 800 },
  { level: 5, title: 'Chronically Online', minXp: 1400 },
  { level: 6, title: 'Meme Overlord', minXp: 2200 },
  { level: 7, title: 'Dopamine Architect', minXp: 3200 },
  { level: 8, title: 'Grandmaster of Dank', minXp: 4500 },
  { level: 9, title: 'Singularity Memer', minXp: 6500 },
  { level: 10, title: 'Cosmic Meme Deity', minXp: 9000 }
];

export const WHEEL_REWARDS = [
  {
    id: 'title-brainrot',
    label: '💀 Title: CEO of Brainrot',
    flair: '💀 CEO of Brainrot',
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
    label: '🔥 Title: Certified Dank Lord',
    flair: '🔥 Certified Dank Lord',
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
    label: '🧬 Title: Chaos Alchemist',
    flair: '🧬 Chaos Alchemist',
    xpBonus: 180,
    color: '#a855f7'
  },
  {
    id: 'title-10x',
    label: '🗿 Title: 10x Giga-Poster',
    flair: '🗿 10x Giga-Poster',
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
    label: '👑 Title: Holo-Foil Sovereign',
    flair: '👑 Holo-Foil Sovereign',
    xpBonus: 250,
    color: '#eab308'
  }
];

export const DAILY_QUESTS = [
  {
    id: 'q-upvote',
    icon: '🔥',
    title: 'Arena Voter',
    desc: 'Upvote or Hyper-Swipe 3 memes',
    target: 3,
    rewardXp: 150
  },
  {
    id: 'q-react',
    icon: '💀',
    title: 'Emoji Reactor',
    desc: 'Drop 3 emoji reactions (🔥, 💀, 😂, 🗿)',
    target: 3,
    rewardXp: 120
  },
  {
    id: 'q-soundboard',
    icon: '🎹',
    title: 'Noise Complaint',
    desc: 'Mash 3 pads on the Crazy Meme Soundboard',
    target: 3,
    rewardXp: 100
  },
  {
    id: 'q-roast',
    icon: '🤖',
    title: 'AI Dank Inspector',
    desc: 'Scan any meme with the AI Dank-O-Meter Roast tool',
    target: 1,
    rewardXp: 175
  },
  {
    id: 'q-mutate',
    icon: '🧬',
    title: 'Genetic Mutator',
    desc: 'Publish or Mutate 1 meme in the Meme Forge Studio',
    target: 1,
    rewardXp: 250
  }
];

export const MEME_STOCK_TICKER = [
  { symbol: '$DANK', delta: '+42.0%', up: true, category: 'dank', label: 'Dank Index Surging' },
  { symbol: '$TECH', delta: '+69.4%', up: true, category: 'tech', label: 'Friday Deploy Panic' },
  { symbol: '$GAMING', delta: '+31.8%', up: true, category: 'gaming', label: 'Boss Music in Latin' },
  { symbol: '$3AM_SLEEP', delta: '-88.2%', up: false, category: 'relatable', label: 'Sleep Schedule Crashed' },
  { symbol: '$VINE_BOOM', delta: '+420.0%', up: true, category: 'all', label: 'Soundboard Volume Maxed' },
  { symbol: '$MUTATIONS', delta: '+19.5%', up: true, category: 'all', label: '+50 XP Creator Royalties Live' },
  { symbol: '$BOSS_KEY', delta: '+999.9%', up: true, category: 'all', label: 'Stealth Excel Mode Undetected' }
];

export const CHAOS_MUTATORS = [
  { id: 'none', label: '✨ Normal', desc: 'Standard Cyber-Arcade Reality' },
  { id: 'rave', label: '🕺 Rave Club', desc: 'Neon Strobe & Bouncing Dancefloor' },
  { id: 'australian', label: '🙃 Australian', desc: 'Upside-Down Gravity Inversion' },
  { id: 'deepfry', label: '🍗 Deep-Fried', desc: 'Maximum Crispy Saturation Overdrive' },
  { id: 'matrix', label: '🕶️ Matrix', desc: 'Green Cyber-Phosphor Hacker Vision' }
];

export const CURSOR_TRAILS = [
  { id: 'none', label: '🚫 No Trail', emoji: '' },
  { id: 'fire', label: '🔥 Fire Trail', emoji: '🔥' },
  { id: 'skull', label: '💀 Skull Trail', emoji: '💀' },
  { id: 'diamond', label: '💎 Diamond Trail', emoji: '💎' },
  { id: 'duck', label: '🦆 Duck Army Trail', emoji: '🦆' },
  { id: 'crown', label: '👑 Royal Crown Trail', emoji: '👑' }
];

export const SLOT_SYMBOLS = [
  { id: 'skull', emoji: '💀', name: 'Vine Skull', mult: 3 },
  { id: 'fire', emoji: '🔥', name: 'Supernova Fire', mult: 4 },
  { id: 'moai', emoji: '🗿', name: 'Giga Moai', mult: 5 },
  { id: 'clown', emoji: '🤡', name: 'Honk Clown', mult: 3 },
  { id: 'duck', emoji: '🦆', name: 'Golden Duck', mult: 6 },
  { id: 'diamond', emoji: '💎', name: 'Cyber Diamond', mult: 10 }
];

// ==========================================
// PHASE 17: TIMED-WINDOW ECONOMY & SPIN RATE LIMITS
// Easy-to-tweak central configuration for when real users arrive!
// ==========================================
export const ARCADE_RATE_LIMITS = {
  // Max Wheel of Chaos spins a player can hold in their wallet at once
  MAX_STORED_WHEEL_SPINS: 5,
  // Max Wheel of Chaos spins allowed per timed window (3 spins per 60 minutes)
  WHEEL_SPINS_PER_WINDOW: 3,
  WHEEL_WINDOW_MS: 60 * 60 * 1000,

  // Max 3-Reel Brainrot Slot Machine pulls per timed window (5 pulls per 15 minutes)
  SLOT_PULLS_PER_WINDOW: 5,
  SLOT_WINDOW_MS: 15 * 60 * 1000,

  // Max Golden Loot Goblin summons/catches per timed window (2 per 30 minutes)
  GOBLINS_PER_WINDOW: 2,
  GOBLIN_WINDOW_MS: 30 * 60 * 1000,

  // Konami God Mode XP/Spin payout cooldown (once per 24 hours; visual fireworks still work anytime)
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
    desc: 'Drop heavy stone Moai statues from orbit with 808 Vine Boom shockwaves!'
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
    name: 'Sus Cyber-Egg',
    emoji: '🥚',
    title: 'Lv.1 Vibrating Egg',
    quips: [
      'I hear Vine Booms from inside my shell...',
      'Feed me a spicy meme so I can hatch!',
      'Knock knock. Who’s there? Production bug.'
    ]
  },
  {
    stage: 1,
    minFeeds: 3,
    name: 'Pepe Tadpole',
    emoji: '🐸',
    title: 'Lv.2 Cozy Froglet',
    quips: [
      'Feels good man! Feed me more deep-fried memes!',
      'It is Wednesday in my heart, my dudes.',
      'I just ate 47 StackOverflow tabs for breakfast.'
    ]
  },
  {
    stage: 2,
    minFeeds: 7,
    name: 'Neon Drip Duck',
    emoji: '🦆',
    title: 'Lv.3 Quack Overlord',
    quips: [
      'QUACK! Peace was never an option.',
      'My sunglasses are prescription dankness.',
      'Honk if you deployed on Friday without testing!'
    ]
  },
  {
    stage: 3,
    minFeeds: 12,
    name: 'Giga-Moai Sovereign',
    emoji: '🗿',
    title: 'Lv.MAX Immortal Statue',
    quips: [
      '🗿 Refuses to elaborate. Demands more memes.',
      'My jawline was chiseled by 10,000 upvotes.',
      'I have achieved 420% enlightenment.'
    ]
  }
];

export const COMIC_ACTION_WORDS = [
  'BASED! 🔥',
  'HONK! 🤡',
  'BRAINROT! 💀',
  'YEET! 🚀',
  'GIGA-CHAD! 🗿',
  'BOIOIOING! 🌀',
  'SPICY! 🌶️',
  'EMOTIONAL DAMAGE! 💥',
  'NANI?! ⚡',
  'QUACK! 🦆'
];


export const MEME_FORTUNES = [
  '🥠 Meme Prophecy: Your next git push --force will miraculously pass all production checks.',
  '🥠 Meme Prophecy: Beware of meetings scheduled at 4:45 PM titled "Quick Sync".',
  '🥠 Meme Prophecy: You will open the refrigerator 4 times tonight and lower your standards each time.',
  '🥠 Meme Prophecy: A wild Gen-3 Mutation of your meme will bring you +50 XP royalties while you sleep.',
  '🥠 Meme Prophecy: Someone in a corporate Zoom call right now is secretly using the Boss Key.',
  '🥠 Meme Prophecy: Your dopamine receptors are operating at 420% efficiency.'
];

/**
 * Generates a savage, hilarious AI Dank-O-Meter analysis & roast for any meme.
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
      `This meme has more unresolved trauma than a legacy monolith deployed on a Friday at 4:59 PM. Certified ${viralProbability}% fatal to senior engineers.`,
      `Our neural network detected 47 open StackOverflow tabs and zero unit tests in this image. Shipping straight to the Hall of Fame.`,
      `Warning: Viewing this meme during a Sprint Retrospective may cause spontaneous git push --force behavior.`
    ],
    gaming: [
      `This meme hits harder than a Phase 2 boss when the choir starts singing in Latin and you have 0 flasks left.`,
      `Skill issue analysis complete: 0% tutorial retention, 100% pure unadulterated gamer brainrot.`,
      `Our GPU overheated by 14°C just rendering the sheer audacity of this gaming transmission.`
    ],
    relatable: [
      `I am in this meme and my lawyer has advised me to upvote it immediately. 3 AM circadian rhythm destruction confirmed.`,
      `Psychic damage output: CRITICAL. Every adult pretending to have their life together felt this in their lower back.`,
      `Scientifically proven to replace 8 hours of healthy sleep with reckless doomscrolling.`
    ],
    dank: [
      `Weapons-grade dankness detected. The Federal Reserve has placed this meme on watch for inflating the global dopamine supply.`,
      `So deeply fried that just looking at it raised my cholesterol and unlocked my third eye.`,
      `Pure 24-karat cyber-arcade gold. Future archaeologists will study this post to understand 2026 internet culture.`
    ]
  };

  const pool = roastsByCategory[meme?.category] || roastsByCategory.dank;
  const verdict = pool[(score + titleLen) % pool.length];

  return {
    viralProbability,
    tierVerdict: Number(viralProbability) >= 92 ? '🔥 CERTIFIED SUPERNOVA DANK' : '⚡ HIGH-VOLTAGE SAUCE',
    brainrotLevel: `${brainrotLevel}/100`,
    spiceStars: '🌶️'.repeat(spiceCount),
    repostRisk: gen > 0 ? `🧬 GEN-${gen} Verified Mutation` : '0.0% (100% Organic Origin)',
    verdict
  };
}

/**
 * Computes the visual Rarity / Heat Tier of a meme card based on score & remixes.
 * - 'supernova': 1500+ pts OR 3+ remixes (Holographic Rainbow Foil + Viral badge)
 * - 'heating': 500-1499 pts (Plasma Cyan/Amber Glow + Heating Up badge)
 * - 'standard': < 500 pts (Sleek Cyber-Slate Glass)
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
    id: 'bounty-ai-compile',
    tag: 'AI OVERLORDS',
    prompt: 'When the AI writes 400 lines of code and it works on the first try',
    category: 'tech',
    templateIdx: 0,
    defaultTop: '400 LINES OF AI CODE',
    defaultBottom: 'ZERO WARNINGS ON FIRST RUN?!',
    rewardXp: 200
  },
  {
    id: 'bounty-sleep-math',
    tag: '3AM LOGIC',
    prompt: 'Explaining my 4 AM sleep schedule to my primary care doctor',
    category: 'relatable',
    templateIdx: 3,
    defaultTop: 'DOCTOR: DO YOU GET 8 HOURS?',
    defaultBottom: 'ME: IN A ROW OR PER WEEK?',
    rewardXp: 200
  },
  {
    id: 'bounty-boss-phase2',
    tag: 'GAMER PAIN',
    prompt: 'Using all your healing potions before the boss music switches to Latin',
    category: 'gaming',
    templateIdx: 2,
    defaultTop: 'ZERO HEALS LEFT, 1 HP',
    defaultBottom: 'BOSS HEALTH BAR REFILLS IN LATIN',
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
      name: 'First Drop',
      desc: 'Published a meme to the arena feed',
      unlocked: authoredMemes.length >= 1
    },
    {
      id: 'dna-architect',
      icon: '🧬',
      name: 'Genetic Architect',
      desc: 'Mutated a meme or spawned a remix lineage',
      unlocked: hasMutation
    },
    {
      id: 'supernova-club',
      icon: '🔥',
      name: '1K Supernova',
      desc: 'Reached 1,000+ total score across posted memes',
      unlocked: totalScore >= 1000
    },
    {
      id: 'bounty-hunter',
      icon: '🎯',
      name: 'Bounty Hunter',
      desc: 'Completed a Daily Meme Bounty challenge',
      unlocked: hasBountyMeme
    },
    {
      id: 'overdrive-lord',
      icon: '⚡',
      name: 'Chronically Online',
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
      name: 'Chaos High Roller',
      desc: 'Spun the Wheel of Chaos & unlocked a Custom Flair',
      unlocked: unlockedFlairs.length > 0 || xp >= 1200
    },
    {
      id: 'ai-roaster',
      icon: '🤖',
      name: 'AI Dank Inspector',
      desc: 'Analyzed memes with the AI Dank-O-Meter Scanner',
      unlocked: roastsRun >= 1 || totalScore >= 2000
    },
    {
      id: 'goblin-catcher',
      icon: '👾',
      name: 'Golden Goblin Hunter',
      desc: 'Caught a roaming Golden Loot Goblin in the feed',
      unlocked: goblinsCaught >= 1 || xp >= 2500
    },
    {
      id: 'konami-god',
      icon: '🕹️',
      name: 'Konami Code Hacker',
      desc: 'Triggered Secret God Mode (↑↑↓↓←→←→BA or 5x Logo Tap)',
      unlocked: Boolean(konamiUnlocked) || xp >= 5000
    }
  ];
}
