import { Database } from '../supabase/supabase.types';

export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];

export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row'];
export type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];
