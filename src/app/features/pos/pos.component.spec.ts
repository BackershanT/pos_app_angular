import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PosComponent } from './pos.component';
import { LayoutService } from '../../core/services/layout.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('PosComponent (UAE POS Register & Terminal Checkout)', () => {
  let fixture: ComponentFixture<PosComponent>;
  let component: PosComponent;

  beforeEach(async () => {
    const mockRouter = {
      events: of(),
    };

    await TestBed.configureTestingModule({
      imports: [PosComponent],
      providers: [
        LayoutService,
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with products and an empty cart', () => {
    expect(component).toBeTruthy();
    expect(component.products.length).toBeGreaterThan(0);
    expect(component.cart().length).toBe(0);
  });

  it('should filter products by category', () => {
    component.selectedCategory.set('coffee');
    const filtered = component.filteredProducts();
    expect(filtered.every((p) => p.category === 'coffee')).toBe(true);
  });

  it('should add product to cart and update calculation signals with UAE 5% VAT', () => {
    const spanishLatte = component.products[0]; // 24.00 AED
    component.addToCart(spanishLatte);

    expect(component.cart().length).toBe(1);
    expect(component.cart()[0].quantity).toBe(1);

    const totals = component.cartCalculations();
    expect(totals.grandTotal).toBe(24.0);
    expect(totals.taxTotal).toBe(1.14); // 5% inclusive
    expect(totals.subtotal).toBe(22.86);
  });

  it('should increment quantity when product is added repeatedly', () => {
    const spanishLatte = component.products[0];
    component.addToCart(spanishLatte);
    component.addToCart(spanishLatte);

    expect(component.cart().length).toBe(1);
    expect(component.cart()[0].quantity).toBe(2);
    expect(component.cartCalculations().grandTotal).toBe(48.0);
  });

  it('should increment, decrement, and remove line item from cart', () => {
    const spanishLatte = component.products[0];
    component.addToCart(spanishLatte);

    const cartItem = component.cart()[0];
    component.incrementQuantity(cartItem);
    expect(component.cart()[0].quantity).toBe(2);

    component.decrementQuantity(cartItem);
    expect(component.cart()[0].quantity).toBe(1);

    component.decrementQuantity(cartItem);
    expect(component.cart().length).toBe(0);
  });

  it('should open payment modal and calculate change due for cash tender', () => {
    const item = component.products[0]; // 24.00 AED
    component.addToCart(item);

    component.openPaymentModal();
    expect(component.isPaymentModalOpen()).toBe(true);
    expect(component.amountTendered()).toBe(24.0);

    // Cashier enters 50 AED cash note
    component.amountTendered.set(50.0);
    expect(component.changeDue()).toBe(26.0);
  });

  it('should authorize sale, clear cart, and generate simplified tax invoice', () => {
    const item = component.products[0];
    component.addToCart(item);
    component.openPaymentModal();
    component.confirmSale();

    expect(component.isSuccessModalOpen()).toBe(true);
    expect(component.cart().length).toBe(0);
    expect(component.lastInvoice()).toBeDefined();
    expect(component.lastInvoice()?.trn).toBe('100234892300003');
    expect(component.lastInvoice()?.grandTotal).toBe(24.0);
  });
});
