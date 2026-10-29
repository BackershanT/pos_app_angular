import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Customer, CustomerInsert, CustomerUpdate } from '../models/customer.model';

/**
 * Ceiling for the sales scan behind the CRM columns. Purchase history is not a
 * stored aggregate, so it is computed from real tickets; past the ceiling the
 * figures are partial and the UI has to say so.
 */
const SALES_SCAN_LIMIT = 5000;

/** Sales columns safe to pull for aggregation (no line items, no payments). */
interface SalesAggregateRow {
  customer_id: string | null;
  grand_total: number;
  status: string;
  created_at: string;
}

/** Ticket states that count towards a customer's purchase history. */
const RECOGNISED_ORDER_STATES = new Set(['completed', 'partially_refunded']);

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_spent: number;
  /** Most recent recognised ticket, or null when there is no history. */
  last_visit: string | null;
}

export interface CustomerDirectoryResult {
  customers: CustomerWithStats[];
  /** Sales rows inspected while building the history columns. */
  scannedSales: number;
  /** True when more sales exist than the scan covered. */
  statsTruncated: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerRepository extends BaseRepository {
  /**
   * Fetches the CRM directory. `businessId` scopes the read to one tenant.
   */
  async getCustomers(businessId?: string, limit = 100): Promise<Customer[]> {
    let query = this.supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
      .limit(Math.max(1, limit));

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    return (data as Customer[]) ?? [];
  }

  /**
   * Directory plus honest purchase history derived from the sales table.
   *
   * Zero history must render as zero, never as a welcome bonus or a placeholder
   * lifetime spend.
   */
  async getCustomersWithStats(businessId?: string, limit = 200): Promise<CustomerDirectoryResult> {
    const [customers, historyScan] = await Promise.all([
      this.getCustomers(businessId, limit),
      this.scanSalesForHistory(businessId),
    ]);

    const history = new Map<string, { orders: number; spent: number; last: string | null }>();
    for (const sale of historyScan.rows) {
      const customerId = sale.customer_id;
      if (!customerId) continue;
      if (!RECOGNISED_ORDER_STATES.has(String(sale.status ?? '').toLowerCase())) continue;

      const entry = history.get(customerId) ?? { orders: 0, spent: 0, last: null };
      entry.orders += 1;
      entry.spent += Number(sale.grand_total ?? 0);
      if (!entry.last || new Date(sale.created_at).getTime() > new Date(entry.last).getTime()) {
        entry.last = sale.created_at;
      }
      history.set(customerId, entry);
    }

    return {
      customers: customers.map((c) => ({
        ...c,
        total_orders: history.get(c.id)?.orders ?? 0,
        total_spent: Number((history.get(c.id)?.spent ?? 0).toFixed(2)),
        last_visit: history.get(c.id)?.last ?? null,
      })),
      scannedSales: historyScan.rows.length,
      statsTruncated: historyScan.truncated,
    };
  }

  /**
   * Finds customer by phone or TRN.
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find customer by phone: ${error.message}`);
    }

    return data as Customer | null;
  }

  /**
   * Creates a new customer record.
   */
  async createCustomer(customer: CustomerInsert): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert(customer as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data as Customer;
  }

  /**
   * Updates an existing customer profile.
   */
  async updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer ${id}: ${error.message}`);
    }

    return data as Customer;
  }

  /** Bounded, most-recent-first projection of the tickets used for history. */
  private async scanSalesForHistory(
    businessId?: string,
  ): Promise<{ rows: SalesAggregateRow[]; truncated: boolean }> {
    let query = this.supabase
      .from('sales')
      .select('customer_id, grand_total, status, created_at')
      .order('created_at', { ascending: false })
      .range(0, SALES_SCAN_LIMIT);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch purchase history: ${error.message}`);
    }

    const rows = (data as SalesAggregateRow[]) ?? [];
    const truncated = rows.length > SALES_SCAN_LIMIT;

    return { rows: truncated ? rows.slice(0, SALES_SCAN_LIMIT) : rows, truncated };
  }
}
