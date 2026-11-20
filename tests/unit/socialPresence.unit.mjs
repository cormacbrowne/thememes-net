// Unit tests for Phase 2.8 social presence & /admin/social kit.
// Run: node --test tests/unit/socialPresence.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  getActiveSocialLinks,
  socialSameAs
} from '../../src/config/social.js';
import { SOCIAL_KIT_FORMATS, buildSocialCaption } from '../../src/utils/socialKitCanvas.js';

test('SOCIAL_LINKS config hides empty URLs and validates https URLs across all 5 platforms', () => {
  assert.deepEqual(
    SOCIAL_PLATFORMS.map((p) => p.id),
    ['tiktok', 'instagram', 'x', 'youtube', 'discord']
  );

  // Default empty config hides everything
  assert.deepEqual(getActiveSocialLinks(SOCIAL_LINKS), []);
  assert.deepEqual(socialSameAs(SOCIAL_LINKS), []);

  const configured = getActiveSocialLinks({
    tiktok: 'https://www.tiktok.com/@thememesnet',
    instagram: 'http://insecure.example.com',
    x: 'https://x.com/thememesnet',
    youtube: '   ',
    discord: 'javascript:alert(1)'
  });
  assert.deepEqual(
    configured.map((item) => item.id),
    ['tiktok', 'x']
  );
  assert.deepEqual(socialSameAs({
    tiktok: 'https://www.tiktok.com/@thememesnet',
    x: 'https://x.com/thememesnet'
  }), ['https://www.tiktok.com/@thememesnet', 'https://x.com/thememesnet']);
});

test('Social kit defines 1080x1920 & 1080x1080 formats and builds battle/winner captions', () => {
  assert.deepEqual(
    { width: SOCIAL_KIT_FORMATS.story.width, height: SOCIAL_KIT_FORMATS.story.height },
    { width: 1080, height: 1920 }
  );
  assert.deepEqual(
    { width: SOCIAL_KIT_FORMATS.square.width, height: SOCIAL_KIT_FORMATS.square.height },
    { width: 1080, height: 1080 }
  );

  const battleText = buildSocialCaption({
    mode: 'battle',
    battle: {
      title: 'Monday Standup Drake',
      theme: 'Office Chaos',
      prompt: 'Caption the best standup excuse'
    },
    entryCount: 14
  });
  assert.match(battleText, /Monday Standup Drake/);
  assert.match(battleText, /Office Chaos/);
  assert.match(battleText, /14 captions/);
  assert.match(battleText, /thememes\.net/);

  const winnerText = buildSocialCaption({
    mode: 'winner',
    previousBattle: { title: 'Sunday Meme Showdown' },
    winner: { author_name: 'memequeen', top_text: 'WORKS LOCALLY', bottom_text: 'SHIP IT FRIDAY', score: 42 },
    runnersUp: [{ author_name: 'pixelpal', top_text: 'NO TESTS', bottom_text: 'PURE VIBES' }]
  });
  assert.match(winnerText, /@memequeen \(42 votes\)/);
  assert.match(winnerText, /WORKS LOCALLY \/ SHIP IT FRIDAY/);
  assert.match(winnerText, /@pixelpal/);
  assert.match(winnerText, /thememes\.net\/hall-of-fame/);
});

test('Footer, Extras drawer, and /admin/social route are wired cleanly', () => {
  const footer = fs.readFileSync(new URL('../../src/components/SeoDiscoveryFooter.jsx', import.meta.url), 'utf8');
  const drawer = fs.readFileSync(new URL('../../src/components/ExtrasDrawerModal.jsx', import.meta.url), 'utf8');
  const main = fs.readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8');

  assert.match(footer, /<SocialLinksBar\s+variant="footer"\s*\/>/);
  assert.match(drawer, /<SocialLinksBar\s+variant="drawer"\s*\/>/);
  assert.match(main, /isSocialAdminRoute\s*=\s*\/\^\\\/admin\\\/social/);
  assert.match(main, /<AdminSocialKitPage\s*\/>/);
});
