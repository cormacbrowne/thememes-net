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
}