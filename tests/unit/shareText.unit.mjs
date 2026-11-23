// "THE MEMES.net" must never reach share text: phones auto-link it to memes.net.
// Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linkSafeShareText } from '../../src/utils/shareText.js';

test('rewrites the spaced brand to the real domain', () => {
  assert.equal(
    linkSafeShareText('Compete in "Buff vs Smol" on THE MEMES.net'),
    'Compete in "Buff vs Smol" on thememes.net'
  );
  assert.equal(linkSafeShareText('the memes.net rocks, THE  MEMES.net!'), 'thememes.net rocks, thememes.net!');
});

test('leaves other text alone', () => {
  assert.equal(linkSafeShareText('Play on thememes.net'), 'Play on thememes.net');
  assert.equal(linkSafeShareText(''), '');
  assert.equal(linkSafeShareText(undefined), undefined);
});

test('share and invite call sites use the helper', () => {
  for (const file of [
    'src/components/DailyCaptionBattleModal.jsx',
    'src/components/SeoDiscoveryFooter.jsx',
    'src/components/GameRouter.jsx',
    'src/components/BossKeyOverlay.jsx',
    'src/components/multiplayer/MultiplayerRoom.jsx',
    'src/components/GameShell.jsx',
    'src/components/ArcadeLobby.jsx',
    'src/components/CreatorProfilePage.jsx'
  ]) {
    assert.match(readFileSync(file, 'utf8'), /linkSafeShareText\(/, `${file} should use linkSafeShareText`);
  }
});
