import { describe, it, expect } from 'vitest';
import {
  roundCurrency,
  calculateLineItemTotals,
  calculateCartTotals,
  validateSplitPayments,
  generateIdempotencyKey,
  CartItemCalculationInput,
} from './calculation.utils';

describe('Calculation Utils (UAE FTA 5% VAT Compliance & POS Math)', () => {
  describe('roundCurrency', () => {
    it('should round monetary amounts to exactly 2 decimal places', () => {
      expect(roundCurrency(10.555)).toBe(10.56);
      expect(roundCurrency(10.554)).toBe(10.55);
      expect(roundCurrency(0.001)).toBe(0);
    });
  });

  describe('calculateLineItemTotals', () => {
    it('should calculate subtotal and UAE 5% VAT for single line item', () => {
      // 2 units at 20.00 AED each = 40.00 AED subtotal, 5% VAT = 2.00 AED, total = 42.00 AED
      const result = calculateLineItemTotals(20.0, 2, 0, 0.05);
      expect(result.subtotal).toBe(40.0);
      expect(result.discountAmount).toBe(0);
      expect(result.taxableAmount).toBe(40.0);
      expect(result.taxAmount).toBe(2.0);
      expect(result.total).toBe(42.0);
    });

    it('should apply line discount and calculate tax on remaining taxable amount', () => {
      // 1 unit at 100.00 AED, 10.00 AED discount -> 90.00 AED taxable, 5% VAT = 4.50 AED, total = 94.50 AED
      const result = calculateLineItemTotals(100.0, 1, 10.0, 0.05);
      expect(result.subtotal).toBe(100.0);
      expect(result.discountAmount).toBe(10.0);
      expect(result.taxableAmount).toBe(90.0);
      expect(result.taxAmount).toBe(4.5);
      expect(result.total).toBe(94.5);
    });

    it('should clamp discount to subtotal so taxable amount is never negative', () => {
      const result = calculateLineItemTotals(50.0, 1, 80.0, 0.05);
      expect(result.discountAmount).toBe(50.0);
      expect(result.taxableAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('calculateCartTotals', () => {
    it('should aggregate multiple cart lines correctly', () => {
      const items: CartItemCalculationInput[] = [
        { unitPrice: 20.0, quantity: 2, taxRate: 0.05 }, // Subtotal: 40, Tax: 2.00
        { unitPrice: 15.0, quantity: 1, taxRate: 0.05 }, // Subtotal: 15, Tax: 0.75
      ];

      const totals = calculateCartTotals(items);
      expect(totals.totalQuantity).toBe(3);
      expect(totals.subtotal).toBe(55.0);
      expect(totals.taxTotal).toBe(2.75);
      expect(totals.discountTotal).toBe(0);
      expect(totals.grandTotal).toBe(57.75);
    });

    it('should apply cart-level discount capped at remaining subtotal', () => {
      const items: CartItemCalculationInput[] = [
        { unitPrice: 50.0, quantity: 2, taxRate: 0.05 }, // Subtotal 100, Tax 5.00
      ];

      const totals = calculateCartTotals(items, 15.0);
      expect(totals.subtotal).toBe(100.0);
      expect(totals.cartDiscountTotal).toBe(15.0);
      expect(totals.discountTotal).toBe(15.0);
      expect(totals.grandTotal).toBe(90.0); // 100 - 15 + 5
    });
  });

  describe('validateSplitPayments', () => {
    it('should recognize when total payments equal or exceed grand total', () => {
      const payments = [
        { method: 'cash', amount: 50.0 },
        { method: 'card', amount: 50.0 },
      ];
      const result = validateSplitPayments(100.0, payments);
      expect(result.isFullyPaid).toBe(true);
      expect(result.totalPaid).toBe(100.0);
      expect(result.remainingBalance).toBe(0);
      expect(result.changeDue).toBe(0);
    });

    it('should calculate change due when cash tender exceeds total', () => {
      const payments = [{ method: 'cash', amount: 150.0 }];
      const result = validateSplitPayments(120.0, payments);
      expect(result.isFullyPaid).toBe(true);
      expect(result.remainingBalance).toBe(0);
      expect(result.changeDue).toBe(30.0);
    });

    it('should calculate remaining balance when underpaid', () => {
      const payments = [{ method: 'cash', amount: 40.0 }];
      const result = validateSplitPayments(100.0, payments);
      expect(result.isFullyPaid).toBe(false);
      expect(result.remainingBalance).toBe(60.0);
      expect(result.changeDue).toBe(0);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate non-empty unique string key', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      expect(key1).toBeTruthy();
      expect(key2).toBeTruthy();
      expect(key1).not.toBe(key2);
    });
  });
});
