import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdjxlibduxqahvwarxma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkanhsaWJkdXhxYWh2d2FyeG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MzIwMzMsImV4cCI6MjA2OTIwODAzM30.-dqgtJNkmOzpQmSw5RJDKk0mljGVyAECpsSZgnAxOnY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
