import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent, BaseProductCardInput } from './product-card.component';
import { ComponentRef } from '@angular/core';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let componentRef: ComponentRef<ProductCardComponent>;
  let fixture: ComponentFixture<ProductCardComponent>;

  const mockProduct: BaseProductCardInput = {
    id: 'prod-001',
    name: 'Spanish Latte (Iced)',
    sku: 'CF-001',
    barcode: '6291041001',
    price: 24.0,
    category: 'Beverages',
    stock: 45,
    icon: '☕',
    color: '#3b82f6',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('product', mockProduct);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render product name, SKU, and formatted AED price', () => {
    const el: HTMLElement = fixture.nativeElement;
    const titleEl = el.querySelector('.product-title');
    const skuEl = el.querySelector('.product-sku');
    const priceEl = el.querySelector('.product-price');

    expect(titleEl?.textContent?.trim()).toContain('Spanish Latte (Iced)');
    expect(skuEl?.textContent?.trim()).toBe('CF-001');
    expect(priceEl?.textContent?.trim()).toContain('24.00 AED');
  });

  it('should render healthy stock badge when stock is abundant', () => {
    const el: HTMLElement = fixture.nativeElement;
    const stockBadge = el.querySelector('.stock-badge');
    expect(stockBadge?.textContent?.trim()).toContain('45 left');
    expect(stockBadge?.classList.contains('low-stock')).toBe(false);
  });

  it('should render low stock warning pulse when stock is below 15', () => {
    componentRef.setInput('product', { ...mockProduct, stock: 8 });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const stockBadge = el.querySelector('.stock-badge');
    expect(stockBadge?.classList.contains('low-stock')).toBe(true);
    expect(el.querySelector('.pulse-warning')).toBeTruthy();
    expect(stockBadge?.textContent?.trim()).toContain('8 left');
  });

  it('should render Sold Out and out-of-stock overlay when stock is 0', () => {
    componentRef.setInput('product', { ...mockProduct, stock: 0 });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardEl = el.querySelector('.product-card');
    const stockBadge = el.querySelector('.stock-badge');
    const overlay = el.querySelector('.out-of-stock-overlay');

    expect(cardEl?.classList.contains('out-of-stock')).toBe(true);
    expect(stockBadge?.textContent?.trim()).toContain('Sold Out');
    expect(overlay?.textContent?.trim()).toContain('Out of Stock');
  });

  it('should display add button in pos mode and emit selected / actionClick', () => {
    componentRef.setInput('mode', 'pos');
    fixture.detectChanges();

    let selectedProduct: BaseProductCardInput | undefined;
    let actionProduct: BaseProductCardInput | undefined;

    component.selected.subscribe((p) => (selectedProduct = p));
    component.actionClick.subscribe((p) => (actionProduct = p));

    const el: HTMLElement = fixture.nativeElement;
    const addBtn = el.querySelector('.card-action-btn.add-btn') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();

    addBtn.click();
    expect(actionProduct?.id).toBe('prod-001');

    const cardEl = el.querySelector('.product-card') as HTMLElement;
    cardEl.click();
    expect(selectedProduct?.id).toBe('prod-001');
  });

  it('should display edit button in catalog mode and emit actionClick', () => {
    componentRef.setInput('mode', 'catalog');
    fixture.detectChanges();

    let actionProduct: BaseProductCardInput | undefined;
    component.actionClick.subscribe((p) => (actionProduct = p));

    const el: HTMLElement = fixture.nativeElement;
    const editBtn = el.querySelector('.card-action-btn.edit-btn') as HTMLButtonElement;
    expect(editBtn).toBeTruthy();

    editBtn.click();
    expect(actionProduct?.id).toBe('prod-001');
  });

  it('should not emit events when out of stock', () => {
    componentRef.setInput('product', { ...mockProduct, stock: 0 });
    fixture.detectChanges();

    let emitted = false;
    component.selected.subscribe(() => (emitted = true));
    component.actionClick.subscribe(() => (emitted = true));

    const el: HTMLElement = fixture.nativeElement;
    const cardEl = el.querySelector('.product-card') as HTMLElement;
    cardEl.click();

    expect(emitted).toBe(false);
  });

  it('should emit selected on Enter or Space key press', () => {
    let emitted = false;
    component.selected.subscribe(() => (emitted = true));

    const cardEl = fixture.nativeElement.querySelector('.product-card') as HTMLElement;
    cardEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    expect(emitted).toBe(true);
  });

  it('should render cart quantity pill and has-cart-items class when cartQuantity > 0', () => {
    componentRef.setInput('cartQuantity', 3);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cardEl = el.querySelector('.product-card');
    const pill = el.querySelector('.cart-quantity-pill');

    expect(cardEl?.classList.contains('has-cart-items')).toBe(true);
    expect(pill?.textContent?.trim()).toContain('3');
  });
});
