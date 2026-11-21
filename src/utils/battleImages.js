/** Battle images from batch B002 are AI-generated and must carry a visible label (D-003 C5). */
export const AI_BATTLE_IMAGE_LABEL = 'AI-generated image';

export function isAiBattleImage(url) {
  return /^\/seed\/battle-[a-z0-9-]+\.webp$/.test(String(url || ''));
}
