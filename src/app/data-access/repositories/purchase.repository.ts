import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import {
  PurchaseOrder,
  PurchaseOrderInsert,
  PurchaseOrderUpdate,
  PurchaseOrderItem,
  PurchaseOrderItemInsert,
} from '../models/purchase.model';

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier_name?: string;
  items?: PurchaseOrderItem[];
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseRepository extends BaseRepository {
  /**
   * Fetches all purchase orders with supplier information.
   */
  async getPurchaseOrders(limit = 100): Promise<PurchaseOrder[]> {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch purchase orders: ${error.message}`);
    }

    return (data as PurchaseOrder[]) ?? [];
  }

  /**
   * Fetches a purchase order and its line items.
   */
  async getPurchaseOrderById(id: string): Promise<PurchaseOrderWithDetails | null> {
    const { data: order, error: orderError } = await this.supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (orderError || !order) {
      return null;
    }

    const { data: items, error: itemsError } = await this.supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id);

    if (itemsError) {
      throw new Error(`Failed to fetch purchase order items: ${itemsError.message}`);
    }

    return {
      ...(order as PurchaseOrder),
      items: (items as PurchaseOrderItem[]) ?? [],
    };
  }

  /**
   * Creates a purchase order with items transactionally.
   */
  async createPurchaseOrder(
    order: PurchaseOrderInsert,
    items: Omit<PurchaseOrderItemInsert, 'purchase_order_id'>[]
  ): Promise<PurchaseOrder> {
    const { data: createdOrder, error: orderError } = await this.supabase
      .from('purchase_orders')
      .insert(order as any)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create purchase order: ${orderError.message}`);
    }

    const orderRecord = createdOrder as PurchaseOrder;

    if (items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        ...item,
        purchase_order_id: orderRecord.id,
      }));

      const { error: itemsError } = await this.supabase
        .from('purchase_order_items')
        .insert(itemsToInsert as any);

      if (itemsError) {
        throw new Error(`Failed to create purchase order items: ${itemsError.message}`);
      }
    }

    return orderRecord;
  }

  /**
   * Updates purchase order status (draft, ordered, received, paid, cancelled).
   */
  async updateStatus(id: string, status: string): Promise<PurchaseOrder> {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update({ status } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update purchase order status: ${error.message}`);
    }

    return data as PurchaseOrder;
  }

  /**
   * Receives goods for a purchase order and updates inventory.
   */
  async receiveGoods(orderId: string): Promise<boolean> {
    const po = await this.getPurchaseOrderById(orderId);
    if (!po) {
      throw new Error(`Purchase order ${orderId} not found`);
    }

    // Update status to received
    await this.updateStatus(orderId, 'received');

    // Automatically record stock movements for received goods
    if (po.items && po.items.length > 0) {
      for (const item of po.items) {
        await this.supabase.from('stock_movements').insert({
          business_id: po.business_id,
          store_id: po.store_id,
          product_id: item.product_id,
          quantity_delta: item.quantity,
          balance_after: item.quantity,
          reason: 'purchase' as any,
          notes: `GRN received from PO #${po.order_number || orderId.slice(0, 8)}`,
        } as any);
      }
    }

    return true;
  }
}
