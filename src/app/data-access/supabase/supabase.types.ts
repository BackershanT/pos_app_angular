export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          business_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          role_id: string
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          role_id: string
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          role_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_role_id_fkey"
            columns: ["business_id", "role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: Json
          created_at: string
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json
          tax_registration_number: string | null
          updated_at: string
        }
        Insert: {
          address?: Json
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json
          tax_registration_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json
          tax_registration_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string
          store_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method: string
          store_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          method: string
          reference: string | null
          sale_id: string
          status: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          method: string
          reference?: string | null
          sale_id: string
          status?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: string
          reference?: string | null
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_sale_id_fkey"
            columns: ["business_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          business_id: string
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          selling_price: number
          sku: string
          tax_rate: number
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          business_id: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          selling_price?: number
          sku: string
          tax_rate?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          business_id?: string
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          selling_price?: number
          sku?: string
          tax_rate?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_category_id_fkey"
            columns: ["business_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          business_id: string
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          quantity_received: number
          subtotal: number
          unit_cost: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          quantity_received?: number
          subtotal: number
          unit_cost: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number
          subtotal?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_business_id_product_id_fkey"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "purchase_order_items_business_id_purchase_order_id_fkey"
            columns: ["business_id", "purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          expected_at: string | null
          id: string
          order_number: string
          ordered_at: string | null
          received_at: string | null
          status: string
          store_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          order_number: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          store_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          order_number?: string
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          store_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_supplier_id_fkey"
            columns: ["business_id", "supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          sale_id: string
          status: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          sale_id: string
          status?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_sale_id_fkey"
            columns: ["business_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      roles: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          permissions?: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          business_id: string
          created_at: string
          discount_amount: number
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quantity_refunded: number
          sale_id: string
          sku: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          discount_amount?: number
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          quantity_refunded?: number
          sale_id: string
          sku?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          business_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quantity_refunded?: number
          sale_id?: string
          sku?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_business_id_product_id_fkey"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "sale_items_business_id_sale_id_fkey"
            columns: ["business_id", "sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string
          change_amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_total: number
          grand_total: number
          id: string
          idempotency_key: string
          invoice_number: string
          notes: string | null
          paid_total: number
          status: string
          store_id: string
          subtotal: number
          tax_total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          idempotency_key: string
          invoice_number: string
          notes?: string | null
          paid_total?: number
          status?: string
          store_id: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          change_amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          idempotency_key?: string
          invoice_number?: string
          notes?: string | null
          paid_total?: number
          status?: string
          store_id?: string
          subtotal?: number
          tax_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_customer_id_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_after: number
          business_id: string
          created_at: string
          id: string
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity_delta: number
          reason: string
          reference_id: string | null
          store_id: string
        }
        Insert: {
          balance_after: number
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity_delta: number
          reason: string
          reference_id?: string | null
          store_id: string
        }
        Update: {
          balance_after?: number
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string
          reference_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_product_id_fkey"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "stock_movements_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          business_id: string
          created_at: string
          id: string
          product_id: string
          quantity_on_hand: number
          reorder_level: number
          store_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity_on_hand?: number
          reorder_level?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity_on_hand?: number
          reorder_level?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_business_id_product_id_fkey"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "store_inventory_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      store_staff: {
        Row: {
          business_id: string
          created_at: string
          is_primary: boolean
          store_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          is_primary?: boolean
          store_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          is_primary?: boolean
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_staff_business_id_store_id_fkey"
            columns: ["business_id", "store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "store_staff_business_id_user_id_fkey"
            columns: ["business_id", "user_id"]
            isOneToOne: false
            referencedRelation: "business_members"
            referencedColumns: ["business_id", "user_id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          invoice_prefix: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          invoice_prefix?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invoice_prefix?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_id: string
          contact_details: Json
          created_at: string
          id: string
          name: string
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_details?: Json
          created_at?: string
          id?: string
          name: string
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_details?: Json
          created_at?: string
          id?: string
          name?: string
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_sale: {
        Args: {
          p_store_id: string
          p_items: Json
          p_payments: Json
          p_customer_id?: string | null
          p_idempotency_key?: string | null
          p_notes?: string | null
        }
        Returns: Json
      }
      generate_invoice_number: {
        Args: {
          target_store_id: string
        }
        Returns: string
      }
      record_stock_adjustment: {
        Args: {
          p_store_id: string
          p_product_id: string
          p_new_quantity: number
          p_reason: string
          p_notes?: string | null
        }
        Returns: Json
      }
      process_sale_refund: {
        Args: {
          p_sale_id: string
          p_items_to_refund: Json
          p_refund_amount: number
          p_reason: string
          p_notes?: string | null
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
