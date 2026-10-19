import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://otvvphmjojqyjaznjzyo.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IcrXK6kDdGaWZo9rU0GFRg_ZxtaY-wB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getSupabaseClient() {
  return supabase;
}