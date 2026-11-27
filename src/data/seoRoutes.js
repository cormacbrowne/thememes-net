// ==========================================
// PHASE 28.8 & 28.9: CRAWLABLE PATH ROUTES & SEO METADATA REGISTRY
// Shared between the React SPA (App.jsx, seoEngine.js, SeoDiscoveryFooter.jsx)
// and the post-build static HTML prerenderer (scripts/prerender-seo.mjs).
// ==========================================

import { MEME_TEMPLATES, getTemplateByPath, getTemplateBySlug, TEMPLATES_INDEX_PATH } from './memeTemplates.js';
import { VISIBLE_ARCADE_GAMES, isCasinoGame } from './arcadeGamesCatalog.js';
import { FEATURE_CASINO_GAMES } from '../config/featureFlags.js';

/** Real number of games in the arcade, so every page says the same thing. */
// Games the arcade actually shows (casino games only while FEATURE_CASINO_GAMES is on).
export const ARCADE_GAME_COUNT = VISIBLE_ARCADE_GAMES.length;

/** Plan 1.6: with the casino switched off, casino URLs and view modes open the lobby. */
export function casinoSafeViewMode(viewMode, casinoOn = FEATURE_CASINO_GAMES) {
  return !casinoOn && isCasinoGame(viewMode) ? 'lobby' : viewMode;
}

export const SITE_ORIGIN = 'https://www.thememes.net';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-card.png`;

/** Template library page path for a template (or the library index). */
export function getTemplateRoutePath(tplOrSlug) {
  const slug = typeof tplOrSlug === 'string' ? tplOrSlug : tplOrSlug?.slug;
  const t = slug ? getTemplateBySlug(slug) : null;
  return t ? t.path : TEMPLATES_INDEX_PATH;
}

export const TEMPLATE_PATHS = MEME_TEMPLATES.map((t) => t.path);

export const MODE_ALIASES = {
  dozer: 'pusher',
  coindozer: 'pusher',
  coinpusher: 'pusher',
  bingo: 'bingo',
  'neon-bingo': 'bingo',
  invaders: 'invaders',
  'meme-invaders': 'invaders',
  serpent: 'serpent',
  'neon-serpent': 'serpent',
  snake: 'serpent',
  blaster: 'blaster',
  'brick-blaster': 'blaster',
  breakout: 'blaster',
  sunset: 'sunset',
  'sunset-sprint': 'sunset',
  outrun: 'sunset',
  void: 'void',
  'vector-void': 'void',
  asteroids: 'void',
  riders: 'riders',
  'grid-riders': 'riders',
  tron: 'riders'
};

export const CATEGORY_SLUG_TO_ID = {
  dank: 'dank',
  programming: 'tech',
  tech: 'tech',
  gaming: 'gaming',
  relatable: 'relatable',
  wholesome: 'wholesome'
};

export const CATEGORY_ID_TO_SLUG = {
  dank: 'dank',
  tech: 'programming',
  gaming: 'gaming',
  relatable: 'relatable',
  wholesome: 'wholesome'
};

export const GAME_VIEW_MODE_TO_PATH = {
  lobby: '/games',
  invaders: '/games/meme-invaders',
  serpent: '/games/neon-serpent',
  blaster: '/games/brick-blaster',
  sunset: '/games/sunset-sprint',
  void: '/games/vector-void',
  riders: '/games/grid-riders',
  bingo: '/games/neon-bingo',
  pusher: '/games/coin-pusher',
  pinball: '/games/pinball',
  slots: '/games/slots',
  blackjack: '/games/blackjack',
  poker: '/games/poker',
  thousand: '/games/1000-card-game',
  roulette: '/games/roulette',
  crush: '/games/meme-crush',
  stocks: '/games/meme-stock-market',
  derby: '/games/horse-racing',
  guess: '/games/guess-the-meme',
  eightball: '/games/magic-8-ball',
  hilow: '/games/higher-or-lower',
  swipe: '/games/speed-swipe',
  battle: '/games/meme-battle-arena'
};

export const PRANK_DISGUISE_TO_PATH = {
  update: '/fake-windows-update-screen',
  bsod: '/fake-blue-screen-prank',
  excel: '/fake-excel-boss-screen',
  zoom: '/fake-teams-zoom-call-screen',
  terminal: '/fake-hacker-terminal-screen',
  ai: '/fake-ai-workspace-boss-screen',
  crackphone: '/fake-cracked-iphone-screen',
  crackpad: '/fake-cracked-ipad-screen',
  secretsanta: '/fake-secret-santa-prank'
};

const ALL_SEO_ROUTES = [
  {
    path: '/',
    title: 'Free Meme & GIF Maker (Top/Bottom Text) & Funny Memes | THE MEMES.net',
    description:
      'Make memes and GIFs in 5 seconds: upload any image or GIF, add top and bottom text, browse funny memes, and share instant links.',
    h1: 'Free Meme & GIF Maker + Funny Community Memes',
    kicker: 'THE MEMES.net // Instant Memes, GIFs & Classic Captions',
    changefreq: 'hourly',
    priority: '1.0',
    viewMode: 'feed',
    category: 'all',
  },
  {
    path: '/meme-generator',
    title: 'Free Meme & GIF Generator — Add Top & Bottom Text Online | THE MEMES.net',
    description:
      `Free meme generator: pick one of ${MEME_TEMPLATES.length} AI-generated meme templates or upload any image or GIF, add your text (or let AI write it), then download or share. No sign-up.`,
    h1: 'Free Meme Generator & GIF Maker',
    kicker: 'THE MEMES.net // Simple Image & GIF Meme Maker',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'feed',
    category: 'all',
    openStudio: true,
    schemaType: 'SoftwareApplication',
  },
  {
    path: '/meme-soundboard',
    title: 'Vine Boom Soundboard & 16-Pad Meme SFX Player | THE MEMES.net',
    description:
      'Play the free 16-pad online meme soundboard featuring Vine Boom 808 drop, MLG Triple Airhorn, Clown Honk, Sad Trombone, Metal Pipe Clang, and iPhone silent-switch audio playback.',
    h1: 'Vine Boom Soundboard & 16-Pad Comedy SFX Player',
    kicker: 'Web Audio Synthesizer // Works Offline & On iOS',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'feed',
    category: 'all',
    openSoundboard: true,
  },
  {
    path: '/games',
    title: `Free Cyber-Arcade Lobby — ${ARCADE_GAME_COUNT} Retro & Meme Games | THE MEMES.net`,
    description:
      `Explore all ${ARCADE_GAME_COUNT} free browser arcade games on THE MEMES.net: Meme Invaders, Neon Serpent, Pinball, Meme Crush, Guess The Meme, Higher or Lower, MEMEDAQ & more.`,
    h1: `Cyber-Arcade Lobby — Play ${ARCADE_GAME_COUNT} Free Retro & Meme Games`,
    kicker: 'THE MEMES.net // Skill Cabinets, Daily Meme Games & Market Sim',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'lobby',
    category: 'all',
  },
  {
    path: '/games/coin-pusher',
    title: 'Coin Pusher Game Online Free — Neon Coin Dozer 86 | THE MEMES.net',
    description:
      'Play a free 3D coin pusher game online in your browser! Drop coins onto the reciprocating chrome pusher, hit the Skill Gate mini-slot, collect 80s prizes, and trigger Bulldozer Fever.',
    h1: "Neon Coin Dozer '86 — Play Coin Pusher Online Free",
    kicker: '60fps HTML5 Arcade // Free Play & MemeDollarz Modes',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'pusher',
    category: 'all',
  },
  {
    path: '/games/meme-invaders',
    title: "Meme Invaders '86 — Free 80s Retro Arcade Shooter | THE MEMES.net",
    description:
      "Play Meme Invaders '86 free online! Blast descending emoji waves, defend crumbling shields, shoot bonus saucers, and fight every 5th wave's Top Meme Boss at 60fps.",
    h1: "Meme Invaders '86 — Free Retro Meme Space Shooter",
    kicker: '60fps Skill Cabinet // Touch, Keyboard & Gamepad — Free to Play',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'invaders',
    category: 'all',
  },
  {
    path: '/games/neon-serpent',
    title: 'Neon Serpent — Free Synthwave Reaction Snake Arcade | THE MEMES.net',
    description:
      'Play Neon Serpent free online! Swipe through a 60fps neon grid eating reaction emojis: Fire speeds up & doubles points, Moai triggers slow-mo, and Skull shrinks your tail.',
    h1: 'Neon Serpent — Free Synthwave Reaction Snake Game',
    kicker: '60fps Skill Cabinet // Swipe, Keyboard & Gamepad — Free to Play',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'serpent',
    category: 'all',
  },
  {
    path: '/games/brick-blaster',
    title: 'Brick Blaster — Free Retro Word & Pixel Face Breaker | THE MEMES.net',
    description:
      'Play Brick Blaster free online! Smash word-art and pixel-face brick levels with Multi-Ball, Twin Laser, and Wide Paddle power-ups. Drag anywhere to steer at 60fps.',
    h1: 'Brick Blaster — Free Retro Pixel-Face Brick Breaker',
    kicker: '60fps Skill Cabinet // Drag, Keyboard & Gamepad — Free to Play',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'blaster',
    category: 'all',
  },
  {
    path: '/games/sunset-sprint',
    title: 'Sunset Sprint — Free Synthwave OutRun Highway Racer | THE MEMES.net',
    description:
      'Play Sunset Sprint free online! Race 80s garage cars down a pseudo-3D synthwave highway, dodge traffic, beat checkpoint timers & grab cassettes that switch THE MEMES FM.',
    h1: 'Sunset Sprint — Free Retro Synthwave Highway Racer',
    kicker: 'Pseudo-3D 80s Racer // Drag Steer, Keyboard & Gamepad — Free to Play',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'sunset',
    category: 'all',
  },
  {
    path: '/games/vector-void',
    title: 'Vector Void — Free Twin-Stick Vector Space Shooter | THE MEMES.net',
    description:
      'Play Vector Void free online! Blast splitting phosphor vector rocks across a wrap-around cyber-space grid with touch twin-sticks, WASD + Arrows, or gamepad.',
    h1: 'Vector Void — Free Twin-Stick Vector Space Shooter',
    kicker: '60fps Phosphor Shooter // Twin-Stick Touch, Keyboard & Gamepad — Free',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'void',
    category: 'all',
  },
  {
    path: '/games/grid-riders',
    title: 'Grid Riders — Free Light-Trail Arena Duel (1P & 2P) | THE MEMES.net',
    description:
      'Play Grid Riders free online! Battle smart arena AI or challenge a friend in 2-player local light-trail duels on one keyboard or split phone touch controls.',
    h1: 'Grid Riders — Free 1P & 2P Light-Trail Arena Duel',
    kicker: '60fps Neon Grid // 1P AI Challenge & 2P Same-Device Duel — Free',
    ogImage: 'https://www.thememes.net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'riders',
    category: 'all',
  },
  {
    path: '/games/pinball',
    title: 'Free Retro Pinball Game Online — 5 Neon Arcade Tables | THE MEMES.net',
    description:
      'Play 5 distinct 80s neon pinball tables online for free! Master dual flippers, 3-ball multiball madness, plasma drain shields, drop targets, and high-score bonuses in your browser.',
    h1: "Neon Pinball '86 — 5 Free Retro Arcade Tables",
    kicker: '60fps Physics Pinball // Keyboard & Touch Flippers',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'pinball',
    category: 'all',
  },
  {
    path: '/games/slots',
    title: "Neon Slots '86 — Free Retro Slot Machine, Just for Fun (No Real Money) | THE MEMES.net",
    description:
      'Spin a retro neon one-arm bandit just for fun, with no real money. Use Reel HOLD & NUDGE buttons, trigger jackpot drumrolls, and win play-money MemeDollarz that can never be bought or cashed out.',
    h1: "Neon Slots '86 — Free Retro Slot Machine (Just for Fun)",
    kicker: '3-Reel Mechanical Drums // Free Pretend MemeDollarz — Just for Fun',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'slots',
    category: 'all',
  },
  {
    path: '/games/blackjack',
    title: "Play Blackjack Online Free — Neon 21's Retro Casino | THE MEMES.net",
    description:
      "Play free 21 Blackjack online against Dealer Bot '86. Hit, Stand, Double Down, Split Pairs, trigger 5-Card Charlie 3x wins, and use the cyber-visor strategy hint with zero real money.",
    h1: "Neon 21's Blackjack — Play Free 21 Card Game Online",
    kicker: 'Classic 21 Card Rules // Free Practice & MemeDollarz Modes',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'blackjack',
    category: 'all',
  },
  {
    path: '/games/horse-racing',
    title: "NEON DERBY '86 — Free Online Meme Horse Racing Game | THE MEMES.net",
    description:
      'Bet Win, Place, Show, or Exacta on 8 meme horses in Neon Derby 86 free online. Live odds board, Acid Rain & Glitch Track conditions, photo finishes, and 8pm 3x Derby Cup.',
    h1: "NEON DERBY '86 — Free Retro Meme Horse Racing",
    kicker: '8 Meme Runners // Win, Place, Show & Exacta Odds',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'derby',
    category: 'all',
  },
  {
    path: '/games/guess-the-meme',
    title: 'Guess The Meme Daily — Free Pixelated Meme Trivia Game | THE MEMES.net',
    description:
      'Play Guess the Meme Daily free online! Unpixelate 5 classic meme templates over 5 steps, build your daily streak, and share your Wordle-style score grid. Always free.',
    h1: 'Guess The Meme: Daily — Free Pixelated Format Trivia',
    kicker: 'Daily Wordle-Style Puzzle // 100% Free to Play',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'guess',
    category: 'all',
  },
  {
    path: '/games/magic-8-ball',
    title: '80s Magic 8-Ball Oracle — Retro Fortune Predictor Game | THE MEMES.net',
    description:
      'Shake the glowing 1980s neon Magic 8-Ball Oracle free online! Ask any meme, crypto, or life question for glowing synthwave prophecies, liquid die reveals, and MemeDollarz fate wagers.',
    h1: "80s Neon Magic 8-Ball '86 — Fortune Predictor Oracle",
    kicker: '1986 Synthwave Oracle // Shake Physics & 80s Audio',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'eightball',
    category: 'all',
    schemaType: 'VideoGame',
  },
  {
    path: '/games/higher-or-lower',
    title: 'Higher or Lower: Meme Edition — Free Upvote Streak Game | THE MEMES.net',
    description:
      'Play Higher or Lower: Meme Edition free online! Guess which meme has more community upvotes, build an endless streak, share your streak card, and discover new memes.',
    h1: 'Higher or Lower: Meme Edition — Endless Upvote Game',
    kicker: 'Live Community Memes // Endless Streak & Share Card',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'hilow',
    category: 'all',
  },
  {
    path: '/games/poker',
    title: "Neon Hold'em '86 Poker — Free Online Texas Hold'em With Chips | THE MEMES.net",
    description:
      "Play Neon Hold'em '86 Texas Poker free online! Buy in with free MemeDollarz for stacked casino chips, bet Pre-Flop through River vs AI sharks, and return your play-money chips to your wallet.",
    h1: "Neon Hold'em '86 — Free Texas Hold'em Poker With Chips",
    kicker: 'No-Limit Texas Hold’em // Stacked Chips & MemeDollarz Buy-Ins',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'poker',
    category: 'all',
  },
  {
    path: '/games/1000-card-game',
    title: '1000 Card Game Online — Play Tysiąc Free vs Computer or Friends | THE MEMES.net',
    description:
      'Play 1000 (Tysiąc / Thousand), the classic bidding and trick-taking card game, free online. 2–4 players vs a smart computer or friends with an invite link, plus full rules, card values and a hint coach.',
    h1: '1000 (Tysiąc) — Free Online Card Game for 2–4 Players',
    kicker: 'Bid • Musik • Marriages • Race to 1000',
    changefreq: 'weekly',
    priority: '0.85',
    viewMode: 'thousand',
    category: 'all',
    ogImage: 'https://www.thememes.net/og/games.png',
  },
  {
    path: '/games/roulette',
    title: "Free Neon Strike Roulette Online — Play-Money Wheel '86 | THE MEMES.net",
    description:
      'Spin a 37-pocket European Neon Strike Roulette wheel free online with Strike numbers, inside & outside bets, and quick presets. Play money only.',
    h1: "Neon Strike Roulette '86 — Free Online European Wheel",
    kicker: '37-Pocket Single Zero // Play Money Only',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'roulette',
    category: 'all',
  },
  {
    path: '/games/meme-crush',
    title: 'Meme Crush Saga — Free Online Match-3 Neon Puzzle Game | THE MEMES.net',
    description:
      'Play Meme Crush Saga free online! Swap glossy 3D meme candies across 10 carved neon levels with 2x2 Seeking Rockets, Striped Laser Bombs, Rainbow Color Bombs, and Crystal Jelly.',
    h1: 'Meme Crush Saga — Free 10-Level Match-3 Puzzle Game',
    kicker: 'Glossy 3D Jelly Candies // Carved Arcade Levels',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'crush',
    category: 'all',
  },
  {
    path: '/games/meme-stock-market',
    title: "MEMEDAQ '86 — Free Meme Stock Market Simulator Game | THE MEMES.net",
    description:
      'Trade 8 fictional meme tickers ($DOGE, $CHAD, $PEPE, $MOON, $AI) in a retro 1986 CRT stock market simulator with live candlestick charts, breaking news shocks, and insider rumors.',
    h1: "MEMEDAQ '86 — Free Retro Meme Stock Market Simulator",
    kicker: '1986 Wall Street CRT Desk // Fictional Arcade Tickers',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'stocks',
    category: 'all',
  },
  {
    path: '/prank-screens',
    title: 'Fake Prank Screens — Fake Update, Blue Screen, Cracked Phone & Hacker Pranks | THE MEMES.net',
    description:
      'Free fullscreen prank screens: fake system update, fake blue screen crash, cracked phone and tablet glass, hacker terminal, fake video call and boss spreadsheet. One tap, full screen, harmless.',
    h1: 'Fake Prank Screens — Fullscreen Pranks for Any Device',
    kicker: 'Prank Screens // Tap, Go Fullscreen, Hand It Over',
    changefreq: 'weekly',
    priority: '0.95',
    viewMode: 'pranks',
    category: 'all',
    prerenderPranks: true,
    schemaType: 'CollectionPage',
  },
  {
    path: '/fake-windows-update-screen',
    title: 'Fake Windows Update Screen (Interactive Fullscreen Prank) | THE MEMES.net',
    description:
      'Open a realistic fullscreen fake Windows update screen prank ("Working on updates 69% complete") with clickable percentage progress and F11 fullscreen mode. Press Esc anytime to exit.',
    h1: 'Fake Windows Update Screen — Interactive Fullscreen Prank',
    kicker: 'Prank & Boss Screen Suite // Press F11 For Fullscreen',
    changefreq: 'weekly',
    priority: '0.9',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'update',
  },
  {
    path: '/fake-blue-screen-prank',
    title: 'Fake Blue Screen of Death (BSOD Prank Screen Fullscreen) | THE MEMES.net',
    description:
      'Launch an authentic Windows Blue Screen of Death (BSOD) prank online with ":(" frown face, live recovery percentage, QR support code, and F11 fullscreen tip. Press Esc to exit.',
    h1: 'Fake Blue Screen Prank (BSOD) — Fullscreen Simulator',
    kicker: 'Prank & Boss Screen Suite // Press F11 For Fullscreen',
    changefreq: 'weekly',
    priority: '0.9',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'bsod',
  },
  {
    path: '/fake-cracked-iphone-screen',
    title: 'Fake Cracked iPhone Screen Prank (Sparks & Broken Glass) | THE MEMES.net',
    description:
      'Turn your phone into a fake smashed screen: shattered glass, leaking ink, dead pixel lines and live sparks. Tap to crack it more. Free, no app needed.',
    h1: 'Fake Cracked iPhone Screen Prank — Broken Glass With Sparks',
    kicker: 'Prank Screens // Tap To Crack It More',
    changefreq: 'weekly',
    priority: '0.9',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'crackphone',
  },
  {
    path: '/fake-cracked-ipad-screen',
    title: 'Fake Cracked iPad Screen Prank (Shattered Tablet With Sparks) | THE MEMES.net',
    description:
      'A full-screen fake shattered tablet: spider-web cracks, ink bleed, dead pixel lines and electric sparks. Tap to crack it more. Works in any browser.',
    h1: 'Fake Cracked iPad Screen Prank — Shattered Tablet Simulator',
    kicker: 'Prank Screens // Big-Screen Smash',
    changefreq: 'weekly',
    priority: '0.8',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'crackpad',
  },
  {
    path: '/fake-secret-santa-prank',
    title: 'Office Secret Santa Prank — Assigned Your Boss Parody | THE MEMES.net',
    description:
      'A playful browser-based Office Secret Santa parody draw that insists you got assigned your own boss — complete with redraw excuses and a wishlist.',
    h1: 'Office Secret Santa Prank — HR Holiday Gift Draw Parody',
    kicker: 'Prank Screens // Festive Office Parody',
    changefreq: 'weekly',
    priority: '0.8',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'secretsanta',
  },
  {
    path: '/fake-excel-boss-screen',
    title: 'Fake Excel Boss Key Screen — Interactive Spreadsheet Disguise | THE MEMES.net',
    description:
      'Open a realistic fake Excel Q4 financial forecast spreadsheet with clickable cells, formula bar, and Monte Carlo audit button. Press F11 for fullscreen or Esc anytime to exit.',
    h1: 'Fake Excel Boss Screen — Interactive Q4 Spreadsheet Disguise',
    kicker: 'Boss Key Panic Suite // Clickable Cells & Audit Macro',
    changefreq: 'weekly',
    priority: '0.9',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'excel',
  },
  {
    path: '/memes/dank',
    title: 'Dank Memes & Viral Humor — Community Feed | THE MEMES.net',
    description:
      'Browse dank memes, chaotic reaction images, and community chaos. Double-tap to upvote, react with emojis, share the best ones, or upload your own.',
    h1: 'Dank Memes & Chaotic Community Humor',
    kicker: '#DANK Category // Instant Community Feed',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'dank',
    prerenderCategory: 'dank',
  },
  {
    path: '/memes/programming',
    title: 'Funny Programming, Coding & Tech Memes | THE MEMES.net',
    description:
      'Scroll hilarious programming, software engineering, Friday production deploy, git blame, CSS, and AI coding memes. Make your own developer memes free online.',
    h1: 'Programming, Coding & Developer Memes',
    kicker: '#TECH Category // Built For Developers & Engineers',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'tech',
    prerenderCategory: 'tech',
  },
  {
    path: '/memes/gaming',
    title: 'Gaming Memes, RPG Boss Jokes & Esports Humor | THE MEMES.net',
    description:
      'Discover funny gaming memes about side quests, surprise boss phase music, FPS reloads, fall-damage tests, and late-night squad lobbies. Vote, react, and share in one click.',
    h1: 'Gaming, RPG & Squad Lobby Memes',
    kicker: '#GAMING Category // Boss Phases & Side Quests',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'gaming',
    prerenderCategory: 'gaming',
  },
  {
    path: '/memes/relatable',
    title: 'Relatable 3AM, Work & Everyday Life Memes | THE MEMES.net',
    description:
      'Laugh at relatable memes about 3AM sleep math, morning alarm snoozing, cancelled weekend plans, fridge checks, and quick 5-minute work meetings. Create and share free.',
    h1: 'Relatable Everyday, Work & 3AM Memes',
    kicker: '#RELATABLE Category // Real Life & Late Night Humor',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'relatable',
    prerenderCategory: 'relatable',
  },
  {
    path: '/memes/wholesome',
    title: 'Wholesome Memes, Feel-Good Jokes & Cute Animal Memes | THE MEMES.net',
    description:
      'Browse wholesome memes, uplifting jokes, cute pets, and friendly humor on THE MEMES.net. Vote on community favorites or make your own wholesome meme free.',
    h1: 'Wholesome & Feel-Good Community Memes',
    kicker: '#WHOLESOME Category // Uplifting & Friendly Humor',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'wholesome',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/games/neon-bingo',
    title: "80s Neon Bingo Game Online — Free Retro Bingo Caller & Virtual Dabber | THE MEMES.net",
    description:
      "Play Neon Bingo '86 free online! Features all 90 classic comedy bingo callouts (Two Little Ducks Quack Quack 22!), interactive UV Neon Dabber pen, cheers vs tomato boos, Ceefax 888 mode, and MemeDollarz jackpots.",
    h1: "Neon Bingo '86 — Free 80s Bingo Hall & Comedy Caller Online",
    kicker: '1986 Electric Bingo Hall // All 90 Comedy Calls & UV Dabber Pen',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'bingo',
    category: 'all',
    schemaType: 'VideoGame',
  },
  {
    path: '/games/speed-swipe',
    title: 'Meme Speed Swipe — Fast Dank or Cringe Rating Arcade Game | THE MEMES.net',
    description:
      'Play Meme Speed Swipe free online! Rapid-fire swipe through fresh community memes, crown Dank hits, combo your XP multiplier, and jump straight into the free meme generator.',
    h1: 'Meme Speed Swipe — Fast-Paced Community Meme Judge Game',
    kicker: 'THE MEMES.net // Lightning Card Rating & XP Combos',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'swipe',
    category: 'all',
    schemaType: 'VideoGame',
  },
  {
    path: '/games/meme-battle-arena',
    title: 'Meme Battle Arena — Live 1v1 Head-to-Head Meme Voting Showdown | THE MEMES.net',
    description:
      'Play the 1v1 King of the Hill Meme Battle Arena free online! Pit viral memes head-to-head, vote for crowd champions, track win streaks, and share direct arena matchups.',
    h1: '1v1 Meme Battle Arena — King of the Hill Showdown',
    kicker: 'THE MEMES.net // Head-To-Head Meme Bracket Battles',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'battle',
    category: 'all',
    schemaType: 'VideoGame',
  },
  {
    path: '/fake-teams-zoom-call-screen',
    title: 'Fake Video Call Screen (Teams & Zoom Style) — Boss Key Meeting Prank | THE MEMES.net',
    description:
      'Open a realistic fake Teams- or Zoom-style standup video call screen with 4 coworkers, live corporate transcript captions, incoming Boss Call ringtone prank, and Wi-Fi freeze button.',
    h1: 'Fake Video Call Screen (Teams & Zoom Style) — Boss Key Meeting Prank',
    kicker: 'Boss Key Panic Suite // Fake Video Call & Incoming Boss Ringer',
    changefreq: 'weekly',
    priority: '0.92',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'zoom',
  },
  {
    path: '/fake-hacker-terminal-screen',
    title: 'Fake Hacker Terminal & Linux DevOps Compiler Screen — Boss Key Prank | THE MEMES.net',
    description:
      'Launch a convincing fullscreen fake Linux DevOps terminal & hacker console screen. Mash any key to compile fake Kubernetes & Rust microservices while earning Stealth XP.',
    h1: 'Fake Hacker Terminal & DevOps Linux Screen — Fullscreen Simulator',
    kicker: 'Boss Key Panic Suite // Live Type-To-Compile Terminal',
    changefreq: 'weekly',
    priority: '0.9',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'terminal',
  },
  {
    path: '/fake-ai-workspace-boss-screen',
    title: 'Fake Enterprise AI Workspace & Prompt Dashboard — Boss Key Screen | THE MEMES.net',
    description:
      'Open a realistic fake Enterprise AI Copilot Q4 strategic planning dashboard generating boardroom architecture memos. Great Boss Key disguise or coworker prank.',
    h1: 'Fake Enterprise AI Copilot Workspace — Boss Key Screen Disguise',
    kicker: 'Boss Key Panic Suite // Q4 Executive AI Strategy Console',
    changefreq: 'weekly',
    priority: '0.88',
    viewMode: 'pranks',
    category: 'all',
    bossDisguise: 'ai',
  },
  {
    path: '/rules',
    title: 'House Rules — Keep It Funny & Safe | THE MEMES.net',
    description:
      'Community House Rules for posting memes, GIFs, and comments on THE MEMES.net: what is welcome, what gets removed, and how strikes work.',
    h1: 'THE MEMES.net House Rules',
    kicker: 'Safety & Community Guidelines',
    changefreq: 'monthly',
    priority: '0.6',
    viewMode: 'feed',
    category: 'all',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/terms',
    title: 'Terms of Use | THE MEMES.net',
    description:
      'Terms of Use for creating memes, browsing community feeds, and playing free arcade games on THE MEMES.net.',
    h1: 'Terms of Use',
    kicker: 'Legal Terms & Pretend MemeDollarz',
    changefreq: 'monthly',
    priority: '0.5',
    viewMode: 'feed',
    category: 'all',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy & Data Deletion | THE MEMES.net',
    description:
      'What data THE MEMES.net stores, privacy-friendly analytics, localStorage preferences, and how to delete your account and memes.',
    h1: 'Privacy Policy & Your Data',
    kicker: 'Data Transparency & Account Deletion',
    changefreq: 'monthly',
    priority: '0.5',
    viewMode: 'feed',
    category: 'all',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/takedown',
    title: 'Copyright & Photo Takedown Form | THE MEMES.net',
    description:
      'Request fast removal of copyrighted artwork or a photo of yourself on THE MEMES.net through our high-priority takedown form.',
    h1: 'Copyright & Privacy Takedown',
    kicker: 'High-Priority Removal Queue',
    changefreq: 'monthly',
    priority: '0.55',
    viewMode: 'feed',
    category: 'all',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/contact',
    title: 'Contact & Safety Desk | THE MEMES.net',
    description:
      'Contact details and safety escalation routes for THE MEMES.net moderators and site maintainers.',
    h1: 'Contact & Safety Desk',
    kicker: 'Maintainer & Safety Inquiries',
    changefreq: 'monthly',
    priority: '0.5',
    viewMode: 'feed',
    category: 'all',
    ogImage: 'https://www.thememes.net/og-card.png',
  },
  {
    path: '/hall-of-fame',
    category: null,
    tag: null,
    sortBy: 'top',
    title: 'Caption Battle Hall of Fame — Daily Winners Archive | THE MEMES.net',
    kicker: 'Daily Caption Battle // Winners Archive',
    changefreq: 'daily',
    priority: '0.6',
    description:
      'Permanent archive of Daily Caption Battle winners on TheMemes.net, featuring yesterday’s Caption King, 24-hour crown holders, and top-voted captions.',
    ogImage: 'https://www.thememes.net/og-card.png',
    h1: 'Caption Battle Hall of Fame',
  },
  {
    path: '/year-in-memes',
    category: null,
    tag: null,
    sortBy: 'top',
    title: 'Year in Memes — Top Community Memes & Battle Champions | THE MEMES.net',
    kicker: 'Annual Retrospective // Best of the Year',
    changefreq: 'weekly',
    priority: '0.7',
    description:
      'TheMemes.net annual retrospective: top community memes by real upvotes, Daily Caption Battle champions, and Creators of the Year.',
    ogImage: 'https://www.thememes.net/og-card.png',
    h1: 'Year in Memes — Best Community Comedy of the Year',
  }
];

// Plan 1.6: with FEATURE_CASINO_GAMES off, casino pages drop out of prerender, sitemap and nav.
export const SEO_ROUTES = ALL_SEO_ROUTES.filter(
  (r) => FEATURE_CASINO_GAMES || !isCasinoGame(r.viewMode)
);

export function getOgImageSlugForRoutePath(routePath = '/') {
  const clean = String(routePath || '/').split('?')[0].split('#')[0].trim().replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/index.html') return null;
  if (clean === '/games') return 'games';
  if (clean.startsWith('/games/')) return clean.slice('/games/'.length);
  if (clean.startsWith('/memes/')) return `memes-${clean.slice('/memes/'.length)}`;
  return clean.replace(/^\/+/, '').replaceAll('/', '-');
}

export function getOgImageForRoutePath(routePath = '/') {
  const slug = getOgImageSlugForRoutePath(routePath);
  return slug ? `${SITE_ORIGIN}/og/${slug}.png` : DEFAULT_OG_IMAGE;
}

for (const route of SEO_ROUTES) {
  if (!route.ogImage) {
    route.ogImage = getOgImageForRoutePath(route.path);
  }
}

const ROUTE_BY_PATH = new Map(SEO_ROUTES.map((r) => [r.path, r]));

export function normalizeRoutePath(pathname = '/') {
  const raw = String(pathname || '/').split('?')[0].split('#')[0].trim();
  if (!raw || raw === '/') return '/';
  let cleaned = raw.replace(/\/index\.html$/i, '').replace(/\.html$/i, '').replace(/\/+$/, '');
  if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
  cleaned = cleaned.toLowerCase();
  if (cleaned === '/memes/tech') return '/memes/programming';
  if (cleaned === '/gif-meme-maker') return '/meme-generator';
  if (cleaned === '/games/plinko') return '/games';
  if (cleaned === '/games/bingo' || cleaned === '/neon-bingo' || cleaned === '/bingo') return '/games/neon-bingo';
  if (cleaned === '/fake-teams-call' || cleaned === '/fake-zoom-call' || cleaned === '/fake-teams-screen') {
    return '/fake-teams-zoom-call-screen';
  }
  if (cleaned === '/fake-terminal' || cleaned === '/fake-hacker-screen') return '/fake-hacker-terminal-screen';
  if (cleaned === '/fake-ai-screen' || cleaned === '/fake-ai-workspace') return '/fake-ai-workspace-boss-screen';
  if (cleaned === '/boss-screen') return '/fake-excel-boss-screen';
  if (cleaned === '/daily') return '/games/guess-the-meme';
  return cleaned || '/';
}

export function getSeoRouteByPath(pathname) {
  return ROUTE_BY_PATH.get(normalizeRoutePath(pathname)) || null;
}

export function resolveRouteFromLocation(pathname = '/', search = '') {
  const route = resolveRouteFromLocationRaw(pathname, search);
  if (route && route.viewMode !== casinoSafeViewMode(route.viewMode)) {
    return { ...route, viewMode: 'lobby' };
  }
  return route;
}

function resolveRouteFromLocationRaw(pathname = '/', search = '') {
  const normPath = normalizeRoutePath(pathname);
  const params = new URLSearchParams(search || '');

  // Caption Battle deep links (/battle/<battleId> or /battle/<battleId>/e/<entryId>)
  const pathBattleMatch = (pathname || '').match(
    /^\/battle\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/e\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?\/?$/i
  );
  if (pathBattleMatch && pathBattleMatch[1]) {
    const battleId = pathBattleMatch[1];
    const battleEntryId = pathBattleMatch[2] || null;
    return {
      matchedPath: battleEntryId ? `/battle/${battleId}/e/${battleEntryId}` : `/battle/${battleId}`,
      isDedicatedLanding: true,
      viewMode: 'feed',
      category: 'all',
      battleId,
      battleEntryId,
      searchQuery: '',
      showStudio: false,
      forgeIntent: null,
      extrasDrawerOpen: false,
      extrasFocus: null,
      bossKeyActive: false,
      prankDisguise: null,
      surpriseOpen: false,
      theaterMemeId: null
    };
  }

  // Creator profile deep links (/u/<handle>)
  const pathCreatorMatch = (pathname || '').match(/^\/u\/([^/?#]+)/i);
  if (pathCreatorMatch && pathCreatorMatch[1]) {
    let rawHandle = pathCreatorMatch[1];
    try {
      rawHandle = decodeURIComponent(rawHandle);
    } catch {
      // keep raw path segment
    }
    const cleanHandle = String(rawHandle).trim().replace(/^@+/, '');
    if (/^[a-zA-Z0-9_-]{2,32}$/.test(cleanHandle)) {
      return {
        matchedPath: `/u/${encodeURIComponent(cleanHandle)}`,
        isDedicatedLanding: true,
        viewMode: 'creator',
        creatorHandle: cleanHandle,
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
      };
    }
  }

  // Meme template library (/templates and /templates/<slug>-meme-template)
  if (normPath === TEMPLATES_INDEX_PATH || normPath.startsWith(`${TEMPLATES_INDEX_PATH}/`)) {
    const tpl = normPath === TEMPLATES_INDEX_PATH ? null : getTemplateByPath(normPath);
    return {
      matchedPath: tpl ? tpl.path : TEMPLATES_INDEX_PATH,
      isDedicatedLanding: true,
      viewMode: 'templates',
      templateSlug: tpl ? tpl.slug : null,
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
    };
  }

  // Shared meme deep links (/m/<id> or ?m=<id> / ?meme=<id>)
  const pathMemeMatch = (pathname || '').match(/^\/m\/([^/?#]+)/i);
  let theaterMemeId;
  if (pathMemeMatch && pathMemeMatch[1]) {
    try {
      theaterMemeId = decodeURIComponent(pathMemeMatch[1]);
    } catch {
      theaterMemeId = pathMemeMatch[1];
    }
  } else {
    theaterMemeId = params.get('m') || params.get('meme') || null;
  }

  const matchedRoute = getSeoRouteByPath(normPath);
  if (matchedRoute && matchedRoute.path !== '/') {
    const forgeIntent = matchedRoute.studioTemplateId
      ? { mode: 'template', templateId: matchedRoute.studioTemplateId }
      : matchedRoute.studioPreset === 'gif'
      ? { mode: 'gif' }
      : matchedRoute.path === '/templates'
      ? { mode: 'templates' }
      : matchedRoute.openStudio
      ? { mode: 'blank' }
      : null;
    return {
      matchedPath: matchedRoute.path,
      isDedicatedLanding: true,
      viewMode: matchedRoute.viewMode || 'feed',
      category: matchedRoute.category || 'all',
      searchQuery: params.get('q') || '',
      showStudio: Boolean(matchedRoute.openStudio),
      forgeIntent,
      extrasDrawerOpen: Boolean(matchedRoute.openSoundboard),
      extrasFocus: matchedRoute.openSoundboard ? 'soundboard' : null,
      bossKeyActive: Boolean(matchedRoute.bossDisguise),
      prankDisguise: matchedRoute.bossDisguise || null,
      surpriseOpen: false,
      theaterMemeId
    };
  }

  // Legacy query-param compatibility (?mode=... / ?category=... / ?q=...)
  const rawMode = (params.get('mode') || '').toLowerCase();
  const mode = MODE_ALIASES[rawMode] || rawMode;
  const rawCat = (params.get('category') || '').toLowerCase();
  const mappedCat = CATEGORY_SLUG_TO_ID[rawCat] || 'all';
  const searchQuery = params.get('q') || '';

  if (mode === 'generator' || mode === 'forge' || mode === 'studio') {
    return {
      matchedPath: '/meme-generator',
      isDedicatedLanding: true,
      viewMode: 'feed',
      category: 'all',
      searchQuery,
      showStudio: true,
      forgeIntent: { mode: 'blank' },
      extrasDrawerOpen: false,
      extrasFocus: null,
      bossKeyActive: false,
      prankDisguise: null,
      surpriseOpen: false,
      theaterMemeId
    };
  }

  if (mode === 'soundboard') {
    return {
      matchedPath: '/meme-soundboard',
      isDedicatedLanding: true,
      viewMode: 'feed',
      category: 'all',
      searchQuery,
      showStudio: false,
      forgeIntent: null,
      extrasDrawerOpen: true,
      extrasFocus: 'soundboard',
      bossKeyActive: false,
      prankDisguise: null,
      surpriseOpen: false,
      theaterMemeId
    };
  }

  const surpriseOpen = ['goose', 'wtf', 'surprise', 'honk'].includes(mode) || params.get('surprise') === '1';

  const validModes = [
    'feed',
    'reels',
    'lobby',
    'bingo',
    'blackjack',
    'poker',
    'thousand',
    'roulette',
    'pusher',
    'slots',
    'invaders',
    'serpent',
    'blaster',
    'sunset',
    'void',
    'riders',
    'crush',
    'pinball',
    'stocks',
    'derby',
    'guess',
    'eightball',
    'hilow',
    'swipe',
    'battle'
  ];

  let viewMode;
  if (validModes.includes(mode)) {
    viewMode = mode;
  } else if (mode === 'plinko') {
    viewMode = 'lobby';
  } else if (mappedCat !== 'all' || searchQuery || theaterMemeId) {
    viewMode = 'feed';
  } else {
    // Phase 30: Land mobile & desktop visitors straight into scannable meme feed + 1-tap meme maker;
    // Fullscreen Reels stays 1 tap away in the Mobile Dock / top nav.
    viewMode = 'feed';
  }

  const isDedicatedLanding = Boolean(
    theaterMemeId ||
      GAME_VIEW_MODE_TO_PATH[viewMode] ||
      mappedCat !== 'all' ||
      surpriseOpen ||
      (validModes.includes(mode) && mode !== 'feed')
  );

  return {
    matchedPath: pathMemeMatch
      ? `/m/${encodeURIComponent(theaterMemeId)}`
      : mappedCat !== 'all' && viewMode === 'feed'
      ? `/memes/${CATEGORY_ID_TO_SLUG[mappedCat]}`
      : GAME_VIEW_MODE_TO_PATH[viewMode] || '/',
    isDedicatedLanding,
    viewMode,
    category: mappedCat,
    searchQuery,
    showStudio: false,
    forgeIntent: null,
    extrasDrawerOpen: false,
    extrasFocus: null,
    bossKeyActive: false,
    prankDisguise: null,
    surpriseOpen,
    theaterMemeId
  };
}

export function getCanonicalPathForState({
  viewMode = 'feed',
  category = 'all',
  creatorHandle = null,
  templateSlug = null,
  battleId = null,
  battleEntryId = null,
  showStudio = false,
  forgeIntent = null,
  extrasDrawerOpen = false,
  extrasFocus = null,
  bossKeyActive = false,
  prankDisguise = null,
  theaterMemeId = null
} = {}) {
  if (theaterMemeId) {
    return `/m/${encodeURIComponent(String(theaterMemeId))}`;
  }
  if (battleId) {
    return battleEntryId
      ? `/battle/${encodeURIComponent(String(battleId))}/e/${encodeURIComponent(String(battleEntryId))}`
      : `/battle/${encodeURIComponent(String(battleId))}`;
  }
  if (viewMode === 'creator' && creatorHandle) {
    const clean = String(creatorHandle).trim().replace(/^@+/, '');
    if (clean) return `/u/${encodeURIComponent(clean.toLowerCase())}`;
  }
  // Template pages keep their own URL even while the editor is open on top of them.
  if (viewMode === 'templates') {
    return templateSlug ? getTemplateRoutePath(templateSlug) : TEMPLATES_INDEX_PATH;
  }
  if (bossKeyActive && prankDisguise && PRANK_DISGUISE_TO_PATH[prankDisguise]) {
    return PRANK_DISGUISE_TO_PATH[prankDisguise];
  }
  if (viewMode === 'pranks') return '/prank-screens';
  if (showStudio) {
    if (forgeIntent?.mode === 'gif') {
      return '/meme-generator';
    }
    if (!forgeIntent || forgeIntent.mode === 'blank' || forgeIntent.mode === 'templates' || forgeIntent.mode === 'template') {
      return '/meme-generator';
    }
  }
  if (extrasDrawerOpen && extrasFocus === 'soundboard') {
    return '/meme-soundboard';
  }
  if (GAME_VIEW_MODE_TO_PATH[viewMode]) {
    return GAME_VIEW_MODE_TO_PATH[viewMode];
  }
  if (viewMode === 'feed' && category && category !== 'all' && CATEGORY_ID_TO_SLUG[category]) {
    return `/memes/${CATEGORY_ID_TO_SLUG[category]}`;
  }
  return '/';
}

export function getSeoRouteForState(state = {}) {
  const path = getCanonicalPathForState(state);
  return getSeoRouteByPath(path) || SEO_ROUTES[0];
}
