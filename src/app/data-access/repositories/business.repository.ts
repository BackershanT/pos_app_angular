import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Business, BusinessInsert, BusinessUpdate } from '../models/business.model';

/** Resolved tenant identity for a signed-in user (drives the session context). */
export interface TenantMembership {
  businessId: string;
  businessName: string;
  currency: string | null;
  taxRegistrationNumber: string | null;
  roleName: string;
  permissions: string[];
}

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
   * Resolves the active business, role name and permission list for a user.
   * Returns null when the account has no active membership (RLS would deny data anyway).
   */
  async getMembershipForUser(userId: string): Promise<TenantMembership | null> {
    const { data: member, error: memberError } = await this.supabase
      .from('business_members')
      .select('business_id, role_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (memberError) {
      throw new Error(`Failed to resolve tenant membership: ${memberError.message}`);
    }

    if (!member) {
      return null;
    }

    const [businessResult, roleResult] = await Promise.all([
      this.supabase
        .from('businesses')
        .select('id, name, currency, tax_registration_number')
        .eq('id', member.business_id)
        .maybeSingle(),
      this.supabase
        .from('roles')
        .select('id, name, permissions')
        .eq('id', member.role_id)
        .maybeSingle(),
    ]);

    if (businessResult.error) {
      throw new Error(`Failed to resolve business details: ${businessResult.error.message}`);
    }
    if (roleResult.error) {
      throw new Error(`Failed to resolve role permissions: ${roleResult.error.message}`);
    }

    const business = businessResult.data as Record<string, any> | null;
    const role = roleResult.data as Record<string, any> | null;
    const rawPermissions = Array.isArray(role?.['permissions']) ? role!['permissions'] : [];

    return {
      businessId: member.business_id as string,
      businessName: (business?.['name'] as string) ?? 'Untitled Business',
      currency: (business?.['currency'] as string) ?? null,
      taxRegistrationNumber: (business?.['tax_registration_number'] as string) ?? null,
      roleName: (role?.['name'] as string) ?? 'Staff',
      permissions: rawPermissions.map((permission: unknown) => String(permission)),
    };
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
