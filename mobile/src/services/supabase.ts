import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ofprsrlrikowbtjcusli.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug: Log Supabase configuration
console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Anon key present:', !!supabaseAnonKey, 'Length:', supabaseAnonKey?.length || 0);

if (!supabaseAnonKey) {
  console.warn('[Supabase] WARNING: Anon key is empty! Authentication will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
