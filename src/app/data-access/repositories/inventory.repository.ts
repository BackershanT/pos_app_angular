import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
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
   * Records a manual stock movement and updates inventory quantity.
   */
  async recordMovement(movement: StockMovementInsert): Promise<StockMovement> {
    const { data, error } = await this.supabase
      .from('stock_movements')
      .insert(movement as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record stock movement: ${error.message}`);
    }

    return data as StockMovement;
  }

  /**
   * Adjusts stock quantity for a product in store inventory.
   */
  async adjustStock(
    storeId: string,
    productId: string,
    newQuantity: number,
    reason: StockMovementReason,
    notes?: string
  ): Promise<StoreInventory> {
    const { data, error } = await this.supabase
      .from('store_inventory')
      .upsert(
        {
          store_id: storeId,
          product_id: productId,
          quantity_on_hand: newQuantity,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'store_id,product_id' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to adjust inventory: ${error.message}`);
    }

    // Also record the movement ledger entry
    await this.recordMovement({
      business_id: 'b0000000-0000-0000-0000-000000000001',
      store_id: storeId,
      product_id: productId,
      quantity_delta: newQuantity,
      balance_after: newQuantity,
      reason: reason as any,
    });

    return data as StoreInventory;
  }
}
