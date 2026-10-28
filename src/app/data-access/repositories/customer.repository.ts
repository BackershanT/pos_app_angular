import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Customer, CustomerInsert, CustomerUpdate } from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerRepository extends BaseRepository {
  /**
   * Fetches all customers for the CRM directory.
   */
  async getCustomers(limit = 100): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    return (data as Customer[]) ?? [];
  }

  /**
   * Finds customer by phone or TRN.
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find customer by phone: ${error.message}`);
    }

    return data as Customer | null;
  }

  /**
   * Creates a new customer record.
   */
  async createCustomer(customer: CustomerInsert): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert(customer as any)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data as Customer;
  }

  /**
   * Updates an existing customer profile.
   */
  async updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer ${id}: ${error.message}`);
    }

    return data as Customer;
  }
}
