import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';
import { supabaseConfig } from '../../core/config/supabase.config';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Returns the typed singleton Supabase client instance.
 * Preserves session tokens across page reloads using browser local storage.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return supabaseInstance;
}

export type TypedSupabaseClient = SupabaseClient<Database>;
