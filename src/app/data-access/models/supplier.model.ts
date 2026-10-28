import { Database } from '../supabase/supabase.types';

export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];
