import { createClient } from '@supabase/supabase-js';

// Supabase client configuration. The URL and anon key must be provided
// via environment variables. Vercel exposes these when defined in
// Project → Settings → Environment Variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to sign in with Google using Supabase OAuth.
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) console.error('Google sign‑in error:', error);
};

// Helper to sign the user out.
export const signOut = async () => {
  await supabase.auth.signOut();
};

// Get the current authenticated user, if any.
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};

// Upload a meme image to Supabase Storage and create a row in the `memes` table.
export const uploadMeme = async (file, userId) => {
  const fileName = `${Date.now()}-${file.name}`;
  // Upload to the `memes` storage bucket.
  const { error: uploadError } = await supabase.storage
    .from('memes')
    .upload(fileName, file);
  if (uploadError) return { error: uploadError };
  // Get the public URL for the uploaded file.
  const publicUrl = supabase.storage
    .from('memes')
    .getPublicUrl(fileName).data.publicUrl;
  // Insert a row into the `memes` table. We set votes to 0 for new memes.
  const { error: insertError } = await supabase.from('memes').insert([
    {
      url: publicUrl,
      uploaded_by: userId,
      votes: 0,
    },
  ]);
  return { error: insertError };
};

// Fetch memes ordered by votes (descending) and created_at (descending).
export const fetchMemes = async () => {
  const { data, error } = await supabase
    .from('memes')
    .select('*')
    .order('votes', { ascending: false })
    .order('created_at', { ascending: false });
  return { memes: data, error };
};

// Increment the vote count for a meme. This assumes a `votes` numeric column
// exists on the `memes` table. If not, create one in Supabase or adjust
// this method accordingly.
export const upvoteMeme = async (memeId) => {
  // Use Supabase RPC to increment or update the votes count atomically.
  const { data, error } = await supabase
    .from('memes')
    .update({ votes: supabase.raw('votes + 1') })
    .eq('id', memeId)
    .select();
  return { data, error };
};