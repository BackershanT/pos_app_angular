import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Category, CategoryInsert, CategoryUpdate } from '../models/category.model';

/**
 * Ceiling for the product scan used to derive "linked products" counters.
 * Crossing it makes the reported counts partial, which the UI must disclose.
 */
const PRODUCT_SCAN_LIMIT = 2000;

/** A category plus the real number of catalog SKUs currently attached to it. */
export interface CategoryWithStats extends Category {
  /** Products referencing the category, including archived ones. */
  product_count: number;
  /** Subset that is sellable on the register right now. */
  active_product_count: number;
}

export interface CategoryStatsResult {
  categories: CategoryWithStats[];
  /** Products inspected while building the counters. */
  scannedProducts: number;
  /** True when more products exist than the scan ceiling allowed. */
  countsTruncated: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository extends BaseRepository {
  /**
   * Fetches categories ordered by name.
   *
   * `businessId` scopes the read to a single tenant; without it a multi-business
   * database would mix unrelated catalogs together, so callers must pass the
   * active context whenever they have one.
   */
  async getCategories(businessId?: string): Promise<Category[]> {
    let query = this.supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return (data as Category[]) ?? [];
  }

  /**
   * Categories with live catalog counters.
   *
   * The `categories` table has no product link of its own, so the count is
   * derived from the products side. Placeholder numbers would advertise a
   * catalog that does not exist, hence a real (bounded) scan.
   */
  async getCategoriesWithStats(
    businessId?: string,
  ): Promise<CategoryStatsResult> {
    const [categories, productRows] = await Promise.all([
      this.getCategories(businessId),
      this.scanProductsForCounts(businessId),
    ]);

    const totals = new Map<string, { all: number; active: number }>();
    for (const row of productRows.rows) {
      const categoryId = row.category_id;
      if (!categoryId) continue;
      const entry = totals.get(categoryId) ?? { all: 0, active: 0 };
      entry.all += 1;
      if (row.is_active) entry.active += 1;
      totals.set(categoryId, entry);
    }

    return {
      categories: categories.map((c) => ({
        ...c,
        product_count: totals.get(c.id)?.all ?? 0,
        active_product_count: totals.get(c.id)?.active ?? 0,
      })),
      scannedProducts: productRows.count,
      countsTruncated: productRows.truncated,
    };
  }

  /**
   * Creates a new category.
   */
  async createCategory(category: CategoryInsert): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(category as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data as Category;
  }

  /**
   * Updates an existing category.
   */
  async updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category ${id}: ${error.message}`);
    }

    return data as Category;
  }

  /**
   * Deletes a category. Products keep existing but lose their grouping
   * (`products.category_id ... on delete set null`), so the UI has to say so.
   */
  async deleteCategory(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category ${id}: ${error.message}`);
    }

    return true;
  }

  /** Lightweight id/category_id/is_active projection used for counters. */
  private async scanProductsForCounts(
    businessId?: string,
  ): Promise<{ rows: Array<{ category_id: string | null; is_active: boolean }>; count: number; truncated: boolean }> {
    let query = this.supabase
      .from('products')
      .select('category_id, is_active')
      .range(0, PRODUCT_SCAN_LIMIT);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch catalog products: ${error.message}`);
    }

    const rows = (data as Array<{ category_id: string | null; is_active: boolean }>) ?? [];
    const truncated = rows.length > PRODUCT_SCAN_LIMIT;

    return { rows: truncated ? rows.slice(0, PRODUCT_SCAN_LIMIT) : rows, count: rows.length, truncated };
  }
}
