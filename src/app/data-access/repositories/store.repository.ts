import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Store, StoreInsert, StoreUpdate } from '../models/store.model';

@Injectable({
  providedIn: 'root',
})
export class StoreRepository extends BaseRepository {
  /**
   * Fetches all stores/branches.
   */
  async getStores(): Promise<Store[]> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch stores: ${error.message}`);
    }

    return (data as Store[]) ?? [];
  }

  /**
   * Gets store by ID.
   */
  async getStoreById(storeId: string): Promise<Store | null> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get store ${storeId}: ${error.message}`);
    }

    return data as Store | null;
  }

  /**
   * Updates store configuration.
   */
  async updateStore(storeId: string, updates: StoreUpdate): Promise<Store> {
    const { data, error } = await this.supabase
      .from('stores')
      .update(updates as any)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update store ${storeId}: ${error.message}`);
    }

    return data as Store;
  }
}
