import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Category, CategoryInsert, CategoryUpdate } from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryRepository extends BaseRepository {
  /**
   * Fetches all categories ordered by name.
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return (data as Category[]) ?? [];
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
   * Deletes a category.
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
}
