import { Database } from '../supabase/supabase.types';

export type Sale = Database['public']['Tables']['sales']['Row'];
export type SaleInsert = Database['public']['Tables']['sales']['Insert'];
export type SaleUpdate = Database['public']['Tables']['sales']['Update'];

export type SaleItem = Database['public']['Tables']['sale_items']['Row'];
export type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'store_credit' | 'other';

export type Refund = Database['public']['Tables']['refunds']['Row'];
export type RefundInsert = Database['public']['Tables']['refunds']['Insert'];

export interface SaleWithDetails extends Sale {
  items: SaleItem[];
  payments: Payment[];
  customer_name?: string;
  cashier_name?: string;
}

export interface CompleteSaleItemInput {
  product_id: string;
  quantity: number;
  discount_amount?: number;
}

export interface CompleteSalePaymentInput {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface CompleteSaleRequest {
  store_id: string;
  items: CompleteSaleItemInput[];
  payments: CompleteSalePaymentInput[];
  customer_id?: string | null;
  idempotency_key?: string | null;
  notes?: string | null;
}

export interface CompleteSaleResponse {
  sale_id: string;
  invoice_number: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_total: number;
  change_amount: number;
  status: string;
  is_idempotent_replay: boolean;
}

export interface RefundItemInput {
  sale_item_id: string;
  quantity: number;
  restock?: boolean;
}

export interface ProcessRefundRequest {
  sale_id: string;
  items_to_refund: RefundItemInput[];
  refund_amount: number;
  reason: string;
  notes?: string | null;
}
