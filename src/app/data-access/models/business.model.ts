import { Database } from '../supabase/supabase.types';

export type Business = Database['public']['Tables']['businesses']['Row'];
export type BusinessInsert = Database['public']['Tables']['businesses']['Insert'];
export type BusinessUpdate = Database['public']['Tables']['businesses']['Update'];

export type Role = Database['public']['Tables']['roles']['Row'];
export type RoleInsert = Database['public']['Tables']['roles']['Insert'];

export type BusinessMember = Database['public']['Tables']['business_members']['Row'];
export type BusinessMemberStatus = 'active' | 'invited' | 'suspended';
