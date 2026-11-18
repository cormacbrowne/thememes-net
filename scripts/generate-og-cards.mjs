import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { SEO_ROUTES, getOgImageSlugForRoutePath } from '../src/data/seoRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OG_DIR = path.join(PUBLIC_DIR, 'og');

const faviconSvgRaw = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), 'utf8');
const FAVICON_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(faviconSvgRaw, 'utf8').toString('base64')}`;

const CARD_THEMES = {
  '/': {
    accent: '#00f5ff',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: "EST. 1986 SYNTH-ARCADE // THEMEMES.NET",
    headline: 'MAKE MEMES.\nPLAY ‘86 ARCADE.',
    sub: 'Caption images & animated GIFs with Impact text in seconds. 15 free neon arcade games & prank screens.',
    pills: ['BURNED-IN MEME TEXT', '15 RETRO GAMES', 'NO LOGIN NEEDED'],
    scene: 'hero'
  },
  '/meme-generator': {
    accent: '#00f5ff',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: 'FREE MEME & GIF STUDIO // INSTANT CAPTIONS',
    headline: 'MEME &\nGIF MAKER',
    sub: 'Drop any pic or GIF, type Impact Top & Bottom text, burn captions straight onto the image & share anywhere.',
    pills: ['CLASSIC IMPACT FONT', 'ANIMATED GIFS', 'INSTANT DOWNLOAD'],
    scene: 'meme-studio'
  },
  '/gif-meme-maker': {
    accent: '#ff2a85',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'FRAME-BY-FRAME ANIMATED CAPTION ENGINE',
    headline: 'ANIMATED GIF\nMEME MAKER',
    sub: 'Keep every frame moving while burning crisp Top & Bottom captions straight into your GIF.',
    pills: ['ALL FRAMES KEPT', 'ZERO WATERMARK PAIN', 'TEXT-READY SHARE'],
    scene: 'gif-studio'
  },
  '/meme-soundboard': {
    accent: '#facc15',
    accent2: '#ff2a85',
    gold: '#00f5ff',
    badge: '16-PAD SYNTHESIZER // iOS SILENT-MODE SAFE',
    headline: 'MEME SFX\nSOUNDBOARD',
    sub: 'Vine Boom, MLG Triple Airhorn, Metal Pipe Clang, Sad Trombone & 16 instant comedy sound pads.',
    pills: ['16 DRUM PADS', 'ZERO LAG AUDIO', 'IPHONE COMPATIBLE'],
    scene: 'soundboard'
  },
  '/games': {
    accent: '#00f5ff',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: "15 FREE GAMES // NO APP DOWNLOAD",
    headline: "THE ‘86\nCYBER ARCADE",
    sub: "Neon Bingo '86, Coin Dozer, 5-Table Pinball, Vegas 777 Slots, Roulette, MEMEDAQ Stocks & more.",
    pills: ['15 CABINET GAMES', 'SHARED BANKROLL', 'INSTANT PLAY'],
    scene: 'arcade-hub'
  },
  '/games/neon-bingo': {
    accent: '#22c55e',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: "80s BINGO HALL // 90-BALL & 75-BALL VEGAS",
    headline: "NEON BINGO\n‘86 CABINET",
    sub: 'Spinning neon blower cage, live UV ink dabbers, recent calls ticker & 4 jackpot prize tiers.',
    pills: ['90 COMEDY CALLS', 'UV INK DABBERS', '1-SCREEN MOBILE'],
    scene: 'bingo'
  },
  '/games/coin-pusher': {
    accent: '#facc15',
    accent2: '#00f5ff',
    gold: '#ff2a85',
    badge: "NEON ARCADE // PHYSICS PUSHER DECK",
    headline: "NEON COIN\nDOZER ‘86",
    sub: 'Drop shiny quarters on the moving 80s shelf, smash diamond bumpers & trigger massive coin waterfalls.',
    pills: ['3D PHYSICS DECK', 'GEM MULTIPLIERS', 'JACKPOT TOWERS'],
    scene: 'pusher'
  },
  '/games/pinball': {
    accent: '#00f5ff',
    accent2: '#f97316',
    gold: '#facc15',
    badge: '5 SYNTHWAVE TABLES // MULTIBALL',
    headline: 'SYNTHWAVE\nPINBALL ‘86',
    sub: 'Flip silver balls into glowing cyber bumpers, light laser ramps & chase billion-point high scores.',
    pills: ['5 NEON TABLES', 'REAL FLIPPERS', 'MULTIBALL FRENZY'],
    scene: 'pinball'
  },
  '/games/slots': {
    accent: '#facc15',
    accent2: '#ff2a85',
    gold: '#00f5ff',
    badge: 'HIGH-VOLTAGE VEGAS REELS // 3X JACKPOT',
    headline: 'VEGAS 777\nCYBER SLOTS',
    sub: 'Pull the chrome handle, spin neon 777s & diamonds, trigger fever spins and hit mega payouts.',
    pills: ['NEON 777 REELS', 'FEVER SPINS', 'INSTANT JACKPOT'],
    scene: 'slots'
  },
  '/games/blackjack': {
    accent: '#22c55e',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'MIAMI VIP FELT TABLE // HIT OR STAND',
    headline: 'NEON FELT\nBLACKJACK 21',
    sub: 'Beat the cyber-dealer to 21 with double downs, splits, side bets & slick 80s casino jazz.',
    pills: ['DEALER STANDS 17', 'DOUBLE DOWN', 'CASINO CHIPS'],
    scene: 'blackjack'
  },
  '/games/poker': {
    accent: '#38bdf8',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: 'DEUCES WILD & ROYAL FLUSH TABLE',
    headline: 'MIAMI ‘86\nVIDEO POKER',
    sub: 'Hold your best chrome cards, draw for Four of a Kind or Royal Flush & double your arcade stash.',
    pills: ['ROYAL FLUSH 800X', 'HOLD & DRAW', 'NEON CRT CARDS'],
    scene: 'poker'
  },
  '/games/roulette': {
    accent: '#ff2a85',
    accent2: '#facc15',
    gold: '#00f5ff',
    badge: 'LIGHTNING WHEEL // 500X MULTIPLIERS',
    headline: 'LIGHTNING\nROULETTE ‘86',
    sub: 'Stack neon chips on red, black, dozens or lucky numbers and watch Lightning strikes bolt payouts.',
    pills: ['500X LIGHTNING', 'SPINNING WHEEL', 'LASER BET BOARD'],
    scene: 'roulette'
  },
  '/games/meme-crush': {
    accent: '#a855f7',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'MATCH-3 ARCADE GRID // CHAIN COMBOS',
    headline: 'MEME CRUSH\nSAGA ‘86',
    sub: 'Swap viral icons, detonate hyper-tile cascades & chain glowing neon combos for mega coins.',
    pills: ['CHAIN CASCADES', 'COMBO BOMBS', 'SYNTH SFX'],
    scene: 'crush'
  },
  '/games/meme-stock-market': {
    accent: '#22c55e',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'MEMEDAQ ‘86 EXCHANGE // LONG OR SHORT',
    headline: 'MEME STOCK\nSIMULATOR',
    sub: 'Trade fake viral tickers with 10x leverage, dodge rug pulls & ride green candles to the moon.',
    pills: ['LIVE TICKERS', '10X LEVERAGE', 'WALL ST. ‘86'],
    scene: 'stocks'
  },
  '/games/horse-racing': {
    accent: '#f97316',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'PHOTO-FINISH TURBO DERBY // OTB LASER',
    headline: 'CYBER HORSE\nDERBY ‘86',
    sub: 'Back the underdog meme steed, watch pixel thoroughbreds sprint the neon track & cash huge odds.',
    pills: ['4 TURBO LANES', 'PHOTO FINISH', 'LIVE ODDS'],
    scene: 'derby'
  },
  '/games/guess-the-meme': {
    accent: '#38bdf8',
    accent2: '#facc15',
    gold: '#ff2a85',
    badge: 'DE-PIXELATE CHALLENGE // INTERNET LORE',
    headline: 'GUESS THE\nMEME QUIZ',
    sub: 'Spot classic viral formats before the timer hits zero. Test your encyclopedic meme IQ.',
    pills: ['BLUR REVEAL', 'STREAK BONUS', 'CLASSIC LORE'],
    scene: 'guess'
  },
  '/games/magic-8-ball': {
    accent: '#a855f7',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'SYNTHWAVE ORACLE // SARCASTIC PROPHECY',
    headline: 'SNARKY\nMAGIC 8-BALL',
    sub: 'Shake the neon cosmos for brutally honest 80s answers to your questionable life decisions.',
    pills: ['INSTANT ORACLE', 'DARK HUMOR', 'SHARE FORTUNES'],
    scene: 'eightball'
  },
  '/games/higher-or-lower': {
    accent: '#00f5ff',
    accent2: '#22c55e',
    gold: '#facc15',
    badge: 'VIRAL SCORE DUEL // BUILD YOUR STREAK',
    headline: 'HIGHER OR\nLOWER MEMES',
    sub: 'Guess which meme crushed more upvotes and keep your streak burning as payouts double.',
    pills: ['STREAK LADDER', 'DOUBLE UP', 'REAL MEMES'],
    scene: 'hilow'
  },
  '/games/speed-swipe': {
    accent: '#ff2a85',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'RAPID-FIRE MEME TRIAGE // COMBO X12',
    headline: 'HYPER\nSPEED SWIPE',
    sub: 'Swipe right to ignite dank bangers, swipe left to roast flops & climb the combo multiplier.',
    pills: ['ONE-THUMB PLAY', 'FIRE COMBOS', 'INSTANT VOTE'],
    scene: 'swipe'
  },
  '/games/meme-battle-arena': {
    accent: '#f97316',
    accent2: '#ff2a85',
    gold: '#facc15',
    badge: '1V1 SUDDEN-DEATH TOURNAMENT',
    headline: 'MEME BATTLE\nARENA 1V1',
    sub: 'Two viral legends enter the octagon—cast the deciding strike and crown the King of the Hill.',
    pills: ['KING OF THE HILL', 'CROWD ODDS', 'CHAMPION BELT'],
    scene: 'battle'
  },
  '/fake-windows-update-screen': {
    accent: '#38bdf8',
    accent2: '#60a5fa',
    gold: '#facc15',
    badge: 'INTERACTIVE PRANK & BOSS KEY SCREEN',
    headline: 'FAKE WINDOWS\nUPDATE 94%',
    sub: 'Full-screen OS update simulation. Click anywhere, leave it on a friend’s screen, or hit 1–6 to swap.',
    pills: ['REALISTIC SPINNER', 'FULLSCREEN F11', 'STEALTH PRANK'],
    scene: 'win-update'
  },
  '/fake-blue-screen-prank': {
    accent: '#3b82f6',
    accent2: '#38bdf8',
    gold: '#facc15',
    badge: 'INTERACTIVE BSOD PRANK // INSTANT CRASH',
    headline: 'FAKE BLUE\nSCREEN PRANK',
    sub: 'Harmless full-screen :( BSOD crash screen for desk pranks or instant Boss Key cover.',
    pills: ['PIXEL-PERFECT :(', 'CUSTOM ERROR', 'HARMLESS PRANK'],
    scene: 'bsod'
  },
  '/fake-excel-boss-screen': {
    accent: '#22c55e',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'BOSS KEY PANIC DISGUISE // Q4 FORECAST',
    headline: 'FAKE EXCEL\nBOSS SCREEN',
    sub: 'Instant Q4 EBITDA spreadsheet camouflage with editable cells & live KPI synergy numbers.',
    pills: ['LIVE CELLS', 'BOSS-PROOF TAB', 'HOTKEY 1-6'],
    scene: 'excel'
  },
  '/fake-teams-zoom-call-screen': {
    accent: '#818cf8',
    accent2: '#38bdf8',
    gold: '#facc15',
    badge: 'BOSS KEY DISGUISE // LIVE STANDUP',
    headline: 'FAKE TEAMS\nCALL SCREEN',
    sub: 'Ultra-convincing Q4 Architecture Sync video meeting grid so nobody questions your screen.',
    pills: ['4 VIDEO TILES', 'LIVE MIC WAVE', 'STEALTH MODE'],
    scene: 'teams'
  },
  '/fake-hacker-terminal-screen': {
    accent: '#22c55e',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'DEVOPS PHOSPHOR SHELL // PRESS ANY KEY',
    headline: 'FAKE HACKER\nTERMINAL',
    sub: 'Type anything to stream realistic Kubernetes deploys, Rust builds & green cyber telemetry.',
    pills: ['TYPE-TO-CODE', 'GREEN CRT', 'STEALTH XP'],
    scene: 'terminal'
  },
  '/fake-ai-workspace-boss-screen': {
    accent: '#38bdf8',
    accent2: '#a855f7',
    gold: '#facc15',
    badge: 'ENTERPRISE SYNERGYGPT CONSOLE',
    headline: 'FAKE AI WORK\nDASHBOARD',
    sub: 'Convincing Q4 Copilot executive strategy workspace generating corporate memos on demand.',
    pills: ['EXECUTIVE MEMOS', 'OKR METRICS', 'LOOKS BUSY'],
    scene: 'ai-work'
  },
  '/memes/dank': {
    accent: '#ff2a85',
    accent2: '#f97316',
    gold: '#facc15',
    badge: 'CURATED FEED // DEEP-FRIED & UNHINGED',
    headline: 'DANK MEMES\nVAULT 🔥',
    sub: 'Browse top-voted surreal & chaotic bangers, upvote winners or remix any image in 1 tap.',
    pills: ['FRESH UPVOTES', '1-TAP REMIX', 'SHARE LINKS'],
    scene: 'cat-dank'
  },
  '/memes/programming': {
    accent: '#00f5ff',
    accent2: '#22c55e',
    gold: '#facc15',
    badge: 'CURATED FEED // DEV, GIT & PROD FIRES',
    headline: 'PROGRAMMING\nMEMES <>',
    sub: 'Git force-push horrors, CSS centering trauma, legacy spaghetti & senior dev cope.',
    pills: ['DEV HUMOR', 'PROD INCIDENTS', 'REMIX READY'],
    scene: 'cat-tech'
  },
  '/memes/gaming': {
    accent: '#a855f7',
    accent2: '#00f5ff',
    gold: '#facc15',
    badge: 'CURATED FEED // LOBBY RAGE & 3 AM QUEUE',
    headline: 'GAMING\nMEMES 🎮',
    sub: 'One more ranked match lies, teammate diff, side-quest addiction & CRT nostalgia.',
    pills: ['RANKED PAIN', 'LOOT DROPS', 'GAMER LORE'],
    scene: 'cat-gaming'
  },
  '/memes/relatable': {
    accent: '#facc15',
    accent2: '#ff2a85',
    gold: '#00f5ff',
    badge: 'CURATED FEED // 3 AM OVERTHINKING',
    headline: 'RELATABLE\nMEMES 🫠',
    sub: 'Everyday awkwardness, alarm snoozes, caffeine dependency & uninvited 3 AM memories.',
    pills: ['REAL LIFE LORE', 'INSTANT LAUGHS', 'TEXT-READY'],
    scene: 'cat-relatable'
  }
};

function esc(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderScene(scene, cfg) {
  switch (scene) {
    case 'hero':
      return `
        <div class="stage hero-stage">
          <div class="sun-ring"></div>
          <img class="hero-crest" src="${FAVICON_DATA_URI}" alt="THE MEMES.net Neon Sign" />
          <div class="hero-mini-card c1">
            <span class="mini-top">WHEN IT ACTUALLY COMPILES</span>
            <div class="mini-pic">🔥💯</div>
            <span class="mini-bot">DEPLOY ON FRIDAY!</span>
          </div>
          <div class="hero-mini-card c2">
            <span class="mini-pill">🎱 NEON BINGO ‘86</span>
            <span class="mini-pill">🎰 COIN DOZER</span>
            <span class="mini-pill">🔊 VINE BOOM SFX</span>
          </div>
        </div>
      `;

    case 'bingo': {
      const cells = [
        { v: '4', d: true }, { v: '', d: false }, { v: '27', d: false }, { v: '', d: false }, { v: '48', d: true }, { v: '53', d: false }, { v: '', d: false }, { v: '71', d: true }, { v: '88', d: true },
        { v: '', d: false }, { v: '14', d: true }, { v: '', d: false }, { v: '35', d: true }, { v: '42', d: true }, { v: '', d: false }, { v: '64', d: true }, { v: '', d: false }, { v: '84', d: false },
        { v: '9', d: false }, { v: '', d: false }, { v: '22', d: true }, { v: '39', d: false }, { v: '', d: false }, { v: '58', d: true }, { v: '69', d: true }, { v: '', d: false }, { v: '', d: false }
      ];
      return `
        <div class="stage game-stage bingo-stage">
          <div class="bingo-top-row">
            <div class="bingo-cage">
              <div class="cage-ball b1">7</div>
              <div class="cage-ball b2">69</div>
              <div class="cage-ball b3">88</div>
            </div>
            <div class="bingo-hero-call">
              <div class="hero-ball"><span>42</span></div>
              <div class="callout-txt">B-42 · THE ANSWER!</div>
            </div>
          </div>
          <div class="recent-strip">
            <span class="rc-lbl">RECENT</span>
            <span class="rc-b hot">42</span>
            <span class="rc-b">88</span>
            <span class="rc-b">69</span>
            <span class="rc-b">14</span>
            <span class="rc-b">64</span>
            <span class="rc-b">7</span>
          </div>
          <div class="bingo-ticket">
            ${cells
              .map(
                (c) =>
                  `<div class="bt-cell ${c.v ? '' : 'empty'} ${c.d ? 'dabbed' : ''}">${esc(c.v)}</div>`
              )
              .join('')}
          </div>
        </div>
      `;
    }

    case 'pusher':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-gold">
            <div class="bezel-hdr">COINS ON DECK: 148 · JACKPOT: M$50.00</div>
            <div class="pusher-well">
              <div class="pusher-ram">PUSH DECK ×5</div>
              <div class="coin-row">
                <span class="tok gold">¢</span><span class="tok cyan">💎</span><span class="tok gold">¢</span><span class="tok pink">★</span><span class="tok gold">¢</span>
              </div>
              <div class="coin-row offset">
                <span class="tok pink">★</span><span class="tok gold">¢</span><span class="tok gold">¢</span><span class="tok cyan">💎</span><span class="tok gold">¢</span>
              </div>
            </div>
            <div class="bezel-ftr">DROP ZONE: ◀ 🟢 ▶</div>
          </div>
        </div>
      `;

    case 'pinball':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-cyan">
            <div class="bezel-hdr">SCORE: 04,892,600 · MULTIBALL ×3</div>
            <div class="pinball-field">
              <div class="bumper b1">50K</div>
              <div class="bumper b2">10K</div>
              <div class="bumper b3">25K</div>
              <div class="silver-ball"></div>
              <div class="flipper left"></div>
              <div class="flipper right"></div>
            </div>
            <div class="bezel-ftr">5 TABLES · CRT LASER RAMP</div>
          </div>
        </div>
      `;

    case 'slots':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-pink">
            <div class="bezel-hdr">🔥 MEGA PAYLINE · JACKPOT M$86.00</div>
            <div class="slot-reels">
              <div class="reel"><span>💎</span><span class="win">7️⃣</span><span>🍒</span></div>
              <div class="reel"><span>⚡</span><span class="win">7️⃣</span><span>🔔</span></div>
              <div class="reel"><span>🍋</span><span class="win">7️⃣</span><span>💎</span></div>
            </div>
            <div class="payline-bar">PAYOUT ×100 WINNER!</div>
          </div>
        </div>
      `;

    case 'blackjack':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-green felt">
            <div class="bezel-hdr">PLAYER: 21 BLACKJACK! · DEALER: 17</div>
            <div class="cards-fan">
              <div class="card black"><span>A</span><strong>♠</strong></div>
              <div class="card red"><span>K</span><strong>♦</strong></div>
            </div>
            <div class="chips-row">
              <span class="chip c1">M$25</span><span class="chip c2">M$12.50</span><span class="chip c3">M$6.25</span>
            </div>
          </div>
        </div>
      `;

    case 'poker':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-cyan">
            <div class="bezel-hdr">ROYAL FLUSH · PAYOUT ×800</div>
            <div class="cards-five">
              ${['10♠', 'J♠', 'Q♠', 'K♠', 'A♠']
                .map((c) => `<div class="mini-card"><span>${c}</span><small>HELD</small></div>`)
                .join('')}
            </div>
            <div class="payline-bar cyan">DRAW COMPLETE · 4,000¢ WON!</div>
          </div>
        </div>
      `;

    case 'roulette':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-pink">
            <div class="bezel-hdr">⚡ LIGHTNING STRIKE: 17 BLACK ×500</div>
            <div class="roul-wrap">
              <div class="roul-wheel"><div class="roul-core">17</div></div>
              <div class="roul-grid">
                <span class="rg r">3</span><span class="rg b">6</span><span class="rg r">9</span><span class="rg r">12</span>
                <span class="rg b">2</span><span class="rg r">5</span><span class="rg b">8</span><span class="rg b hot">17⚡</span>
                <span class="rg r">1</span><span class="rg b">4</span><span class="rg r">7</span><span class="rg b">10</span>
              </div>
            </div>
          </div>
        </div>
      `;

    case 'crush':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-purple">
            <div class="bezel-hdr">COMBO ×8 CASCADE · 92,400 PTS</div>
            <div class="crush-grid">
              ${['🔥', '💎', '⚡', '🐸', '🚀', '💎', '🔥', '🔥', '🔥', '💎', '⚡', '🐸', '💎', '🚀', '⚡', '🚀', '⚡', '🐸', '💎', '🔥']
                .map((ico, i) => `<div class="cg-tile ${i >= 6 && i <= 8 ? 'lit' : ''}">${ico}</div>`)
                .join('')}
            </div>
          </div>
        </div>
      `;

    case 'stocks':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-green">
            <div class="bezel-hdr">$DOGE +420% ▲ · $STONK 1,986.00 ▲</div>
            <svg viewBox="0 0 420 180" class="stock-svg">
              <polyline points="14,154 78,136 124,148 186,92 232,110 302,44 352,60 404,18" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="404" cy="18" r="9" fill="#00f5ff" />
            </svg>
            <div class="payline-bar green">MEMEDAQ ‘86 · 10X LEVERAGE LONG</div>
          </div>
        </div>
      `;

    case 'derby':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-gold">
            <div class="bezel-hdr">LAP FINAL · TURBO DOGE 4.2x LEADS!</div>
            <div class="derby-lanes">
              <div class="lane"><span>LN1</span><div class="bar" style="width:76%">🏇 8-BIT BOLT</div></div>
              <div class="lane win"><span>LN2</span><div class="bar" style="width:94%">🐎 TURBO DOGE</div></div>
              <div class="lane"><span>LN3</span><div class="bar" style="width:68%">🐴 LASER CAT</div></div>
              <div class="lane"><span>LN4</span><div class="bar" style="width:82%">🦄 SYNTH UNICORN</div></div>
            </div>
          </div>
        </div>
      `;

    case 'guess':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-cyan">
            <div class="bezel-hdr">STREAK: 9 · NAME THIS MEME FORMAT</div>
            <div class="guess-box">
              <div class="blur-card">? ? ?</div>
              <div class="quiz-opts">
                <span>A. ALWAYS HAS BEEN</span>
                <span class="active">B. TWO BUTTONS</span>
                <span>C. EXPANDING BRAIN</span>
                <span>D. STONKS MAN</span>
              </div>
            </div>
          </div>
        </div>
      `;

    case 'eightball':
      return `
        <div class="stage game-stage">
          <div class="eightball-orb">
            <div class="eightball-tri">
              <span>ASK AGAIN<br/>AFTER COFFEE</span>
            </div>
          </div>
        </div>
      `;

    case 'hilow':
      return `
        <div class="stage game-stage">
          <div class="hilow-pair">
            <div class="hl-card"><strong>4,820 PTS</strong><span>GIT PUSH -F</span></div>
            <div class="hl-vs">VS</div>
            <div class="hl-card q"><strong>??? PTS</strong><span>📈 HIGHER?<br/>📉 LOWER?</span></div>
          </div>
        </div>
      `;

    case 'swipe':
      return `
        <div class="stage game-stage">
          <div class="swipe-card">
            <div class="stamp-fire">🔥 UPVOTE ×12</div>
            <div class="sc-title">“JUST ONE MORE MEME”</div>
            <div class="sc-sub">3:14 AM · +M$62.50 MEMEDOLLARZ</div>
          </div>
        </div>
      `;

    case 'battle':
      return `
        <div class="stage game-stage">
          <div class="bezel neon-pink">
            <div class="bezel-hdr">SUDDEN DEATH 1V1 // CROWD VOTE LIVE</div>
            <div class="battle-row">
              <div class="fighter f1"><strong>GIGACHAD</strong><div class="hp"><i style="width:84%"></i></div><span>72%</span></div>
              <div class="vs-bolt">⚡VS⚡</div>
              <div class="fighter f2"><strong>CHEEMS</strong><div class="hp"><i style="width:62%"></i></div><span>28%</span></div>
            </div>
          </div>
        </div>
      `;

    case 'win-update':
      return `
        <div class="stage prank-stage">
          <div class="win-screen">
            <div class="win-spinner">◌</div>
            <div class="win-pct">Working on updates</div>
            <div class="win-big">94% complete</div>
            <div class="win-note">Don’t turn off your PC. This will take a while.</div>
          </div>
        </div>
      `;

    case 'bsod':
      return `
        <div class="stage prank-stage">
          <div class="bsod-screen">
            <div class="bsod-face">:(</div>
            <div class="bsod-msg">Your PC ran into a problem and needs to restart.</div>
            <div class="bsod-pct">82% complete</div>
            <div class="bsod-code">Stop code: CRITICAL_MEME_OVERFLOW</div>
          </div>
        </div>
      `;

    case 'excel':
      return `
        <div class="stage prank-stage">
          <div class="excel-screen">
            <div class="xl-bar">Q4_Revenue_Synergy_Forecast_2026.xlsx</div>
            <div class="xl-grid">
              <div>Dept</div><div>Q3</div><div>Q4</div><div>YoY</div>
              <div>Cloud</div><div>$840K</div><div class="xl-g">$1.42M</div><div class="xl-g">+69%</div>
              <div>AI Ops</div><div>$510K</div><div class="xl-g">$980K</div><div class="xl-g">+92%</div>
              <div>EBITDA</div><div>$1.2M</div><div class="xl-g">$2.4M</div><div class="xl-g">+100%</div>
            </div>
          </div>
        </div>
      `;

    case 'teams':
      return `
        <div class="stage prank-stage">
          <div class="teams-screen">
            <div class="tm-hdr">🔴 REC · Q4 Architecture Alignment Sync (4)</div>
            <div class="tm-tiles">
              <div class="tm-t talking"><span>VP Sarah (Speaking)</span></div>
              <div class="tm-t"><span>CTO Marcus</span></div>
              <div class="tm-t"><span>Lead Dev Kai</span></div>
              <div class="tm-t"><span>You (Muted)</span></div>
            </div>
          </div>
        </div>
      `;

    case 'terminal':
      return `
        <div class="stage prank-stage">
          <div class="term-screen">
            <div class="term-hdr">ssh root@prod-us-east-04 // k8s-deploy</div>
            <pre>$ terraform apply -auto-approve
[OK] Rebalancing 24 worker pods...
[OK] Rust binary compiled in 1.84s
[OK] SOC2 zero-trust handshake: VERIFIED
[LIVE] CPU: 42% [███████░░░] MEM: 68%</pre>
          </div>
        </div>
      `;

    case 'ai-work':
      return `
        <div class="stage prank-stage">
          <div class="ai-screen">
            <div class="ai-hdr">SynergyGPT Enterprise v5.4 · Q4 Strategy</div>
            <div class="ai-prompt">Prompt: Generate Q4 KPI guardrail & EBITDA briefing</div>
            <div class="ai-reply"><strong>Executive Summary:</strong> Re-calibrating multi-cloud Kubernetes guardrails yields +18.4% EBITDA efficiency while maintaining SLA parity.</div>
          </div>
        </div>
      `;

    case 'meme-studio':
      return `
        <div class="stage tool-stage">
          <div class="meme-frame">
            <div class="mf-cap top">WHEN THE CODE WORKS</div>
            <div class="mf-art">😎⚡</div>
            <div class="mf-cap bot">ON THE VERY FIRST TRY</div>
          </div>
        </div>
      `;

    case 'gif-studio':
      return `
        <div class="stage tool-stage">
          <div class="meme-frame gif">
            <div class="mf-cap top">LOADING FRIDAY 4:59 PM</div>
            <div class="mf-art">🎞️🔥</div>
            <div class="mf-cap bot">LIVE GIF FRAMES BURNED</div>
          </div>
        </div>
      `;

    case 'soundboard':
      return `
        <div class="stage tool-stage">
          <div class="pad-grid">
            ${['💥 BOOM', '📯 HORN', '🤡 HONK', '🔧 PIPE', '🎺 SAD', '🚨 BRUH', '👏 CLAP', '🔔 RIZZ', '🎸 RIFF']
              .map((p, idx) => `<div class="mpc-pad ${idx === 0 || idx === 3 ? 'lit' : ''}">${p}</div>`)
              .join('')}
          </div>
        </div>
      `;

    case 'arcade-hub':
      return `
        <div class="stage tool-stage">
          <div class="hub-grid">
            <div class="hub-cab"><span>🎱</span><strong>NEON BINGO</strong></div>
            <div class="hub-cab"><span>🎰</span><strong>COIN DOZER</strong></div>
            <div class="hub-cab"><span>🎰</span><strong>VEGAS 777</strong></div>
            <div class="hub-cab"><span>📈</span><strong>MEMEDAQ</strong></div>
          </div>
        </div>
      `;

    default:
      return `
        <div class="stage tool-stage">
          <div class="meme-frame">
            <div class="mf-cap top">${esc(cfg.headline.split('\n')[0])}</div>
            <div class="mf-art">⚡🔥</div>
            <div class="mf-cap bot">UPVOTE · REMIX · TEXT</div>
          </div>
        </div>
      `;
  }
}

function buildHtml({ badge, headline, sub, pills, accent, accent2, gold, scene }, slugLabel) {
  const headlineHtml = esc(headline).replaceAll('\n', '<br/>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: #060314;
    font-family: 'Segoe UI Black', 'Arial Black', Impact, system-ui, sans-serif;
    color: #ffffff;
    position: relative;
  }
  .bg {
    position: absolute; inset: 0;
    background:
      radial-gradient(circle at 78% 36%, ${accent2}33 0%, transparent 48%),
      radial-gradient(circle at 22% 80%, ${accent}2b 0%, transparent 52%),
      linear-gradient(155deg, #060314 0%, #140533 58%, #070a1c 100%);
  }
  .grid-floor {
    position: absolute; left: -120px; right: -120px; bottom: 0; height: 220px;
    background-image:
      linear-gradient(to right, ${accent}28 1px, transparent 1px),
      linear-gradient(to bottom, ${accent2}2e 1px, transparent 1px);
    background-size: 56px 38px;
    transform: perspective(360px) rotateX(56deg);
    transform-origin: bottom center;
    opacity: 0.72;
  }
  .scanlines {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px);
    pointer-events: none;
  }
  .outer-frame {
    position: absolute; inset: 16px;
    border: 3px solid #19f0ff88;
    border-radius: 26px;
    background: rgba(7, 6, 15, 0.25);
    box-shadow: inset 0 0 38px rgba(25, 240, 255, 0.14), 0 0 32px rgba(255, 46, 136, 0.28);
    display: grid;
    grid-template-columns: 1.06fr 0.94fr;
    gap: 28px;
    padding: 36px 42px;
    align-items: center;
  }
  .left { display: flex; flex-direction: column; gap: 18px; z-index: 2; }
  .brand-row { display: flex; align-items: center; gap: 14px; }
  .brand-icon {
    width: 64px; height: 64px; border-radius: 16px;
    box-shadow: 0 0 22px rgba(255, 42, 133, 0.55);
    flex-shrink: 0;
  }
  .brand-meta { display: flex; flex-direction: column; gap: 4px; }
  .domain {
    font-size: 23px; font-weight: 900; letter-spacing: 2px;
    color: #ffffff;
    text-shadow: 0 0 14px ${accent};
  }
  .route-tag {
    font-family: 'Courier New', monospace;
    font-size: 13px; font-weight: 800; letter-spacing: 1.5px;
    color: ${gold};
  }
  .badge {
    align-self: flex-start;
    padding: 7px 14px; border-radius: 999px;
    background: linear-gradient(90deg, ${accent}22, ${accent2}28);
    border: 1.5px solid ${accent};
    font-family: 'Courier New', monospace;
    font-size: 13px; font-weight: 900; letter-spacing: 1.3px;
    color: ${accent};
    text-transform: uppercase;
  }
  h1 {
    font-family: Impact, 'Arial Black', sans-serif;
    font-size: 68px; line-height: 0.98; letter-spacing: 1.5px;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 10%, #e2e8f0 52%, ${accent} 100%);
    -webkit-background-clip: text; color: transparent;
    filter: drop-shadow(0 5px 0 rgba(4, 3, 18, 0.92)) drop-shadow(0 0 22px ${accent2}66);
  }
  .sub {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-weight: 600; font-size: 21px; line-height: 1.35;
    color: #e2e8f0; max-width: 560px;
  }
  .pills { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
  .pill {
    padding: 8px 14px; border-radius: 10px;
    background: rgba(8, 12, 28, 0.86);
    border: 1.5px solid ${gold}aa;
    color: ${gold};
    font-family: 'Courier New', monospace;
    font-size: 13px; font-weight: 900; letter-spacing: 1px;
  }

  .stage {
    width: 100%; height: 470px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; z-index: 2;
  }
  .hero-stage { gap: 14px; }
  .sun-ring {
    position: absolute; width: 340px; height: 340px; border-radius: 50%;
    background: radial-gradient(circle, ${accent2}44 0%, ${accent}22 50%, transparent 72%);
    filter: blur(8px);
  }
  .hero-crest {
    width: 300px; height: 300px; z-index: 2;
    filter: drop-shadow(0 16px 34px rgba(0, 245, 255, 0.45));
  }
  .hero-mini-card.c1 {
    background: #0b0f22; border: 2.5px solid #00f5ff; border-radius: 14px;
    padding: 10px 18px; width: 360px; text-align: center;
    box-shadow: 0 12px 28px rgba(0,0,0,0.65); z-index: 3;
    display: flex; flex-direction: column; gap: 2px;
  }
  .mini-top, .mini-bot { font-family: Impact, sans-serif; font-size: 18px; letter-spacing: 1px; color: #fff; text-shadow: 0 2px 0 #000; }
  .mini-pic { font-size: 18px; }
  .hero-mini-card.c2 {
    display: flex; gap: 8px; z-index: 3;
  }
  .mini-pill {
    padding: 6px 11px; border-radius: 8px; background: #14082b; border: 1.5px solid #ff2a85;
    font-family: 'Courier New', monospace; font-size: 12px; font-weight: 900; color: #facc15;
  }

  .bezel {
    width: 100%; height: 100%;
    background: linear-gradient(160deg, #0b1024 0%, #150930 100%);
    border-radius: 22px; padding: 20px;
    border: 3px solid ${accent};
    box-shadow: 0 20px 44px rgba(0,0,0,0.7), inset 0 0 28px rgba(0,245,255,0.16);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .bezel.neon-pink { border-color: #ff2a85; }
  .bezel.neon-gold { border-color: #facc15; }
  .bezel.neon-green { border-color: #22c55e; }
  .bezel.neon-purple { border-color: #a855f7; }
  .bezel.felt { background: radial-gradient(circle, #0b3a24 0%, #051c12 100%); }
  .bezel-hdr {
    font-family: 'Courier New', monospace; font-size: 15px; font-weight: 900;
    color: ${gold}; letter-spacing: 1px; border-bottom: 1.5px solid rgba(255,255,255,0.14);
    padding-bottom: 10px; text-align: center;
  }
  .bezel-ftr {
    font-family: 'Courier New', monospace; font-size: 14px; font-weight: 900;
    color: #00f5ff; border-top: 1.5px solid rgba(255,255,255,0.14);
    padding-top: 10px; text-align: center;
  }

  /* Bingo Stage */
  .bingo-stage {
    background: linear-gradient(160deg, #090e22, #170834);
    border: 3px solid #22c55e; border-radius: 22px; padding: 18px;
    justify-content: space-between;
    box-shadow: 0 20px 44px rgba(0,0,0,0.7);
  }
  .bingo-top-row { display: flex; gap: 16px; width: 100%; align-items: center; }
  .bingo-cage {
    width: 145px; height: 118px; border-radius: 50%;
    border: 3px solid #00f5ff; background: radial-gradient(circle, #172554, #050816);
    position: relative; box-shadow: inset 0 0 20px rgba(0,245,255,0.35);
  }
  .cage-ball {
    position: absolute; width: 38px; height: 38px; border-radius: 50%;
    display: grid; place-items: center; font-size: 16px; font-weight: 900; color: #050816;
  }
  .cage-ball.b1 { top: 20px; left: 22px; background: #00f5ff; }
  .cage-ball.b2 { top: 52px; left: 54px; background: #ff2a85; color: #fff; }
  .cage-ball.b3 { top: 24px; right: 18px; background: #facc15; }
  .bingo-hero-call {
    flex: 1; background: rgba(7, 11, 28, 0.9); border: 2px solid #ff2a85;
    border-radius: 16px; padding: 14px; display: flex; align-items: center; gap: 14px;
  }
  .hero-ball {
    width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
    background: radial-gradient(circle at 30% 30%, #fef08a, #ff2a85 65%, #7e22ce);
    display: grid; place-items: center; font-size: 32px; color: #fff;
    box-shadow: 0 0 22px #ff2a85;
  }
  .callout-txt { font-size: 22px; color: #facc15; line-height: 1.15; }
  .recent-strip {
    width: 100%; display: flex; align-items: center; gap: 8px;
    background: rgba(5, 8, 22, 0.85); border: 1.5px solid #38bdf8;
    border-radius: 12px; padding: 8px 12px;
  }
  .rc-lbl { font-family: 'Courier New', monospace; font-size: 13px; color: #38bdf8; margin-right: 4px; }
  .rc-b {
    width: 34px; height: 34px; border-radius: 50%; background: #1e293b; border: 1.5px solid #64748b;
    display: grid; place-items: center; font-size: 15px;
  }
  .rc-b.hot { background: #22c55e; color: #052e16; border-color: #86efac; }
  .bingo-ticket {
    width: 100%; background: #f8fafc; border-radius: 14px; padding: 10px;
    display: grid; grid-template-columns: repeat(9, 1fr); gap: 5px;
    border: 3px solid #facc15;
  }
  .bt-cell {
    height: 44px; border-radius: 7px; background: #ffffff; border: 1.5px solid #cbd5e1;
    color: #0f172a; display: grid; place-items: center; font-size: 19px; font-weight: 900;
  }
  .bt-cell.empty { background: #e2e8f0; border-color: #cbd5e1; }
  .bt-cell.dabbed {
    background: radial-gradient(circle, #ff2a85, #be185d); color: #fff;
    border-color: #f472b6; box-shadow: inset 0 0 10px rgba(255,255,255,0.45);
  }

  /* Pusher / Slots / Cards */
  .pusher-well { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; align-items: center; }
  .pusher-ram {
    width: 82%; padding: 12px; border-radius: 10px; text-align: center;
    background: linear-gradient(90deg, #00f5ff, #ff2a85); color: #050314; font-size: 20px;
  }
  .coin-row { display: flex; gap: 14px; }
  .tok {
    width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font-size: 26px;
    border: 3px solid #fff;
  }
  .tok.gold { background: linear-gradient(145deg, #fef08a, #ca8a04); color: #422006; }
  .tok.cyan { background: #0891b2; border-color: #67e8f9; }
  .tok.pink { background: #db2777; border-color: #f9a8d4; }

  .pinball-field { flex: 1; position: relative; }
  .bumper {
    position: absolute; width: 78px; height: 78px; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle, #ff2a85, #7e22ce); border: 4px solid #facc15; font-size: 20px;
    box-shadow: 0 0 24px #ff2a85;
  }
  .bumper.b1 { top: 28px; left: 78px; }
  .bumper.b2 { top: 28px; right: 78px; }
  .bumper.b3 { top: 128px; left: 196px; background: radial-gradient(circle, #00f5ff, #0284c7); }
  .silver-ball {
    position: absolute; bottom: 88px; left: 218px; width: 32px; height: 32px; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #ffffff, #64748b); box-shadow: 0 0 18px #fff;
  }
  .flipper {
    position: absolute; bottom: 26px; width: 132px; height: 22px; border-radius: 99px;
    background: linear-gradient(90deg, #facc15, #f97316);
  }
  .flipper.left { left: 72px; transform: rotate(20deg); }
  .flipper.right { right: 72px; transform: rotate(-20deg); }

  .slot-reels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex: 1; align-items: center; }
  .reel {
    background: #040714; border: 2.5px solid #38bdf8; border-radius: 16px; padding: 14px 0;
    display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 46px;
  }
  .reel .win {
    background: rgba(250, 204, 21, 0.22); width: 100%; text-align: center;
    border-top: 2px solid #facc15; border-bottom: 2px solid #facc15; padding: 6px 0;
  }
  .payline-bar {
    padding: 12px; border-radius: 12px; background: linear-gradient(90deg, #ff2a85, #facc15);
    color: #060314; text-align: center; font-size: 20px;
  }
  .payline-bar.cyan { background: linear-gradient(90deg, #00f5ff, #38bdf8); }
  .payline-bar.green { background: linear-gradient(90deg, #22c55e, #00f5ff); }

  .cards-fan { display: flex; justify-content: center; gap: 18px; align-items: center; flex: 1; }
  .card {
    width: 132px; height: 186px; border-radius: 16px; background: #fff;
    border: 4px solid #facc15; color: #0f172a; padding: 14px;
    display: flex; flex-direction: column; justify-content: space-between; font-size: 38px;
    box-shadow: 0 16px 32px rgba(0,0,0,0.55);
  }
  .card.red { color: #e11d48; }
  .card strong { font-size: 62px; align-self: center; }
  .chips-row { display: flex; justify-content: center; gap: 16px; }
  .chip {
    width: 68px; height: 68px; border-radius: 50%; display: grid; place-items: center;
    border: 5px dashed #fff; font-size: 16px;
  }
  .chip.c1 { background: #1e293b; }
  .chip.c2 { background: #db2777; }
  .chip.c3 { background: #0284c7; }

  .cards-five { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .mini-card {
    height: 152px; background: #fff; border-radius: 12px; color: #0f172a; border: 3px solid #00f5ff;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 14px 4px;
    font-size: 28px;
  }
  .mini-card small { background: #00f5ff; color: #04101a; font-size: 11px; padding: 3px 8px; border-radius: 6px; }

  .roul-wrap { display: flex; align-items: center; gap: 18px; flex: 1; }
  .roul-wheel {
    width: 170px; height: 170px; border-radius: 50%; flex-shrink: 0;
    border: 14px solid #b45309; background: conic-gradient(#dc2626 0 15deg, #0f172a 15deg 30deg, #dc2626 30deg 45deg, #0f172a 45deg 60deg, #16a34a 60deg 75deg, #0f172a 75deg 360deg);
    display: grid; place-items: center; box-shadow: 0 0 28px #ff2a85;
  }
  .roul-core { width: 64px; height: 64px; border-radius: 50%; background: #facc15; color: #050816; display: grid; place-items: center; font-size: 28px; }
  .roul-grid { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .rg { height: 52px; border-radius: 8px; display: grid; place-items: center; font-size: 18px; border: 1.5px solid rgba(255,255,255,0.3); }
  .rg.r { background: #dc2626; }
  .rg.b { background: #1e293b; }
  .rg.hot { background: #0f172a; border: 3px solid #facc15; color: #facc15; box-shadow: 0 0 18px #facc15; }

  .crush-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; flex: 1; align-content: center; }
  .cg-tile {
    height: 68px; border-radius: 12px; background: #170f38; border: 2px solid #4c1d95;
    display: grid; place-items: center; font-size: 32px;
  }
  .cg-tile.lit { border-color: #00f5ff; background: #1e1b4b; box-shadow: 0 0 16px #00f5ff; }

  .stock-svg { width: 100%; height: 220px; background: rgba(4, 10, 22, 0.72); border-radius: 14px; }
  .derby-lanes { display: flex; flex-direction: column; gap: 14px; flex: 1; justify-content: center; }
  .lane { display: flex; align-items: center; gap: 10px; font-family: 'Courier New', monospace; font-size: 15px; }
  .lane .bar { background: #1e293b; border: 2px solid #00f5ff; border-radius: 8px; padding: 10px 14px; color: #fff; }
  .lane.win .bar { background: linear-gradient(90deg, #facc15, #f97316); color: #060314; border-color: #fff; }

  .guess-box { display: flex; flex-direction: column; gap: 14px; flex: 1; justify-content: center; }
  .blur-card {
    height: 140px; border-radius: 14px; background: repeating-linear-gradient(45deg, #1e1b4b 0 16px, #312e81 16px 32px);
    display: grid; place-items: center; font-size: 46px; color: #00f5ff; border: 2px solid #38bdf8;
  }
  .quiz-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .quiz-opts span { background: #0f172a; border: 1.5px solid #475569; padding: 10px; border-radius: 10px; font-size: 13px; }
  .quiz-opts span.active { border-color: #22c55e; background: #052e16; color: #86efac; }

  .eightball-orb {
    width: 340px; height: 340px; border-radius: 50%;
    background: radial-gradient(circle at 30% 25%, #334155, #020617 70%);
    border: 4px solid #a855f7; box-shadow: 0 0 46px rgba(168,85,247,0.6);
    display: grid; place-items: center;
  }
  .eightball-tri {
    width: 196px; height: 170px; background: linear-gradient(180deg, #1d4ed8, #4f46e5);
    clip-path: polygon(50% 100%, 0 0, 100% 0);
    display: flex; align-items: flex-start; justify-content: center; padding-top: 28px;
    text-align: center; font-size: 17px; color: #e0f2fe;
  }

  .hilow-pair { display: flex; align-items: center; gap: 14px; width: 100%; }
  .hl-card {
    flex: 1; height: 240px; border-radius: 18px; background: #0b1024; border: 3px solid #00f5ff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 16px; text-align: center;
  }
  .hl-card.q { border-color: #22c55e; }
  .hl-card strong { font-size: 30px; color: #facc15; }
  .hl-vs { font-size: 28px; color: #ff2a85; }

  .swipe-card {
    width: 360px; height: 340px; border-radius: 24px; transform: rotate(4deg);
    background: linear-gradient(155deg, #1e1b4b, #3b0764); border: 4px solid #ff2a85;
    padding: 24px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;
    box-shadow: 0 20px 44px rgba(255,42,133,0.4);
  }
  .stamp-fire {
    align-self: flex-start; border: 3px solid #22c55e; color: #22c55e;
    padding: 6px 14px; border-radius: 10px; font-size: 22px; transform: rotate(-10deg);
  }
  .sc-title { font-size: 32px; color: #fff; }
  .sc-sub { font-family: 'Courier New', monospace; font-size: 16px; color: #facc15; }

  .battle-row { display: flex; align-items: center; gap: 14px; flex: 1; }
  .fighter {
    flex: 1; background: #0f172a; border: 2.5px solid #00f5ff; border-radius: 16px; padding: 18px;
    display: flex; flex-direction: column; gap: 14px; align-items: center;
  }
  .fighter.f2 { border-color: #ff2a85; }
  .hp { width: 100%; height: 18px; background: #1e293b; border-radius: 99px; overflow: hidden; }
  .hp i { display: block; height: 100%; background: linear-gradient(90deg, #22c55e, #00f5ff); }
  .vs-bolt { font-size: 24px; color: #facc15; }

  /* Prank / Boss Screen Mockups */
  .win-screen, .bsod-screen, .excel-screen, .teams-screen, .term-screen, .ai-screen {
    width: 100%; height: 390px; border-radius: 18px; padding: 28px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.75);
  }
  .win-screen {
    background: #0067c0; border: 3px solid #93c5fd;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center;
    font-family: 'Segoe UI', sans-serif;
  }
  .win-spinner { font-size: 56px; color: #fff; }
  .win-pct { font-size: 26px; font-weight: 600; }
  .win-big { font-size: 38px; font-weight: 700; }
  .win-note { font-size: 16px; opacity: 0.9; }

  .bsod-screen {
    background: #0078d7; border: 3px solid #bfdbfe; font-family: 'Segoe UI', sans-serif;
    display: flex; flex-direction: column; justify-content: center; gap: 14px;
  }
  .bsod-face { font-size: 86px; line-height: 1; }
  .bsod-msg { font-size: 22px; line-height: 1.3; }
  .bsod-pct { font-size: 22px; font-weight: 700; }
  .bsod-code { font-family: Consolas, monospace; font-size: 15px; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; }

  .excel-screen { background: #ffffff; color: #0f172a; border: 3px solid #16a34a; padding: 0; overflow: hidden; display: flex; flex-direction: column; }
  .xl-bar { background: #107c41; color: #fff; padding: 14px 18px; font-family: 'Segoe UI', sans-serif; font-size: 16px; font-weight: 700; }
  .xl-grid { display: grid; grid-template-columns: repeat(4, 1fr); flex: 1; }
  .xl-grid > div { border: 1px solid #cbd5e1; display: grid; place-items: center; font-family: Consolas, sans-serif; font-size: 17px; font-weight: 700; }
  .xl-g { background: #dcfce7; color: #166534; }

  .teams-screen { background: #1f1f2b; border: 3px solid #6366f1; display: flex; flex-direction: column; gap: 14px; padding: 18px; }
  .tm-hdr { font-family: 'Segoe UI', sans-serif; font-size: 15px; color: #e2e8f0; }
  .tm-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; }
  .tm-t {
    background: #2b2c3b; border-radius: 12px; border: 2px solid #3f3f46;
    display: flex; align-items: flex-end; padding: 12px; font-family: 'Segoe UI', sans-serif; font-size: 15px;
  }
  .tm-t.talking { border-color: #6366f1; box-shadow: inset 0 0 24px rgba(99,102,241,0.35); }

  .term-screen { background: #0c0e0c; border: 3px solid #22c55e; font-family: Consolas, monospace; padding: 0; overflow: hidden; }
  .term-hdr { background: #14532d; color: #86efac; padding: 10px 16px; font-size: 15px; }
  .term-screen pre { padding: 20px; color: #4ade80; font-size: 17px; line-height: 1.65; white-space: pre-wrap; }

  .ai-screen { background: #f8fafc; color: #0f172a; border: 3px solid #38bdf8; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 14px; }
  .ai-hdr { font-size: 18px; font-weight: 800; color: #0284c7; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
  .ai-prompt { background: #e0f2fe; padding: 12px 16px; border-radius: 10px; font-size: 16px; font-weight: 700; }
  .ai-reply { background: #fff; border: 1.5px solid #cbd5e1; padding: 16px; border-radius: 12px; font-size: 17px; line-height: 1.45; }

  /* Tools & Categories */
  .meme-frame {
    width: 410px; height: 380px; border-radius: 20px; border: 3px solid #00f5ff;
    background: radial-gradient(circle, #1e1b4b, #050816);
    padding: 20px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center;
    box-shadow: 0 20px 44px rgba(0,0,0,0.7);
  }
  .meme-frame.gif { border-color: #ff2a85; }
  .mf-cap { font-family: Impact, sans-serif; font-size: 32px; color: #fff; -webkit-text-stroke: 1.6px #000; }
  .mf-art { font-size: 92px; }

  .pad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; height: 380px; }
  .mpc-pad {
    background: #140f2c; border: 3px solid #38bdf8; border-radius: 14px;
    display: grid; place-items: center; font-size: 20px; box-shadow: inset 0 0 18px rgba(56,189,248,0.22);
  }
  .mpc-pad.lit { border-color: #ff2a85; background: linear-gradient(155deg, #4c0519, #831843); box-shadow: 0 0 22px #ff2a85; }

  .hub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; height: 370px; }
  .hub-cab {
    background: #0b1024; border: 3px solid #00f5ff; border-radius: 18px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.65);
  }
  .hub-cab span { font-size: 56px; }
  .hub-cab strong { font-size: 22px; color: #facc15; }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="grid-floor"></div>
  <div class="outer-frame">
    <div class="left">
      <div class="brand-row">
        <img class="brand-icon" src="${FAVICON_DATA_URI}" alt="THE MEMES.net Neon Sign" />
        <div class="brand-meta">
          <div class="domain">THEMEMES.NET</div>
          <div class="route-tag">${esc(slugLabel)}</div>
        </div>
      </div>
      <div class="badge">${esc(badge)}</div>
      <h1>${headlineHtml}</h1>
      <p class="sub">${esc(sub)}</p>
      <div class="pills">
        ${pills.map((p) => `<span class="pill">${esc(p)}</span>`).join('')}
      </div>
    </div>
    ${renderScene(scene, { badge, headline, sub, pills, accent, accent2, gold, scene })}
  </div>
  <div class="scanlines"></div>
</body>
</html>`;
}

async function launchBrowser() {
  for (const opts of [
    { headless: true },
    { headless: true, channel: 'chrome' },
    { headless: true, channel: 'msedge' }
  ]) {
    try {
      return await chromium.launch(opts);
    } catch {
      // Try next available Chromium channel
    }
  }
  throw new Error('No Chromium, Chrome, or Edge browser executable available for Playwright.');
}

async function run() {
  fs.mkdirSync(OG_DIR, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  let generatedCount = 0;
  try {
    for (const route of SEO_ROUTES) {
      const cfg = CARD_THEMES[route.path];
      if (!cfg) continue; // Routes sharing games.png / og-card.png do not have a per-route card
      const slug = getOgImageSlugForRoutePath(route.path);
      if (!slug) continue; // public/og-card.png is generated by scripts/generate-brand-assets.mjs
      const outPath = path.join(OG_DIR, `${slug}.png`);
      const html = buildHtml(cfg, route.path === '/' ? 'https://www.thememes.net' : `thememes.net${route.path}`);
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({ path: outPath, type: 'png' });
      generatedCount += 1;
      console.log(`Generated ${path.relative(ROOT_DIR, outPath)}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone: generated ${generatedCount} Outrun 1200x630 OG preview PNGs.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
