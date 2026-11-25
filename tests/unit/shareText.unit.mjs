// "THE MEMES.net" and bare "thememes.net" must never reach share text:
// phones auto-link "THE MEMES.net" to memes.net or fail to link bare domains.
// Every share text and URL must use https://www.thememes.net.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SITE_URL,
  canonicalShareUrl,
  ensureShareUrlInText,
  linkSafeShareText
} from '../../src/utils/shareText.js';

test('SITE_URL is the canonical https://www.thememes.net address', () => {
  assert.equal(SITE_URL, 'https://www.thememes.net');
});

test('rewrites the spaced brand and bare/non-www domains to https://www.thememes.net', () => {
  assert.equal(
    linkSafeShareText('Compete in "Buff vs Smol" on THE MEMES.net'),
    'Compete in "Buff vs Smol" on https://www.thememes.net'
  );
  assert.equal(
    linkSafeShareText('the memes.net rocks, THE  MEMES.net!'),
    'https://www.thememes.net rocks, https://www.thememes.net!'
  );
  assert.equal(linkSafeShareText('Play on thememes.net'), 'Play on https://www.thememes.net');
  assert.equal(linkSafeShareText('Visit www.thememes.net/games'), 'Visit https://www.thememes.net/games');
  assert.equal(linkSafeShareText('https://thememes.net/u/demo'), 'https://www.thememes.net/u/demo');
});

test('is idempotent on canonical https://www.thememes.net URLs and handles empty values', () => {
  assert.equal(
    linkSafeShareText('Play https://www.thememes.net/games/poker?ref=game'),
    'Play https://www.thememes.net/games/poker?ref=game'
  );
  assert.equal(linkSafeShareText(''), '');
  assert.equal(linkSafeShareText(undefined), undefined);
});

test('canonicalShareUrl and ensureShareUrlInText guarantee a full https://www URL', () => {
  assert.equal(canonicalShareUrl('/games/poker?room=ABC'), 'https://www.thememes.net/games/poker?room=ABC');
  assert.equal(canonicalShareUrl('https://thememes.net/u/neo'), 'https://www.thememes.net/u/neo');
  assert.equal(
    ensureShareUrlInText('Check out THE MEMES.net', 'https://www.thememes.net/m/42?ref=share'),
    'Check out THE MEMES https://www.thememes.net/m/42?ref=share'
  );
  assert.equal(
    ensureShareUrlInText('Check out THE MEMES.net', 'https://www.thememes.net'),
    'Check out https://www.thememes.net'
  );
  assert.equal(
    ensureShareUrlInText('Already linked https://www.thememes.net/m/42', 'https://www.thememes.net/m/42'),
    'Already linked https://www.thememes.net/m/42'
  );
});

test('share and invite call sites use shareText helpers', () => {
  for (const file of [
    'src/components/DailyCaptionBattleModal.jsx',
    'src/components/SeoDiscoveryFooter.jsx',
    'src/components/GameRouter.jsx',
    'src/components/BossKeyOverlay.jsx',
    'src/components/multiplayer/MultiplayerRoom.jsx',
    'src/components/GameShell.jsx',
    'src/components/ArcadeLobby.jsx',
    'src/components/CreatorProfilePage.jsx',
    'src/components/ShareMemeSheet.jsx',
    'src/components/MemeLiveCelebrationModal.jsx',
    'src/components/GuessTheMemeGame.jsx',
    'src/components/HigherOrLowerGame.jsx',
    'src/components/Magic8BallOracle.jsx',
    'src/components/QuickUploadBar.jsx',
    'src/components/forge/MemeForge.jsx',
    'src/components/forge/forgeEngine.js',
    'src/utils/socialKitCanvas.js',
    'src/utils/analytics.js'
  ]) {
    const content = readFileSync(file, 'utf8');
    assert.match(
      content,
      /shareText\.js/,
      `${file} should import helpers from shareText.js`
    );
  }
});

test('deep-link shares carry exactly one link (no extra homepage link)', () => {
  const url = 'https://www.thememes.net/battle/dd391dc7?ref=share';
  const out = ensureShareUrlInText('Compete in "Line Goes Down" on THE MEMES.net', url);
  assert.equal(out, `Compete in "Line Goes Down" on THE MEMES ${url}`);
  assert.equal((out.match(/https?:\/\//g) || []).length, 1);
  assert.equal(
    ensureShareUrlInText('Play on thememes.net and www.thememes.net/', url),
    `Play on THE MEMES and THE MEMES ${url}`
  );
  // Other deep links in the text are kept.
  assert.equal(
    ensureShareUrlInText('See https://www.thememes.net/games too', url),
    `See https://www.thememes.net/games too ${url}`
  );
});
