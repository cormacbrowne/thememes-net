import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opymwazgddvcsiaidatd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weW13YXpnZGR2Y3NpYWlkYXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNjMxNDUsImV4cCI6MjA1ODgzOTE0NX0.KR02lbyHtfpQbBSn2EKz-05spv6G5Vfed8fEPU5hLRw';

export const supabase = createClient(supabaseUrl, supabaseKey);