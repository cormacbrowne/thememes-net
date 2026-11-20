// Workstream 1 — house memes draw their caption over the bare template; uploads stay burned in.
import { describe, it, expect } from 'vitest';
import { isOverlayBurnedIn, normalizeOverlayLayers } from '../../src/components/forge/forgeEngine.js';
import { buildHouseOverlay } from '../../supabase/functions/_shared/houseTemplates.js';

describe('house overlay', () => {
  it('is drawn live over image memes', () => {
    const overlay = buildHouseOverlay('tpl-two-buttons', ['WHEN THE WIFI', 'DROPS']);
    expect(isOverlayBurnedIn({ media_type: 'image', overlay })).toBe(false);
    const layers = normalizeOverlayLayers(overlay.layers);
    expect(layers.map((l) => [l.type, l.font, l.caps])).toEqual([
      ['text', 'Anton', true],
      ['text', 'Anton', true]
    ]);
  });
  it('ordinary image uploads still count as burned in', () => {
    expect(isOverlayBurnedIn({ media_type: 'image', overlay: { burned: false, layers: [] } })).toBe(true);
    expect(isOverlayBurnedIn({ media_type: 'image', overlay: null })).toBe(true);
  });
});
