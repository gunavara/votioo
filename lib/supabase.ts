import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://whaxkumefdykypunpoxf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYXhrdW1lZmR5a3lwdW5wb3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjY0NjIsImV4cCI6MjA5MDgwMjQ2Mn0.K_pC3nOU8IFDJAYlnWt5jvSUndDwdFUy2V3aA16JTIo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
