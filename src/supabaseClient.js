import { createClient } from '@supabase/supabase-js';

// Supabase client configuration. The URL and anon key must be provided
// via environment variables. Vercel exposes these when defined in
// Project → Settings → Environment Variables.
// Resolve Supabase credentials from environment variables if available.
// Fall back to hard‑coded values to ensure the site works even when Vercel
// environment variables are misconfigured or missing.
const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL ||
  'https://hdjxlibduxqahvwarxma.supabase.co';
const supabaseKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkanhsaWJkdXhxYWh2d2FyeG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MzIwMzMsImV4cCI6MjA2OTIwODAzM30.-dqgtJNkmOzpQmSw5RJDKk0mljGVyAECpsSZgnAxOnY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to sign in with Google using Supabase OAuth.
export const signInWithGoogle = async () => {
  /*
   * When initiating the OAuth sign‑in flow, explicitly specify a redirect URL
   * so that Supabase knows where to send the user after authentication. If a
   * redirect URL is not provided, Supabase will fall back to the project’s
   * configured Site URL or, failing that, `http://localhost:3000`, which
   * causes users in production to be sent back to a non‑existent local host.
   *
   * We use `window.location.origin` so the user is redirected back to the
   * current site (either the custom domain or the Vercel preview domain).
   */
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
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
// The `memes` table in this project stores the image URL in the `image_url` column
// and references the uploader via the `user_id` column. Because the schema does
// not contain a `votes` column (votes are stored in a separate `votes` table),
// we simply insert the public URL and the current user's ID. A caption can also
// be provided but is optional.
export const uploadMeme = async (file, caption = '') => {
  // Ensure there is an authenticated user before uploading.
  const { user } = await getUser();
  if (!user) {
    return { error: new Error('You must be logged in to upload a meme.') };
  }
  const fileName = `${Date.now()}-${file.name}`;
  // Upload the file to the `memes` storage bucket
  const { error: uploadError } = await supabase.storage
    .from('memes')
    .upload(fileName, file);
  if (uploadError) return { error: uploadError };
  // Generate a public URL for the uploaded file
  const publicUrl = supabase.storage
    .from('memes')
    .getPublicUrl(fileName).data.publicUrl;
  // Insert the meme record into the `memes` table using the existing columns
  const { error: insertError } = await supabase.from('memes').insert([
    {
      image_url: publicUrl,
      user_id: user.id,
      caption,
    },
  ]);
  return { error: insertError };
};

// Fetch memes ordered by votes (descending) and created_at (descending).
export const fetchMemes = async () => {
  /*
    Fetch memes and their associated vote counts. Because the `votes` table
    stores one row per vote rather than a single numeric column on `memes`, we
    perform two queries: one to retrieve all memes and another to retrieve all
    votes. We then aggregate the votes by `meme_id` in JavaScript and merge
    them back into the meme objects. Finally we sort the resulting array by
    vote count (descending) and creation time (descending) so the most
    popular and recent memes appear first.
  */
  const { data: memesData, error: memesError } = await supabase
    .from('memes')
    .select('*')
    .order('created_at', { ascending: false });
  if (memesError) return { memes: [], error: memesError };
  const { data: votesData, error: votesError } = await supabase
    .from('votes')
    .select('meme_id');
  if (votesError) return { memes: [], error: votesError };
  // Build a map of meme_id to vote count
  const voteCounts = {};
  (votesData || []).forEach(({ meme_id }) => {
    voteCounts[meme_id] = (voteCounts[meme_id] || 0) + 1;
  });
  // Transform memes into desired shape (url, votes) and compute counts
  const memes = (memesData || []).map((meme) => {
    return {
      id: meme.id,
      url: meme.image_url,
      votes: voteCounts[meme.id] || 0,
      caption: meme.caption,
      created_at: meme.created_at,
      user_id: meme.user_id,
    };
  });
  // Sort by votes desc then by created_at desc (already sorted by created_at desc)
  memes.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    // Compare ISO strings
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return { memes, error: null };
};

// Increment the vote count for a meme. This assumes a `votes` numeric column
// exists on the `memes` table. If not, create one in Supabase or adjust
// this method accordingly.
export const upvoteMeme = async (memeId) => {
  /*
    Register a vote for the given meme. Instead of updating a `votes`
    column on the `memes` table (which doesn’t exist in this schema), we
    insert a row into the `votes` table. Each vote row records which user
    voted for which meme. To prevent duplicate votes, your database can
    enforce a unique constraint on `(meme_id, user_id)`. Here we simply
    attempt to insert and ignore errors from duplicates.
  */
  const { user } = await getUser();
  if (!user) {
    return { error: new Error('You must be logged in to vote.') };
  }
  const { error } = await supabase
    .from('votes')
    .insert({ meme_id: memeId, user_id: user.id });
  return { error };
};