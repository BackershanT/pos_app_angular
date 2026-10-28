import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurchaseListComponent } from './purchase-list.component';
import { PurchaseRepository } from '../../data-access/repositories/purchase.repository';
import { SupplierRepository } from '../../data-access/repositories/supplier.repository';

describe('PurchaseListComponent', () => {
  let fixture: ComponentFixture<PurchaseListComponent>;
  let component: PurchaseListComponent;

  const mockPurchaseRepo = {
    getPurchaseOrders: vi.fn().mockResolvedValue([
      {
        id: 'po-001',
        order_number: 'PO-2026-0041',
        supplier_id: 's1',
        status: 'ordered',
        ordered_at: '2026-10-25T09:00:00Z',
        expected_at: '2026-10-27T14:00:00Z',
      },
    ]),
    getPurchaseOrderById: vi.fn().mockResolvedValue({
      id: 'po-001',
      order_number: 'PO-2026-0041',
      supplier_id: 's1',
      status: 'ordered',
      items: [
        {
          product_id: 'p1',
          quantity: 20,
          unit_cost: 45.0,
          subtotal: 900.0,
        },
      ],
    }),
  };

  const mockSupplierRepo = {
    getSuppliers: vi.fn().mockResolvedValue([
      { id: 's1', name: 'Dubai Roastery Co.', tax_number: '100234892300001' },
    ]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseListComponent],
      providers: [
        { provide: PurchaseRepository, useValue: mockPurchaseRepo },
        { provide: SupplierRepository, useValue: mockSupplierRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseListComponent);
    component = fixture.componentInstance;
    await component.loadPurchaseOrdersFromSupabase();
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
