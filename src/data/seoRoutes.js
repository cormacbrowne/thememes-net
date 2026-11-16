// ==========================================
// PHASE 28.8 & 28.9: CRAWLABLE PATH ROUTES & SEO METADATA REGISTRY
// Shared between the React SPA (App.jsx, seoEngine.js, SeoDiscoveryFooter.jsx)
// and the post-build static HTML prerenderer (scripts/prerender-seo.mjs).
// ==========================================

import { STUDIO_TEMPLATES } from './starterMemes.js';

export const SITE_ORIGIN = 'https://www.thememes.net';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-card.png`;

export const TEMPLATE_SEO_SLUGS = {
  'tpl-drake-compare': 'drake-meme-generator',
  'tpl-expanding-brain': 'expanding-brain-meme-generator',
  'tpl-two-buttons': 'two-buttons-meme-generator',
  'tpl-distracted-choice': 'distracted-boyfriend-meme-generator',
  'tpl-this-is-fine': 'this-is-fine-meme-generator',
  'tpl-change-my-mind': 'change-my-mind-meme-generator',
  'tpl-buff-vs-smol': 'buff-doge-vs-cheems-meme-generator',
  'tpl-stonks-up': 'stonks-meme-generator',
  'tpl-not-stonks': 'not-stonks-meme-generator',
  'tpl-woman-yelling-cat': 'woman-yelling-at-cat-meme-generator',
  'tpl-gigachad-verdict': 'gigachad-meme-generator',
  'tpl-clown-makeup': 'clown-makeup-meme-generator',
  'tpl-always-has-been': 'always-has-been-meme-generator',
  'tpl-brain-at-3am': 'sleeping-brain-3am-meme-generator',
  'tpl-surprised-shock': 'surprised-pikachu-shock-meme-generator',
  'tpl-trade-offer': 'trade-offer-meme-generator',
  'tpl-bell-curve-iq': 'iq-bell-curve-meme-generator',
  'tpl-highway-exit': 'left-exit-off-ramp-meme-generator',
  'tpl-spiderman-point': 'spiderman-pointing-meme-generator',
  'tpl-trophy-celebration': '3rd-place-trophy-meme-generator'
};

export function getTemplateRoutePath(tplOrId) {
  const id = typeof tplOrId === 'string' ? tplOrId : tplOrId?.id;
  if (!id) return '/templates';
  const slug = TEMPLATE_SEO_SLUGS[id] || `${id.replace(/^tpl-/, '')}-meme-generator`;
  return `/templates/${slug}`;
}

export const TEMPLATE_ID_TO_PATH = Object.fromEntries(
  STUDIO_TEMPLATES.map((tpl) => [tpl.id, getTemplateRoutePath(tpl)])
);

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
  relatable: 'relatable'
};

export const CATEGORY_ID_TO_SLUG = {
  dank: 'dank',
  tech: 'programming',
  gaming: 'gaming',
  relatable: 'relatable'
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
  ai: '/fake-ai-workspace-boss-screen'
};

export const SEO_ROUTES = [
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
    introParagraphs: [
      'THE MEMES.net is a fast, simple meme maker, GIF caption tool, and community feed built for instant laughs on desktop, tablet, and phone. Start scrolling right away through curated dank memes, software engineering jokes, gaming moments, and relatable 3AM thoughts—or switch to fullscreen vertical Reels on mobile to double-tap, upvote, and share any post in seconds.',
      'Want to make your own meme without downloading an app or creating an account? Upload, drop, or paste any photo or animated GIF right on the homepage or inside the Meme & GIF Maker, type classic white Impact Top Text and Bottom Text, and hit Download or Share to get a crisp PNG or animated GIF stamped cleanly with the www.thememes.net watermark.',
      'Between uploads, explore the 16-pad meme soundboard (featuring Vine Boom, MLG Airhorn, Clown Honk, and iOS silent-switch audio unlock), tune into live procedural synthwave radio, or unwind in free-to-play retro arcade cabinets including Neon Coin Dozer 86, 5-table Pinball, Vegas 777 Slots, Blackjack, Lightning Roulette, Meme Crush Saga, and the MEMEDAQ 86 Stock Market Simulator.'
    ]
  },
  {
    path: '/meme-generator',
    title: 'Free Meme & GIF Generator — Add Top & Bottom Text Online | THE MEMES.net',
    description:
      'Upload any image or GIF, add classic Top & Bottom meme text free online, and download or share instantly with a clean www.thememes.net watermark.',
    h1: 'Free Meme & GIF Generator — Top & Bottom Text Maker',
    kicker: 'THE MEMES.net // Simple Image & GIF Meme Maker',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'feed',
    category: 'all',
    openStudio: true,
    schemaType: 'SoftwareApplication',
    introParagraphs: [
      'Make a classic meme in seconds using the streamlined Image & GIF Maker on THE MEMES.net. Instead of digging through cluttered template galleries, simply drag and drop any image, pick a GIF from your phone or computer, or paste straight from your clipboard with Ctrl+V to jump right into captioning with zero account required.',
      'Type your Top Text setup and Bottom Text punchline directly in crisp white Impact style with dark outlines, or tap Random Text when you want fast comedy inspiration. Need quick tweaks? Flip between Impact and Clean styles, toggle ALL CAPS, adjust caption size for desktop or mobile legibility, or expand optional emoji stickers and retro color filters only when you want them.',
      'Unlike static screenshot tools that freeze animated GIFs, THE MEMES.net burns your Top and Bottom captions and subtle www.thememes.net watermark right into every frame of animated GIFs and high-resolution PNGs cleanly in your browser—ready for WhatsApp, iMessage, Discord, Reddit, or one-tap community posting.'
    ]
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
    introParagraphs: [
      'Mash the 16-pad meme soundboard right in your browser with instant zero-latency Web Audio synthesis. Trigger classics like the Vine Boom 808 Drop, MLG Triple Airhorn, Clown Honk, Cartoon Spring Boing, Whoopee Cushion, Sad Trombone, Anime Impact, Coin Jackpot, Dank Police Siren, Rubber Duck Army, World’s Smallest Violin, Emotional Damage Gong, Falling Metal Pipe Clang, Scooby Run Bongos, UFO Brain-Ray, and Retro OS Crash.',
      'Unlike heavy MP3 soundboards that stall on slow connections, every sound on THE MEMES.net is procedurally synthesized live on your device—meaning instant response, zero broken audio links, and four switchable comedy sound packs (Goofy Cartoon, Vine & Brainrot, MLG Airhorn, and Cyber-Arcade) that restyle sound effects across the entire site.',
      'Designed specifically for mobile as well as desktop, our custom iOS Safari playback unlocker routes sound cleanly even when an iPhone physical mute switch is enabled. Pair the soundboard with screen reality filters, silly stampedes, or THE MEMES FM procedural synthwave radio for maximum Discord calls and IRL comedy timing.'
    ]
  },
  {
    path: '/games',
    title: 'Free Cyber-Arcade Lobby — 15 Retro & Meme Games | THE MEMES.net',
    description:
      "Explore all 15 free browser arcade games on THE MEMES.net: Neon Bingo '86 (90 UK calls), Neon Coin Dozer, Lightning Roulette, Pinball, Magic 8-Ball, Neon Derby, Guess The Meme & MEMEDAQ.",
    h1: 'Cyber-Arcade Lobby — Play 15 Free Retro & Meme Games',
    kicker: 'THE MEMES.net // Casino, Skill, Daily Meme Games & Market Sim',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'lobby',
    category: 'all',
    introParagraphs: [
      "Step inside the Cyber-Arcade Lobby on THE MEMES.net—home to 15 free browser-based arcade cabinets, neon casino tables, skill challenges, and daily meme prediction games with zero downloads, accounts, or real-money deposits required. Filter quickly across Casino, Skill, Meme Games, and Market Sim sections, pin your favorite cabinets with star bookmarks, and pick up immediately from your Continue Playing shelf.",
      "Choose between fast hits like Neon Bingo '86 (all 90 classic comedy calls, UV dabber pens & Ceefax 888), Neon Coin Dozer '86, Lightning Roulette, Neon 21's, Vegas 777 Slots, 80s Magic 8-Ball Oracle, and Neon Derby '86 meme horse racing, or dive into skill hits like 5-table Neon Pinball and Meme Crush Saga. Need quick free rounds? Try daily pixelated Guess The Meme, endless Higher or Lower upvote streaks, Hyper Swipe, or 1v1 Meme Arena.",
      'Every wager runs purely on free MemeDollarz (M$) and MemeCentz (¢) earned by uploading and voting on memes, and practice mode activates automatically so newcomers can play any cabinet risk-free on desktop, iPad, or mobile portrait screens with procedural synthwave radio. Switch smoothly between cabinets or head back to the live meme feed and Meme Forge Studio anytime.'
    ]
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
    introParagraphs: [
      "Play Neon Coin Dozer '86 free online directly in your browser—no downloads, no real money, and smooth 60fps physics on desktop, iPad, and iPhone. Click or tap across the drop chute to release gleaming quarters and silver score medals onto the reciprocating chrome pusher shelf and watch coins teeter dramatically on the front cliffhanger lip before cascading into your collection tray.",
      'Time your coin drops to pass through the moving Skill Gate basket and charge the 3-reel backbox mini-slot! Hitting Skill Gate spins awards coin avalanches, twin neon diamonds, mega pusher super-strokes, and temporary Laser Side-Walls that block gutter losses. Five collectible retro prizes—Diamond, Mystery Box, Gold Joystick, Trophy, and Cyber Crown—stack permanent session score multipliers up to 2.25x.',
      'Need an extra push? Fire a 3-Coin Barrage, toggle Auto-Drop stream mode, or tap Cabinet Nudge to shake loose cliffhanger stacks (watching out for the 3-strike TILT sensor). Switch anytime between unlimited Free Play practice coins and MemeDollarz mode using MemeDollarz earned from uploading and upvoting memes.'
    ]
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
    introParagraphs: [
      "Defend the neon synthwave grid in Meme Invaders '86, a free 60fps retro Space Invaders arcade shooter built right into your browser—no downloads, no sign-in walls, and zero MemeDollarz required to play. Blast through 40 descending emoji and meme-face invaders arranged across five scoring tiers while weaving behind four destructible pixel-block shields that visibly crumble pixel by pixel under enemy and player laser fire.",
      'Play seamlessly across desktop, tablet, and phone using Arrow or A/D keys and Spacebar, smooth touch-drag steering plus tactile arcade thumb pads on mobile, or any plugged-in USB or Bluetooth gamepad controller. Keep your eyes peeled for the glowing Mystery Bonus Saucer crossing overhead—tagging it awards up to 300 bonus points and unleashes temporary Rapid Laser overdrive.',
      "Every fifth wave summons a towering Giant Meme Boss constructed directly from today's top-ranked approved community meme thumbnail from the live feed, firing tri-beam plasma spreads that test your shield timing and dodge reflexes. Switching browser tabs pauses your run automatically, and finishing a wave climb lets you stamp your 3-letter initials onto the global Meme Invaders '86 arcade leaderboard."
    ]
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
    introParagraphs: [
      'Slither through the cyber-grid in Neon Serpent, a free 60fps synthwave reaction-snake arcade cabinet playable directly in your browser with zero downloads, zero cost, and instant leaderboard competition. Steer your glowing serpent across a 20x20 neon matrix while snatching meme reaction emojis that transform the pace and strategy of every single run.',
      'Unlike ordinary classic snake clones, every emoji flavor packs a distinct tactical power-up: grab laughing bites for crisp score growth, chase viral crowns for mega bonus points, hit fire emojis to ignite double-point speed overdrive, tap stoic moai heads to activate calming slow-motion control around cramped walls, or devour skulls to shed three tail segments and escape tight corners.',
      'Built mobile-first with continuous swipe detection across the touch-protected canvas and tactile D-pad buttons underneath, Neon Serpent plays effortlessly with one thumb on phones, Arrow or WASD keys on desktop keyboards, or any connected USB and Bluetooth gamepad controller. Switching browser tabs pauses your run automatically, and every high score invites you to stamp your 3-letter arcade initials onto the global cabinet board.'
    ]
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
    introParagraphs: [
      'Smash through retro pixel-art formations in Brick Blaster, a free 60fps arcade brick-breaker game running directly in your browser with zero downloads, zero cost, and full global leaderboard support. Each stage arranges colorful neon, armored, and mystery bricks into unmistakable word art and pixel faces—starting with glowing LOL blocks before advancing into Smiley Face, MEME word art, and Cyber Frog levels.',
      'Steer your energy paddle cleanly by dragging anywhere across the screen on phones and tablets, tapping the on-screen control buttons, holding Left or Right Arrow and A/D keys on desktop keyboards, or connecting a USB or Bluetooth gamepad controller. Aim bank shots off the curved paddle edges to slice behind multi-hit titanium rows and crack glowing star bricks.',
      'Every cracked mystery block releases falling power-up orbs that transform the arena: catch ⚡ Multi-Ball to split shots up to four simultaneous balls, grab 🔫 Twin Laser to arm deck-mounted plasma cannons that vaporize stubborn bricks, or trigger ↔️ Wide Paddle for extra defense against high-speed rebounds. Switching tabs auto-pauses your match, and finishing a run lets you lock your 3-letter initials onto the leaderboard.'
    ]
  },
  {
    path: '/games/sunset-sprint',
    title: 'Sunset Sprint — Free Synthwave OutRun Highway Racer | THE MEMES.net',
    description:
      'Play Sunset Sprint free online! Race 80s garage cars down a pseudo-3D synthwave highway, dodge traffic, beat checkpoint timers & grab cassettes that switch THE MEMES FM.',
    h1: 'Sunset Sprint — Free Retro Synthwave Highway Racer',
    kicker: 'Pseudo-3D 80s Racer // Drag Steer, Keyboard & Gamepad — Free to Play',
    ogImage: 'https://www.thememes-net/og/games.png',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'sunset',
    category: 'all',
    introParagraphs: [
      'Hit the endless neon highway in Sunset Sprint, a free pseudo-3D synthwave OutRun racer built directly into your browser with zero downloads, zero cost, and global cabinet leaderboard competition. Choose any of our four iconic 1980s garage rides—the brushed stainless DeLorean DMC-12, Aston Martin Lagonda, Sierra RS Cosworth, or Porsche 911 SC—and blast toward the glowing retro horizon.',
      'Weave around oncoming highway traffic across winding perspective bends using smooth finger dragging on touchscreens, tactile steer and nitro buttons on mobile, Arrow or A/D keys on desktop keyboards, or any connected gamepad controller. Every stage challenges you to cross illuminated highway Checkpoints before the countdown clock hits zero, awarding eighteen bonus seconds and ascending stage multipliers.',
      'Keep your eyes open for glowing cassette tapes spinning along the asphalt: snagging a tape scores 250 bonus points, fires dual exhaust nitro flames past 155 MPH, and automatically switches your THE MEMES FM radio station to a fresh synthwave or chiptune track. Switching tabs pauses your run automatically, and every finish saves to the Sunset Sprint leaderboard.'
    ]
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
    introParagraphs: [
      'Pilot a glowing phosphor vector craft in Vector Void, a free 60fps twin-stick asteroid space shooter built right into your browser with zero downloads, zero cost, and full global leaderboard rankings. Blast apart geometric rock clusters orbiting a deep synthwave sector where your ship, laser bolts, and drifting debris wrap seamlessly across every edge of the screen.',
      'Take total command across any screen with authentic twin-stick controls: on phones and tablets, slide your left thumb on the thruster pad to dodge in 360 degrees while aiming and auto-firing simultaneously with your right thumb stick. On desktop computers, steer with W-A-S-D keys, aim and fire independently with Arrow keys or your mouse cursor, or plug in a dual-stick USB or Bluetooth gamepad.',
      'Every jagged large vector rock shatters into twin fast-spinning medium fragments before splitting again into erratic mini-shards, escalating tension with each cleared sector wave. Tab switching automatically pauses your flight, and every high score invites you to engrave your 3-letter arcade initials onto the Vector Void cabinet board.'
    ]
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
    introParagraphs: [
      'Race razor-sharp neon lightcycles inside a glowing synthwave containment grid in Grid Riders—a free arcade arena dueler featuring both single-player AI escalations and instant 2-player same-device battles with zero cost or sign-up. Carve solid plasma trails across the 44x44 circuit, scoop up Hyper-Cell energy pickups for bonus points, and box rivals into fatal barriers before they cut off your lane.',
      'In 1P vs AI mode, challenge an adaptive pathfinding opponent that evaluates open grid space, intercepts open corridors, and raises round tempo alongside symmetrical laser pylons starting on Round 2. Climb the real global Grid Riders cabinet leaderboard by surviving longer circuits, grabbing pickups, and derezzing the AI across consecutive rounds.',
      'Ready for couch competition? Flip the cabinet toggle to 2P Local Duel to battle a friend on one keyboard (WASD versus Arrow keys) or place your phone between two players with a rotated face-to-face top touch pad for authentic tabletop arcade duels.'
    ]
  },
  {
    path: '/games/pinball',
    title: 'Free Retro Pinball Game Online — 5 Neon Arcade Tables | THE MEMES.net',
    description:
      'Play 5 distinct 80s neon pinball tables online for free! Master dual flippers, 3-ball multiball madness, plasma drain shields, drop targets, and high-score jackpots in your browser.',
    h1: 'Las Vegas Neon Pinball — 5 Free Retro Arcade Tables',
    kicker: '60fps Physics Pinball // Keyboard & Touch Flippers',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'pinball',
    category: 'all',
    introParagraphs: [
      "Step up to five completely distinct 1980s neon pinball tables running at 60fps right in your browser: Vegas Strip '85, Outrun Turbo Highway with boost pads and a patrolling synthwave coupe, Invader Cyber-Grid with alien targets and wormhole portals, Miami Vice Lagoon with dual spinners, and Cosmic Reactor Boss featuring a central gravity well and moving energy shield.",
      'Pull back the spring-loaded plunger with Space or touch hold, and defend the center drain using responsive left and right flippers (Arrow keys, A/D, or dedicated touch zones on phones and tablets). Light up L-U-C-K top rollover lanes for up to 5x table multipliers, complete the M-E-M-E drop-target bank, and sink the center Vegas Jackpot hole.',
      'Collect live playfield power-up orbs as you play to unleash 3-Ball Multiball Madness, deploy a temporary Plasma Drain Shield, activate Mega Magnetic Flippers, trigger 2x Vegas Fever Overdrive, or detonate a Bumper Nuker. Practice freely or enter Coin-Op Prize Runs to climb the Arcade Leaderboard.'
    ]
  },
  {
    path: '/games/slots',
    title: 'Free Vegas 777 Slot Machine Game Online (No Real Money) | THE MEMES.net',
    description:
      'Spin the retro Las Vegas 777 one-arm bandit slot machine online for free with no real money. Use strategic Reel HOLD & NUDGE buttons, trigger jackpot drumrolls, and win MemeDollarz.',
    h1: 'Las Vegas 777 Neon Slot Machine — Free Arcade Play',
    kicker: '3-Reel Mechanical Drums // Free Pretend MemeDollarz — Just for Fun',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'slots',
    category: 'all',
    introParagraphs: [
      'Pull the gleaming 3D chrome lever on the THE MEMES.net Las Vegas 777 Neon Slot Machine—a purely free-to-play retro arcade cabinet built with zero real-money wagering or cashouts. Watch three curved ivory mechanical drums spin smoothly with classic vector Flaming 777s, Neon Diamonds, Triple Gold BARs, Golden Liberty Bells, Watermelons, Lemons, and Twin Cherries.',
      'Each spin delivers classic arcade suspense with sequential reel stops and a dramatic third-reel jackpot drumroll whenever the first two symbols line up. Lock strong reels between spins using strategic HOLD toggles or bump a near-miss symbol onto the crimson laser payline with NUDGE controls while watching the progressive VFD jackpot ticker climb and chasing marquee bulbs light up.',
      'Play in unlimited Free Practice mode whenever you want pure retro sound effects and coin-hopper fountains, or wager free in-site MemeDollarz earned from creating and voting on community memes. Community meme uploads can even appear as featured jackpot reel symbols, crediting original creators with bonus XP royalties.'
    ]
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
    introParagraphs: [
      "Take a seat at Neon 21's Cyber-Blackjack against Dealer Bot '86—a crisp, fast-paced 21 card game you can play completely free in your browser with no account and zero real-money betting. Place your chip stack using quick arcade denominations or tap Free Practice to deal unlimited hands while learning or warming up.",
      'Every core blackjack decision is built in cleanly: Hit, Stand, Double Down on strong starting totals, and Split matching pairs into two independent active hands with clear active-hand indicators. Landing five cards without busting triggers an automatic 5-Card Charlie 3x bonus payout, and optional Perfect Pair side bets reward matching pocket cards.',
      'Not sure whether to hit or stand against a dealer 10 or Ace? Keep an eye on the built-in Cyber-Visor basic strategy pill at the bottom of the felt for real-time math guidance on both desktop and mobile screens—keeping the dealer cards completely visible and unobstructed on iPhone and Android.'
    ]
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
    introParagraphs: [
      "Place your free arcade bets at the glowing starting gate in Neon Derby '86, a retro synthwave meme horse racing cabinet built for desktop and mobile browsers with zero real-money wagering. Watch eight iconic internet champions—Doge Dasher, Stonks Stallion, Nyan Neigh, Pepe Pony, Gigachad Galloper, Rickroll Runner, Sad Keanu Sprinter, and Harambe Hooves—line up in bright neon jockey silks.",
      'Check the live form guide and shifting track conditions across Neon Dry, Acid Rain, and Glitch Track before locking in Win, Place, Show, or Exacta tickets, or roll the Lucky Dip button for an instant random pick. Fractional and decimal odds update cleanly with a transparent 108% overround, while a pre-race seeded draw guarantees fair results untouched by crowd cheers.',
      'Enjoy 22-second parallax races with galloping trails, live ticker commentary, optional spoken play-by-play voiceover, dramatic slow-motion photo finishes, and confetti podium celebrations. Race right away or catch scheduled posts every two minutes, plus daily 8 PM local Derby Cup events for bonus rewards or unlimited Free Practice runs.'
    ]
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
    introParagraphs: [
      'Test your internet lore every day in Guess the Meme Daily, a completely free visual meme trivia challenge on THE MEMES.net with zero cost, downloads, or login required. Each daily puzzle presents five classic meme formats—spanning reaction panels, galaxy brain tiers, and internet icons—that start heavily pixelated in crunchy retro blocks and sharpen step by step.',
      'Study the silhouette and color layout at Step 1 and pick the matching format name from four choices, or tap Enhance Clarity up to five levels to reveal sharper details. Earlier guesses earn higher point bonuses up to 100 points per round, while everyone around the world plays the exact same date-seeded daily lineup.',
      'Finish all five memes to unlock your Wordle-style emoji score grid, keep your daily solve streak alive in local storage across devices and visits, and copy your shareable results card with a direct link to challenge friends, plus unlock unlimited endless practice sets anytime you want extra rounds.'
    ]
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
    introParagraphs: [
      'Consult the glowing 1980s Neon Magic 8-Ball Oracle on THE MEMES.net—a hyper-stylized retro fortune predictor built with deep obsidian liquid shading, synthwave laser reflections, CRT scanlines, and custom Web Audio FM synthesizer pads right in your browser on desktop, iPad, and iPhone.',
      'Type any burning life, work, dating, or meme-coin question—or tap one-click 80s preset prompts like Will my meme go viral or Should I YOLO on MEMEDAQ—then grab, tap, or hit Shake the 8-Ball to watch the mystic liquid churn before a glowing equilateral icosahedron die floats up through the indigo depths to unveil your destiny.',
      'Enjoy unlimited free Oracle readings that sprinkle bonus MemeCentz into your MemeDollarz wallet on every single shake, track your recent prophecy history across rounds, copy formatted fortunes directly to friends in one tap, or toggle a thrilling Double-or-Nothing Fate Wager using your arcade stack while testing your luck against the cosmic synthwave void with calibrated arcade odds and zero downloads, accounts, or real-money deposits required.'
    ]
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
    introParagraphs: [
      "Put your meme taste to the test in Higher or Lower: Meme Edition, an endless free-to-play prediction game built right on top of the live THE MEMES.net meme catalog. Two posts appear side by side with the first meme's verified community upvote score revealed, and your job is simply to call whether the next meme has higher or lower upvotes.",
      'Pulling dynamically from real community uploads alongside classic seed memes across dank, tech, gaming, and relatable categories, every round tests how well you know what makes the internet laugh. Streak along effortlessly on desktop or mobile portrait screens with large one-tap Higher and Lower buttons and zero cost or login walls required.',
      'Beat your personal high score saved in local storage, generate a shareable streak card when a run ends, and click any meme title right inside the matchup to open its theater view, upvote it, or remix your own spin-off directly in Meme Forge.'
    ]
  },
  {
    path: '/games/poker',
    title: "Neon Hold'em '86 Poker — Free Online Texas Hold'em With Chips | THE MEMES.net",
    description:
      "Play Neon Hold'em '86 Texas Poker free online! Buy in with free MemeDollarz for stacked casino chips, bet Pre-Flop through River vs AI sharks, and cash out winnings back to your wallet.",
    h1: "Neon Hold'em '86 — Free Texas Hold'em Poker With Chips",
    kicker: 'No-Limit Texas Hold’em // Stacked Chips & MemeDollarz Buy-Ins',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'poker',
    category: 'all',
    introParagraphs: [
      "Pull up a chair at Neon Hold'em '86, our fast-paced No-Limit Texas Hold'em poker table right inside THE MEMES.net Cyber-Arcade. Stack free MemeDollarz into glowing neon casino chips, rotate the Dealer button automatically against two distinct AI card sharks, and compete across full Pre-Flop, Flop, Turn, River, and Showdown streets without downloads, deposits, or sign-ups.",
      'Built with a crisp 52-card deck shuffler and complete 7-card best-five hand evaluator spanning High Card through Royal Flush, every hand gives you instant best-hand hints alongside authentic Check, Call, Bet, Raise, Fold, and ALL IN controls. Choose stacked chip buy-ins starting at M$2.50, track live pot sizes visually in stacked casino chips, and hear crisp felt knocks and chip clinks.',
      "Cash out your table chip stack back into your Wallet at any break between hands, or flip effortlessly into risk-free Free Practice mode whenever you want unlimited demo chips to sharpen your Texas Hold'em bluffing, pot-odds sizing, and aggressive showdown strategy on iPhone, iPad, or desktop screens."
    ]
  },
  {
    path: '/games/roulette',
    title: "Free Lightning Roulette Online — 150x Neon Wheel '86 | THE MEMES.net",
    description:
      'Spin a 37-pocket European Lightning Roulette wheel free online with random up-to-150x lightning multipliers, inside & outside bets, and quick presets. Zero real money required.',
    h1: "Neon Lightning Roulette '86 — Free Online European Wheel",
    kicker: '37-Pocket Single Zero // Up To 150x Multipliers',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'roulette',
    category: 'all',
    introParagraphs: [
      "Spin the high-contrast 480px European single-zero roulette wheel in Neon Lightning Roulette '86—100% free arcade entertainment with zero real-money deposits, accounts, or cashouts. Before every spin locks in, high-voltage lightning bolts strike randomly selected straight-up numbers on the felt, charging them with boosted payout multipliers ranging all the way up to 150x on lucky hits.",
      'Lay arcade chips across an intuitive neon betting table supporting full Straight Up single-number picks, Dozens, Columns, Red/Black, Even/Odd, and 1–18 / 19–36 outside spreads, or use one-tap Quick Presets like Voisins, Lucky 7s, and Red Split to cover your favorite wheel sectors in seconds on desktop, iPad, or mobile touchscreens.',
      'Watch the ivory ball orbit and drop smoothly into the winning pocket with crisp synthesized wheel clicks, live glowing winning sector highlights, recent spin history beads, and instant Practice vs MemeDollarz mode switching so you can test strategies and enjoy retro Vegas excitement completely risk-free.'
    ]
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
    introParagraphs: [
      'Swap, cascade, and detonate glossy 3D meme candies across 10 handcrafted neon puzzle levels in Meme Crush Saga—playable free right in your browser with zero installs. Match Pepe, Spicy Fire, Diamond, Rubber Duck, Skull, and Pizza jellies to shatter Frosted Crystal Jelly, crack Double Frost tiles, unlock Cyber-Ice Laser Locks, and drop 80s Mixtape Cassettes to the exit row.',
      'Every smart match spawns explosive special candies: line up 4 for a Striped Row/Column Laser Bomb, match 2x2 squares to launch a Seeking Meme Rocket that hunts remaining Crystal Jelly, form L or T shapes for a 3x3 Wrapped Packet Bomb, or connect 5 in a row to forge a Rainbow Supernova Color Bomb capable of screen-clearing combo storms.',
      'Fill the Meme Fever meter for bonus UFO drops, use Hammer or Shuffle boosters out of tight spots, and celebrate level clears with the Meme Crush Finale move-conversion fireworks in either Free Practice or Prize Run mode.'
    ]
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
    introParagraphs: [
      "Step onto the glowing 1986 trading floor in MEMEDAQ '86, a fast-paced fictional meme stock market simulator powered by live price ticks and real-time breaking meme news. Buy and sell shares across eight satirical meme corporations—$DOGE, $CHAD, $PEPE, $CATS, $WIFI, $PIZA, $AI, and $MOON—with crisp CRT candlestick and trend charts showing your exact average cost basis and live spread.",
      'Prices update every 1.85 seconds based on momentum waves, sector volatility, and sudden breaking news ticker alerts—including live headlines wired directly to top community memes in the feed. Dial up the Gordon Gecko-Frog Insider Rumor Hotline for cheeky trading hints before deciding whether to take profits, rebalance, or buy the dip.',
      'Your virtual portfolio saves automatically in local browser storage, tracking unrealized profit and loss, open holdings, and all-time Peak Net Worth against other traders without risking a single penny of real money. Switch effortlessly between the full desktop trading desk and compact mobile candlestick views anytime.'
    ]
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
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'update',
    introParagraphs: [
      'Launch a realistic interactive Fake Windows Update Screen right in your browser—complete with the unmistakable blue backdrop, spinning hourglass icon, "Working on updates 69% complete" status text, and "Don’t turn off your PC. This will take a while." prompt. Perfect for harmless office pranks, pretending your laptop is locked in an IT patch, or taking an emergency coffee break.',
      'For the most convincing illusion, press F11 on Windows/Linux (or Control+Command+F on macOS), or tap the built-in Fullscreen and Hide Toolbar buttons to remove every browser tab and overlay control from view. Clicking or tapping anywhere on the update screen quietly advances the progress percentage from 12% up to 99%.',
      'Whenever the joke is over—or the coast is clear—press Escape or click Coast is Clear to return instantly to the meme feed, or tap keys 1–6 to switch immediately into a fake Blue Screen of Death, Excel forecast spreadsheet, DevOps Linux terminal, Zoom meeting, or Enterprise AI workspace.'
    ]
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
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'bsod',
    introParagraphs: [
      'Pull off the classic PC crash prank in one second with our interactive Fake Blue Screen of Death (BSOD) simulator. Modeled cleanly after the iconic modern Windows stop-code screen, it displays the oversized ":(" frown face, "Your device ran into a problem and needs to restart" notice, live advancing percentage readout, QR IT ticket support block, and CRITICAL_SYNERGY_OVERFLOW_EXCEPTION error details.',
      'Click the F11 Fullscreen button (or press F11 on desktop keyboards) and toggle Hide Toolbar to fill your entire monitor edge-to-edge with zero browser tabs or address bar visible. Tapping or clicking anywhere on the blue screen steps the error-dump recovery percentage from 0% toward 100% while keeping the illusion completely believable for coworkers or friends.',
      'Ready to reveal the prank? Press Escape anytime (or exit fullscreen) to jump straight back to THE MEMES.net, or press number keys 1–6 to flip seamlessly between BSOD, Windows Update, Excel forecast spreadsheet, DevOps Kubernetes terminal, Zoom standup call, and Enterprise AI workspace screens.'
    ]
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
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'excel',
    introParagraphs: [
      'Look unmistakably productive in half a second with our interactive Fake Excel Boss Screen: Q4_Enterprise_Cloud_Synergy_Forecast_2026.xlsx. Far more convincing than a static screenshot, the spreadsheet lets you click around individual cells, update the formula bar readout (fx =SUM(C2:C7)*VLOOKUP...), and run an interactive "Monte Carlo Audit" macro that recalculates live EBITDA and variance numbers.',
      'Click ⛶ Fullscreen (or press F11) and hide the disguise switcher bar whenever you want a clean edge-to-edge spreadsheet window that passes a quick glance over the shoulder. You can also press keys 1–6 at any moment to flip between Excel, a scrolling Linux Kubernetes terminal, a 4-person Zoom standup call with a Freeze Video button, SynergyGPT Enterprise AI, Windows Update, and BSOD.',
      'Press Escape or click Coast is Clear whenever you are ready to return right back to your meme feed or arcade game—plus every spreadsheet recalculation and disguise interaction secretly banks bonus Arcade XP while you pretend to be deep in quarterly financial forecasting.'
    ]
  },
  {
    path: '/memes/dank',
    title: 'Dank Memes & Viral Humor — Community Feed | THE MEMES.net',
    description:
      'Browse dank memes, chaotic reaction images, and community shitposts. Double-tap to upvote, react with emojis, remix any template in one tap, or upload your own.',
    h1: 'Dank Memes & Chaotic Community Humor',
    kicker: '#DANK Category // Instant Feed & Remix Tree',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'dank',
    prerenderCategory: 'dank',
    introParagraphs: [
      'Dive into the #DANK feed on THE MEMES.net—home to absurdist reaction memes, chaotic late-night shitposts, stonks vs not-stonks energy, cyber-arcade humor, and fresh community remixes. Every meme loads instantaneously offline or online with lightweight WebP art, and real community uploads always rank automatically above starter classics once submitted.',
      'Double-tap any meme card to fire an instant upvote combo, drop 🔥 💀 😂 🗿 emoji reactions, inspect the genetic Meme Evolution Tree to trace how a joke mutated across creators, or click Mutate / Caption This to open any template directly inside Meme Forge 3.0 with your own punchline, stickers, and Deep Fry filters.',
      'Explore all 16 featured #DANK starter memes right below with full captions and alt descriptions, switch effortlessly between Latest and Top leaderboards, copy direct Theater share links for Discord and WhatsApp, or jump straight into Programming, Gaming, and Relatable meme categories and seven free retro arcade games.'
    ]
  },
  {
    path: '/memes/programming',
    title: 'Funny Programming, Coding & Tech Memes | THE MEMES.net',
    description:
      'Scroll hilarious programming, software engineering, Friday production deploy, git blame, CSS, and AI coding memes. Remix developer meme templates free online.',
    h1: 'Programming, Coding & Developer Memes',
    kicker: '#TECH Category // Built For Developers & Engineers',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'tech',
    prerenderCategory: 'tech',
    introParagraphs: [
      'Take a well-earned break from production incidents, pull requests, and endless code reviews with our curated #TECH and programming meme feed. From Friday 4:59 PM production deploys and git blame plot twists to CSS centering struggles, 63 open StackOverflow tabs, light-mode IDE flashbangs, and npm install dependency trees, every post captures real software engineering life.',
      'Double-tap to upvote your favorite developer jokes, scan and roast any post with our interactive AI Vibe Inspector, or click Caption This to drop your engineering team’s latest inside joke onto classic Expanding Brain, This Is Fine, IQ Bell Curve, and Spiderman Pointing formats inside Meme Forge 3.0 with zero file uploads needed.',
      'Browse all 16 featured programming and developer memes right below, download crisp PNGs stamped with www.thememes.net, check the community evolution lineage, or share direct Theater links straight into your engineering Slack, Microsoft Teams, and Discord channels with one quick tap on desktop or phone.'
    ]
  },
  {
    path: '/memes/gaming',
    title: 'Gaming Memes, RPG Boss Jokes & Esports Humor | THE MEMES.net',
    description:
      'Discover funny gaming memes about side quests, surprise boss phase music, FPS reloads, fall-damage tests, and late-night squad lobbies. Vote or remix in one click.',
    h1: 'Gaming, RPG & Squad Lobby Memes',
    kicker: '#GAMING Category // Boss Phases & Side Quests',
    changefreq: 'hourly',
    priority: '0.9',
    viewMode: 'feed',
    category: 'gaming',
    prerenderCategory: 'gaming',
    introParagraphs: [
      'Level up your scroll break with the #GAMING meme feed on THE MEMES.net. Celebrate every universal gamer habit—ignoring the main quest for 80 hours of side quests, immediately testing fall damage in every new RPG, reloading after firing a single bullet, leaning 45 degrees closer during a clutch round, and hearing boss-fight Latin choir music right after an autosave icon appears.',
      'Vote head-to-head in the 1v1 King of the Hill Meme Battle Arena, double-tap meme cards to stack 5x overdrive combos on your favorite squad jokes, or hit Mutate / Caption This to remix any gaming meme template for your clan Discord server in under 20 seconds.',
      'Check out all 16 featured gaming and esports memes below, share direct permalinks with your friends and party teammates, explore the full evolution lineage of popular remixes, and jump straight into 5-table Retro Pinball, Neon Coin Dozer 86, or Meme Crush Saga whenever you want to play.'
    ]
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
    introParagraphs: [
      'Scroll the #RELATABLE meme feed for instant "why is this literally me?" comedy—covering 3:47 AM sleep-schedule math, six consecutive morning alarms, checking the fridge for the sixth time hoping new snacks spawned, turning down the car radio to see street signs better, quick 5-minute work meetings that last an hour, and the pure bliss of cancelled weekend plans.',
      'Every card lets you double-tap to upvote, react with emojis, bookmark posts to your personal Saved favorites collection, or tap Share for a direct Theater permalink you can drop straight into group chats on WhatsApp, iMessage, and Discord. Spot a blank format you want to personalize? Tap Caption This to launch it straight inside Meme Forge 3.0.',
      'Browse all 16 featured relatable memes below, switch cleanly between desktop masonry grid and mobile fullscreen vertical Reels views, explore trending daily caption bounties, or upload your own slice-of-life joke in seconds with zero sign-up hurdles.'
    ]
  },
  {
    path: '/gif-meme-maker',
    title: 'Free GIF Meme Maker — Add Top & Bottom Text to Animated GIFs Online | THE MEMES.net',
    description:
      'Add classic Impact top and bottom text to any animated GIF free online in 5 seconds. Download or share animated captioned GIFs stamped cleanly with www.thememes.net.',
    h1: 'Free Animated GIF Meme Maker (Top & Bottom Text)',
    kicker: 'THE MEMES.net // Client-Side GIF Text Burn-In',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'feed',
    category: 'all',
    openStudio: true,
    studioPreset: 'gif',
    schemaType: 'SoftwareApplication',
    introParagraphs: [
      'Make animated GIF memes with classic white-and-black outline Impact top and bottom text directly inside your browser using THE MEMES.net free GIF Meme Maker. Drop any animated GIF from your camera roll, downloads folder, or clipboard, type your setup line at the top and punchline at the bottom, and watch your live captioned animation loop smoothly right on screen without waiting for slow cloud queues.',
      'Unlike static screenshot editors that freeze animation into a flat image, THE MEMES.net composites your custom Top Text, Bottom Text, color accents, and optional emoji stickers into every frame of the animated GIF right on your device, preserving frame timing and transparent disposal behavior for crisp sharing on iMessage, WhatsApp, Discord, Slack, and Reddit.',
      'Need inspiration fast? Hit Random Meme Text for instant comedic pairings, adjust text size or color fills with one tap, and download or share a crisp GIF stamped cleanly with www.thememes.net—or publish directly to the community feed with its own shareable preview card link. Works seamlessly on iPhone Safari, Android Chrome, iPad, and desktop browsers.'
    ]
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
    introParagraphs: [
      "Step inside the neon-soaked 1986 Electric Bingo Hall with Neon Bingo '86—free to play directly in your browser on desktop, iPad, and iPhone with zero downloads or deposits. Watch the animated rotary air-blower cage spin and fire glowing balls while DJ Flashman calls out every classic British and 80s comedy bingo rhyme from 1 to 90, including Two Little Ducks Quack Quack 22, Legs Eleven, Heinz Varieties 57, Clickety Click 66, and Two Fat Ladies 88 MPH.",
      'Pick your favorite UV ink Neon Dabber pen in Laser Pink, Electric Cyan, Acid Lime, Solar Gold, or UV Violet and stamp numbers across 1, 2, or 4 authentic retro 90-Ball tickets or 75-Ball Vegas 5x5 cards. Stamping manually earns bonus MemeCentz skill rewards, or switch seamlessly to BBC Ceefax Page 888 teletext view and preview all 90 funny sound callouts.',
      'Race hilarious hall rivals like Nanna Turbo and Commodore Clive to complete 4 Corners, 1 Line, 2 Lines, or Full House, then smash the pulsing SHOUT BINGO button for stadium cheers and MemeDollarz jackpots—just watch out for false calls or the whole crowd boos and pelts your screen with tomatoes.'
    ]
  },
  {
    path: '/games/speed-swipe',
    title: 'Meme Speed Swipe — Fast Dank or Cringe Rating Arcade Game | THE MEMES.net',
    description:
      'Play Meme Speed Swipe free online! Rapid-fire swipe through fresh community memes, crown Dank hits, combo your XP multiplier, and jump straight into Meme Forge remixes.',
    h1: 'Meme Speed Swipe — Fast-Paced Community Meme Judge Game',
    kicker: 'THE MEMES.net // Lightning Card Rating & XP Combos',
    changefreq: 'daily',
    priority: '0.85',
    viewMode: 'swipe',
    category: 'all',
    schemaType: 'VideoGame',
    introParagraphs: [
      'Rate the funniest internet humor at lightning speed with Meme Speed Swipe on THE MEMES.net. Instead of endlessly scrolling passive feeds, step into the neon judge booth where community uploads and curated cult classics flip onto the stage one card at a time for instant rapid-fire verdicts right on phone, tablet, or desktop.',
      'Swipe left to roast Cringe or swipe right to certify pure Dank gold—or use lightning keyboard arrows to chain rapid streak combos that charge your Overdrive Arcade XP multiplier and climb the community ranks. Spot a meme template crying out for a better joke? Launch any card straight into Meme Forge 3.0 to rewrite the top and bottom captions in seconds.',
      'Every swipe also helps surface rising community creators to the top of the Hot feed leaderboard without logins, downloads, or clutter. Open Theater inspection anytime, share direct permalinks straight to your group chats, or switch between Speed Swipe and 14 other free Cyber-Arcade games in one tap.'
    ]
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
    introParagraphs: [
      'Enter the neon colosseum in the 1v1 Meme Battle Arena on THE MEMES.net, where two viral challengers square off side-by-side in a ruthless King of the Hill championship. Only one joke survives each round based on live player taste, building an unbeatable title reign while hungry new challengers try to dethrone the reigning champion.',
      'Compare reaction memes, developer jokes, gaming moments, and community remixes head-to-head in clean full-contrast arena cards. Vote for your winner with a single click or keystroke to see instant crowd agreement percentages, rack up undefeated judging streaks, earn Arcade XP toward free cosmetic rewards, and trigger arena fanfare sound effects.',
      'Curious who created a champion meme or want to challenge it yourself? Tap any fighter inside the arena to inspect its full remix family tree in Theater View, grab a direct shareable link for WhatsApp or Discord debates, or spin up your own challenger directly in Meme Forge 3.0.'
    ]
  },
  {
    path: '/fake-teams-zoom-call-screen',
    title: 'Fake Microsoft Teams & Zoom Call Screen — Boss Key Meeting Simulator | THE MEMES.net',
    description:
      'Open a realistic fake Microsoft Teams & Zoom standup video call screen with 4 coworkers, live corporate transcript captions, incoming Boss Call ringtone prank, and Wi-Fi freeze button.',
    h1: 'Fake Microsoft Teams & Zoom Call Screen — Boss Key Meeting Simulator',
    kicker: 'Boss Key Panic Suite // Fake Video Call & Incoming Boss Ringer',
    changefreq: 'weekly',
    priority: '0.92',
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'zoom',
    introParagraphs: [
      'Look completely locked into a high-stakes corporate video meeting in one split second with our realistic Fake Microsoft Teams & Zoom Call Screen. Designed to pass an immediate over-the-shoulder glance or pull off hilarious office pranks, the simulator displays a crisp multi-participant standup call grid complete with live speaker borders, muted icons, shared screen badges, and rolling closed-caption buzzwords.',
      'Toggle seamlessly between authentic Microsoft Teams and Zoom Meeting layouts, trigger a hyper-realistic Incoming Boss Call video ringtone alert from the VP of Synergy complete with Decline or busy auto-reply options, or click Fake Tunnel Lag to switch your tile into a convincing Low Bandwidth Reconnecting state while mining secret Stealth XP.',
      'Hit F11 Fullscreen and Hide Bar for a completely edge-to-edge enterprise video call window, or share this exact URL directly with friends and coworkers. Tap keys 1 through 6 anytime to swap into Excel spreadsheets, DevOps Kubernetes terminals, Enterprise AI, Windows Update, or Blue Screen pranks.'
    ]
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
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'terminal',
    introParagraphs: [
      'Channel instant elite sysadmin and hacker energy with the Fake Hacker Terminal & Linux DevOps Compiler Screen on THE MEMES.net. Crafted with glowing phosphor green telemetry on deep Ubuntu server dark gray, it streams live Kubernetes pod rebalancing notices, Terraform apply confirmations, Rust release optimization logs, zero-trust cluster checks, and SOC2 handshake diagnostics.',
      'Want to sell the illusion in front of coworkers or friends during a surprise desk check? Every single key you press—or tap on mobile—types realistic new production microservice compilation lines with live CPU and memory bar readouts, turning casual keyboard mashing into high-intensity DevOps release theater while secretly banking Stealth Arcade XP.',
      'Use F11 Fullscreen alongside the Hide Bar toggle for an unmistakable full-monitor SSH terminal display, share this direct URL link with teammates for harmless office pranks, or press number keys 1 to 6 anytime to pivot instantly into Excel Q4 sheets, Microsoft Teams calls, Blue Screen crashes, or Windows Update screens.'
    ]
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
    viewMode: 'feed',
    category: 'all',
    bossDisguise: 'ai',
    introParagraphs: [
      'Blend effortlessly into the modern corporate workday with our Fake Enterprise AI Copilot Workspace (SynergyGPT v5.4). Featuring a crisp light-mode internal dashboard connected to mock Jira tickets, Confluence wikis, and Executive OKR graphs, it displays confidential Q4 architecture alignment summaries, latency reports, and ROI projections that look right at home on any office laptop.',
      'Click Generate Q4 Executive Deliverable anytime someone walks by your monitor to stream fresh corporate memos—from Kubernetes EBITDA guardrail briefings to polite sprint-delay emails packed with holistic scope calibration and stakeholder synergy phrases—while quietly collecting bonus Stealth Arcade XP in the background.',
      'Switch cleanly to fullscreen with Hide Bar enabled for a completely distraction-free enterprise AI tab on any laptop or desktop screen, share this direct screen link with friends and colleagues for instant office humor, or press number keys 1 through 6 to flip immediately into fake Excel spreadsheets, Microsoft Teams calls, DevOps Linux terminals, Windows Updates, or Blue Screen crashes.'
    ]
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
    introParagraphs: [
      'Welcome to the THE MEMES.net House Rules page, written to keep the feed funny, lawful, and welcoming for everyone visiting the arcade. Original jokes, wholesome roasts, relatable work humor, coding memes, gaming clips converted into short GIFs under eight megabytes and ten seconds, and collaborative remix chains are always encouraged here.',
      'To protect visitors and comply with online safety laws, certain uploads are removed on sight. Zero tolerance applies to anything exploiting or sexualising minors, which results in immediate removal and permanent account suspension. Nudity, sexually explicit imagery, gore, graphic violence, self-harm encouragement, hate speech, personal phone numbers, home addresses, private photos shared without consent, spam links, and impersonation of staff are also strictly banned.',
      'Automated image and text screening checks every upload and comment before it goes live, and community reports hide borderline posts rapidly for human review. First violations bring a warning and removal, a second strike pauses posting for seven days, and a third strike permanently suspends the account. Please read these rules carefully before publishing.'
    ]
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
    introParagraphs: [
      'These Terms of Use explain the basic rules for visiting THE MEMES.net, creating and remixing memes, posting comments, and playing the retro browser arcade cabinets. By using the site, you confirm that you meet the minimum age required in your region and agree to follow the community House Rules across every upload, remix, username, and comment.',
      'Every arcade cabinet and mini-game on THE MEMES.net runs strictly on free pretend currency called MemeDollarz (M$) and MemeCentz (¢). MemeDollarz are purely for fun, cannot be bought with real money, cannot be sold or transferred between users, and can never be cashed out for anything of monetary value under any circumstances.',
      'You stay responsible for the memes and captions you choose to upload and must only post content you created yourself or have clear permission to share. Uploading grants THE MEMES.net permission to re-encode, strip metadata, host, display, and enable community caption remixes, while moderators may remove posts or suspend accounts when needed for safety or copyright compliance.'
    ]
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
    introParagraphs: [
      'This Privacy Policy describes what limited information THE MEMES.net collects when you browse memes, upload images or GIFs, sign in, or play retro games. If you create an account using Magic Link email or supported OAuth sign-in, Supabase Auth stores your account identifier and chosen handle, while first-time interactions may create an anonymous session ID to track votes and prevent abuse.',
      'On your own browser, localStorage remembers sound volume, CRT shader toggles, muted categories, saved bookmarks, and pretend MemeDollarz balances without tracking you across unrelated websites. Uploaded images and GIFs are re-encoded on our server to strip EXIF camera location tags before public storage, while temporary rate-limit checks store one-way hashed IP values briefly to block automated spam.',
      'We use lightweight aggregate page analytics through Vercel Analytics alongside Cloudflare Turnstile bot protection when signing uploads or comments, and we never sell personal data to third parties. Signed-in users can permanently remove their account, memes, comments, and uploaded files anytime via the Delete my account and memes button inside Settings or through the takedown page.'
    ]
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
    introParagraphs: [
      'Use the THE MEMES.net Takedown Request page whenever you need an upload removed promptly for copyright infringement, unauthorized reuse of original artwork, doxxing, private contact information exposure, or because an image shows a photo of you shared without permission. Every submission creates a high-priority report directly in our server moderation database.',
      'To help moderators locate and act on the right post immediately, please paste the direct meme link or unique post identifier along with whether the notice involves copyright ownership, a personal photo of yourself, or privacy exposure, plus a brief explanation and an optional contact email if you want confirmation once the review is finished.',
      'Valid notices referencing an existing meme post automatically create an escalated report entry and log the request inside the moderation audit trail so reviewers see it at the top of the queue alongside severe safety flags. For urgent follow-up inquiries or general legal correspondence, you can also check our Contact page.'
    ]
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
    introParagraphs: [
      'Welcome to the THE MEMES.net Contact and Safety Desk page, which directs visitors to the fastest channel for content removals, privacy questions, bug reports, and site maintenance feedback. Because THE MEMES.net is built as a lightweight community meme platform and browser arcade, automated triage keeps response times fast without unnecessary forms.',
      'If your message is about removing an image, GIF, or comment for copyright reasons, harassment, personal contact details, or a photo of you posted without permission, please submit it directly on our Takedown page as takedown notices write straight into the high-priority moderator queue with tracking IDs.',
      'For owner review, press inquiries, partnership questions, accessibility feedback, or reproducible software bug reports affecting mobile Safari or desktop browsers, please use the same Takedown form (choose "Other") and include a link to the page route or shared meme identifier where the problem appeared. There is no public email address, so every message reaches the same moderator queue and nothing gets lost in an inbox.'
    ]
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
    introParagraphs: [
      'Every day at 00:00 UTC, TheMemes.net launches a fresh Daily Caption Battle built around a featured template and prompt. Players submit original one-line captions or full visual meme remixes directly from the feed or the Caption Battle arena, and the community votes on the sharpest punchlines throughout the 24-hour window.',
      'Once the daily timer turns over, the highest-voted entry claims the crown and is permanently enshrined in the Hall of Fame archive. Every winning caption, total vote count, battle date, and winning creator handle is stored in Postgres so historic victories remain verifiable and browsable anytime.',
      'Reigning daily champions also receive the glowing 24-hour Caption King card frame across their memes and creator profile modal for the full following UTC day. All submissions pass automated text moderation and duplicate checks so every crown represents genuine community comedy. Dive into the archive to study winning comedy timings, inspect past prompts, or jump straight back into today’s open arena.'
    ]
  }
];

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
  if (cleaned === '/templates' || cleaned.startsWith('/templates/')) return '/meme-generator';
  if (cleaned === '/games/plinko') return '/games';
  if (cleaned === '/games/bingo' || cleaned === '/neon-bingo' || cleaned === '/bingo') return '/games/neon-bingo';
  if (cleaned === '/fake-teams-call' || cleaned === '/fake-zoom-call' || cleaned === '/fake-teams-screen') {
    return '/fake-teams-zoom-call-screen';
  }
  if (cleaned === '/fake-terminal' || cleaned === '/fake-hacker-screen') return '/fake-hacker-terminal-screen';
  if (cleaned === '/fake-ai-screen' || cleaned === '/fake-ai-workspace') return '/fake-ai-workspace-boss-screen';
  if (cleaned === '/boss-screen') return '/fake-excel-boss-screen';
  return cleaned || '/';
}

export function getSeoRouteByPath(pathname) {
  return ROUTE_BY_PATH.get(normalizeRoutePath(pathname)) || null;
}

export function resolveRouteFromLocation(pathname = '/', search = '') {
  const normPath = normalizeRoutePath(pathname);
  const params = new URLSearchParams(search || '');

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
  if (viewMode === 'creator' && creatorHandle) {
    const clean = String(creatorHandle).trim().replace(/^@+/, '');
    if (clean) return `/u/${encodeURIComponent(clean)}`;
  }
  if (bossKeyActive && prankDisguise && PRANK_DISGUISE_TO_PATH[prankDisguise]) {
    return PRANK_DISGUISE_TO_PATH[prankDisguise];
  }
  if (showStudio) {
    if (forgeIntent?.mode === 'gif') {
      return '/gif-meme-maker';
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
