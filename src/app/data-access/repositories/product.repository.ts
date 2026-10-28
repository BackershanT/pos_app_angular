import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { assertUuid } from '../../shared/utils/uuid.util';
import {
  Product,
  ProductCatalogResult,
  ProductInsert,
  ProductUpdate,
  ProductWithInventory,
} from '../models/product.model';

/** Catalog page ceiling: covers a small-retail branch without over-fetching. */
const DEFAULT_CATALOG_PAGE = 500;

/** Stable slug used to match catalog products against POS category tabs. */
function slugifyCategory(description: string | null | undefined, name: string | null | undefined): string {
  const raw = (description || name || '').trim().toLowerCase();
  if (!raw) return 'general';
  return raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
}

@Injectable({
  providedIn: 'root',
})
export class ProductRepository extends BaseRepository {
  /**
   * Fetches all products for a store or business catalog.
   */
  async getProducts(limit = 100): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data as Product[]) ?? [];
  }

  /**
   * Fetches the branch catalog with on-hand stock resolved for ONE store.
   *
   * Inventory is queried explicitly by store_id instead of relying on an embedded
   * `store_inventory[0]`: a multi-store product returns one row per branch and the
   * first element of that array belongs to an arbitrary branch.
   * Products without an inventory row are reported as untracked (never as stock of 25).
   */
  async getProductsWithInventory(
    storeId: string,
    options: { limit?: number; includeInactive?: boolean } = {},
  ): Promise<ProductCatalogResult> {
    assertUuid(storeId, 'Store id');
    const limit = Math.max(1, options.limit ?? DEFAULT_CATALOG_PAGE);

    let productsQuery = this.supabase
      .from('products')
      .select('*, categories(id, name, description)')
      .order('name', { ascending: true })
      // One extra row is fetched purely to detect a truncated catalog.
      .range(0, limit);

    if (!options.includeInactive) {
      productsQuery = productsQuery.eq('is_active', true);
    }

    const [productsResult, inventoryResult] = await Promise.all([
      productsQuery,
      this.supabase
        .from('store_inventory')
        .select('product_id, quantity_on_hand, reorder_level')
        .eq('store_id', storeId),
    ]);

    if (productsResult.error) {
      throw new Error(`Failed to fetch products: ${productsResult.error.message}`);
    }
    if (inventoryResult.error) {
      throw new Error(`Failed to fetch branch inventory levels: ${inventoryResult.error.message}`);
    }

    const rows = (productsResult.data as any[]) ?? [];
    const truncated = rows.length > limit;
    const page = truncated ? rows.slice(0, limit) : rows;

    const inventoryByProduct = new Map<string, { quantity: number; reorder: number | null }>();
    for (const row of (inventoryResult.data as any[]) ?? []) {
      inventoryByProduct.set(String(row.product_id), {
        quantity: Number(row.quantity_on_hand ?? 0),
        reorder: row.reorder_level == null ? null : Number(row.reorder_level),
      });
    }

    const products: ProductWithInventory[] = page.map((p: any) => {
      const inv = inventoryByProduct.get(String(p.id));
      const cat = p.categories;
      return {
        ...p,
        category_name: cat?.name || 'Uncategorized',
        category_code: slugifyCategory(cat?.description, cat?.name),
        quantity_on_hand: inv?.quantity ?? 0,
        reorder_level: inv?.reorder ?? null,
        inventory_tracked: Boolean(inv),
      };
    });

    return { products, truncated };
  }

  /**
   * Look up a product by exact barcode (for USB/Bluetooth scanner input).
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to lookup barcode ${barcode}: ${error.message}`);
    }

    return data as Product | null;
  }

  /**
   * Look up a product by ID.
   */
  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get product ${id}: ${error.message}`);
    }

    return data as Product | null;
  }

  /**
   * Creates a new product in the catalog.
   */
  async createProduct(product: ProductInsert): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .insert(product as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Updates an existing product.
   */
  async updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product ${id}: ${error.message}`);
    }

    return data as Product;
  }

  /**
   * Soft-deletes or archives a product.
   */
  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('products')
      .update({ is_active: false } as any)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to archive product ${id}: ${error.message}`);
    }

    return true;
  }
}
