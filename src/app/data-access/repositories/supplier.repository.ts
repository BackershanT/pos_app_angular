import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Supplier, SupplierInsert, SupplierUpdate } from '../models/supplier.model';

/** Ceiling for the purchase-order scan behind the supplier activity columns. */
const ORDER_SCAN_LIMIT = 1000;

/** Purchase order states that still represent work in progress. */
const OPEN_ORDER_STATES = ['draft', 'ordered'];

interface OrderActivityRow {
  supplier_id: string;
  status: string;
  ordered_at: string | null;
  created_at: string;
}

export interface SupplierWithActivity extends Supplier {
  /** Draft or placed orders that have not been received or cancelled yet. */
  open_orders: number;
  /** Most recent order date, or null when this supplier has never been ordered from. */
  last_order_at: string | null;
}

export interface SupplierDirectoryResult {
  suppliers: SupplierWithActivity[];
  scannedOrders: number;
  activityTruncated: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SupplierRepository extends BaseRepository {
  /**
   * Fetches registered suppliers. `businessId` scopes the read to one tenant.
   */
  async getSuppliers(businessId?: string, limit = 100): Promise<Supplier[]> {
    let query = this.supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })
      .limit(Math.max(1, limit));

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    return (data as Supplier[]) ?? [];
  }

  /**
   * Suppliers with real procurement activity, counted from purchase_orders.
   *
   * `contact_details` is an unvalidated JSONB blob, so an `activeOrders` key
   * parked inside it is a snapshot that goes stale the moment an order changes;
   * open orders must always be counted from the source of truth.
   */
  async getSuppliersWithActivity(businessId?: string): Promise<SupplierDirectoryResult> {
    const [suppliers, orders] = await Promise.all([
      this.getSuppliers(businessId),
      this.scanOrderActivity(businessId),
    ]);

    const activity = new Map<string, { open: number; last: string | null }>();
    for (const order of orders.rows) {
      const supplierId = order.supplier_id;
      if (!supplierId) continue;
      const entry = activity.get(supplierId) ?? { open: 0, last: null };

      const stamp = order.ordered_at || order.created_at;
      if (!entry.last || new Date(stamp).getTime() > new Date(entry.last).getTime()) {
        entry.last = stamp;
      }
      if (OPEN_ORDER_STATES.includes(String(order.status ?? '').toLowerCase())) {
        entry.open += 1;
      }
      activity.set(supplierId, entry);
    }

    return {
      suppliers: suppliers.map((s) => ({
        ...s,
        open_orders: activity.get(s.id)?.open ?? 0,
        last_order_at: activity.get(s.id)?.last ?? null,
      })),
      scannedOrders: orders.rows.length,
      activityTruncated: orders.truncated,
    };
  }

  /**
   * Creates a new supplier record.
   */
  async createSupplier(supplier: SupplierInsert): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .insert(supplier as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data as Supplier;
  }

  /**
   * Updates an existing supplier.
   */
  async updateSupplier(id: string, updates: SupplierUpdate): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update supplier ${id}: ${error.message}`);
    }

    return data as Supplier;
  }

  /** Bounded projection of purchase orders used for the activity columns. */
  private async scanOrderActivity(
    businessId?: string,
  ): Promise<{ rows: OrderActivityRow[]; truncated: boolean }> {
    let query = this.supabase
      .from('purchase_orders')
      .select('supplier_id, status, ordered_at, created_at')
      .order('created_at', { ascending: false })
      .range(0, ORDER_SCAN_LIMIT);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch supplier order activity: ${error.message}`);
    }

    const rows = (data as OrderActivityRow[]) ?? [];
    const truncated = rows.length > ORDER_SCAN_LIMIT;

    return { rows: truncated ? rows.slice(0, ORDER_SCAN_LIMIT) : rows, truncated };
  }
}
