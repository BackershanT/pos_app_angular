/**
 * Pure calculation utilities for POS domain operations.
 * Separates financial rules, discount applications, and tax mathematics
 * from presentation/UI components.
 */

export interface CartItemCalculationInput {
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  taxRate?: number; // e.g. 0.05 for 5%
}

export interface LineItemCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface CartCalculationResult {
  subtotal: number;
  itemDiscountTotal: number;
  cartDiscountTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalQuantity: number;
}

export interface PaymentInput {
  method: string;
  amount: number;
  reference?: string;
}

export interface PaymentValidationResult {
  totalPaid: number;
  grandTotal: number;
  remainingBalance: number;
  changeDue: number;
  isFullyPaid: boolean;
}

/**
 * Robust monetary rounding to 2 decimal places to prevent floating-point discrepancies.
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates a single cart line item's subtotal, clamped discount, tax, and line total.
 */
export function calculateLineItemTotals(
  unitPrice: number,
  quantity: number,
  discountAmount = 0,
  taxRate = 0
): LineItemCalculationResult {
  const safeQty = Math.max(0, quantity);
  const safeUnitPrice = Math.max(0, unitPrice);
  const rawSubtotal = roundCurrency(safeQty * safeUnitPrice);

  // Discount cannot exceed the line item subtotal
  const safeDiscount = Math.min(rawSubtotal, Math.max(0, discountAmount));
  const taxableAmount = roundCurrency(rawSubtotal - safeDiscount);
  const taxAmount = roundCurrency(taxableAmount * Math.max(0, taxRate));
  const total = roundCurrency(taxableAmount + taxAmount);

  return {
    subtotal: rawSubtotal,
    discountAmount: safeDiscount,
    taxableAmount,
    taxAmount,
    total,
  };
}

/**
 * Aggregates entire cart totals across all items, including item-level and order-level discounts.
 */
export function calculateCartTotals(
  items: CartItemCalculationInput[],
  cartDiscount = 0
): CartCalculationResult {
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let taxTotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const lineResult = calculateLineItemTotals(
      item.unitPrice,
      item.quantity,
      item.discountAmount ?? 0,
      item.taxRate ?? 0
    );

    subtotal = roundCurrency(subtotal + lineResult.subtotal);
    itemDiscountTotal = roundCurrency(itemDiscountTotal + lineResult.discountAmount);
    taxTotal = roundCurrency(taxTotal + lineResult.taxAmount);
    totalQuantity += item.quantity;
  }

  // Cart discount capped at remaining subtotal after item discounts
  const maxCartDiscount = Math.max(0, subtotal - itemDiscountTotal);
  const safeCartDiscount = Math.min(maxCartDiscount, Math.max(0, cartDiscount));
  const discountTotal = roundCurrency(itemDiscountTotal + safeCartDiscount);
  const grandTotal = roundCurrency(subtotal - discountTotal + taxTotal);

  return {
    subtotal,
    itemDiscountTotal,
    cartDiscountTotal: safeCartDiscount,
    discountTotal,
    taxTotal,
    grandTotal,
    totalQuantity,
  };
}

/**
 * Validates split payments (cash, card, etc.) against the required grand total.
 */
export function validateSplitPayments(
  grandTotal: number,
  payments: PaymentInput[]
): PaymentValidationResult {
  const safeGrandTotal = Math.max(0, roundCurrency(grandTotal));
  const totalPaid = payments.reduce(
    (sum, p) => roundCurrency(sum + Math.max(0, p.amount || 0)),
    0
  );

  const difference = roundCurrency(totalPaid - safeGrandTotal);
  const remainingBalance = difference < 0 ? Math.abs(difference) : 0;
  const changeDue = difference > 0 ? difference : 0;
  const isFullyPaid = difference >= 0;

  return {
    totalPaid,
    grandTotal: safeGrandTotal,
    remainingBalance,
    changeDue,
    isFullyPaid,
  };
}

/**
 * Generates a unique UUID v4 idempotency key for network retry protection.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'pos-req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}
