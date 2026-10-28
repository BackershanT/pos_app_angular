export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          currency: string;
          tax_registration_number: string | null;
          logo_url: string | null;
          phone: string | null;
          email: string | null;
          address: Json | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          tax_registration_number?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          currency?: string;
          tax_registration_number?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: Json | null;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          permissions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          permissions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          permissions?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role_id: string | null;
          status: 'active' | 'invited' | 'suspended';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role_id?: string | null;
          status?: 'active' | 'invited' | 'suspended';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role_id?: string | null;
          status?: 'active' | 'invited' | 'suspended';
          updated_at?: string;
        };
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          invoice_prefix: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          invoice_prefix?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string | null;
          phone?: string | null;
          invoice_prefix?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_staff: {
        Row: {
          id: string;
          business_id: string;
          store_id: string;
          user_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id: string;
          user_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          is_primary?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          sku: string;
          barcode: string | null;
          name: string;
          description: string | null;
          unit: string;
          cost_price: number;
          selling_price: number;
          tax_rate: number;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          sku: string;
          barcode?: string | null;
          name: string;
          description?: string | null;
          unit?: string;
          cost_price?: number;
          selling_price: number;
          tax_rate?: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          sku?: string;
          barcode?: string | null;
          name?: string;
          description?: string | null;
          unit?: string;
          cost_price?: number;
          selling_price?: number;
          tax_rate?: number;
          image_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_inventory: {
        Row: {
          id: string;
          business_id: string;
          store_id: string;
          product_id: string;
          quantity_on_hand: number;
          reorder_level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id: string;
          product_id: string;
          quantity_on_hand?: number;
          reorder_level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantity_on_hand?: number;
          reorder_level?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          store_id: string;
          product_id: string;
          quantity_delta: number;
          balance_after: number;
          reason:
            | 'sale'
            | 'refund'
            | 'purchase'
            | 'adjustment'
            | 'transfer_in'
            | 'transfer_out'
            | 'damage'
            | 'loss'
            | 'initial_count';
          reference_id: string | null;
          performed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id: string;
          product_id: string;
          quantity_delta: number;
          balance_after: number;
          reason:
            | 'sale'
            | 'refund'
            | 'purchase'
            | 'adjustment'
            | 'transfer_in'
            | 'transfer_out'
            | 'damage'
            | 'loss'
            | 'initial_count';
          reference_id?: string | null;
          performed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          store_id?: string;
          product_id?: string;
          quantity_delta?: number;
          balance_after?: number;
          reason?:
            | 'sale'
            | 'refund'
            | 'purchase'
            | 'adjustment'
            | 'transfer_in'
            | 'transfer_out'
            | 'damage'
            | 'loss'
            | 'initial_count';
          reference_id?: string | null;
          performed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          tax_id: string | null;
          loyalty_points: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          tax_id?: string | null;
          loyalty_points?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          tax_id?: string | null;
          loyalty_points?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact_details: Json;
          tax_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          contact_details?: Json;
          tax_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          contact_details?: Json;
          tax_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          store_id: string;
          customer_id: string | null;
          cashier_id: string | null;
          invoice_number: string;
          idempotency_key: string | null;
          status: 'draft' | 'completed' | 'partially_refunded' | 'refunded' | 'cancelled';
          subtotal: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          paid_total: number;
          change_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id: string;
          customer_id?: string | null;
          cashier_id?: string | null;
          invoice_number: string;
          idempotency_key?: string | null;
          status?: 'draft' | 'completed' | 'partially_refunded' | 'refunded' | 'cancelled';
          subtotal: number;
          discount_total?: number;
          tax_total?: number;
          grand_total: number;
          paid_total?: number;
          change_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'draft' | 'completed' | 'partially_refunded' | 'refunded' | 'cancelled';
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          product_id: string | null;
          product_name: string;
          sku: string;
          unit_cost: number;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          tax_amount: number;
          discount_amount: number;
          subtotal: number;
          total: number;
          quantity_refunded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id: string;
          product_id?: string | null;
          product_name: string;
          sku: string;
          unit_cost?: number;
          quantity: number;
          unit_price: number;
          tax_rate?: number;
          tax_amount?: number;
          discount_amount?: number;
          subtotal: number;
          total: number;
          quantity_refunded?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          sale_id?: string;
          product_id?: string | null;
          product_name?: string;
          sku?: string;
          unit_cost?: number;
          quantity?: number;
          unit_price?: number;
          tax_rate?: number;
          tax_amount?: number;
          discount_amount?: number;
          subtotal?: number;
          total?: number;
          quantity_refunded?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'store_credit' | 'other';
          amount: number;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id: string;
          method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'store_credit' | 'other';
          amount: number;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          reference?: string | null;
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          reference?: string | null;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          business_id: string;
          sale_id: string;
          amount: number;
          reason: string;
          status: 'pending' | 'completed' | 'rejected';
          refunded_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sale_id: string;
          amount: number;
          reason: string;
          status?: 'pending' | 'completed' | 'rejected';
          refunded_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'completed' | 'rejected';
          notes?: string | null;
        };
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          business_id: string;
          store_id: string;
          supplier_id: string;
          order_number: string;
          status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
          total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id: string;
          supplier_id: string;
          order_number: string;
          status?: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
          total?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
          total?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          quantity_received: number;
          unit_cost: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          purchase_order_id: string;
          product_id: string;
          quantity: number;
          quantity_received?: number;
          unit_cost: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          quantity_received?: number;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          store_id: string | null;
          amount: number;
          category: string;
          description: string | null;
          payment_method: string;
          recorded_by: string | null;
          expense_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          store_id?: string | null;
          amount: number;
          category: string;
          description?: string | null;
          payment_method?: string;
          recorded_by?: string | null;
          expense_date?: string;
          created_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          description?: string | null;
          payment_method?: string;
          expense_date?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          details?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_sale: {
        Args: {
          p_store_id: string;
          p_items: Json;
          p_payments: Json;
          p_customer_id: string | null;
          p_idempotency_key: string | null;
          p_notes: string | null;
        };
        Returns: {
          sale_id: string;
          invoice_number: string;
          subtotal: number;
          discount_total: number;
          tax_total: number;
          grand_total: number;
          paid_total: number;
          change_amount: number;
          status: string;
          is_idempotent_replay: boolean;
        };
      };
      process_sale_refund: {
        Args: {
          p_sale_id: string;
          p_items_to_refund: Json;
          p_refund_amount: number;
          p_reason: string;
          p_notes: string | null;
        };
        Returns: {
          refund_id: string;
          sale_id: string;
          amount: number;
          new_status: string;
        };
      };
      generate_invoice_number: {
        Args: {
          target_store_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
