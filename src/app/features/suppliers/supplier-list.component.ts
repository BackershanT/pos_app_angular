import { Component, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DataStateComponent } from '../../shared/components/data-state/data-state.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SupplierRepository } from '../../data-access/repositories/supplier.repository';
import { AppContext } from '../../core/context/app-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { describeError, LoadState } from '../../shared/utils/load-state.util';

/**
 * `suppliers` only stores name, tax_number and a free-form contact_details blob.
 * The activity columns are counted from purchase_orders by the repository, so an
 * open order never has to be mirrored into a stale JSON snapshot.
 */
export interface SupplierRecord {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  openOrders: number;
  lastOrderAt: string | null;
  createdAt: string;
}

interface SupplierContactDetails {
  contact_person?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    DataStateComponent,
    SearchInputComponent,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.css',
})
export class SupplierListComponent {
  private readonly supplierRepo = inject(SupplierRepository);
  private readonly notification = inject(NotificationService);

  readonly context = inject(AppContext);

  readonly listState = new LoadState();

  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  isAddModalOpen = signal<boolean>(false);
  editingSupplier = signal<SupplierRecord | null>(null);

  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  readonly scannedOrders = signal<number>(0);
  readonly activityTruncated = signal<boolean>(false);

  suppliers = signal<SupplierRecord[]>([]);

  private loadedBusinessId: string | null = null;

  supplierForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    contactPerson: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl('', [Validators.email]),
    taxNumber: new FormControl('', [Validators.pattern(/^\d{15}$/)]),
  });

  /** Initial read plus any tenant switch; no ngOnInit counterpart to avoid double loads. */
  constructor() {
    effect(() => {
      const businessId = this.context.businessId();
      if (this.loadedBusinessId === businessId) return;
      void this.loadSuppliers();
    });
  }

  async loadSuppliers(options: { silent?: boolean } = {}) {
    if (!this.context.isConfigured()) {
      this.listState.fail('No business is linked to this session, so vendors cannot be loaded.');
      return;
    }

    const businessId = this.context.businessId();
    if (!options.silent) {
      this.loadedBusinessId = businessId;
    }

    await this.listState.run(
      async () => {
        const result = await this.supplierRepo.getSuppliersWithActivity(businessId);

        this.suppliers.set(
          result.suppliers.map((s) => {
            const details = (s.contact_details ?? {}) as SupplierContactDetails;
            return {
              id: s.id,
              name: s.name,
              // Missing contact data renders as missing, not as a placeholder number.
              contactPerson: details.contact_person ?? details.contactPerson ?? '',
              phone: details.phone ?? '',
              email: details.email ?? '',
              taxNumber: s.tax_number ?? '',
              openOrders: s.open_orders,
              lastOrderAt: s.last_order_at,
              createdAt: s.created_at,
            };
          }),
        );
        this.scannedOrders.set(result.scannedOrders);
        this.activityTruncated.set(result.activityTruncated);

        if (result.activityTruncated) {
          this.notification.warning(
            `Order activity only covers the ${result.scannedOrders} most recent purchase orders.`,
            'Activity truncated',
          );
        }

        return result.suppliers.length > 0;
      },
      { ...options, emptyReason: 'no_data' },
    ).then((result) => {
      if (!result.ok && !options.silent) {
        this.suppliers.set([]);
        this.activityTruncated.set(false);
        this.scannedOrders.set(0);
      }
    });
  }

  async retryLoad() {
    await this.loadSuppliers();
  }

  filteredSuppliers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.suppliers();
    return this.suppliers().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.taxNumber.includes(q),
    );
  });

  isFiltered = computed(() => this.searchQuery().trim().length > 0);

  totalRecords = computed(() => this.filteredSuppliers().length);

  paginatedSuppliers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredSuppliers().slice(start, start + this.pageSize());
  });

  summary = computed(() => {
    const list = this.suppliers();
    return {
      vendors: list.length,
      openOrders: list.reduce((sum, s) => sum + s.openOrders, 0),
      missingTrn: list.filter((s) => !s.taxNumber).length,
    };
  });

  openAddModal(supplier?: SupplierRecord) {
    this.formError.set(null);
    if (supplier) {
      this.editingSupplier.set(supplier);
      this.supplierForm.patchValue({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        taxNumber: supplier.taxNumber,
      });
    } else {
      this.editingSupplier.set(null);
      this.supplierForm.reset({ name: '', contactPerson: '', phone: '', email: '', taxNumber: '' });
    }
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
    this.editingSupplier.set(null);
    this.formError.set(null);
  }

  /**
   * Database-first: the grid is only mutated after the write succeeds, so a
   * failed insert can never leave a vendor on screen that does not exist.
   */
  async saveSupplier() {
    if (this.supplierForm.invalid || this.isSaving()) return;

    const val = this.supplierForm.value;
    const existing = this.editingSupplier();
    const name = (val.name ?? '').trim();
    const contactDetails = {
      contact_person: (val.contactPerson ?? '').trim(),
      phone: (val.phone ?? '').trim(),
      email: (val.email ?? '').trim(),
    };
    const taxNumber = (val.taxNumber ?? '').trim();

    if (!this.context.isConfigured()) {
      this.formError.set('No business is linked to this session, so nothing can be saved.');
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      if (existing) {
        await this.supplierRepo.updateSupplier(existing.id, {
          name,
          tax_number: taxNumber || null,
          contact_details: contactDetails,
        });
      } else {
        await this.supplierRepo.createSupplier({
          business_id: this.context.businessId(),
          name,
          tax_number: taxNumber || null,
          contact_details: contactDetails,
        });
      }

      await this.loadSuppliers({ silent: true });
      this.notification.success(
        existing ? `Vendor "${name}" updated` : `Vendor "${name}" registered`,
        existing ? 'Saved' : 'Vendor Created',
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
}
