import { Component, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { CustomerRepository } from '../../data-access/repositories/customer.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { describeError, LoadState } from '../../shared/utils/load-state.util';
import { roundCurrency } from '../../shared/utils/calculation.utils';

/**
 * CRM row. Loyalty points are a stored column; order count, lifetime spend and
 * last visit are aggregated from real tickets by the repository - none of them
 * is ever defaulted to a welcome bonus.
 */
export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string | null;
  taxId?: string;
  notes: string;
  createdAt: string;
}

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    DataStateComponent,
    SearchInputComponent,
  ],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css',
})
export class CustomerListComponent {
  private readonly customerRepo = inject(CustomerRepository);
  private readonly notification = inject(NotificationService);

  readonly context = inject(AppContext);

  readonly listState = new LoadState();

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  editingCustomer = signal<CustomerRecord | null>(null);

  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  /** Disclosure for partial history scans. */
  readonly scannedSales = signal<number>(0);
  readonly statsTruncated = signal<boolean>(false);

  customers = signal<CustomerRecord[]>([]);

  /** Business id captured for the last explicit load (reload on tenant switch). */
  private loadedBusinessId: string | null = null;

  customerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    phone: new FormControl('', [Validators.minLength(7)]),
    email: new FormControl('', [Validators.email]),
    taxId: new FormControl(''),
    notes: new FormControl(''),
  });

  /**
   * Single load trigger - initial read and any business switch. No ngOnInit
   * counterpart, which would double every request.
   */
  constructor() {
    effect(() => {
      const businessId = this.context.businessId();
      if (this.loadedBusinessId === businessId) return;
      void this.loadCustomers();
    });
  }

  /**
   * Loads the directory with real purchase history. Failures stay an error state
   * with a retry affordance - never an empty table pretending to be correct.
   */
  async loadCustomers(options: { silent?: boolean } = {}) {
    if (!this.context.isConfigured()) {
      this.listState.fail('No business is linked to this session, so customers cannot be loaded.');
      return;
    }

    const businessId = this.context.businessId();
    if (!options.silent) {
      this.loadedBusinessId = businessId;
    }

    await this.listState.run(
      async () => {
        const result = await this.customerRepo.getCustomersWithStats(businessId);

        this.customers.set(
          result.customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone ?? '',
            email: c.email ?? '',
            loyaltyPoints: Number(c.loyalty_points ?? 0),
            totalOrders: c.total_orders,
            totalSpent: roundCurrency(c.total_spent),
            lastVisit: c.last_visit,
            taxId: c.tax_id ?? undefined,
            notes: c.notes ?? '',
            createdAt: c.created_at,
          })),
        );
        this.scannedSales.set(result.scannedSales);
        this.statsTruncated.set(result.statsTruncated);

        if (result.statsTruncated) {
          this.notification.warning(
            `Purchase history only covers the ${result.scannedSales} most recent tickets of this business.`,
            'History truncated',
          );
        }

        return result.customers.length > 0;
      },
      { ...options, emptyReason: 'no_data' },
    ).then((result) => {
      if (!result.ok && !options.silent) {
        this.customers.set([]);
        this.statsTruncated.set(false);
        this.scannedSales.set(0);
      }
    });
  }

  async retryLoad() {
    await this.loadCustomers();
  }

  filteredCustomers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.customers();
    return this.customers().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.taxId ?? '').toLowerCase().includes(q),
    );
  });

  isFiltered = computed(() => this.searchQuery().trim().length > 0);

  totalRecords = computed(() => this.filteredCustomers().length);

  paginatedCustomers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredCustomers().slice(start, start + this.pageSize());
  });

  /** Roll-up of the directory, derived from loaded rows only. */
  summary = computed(() => {
    const list = this.customers();
    const withHistory = list.filter((c) => c.totalOrders > 0);
    return {
      customers: list.length,
      withHistory: withHistory.length,
      lifetimeSpent: roundCurrency(list.reduce((sum, c) => sum + c.totalSpent, 0)),
      loyaltyOutstanding: list.reduce((sum, c) => sum + c.loyaltyPoints, 0),
    };
  });

  openAddModal(customer?: CustomerRecord) {
    this.formError.set(null);
    if (customer) {
      this.editingCustomer.set(customer);
      this.customerForm.patchValue({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        taxId: customer.taxId ?? '',
        notes: customer.notes,
      });
    } else {
      this.editingCustomer.set(null);
      this.customerForm.reset({ name: '', phone: '', email: '', taxId: '', notes: '' });
    }
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
    this.editingCustomer.set(null);
    this.formError.set(null);
  }

  /**
   * Persists the profile through the repository and re-reads the directory so
   * the table always mirrors the database.
   */
  async saveCustomer() {
    if (this.customerForm.invalid || this.isSaving()) return;

    const val = this.customerForm.value;
    const existing = this.editingCustomer();
    const name = (val.name ?? '').trim();
    const phone = (val.phone ?? '').trim();
    const email = (val.email ?? '').trim();
    const taxId = (val.taxId ?? '').trim();
    const notes = (val.notes ?? '').trim();

    if (!this.context.isConfigured()) {
      this.formError.set('No business is linked to this session, so nothing can be saved.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      // Duplicate phones split loyalty history across two rows, so block the
      // common cashier mistake before writing.
      if (phone && !existing) {
        const clash = await this.customerRepo.findByPhone(phone);
        if (clash) {
          throw new Error(`That phone is already registered to ${clash.name}.`);
        }
      }

      const payload = {
        name,
        phone: phone || null,
        email: email || null,
        tax_id: taxId || null,
        notes: notes || null,
      } as const;

      if (existing) {
        await this.customerRepo.updateCustomer(existing.id, { ...payload });
      } else {
        await this.customerRepo.createCustomer({
          ...payload,
          business_id: this.context.businessId(),
          loyalty_points: 0,
        });
      }

      await this.loadCustomers({ silent: true });
      this.notification.success(
        existing ? `Customer "${name}" updated` : `Customer "${name}" registered`,
        existing ? 'Saved' : 'Customer Created',
      );
      this.closeAddModal();
    } catch (err) {
      const message = describeError(err);
      this.formError.set(message);
      this.notification.error(message, existing ? 'Update failed' : 'Create failed');
    } finally {
      this.isSaving.set(false);
    }
  }

  onSearch(value: string) {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  /** Human copy for the history column - 0 visits must read as 0 visits. */
  visitLabel(customer: CustomerRecord): string {
    if (customer.totalOrders === 0) return 'No purchases yet';
    return `${customer.totalOrders} ${customer.totalOrders === 1 ? 'visit' : 'visits'}`;
  }
}
