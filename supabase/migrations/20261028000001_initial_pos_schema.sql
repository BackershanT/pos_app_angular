-- ============================================================================
-- Supabase PostgreSQL POS Schema Migration
-- Multi-tenant, Multi-store, Auditable Stock & Reliable Payments
-- Includes: complete_sale & process_sale_refund Transactional Procedures
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Helper Functions & Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check active business membership
CREATE OR REPLACE FUNCTION user_belongs_to_business(target_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = target_business_id
          AND bm.user_id = auth.uid()
          AND bm.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check business admin/owner role
CREATE OR REPLACE FUNCTION user_is_business_admin(target_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members bm
        JOIN public.roles r ON r.id = bm.role_id
        WHERE bm.business_id = target_business_id
          AND bm.user_id = auth.uid()
          AND bm.status = 'active'
          AND (r.name ILIKE '%admin%' OR r.name ILIKE '%owner%')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. Core Identity & Tenancy Tables
-- ============================================================================

-- Profiles: Linked 1:1 to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on Supabase auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Businesses (Tenants)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    tax_registration_number TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{"allow_negative_stock": false, "tax_inclusive": false, "loyalty_points_per_dollar": 1}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Roles per Business
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_roles_business_name UNIQUE (business_id, name)
);

CREATE TRIGGER set_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business Members
CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_members UNIQUE (business_id, user_id)
);

CREATE TRIGGER set_business_members_updated_at
BEFORE UPDATE ON public.business_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stores (Physical branches / outlets)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stores_business_name UNIQUE (business_id, name)
);

CREATE TRIGGER set_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Store Staff Assignments (Branch Access Control)
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_staff_assignment UNIQUE (store_id, user_id)
);

-- Check if user has access to a specific branch/store
CREATE OR REPLACE FUNCTION user_has_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_business_id UUID;
BEGIN
    SELECT business_id INTO v_business_id FROM public.stores WHERE id = target_store_id;
    IF v_business_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Admins/owners have access to all stores in their business
    IF user_is_business_admin(v_business_id) THEN
        RETURN TRUE;
    END IF;

    -- Otherwise check specific store assignment
    RETURN EXISTS (
        SELECT 1 FROM public.store_staff ss
        WHERE ss.store_id = target_store_id
          AND ss.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. Catalog & Inventory Tables
-- ============================================================================

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categories_business_name UNIQUE (business_id, name)
);

CREATE TRIGGER set_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name TEXT NOT NULL,
    description TEXT,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000, -- e.g. 0.0500 = 5%
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(business_id, category_id);

CREATE TRIGGER set_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Store Inventory (Cached balance per store for fast lookups)
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_level NUMERIC(12, 3) NOT NULL DEFAULT 10.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_product UNIQUE (store_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_store_inventory_lookup ON public.store_inventory(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_low_stock ON public.store_inventory(store_id, quantity_on_hand, reorder_level);

CREATE TRIGGER set_store_inventory_updated_at
BEFORE UPDATE ON public.store_inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stock Movements (Auditable immutable inventory ledger)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_delta NUMERIC(12, 3) NOT NULL,
    balance_after NUMERIC(12, 3) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (
        reason IN ('sale', 'refund', 'purchase', 'adjustment', 'transfer_in', 'transfer_out', 'damage', 'loss', 'initial_count')
    ),
    reference_id UUID,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_store_product ON public.stock_movements(store_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements(reference_id);

-- ============================================================================
-- 4. CRM & Supply Chain
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_id VARCHAR(50),
    loyalty_points NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(business_id, email);

CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    tax_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_suppliers_business_name UNIQUE (business_id, name)
);

CREATE TRIGGER set_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Sales, Line Items, Payments & Refunds
-- ============================================================================

-- Sales (Protected from arbitrary deletion and invalid status transitions)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100), -- Prevents duplicate sales on cashier retry/timeout
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (
        status IN ('draft', 'completed', 'partially_refunded', 'refunded', 'cancelled')
    ),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sales_store_invoice UNIQUE (store_id, invoice_number),
    CONSTRAINT uq_sales_idempotency UNIQUE (business_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sales_business_date ON public.sales(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON public.sales(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);

CREATE TRIGGER set_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enforce explicit status transitions on sales
CREATE OR REPLACE FUNCTION enforce_sale_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status IN ('completed', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'completed' AND NEW.status IN ('partially_refunded', 'refunded') THEN
        RETURN NEW;
    ELSIF OLD.status = 'partially_refunded' AND NEW.status = 'refunded' THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Disallowed sale status transition from % to %', OLD.status, NEW.status;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_sale_status_transition
BEFORE UPDATE OF status ON public.sales
FOR EACH ROW EXECUTE FUNCTION enforce_sale_status_transition();

-- Prevent deletion of completed/refunded sales (Must use reversals/refunds)
CREATE OR REPLACE FUNCTION prevent_sale_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('completed', 'partially_refunded', 'refunded') THEN
        RAISE EXCEPTION 'Completed or refunded sales cannot be deleted to correct mistakes. Use refunds or reversals.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_sales_against_deletion
BEFORE DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION prevent_sale_deletion();

-- Sale Items: Snapshot line items
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    sku VARCHAR(100) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    quantity_refunded NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- Payments (Separate table supporting split payments)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL CHECK (
        method IN ('cash', 'card', 'upi', 'bank_transfer', 'store_credit', 'other')
    ),
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);

-- Refunds (Immutable record of financial returns & restock movements)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (
        status IN ('pending', 'completed', 'rejected')
    ),
    refunded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_sale_id ON public.refunds(sale_id);

-- ============================================================================
-- 6. Purchases & Expenses
-- ============================================================================

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    order_number VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')
    ),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_po_business_number UNIQUE (business_id, order_number)
);

CREATE TRIGGER set_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL,
    quantity_received NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    unit_cost NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_order_id ON public.purchase_order_items(purchase_order_id);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_business_store ON public.expenses(business_id, store_id, expense_date);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON public.audit_logs(business_id, created_at DESC);

-- ============================================================================
-- 7. Transactional Backend Procedures (complete_sale & process_sale_refund)
-- ============================================================================

-- Invoice number generator
CREATE OR REPLACE FUNCTION generate_invoice_number(target_store_id UUID)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq_val BIGINT;
    today_str TEXT;
BEGIN
    SELECT invoice_prefix INTO prefix FROM public.stores WHERE id = target_store_id;
    IF prefix IS NULL THEN prefix := 'INV'; END IF;

    today_str := TO_CHAR(NOW(), 'YYYYMMDD');

    SELECT COUNT(*) + 1 INTO seq_val
    FROM public.sales
    WHERE store_id = target_store_id
      AND DATE(created_at) = CURRENT_DATE;

    RETURN prefix || '-' || today_str || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- complete_sale: Authoritative atomic checkout procedure
-- - Validates staff store access
-- - Idempotency check to prevent duplicate sales on network retry
-- - Validates prices, taxes, and products from database (never trusts frontend)
-- - Locks store inventory rows FOR UPDATE to avoid race conditions
-- - Enforces stock limits (unless allow_negative_stock is set)
-- - Writes sale, items, split payments, decrements stock, appends ledger
-- - All operations succeed or fail together
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_sale(
    p_store_id UUID,
    p_items JSONB,       -- Array of [{ product_id: UUID, quantity: NUMERIC, discount_amount?: NUMERIC }]
    p_payments JSONB,    -- Array of [{ method: TEXT, amount: NUMERIC, reference?: TEXT }]
    p_customer_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_business_id UUID;
    v_sale_id UUID;
    v_existing_sale RECORD;
    v_invoice_num TEXT;
    v_subtotal NUMERIC(12, 2) := 0.00;
    v_discount_total NUMERIC(12, 2) := 0.00;
    v_tax_total NUMERIC(12, 2) := 0.00;
    v_grand_total NUMERIC(12, 2) := 0.00;
    v_paid_total NUMERIC(12, 2) := 0.00;
    v_change_amount NUMERIC(12, 2) := 0.00;
    v_allow_negative BOOLEAN := false;
    v_product RECORD;
    v_item JSONB;
    v_pmt JSONB;
    v_qty NUMERIC(12, 3);
    v_discount NUMERIC(12, 2);
    v_item_subtotal NUMERIC(12, 2);
    v_item_tax NUMERIC(12, 2);
    v_item_total NUMERIC(12, 2);
    v_curr_inventory RECORD;
    v_new_balance NUMERIC(12, 3);
BEGIN
    -- 1. Ensure user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    -- 2. Verify store exists and derive business_id
    SELECT business_id INTO v_business_id
    FROM public.stores
    WHERE id = p_store_id AND is_active = true;

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Store not found or inactive';
    END IF;

    -- 3. Verify store access
    IF NOT user_has_store_access(p_store_id) THEN
        RAISE EXCEPTION 'Unauthorized: User does not have access to this store/branch';
    END IF;

    -- 4. Idempotency Check (Prevent duplicate sales on network retries)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, invoice_number, grand_total, status
        INTO v_existing_sale
        FROM public.sales
        WHERE business_id = v_business_id AND idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'sale_id', v_existing_sale.id,
                'invoice_number', v_existing_sale.invoice_number,
                'grand_total', v_existing_sale.grand_total,
                'status', v_existing_sale.status,
                'is_idempotent_replay', true
            );
        END IF;
    END IF;

    -- 5. Check business negative stock setting
    SELECT COALESCE((settings->>'allow_negative_stock')::BOOLEAN, false)
    INTO v_allow_negative
    FROM public.businesses
    WHERE id = v_business_id;

    -- 6. Validate items array is not empty
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot complete sale: Cart is empty';
    END IF;

    -- 7. Validate payments total
    FOR v_pmt IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
        v_paid_total := v_paid_total + (v_pmt->>'amount')::NUMERIC;
    END LOOP;

    -- 8. Compute server-side authoritative totals from database prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'quantity')::NUMERIC;
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid quantity % for item', v_qty;
        END IF;

        v_discount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0.00);

        -- Fetch authoritative price and tax from database
        SELECT id, name, sku, cost_price, selling_price, tax_rate, is_active
        INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID AND business_id = v_business_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % does not belong to this business or does not exist', (v_item->>'product_id');
        END IF;

        IF NOT v_product.is_active THEN
            RAISE EXCEPTION 'Product "%" is marked inactive and cannot be sold', v_product.name;
        END IF;

        v_item_subtotal := ROUND(v_qty * v_product.selling_price, 2);
        IF v_discount > v_item_subtotal THEN
            v_discount := v_item_subtotal; -- Cap discount at line item subtotal
        END IF;

        v_item_tax := ROUND((v_item_subtotal - v_discount) * v_product.tax_rate, 2);

        v_subtotal := v_subtotal + v_item_subtotal;
        v_discount_total := v_discount_total + v_discount;
        v_tax_total := v_tax_total + v_item_tax;
    END LOOP;

    v_grand_total := v_subtotal - v_discount_total + v_tax_total;

    IF v_paid_total < v_grand_total THEN
        RAISE EXCEPTION 'Insufficient payment: Total paid (%) is less than grand total (%)', v_paid_total, v_grand_total;
    END IF;

    v_change_amount := v_paid_total - v_grand_total;

    -- 9. Generate sequential invoice number
    v_invoice_num := generate_invoice_number(p_store_id);

    -- 10. Insert Sale Header
    INSERT INTO public.sales (
        business_id, store_id, customer_id, cashier_id,
        invoice_number, idempotency_key, status,
        subtotal, discount_total, tax_total, grand_total,
        paid_total, change_amount, notes
    ) VALUES (
        v_business_id, p_store_id, p_customer_id, auth.uid(),
        v_invoice_num, p_idempotency_key, 'completed',
        v_subtotal, v_discount_total, v_tax_total, v_grand_total,
        v_paid_total, v_change_amount, p_notes
    )
    RETURNING id INTO v_sale_id;

    -- 11. Lock Inventory Rows, Insert Sale Items Snapshot, and Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := (v_item->>'quantity')::NUMERIC;
        v_discount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0.00);

        SELECT id, name, sku, cost_price, selling_price, tax_rate
        INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id')::UUID;

        v_item_subtotal := ROUND(v_qty * v_product.selling_price, 2);
        IF v_discount > v_item_subtotal THEN v_discount := v_item_subtotal; END IF;
        v_item_tax := ROUND((v_item_subtotal - v_discount) * v_product.tax_rate, 2);
        v_item_total := v_item_subtotal - v_discount + v_item_tax;

        -- Line item snapshot
        INSERT INTO public.sale_items (
            business_id, sale_id, product_id, product_name,
            sku, unit_cost, quantity, unit_price,
            tax_rate, tax_amount, discount_amount, subtotal, total
        ) VALUES (
            v_business_id, v_sale_id, v_product.id, v_product.name,
            v_product.sku, v_product.cost_price, v_qty, v_product.selling_price,
            v_product.tax_rate, v_item_tax, v_discount, v_item_subtotal, v_item_total
        );

        -- Lock inventory row for update to avoid race conditions
        SELECT quantity_on_hand INTO v_curr_inventory
        FROM public.store_inventory
        WHERE store_id = p_store_id AND product_id = v_product.id
        FOR UPDATE;

        IF NOT FOUND THEN
            -- Row didn't exist yet, insert initial negative or 0 balance
            INSERT INTO public.store_inventory (business_id, store_id, product_id, quantity_on_hand)
            VALUES (v_business_id, p_store_id, v_product.id, -v_qty)
            RETURNING quantity_on_hand INTO v_new_balance;
        ELSE
            -- Deduct stock
            UPDATE public.store_inventory
            SET quantity_on_hand = quantity_on_hand - v_qty
            WHERE store_id = p_store_id AND product_id = v_product.id
            RETURNING quantity_on_hand INTO v_new_balance;
        END IF;

        IF NOT v_allow_negative AND v_new_balance < 0 THEN
            RAISE EXCEPTION 'Stock for "%" is insufficient (Available: %, Required: %)',
                v_product.name, (v_new_balance + v_qty), v_qty;
        END IF;

        -- Record movement in immutable ledger
        INSERT INTO public.stock_movements (
            business_id, store_id, product_id,
            quantity_delta, balance_after, reason,
            reference_id, performed_by, notes
        ) VALUES (
            v_business_id, p_store_id, v_product.id,
            -v_qty, v_new_balance, 'sale',
            v_sale_id, auth.uid(), 'Sale Invoice ' || v_invoice_num
        );
    END LOOP;

    -- 12. Insert Payments
    FOR v_pmt IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
        INSERT INTO public.payments (
            business_id, sale_id, method, amount, status, reference
        ) VALUES (
            v_business_id, v_sale_id, (v_pmt->>'method'), (v_pmt->>'amount')::NUMERIC,
            'completed', v_pmt->>'reference'
        );
    END LOOP;

    -- 13. Audit log
    INSERT INTO public.audit_logs (
        business_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_business_id, auth.uid(), 'sale.complete', 'sale', v_sale_id,
        jsonb_build_object(
            'invoice_number', v_invoice_num,
            'grand_total', v_grand_total,
            'store_id', p_store_id
        )
    );

    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_number', v_invoice_num,
        'subtotal', v_subtotal,
        'discount_total', v_discount_total,
        'tax_total', v_tax_total,
        'grand_total', v_grand_total,
        'paid_total', v_paid_total,
        'change_amount', v_change_amount,
        'status', 'completed',
        'is_idempotent_replay', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- process_sale_refund: Authoritative refund & reversal procedure
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_sale_refund(
    p_sale_id UUID,
    p_items_to_refund JSONB, -- Array of [{ sale_item_id: UUID, quantity: NUMERIC, restock: BOOLEAN }]
    p_refund_amount NUMERIC(12, 2),
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sale RECORD;
    v_item JSONB;
    v_sale_item RECORD;
    v_qty NUMERIC(12, 3);
    v_restock BOOLEAN;
    v_new_balance NUMERIC(12, 3);
    v_refund_id UUID;
    v_total_items_remaining NUMERIC := 0;
    v_new_status VARCHAR(20);
BEGIN
    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale % not found', p_sale_id;
    END IF;

    IF v_sale.status NOT IN ('completed', 'partially_refunded') THEN
        RAISE EXCEPTION 'Cannot refund sale with status %', v_sale.status;
    END IF;

    IF NOT user_has_store_access(v_sale.store_id) THEN
        RAISE EXCEPTION 'Unauthorized: User cannot perform refunds for this store';
    END IF;

    -- Record refund
    INSERT INTO public.refunds (
        business_id, sale_id, amount, reason, status, refunded_by, notes
    ) VALUES (
        v_sale.business_id, p_sale_id, p_refund_amount, p_reason, 'completed', auth.uid(), p_notes
    ) RETURNING id INTO v_refund_id;

    -- Process refund items & optional restock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_to_refund) LOOP
        v_qty := (v_item->>'quantity')::NUMERIC;
        v_restock := COALESCE((v_item->>'restock')::BOOLEAN, true);

        SELECT * INTO v_sale_item
        FROM public.sale_items
        WHERE id = (v_item->>'sale_item_id')::UUID AND sale_id = p_sale_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sale item % not found on this sale', (v_item->>'sale_item_id');
        END IF;

        IF (v_sale_item.quantity_refunded + v_qty) > v_sale_item.quantity THEN
            RAISE EXCEPTION 'Refund quantity % exceeds remaining quantity for "%"',
                v_qty, v_sale_item.product_name;
        END IF;

        -- Update quantity refunded
        UPDATE public.sale_items
        SET quantity_refunded = quantity_refunded + v_qty
        WHERE id = v_sale_item.id;

        -- If restock is requested, increment inventory & write movement
        IF v_restock AND v_sale_item.product_id IS NOT NULL THEN
            UPDATE public.store_inventory
            SET quantity_on_hand = quantity_on_hand + v_qty
            WHERE store_id = v_sale.store_id AND product_id = v_sale_item.product_id
            RETURNING quantity_on_hand INTO v_new_balance;

            INSERT INTO public.stock_movements (
                business_id, store_id, product_id,
                quantity_delta, balance_after, reason,
                reference_id, performed_by, notes
            ) VALUES (
                v_sale.business_id, v_sale.store_id, v_sale_item.product_id,
                v_qty, v_new_balance, 'refund',
                v_refund_id, auth.uid(), 'Refund for invoice ' || v_sale.invoice_number
            );
        END IF;
    END LOOP;

    -- Determine new sale status
    SELECT SUM(quantity - quantity_refunded) INTO v_total_items_remaining
    FROM public.sale_items
    WHERE sale_id = p_sale_id;

    IF v_total_items_remaining <= 0 THEN
        v_new_status := 'refunded';
    ELSE
        v_new_status := 'partially_refunded';
    END IF;

    UPDATE public.sales
    SET status = v_new_status
    WHERE id = p_sale_id;

    -- Audit log
    INSERT INTO public.audit_logs (
        business_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_sale.business_id, auth.uid(), 'sale.refund', 'sale', p_sale_id,
        jsonb_build_object(
            'refund_id', v_refund_id,
            'amount', p_refund_amount,
            'reason', p_reason,
            'new_status', v_new_status
        )
    );

    RETURN jsonb_build_object(
        'refund_id', v_refund_id,
        'sale_id', p_sale_id,
        'amount', p_refund_amount,
        'new_status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view profile" ON public.profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- Businesses
CREATE POLICY "Members view business" ON public.businesses
    FOR SELECT TO authenticated USING (user_belongs_to_business(id));
CREATE POLICY "Admins update business" ON public.businesses
    FOR UPDATE TO authenticated USING (user_is_business_admin(id));

-- Roles & Members
CREATE POLICY "Members view roles" ON public.roles
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Admins manage roles" ON public.roles
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));
CREATE POLICY "Members view team" ON public.business_members
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Admins manage team" ON public.business_members
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));

-- Stores & Store Staff
CREATE POLICY "Members view stores" ON public.stores
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Admins manage stores" ON public.stores
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));
CREATE POLICY "Members view store staff" ON public.store_staff
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Admins manage store staff" ON public.store_staff
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));

-- Catalog & Inventory
CREATE POLICY "Members view categories" ON public.categories
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Members manage categories" ON public.categories
    FOR ALL TO authenticated USING (user_belongs_to_business(business_id));

CREATE POLICY "Members view products" ON public.products
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Members manage products" ON public.products
    FOR ALL TO authenticated USING (user_belongs_to_business(business_id));

CREATE POLICY "Staff view store inventory" ON public.store_inventory
    FOR SELECT TO authenticated USING (user_has_store_access(store_id));

CREATE POLICY "Staff view stock movements" ON public.stock_movements
    FOR SELECT TO authenticated USING (user_has_store_access(store_id));

-- Customers & Suppliers
CREATE POLICY "Members view customers" ON public.customers
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Members manage customers" ON public.customers
    FOR ALL TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Members view suppliers" ON public.suppliers
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Members manage suppliers" ON public.suppliers
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));

-- Sales, Line Items, Payments & Refunds
CREATE POLICY "Staff view sales" ON public.sales
    FOR SELECT TO authenticated USING (user_has_store_access(store_id));
CREATE POLICY "Staff view sale items" ON public.sale_items
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Staff view payments" ON public.payments
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Staff view refunds" ON public.refunds
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));

-- Purchase Orders & Expenses
CREATE POLICY "Staff view purchase orders" ON public.purchase_orders
    FOR SELECT TO authenticated USING (user_has_store_access(store_id));
CREATE POLICY "Admins manage purchase orders" ON public.purchase_orders
    FOR ALL TO authenticated USING (user_is_business_admin(business_id));
CREATE POLICY "Members view po items" ON public.purchase_order_items
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders po
            WHERE po.id = purchase_order_id AND user_belongs_to_business(po.business_id)
        )
    );
CREATE POLICY "Staff view expenses" ON public.expenses
    FOR SELECT TO authenticated USING (user_belongs_to_business(business_id));
CREATE POLICY "Staff record expenses" ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(business_id));

-- Audit Logs
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (user_is_business_admin(business_id));
