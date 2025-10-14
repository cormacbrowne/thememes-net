import { createClient } from '@supabase/supabase-js';

// Supabase configuration is pulled from environment variables. Define 'VITE_SUPABASE_URL' and 'VITE_SUPABASE_ANON_KEY'
// in your environment (e.g., in a .env file) when running the app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
