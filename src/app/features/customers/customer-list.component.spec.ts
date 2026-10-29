import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerListComponent } from './customer-list.component';
import { CustomerRepository } from '../../data-access/repositories/customer.repository';
import { AppContext } from '../../core/context/app-context.service';

const BUSINESS_ID = 'b0000000-0000-0000-0000-000000000001';

function directoryRow(
  id: string,
  name: string,
  overrides: Partial<{
    orders: number;
    spent: number;
    points: number;
    last: string | null;
    phone: string | null;
    email: string | null;
    tax_id: string | null;
  }> = {},
) {
  return {
    id,
    business_id: BUSINESS_ID,
    name,
    phone: overrides.phone ?? '+971501234567',
    email: overrides.email ?? `${id}@example.ae`,
    tax_id: overrides.tax_id ?? null,
    loyalty_points: overrides.points ?? 0,
    notes: null,
    created_at: '2026-10-01T04:00:00Z',
    updated_at: '2026-10-01T04:00:00Z',
    total_orders: overrides.orders ?? 0,
    total_spent: overrides.spent ?? 0,
    last_visit: overrides.last ?? null,
  };
}

describe('CustomerListComponent', () => {
  let fixture: ComponentFixture<CustomerListComponent>;
  let component: CustomerListComponent;

  const mockCustomerRepo = {
    getCustomersWithStats: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    findByPhone: vi.fn(),
  };

  const contextStub = {
    isConfigured: computed(() => true),
    businessId: computed(() => BUSINESS_ID),
    businessName: computed(() => 'Aero POS Test Business'),
    currency: computed(() => 'AED'),
  };

  beforeEach(async () => {
    mockCustomerRepo.getCustomersWithStats.mockReset();
    mockCustomerRepo.createCustomer.mockReset();
    mockCustomerRepo.updateCustomer.mockReset();
    mockCustomerRepo.findByPhone.mockReset();

    mockCustomerRepo.getCustomersWithStats.mockResolvedValue({
      customers: [
        directoryRow('u1', 'Sultan Al-Qasimi', {
          orders: 4,
          spent: 431.5,
          points: 12,
          last: '2026-10-20T09:15:00Z',
          tax_id: '100234891200099',
        }),
        directoryRow('u2', 'Walk-in Wallet', { phone: null, email: null }),
      ],
      scannedSales: 12,
      statsTruncated: false,
    });
    mockCustomerRepo.findByPhone.mockResolvedValue(null);
    mockCustomerRepo.createCustomer.mockImplementation(async (payload: any) => ({
      id: 'u-new',
      ...payload,
    }));
    mockCustomerRepo.updateCustomer.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [CustomerListComponent],
      providers: [
        { provide: CustomerRepository, useValue: mockCustomerRepo },
        { provide: AppContext, useValue: contextStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerListComponent);
    component = fixture.componentInstance;
    await component.loadCustomers();
    fixture.detectChanges();
  });

  it('renders purchase history straight from the sales aggregate', () => {
    expect(mockCustomerRepo.getCustomersWithStats).toHaveBeenCalledWith(BUSINESS_ID);
    expect(component.customers().length).toBe(2);

    const sultan = component.customers()[0];
    expect(sultan.totalOrders).toBe(4);
    expect(sultan.totalSpent).toBe(431.5);
    expect(sultan.loyaltyPoints).toBe(12);
    expect(sultan.lastVisit).toBe('2026-10-20T09:15:00Z');
  });

  it('shows genuine zeros for a new customer instead of a welcome bonus', () => {
    const fresh = component.customers()[1];
    expect(fresh.loyaltyPoints).toBe(0);
    expect(fresh.totalOrders).toBe(0);
    expect(fresh.totalSpent).toBe(0);
    expect(component.visitLabel(fresh)).toBe('No purchases yet');
  });

  it('turns a repository failure into a retryable error state with no rows', async () => {
    mockCustomerRepo.getCustomersWithStats.mockRejectedValueOnce(
      new Error('Failed to fetch customers: permission denied'),
    );

    await component.loadCustomers();

    expect(component.listState.status()).toBe('error');
    expect(component.customers()).toEqual([]);
  });

  it('reports an empty directory as empty, not as an error', async () => {
    mockCustomerRepo.getCustomersWithStats.mockResolvedValueOnce({
      customers: [],
      scannedSales: 0,
      statsTruncated: false,
    });

    await component.loadCustomers();

    expect(component.listState.status()).toBe('empty');
  });

  it('searches across name, phone, email and TRN', () => {
    component.onSearch('100234891200099');
    expect(component.filteredCustomers().length).toBe(1);

    component.onSearch('sultan');
    expect(component.filteredCustomers().length).toBe(1);

    component.clearFilters();
    expect(component.totalRecords()).toBe(2);
  });

  it('creates customers through the repository starting at zero points', async () => {
    component.openAddModal();
    component.customerForm.patchValue({
      name: 'Amina Youssef',
      phone: '+971559998877',
      email: 'amina@example.ae',
      taxId: '',
      notes: '',
    });

    await component.saveCustomer();

    expect(mockCustomerRepo.findByPhone).toHaveBeenCalledWith('+971559998877');
    expect(mockCustomerRepo.createCustomer).toHaveBeenCalledWith({
      business_id: BUSINESS_ID,
      name: 'Amina Youssef',
      phone: '+971559998877',
      email: 'amina@example.ae',
      tax_id: null,
      notes: null,
      loyalty_points: 0,
    });
    expect(component.isAddModalOpen()).toBe(false);
  });

  it('refuses a duplicate phone before writing anything', async () => {
    mockCustomerRepo.findByPhone.mockResolvedValueOnce({ id: 'u1', name: 'Sultan Al-Qasimi' } as any);
    component.openAddModal();
    component.customerForm.patchValue({ name: 'Duplicate Person', phone: '+971501234567' });

    await component.saveCustomer();

    expect(mockCustomerRepo.createCustomer).not.toHaveBeenCalled();
    expect(component.formError()).toContain('already registered to Sultan');
    expect(component.isAddModalOpen()).toBe(true);
  });

  it('edits an existing profile via updateCustomer', async () => {
    const target = component.customers()[0];
    component.openAddModal(target);
    component.customerForm.patchValue({ name: 'Sultan Qasimi' });

    await component.saveCustomer();

    expect(mockCustomerRepo.updateCustomer).toHaveBeenCalledWith(target.id, {
      name: 'Sultan Qasimi',
      phone: target.phone,
      email: target.email,
      tax_id: target.taxId,
      notes: target.notes || null,
    });
  });

  it('discloses when the history scan is partial', async () => {
    mockCustomerRepo.getCustomersWithStats.mockResolvedValueOnce({
      customers: [directoryRow('u1', 'Sultan Al-Qasimi')],
      scannedSales: 5000,
      statsTruncated: true,
    });

    await component.loadCustomers();

    expect(component.statsTruncated()).toBe(true);
    expect(component.scannedSales()).toBe(5000);
  });
});
