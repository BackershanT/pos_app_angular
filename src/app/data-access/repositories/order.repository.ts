import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import {
  CompleteSaleRequest,
  CompleteSaleResponse,
  ProcessRefundRequest,
  Sale,
  SaleWithDetails,
} from '../models/order.model';

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
   * Fetches sales for a given store with pagination.
   */
  async getSalesByStore(storeId: string, limit = 50): Promise<Sale[]> {
    const { data, error } = await this.supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch sales: ${error.message}`);
    }

    return (data as Sale[]) ?? [];
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
