import { Database } from '../supabase/supabase.types';

export type StoreInventory = Database['public']['Tables']['store_inventory']['Row'];
export type StoreInventoryInsert = Database['public']['Tables']['store_inventory']['Insert'];
export type StoreInventoryUpdate = Database['public']['Tables']['store_inventory']['Update'];

export type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
export type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert'];

export type StockMovementReason =
  | 'sale'
  | 'refund'
  | 'purchase'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'damage'
  | 'loss'
  | 'initial_count';
