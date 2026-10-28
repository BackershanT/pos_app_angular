import { Database } from '../supabase/supabase.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface ProductWithInventory extends Product {
  quantity_on_hand?: number;
  reorder_level?: number;
  category_name?: string;
  category_code?: string;
}
