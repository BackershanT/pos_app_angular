import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseListComponent } from './purchase-list.component';

describe('PurchaseListComponent', () => {
  let component: PurchaseListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PurchaseListComponent],
    });

    const fixture = TestBed.createComponent(PurchaseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with purchase orders list', () => {
    expect(component).toBeTruthy();
    expect(component.orders().length).toBeGreaterThan(0);
    expect(component.totalRecords()).toBe(component.orders().length);
  });

  it('should filter orders by status', () => {
    component.onStatusSelect('ordered');
    const orderedList = component.filteredOrders();
    expect(orderedList.every((o) => o.status === 'ordered')).toBe(true);
  });

  it('should calculate modal item totals with 5% UAE VAT', () => {
    component.openCreateModal();
    const totals = component.modalTotals();
    expect(totals.subtotal).toBe(450.0);
    expect(totals.taxAmount).toBe(22.5); // 5% of 450
    expect(totals.totalAmount).toBe(472.5);
  });

  it('should create and add a new purchase order', () => {
    const initialCount = component.orders().length;
    component.openCreateModal();
    component.poForm.patchValue({
      notes: 'Test PO creation',
    });
    component.savePurchaseOrder(true);

    expect(component.orders().length).toBe(initialCount + 1);
    expect(component.orders()[0].status).toBe('ordered');
    expect(component.orders()[0].notes).toBe('Test PO creation');
  });

  it('should receive goods (GRN) and update status to received', () => {
    const orderedPo = component.orders().find((o) => o.status === 'ordered');
    expect(orderedPo).toBeDefined();

    component.receiveGoods(orderedPo!);
    const updated = component.orders().find((o) => o.id === orderedPo!.id);
    expect(updated?.status).toBe('received');
  });
});
