import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { assertUuid } from '../../shared/utils/uuid.util';
import {
  StoreInventory,
  StoreInventoryInsert,
  StoreInventoryUpdate,
  StockMovement,
  StockMovementInsert,
  StockMovementReason,
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root',
})
export class InventoryRepository extends BaseRepository {
  /**
   * Fetches inventory levels for all products in a given store.
   */
  async getInventoryByStore(storeId: string): Promise<StoreInventory[]> {
    const { data, error } = await this.supabase
      .from('store_inventory')
      .select('*')
      .eq('store_id', storeId);

    if (error) {
      throw new Error(`Failed to fetch store inventory: ${error.message}`);
    }

    return (data as StoreInventory[]) ?? [];
  }

  /**
   * Fetches stock movements audit ledger.
   */
  async getStockMovements(storeId?: string, limit = 100): Promise<StockMovement[]> {
    let query = this.supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch stock movements: ${error.message}`);
    }

    return (data as StockMovement[]) ?? [];
  }

  /**
   * Records a manual stock movement in the audit ledger.
   *
   * NOTE: stock_movements exposes SELECT-only RLS to clients, so this path is only
   * usable by privileged contexts. UI flows must call adjustStock() (RPC) instead.
   */
  async recordMovement(movement: StockMovementInsert): Promise<StockMovement> {
    assertUuid(movement.business_id, 'Business id');
    assertUuid(movement.store_id, 'Store id');
    assertUuid(movement.product_id, 'Product id');

    const { data, error } = await this.supabase
      .from('stock_movements')
      .insert(movement)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }

    return data as StockMovement;
  }

  /**
   * Sets the on-hand quantity for one product in one branch.
   *
   * Runs the record_stock_adjustment RPC: tenancy is derived from the store row and
   * the ledger delta is computed from the locked balance server-side, so the client
   * can never report an absolute quantity as a movement delta. Balance and audit
   * row commit atomically; direct upserts are rejected by store_inventory RLS.
   */
  async adjustStock(
    storeId: string,
    productId: string,
    newQuantity: number,
    reason: StockMovementReason,
    notes?: string,
  ): Promise<StoreInventory> {
    assertUuid(storeId, 'Store id');
    assertUuid(productId, 'Product id');

    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      throw new Error('Adjusted stock quantity must be zero or greater.');
    }

    const { data, error } = await this.supabase.rpc('record_stock_adjustment', {
      p_store_id: storeId,
      p_product_id: productId,
      p_new_quantity: newQuantity,
      p_reason: reason,
      p_notes: notes ?? null,
    });

    if (error) {
      throw new Error(`Stock adjustment failed: ${error.message}`);
    }

    return data as unknown as StoreInventory;
  }
}
