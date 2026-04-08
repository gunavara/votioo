import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whaxkumefdykypunpoxf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYXhrdW1lZmR5a3lwdW5wb3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjY0NjIsImV4cCI6MjA5MDgwMjQ2Mn0.K_pC3nOU8IFDJAYlnWt5jvSUndDwdFUy2V3aA16JTIo';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYXhrdW1lZmR5a3lwdW5wb3hmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyNjQ2MiwiZXhwIjoyMDkwODAyNDYyfQ.ngJN_971lUnz5QCwLMS2PAWKVCWkI3i1TThf3llIi0Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Service role client for storage uploads (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
