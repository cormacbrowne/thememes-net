// ==========================================
// PHASE 26: SINGLE PUBLISH PATH (replaces the two duplicate App.jsx publishers)
// ==========================================
import {
  uploadToStorage,
  randomId,
  extFor,
  guessContentType,
  makePoster
} from './mediaPipeline';

const DEFAULT_REACTIONS = { '🔥': 1, '💀': 0, '😂': 0, '🗿': 0 };

const PHASE26_COLUMNS = [
  'media_type',
  'poster_url',
  'duration_sec',
  'width',
  'height',
  'overlay',
  'base_image_url'
];

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}

const isUuidLike = (id) =>
  id && !String(id).startsWith('seed-') && !String(id).startsWith('local-');

/**
 * publishMeme({ media, overlay, meta, client })
 *  media: { kind:'image', blob, baseBlob?, width, height }
 *       | { kind:'gif'|'video', file?, url?, posterBlob?, posterUrl?, width, height, duration }
 *  meta:  { title, category, author, parentId, rootId, generation, isBounty, bountyId, isSpoiler, baseImageUrl }
 * Returns { meme, savedToDb }. Throws Error('OFFLINE_VIDEO') for video/gif uploads without Supabase.
 */
export async function publishMeme({ media, overlay = null, meta = {}, client = null }) {
  const kind = media?.kind || 'image';
  const isMotion = kind === 'video' || kind === 'gif';
  const nowIso = new Date().toISOString();
  const id = randomId();

  if (isMotion && !client && !media.url) {
    throw new Error('OFFLINE_VIDEO');
  }

  let imageUrl = media.url || '';
  let posterUrl = media.posterUrl || null;
  let baseImageUrl = meta.baseImageUrl || null;

  if (client) {
    if (isMotion && media.file && !media.url) {
      const contentType = guessContentType(media.file, kind);
      const folder = kind === 'video' ? 'videos' : 'gifs';
      imageUrl = await uploadToStorage(
        client,
        media.file,
        `${folder}/meme-${id}.${extFor(contentType)}`,
        contentType
      );
      const posterBlob = media.posterBlob || (await makePoster(media.file, kind));
      if (posterBlob) {
        try {
          posterUrl = await uploadToStorage(client, posterBlob, `posters/poster-${id}.jpg`, 'image/jpeg');
        } catch {
          posterUrl = null;
        }
      }
      if (!baseImageUrl) baseImageUrl = imageUrl;
    } else if (!isMotion && media.blob) {
      const ct = media.blob.type || 'image/webp';
      imageUrl = await uploadToStorage(client, media.blob, `meme-${id}-gen${meta.generation || 0}.${extFor(ct)}`, ct);
      if (media.baseBlob && !baseImageUrl) {
        try {
          const bct = media.baseBlob.type || 'image/webp';
          baseImageUrl = await uploadToStorage(client, media.baseBlob, `bases/base-${id}.${extFor(bct)}`, bct);
        } catch {
          baseImageUrl = null;
        }
      }
    }
  } else if (!isMotion && media.blob) {
    imageUrl = await blobToDataUrl(media.blob);
  }

  const lineage = {
    generation: meta.generation || 0,
    mutation_count: 0,
    parent_meme_id: meta.parentId || null,
    root_meme_id: meta.rootId || null,
    is_bounty: Boolean(meta.isBounty),
    bounty_id: meta.bountyId || null,
    is_spoiler: Boolean(meta.isSpoiler),
    comments: []
  };

  const phase26 = {
    media_type: kind,
    poster_url: posterUrl,
    duration_sec: media.duration ? Number(media.duration.toFixed(2)) : null,
    width: media.width ? Math.round(media.width) : null,
    height: media.height ? Math.round(media.height) : null,
    overlay: overlay || null,
    base_image_url: baseImageUrl
  };

  const baseRow = {
    title: meta.title,
    category: meta.category || 'dank',
    image_url: imageUrl,
    author_name: meta.author || 'AnonMemer',
    score: 1,
    reactions: DEFAULT_REACTIONS,
    ...(isUuidLike(meta.parentId) ? { parent_meme_id: meta.parentId } : {})
  };

  if (client) {
    try {
      let { data, error } = await client
        .from('memes')
        .insert([{ ...baseRow, ...phase26 }])
        .select()
        .single();
      if (error && /column|schema/i.test(error.message || '')) {
        // Phase 26 migration not run yet — retry without the new columns.
        ({ data, error } = await client.from('memes').insert([baseRow]).select().single());
      }
      if (!error && data) {
        const merged = { ...lineage, ...phase26, ...data };
        PHASE26_COLUMNS.forEach((k) => {
          if (merged[k] == null && phase26[k] != null) merged[k] = phase26[k];
        });
        return {
          savedToDb: true,
          meme: {
            ...merged,
            generation: data.generation ?? lineage.generation,
            root_meme_id: lineage.root_meme_id || data.root_meme_id || data.id,
            comments: []
          }
        };
      }
    } catch {
      // fall through to local
    }
    if (isMotion && !media.url) throw new Error('OFFLINE_VIDEO');
  }

  return {
    savedToDb: false,
    meme: {
      id: `local-${id}`,
      ...baseRow,
      ...lineage,
      ...phase26,
      created_at: nowIso
    }
  };
}
