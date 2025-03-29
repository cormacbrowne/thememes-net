
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opymwazgddvcsiaidatd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weW13YXpnZGR2Y3NpYWlkYXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjMxNDUsImV4cCI6MjA1ODgzOTE0NX0.KR02lbyHtfpQbBSn2EKz-05spv6G5Vfed8fEPU5hLRw';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  return { session: data?.session, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const uploadMeme = async (file, userId) => {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from('memes').upload(fileName, file);
  if (error) return { error };
  const publicUrl = supabase.storage.from('memes').getPublicUrl(fileName).data.publicUrl;
  return { url: publicUrl };
};

export const fetchMemes = async () => {
  const { data, error } = await supabase.from('memes').select('*').order('created_at', { ascending: false });
  return { memes: data, error };
};
