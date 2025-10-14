import { createClient } from '@supabase/supabase-js';

// Supabase configuration uses direct URL and public anon key for the new project
const supabaseUrl = 'https://sawttagurwqthmdqozk.supabase.co';
const supabaseAnonKey = 'sbp_b1665bdc2cc3793ec8d2c6a5af72d9ff033f2d30';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
