import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Business, BusinessInsert, BusinessUpdate } from '../models/business.model';

@Injectable({
  providedIn: 'root',
})
export class BusinessRepository extends BaseRepository {
  /**
   * Fetches the root business entity.
   */
  async getBusiness(): Promise<Business | null> {
    const { data, error } = await this.supabase
      .from('businesses')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch business details: ${error.message}`);
    }

    return data as Business | null;
  }

  /**
   * Updates business configuration (e.g., TRN, address, name).
   */
  async updateBusiness(id: string, updates: BusinessUpdate): Promise<Business> {
    const { data, error } = await this.supabase
      .from('businesses')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update business: ${error.message}`);
    }

    return data as Business;
  }
}
