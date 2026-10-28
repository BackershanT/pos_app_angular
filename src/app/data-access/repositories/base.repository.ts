import { inject, Injectable } from '@angular/core';
import { getSupabaseClient, TypedSupabaseClient } from '../supabase/supabase.client';

/**
 * Base repository encapsulating the typed Supabase client.
 * Subclasses extend this to provide entity-specific query methods.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class BaseRepository {
  protected readonly supabase: TypedSupabaseClient = getSupabaseClient();

  /**
   * Helper to retrieve currently authenticated user id.
   */
  async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session?.user?.id ?? null;
  }
}
