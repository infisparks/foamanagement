import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hylmdtagkhdbikwuwymf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5bG1kdGFna2hkYmlrd3V3eW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NjAxMTUsImV4cCI6MjEwODEzNjExNX0.qvrg-9iexX9abKhP5x5Cm2lQqEuMiiQhkozF_S5oPQo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
