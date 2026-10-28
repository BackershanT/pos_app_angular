import { Database } from '../supabase/supabase.types';

export type Store = Database['public']['Tables']['stores']['Row'];
export type StoreInsert = Database['public']['Tables']['stores']['Insert'];
export type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export type StoreStaff = Database['public']['Tables']['store_staff']['Row'];
export type StoreStaffInsert = Database['public']['Tables']['store_staff']['Insert'];
