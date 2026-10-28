import { Database } from '../supabase/supabase.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface ProductWithInventory extends Product {
  /** On-hand balance for the requested store. 0 when the branch has no stock row. */
  quantity_on_hand: number;
  /** Branch replenishment threshold; null when the product has no inventory record. */
  reorder_level: number | null;
  /** False when store_inventory has no row for this product/branch (untracked, not zero stock). */
  inventory_tracked: boolean;
  category_name?: string;
  category_code?: string;
}

/** Catalog page plus truncation flag so a large catalog is never silently clipped. */
export interface ProductCatalogResult {
  products: ProductWithInventory[];
  truncated: boolean;
}
