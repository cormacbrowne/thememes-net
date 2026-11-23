// D-003 C5: memes drawn on house AI pictures must be labelled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAiTemplateImage, memeUsesAiPicture } from '../../src/utils/battleImages.js';

test('recognises house AI pictures', () => {
  assert.ok(isAiTemplateImage('/seed/tpl-drake-compare.webp'));
  assert.ok(isAiTemplateImage('https://www.thememes.net/seed/battle-buff-hamster.webp'));
  assert.ok(!isAiTemplateImage('/seed/seed-dank-01.webp'));
  assert.ok(!isAiTemplateImage('https://x.supabase.co/storage/v1/object/public/memes/u/a.webp'));
  assert.ok(memeUsesAiPicture({ image_url: '', base_image_url: '/seed/tpl-two-buttons.webp' }));
  assert.ok(!memeUsesAiPicture(null));
});

test('feed media, meme pages and the Forge show the label', () => {
  assert.match(readFileSync('src/components/MemeMedia.jsx', 'utf8'), /memeUsesAiPicture\(meme\) \? <p className="tm-media-ai-note">/);
  assert.match(readFileSync('api/meme-og.js', 'utf8'), /memeUsesAiPicture\(meme\)/);
  assert.match(readFileSync('src/components/forge/MemeForge.jsx', 'utf8'), /tm-forge-ai-note/);
});
