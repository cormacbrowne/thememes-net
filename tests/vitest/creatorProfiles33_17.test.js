import { describe, it, expect, vi } from 'vitest';
import {
  PIXEL_AVATARS,
  PIXEL_AVATAR_IDS,
  avatarRectsForPreset,
  defaultPixelAvatarForHandle,
  getPixelAvatarById
} from '../../src/utils/pixelAvatars.js';
import {
  fetchCreatorProfile,
  getCreatorProfilePath,
  normalizeCreatorHandle,
  saveMyPixelAvatar,
  toggleFollowCreator
} from '../../src/utils/creatorProfiles.js';
import {
  getCanonicalPathForState,
  resolveRouteFromLocation
} from '../../src/data/seoRoutes.js';

describe('Task 33.17 Creator Profile Pages (/u/<handle>), Built-in Pixel Avatars & Follows', () => {
  it('ships 12 original built-in 8x8 pixel-art avatars with deterministic handle fallback', () => {
    expect(PIXEL_AVATARS.length).toBe(12);
    expect(new Set(PIXEL_AVATAR_IDS).size).toBe(12);

    PIXEL_AVATARS.forEach((avatar) => {
      expect(avatar.rows.length).toBe(8);
      avatar.rows.forEach((row) => expect(row.length).toBe(8));
      expect(avatarRectsForPreset(avatar).length).toBeGreaterThan(10);
    });

    const a1 = defaultPixelAvatarForHandle('KingMemer86');
    const a2 = defaultPixelAvatarForHandle('kingmemer86');
    expect(a1.id).toBe(a2.id);
    expect(getPixelAvatarById('https://evil.example/avatar.png').id).toBe('pixel-alien');
  });

  it('resolves /u/<handle> routes cleanly in seoRoutes and rejects invalid handles', () => {
    expect(normalizeCreatorHandle('@KingMemer86')).toEqual({
      displayHandle: 'KingMemer86',
      normalized: 'kingmemer86'
    });
    expect(normalizeCreatorHandle('../bad')).toBeNull();
    expect(getCreatorProfilePath('@KingMemer86')).toBe('/u/KingMemer86');

    const resolved = resolveRouteFromLocation('/u/PixelWizard86', '');
    expect(resolved.viewMode).toBe('creator');
    expect(resolved.creatorHandle).toBe('PixelWizard86');
    expect(resolved.isDedicatedLanding).toBe(true);

    expect(
      getCanonicalPathForState({ viewMode: 'creator', creatorHandle: 'PixelWizard86' })
    ).toBe('/u/PixelWizard86');
  });

  it('loads creator profile via get_creator_profile RPC and enforces built-in avatar + follow RPCs', async () => {
    const rpc = vi.fn(async (fn, args) => {
      if (fn === 'get_creator_profile') {
        expect(args).toEqual({ p_handle: 'pixelwizard86' });
        return {
          data: {
            ok: true,
            handle: 'PixelWizard86',
            normalized_handle: 'pixelwizard86',
            found: true,
            verified: true,
            avatar_id: 'neon-cat',
            follower_count: 14,
            is_following: false,
            is_caption_king: true,
            caption_wins: 2,
            stats: { memes_count: 3, total_score: 450, total_remixes: 2 },
            memes: [
              {
                id: 'm-1',
                title: 'CRT Dreams',
                category: 'dank',
                image_url: '/seed/seed-dank-01.webp',
                author_name: 'PixelWizard86',
                score: 320,
                mutation_count: 2,
                created_at: '2026-11-15T10:00:00Z'
              }
            ],
            high_scores: [
              { game: 'pinball', high_score: 98500, initials: 'PIX', achieved_at: '2026-11-15T11:00:00Z' }
            ]
          },
          error: null
        };
      }
      if (fn === 'toggle_follow_creator') {
        return {
          data: { ok: true, handle: 'pixelwizard86', following: true, follower_count: 15 },
          error: null
        };
      }
      if (fn === 'set_my_avatar') {
        return { data: { ok: true, avatar_id: args.p_avatar_id }, error: null };
      }
      return { data: null, error: { message: 'unexpected_rpc' } };
    });

    const mockClient = { rpc };

    const profile = await fetchCreatorProfile(mockClient, '@PixelWizard86');
    expect(profile.ok).toBe(true);
    expect(profile.avatarId).toBe('neon-cat');
    expect(profile.followerCount).toBe(14);
    expect(profile.highScores[0]).toMatchObject({ game: 'pinball', highScore: 98500, initials: 'PIX' });
    expect(profile.badges.some((b) => b.id === 'caption-king' && b.unlocked)).toBe(true);

    const followRes = await toggleFollowCreator(mockClient, 'PixelWizard86', true);
    expect(followRes).toEqual({
      ok: true,
      handle: 'pixelwizard86',
      following: true,
      followerCount: 15
    });

    const badAvatar = await saveMyPixelAvatar(mockClient, 'https://evil.example/pic.png');
    expect(badAvatar.ok).toBe(false);

    const okAvatar = await saveMyPixelAvatar(mockClient, 'turbo-shiba');
    expect(okAvatar).toEqual({ ok: true, avatarId: 'turbo-shiba' });
  });
});
