import { describe, it, expect } from 'vitest';
import { toSearchTerms, itemMatchesSearch } from '../../src/utils/catalogSearch';
import { ARCADE_GAMES_CATALOG, BOSS_SCREENS_CATALOG } from '../../src/data/arcadeGamesCatalog';

const find = (catalog, q) => catalog.filter((i) => itemMatchesSearch(i, toSearchTerms(q))).map((i) => i.id);

describe('catalog search', () => {
  it('splits on whitespace, not the letter s', () => {
    expect(toSearchTerms('  Fake   BSOD ')).toEqual(['fake', 'bsod']);
    expect(toSearchTerms('slots')).toEqual(['slots']);
  });

  it('empty query matches every prank and game', () => {
    expect(find(BOSS_SCREENS_CATALOG, '')).toHaveLength(BOSS_SCREENS_CATALOG.length);
    expect(find(ARCADE_GAMES_CATALOG, '   ')).toHaveLength(ARCADE_GAMES_CATALOG.length);
  });

  it('finds pranks by label, path, id and keywords', () => {
    expect(find(BOSS_SCREENS_CATALOG, 'cracked')).toEqual(['crackphone', 'crackpad']);
    expect(find(BOSS_SCREENS_CATALOG, 'broken phone')).toEqual(['crackphone']);
    expect(find(BOSS_SCREENS_CATALOG, 'bsod')).toEqual(['bsod']);
    expect(find(BOSS_SCREENS_CATALOG, 'zoom')).toEqual(['zoom']);
    expect(find(BOSS_SCREENS_CATALOG, 'windows update')).toEqual(['update']);
    expect(find(BOSS_SCREENS_CATALOG, 'zzzz')).toEqual([]);
  });

  it('is accent- and apostrophe-insensitive for games', () => {
    expect(find(ARCADE_GAMES_CATALOG, 'tysiac').length).toBeGreaterThan(0);
  });

  it('every catalog entry is searchable by its own label', () => {
    for (const item of [...ARCADE_GAMES_CATALOG, ...BOSS_SCREENS_CATALOG]) {
      expect(find([item], item.label)).toEqual([item.id]);
    }
  });
});
