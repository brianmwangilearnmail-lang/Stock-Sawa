import { createClient } from '@supabase/supabase-js';

// Clean and sanitize URL (remove trailing slashes, /rest/v1 paths if accidentally included)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing in environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

