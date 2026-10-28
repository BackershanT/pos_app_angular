-- ==============================================================================
-- AeroPOS UAE - Supabase Database Schema & Dummy Data Seeder
-- Project: vurjengmqgudzibnfulo (AeroPOS UAE)
-- Safe, Idempotent, and Ready for One-Click Execution in Supabase SQL Editor
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core Tenancy & Store Tables
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'AED',
    tax_registration_number TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    address JSONB DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{"allow_negative_stock": false, "tax_inclusive": false, "default_tax_rate": 0.05}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Catalog Tables
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500, -- 5% UAE standard VAT
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 4. CRM & Supply Chain Tables
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

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    tax_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Sales & Orders Tables
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0500,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    quantity_refunded NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    reference VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. Row Level Security (RLS) - Permissive for Anon & Authenticated POS Usage
-- ==============================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Anon can read businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anon can read stores" ON public.stores;
DROP POLICY IF EXISTS "Anon can read categories" ON public.categories;
DROP POLICY IF EXISTS "Anon can read products" ON public.products;
DROP POLICY IF EXISTS "Anon can read store inventory" ON public.store_inventory;
DROP POLICY IF EXISTS "Anon can read customers" ON public.customers;
DROP POLICY IF EXISTS "Anon can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anon can manage products" ON public.products;
DROP POLICY IF EXISTS "Anon can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anon can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Anon can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Anon can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Anon can manage payments" ON public.payments;

-- Create Policies for Frontend Client Access
CREATE POLICY "Anon can read businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Anon can read stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Anon can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anon can manage categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anon can manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read store inventory" ON public.store_inventory FOR SELECT USING (true);
CREATE POLICY "Anon can manage store inventory" ON public.store_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Anon can manage customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Anon can manage suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage sale items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. Seed Data - Business & Store
-- ==============================================================================
INSERT INTO public.businesses (id, name, currency, tax_registration_number, phone, email, address)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'AeroPOS Dubai Retail LLC',
    'AED',
    '100234891200003',
    '+971 4 362 7500',
    'contact@aeropos.ae',
    '{"street": "Financial Centre Road", "city": "Dubai", "country": "United Arab Emirates"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    currency = EXCLUDED.currency,
    tax_registration_number = EXCLUDED.tax_registration_number;

INSERT INTO public.stores (id, business_id, name, address, phone, invoice_prefix, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Downtown Dubai Mall Flagship',
    'Ground Floor, Unit G-142, Dubai Mall, Downtown Dubai',
    '+971 4 362 7501',
    'INV-DUB',
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address;

-- ==============================================================================
-- 8. Seed Data - Categories
-- ==============================================================================
INSERT INTO public.categories (id, business_id, name, description)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Coffee & Drinks', 'coffee'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Bakery & Pastry', 'bakery'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Sandwiches & Savory', 'sandwiches'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Desserts & Sweets', 'desserts')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ==============================================================================
-- 9. Seed Data - 24 UAE POS Catalog Products
-- ==============================================================================
INSERT INTO public.products (id, business_id, category_id, sku, barcode, name, description, unit, cost_price, selling_price, tax_rate, is_active)
VALUES 
    -- 1. Coffee & Drinks
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-001', '6291041001', 'Spanish Latte (Iced)', 'Signature iced espresso with sweetened condensed milk and fresh organic whole milk.', 'cup', 8.50, 24.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-002', '6291041002', 'Caramel Macchiato', 'Steamed milk with vanilla-flavored syrup, marked with espresso and topped with caramel drizzle.', 'cup', 7.00, 22.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-003', '6291041003', 'Matcha Green Tea Latte', 'Premium Japanese Uji matcha whisked with lightly steamed oat milk.', 'cup', 9.00, 26.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-004', '6291041011', 'Cold Brew Reserve', 'Slow-steeped for 20 hours in small batches, offering a smooth, naturally sweet profile.', 'cup', 8.00, 25.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-005', '6291041014', 'Cardamom Karak Tea', 'Traditional Gulf-style slow-boiled black tea with evaporated milk, cardamom, and saffron.', 'cup', 3.00, 12.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CF-006', '6291041015', 'V60 Ethiopian Pour-Over', 'Single-origin Yirgacheffe coffee beans with vibrant floral notes and crisp citrus finish.', 'cup', 10.00, 32.00, 0.0500, true),

    -- 2. Bakery & Pastry
    ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-001', '6291041004', 'Butter Croissant', 'Authentic French butter croissant, flaky golden crust with tender layered crumb.', 'pcs', 4.50, 14.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-002', '6291041005', 'Chocolate Pain Au', 'Multi-layered viennoiserie pastry rolled around two batons of 70% dark Belgian chocolate.', 'pcs', 5.50, 16.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-003', '6291041006', 'Artisan Sourdough Loaf', '36-hour naturally fermented country loaf baked in stone hearth with blistered crust.', 'pcs', 9.00, 28.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-004', '6291041016', 'Almond Frangipane Tart', 'Crispy sweet shortcrust filled with rich almond cream and toasted sliced almonds.', 'pcs', 7.00, 22.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-005', '6291041017', 'Cinnamon Cardamom Roll', 'Soft Swedish-style rolled dough glazed with cream cheese frosting and fragrant spices.', 'pcs', 6.00, 18.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BK-006', '6291041018', 'Blueberry Cream Brioche', 'Enriched butter brioche bun filled with Madagascan vanilla custard and fresh blueberries.', 'pcs', 6.50, 19.00, 0.0500, true),

    -- 3. Sandwiches & Savory
    ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-001', '6291041007', 'Truffle Chicken Panini', 'Grilled marinated chicken breast, black truffle aioli, baby rocket, and melted scamorza on ciabatta.', 'pcs', 14.00, 34.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-002', '6291041008', 'Smoked Salmon Bagel', 'Norwegian smoked salmon, whipped caper cream cheese, shaved red onion, and fresh dill on toasted bagel.', 'pcs', 16.50, 38.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-003', '6291041019', 'Halloumi & Zaatar Toast', 'Pan-seared Cyprus halloumi, wild Jordanian zaatar, fresh mint, and heirloom tomatoes on sourdough.', 'pcs', 10.00, 26.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-004', '6291041020', 'Smoked Turkey & Emmental', 'Applewood smoked turkey breast, Swiss Emmental cheese, honey Dijon mustard on multigrain bread.', 'pcs', 12.00, 32.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-005', '6291041021', 'Avocado Deluxe Toast', 'Smashed Hass avocado, Persian feta, pomegranate arils, and chili flakes on grilled sourdough.', 'pcs', 11.50, 31.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'SW-006', '6291041022', 'Roast Beef & Truffle Ciabatta', 'Slow-cooked Wagyu beef slices, caramelized onions, horseradish truffle sauce on rustic ciabatta.', 'pcs', 17.00, 42.00, 0.0500, true),

    -- 4. Desserts & Sweets
    ('d0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-001', '6291041009', 'San Sebastian Cheesecake', 'Basque burnt cheesecake with a caramelized crust and gooey custard-like molten center.', 'slice', 11.00, 32.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-002', '6291041010', 'Pistachio Kunafa Cup', 'Crisp baked kataifi pastry layered with molten pistachio cream and crushed Gaziantep pistachios.', 'cup', 10.00, 29.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-003', '6291041012', 'Acai Superfood Bowl', 'Pure organic Amazonian acai blend topped with homemade granola, banana, berries, and chia seeds.', 'bowl', 12.00, 36.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-004', '6291041023', 'Date & Cardamom Pudding', 'Warm Emirates Khalas date sponge with salted butterscotch sauce and vanilla bean gelato.', 'portion', 9.50, 28.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-005', '6291041024', 'Belgian Dark Chocolate Fondant', 'Warm 70% Guanaja chocolate lava cake served with fresh raspberry coulis.', 'portion', 12.00, 35.00, 0.0500, true),
    ('d0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'DS-006', '6291041025', 'Saffron Milk Cake', 'Tres leches sponge soaked in saffron infused evaporated milk, topped with mascarpone cream.', 'slice', 10.00, 30.00, 0.0500, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    barcode = EXCLUDED.barcode,
    selling_price = EXCLUDED.selling_price,
    cost_price = EXCLUDED.cost_price,
    tax_rate = EXCLUDED.tax_rate,
    category_id = EXCLUDED.category_id;

-- ==============================================================================
-- 10. Seed Data - Store Inventory Quantities
-- ==============================================================================
INSERT INTO public.store_inventory (business_id, store_id, product_id, quantity_on_hand, reorder_level)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 45, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 38, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 29, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 30, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 40, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', 25, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', 20, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 15, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000009', 12, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 18, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000011', 24, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000012', 14, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000013', 18, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000014', 14, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000015', 20, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000016', 16, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000017', 22, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000018', 11, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000019', 22, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000020', 19, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000021', 16, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000022', 17, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000023', 15, 10),
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000024', 20, 10)
ON CONFLICT (store_id, product_id) DO UPDATE SET
    quantity_on_hand = EXCLUDED.quantity_on_hand;

-- ==============================================================================
-- 11. Seed Data - UAE Customers
-- ==============================================================================
INSERT INTO public.customers (id, business_id, name, phone, email, tax_id, loyalty_points, notes)
VALUES 
    ('c0000000-0000-0000-0001-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sultan Al Mansoori', '+971 50 123 4567', 'sultan.mansoori@gmail.com', '1002348912', 450.00, 'VIP corporate client - Downtown Dubai'),
    ('c0000000-0000-0000-0001-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Fatima Al Zaabi', '+971 52 987 6543', 'fatima.zaabi@outlook.ae', NULL, 820.00, 'Gold Loyalty member - Frequent morning coffee'),
    ('c0000000-0000-0000-0001-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Tariq Mahmood', '+971 55 456 7890', 'tariq.m@emirates.net.ae', NULL, 120.00, 'Prefers almond milk substitutions'),
    ('c0000000-0000-0000-0001-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Sarah Jenkins', '+971 54 321 0987', 'sarah.j@dubaimedia.ae', NULL, 340.00, 'Regular weekend brunch client'),
    ('c0000000-0000-0000-0001-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Mohammed Al Hashimi', '+971 50 555 1234', 'm.hashimi@hashimiholding.com', '1009876543', 1150.00, 'Corporate catering billing account'),
    ('c0000000-0000-0000-0001-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Aisha Al Nuaimi', '+971 56 777 8899', 'aisha.nuaimi@gmail.com', NULL, 60.00, 'New customer - Loves Spanish Latte')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    loyalty_points = EXCLUDED.loyalty_points;

-- ==============================================================================
-- 12. Seed Data - UAE Suppliers
-- ==============================================================================
INSERT INTO public.suppliers (id, business_id, name, contact_details, tax_number)
VALUES 
    ('s0000000-0000-0000-0001-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Emirates Coffee Roasters LLC', '{"contact_person": "Rashid Al Falasi", "phone": "+971 4 333 4455", "email": "orders@emiratesroasters.ae", "city": "Dubai Silicon Oasis"}'::jsonb, '100445566770003'),
    ('s0000000-0000-0000-0001-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Al Ain Fresh Dairy Farm', '{"contact_person": "Saeed Al Dhaheri", "phone": "+971 3 781 1200", "email": "supply@alaindairy.com", "city": "Al Ain"}'::jsonb, '100112233440003'),
    ('s0000000-0000-0000-0001-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Dubai Bakery & Patisserie Supplies', '{"contact_person": "Michel Bernard", "phone": "+971 4 340 8899", "email": "info@dubaibakerysupplies.com", "city": "Al Quoz Industrial 3"}'::jsonb, '100889900110003'),
    ('s0000000-0000-0000-0001-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Gulf Specialty Ingredients Trading', '{"contact_person": "Kareem Haddad", "phone": "+971 4 288 7766", "email": "sales@gulfspecialty.ae", "city": "Ras Al Khor Industrial 2"}'::jsonb, '100334455660003')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_details = EXCLUDED.contact_details;
