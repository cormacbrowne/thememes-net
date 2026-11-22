// Plan 1.6 — HARD RULE: MemeDollarz can never be bought with real money, transferred
// between users, or cashed out / redeemed for anything of real value.
// M$ live only in the player's browser, so the guard is: no code path for any of those may
// exist anywhere (client, Edge Functions, serverless API, database). If one is ever needed,
// it needs the owner's sign-off and legal advice first; this test must then be updated
// deliberately, together with a server-side guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEMEDOLLARZ_RULES } from '../../src/utils/tokenEconomy.js';
import { FEATURE_CASINO_GAMES, CASINO_DISCLAIMER } from '../../src/config/featureFlags.js';
import {
  ARCADE_GAMES_CATALOG,
  ARCADE_LOBBY_GROUPS,
  getVisibleArcadeGames,
  isCasinoGame
} from '../../src/data/arcadeGamesCatalog.js';
import { casinoSafeViewMode } from '../../src/data/seoRoutes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir, re) =>
  fs
    .readdirSync(path.join(root, dir), { recursive: true })
    .map((f) => path.join(dir, String(f)))
    .filter((f) => re.test(f) && fs.statSync(path.join(root, f)).isFile());

const CODE_FILES = [
  ...walk('src', /\.(js|jsx|mjs)$/),
  ...walk('api', /\.(js|mjs)$/),
  ...walk('supabase/functions', /\.(js|ts|mjs)$/)
];

test('the M$ rules are declared and all false', () => {
  assert.deepEqual(MEMEDOLLARZ_RULES, {
    purchasableWithRealMoney: false,
    transferableBetweenUsers: false,
    redeemableForRealValue: false,
    storedOnServer: false
  });
  assert.ok(Object.isFrozen(MEMEDOLLARZ_RULES));
});

test('no payment provider SDK or API is used anywhere', () => {
  const pkg = JSON.parse(read('package.json'));
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  for (const d of deps) {
    assert.doesNotMatch(d, /stripe|paypal|braintree|adyen|square|paddle|lemonsqueezy|coinbase/i, d);
  }
  const payment = /from ['"](?:stripe|@stripe\/[^'"]+|@paypal\/[^'"]+)['"]|api\.stripe\.com|js\.stripe\.com|paypal\.com\/sdk|checkout\.sessions\.create/;
  for (const f of CODE_FILES) {
    assert.doesNotMatch(read(f), payment, `${f} references a payment provider`);
  }
});

test('no code path transfers, cashes out or redeems MemeDollarz', () => {
  const forbidden =
    /\b(?:transfer|gift|send|withdraw|cashOut|cash_out|redeem|payout)(?:Tokens|MemeDollarz|Money|Balance|Wallet|Centz)\b|\b(?:tokens|memedollarz|balance|wallet)_(?:transfer|cash_?out|redeem|withdraw|payout)\b/i;
  for (const f of CODE_FILES) {
    assert.doesNotMatch(read(f), forbidden, `${f} has a M$ transfer / cash-out path`);
  }
});

test('the database has no wallet, balance or payout objects', () => {
  const objectDef =
    /create\s+(?:table|or\s+replace\s+function|function|view)\s+(?:if\s+not\s+exists\s+)?[\w."]*(?:wallet|balance|memedollar|token_ledger|cash_?out|redeem|payout|purchase|payment)/i;
  for (const f of walk('supabase/migrations', /\.sql$/)) {
    assert.doesNotMatch(read(f), objectDef, `${f} creates a money-like database object`);
  }
  for (const dir of fs.readdirSync(path.join(root, 'supabase/functions'))) {
    assert.doesNotMatch(dir, /wallet|balance|pay|purchase|redeem|transfer|cash/i, `Edge Function "${dir}"`);
  }
});

test('casino games: own group, always last, flag-controlled, with a disclaimer', () => {
  assert.equal(typeof FEATURE_CASINO_GAMES, 'boolean');
  assert.match(CASINO_DISCLAIMER, /no real money/i);
  assert.equal(ARCADE_LOBBY_GROUPS.at(-1).id, 'casino');
  assert.equal(ARCADE_LOBBY_GROUPS.at(-1).label, 'Retro Casino');
  // Casino games are a contiguous block at the END of the catalog.
  const firstCasino = ARCADE_GAMES_CATALOG.findIndex(isCasinoGame);
  assert.ok(firstCasino > 0);
  assert.ok(ARCADE_GAMES_CATALOG.slice(firstCasino).every(isCasinoGame));
  for (const id of ['slots', 'roulette', 'blackjack', 'poker', 'derby', 'pusher', 'bingo']) {
    assert.ok(isCasinoGame(id), `${id} should be in the casino group`);
  }
  // Switching the flag off hides them and sends their routes to the lobby.
  assert.equal(getVisibleArcadeGames(false).some(isCasinoGame), false);
  assert.equal(casinoSafeViewMode('slots', false), 'lobby');
  assert.equal(casinoSafeViewMode('slots', true), 'slots');
  assert.equal(casinoSafeViewMode('invaders', false), 'invaders');
});

test('play-money copy never promises real wins, cash-outs or casino hype', () => {
  const files = [
    'src/components/VegasBlackjackGame.jsx',
    'src/components/VegasRouletteGame.jsx',
    'src/components/VegasPokerGame.jsx',
    'src/components/VegasSlotMachine.jsx',
    'src/components/ArcadeAiAssistant.jsx',
    'src/data/seoRouteCopy.js',
    'src/data/seoRoutes.js',
    'src/data/arcadeGamesCatalog.js'
  ];
  const banned = /win real|real wins|real payout|Cash Out|cash out (?:your|winnings)|near-miss|double-or-nothing|up[- ]to[- ]150|XP royalt/i;
  for (const f of files) assert.doesNotMatch(read(f), banned, f);
});

test('pinball copy has no prize, jackpot, RTP or cash wording', () => {
  assert.doesNotMatch(
    read('src/components/VegasPinballGame.jsx'),
    /PRIZE|JACKPOT|\bPrize\b|Jackpot!|\(\d+% RTP\)|to cash\b|You won\b/
  );
});

test('non-casino and promoted surfaces have no prize, near-miss or betting copy', () => {
  assert.doesNotMatch(read('src/components/MemeCrushGame.jsx'), /PRIZE|\bPrize\b|So close!|🏆 Stake|to win MemeDollarz/);
  assert.doesNotMatch(read('src/components/VegasSlotMachine.jsx'), /Prize Wheel|Almost! 2 Bonus/);
  assert.doesNotMatch(read('src/components/DankPetWidget.jsx'), /Wager your|onSelectViewMode\('slots'\)/);
  assert.doesNotMatch(read('src/hooks/useTokenEconomy.js'), /bet in the casino/);
  assert.doesNotMatch(read('src/data/seoRouteCopy.js'), /Vegas Jackpot|Prize Runs?\b/);
  assert.doesNotMatch(read('src/data/seoRoutes.js'), /high-score jackpots/);
  assert.doesNotMatch(
    read('src/components/EightiesIconsStrip.jsx'),
    /prize payout|bingo jackpot|Full House prize|Full House jackpot|one away from|JACKPOT POWER|prize vault|casino house edge|house edge|serious payouts|bets? the|roulette|Neon Slots|one ball away|extra (?:bingo )?cards|buying four|per diem on two|one more spin/
  );
});

test('no Las Vegas framing in user-facing names, and no casino promo on the homepage', () => {
  for (const g of ARCADE_GAMES_CATALOG) assert.doesNotMatch(`${g.label} ${g.pitch}`, /vegas/i, g.id);
  const app = read('src/App.jsx');
  assert.doesNotMatch(app, /ArcadeLoungePromo|inFeedArcadeCard=|ARCADE &amp; CASINO/);
  assert.doesNotMatch(read('src/components/SeoDiscoveryFooter.jsx'), /150×/);
  assert.doesNotMatch(read('src/components/EightiesIconsStrip.jsx'), /cash out/i);
  assert.doesNotMatch(read('src/components/NeonDerbyGame.jsx'), /Ticket Cashed|You cashed/);
  assert.doesNotMatch(read('src/components/DualDirectionHero.jsx'), /Vegas/);
  assert.doesNotMatch(read('src/data/seoRoutes.js'), /Las Vegas|Vegas 777/);
});
