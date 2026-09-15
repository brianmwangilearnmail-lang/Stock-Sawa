import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://fuerncnhudxyjxnabrif.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZXJuY25odWR4eWp4bmFicmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzU5MDYsImV4cCI6MjEwMjIxMTkwNn0.UubQwXy9eHEdLekgMwSoZb8peMaWhDpTd-EnWFq4MPw';

// Clean and sanitize URL (remove trailing slashes, /rest/v1 paths if accidentally included)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


