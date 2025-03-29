
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) console.error("Google sign-in error:", error);
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};

export const uploadMeme = async (file, userId) => {
  const fileName = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("memes").upload(fileName, file);
  if (uploadError) return { error: uploadError };
  const publicUrl = supabase.storage.from("memes").getPublicUrl(fileName).data.publicUrl;
  const { error: insertError } = await supabase.from("memes").insert([{ url: publicUrl, uploaded_by: userId }]);
  return { error: insertError };
};

export const fetchMemes = async () => {
  const { data, error } = await supabase.from("memes").select("*").order("created_at", { ascending: false });
  return { memes: data, error };
};
