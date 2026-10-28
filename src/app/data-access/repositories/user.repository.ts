import { Injectable } from '@angular/core';
import { BaseRepository } from './base.repository';
import { Profile, ProfileInsert, ProfileUpdate } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserRepository extends BaseRepository {
  /**
   * Fetches all user/staff profiles.
   */
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    return (data as Profile[]) ?? [];
  }

  /**
   * Gets a profile by user ID.
   */
  async getProfileById(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get profile for ${userId}: ${error.message}`);
    }

    return data as Profile | null;
  }

  /**
   * Updates user profile information.
   */
  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile ${userId}: ${error.message}`);
    }

    return data as Profile;
  }
}
