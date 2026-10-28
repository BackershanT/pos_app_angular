import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PosComponent } from './pos.component';
import { LayoutService } from '../../core/services/layout.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductRepository } from '../../data-access/repositories/product.repository';
import { CategoryRepository } from '../../data-access/repositories/category.repository';
import { OrderRepository } from '../../data-access/repositories/order.repository';

describe('PosComponent (UAE POS Register & Terminal Checkout)', () => {
  let fixture: ComponentFixture<PosComponent>;
  let component: PosComponent;

  const mockProductRepo = {
    getProductsWithInventory: vi.fn().mockResolvedValue([
      {
        id: '1',
        name: 'Spanish Latte (Iced)',
        sku: 'CF-001',
        barcode: '6291041001',
        selling_price: 24.0,
        category_code: 'coffee',
        quantity_on_hand: 45,
      },
    ]),
    getBranchCatalog: vi.fn().mockResolvedValue({
      products: [
        {
          id: '1',
          name: 'Spanish Latte (Iced)',
          sku: 'CF-001',
          barcode: '6291041001',
          selling_price: 24.0,
          tax_rate: 0.05,
          category_id: 'c1',
          category_name: 'Coffee & Drinks',
          category_code: 'coffee',
          quantity_on_hand: 45,
        },
      ],
      truncated: false,
    }),
  };

  const mockCategoryRepo = {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'c1', name: 'Coffee & Drinks', description: 'coffee' },
    ]),
  };

  const mockOrderRepo = {
    completeSale: vi.fn().mockResolvedValue({
      sale_id: 'sale-1',
      invoice_number: 'INV-001',
      subtotal: 24.0,
      discount_total: 0,
      tax_total: 1.2,
      grand_total: 25.2,
      change_amount: 0,
      is_idempotent_replay: false,
    }),
  };

  beforeEach(async () => {
    const mockRouter = {
      events: of(),
    };

    await TestBed.configureTestingModule({
      imports: [PosComponent],
      providers: [
        LayoutService,
        { provide: Router, useValue: mockRouter },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: CategoryRepository, useValue: mockCategoryRepo },
        { provide: OrderRepository, useValue: mockOrderRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    await component.loadSupabaseCatalog();
    fixture.detectChanges();
  });

  it('should initialize with products and an empty cart', () => {
    expect(component).toBeTruthy();
    expect(component.products.length).toBeGreaterThan(0);
    expect(component.cart().length).toBe(0);
  });

  it('should filter products by category', () => {
    component.selectedCategory.set('c1');
    const filtered = component.filteredProducts();
    expect(filtered.every((p) => p.categoryId === 'c1')).toBe(true);
  });

  it('should add product to cart and update calculation signals with UAE 5% VAT', () => {
    const spanishLatte = component.products[0]; // 24.00 AED
    component.addToCart(spanishLatte);

    expect(component.cart().length).toBe(1);
    expect(component.cart()[0].quantity).toBe(1);

    const totals = component.cartCalculations();
    expect(totals.subtotal).toBe(24.0);
    expect(totals.taxTotal).toBe(1.2); // 5% of 24.00
    expect(totals.grandTotal).toBe(25.2);
  });

  it('should increment quantity when product is added repeatedly', () => {
    const spanishLatte = component.products[0];
    component.addToCart(spanishLatte);
    component.addToCart(spanishLatte);

    expect(component.cart().length).toBe(1);
    expect(component.cart()[0].quantity).toBe(2);
  });

  it('should increment, decrement, and remove line item from cart', () => {
    const spanishLatte = component.products[0];
    component.addToCart(spanishLatte);

    component.incrementQuantity(component.cart()[0]);
    expect(component.cart()[0].quantity).toBe(2);

    component.decrementQuantity(component.cart()[0]);
    expect(component.cart()[0].quantity).toBe(1);

    component.decrementQuantity(component.cart()[0]);
    expect(component.cart().length).toBe(0);
  });

  it('should open payment modal and calculate change due for cash tender', () => {
    const item = component.products[0];
    component.addToCart(item);

    component.openPaymentModal();
    expect(component.isPaymentModalOpen()).toBe(true);
    expect(component.amountTendered()).toBe(25.2);

    component.amountTendered.set(50.0);
    expect(component.changeDue()).toBe(24.8);
  });

  it('should authorize sale, clear cart, and generate simplified tax invoice', () => {
    const item = component.products[0];
    component.addToCart(item);
    component.openPaymentModal();
    component.confirmSale();

    expect(component.cart().length).toBe(0);
    expect(component.isSuccessModalOpen()).toBe(true);
    expect(component.lastInvoice()).toBeTruthy();
    expect(component.lastInvoice()?.trn).toBe('100234891200003');
  });
});
