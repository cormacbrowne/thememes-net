/** Battle images from batch B002 are AI-generated and must carry a visible label (D-003 C5). */
export const AI_BATTLE_IMAGE_LABEL = 'AI-generated image';

export function isAiBattleImage(url) {
  // tpl-* files hold B002 pictures too since 23 Nov 2026, and older battles used them.
  return /^\/seed\/(?:battle|tpl)-[a-z0-9-]+\.webp$/.test(String(url || ''));
}

/**
 * House memes and Meme Forge templates draw live captions over the same AI pictures
 * (/seed/tpl-*.webp hold B002 pictures since 23 Nov 2026). Seed memes (/seed/seed-*)
 * carry the tag baked in, so they don't need a second one.
 */
export function isAiTemplateImage(url) {
  return /^(?:https?:\/\/[^/]+)?\/seed\/(?:tpl|battle)-[a-z0-9-]+\.webp$/.test(String(url || ''));
}

export function memeUsesAiPicture(meme) {
  return Boolean(meme) && (isAiTemplateImage(meme.image_url) || isAiTemplateImage(meme.base_image_url));
}
