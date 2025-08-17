import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdjxlibduxqahvwarxma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkanhsaWJkdXhxYWh2d2FyeG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MzIwMzMsImV4cCI6MjA2OTIwODAzM30.-dqgtJNkmOzpQmSw5RJDKk0mljGVyAECpsSZgnAxOnY';
// Supabase configuration is pulled from environment variables so that
// keys are not hard coded in the repository. Make sure to define
// `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your environment
// when running the app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
