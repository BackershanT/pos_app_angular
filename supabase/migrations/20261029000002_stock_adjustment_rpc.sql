-- ============================================================================
-- Migration: Branch stock adjustment pathway
-- Date: 2026-10-29
--
-- Why this exists:
--   store_inventory and stock_movements only expose SELECT RLS policies (see
--   20261028000001_initial_pos_schema.sql). Inventory is deliberately written by
--   SECURITY DEFINER procedures only (complete_sale / process_sale_refund), but the
--   manual "stock adjustment" screen had no server-side entry point, so the client
--   attempted direct upserts that RLS rejects.
--
--   record_stock_adjustment keeps the ledger and the balance in one atomic unit:
--   the delta is computed from the locked row, never sent by the browser.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_stock_adjustment(
    p_store_id UUID,
    p_product_id UUID,
    p_new_quantity NUMERIC(12, 3),
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.store_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_business_id UUID;
    v_existing public.store_inventory%ROWTYPE;
    v_delta NUMERIC(12, 3);
    v_result public.store_inventory;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated stock adjustment request';
    END IF;

    IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
        RAISE EXCEPTION 'Adjusted on-hand quantity must be zero or greater';
    END IF;

    IF p_reason NOT IN (
        'sale', 'refund', 'purchase', 'adjustment',
        'transfer_in', 'transfer_out', 'damage', 'loss', 'initial_count'
    ) THEN
        RAISE EXCEPTION 'Invalid stock movement reason: %', p_reason;
    END IF;

    -- Derive tenancy from the store row; the caller never supplies business_id.
    SELECT business_id INTO v_business_id
    FROM public.stores
    WHERE id = p_store_id;

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Store % does not exist', p_store_id;
    END IF;

    IF NOT public.user_has_store_access(p_store_id) THEN
        RAISE EXCEPTION 'User % is not assigned to store %', auth.uid(), p_store_id;
    END IF;

    -- Confirm the product belongs to the same business before touching stock.
    IF NOT EXISTS (
        SELECT 1 FROM public.products
        WHERE id = p_product_id AND business_id = v_business_id
    ) THEN
        RAISE EXCEPTION 'Product % does not belong to this business', p_product_id;
    END IF;

    -- Lock the balance row so concurrent adjustments cannot clobber the ledger.
    SELECT * INTO v_existing
    FROM public.store_inventory
    WHERE store_id = p_store_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.store_inventory (business_id, store_id, product_id, quantity_on_hand, reorder_level)
        VALUES (v_business_id, p_store_id, p_product_id, p_new_quantity, 10.000)
        RETURNING * INTO v_result;

        v_delta := p_new_quantity;
    ELSE
        v_delta := p_new_quantity - v_existing.quantity_on_hand;

        UPDATE public.store_inventory
        SET quantity_on_hand = p_new_quantity
        WHERE id = v_existing.id
        RETURNING * INTO v_result;
    END IF;

    IF v_delta <> 0 THEN
        INSERT INTO public.stock_movements (
            business_id, store_id, product_id,
            quantity_delta, balance_after, reason, performed_by, notes
        )
        VALUES (
            v_business_id, p_store_id, p_product_id,
            v_delta, v_result.quantity_on_hand, p_reason, auth.uid(), p_notes
        );
    END IF;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_adjustment(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_adjustment(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;
