import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Upload a Canvas DataURL or File to Supabase Storage and return the public CDN URL
export async function uploadMemeToStorage(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const fileName = `meme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;

  const { error } = await supabase.storage
    .from('meme-images')
    .upload(fileName, blob, { contentType: 'image/png' });

  if (error) throw error;

  const { data } = supabase.storage.from('meme-images').getPublicUrl(fileName);
  return data.publicUrl;
]

export async function fetchLiveMemes(filter = 'latest') {
  let query = supabaseClient.from('memes').select('*, comments(*)');

  if (filter === 'latest') {
    query = query.order('created_at', { ascending: false });
  } else if (filter === 'top') {
    // Filter to last 7 days and sort by highest score
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', oneWeekAgo).order('score', { ascending: false });
  } else {
    query = query.order('score', { ascending: false });
  }

  const { data, error } = await query.limit(50);
  if (!error && data) {
    // Merge or replace your state.memes array and re-render
    state.memes = data;
    renderFeed();
  }
}

}