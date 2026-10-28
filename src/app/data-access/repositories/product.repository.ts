import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Product, ProductInsert, ProductUpdate, ProductWithInventory } from '../models/product.model';

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
   * Fetches products with joined category and store inventory for POS registers.
   */
  async getProductsWithInventory(limit = 100): Promise<ProductWithInventory[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*, categories(id, name, description), store_inventory(quantity_on_hand, reorder_level)')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch products with inventory: ${error.message}`);
    }

    return ((data as any[]) ?? []).map((p: any) => {
      const inv = Array.isArray(p.store_inventory) ? p.store_inventory[0] : p.store_inventory;
      const cat = p.categories;
      return {
        ...p,
        category_name: cat?.name || 'General',
        category_code: cat?.description || cat?.name?.toLowerCase() || 'general',
        quantity_on_hand: inv?.quantity_on_hand != null ? Number(inv.quantity_on_hand) : 25,
        reorder_level: inv?.reorder_level != null ? Number(inv.reorder_level) : 10,
      };
    });
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
