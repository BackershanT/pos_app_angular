import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase.types';
import { supabaseConfig } from '../../core/config/supabase.config';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Minimal no-op WebSocket polyfill for server-side prerendering in environments
 * that lack a native WebSocket constructor.
 */
class SsrWebSocketPolyfill {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly readyState = SsrWebSocketPolyfill.CLOSED;
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
}

function resolveWebSocketTransport(): any {
  if (typeof WebSocket !== 'undefined') {
    return WebSocket;
  }
  if (typeof (globalThis as any).WebSocket !== 'undefined') {
    return (globalThis as any).WebSocket;
  }
  return SsrWebSocketPolyfill;
}

/**
 * Returns the typed singleton Supabase client instance.
 * Preserves session tokens across page reloads using browser local storage when in the browser.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

    supabaseInstance = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        auth: {
          persistSession: isBrowser,
          autoRefreshToken: isBrowser,
          detectSessionInUrl: isBrowser,
        },
        realtime: {
          transport: resolveWebSocketTransport(),
        },
      }
    );
  }
  return supabaseInstance;
}

export type TypedSupabaseClient = SupabaseClient<Database>;
