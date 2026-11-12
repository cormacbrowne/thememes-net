// ==========================================
// PHASE 28.8 & 28.9: CRAWLABLE PATH ROUTES & SEO METADATA REGISTRY
// Shared between the React SPA (App.jsx, seoEngine.js, SeoDiscoveryFooter.jsx)
// and the post-build static HTML prerenderer (scripts/prerender-seo.mjs).
// ==========================================

export const SITE_ORIGIN = 'https://thememes.net';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-card.png`;

export const MODE_ALIASES = {
  dozer: 'pusher',
  coindozer: 'pusher',
  coinpusher: 'pusher'
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
  pusher: '/games/coin-pusher',
  pinball: '/games/pinball',
  slots: '/games/slots',
  blackjack: '/games/blackjack',
  roulette: '/games/roulette',
  crush: '/games/meme-crush',
  stocks: '/games/meme-stock-market',
  derby: '/games/horse-racing',
  guess: '/games/guess-the-meme',
  plinko: '/games/plinko'
};

export const PRANK_DISGUISE_TO_PATH = {
  update: '/fake-windows-update-screen',
  bsod: '/fake-blue-screen-prank',
  excel: '/fake-excel-boss-screen'
};

export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Free Meme Generator, Soundboard & Retro Arcade Games | THE MEMES.net',
    description:
      'Browse community dank, programming, gaming, and relatable memes, make your own in the free Meme Forge Studio with 20+ templates, mash the 16-pad soundboard, and play retro arcade games.',
    h1: 'Free Meme Generator, Soundboard & Retro Arcade Games',
    kicker: 'THE MEMES.net // Community Memes & Cyber-Arcade',
    changefreq: 'hourly',
    priority: '1.0',
    viewMode: 'feed',
    category: 'all',
    introParagraphs: [
      'THE MEMES.net is a fast, watermark-free meme community and retro cyber-arcade built for instant laughs on desktop, tablet, and phone. Start scrolling right away through curated dank memes, software engineering jokes, gaming moments, and relatable 3AM thoughts—or switch to fullscreen vertical Reels on mobile to double-tap, upvote, and remix any post in seconds.',
      'Want to make your own meme without downloading an app or creating an account? Open Meme Forge 3.0 to pick from 20 classic blank meme templates, drop in your own photos, animated GIFs, or short MP4 clips, stack draggable Impact or modern captions, add Deep Fry or VHS glitch filters, and export crisp PNGs or publish straight to the community feed.',
      'Between uploads, explore the 16-pad meme soundboard (featuring Vine Boom, MLG Airhorn, Clown Honk, and iOS silent-switch audio unlock), tune into live procedural synthwave radio, or unwind in seven free-to-play arcade games including Neon Coin Dozer 86, 5-table Retro Pinball, Vegas 777 Slots, Blackjack, Lightning Roulette, Meme Crush Saga, and the MEMEDAQ 86 Stock Market Simulator.'
    ]
  },
  {
    path: '/meme-generator',
    title: 'Free Online Meme Generator & 20+ Blank Templates | THE MEMES.net',
    description:
      'Create memes online for free with 20 classic blank templates, custom Impact & modern fonts, stickers, Deep Fry & VHS filters, and animated GIF or MP4 captioning with no watermarks.',
    h1: 'Free Online Meme Generator & Blank Template Grid',
    kicker: 'Meme Forge 3.0 // Instant HTML5 Studio',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'feed',
    category: 'all',
    openStudio: true,
    prerenderTemplates: true,
    introParagraphs: [
      'Make a funny meme in under 20 seconds using the free HTML5 Meme Forge 3.0 studio on THE MEMES.net. Choose immediately from 20 ready-to-caption blank meme formats—including 2-Panel Reject/Approve, Expanding Galaxy Brain, Two Red Buttons, Distracted Choice, This Is Fine, Change My Mind, Stonks, Clown Protocol, Always Has Been, and Buff Champion vs Smol Doge—with zero file upload required.',
      'Every template opens with editable multi-layer captions and a one-tap Random Caption generator if you want instant inspiration. Prefer your own media? Drag and drop any image, paste straight from your clipboard with Ctrl+V, snap a camera photo, or load an animated GIF or MP4 video with non-destructive caption overlays that keep smooth motion intact.',
      'Customize typography across Impact, Bebas Neue, Comic Neue, Permanent Marker, and pixel fonts, add emoji or custom PNG stickers, apply Deep Fry, VHS RGB Glitch, or 16-bit pixel filters, and undo or redo up to 60 steps. When your creation is ready, download a clean high-resolution file or publish directly to the community feed to earn creator XP and remix royalties.'
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
    path: '/games/coin-pusher',
    title: 'Coin Pusher Game Online Free — Neon Coin Dozer 86 | THE MEMES.net',
    description:
      'Play a free 3D coin pusher game online in your browser! Drop coins onto the reciprocating chrome pusher, hit the Skill Gate mini-slot, collect 80s prizes, and trigger Bulldozer Fever.',
    h1: "Neon Coin Dozer '86 — Play Coin Pusher Online Free",
    kicker: '60fps HTML5 Arcade // Free Play & Token Modes',
    changefreq: 'daily',
    priority: '0.95',
    viewMode: 'pusher',
    category: 'all',
    introParagraphs: [
      "Play Neon Coin Dozer '86 free online directly in your browser—no downloads, no real money, and smooth 60fps physics on desktop, iPad, and iPhone. Click or tap across the drop chute to release gleaming gold tokens and silver score medals onto the reciprocating chrome pusher shelf and watch coins teeter dramatically on the front cliffhanger lip before cascading into your collection tray.",
      'Time your coin drops to pass through the moving Skill Gate basket and charge the 3-reel backbox mini-slot! Hitting Skill Gate spins awards 10-coin avalanches, twin neon diamonds, mega pusher super-strokes, and temporary Laser Side-Walls that block gutter losses. Five collectible retro prizes—Diamond, Mystery Box, Gold Joystick, Trophy, and Cyber Crown—stack permanent session score multipliers up to 2.25x.',
      'Need an extra push? Fire a 3-Coin Barrage, toggle Auto-Drop stream mode, or tap Cabinet Nudge to shake loose cliffhanger stacks (watching out for the 3-strike TILT sensor). Switch anytime between unlimited Free Play practice coins and Arcade Token mode using tokens earned from uploading and upvoting memes.'
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
      'Spin the retro Las Vegas 777 one-arm bandit slot machine online for free with no real money. Use strategic Reel HOLD & NUDGE buttons, trigger jackpot drumrolls, and win arcade tokens.',
    h1: 'Las Vegas 777 Neon Slot Machine — Free Arcade Play',
    kicker: '3-Reel Mechanical Drums // Zero Real-Money Gambling',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'slots',
    category: 'all',
    introParagraphs: [
      'Pull the gleaming 3D chrome lever on the THE MEMES.net Las Vegas 777 Neon Slot Machine—a purely free-to-play retro arcade cabinet built with zero real-money wagering or cashouts. Watch three curved ivory mechanical drums spin smoothly with classic vector Flaming 777s, Neon Diamonds, Triple Gold BARs, Golden Liberty Bells, Watermelons, Lemons, and Twin Cherries.',
      'Each spin delivers classic arcade suspense with sequential reel stops and a dramatic third-reel jackpot drumroll whenever the first two symbols line up. Lock strong reels between spins using strategic HOLD toggles or bump a near-miss symbol onto the crimson laser payline with NUDGE controls while watching the progressive VFD jackpot ticker climb and chasing marquee bulbs light up.',
      'Play in unlimited Free Practice mode whenever you want pure retro sound effects and coin-hopper fountains, or wager free in-site Arcade Tokens earned from creating and voting on community memes. Community meme uploads can even appear as featured jackpot reel symbols, crediting original creators with bonus XP royalties.'
    ]
  },
  {
    path: '/games/blackjack',
    title: "Play Blackjack Online Free — Neon 21's Retro Casino | THE MEMES.net",
    description:
      "Play free 21 Blackjack online against Dealer Bot '86. Hit, Stand, Double Down, Split Pairs, trigger 5-Card Charlie 3x wins, and use the cyber-visor strategy hint with zero real money.",
    h1: "Neon 21's Blackjack — Play Free 21 Card Game Online",
    kicker: 'Classic 21 Card Rules // Free Practice & Token Modes',
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
      'Enjoy 22-second parallax races with galloping trails, live ticker commentary, optional spoken play-by-play voiceover, dramatic slow-motion photo finishes, and confetti podium celebrations. Race right away or catch scheduled posts every two minutes, plus daily 8 PM local Derby Cup events for 3x arcade token rewards or unlimited Free Practice runs.'
    ]
  },
  {
    path: '/games/guess-the-meme',
    title: 'Guess The Meme Daily — Free Pixelated Meme Trivia Game | THE MEMES.net',
    description:
      'Play Guess the Meme Daily free online! Unpixelate 5 classic meme templates over 5 steps, build your daily streak, and share your Wordle-style score grid. No tokens required.',
    h1: 'Guess The Meme: Daily — Free Pixelated Format Trivia',
    kicker: 'Daily Wordle-Style Puzzle // 100% Free, Zero Tokens',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'guess',
    category: 'all',
    introParagraphs: [
      'Test your internet lore every day in Guess the Meme Daily, a completely free visual meme trivia challenge on THE MEMES.net with zero tokens, downloads, or login required. Each daily puzzle presents five classic meme formats—spanning reaction panels, galaxy brain tiers, and internet icons—that start heavily pixelated in crunchy retro blocks and sharpen step by step.',
      'Study the silhouette and color layout at Step 1 and pick the matching format name from four choices, or tap Enhance Clarity up to five levels to reveal sharper details. Earlier guesses earn higher point bonuses up to 100 points per round, while everyone around the world plays the exact same date-seeded daily lineup.',
      'Finish all five memes to unlock your Wordle-style emoji score grid, keep your daily solve streak alive in local storage across devices and visits, and copy your shareable results card with a direct link to challenge friends, plus unlock unlimited endless practice sets anytime you want extra rounds.'
    ]
  },
  {
    path: '/games/plinko',
    title: 'Meme Plinko Online Free — 26x Peg Drop Arcade Game | THE MEMES.net',
    description:
      'Play Meme Plinko free online with real canvas peg physics, Low/Medium/High multiplier rows up to 26x, meme ball faces, Auto x10 drops, and one-handed mobile controls.',
    h1: "Meme Plinko '86 — Free One-Tap Peg Drop Game",
    kicker: '8-Row Galton Peg Physics // Low, Med & High Risk up to 26x',
    changefreq: 'daily',
    priority: '0.9',
    viewMode: 'plinko',
    category: 'all',
    introParagraphs: [
      'Drop neon meme balls down a glowing 8-row triangular peg board in Meme Plinko, one of the fastest one-handed casino arcade games on THE MEMES.net. Choose your favorite arcade token stake, pick Low, Medium, or High multiplier rows reaching up to 26x on the corners, and tap anywhere on the board or button bar to launch cascading physics drops with crisp peg sparks.',
      'Built on fair Binomial eight-row bounce odds across nine multiplier buckets, Meme Plinko keeps transparent 3.55% to 4.53% house edge math while delivering satisfying 2D elastic circle collisions, multi-ball Auto x10 bursts, and playful Pepe, Doge, Stonks, and Moai ball sprites that spin and clatter into neon scoring slots.',
      'Play risk-free in unlimited Free Practice mode (enabled automatically whenever your wallet is below 10 tokens) or wager free site Arcade Tokens earned by making and upvoting memes with never any real money, deposits, or cashouts. Switch smoothly between portrait thumb-only phone play and wide desktop layout anytime.'
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
      'Watch the ivory ball orbit and drop smoothly into the winning pocket with crisp synthesized wheel clicks, live glowing winning sector highlights, recent spin history beads, and instant Practice vs Arcade Token mode switching so you can test strategies and enjoy retro Vegas excitement completely risk-free.'
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
      'Browse all 16 featured programming and developer memes right below, download crisp watermark-free PNGs, check the community evolution lineage, or share direct Theater links straight into your engineering Slack, Microsoft Teams, and Discord channels with one quick tap on desktop or phone.'
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
      'Browse all 16 featured relatable memes below, switch cleanly between desktop masonry grid and mobile fullscreen vertical Reels views, explore trending daily caption bounties, or upload your own slice-of-life joke in seconds with zero watermarks or sign-up hurdles.'
    ]
  }
];

const ROUTE_BY_PATH = new Map(SEO_ROUTES.map((r) => [r.path, r]));

export function normalizeRoutePath(pathname = '/') {
  const raw = String(pathname || '/').split('?')[0].split('#')[0].trim();
  if (!raw || raw === '/') return '/';
  let cleaned = raw.replace(/\/index\.html$/i, '').replace(/\.html$/i, '').replace(/\/+$/, '');
  if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
  cleaned = cleaned.toLowerCase();
  if (cleaned === '/memes/tech') return '/memes/programming';
  return cleaned || '/';
}

export function getSeoRouteByPath(pathname) {
  return ROUTE_BY_PATH.get(normalizeRoutePath(pathname)) || null;
}

export function resolveRouteFromLocation(pathname = '/', search = '', isTouchDevice = false) {
  const normPath = normalizeRoutePath(pathname);
  const params = new URLSearchParams(search || '');

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
    return {
      matchedPath: matchedRoute.path,
      isDedicatedLanding: true,
      viewMode: matchedRoute.viewMode || 'feed',
      category: matchedRoute.category || 'all',
      searchQuery: params.get('q') || '',
      showStudio: Boolean(matchedRoute.openStudio),
      forgeIntent: matchedRoute.openStudio ? { mode: 'blank' } : null,
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
    'blackjack',
    'roulette',
    'pusher',
    'slots',
    'crush',
    'pinball',
    'stocks',
    'derby',
    'guess',
    'plinko',
    'swipe',
    'battle'
  ];

  let viewMode;
  if (validModes.includes(mode)) {
    viewMode = mode;
  } else if (mappedCat !== 'all' || searchQuery || theaterMemeId) {
    viewMode = 'feed';
  } else {
    viewMode = isTouchDevice ? 'reels' : 'feed';
  }

  const isDedicatedLanding = Boolean(
    theaterMemeId ||
      GAME_VIEW_MODE_TO_PATH[viewMode] ||
      mappedCat !== 'all' ||
      surpriseOpen ||
      (validModes.includes(mode) && mode !== 'feed')
  );

  return {
    matchedPath: mappedCat !== 'all' && viewMode === 'feed' ? `/memes/${CATEGORY_ID_TO_SLUG[mappedCat]}` : GAME_VIEW_MODE_TO_PATH[viewMode] || '/',
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
  showStudio = false,
  forgeIntent = null,
  extrasDrawerOpen = false,
  extrasFocus = null,
  bossKeyActive = false,
  prankDisguise = null
} = {}) {
  if (bossKeyActive && prankDisguise && PRANK_DISGUISE_TO_PATH[prankDisguise]) {
    return PRANK_DISGUISE_TO_PATH[prankDisguise];
  }
  if (showStudio && (!forgeIntent || forgeIntent.mode === 'blank')) {
    return '/meme-generator';
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
