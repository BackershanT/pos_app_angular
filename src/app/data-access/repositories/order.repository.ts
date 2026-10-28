import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { assertUuid } from '../../shared/utils/uuid.util';
import {
  CompleteSaleRequest,
  CompleteSaleResponse,
  ProcessRefundRequest,
  Sale,
  SaleWithDetails,
} from '../models/order.model';

/** Aggregated sell-through used by the dashboard velocity panel. */
export interface ProductVelocity {
  productId: string | null;
  productName: string;
  sku: string | null;
  unitsSold: number;
  revenue: number;
}

/**
 * Sell-through is aggregated client-side over this many ledger lines: the
 * register keeps enough context for a small-retail branch and refuses to claim
 * a ranking is complete when the window was clipped.
 */
const VELOCITY_SCAN_ROWS = 1000;

@Injectable({
  providedIn: 'root',
})
export class OrderRepository extends BaseRepository {
  /**
   * Commits an atomic transactional sale via complete_sale RPC.
   * Derives prices and taxes from database; verifies stock and records movements.
   */
  async completeSale(request: CompleteSaleRequest): Promise<CompleteSaleResponse> {
    const { data, error } = await (this.supabase as any).rpc('complete_sale', {
      p_store_id: request.store_id,
      p_items: request.items as any,
      p_payments: request.payments as any,
      p_customer_id: request.customer_id ?? null,
      p_idempotency_key: request.idempotency_key ?? null,
      p_notes: request.notes ?? null,
    });

    if (error) {
      throw new Error(`Checkout failed: ${error.message}`);
    }

    return data as CompleteSaleResponse;
  }

  /**
   * Processes a sale refund/reversal and updates restock inventory.
   */
  async processRefund(request: ProcessRefundRequest): Promise<any> {
    const { data, error } = await (this.supabase as any).rpc('process_sale_refund', {
      p_sale_id: request.sale_id,
      p_items_to_refund: request.items_to_refund as any,
      p_refund_amount: request.refund_amount,
      p_reason: request.reason,
      p_notes: request.notes ?? null,
    });

    if (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetches sales for a given store with pagination and an optional time window.
   * Used by the dashboard, which must never mix other branches into its KPIs.
   */
  async getSalesByStore(
    storeId: string,
    limit = 50,
    options: { from?: Date } = {},
  ): Promise<Sale[]> {
    assertUuid(storeId, 'Store id');
    let query = this.supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, limit));

    if (options.from) {
      query = query.gte('created_at', options.from.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sales: ${error.message}`);
    }

    return (data as Sale[]) ?? [];
  }

  /**
   * Rank SKUs by units sold for the active business, straight from sale_items.
   * `scannedRows` reports how many lines were aggregated so the UI can flag an
   * incomplete window instead of presenting a partial ranking as the truth.
   */
  async getProductVelocity(
    businessId: string,
    limit = 4,
  ): Promise<{ velocity: ProductVelocity[]; scannedRows: number; clipped: boolean }> {
    assertUuid(businessId, 'Business id');

    const { data, error } = await this.supabase
      .from('sale_items')
      .select('product_id, product_name, sku, quantity, total')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(VELOCITY_SCAN_ROWS);

    if (error) {
      throw new Error(`Failed to fetch sales history for ranking: ${error.message}`);
    }

    const rows = (data as any[]) ?? [];
    const clipped = rows.length >= VELOCITY_SCAN_ROWS;
    const byProduct = new Map<string, ProductVelocity>();

    for (const row of rows) {
      const key = String(row.product_id ?? row.product_name);
      const existing = byProduct.get(key);
      if (existing) {
        existing.unitsSold += Number(row.quantity ?? 0);
        existing.revenue += Number(row.total ?? 0);
      } else {
        byProduct.set(key, {
          productId: row.product_id ?? null,
          productName: row.product_name ?? 'Unknown product',
          sku: row.sku ?? null,
          unitsSold: Number(row.quantity ?? 0),
          revenue: Number(row.total ?? 0),
        });
      }
    }

    const velocity = [...byProduct.values()]
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
      .slice(0, Math.max(1, limit));

    return { velocity, scannedRows: rows.length, clipped };
  }

  /**
   * Recent tickets with their real line/unit counts, resolved in a second
   * batched query (no fabricated "3 items" in the dashboard feed).
   */
  async getRecentSalesWithLineCounts(
    storeId: string,
    limit = 8,
    options: { from?: Date } = {},
  ): Promise<Array<Sale & { line_count: number; units_sold: number }>> {
    const sales = await this.getSalesByStore(storeId, limit, options);
    if (sales.length === 0) return [];

    const saleIds = sales.map((sale) => sale.id);
    const { data, error } = await this.supabase
      .from('sale_items')
      .select('sale_id, quantity')
      .in('sale_id', saleIds);

    if (error) {
      throw new Error(`Failed to fetch ticket line counts: ${error.message}`);
    }

    const counts = new Map<string, { lines: number; units: number }>();
    for (const row of (data as any[]) ?? []) {
      const entry = counts.get(String(row.sale_id)) ?? { lines: 0, units: 0 };
      entry.lines += 1;
      entry.units += Number(row.quantity ?? 0);
      counts.set(String(row.sale_id), entry);
    }

    return sales.map((sale) => ({
      ...sale,
      line_count: counts.get(sale.id)?.lines ?? 0,
      units_sold: counts.get(sale.id)?.units ?? 0,
    }));
  }

  /**
   * Fetches a sale with line items, payments, and snapshot details.
   * Returns null only when the sale genuinely does not exist; transport, RLS and
   * query failures are raised so the UI can show an error state instead of an empty ticket.
   */
  async getSaleById(saleId: string): Promise<SaleWithDetails | null> {
    const { data: sale, error: saleError } = await this.supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .maybeSingle();

    if (saleError) {
      throw new Error(`Failed to fetch sale ${saleId}: ${saleError.message}`);
    }

    if (!sale) {
      return null;
    }

    const [itemsResult, paymentsResult] = await Promise.all([
      this.supabase.from('sale_items').select('*').eq('sale_id', saleId),
      this.supabase.from('payments').select('*').eq('sale_id', saleId),
    ]);

    if (itemsResult.error) {
      throw new Error(`Failed to fetch sale line items: ${itemsResult.error.message}`);
    }
    if (paymentsResult.error) {
      throw new Error(`Failed to fetch sale payments: ${paymentsResult.error.message}`);
    }

    const saleRecord = sale as Sale;

    return {
      ...saleRecord,
      items: (itemsResult.data ?? []) as any[],
      payments: (paymentsResult.data ?? []) as any[],
    };
  }
}
