import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Supplier, SupplierInsert, SupplierUpdate } from '../models/supplier.model';

@Injectable({
  providedIn: 'root',
})
export class SupplierRepository extends BaseRepository {
  /**
   * Fetches all registered suppliers.
   */
  async getSuppliers(limit = 100): Promise<Supplier[]> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    return (data as Supplier[]) ?? [];
  }

  /**
   * Creates a new supplier record.
   */
  async createSupplier(supplier: SupplierInsert): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .insert(supplier as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data as Supplier;
  }

  /**
   * Updates an existing supplier.
   */
  async updateSupplier(id: string, updates: SupplierUpdate): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('suppliers')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update supplier ${id}: ${error.message}`);
    }

    return data as Supplier;
  }
}
