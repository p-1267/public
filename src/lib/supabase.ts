import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE_INIT] Missing environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'SET' : 'MISSING'
  });
  throw new Error('Supabase environment variables not configured. Check .env file.');
}

console.log('[SUPABASE_INIT] Client created successfully:', supabaseUrl);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
