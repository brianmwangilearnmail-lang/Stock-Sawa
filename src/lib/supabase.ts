import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://fuerncnhudxyjxnabrif.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZXJuY25odWR4eWp4bmFicmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzU5MDYsImV4cCI6MjEwMjIxMTkwNn0.UubQwXy9eHEdLekgMwSoZb8peMaWhDpTd-EnWFq4MPw';

// If Vercel env var is present and points to the current active project, use it.
// Otherwise, strictly fallback to the verified SUPABASE_URL (prevents stale Vercel env vars from breaking auth).
const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const resolvedUrl = (envUrl && envUrl.includes('fuerncnhudxyjxnabrif')) ? envUrl : SUPABASE_URL;

const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const resolvedKey = (envKey && envKey.length > 50 && envUrl.includes('fuerncnhudxyjxnabrif')) ? envKey : SUPABASE_ANON_KEY;

export const supabaseUrl = resolvedUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
export const supabaseAnonKey = resolvedKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


