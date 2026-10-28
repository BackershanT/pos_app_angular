import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Product, ProductInsert, ProductUpdate } from '../models/product.model';

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
